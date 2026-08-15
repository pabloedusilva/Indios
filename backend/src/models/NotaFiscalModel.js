// ════════════════════════════════════════════════════════════════════════════
// models/NotaFiscalModel.js — Camada de acesso a dados para notas_fiscais
// ════════════════════════════════════════════════════════════════════════════
// Gerencia operações no banco de dados relacionadas a notas fiscais.
// Usa PostgreSQL (Supabase) com prepared statements para segurança.
// ════════════════════════════════════════════════════════════════════════════

const pool = require('../config/database')

class NotaFiscalModel {
  
  /**
   * Transformar dados do banco (snake_case) para o formato da API (camelCase)
   * @private
   */
  _transformarNota(row) {
    if (!row) return null
    
    return {
      id: row.id,
      pedidoId: row.pedido_id,
      numero: row.numero,
      serie: row.serie,
      chaveAcesso: row.chave_acesso,
      status: row.status,
      destinatarioNome: row.destinatario_nome,
      destinatarioCnpjCpf: row.destinatario_cnpj_cpf,
      valor: parseFloat(row.valor_total),
      xmlNfe: row.xml_nfe,
      danfeUrl: row.danfe_url,
      protocolo: row.protocolo,
      motivoCancelamento: row.motivo_cancelamento,
      providerRef: row.provider_ref,
      metadados: row.metadados,
      emitidoEm: row.emitido_em,
      autorizadoEm: row.autorizado_em,
      canceladoEm: row.cancelado_em,
      criadoEm: row.criado_em,
      atualizadoEm: row.atualizado_em
    }
  }
  
  /**
   * Criar nova nota fiscal
   * @param {object} dados - Dados da nota
   */
  async criar(dados) {
    const query = `
      INSERT INTO notas_fiscais (
        pedido_id,
        numero,
        serie,
        status,
        destinatario_nome,
        destinatario_cnpj_cpf,
        valor_total,
        provider_ref,
        metadados,
        emitido_em
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `
    
    const values = [
      dados.pedido_id,
      dados.numero || null, // Nullable - será preenchido após retorno da SEFAZ
      dados.serie || null,  // Nullable - será preenchido após retorno da SEFAZ
      dados.status,
      dados.destinatario_nome,
      dados.destinatario_cnpj_cpf,
      dados.valor_total,
      dados.provider_ref || null,
      JSON.stringify(dados.metadados || {}),
      dados.emitido_em || new Date()
    ]
    
    try {
      const result = await pool.query(query, values)
      return result.rows[0].id
    } catch (error) {
      console.error('[NotaFiscalModel] Erro ao criar:', error)
      throw error
    }
  }
  
  /**
   * Buscar nota por ID
   * @param {string} id - UUID da nota
   */
  async buscarPorId(id) {
    const query = `
      SELECT 
        nf.*
      FROM notas_fiscais nf
      WHERE nf.id = $1
    `
    
    try {
      const result = await pool.query(query, [id])
      return this._transformarNota(result.rows[0])
    } catch (error) {
      console.error('[NotaFiscalModel] Erro ao buscar por ID:', error)
      throw error
    }
  }
  
  /**
   * Buscar nota por pedido_id
   * @param {string} pedidoId - UUID do pedido
   */
  async buscarPorPedidoId(pedidoId) {
    const query = `
      SELECT * FROM notas_fiscais
      WHERE pedido_id = $1
      ORDER BY criado_em DESC
      LIMIT 1
    `
    
    try {
      const result = await pool.query(query, [pedidoId])
      return this._transformarNota(result.rows[0])
    } catch (error) {
      console.error('[NotaFiscalModel] Erro ao buscar por pedido:', error)
      throw error
    }
  }
  
  /**
   * Buscar nota por chave de acesso
   * @param {string} chaveAcesso - Chave de 44 dígitos
   */
  async buscarPorChaveAcesso(chaveAcesso) {
    const query = `
      SELECT * FROM notas_fiscais
      WHERE chave_acesso = $1
    `
    
    try {
      const result = await pool.query(query, [chaveAcesso])
      return result.rows[0] || null
    } catch (error) {
      console.error('[NotaFiscalModel] Erro ao buscar por chave:', error)
      throw error
    }
  }
  
