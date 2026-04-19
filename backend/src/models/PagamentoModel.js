// =============================================================
//  models/PagamentoModel.js — Acesso à tabela pagamentos_servidor
//
//  Todos os campos em português, conforme estrutura do banco.
//  Usa o pool de conexões compartilhado (mysql2/promise).
// =============================================================

const pool = require('../config/database')
const { randomUUID } = require('crypto')

// Mapeia linha do banco para objeto JS com nomes amigáveis
function mapPagamento(row) {
  if (!row) return null
  return {
    id:            row.id,
    usuarioId:     row.usuario_id,
    valor:         parseFloat(row.valor),
    status:        row.status,
    preferenceId:  row.preference_id,
    paymentId:     row.payment_id,
    mesReferencia: row.mes_referencia,
    criadoEm:      row.criado_em,
    pagoEm:        row.pago_em,
  }
}

const PagamentoModel = {
  // ── Criação ──────────────────────────────────────────────
  async criar({ usuarioId, valor, preferenceId, mesReferencia }) {
    const id = randomUUID()
    await pool.execute(
      `INSERT INTO pagamentos_servidor
         (id, usuario_id, valor, status, preference_id, mes_referencia)
       VALUES (?, ?, ?, 'pendente', ?, ?)`,
      [id, usuarioId, valor, preferenceId, mesReferencia],
    )
    return this.findById(id)
  },

  // ── Leitura ──────────────────────────────────────────────
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM pagamentos_servidor WHERE id = ? LIMIT 1',
      [id],
    )
    return mapPagamento(rows[0])
  },

  // Verifica se o mês de referência já foi pago
  async findPagamentoMes(mesReferencia) {
    const [rows] = await pool.execute(
      `SELECT * FROM pagamentos_servidor
       WHERE mes_referencia = ? AND status = 'pago'
       ORDER BY pago_em DESC LIMIT 1`,
      [mesReferencia],
    )
    return mapPagamento(rows[0])
  },

  // ── Atualização ──────────────────────────────────────────
  // Confirma pagamento pelo preferenceId (recebido do webhook via payment.preference_id)
  async confirmarPagamento(preferenceId, paymentId) {
    const pagoEm = new Date()
    const [result] = await pool.execute(
      `UPDATE pagamentos_servidor
         SET status = 'pago', pago_em = ?, payment_id = ?
       WHERE preference_id = ? AND status = 'pendente'`,
      [pagoEm, paymentId, preferenceId],
    )
    return result.affectedRows > 0
  },
}

module.exports = PagamentoModel
