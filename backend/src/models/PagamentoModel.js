// =============================================================
//  models/PagamentoModel.js — Modelo de Pagamentos PIX
//
//  Responsabilidades:
//    · Gerenciar transações PIX no banco de dados
//    · Controlar status de pagamentos (pending, approved, failed)
//    · Associar pagamentos a usuários autenticados
//    · Prevenir duplicidade e race conditions
// =============================================================

const db = require('../config/database')

class PagamentoModel {
  /**
   * Cria um novo pagamento PIX no banco de dados
   * @param {Object} pagamentoData - Dados do pagamento
   * @param {string} pagamentoData.usuarioId - ID do usuário
   * @param {number} pagamentoData.valor - Valor em reais
   * @param {string} pagamentoData.mesReferencia - Mês de referência (YYYY-MM)
   * @param {string} pagamentoData.mercadoPagoId - ID do pagamento no Mercado Pago
   * @param {string} pagamentoData.qrCode - Código PIX copia e cola
   * @param {string} pagamentoData.qrCodeBase64 - QR Code em base64
   * @returns {Promise<Object>} Dados do pagamento criado
   */
  static async criarPagamento(pagamentoData) {
    const connection = await db.getConnection()
    
    try {
      await connection.beginTransaction()
      
      // Verificar se já existe pagamento aprovado para este mês/usuário
      const [existente] = await connection.execute(`
        SELECT id, status, mercado_pago_id 
        FROM pagamentos 
        WHERE usuario_id = ? AND mes_referencia = ? AND status = 'approved'
        FOR UPDATE
      `, [pagamentoData.usuarioId, pagamentoData.mesReferencia])
      
      if (existente.length > 0) {
        await connection.rollback()
        throw new Error('Já existe um pagamento aprovado para este mês')
      }
      
      // Verificar se já existe pagamento pendente para este mês/usuário
      const [pendente] = await connection.execute(`
        SELECT id, status, mercado_pago_id, qr_code, qr_code_base64
        FROM pagamentos 
        WHERE usuario_id = ? AND mes_referencia = ? AND status = 'pending'
        AND created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        FOR UPDATE
      `, [pagamentoData.usuarioId, pagamentoData.mesReferencia])
      
      if (pendente.length > 0) {
        await connection.commit()
        return {
          id: pendente[0].id,
          mercadoPagoId: pendente[0].mercado_pago_id,
          qrCode: pendente[0].qr_code,
          qrCodeBase64: pendente[0].qr_code_base64,
          status: pendente[0].status,
          reutilizado: true
        }
      }
      
      // Criar novo pagamento
      const [result] = await connection.execute(`
        INSERT INTO pagamentos (
          usuario_id, valor, mes_referencia, mercado_pago_id, 
          qr_code, qr_code_base64, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
      `, [
        pagamentoData.usuarioId,
        pagamentoData.valor,
        pagamentoData.mesReferencia,
        pagamentoData.mercadoPagoId,
        pagamentoData.qrCode,
        pagamentoData.qrCodeBase64
      ])
      
      await connection.commit()
      
      return {
        id: result.insertId,
        mercadoPagoId: pagamentoData.mercadoPagoId,
        qrCode: pagamentoData.qrCode,
        qrCodeBase64: pagamentoData.qrCodeBase64,
        status: 'pending',
        reutilizado: false
      }
      
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
  
  /**
   * Busca pagamento por ID do Mercado Pago
   * @param {string} mercadoPagoId - ID do pagamento no Mercado Pago
   * @returns {Promise<Object|null>} Dados do pagamento ou null
   */
  static async buscarPorMercadoPagoId(mercadoPagoId) {
    const [rows] = await db.execute(`
      SELECT 
        id, usuario_id, valor, mes_referencia, mercado_pago_id,
        qr_code, qr_code_base64, status, created_at, updated_at
      FROM pagamentos 
      WHERE mercado_pago_id = ?
    `, [mercadoPagoId])
    
    return rows.length > 0 ? rows[0] : null
  }
  
  /**
   * Atualiza status do pagamento (com proteção contra race conditions)
   * @param {string} mercadoPagoId - ID do pagamento no Mercado Pago
   * @param {string} novoStatus - Novo status (approved, failed, etc.)
   * @param {Object} dadosAdicionais - Dados adicionais do pagamento
   * @returns {Promise<boolean>} True se atualizou, false se não encontrou
   */
  static async atualizarStatus(mercadoPagoId, novoStatus, dadosAdicionais = {}) {
    const connection = await db.getConnection()
    
    try {
      await connection.beginTransaction()
      
      // Buscar pagamento atual com lock
      const [pagamento] = await connection.execute(`
        SELECT id, status, usuario_id, mes_referencia
        FROM pagamentos 
        WHERE mercado_pago_id = ?
        FOR UPDATE
      `, [mercadoPagoId])
      
      if (pagamento.length === 0) {
        await connection.rollback()
        return false
      }
      
      const pagamentoAtual = pagamento[0]
      
      // Não atualizar se já está aprovado (idempotência)
      if (pagamentoAtual.status === 'approved' && novoStatus === 'approved') {
        await connection.commit()
        return true
      }
      
      // Atualizar status
      const [result] = await connection.execute(`
        UPDATE pagamentos 
        SET status = ?, updated_at = NOW(),
            dados_mercado_pago = ?
        WHERE mercado_pago_id = ?
      `, [novoStatus, JSON.stringify(dadosAdicionais), mercadoPagoId])
      
      await connection.commit()
      
      return result.affectedRows > 0
      
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
  
  /**
   * Verifica se o mês está pago para um usuário
   * @param {string} usuarioId - ID do usuário
   * @param {string} mesReferencia - Mês de referência (YYYY-MM)
   * @returns {Promise<boolean>} True se está pago
   */
  static async verificarMesPago(usuarioId, mesReferencia) {
    const [rows] = await db.execute(`
      SELECT COUNT(*) as count
      FROM pagamentos 
      WHERE usuario_id = ? AND mes_referencia = ? AND status = 'approved'
    `, [usuarioId, mesReferencia])
    
    return rows[0].count > 0
  }
  
  /**
   * Lista pagamentos de um usuário
   * @param {string} usuarioId - ID do usuário
   * @param {number} limit - Limite de registros
   * @returns {Promise<Array>} Lista de pagamentos
   */
  static async listarPorUsuario(usuarioId, limit = 10) {
    const [rows] = await db.execute(`
      SELECT 
        id, valor, mes_referencia, status, created_at, updated_at
      FROM pagamentos 
      WHERE usuario_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [usuarioId, limit])
    
    return rows
  }
  
  /**
   * Remove pagamentos pendentes expirados (mais de 30 minutos)
   * @returns {Promise<number>} Número de pagamentos removidos
   */
  static async limparPagamentosExpirados() {
    const [result] = await db.execute(`
      DELETE FROM pagamentos 
      WHERE status = 'pending' 
      AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    `)
    
    return result.affectedRows
  }
}

module.exports = PagamentoModel