  /**
   * Listar notas com filtros
   * @param {object} filtros - { status, periodo, busca, limite, pagina }
   */
  async listar(filtros = {}) {
    const {
      status,
      periodo,
      busca,
      limite = 50,
      pagina = 1
    } = filtros
    
    let query = `
      SELECT 
        nf.*
      FROM notas_fiscais nf
      WHERE 1=1
    `
    
    const values = []
    let paramCount = 1
    
    // Filtro por status
    if (status && status !== 'todos') {
      query += ` AND nf.status = $${paramCount++}`
      values.push(status)
    }
    
    // Filtro por período (OPCIONAL - se não fornecido, retorna todas)
    if (periodo && periodo !== 'todos') {
      // Suporte para formato YYYY-MM (ex: 2024-01)
      if (/^\d{4}-\d{2}$/.test(periodo)) {
        const [ano, mes] = periodo.split('-')
        const dataInicio = new Date(parseInt(ano), parseInt(mes) - 1, 1)
        const dataFim = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59) // Último dia do mês
        
        query += ` AND nf.emitido_em >= $${paramCount++} AND nf.emitido_em <= $${paramCount++}`
        values.push(dataInicio, dataFim)
      } else {
        // Períodos relativos (7d, 30d, 90d)
        const dataInicio = this._calcularDataInicio(periodo)
        if (dataInicio) {
          query += ` AND nf.emitido_em >= $${paramCount++}`
          values.push(dataInicio)
        }
      }
    }
    
    // Busca por número, cliente, chave
    if (busca) {
      query += ` AND (
        CAST(nf.numero AS TEXT) LIKE $${paramCount} OR
        nf.destinatario_nome ILIKE $${paramCount} OR
        nf.chave_acesso LIKE $${paramCount}
      )`
      values.push(`%${busca}%`)
      paramCount++
    }
    
    // Ordenação
    query += ` ORDER BY nf.emitido_em DESC`
    
