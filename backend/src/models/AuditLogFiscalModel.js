// ════════════════════════════════════════════════════════════════════════════
// models/AuditLogFiscalModel.js — Log de auditoria fiscal (IMUTÁVEL)
// ════════════════════════════════════════════════════════════════════════════
// IMPORTANTE: Logs são IMUTÁVEIS - apenas INSERT permitido.
// Exigência legal fiscal brasileira.
// Retenção mínima: 7 anos.
// ════════════════════════════════════════════════════════════════════════════

const pool = require('../config/database')

class AuditLogFiscalModel {
  
  /**
   * Registrar operação de auditoria
   * @param {object} dados - Dados do log
   */
  async registrar(dados) {
    const query = `
      INSERT INTO audit_log_fiscal (
        operacao,
        entidade,
        entidade_id,
        usuario_id,
        usuario_nome,
        ip_address,
        user_agent,
        dados_anteriores,
        dados_novos,
        resultado,
        mensagem,
        erro_detalhes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `
    
    const values = [
      dados.operacao,
      dados.entidade,
      dados.entidade_id || null,
      dados.usuario_id,
      dados.usuario_nome || null,
      dados.ip_address || null,
      dados.user_agent || null,
      dados.dados_anteriores ? JSON.stringify(dados.dados_anteriores) : null,
      dados.dados_novos ? JSON.stringify(dados.dados_novos) : null,
      dados.resultado,
      dados.mensagem || null,
      dados.erro_detalhes ? JSON.stringify(dados.erro_detalhes) : null
    ]
    
    try {
      const result = await pool.query(query, values)
      return result.rows[0].id
    } catch (error) {
      // Não lançar erro para não quebrar fluxo principal
      console.error('[AuditLogFiscalModel] Erro ao registrar log:', error)
      return null
    }
  }
  
  /**
   * Listar logs com filtros
   * @param {object} filtros - { operacao, entidade_id, usuario_id, limite, pagina }
   */
  async listar(filtros = {}) {
    const {
      operacao,
      entidade_id,
      usuario_id,
      limite = 50,
      pagina = 1
    } = filtros
    
    let query = `
      SELECT * FROM audit_log_fiscal
      WHERE 1=1
    `
    
    const values = []
    let paramCount = 1
    
    // Filtros
    if (operacao) {
      query += ` AND operacao = $${paramCount++}`
      values.push(operacao)
    }
    if (entidade_id) {
      query += ` AND entidade_id = $${paramCount++}`
      values.push(entidade_id)
    }
    if (usuario_id) {
      query += ` AND usuario_id = $${paramCount++}`
      values.push(usuario_id)
    }
    
    // Ordenação
    query += ` ORDER BY criado_em DESC`
    
    // Paginação
    const offset = (pagina - 1) * limite
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`
    values.push(limite, offset)
    
    try {
      const result = await pool.query(query, values)
      
      // Contar total
      const countQuery = query.replace(/SELECT \* FROM/, 'SELECT COUNT(*) FROM')
        .replace(/ORDER BY.*$/, '')
        .replace(/LIMIT.*$/, '')
      
      const countResult = await pool.query(
        countQuery,
        values.slice(0, values.length - 2)
      )
      
      return {
        logs: result.rows,
        total: parseInt(countResult.rows[0].count),
        pagina,
        limite
      }
    } catch (error) {
      console.error('[AuditLogFiscalModel] Erro ao listar:', error)
      throw error
    }
  }
  
  /**
   * Buscar logs de uma entidade específica
   * @param {string} entidade - Tipo da entidade
   * @param {string} entidadeId - UUID da entidade
   */
  async buscarPorEntidade(entidade, entidadeId) {
    const query = `
      SELECT * FROM audit_log_fiscal
      WHERE entidade = $1 AND entidade_id = $2
      ORDER BY criado_em DESC
    `
    
    try {
      const result = await pool.query(query, [entidade, entidadeId])
      return result.rows
    } catch (error) {
      console.error('[AuditLogFiscalModel] Erro ao buscar por entidade:', error)
      throw error
    }
  }
}

module.exports = new AuditLogFiscalModel()
