// ════════════════════════════════════════════════════════════════════════════
// services/FocusNFeClient.js — Cliente HTTP para API Focus NFe
// ════════════════════════════════════════════════════════════════════════════
// Gerencia todas as chamadas à API Focus NFe com:
// - Autenticação HTTP Basic
// - Retry automático
// - Tratamento de erros
// - Logs de auditoria
// - Timeout configurável
// ════════════════════════════════════════════════════════════════════════════

const axios = require('axios')
const fiscalConfig = require('../config/fiscal')

class FocusNFeClient {
  constructor() {
    this.baseURL = fiscalConfig.API_BASE_URL
    this.token = fiscalConfig.API_TOKEN
    this.timeout = fiscalConfig.TIMEOUT_MS
    this.maxRetries = fiscalConfig.MAX_RETRIES
    this.debug = fiscalConfig.DEBUG
    
    // Criar instância do axios configurada
    this._createAxiosClient()
  }
  
  /**
   * Cria/recria o cliente axios com as configurações atuais
   * @private
   */
  _createAxiosClient() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      auth: {
        username: this.token,
        password: '' // Senha vazia conforme documentação Focus NFe
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Não rejeitar em erros HTTP (tratar manualmente)
      validateStatus: () => true
    })
    
    // Interceptor para logs (apenas em debug)
    if (this.debug) {
      this.client.interceptors.request.use((config) => {
        console.log(`[FocusNFe Request] ${config.method.toUpperCase()} ${config.url}`)
        return config
      })
      
      this.client.interceptors.response.use((response) => {
        console.log(`[FocusNFe Response] ${response.status} ${response.config.url}`)
        return response
      })
    }
  }
  
  /**
   * Atualiza o token de autenticação
   * @param {string} novoToken - Novo token da API Focus NFe
   */
  setToken(novoToken) {
    if (!novoToken) {
      throw new Error('Token não pode ser vazio')
    }
    this.token = novoToken
    this._createAxiosClient() // Recria o cliente com o novo token
  }
  
  // ── Métodos privados de retry ──────────────────────────────────────────
  
  /**
   * Executa uma chamada com retry automático
   * @private
   */
  async _callWithRetry(fn, retries = this.maxRetries) {
    try {
      return await fn()
    } catch (error) {
      if (retries > 0 && this._isRetryable(error)) {
        console.warn(`⚠️  Tentativa falhou. Tentando novamente... (${retries} restantes)`)
        await this._sleep(1000 * (this.maxRetries - retries + 1)) // Backoff exponencial
        return await this._callWithRetry(fn, retries - 1)
      }
      throw error
    }
  }
  
  /**
   * Verifica se um erro é retryable
   * @private
   */
  _isRetryable(error) {
    // Retry em erros de rede ou timeout
    if (error.code === 'ECONNABORTED') return true
    if (error.code === 'ETIMEDOUT') return true
    if (error.code === 'ENOTFOUND') return true
    
    // Retry em 5xx (erros do servidor)
    if (error.response && error.response.status >= 500) return true
    
    // Retry em 429 (rate limit)
    if (error.response && error.response.status === 429) return true
    
    return false
  }
  
  /**
   * Sleep helper
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  /**
   * Trata resposta da API
   * @private
   */
  _handleResponse(response) {
    const { status, data } = response
    
    // Sucesso (2xx)
    if (status >= 200 && status < 300) {
      return { success: true, data }
    }
    
    // Erro (4xx ou 5xx)
    const error = new Error(data.mensagem || data.message || 'Erro desconhecido')
    error.status = status
    error.data = data
    error.code = data.codigo || data.code
    
    throw error
  }
  
  // ── Métodos públicos da API NFe ────────────────────────────────────────
  
  /**
   * Lista empresas cadastradas
   * GET /v2/empresas
   */
  async listarEmpresas() {
    return this._callWithRetry(async () => {
      const response = await this.client.get('/v2/empresas')
      return this._handleResponse(response)
    })
  }
  
  /**
   * Autoriza uma NFC-e (Nota Fiscal de Consumidor Eletrônica - Modelo 65)
   * POST /v2/nfce?ref={referencia}
   * 
   * @param {string} referencia - Identificador único da nota
   * @param {object} dados - Dados da NFC-e conforme API Focus NFe
   */
  async autorizarNFCe(referencia, dados) {
    return this._callWithRetry(async () => {
      const response = await this.client.post(`/v2/nfce?ref=${referencia}`, dados)
      
      return this._handleResponse(response)
    })
  }
  
  /**
   * Consulta status de uma NFC-e
   * GET /v2/nfce/{referencia}
   * 
   * @param {string} referencia - Identificador único da nota
   */
  async consultarNFCe(referencia) {
    return this._callWithRetry(async () => {
      const response = await this.client.get(`/v2/nfce/${referencia}`)
      return this._handleResponse(response)
    })
  }
  
  /**
   * Cancela uma NFC-e autorizada
   * DELETE /v2/nfce/{referencia}
   * 
   * @param {string} referencia - Identificador único da nota
   * @param {string} justificativa - Motivo do cancelamento (min 15, max 255 caracteres)
   */
  async cancelarNFCe(referencia, justificativa) {
    const { sanitizarMotivo } = require('../utils/fiscalUtils')
    
    // Sanitizar justificativa
    const justificativaLimpa = sanitizarMotivo(justificativa)
    
    // Validar tamanho
    if (!justificativaLimpa || justificativaLimpa.length < 15) {
      throw new Error('Justificativa deve ter no mínimo 15 caracteres')
    }
    
    if (justificativaLimpa.length > 255) {
      throw new Error('Justificativa deve ter no máximo 255 caracteres')
    }
    
    return this._callWithRetry(async () => {
      // Timeout específico para cancelamento (45 segundos)
      const response = await this.client.delete(`/v2/nfce/${referencia}`, {
        data: { justificativa: justificativaLimpa },
        timeout: 45000 // 45 segundos
      })
      return this._handleResponse(response)
    })
  }
  
  /**
   * Baixa XML da NFC-e
   * GET /v2/nfce/{referencia}.xml
   * 
   * IMPORTANTE: Este endpoint retorna JSON, não XML!
   * Para obter o XML real, use downloadXMLPorCaminho() com o caminho retornado pela consulta
   * 
   * @param {string} referencia - Identificador único da nota
   */
  async downloadXMLNFCe(referencia) {
    return this._callWithRetry(async () => {
      const response = await this.client.get(`/v2/nfce/${referencia}.xml`, {
        responseType: 'text' // Força axios a tratar como texto/XML
      })
      return this._handleResponse(response)
    })
  }
  
  /**
   * Baixa XML usando o caminho completo retornado pela API
   * 
   * @param {string} caminhoXml - Caminho do XML (ex: /arquivos_development/.../nfe.xml)
   * @returns {string} Conteúdo XML
   */
  async downloadXMLPorCaminho(caminhoXml) {
    return this._callWithRetry(async () => {
      const response = await this.client.get(caminhoXml, {
        responseType: 'text' // Retorna string (XML)
      })
      // Para download de arquivo, retornar direto sem _handleResponse
      return response.data
    })
  }
  
  /**
   * Baixa DANFE (PDF) da NFC-e
   * GET /v2/nfce/{referencia}.pdf
   * 
   * @param {string} referencia - Identificador único da nota
   */
  async downloadDANFENFCe(referencia) {
    return this._callWithRetry(async () => {
      const response = await this.client.get(`/v2/nfce/${referencia}.pdf`, {
        responseType: 'arraybuffer'
      })
      return this._handleResponse(response)
    })
  }
  
  /**
   * Autoriza uma NFe
   * POST /v2/nfe?ref={referencia}
   * 
   * @param {string} referencia - Identificador único da nota
   * @param {object} dados - Dados da NFe conforme API Focus NFe
   */
  async autorizarNFe(referencia, dados) {
    return this._callWithRetry(async () => {
      const response = await this.client.post(`/v2/nfe?ref=${referencia}`, dados)
      return this._handleResponse(response)
    })
  }
  
  /**
   * Consulta status de uma NFe
   * GET /v2/nfe/{referencia}
   * 
   * @param {string} referencia - Identificador único da nota
   */
  async consultarNFe(referencia) {
    return this._callWithRetry(async () => {
      const response = await this.client.get(`/v2/nfe/${referencia}`)
      return this._handleResponse(response)
    })
  }
  
  /**
   * Cancela uma NFe autorizada
   * DELETE /v2/nfe/{referencia}
   * 
   * @param {string} referencia - Identificador único da nota
   * @param {string} justificativa - Motivo do cancelamento (min 15 caracteres)
   */
  async cancelarNFe(referencia, justificativa) {
    if (!justificativa || justificativa.length < 15) {
      throw new Error('Justificativa deve ter no mínimo 15 caracteres')
    }
    
    return this._callWithRetry(async () => {
      const response = await this.client.delete(`/v2/nfe/${referencia}`, {
        data: { justificativa }
      })
      return this._handleResponse(response)
    })
  }
  
  /**
   * Baixa XML da NFe
   * GET /v2/nfe/{referencia}.xml
   * 
   * @param {string} referencia - Identificador único da nota
   */
  async downloadXML(referencia) {
    return this._callWithRetry(async () => {
      const response = await this.client.get(`/v2/nfe/${referencia}.xml`)
      return this._handleResponse(response)
    })
  }
  
  /**
   * Baixa DANFE (PDF) da NFe
   * GET /v2/nfe/{referencia}.pdf
   * 
   * @param {string} referencia - Identificador único da nota
   */
  async downloadDANFE(referencia) {
    return this._callWithRetry(async () => {
      const response = await this.client.get(`/v2/nfe/${referencia}.pdf`, {
        responseType: 'arraybuffer'
      })
      return this._handleResponse(response)
    })
  }
  
  /**
   * Consulta status do serviço SEFAZ
   * GET /v2/nfe/status
   */
  async consultarStatusServico() {
    return this._callWithRetry(async () => {
      const response = await this.client.get('/v2/nfe/status')
      return this._handleResponse(response)
    })
  }
  
  /**
   * Inutiliza numeração de NFe
   * POST /v2/nfe/inutilizacao
   * 
   * @param {object} dados - { cnpj, serie, numero_inicial, numero_final, justificativa }
   */
  async inutilizarNumeracao(dados) {
    if (!dados.justificativa || dados.justificativa.length < 15) {
      throw new Error('Justificativa deve ter no mínimo 15 caracteres')
    }
    
    return this._callWithRetry(async () => {
      const response = await this.client.post('/v2/nfe/inutilizacao', dados)
      return this._handleResponse(response)
    })
  }
  
  /**
   * Carta de Correção Eletrônica (CC-e)
   * POST /v2/nfe/{referencia}/carta_correcao
   * 
   * @param {string} referencia - Identificador único da nota
   * @param {string} correcao - Texto da correção (min 15 caracteres)
   */
  async cartaCorrecao(referencia, correcao) {
    if (!correcao || correcao.length < 15) {
      throw new Error('Correção deve ter no mínimo 15 caracteres')
    }
    
    return this._callWithRetry(async () => {
      const response = await this.client.post(`/v2/nfe/${referencia}/carta_correcao`, {
        correcao
      })
      return this._handleResponse(response)
    })
  }
  
  /**
   * Manifestação do destinatário
   * POST /v2/nfe/manifesto
   * 
   * @param {object} dados - { chave_nfe, tipo_evento, justificativa }
   * tipo_evento: ciencia_operacao | confirmacao_operacao | desconhecimento_operacao | operacao_nao_realizada
   */
  async manifestarDestinatario(dados) {
    return this._callWithRetry(async () => {
      const response = await this.client.post('/v2/nfe/manifesto', dados)
      return this._handleResponse(response)
    })
  }
}

// Exportar instância singleton
module.exports = new FocusNFeClient()