    // Paginação
    const offset = (pagina - 1) * limite
    query += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`
    values.push(limite, offset)
    
    try {
      const result = await pool.query(query, values)
      
      // Contar total (para paginação)
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) FROM')
        .replace(/ORDER BY.*$/, '')
        .replace(/LIMIT.*$/, '')
      
      const countResult = await pool.query(
        countQuery,
        values.slice(0, values.length - 2) // Remove LIMIT e OFFSET
      )
      
      return {
        notas: result.rows.map(row => this._transformarNota(row)),
        total: countResult.rows && countResult.rows[0] ? parseInt(countResult.rows[0].count) : 0,
        pagina,
        limite
      }
    } catch (error) {
      console.error('[NotaFiscalModel] Erro ao listar:', error)
      throw error
    }
  }
  
  /**
   * Atualizar nota
   * @param {string} id - UUID da nota
   * @param {object} dados - Campos a atualizar
   */
  async atualizar(id, dados) {
    const campos = []
    const values = []
    let paramCount = 1
    
    // Construir SET dinamicamente
    if (dados.status !== undefined) {
      campos.push(`status = $${paramCount++}`)
      values.push(dados.status)
    }
    if (dados.numero !== undefined) {
      campos.push(`numero = $${paramCount++}`)
      values.push(dados.numero)
    }
    if (dados.serie !== undefined) {
      campos.push(`serie = $${paramCount++}`)
      values.push(dados.serie)
    }
    if (dados.chave_acesso !== undefined) {
      campos.push(`chave_acesso = $${paramCount++}`)
      values.push(dados.chave_acesso)
    }
    if (dados.protocolo !== undefined) {
      campos.push(`protocolo = $${paramCount++}`)
      values.push(dados.protocolo)
    }
    if (dados.xml_nfe !== undefined) {
      campos.push(`xml_nfe = $${paramCount++}`)
      values.push(dados.xml_nfe)
    }
    if (dados.danfe_url !== undefined) {
      campos.push(`danfe_url = $${paramCount++}`)
      values.push(dados.danfe_url)
    }
    if (dados.motivo_cancelamento !== undefined) {
      campos.push(`motivo_cancelamento = $${paramCount++}`)
      values.push(dados.motivo_cancelamento)
    }
    if (dados.autorizado_em !== undefined) {
      campos.push(`autorizado_em = $${paramCount++}`)
      values.push(dados.autorizado_em)
    }
    if (dados.cancelado_em !== undefined) {
      campos.push(`cancelado_em = $${paramCount++}`)
      values.push(dados.cancelado_em)
    }
    if (dados.metadados !== undefined) {
      campos.push(`metadados = $${paramCount++}`)
      values.push(JSON.stringify(dados.metadados))
    }
    
    if (campos.length === 0) {
      return false
    }
    
    // Adicionar ID no final
    values.push(id)
    
    const query = `
      UPDATE notas_fiscais
      SET ${campos.join(', ')}
      WHERE id = $${paramCount}
    `
    
    try {
      await pool.query(query, values)
      return true
    } catch (error) {
      console.error('[NotaFiscalModel] Erro ao atualizar:', error)
      throw error
    }
  }
  
  /**
   * Obter estatísticas
   */
  async obterEstatisticas() {
    const query = `
      SELECT 
        COUNT(*) as total_notas,
        SUM(CASE WHEN status = 'autorizada' THEN valor_total ELSE 0 END) as faturamento,
        COUNT(CASE WHEN status = 'autorizada' THEN 1 END) as notas_autorizadas,
        COUNT(CASE WHEN status = 'emitindo' THEN 1 END) as notas_pendentes,
        COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as notas_canceladas,
        COUNT(CASE WHEN status = 'erro' THEN 1 END) as notas_erro
      FROM notas_fiscais
    `
    
    try {
      const result = await pool.query(query)
      return result.rows[0]
    } catch (error) {
      console.error('[NotaFiscalModel] Erro ao obter estatísticas:', error)
      throw error
    }
  }
  
  /**
   * Obter estatísticas por status de um período específico
   * @param {string} periodo - Período no formato YYYY-MM (ex: 2024-01)
   */
  async obterEstatisticasPorPeriodo(periodo) {
    if (!periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
      throw new Error('Período inválido. Use formato YYYY-MM (ex: 2024-01)')
    }
    
    const [ano, mes] = periodo.split('-')
    const dataInicio = new Date(parseInt(ano), parseInt(mes) - 1, 1)
    const dataFim = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59)
    
    const query = `
      SELECT 
        COUNT(*) as total_notas,
        SUM(CASE WHEN status = 'autorizada' THEN valor_total ELSE 0 END) as faturamento,
        COUNT(CASE WHEN status = 'autorizada' THEN 1 END) as notas_autorizadas,
        COUNT(CASE WHEN status = 'emitindo' THEN 1 END) as notas_emitindo,
        COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as notas_canceladas,
        COUNT(CASE WHEN status = 'erro' THEN 1 END) as notas_erro
      FROM notas_fiscais
      WHERE emitido_em >= $1 AND emitido_em <= $2
    `
    
    try {
      const result = await pool.query(query, [dataInicio, dataFim])
      const stats = result.rows[0]
      
      return {
        totalNotas: parseInt(stats.total_notas) || 0,
        faturamento: parseFloat(stats.faturamento) || 0,
        autorizadas: parseInt(stats.notas_autorizadas) || 0,
        emitindo: parseInt(stats.notas_emitindo) || 0,
        canceladas: parseInt(stats.notas_canceladas) || 0,
        erro: parseInt(stats.notas_erro) || 0
      }
    } catch (error) {
      console.error('[NotaFiscalModel] Erro ao obter estatísticas por período:', error)
      throw error
    }
  }
  
  /**
   * Helper: Calcular data início baseado no período
   * @private
   */
  _calcularDataInicio(periodo) {
    const hoje = new Date()
    
    switch (periodo) {
      case '7d':
        hoje.setDate(hoje.getDate() - 7)
        break
      case '30d':
        hoje.setDate(hoje.getDate() - 30)
        break
      case '90d':
        hoje.setDate(hoje.getDate() - 90)
        break
      default:
        return null
    }
    
    return hoje
  }
}

module.exports = new NotaFiscalModel()
