// =============================================================
//  models/PagamentoModel.js — Modelo de Pagamentos PIX
//
//  Responsabilidades:
//    · Gerenciar transações PIX no banco de dados
//    · Controlar status: pending → approved | expired | failed
//    · Salvar expires_at (24h) para controle de expiração
//    · Prevenir duplicidade e race conditions via FOR UPDATE
// =============================================================

const db = require('../config/database')

// PIX expira em 24 horas conforme padrão do Mercado Pago
const PIX_EXPIRACAO_HORAS = 24

class PagamentoModel {

  // ── Buscar último registro do usuário para o mês ───────────
  // Retorna o registro mais recente independente do status,
  // usado pelo controller para decidir se reutiliza ou cria novo.
  static async buscarUltimoPorUsuarioMes(usuarioId, mesReferencia) {
    const result = await db.query(
      `SELECT id, usuario_id, mercado_pago_id, qr_code, qr_code_base64,
              status, expires_at, valor, created_at, updated_at
       FROM pagamentos
       WHERE usuario_id = $1 AND mes_referencia = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [usuarioId, mesReferencia],
    )
    return result.rows[0] || null
  }

  // ── Criar pagamento pendente ────────────────────────────────
  // Insere um novo registro. O controller já verificou que não há
  // pendente válido nem aprovado antes de chamar este método.
  static async criarPagamento(data) {
    const { usuarioId, valor, mesReferencia, mercadoPagoId, qrCode, qrCodeBase64 } = data
    const conn = await db.connect()

    try {
      await conn.query('BEGIN')

      // Segurança: garantir que não existe aprovado (double-check com lock)
      const aprovado = await conn.query(
        `SELECT id FROM pagamentos
         WHERE usuario_id = $1 AND mes_referencia = $2 AND status = 'approved'
         FOR UPDATE`,
        [usuarioId, mesReferencia],
      )
      if (aprovado.rows.length > 0) {
        await conn.query('ROLLBACK')
        throw new Error('Já existe um pagamento aprovado para este mês')
      }

      // Calcular expiração: 24h a partir de agora
      const expiresAt = new Date(Date.now() + PIX_EXPIRACAO_HORAS * 60 * 60 * 1000)

      const result = await conn.query(
        `INSERT INTO pagamentos
           (usuario_id, valor, mes_referencia, mercado_pago_id,
            qr_code, qr_code_base64, status, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), NOW())
         RETURNING id`,
        [usuarioId, valor, mesReferencia, mercadoPagoId,
         qrCode, qrCodeBase64 || null, expiresAt],
      )

      await conn.query('COMMIT')

      return {
        id:            result.rows[0].id,
        mercadoPagoId,
        qrCode,
        qrCodeBase64:  qrCodeBase64 || null,
        status:        'pending',
        expiresAt:     expiresAt.toISOString(),
        reutilizado:   false,
      }

    } catch (err) {
      await conn.query('ROLLBACK')
      throw err
    } finally {
      conn.release()
    }
  }

  // ── Criar registro retroativo já aprovado (via webhook sem registro prévio) ──
  static async criarPagamentoAprovado(data) {
    const { usuarioId, mesReferencia, mercadoPagoId, valor, dadosMercadoPago } = data
    const conn = await db.connect()

    try {
      await conn.query('BEGIN')

      // Idempotência: já existe aprovado?
      const existente = await conn.query(
        `SELECT id FROM pagamentos
         WHERE usuario_id = $1 AND mes_referencia = $2 AND status = 'approved'
         FOR UPDATE`,
        [usuarioId, mesReferencia],
      )
      if (existente.rows.length > 0) {
        await conn.query('ROLLBACK')
        return { id: existente.rows[0].id, criado: false }
      }

      const result = await conn.query(
        `INSERT INTO pagamentos
           (usuario_id, valor, mes_referencia, mercado_pago_id,
            qr_code, status, dados_mercado_pago, created_at, updated_at)
         VALUES ($1, $2, $3, $4, '', 'approved', $5, NOW(), NOW())
         RETURNING id`,
        [usuarioId, valor || 0, mesReferencia, mercadoPagoId,
         JSON.stringify(dadosMercadoPago || {})],
      )

      await conn.query('COMMIT')
      return { id: result.rows[0].id, criado: true }

    } catch (err) {
      await conn.query('ROLLBACK')
      throw err
    } finally {
      conn.release()
    }
  }

  // ── Buscar por ID do Mercado Pago ───────────────────────────
  static async buscarPorMercadoPagoId(mercadoPagoId) {
    const result = await db.query(
      `SELECT id, usuario_id, valor, mes_referencia, mercado_pago_id,
              qr_code, qr_code_base64, status, expires_at, created_at, updated_at
       FROM pagamentos
       WHERE mercado_pago_id = $1`,
      [String(mercadoPagoId)],
    )
    return result.rows[0] || null
  }

  // ── Atualizar status (com lock para evitar race condition) ──
  static async atualizarStatus(mercadoPagoId, novoStatus, dadosAdicionais = {}) {
    const conn = await db.connect()

    try {
      await conn.query('BEGIN')

      const rows = await conn.query(
        `SELECT id, status FROM pagamentos
         WHERE mercado_pago_id = $1 FOR UPDATE`,
        [String(mercadoPagoId)],
      )

      if (rows.rows.length === 0) {
        await conn.query('ROLLBACK')
        return false
      }

      // Idempotência: já aprovado, não regredir
      if (rows.rows[0].status === 'approved' && novoStatus === 'approved') {
        await conn.query('COMMIT')
        return true
      }

      // Não regredir de approved para qualquer outro status
      if (rows.rows[0].status === 'approved') {
        await conn.query('ROLLBACK')
        return false
      }

      const result = await conn.query(
        `UPDATE pagamentos
         SET status = $1, dados_mercado_pago = $2, updated_at = NOW()
         WHERE mercado_pago_id = $3`,
        [novoStatus, JSON.stringify(dadosAdicionais), String(mercadoPagoId)],
      )

      await conn.query('COMMIT')
      return result.rowCount > 0

    } catch (err) {
      await conn.query('ROLLBACK')
      throw err
    } finally {
      conn.release()
    }
  }

  // ── Verificar se o mês está pago ────────────────────────────
  static async verificarMesPago(usuarioId, mesReferencia) {
    const result = await db.query(
      `SELECT COUNT(*) AS total FROM pagamentos
       WHERE usuario_id = $1 AND mes_referencia = $2 AND status = 'approved'`,
      [usuarioId, mesReferencia],
    )
    return result.rows[0].total > 0
  }

  // ── Listar pagamentos aprovados de um usuário ───────────────
  static async listarAprovadosPorUsuario(usuarioId) {
    const result = await db.query(
      `SELECT id, valor, mes_referencia, mercado_pago_id,
              dados_mercado_pago, created_at, updated_at
       FROM pagamentos
       WHERE usuario_id = $1 AND status = 'approved'
       ORDER BY mes_referencia DESC`,
      [usuarioId],
    )
    return result.rows
  }

  // ── Buscar pagamento aprovado por ID (para comprovante) ─────
  static async buscarAprovadoPorId(id, usuarioId) {
    const result = await db.query(
      `SELECT id, valor, mes_referencia, mercado_pago_id,
              dados_mercado_pago, created_at, updated_at
       FROM pagamentos
       WHERE id = $1 AND usuario_id = $2 AND status = 'approved'`,
      [id, usuarioId],
    )
    return result.rows[0] || null
  }

  // ── Listar pagamentos de um usuário ─────────────────────────
  static async listarPorUsuario(usuarioId, limit = 10) {
    const result = await db.query(
      `SELECT id, valor, mes_referencia, status, expires_at, created_at, updated_at
       FROM pagamentos
       WHERE usuario_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [usuarioId, limit],
    )
    return result.rows
  }

  // ── Expirar pendentes vencidos (job a cada 5 min) ───────────
  // Marca como 'expired' todos os pagamentos pending cujo expires_at já passou.
  static async expirarPendentesVencidos() {
    const result = await db.query(
      `UPDATE pagamentos
       SET status = 'expired', updated_at = NOW()
       WHERE status = 'pending'
         AND expires_at IS NOT NULL
         AND expires_at < NOW()`,
    )
    return result.rowCount
  }

  // ── Deletar expirados antigos (job diário) ──────────────────
  // Remove permanentemente registros 'expired' criados há mais de 30 dias.
  // Registros recentes são mantidos para auditoria.
  static async deletarExpiradosAntigos() {
    const result = await db.query(
      `DELETE FROM pagamentos
       WHERE status = 'expired'
         AND created_at < NOW() - INTERVAL '30 days'`,
    )
    return result.rowCount
  }
}

module.exports = PagamentoModel
