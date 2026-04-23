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
    const startTime = Date.now()
    
    if (!preferenceId || !paymentId) {
      const erro = `Parâmetros obrigatórios ausentes - preference_id: ${preferenceId}, payment_id: ${paymentId}`
      throw new Error(erro)
    }
    
    const connection = await pool.getConnection()
    
    try {
      await connection.beginTransaction()
      
      const [existingRows] = await connection.execute(
        `SELECT id, status, mes_referencia, usuario_id, valor, criado_em
         FROM pagamentos_servidor 
         WHERE preference_id = ? AND status = 'pendente' 
         LIMIT 1 FOR UPDATE`,
        [preferenceId]
      )
      
      if (existingRows.length === 0) {
        
        const [paidRows] = await connection.execute(
          `SELECT id, status, pago_em, payment_id FROM pagamentos_servidor 
           WHERE preference_id = ? AND status = 'pago' 
           LIMIT 1`,
          [preferenceId]
        )
        
        if (paidRows.length > 0) {
          const registro = paidRows[0]
          
          if (registro.payment_id === paymentId) {
            await connection.commit()
            return { 
              success: true, 
              alreadyProcessed: true, 
              message: 'Pagamento já foi processado anteriormente',
              registroId: registro.id,
              pagoEm: registro.pago_em
            }
          }
          
          await connection.rollback()
          return { 
            success: false, 
            alreadyProcessed: true, 
            message: 'Registro já foi processado com payment_id diferente',
            existingPaymentId: registro.payment_id
          }
        }
        
        const [allRows] = await connection.execute(
          `SELECT id, status, criado_em FROM pagamentos_servidor 
           WHERE preference_id = ? 
           LIMIT 1`,
          [preferenceId]
        )
        
        if (allRows.length > 0) {
          const registro = allRows[0]
          await connection.rollback()
          return { 
            success: false, 
            found: true, 
            message: `Registro encontrado mas com status '${registro.status}' (não pendente)`,
            status: registro.status
          }
        }
        
        await connection.rollback()
        return { 
          success: false, 
          found: false, 
          message: 'Preference_id não encontrado no banco de dados'
        }
      }
      
      const registro = existingRows[0]
      
      const [duplicatePaymentRows] = await connection.execute(
        `SELECT id, preference_id FROM pagamentos_servidor 
         WHERE payment_id = ? AND id != ?
         LIMIT 1`,
        [paymentId, registro.id]
      )
      
      if (duplicatePaymentRows.length > 0) {
        const duplicado = duplicatePaymentRows[0]
        await connection.rollback()
        return { 
          success: false, 
          duplicate: true, 
          message: 'Payment_id já está sendo usado por outro registro',
          conflictingRegistroId: duplicado.id
        }
      }
      
      const pagoEm = new Date()
      
      const [result] = await connection.execute(
        `UPDATE pagamentos_servidor
           SET status = 'pago', pago_em = ?, payment_id = ?
         WHERE id = ? AND status = 'pendente'`,
        [pagoEm, paymentId, registro.id]
      )
      
      const duration = Date.now() - startTime
      const sucesso = result.affectedRows > 0
      
      if (sucesso) {
        await connection.commit()
        
        return { 
          success: true, 
          message: 'Pagamento confirmado com sucesso',
          registroId: registro.id,
          mesReferencia: registro.mes_referencia,
          usuarioId: registro.usuario_id,
          valor: registro.valor,
          pagoEm: pagoEm.toISOString(),
          duracaoMs: duration,
          affectedRows: result.affectedRows
        }
      } else {
        await connection.rollback()
        
        return { 
          success: false, 
          message: 'Nenhum registro foi atualizado - possível condição de corrida',
          registroId: registro.id,
          affectedRows: result.affectedRows,
          debug: {
            changedRows: result.changedRows,
            warningCount: result.warningCount
          }
        }
      }
      
    } catch (err) {
      try {
        await connection.rollback()
      } catch (rollbackErr) {}
      
      const duration = Date.now() - startTime
      
      throw err
    } finally {
      connection.release()
    }
  },
}

module.exports = PagamentoModel