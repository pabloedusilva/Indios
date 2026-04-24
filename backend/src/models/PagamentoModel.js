// =============================================================
//  models/PagamentoModel.js — Modelo de Pagamentos PIX
//
//  Responsabilidades:
//    · Gerenciar transações PIX no banco de dados
//    · Controlar status (pending → approved / failed)
//    · Associar pagamentos a usuários autenticados
//    · Prevenir duplicidade e race conditions via FOR UPDATE
// =============================================================

const db = require('../config/database')

class PagamentoModel {

  // ── Criar pagamento pendente ────────────────────────────────
  static async criarPagamento(data) {
    const { usuarioId, valor, mesReferencia, mercadoPagoId, qrCode, qrCodeBase64 } = data
    const conn = await db.getConnection()

    try {
      await conn.beginTransaction()

      // Já existe aprovado?
      const [aprovado] = await conn.execute(
        `SELECT id FROM pagamentos
         WHERE usuario_id = ? AND mes_referencia = ? AND status = 'approved'
         FOR UPDATE`,
        [usuarioId, mesReferencia],
      )
      if (aprovado.length > 0) {
        await conn.rollback()
        throw new Error('Já existe um pagamento aprovado para este mês')
      }

      // Já existe pendente recente (< 30 min)? Reutilizar
      const [pendente] = await conn.execute(
        `SELECT id, mercado_pago_id, qr_code, qr_code_base64, status
         FROM pagamentos
         WHERE usuario_id = ? AND mes_referencia = ? AND status = 'pending'
           AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
         FOR UPDATE`,
        [usuarioId, mesReferencia],
      )
      if (pendente.length > 0) {
        await conn.commit()
        return {
          id:           pendente[0].id,
          mercadoPagoId: pendente[0].mercado_pago_id,
          qrCode:       pendente[0].qr_code,
          qrCodeBase64: pendente[0].qr_code_base64,
          status:       pendente[0].status,
          reutilizado:  true,
        }
      }

      // Inserir novo
      const [result] = await conn.execute(
        `INSERT INTO pagamentos
           (usuario_id, valor, mes_referencia, mercado_pago_id, qr_code, qr_code_base64, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [usuarioId, valor, mesReferencia, mercadoPagoId, qrCode, qrCodeBase64 || null],
      )

      await conn.commit()

      return {
        id:           result.insertId,
        mercadoPagoId,
        qrCode,
        qrCodeBase64: qrCodeBase64 || null,
        status:       'pending',
        reutilizado:  false,
      }

    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }

  // ── Criar registro retroativo já aprovado (via webhook sem registro prévio) ──
  static async criarPagamentoAprovado(data) {
    const { usuarioId, mesReferencia, mercadoPagoId, valor, dadosMercadoPago } = data
    const conn = await db.getConnection()

    try {
      await conn.beginTransaction()

      // Idempotência: já existe aprovado?
      const [existente] = await conn.execute(
        `SELECT id FROM pagamentos
         WHERE usuario_id = ? AND mes_referencia = ? AND status = 'approved'
         FOR UPDATE`,
        [usuarioId, mesReferencia],
      )
      if (existente.length > 0) {
        await conn.rollback()
        return { id: existente[0].id, criado: false }
      }

      const [result] = await conn.execute(
        `INSERT INTO pagamentos
           (usuario_id, valor, mes_referencia, mercado_pago_id, qr_code, status, dados_mercado_pago, created_at, updated_at)
         VALUES (?, ?, ?, ?, '', 'approved', ?, NOW(), NOW())`,
        [usuarioId, valor || 0, mesReferencia, mercadoPagoId, JSON.stringify(dadosMercadoPago || {})],
      )

      await conn.commit()
      return { id: result.insertId, criado: true }

    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }

  // ── Buscar por ID do Mercado Pago ───────────────────────────
  static async buscarPorMercadoPagoId(mercadoPagoId) {
    const [rows] = await db.execute(
      `SELECT id, usuario_id, valor, mes_referencia, mercado_pago_id,
              qr_code, qr_code_base64, status, created_at, updated_at
       FROM pagamentos
       WHERE mercado_pago_id = ?`,
      [String(mercadoPagoId)],
    )
    return rows[0] || null
  }

  // ── Atualizar status (com lock para evitar race condition) ──
  static async atualizarStatus(mercadoPagoId, novoStatus, dadosAdicionais = {}) {
    const conn = await db.getConnection()

    try {
      await conn.beginTransaction()

      const [rows] = await conn.execute(
        `SELECT id, status FROM pagamentos WHERE mercado_pago_id = ? FOR UPDATE`,
        [String(mercadoPagoId)],
      )

      if (rows.length === 0) {
        await conn.rollback()
        return false
      }

      // Idempotência: já aprovado, não regredir
      if (rows[0].status === 'approved' && novoStatus === 'approved') {
        await conn.commit()
        return true
      }

      const [result] = await conn.execute(
        `UPDATE pagamentos
         SET status = ?, dados_mercado_pago = ?, updated_at = NOW()
         WHERE mercado_pago_id = ?`,
        [novoStatus, JSON.stringify(dadosAdicionais), String(mercadoPagoId)],
      )

      await conn.commit()
      return result.affectedRows > 0

    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  }

  // ── Verificar se o mês está pago ────────────────────────────
  static async verificarMesPago(usuarioId, mesReferencia) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS total FROM pagamentos
       WHERE usuario_id = ? AND mes_referencia = ? AND status = 'approved'`,
      [usuarioId, mesReferencia],
    )
    return rows[0].total > 0
  }

  // ── Listar pagamentos de um usuário ─────────────────────────
  static async listarPorUsuario(usuarioId, limit = 10) {
    const [rows] = await db.execute(
      `SELECT id, valor, mes_referencia, status, created_at, updated_at
       FROM pagamentos
       WHERE usuario_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [usuarioId, limit],
    )
    return rows
  }

  // ── Limpar pendentes expirados (> 30 min) ───────────────────
  static async limparExpirados() {
    const [result] = await db.execute(
      `DELETE FROM pagamentos
       WHERE status = 'pending'
         AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`,
    )
    return result.affectedRows
  }
}

module.exports = PagamentoModel
