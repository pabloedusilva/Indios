// =============================================================
//  services/PixPaymentService.js — Serviço de Pagamentos PIX
// =============================================================

const crypto = require('crypto')
const axios = require('axios')

class PixPaymentService {
  constructor() {
    this.accessToken = process.env.MP_ACCESS_TOKEN
    this.publicKey = process.env.MP_PUBLIC_KEY
    this.webhookSecret = process.env.MP_WEBHOOK_SECRET
    this.valorMensalidade = parseFloat(process.env.VALOR_MENSALIDADE || '2.00')
    this.baseURL = 'https://api.mercadopago.com'
  }
  
  /**
   * Criar pagamento PIX no Mercado Pago
   */
  async criarPagamentoPix(usuarioId, forcarNovo = false) {
    try {
      if (!this.accessToken) {
        throw new Error('Credenciais do Mercado Pago não configuradas')
      }
      
      const mesReferencia = this._mesAtual()
      const idempotencyKey = forcarNovo 
        ? `${usuarioId}_${mesReferencia}_${Date.now()}`
        : `${usuarioId}_${mesReferencia}`
      
      const payload = {
        transaction_amount: this.valorMensalidade,
        description: `Mensalidade ${mesReferencia} - Índios Churrasco Gourmet`,
        payment_method_id: 'pix',
        payer: {
          email: `user${usuarioId}@indioschurrasco.com.br`
        },
        external_reference: `${usuarioId}|${mesReferencia}`
      }
      
      const response = await axios.post(
        `${this.baseURL}/v1/payments`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey
          }
        }
      )
      
      const payment = response.data
      
      return {
        id: payment.id,
        valor: payment.transaction_amount,
        qrCode: payment.point_of_interaction?.transaction_data?.qr_code || '',
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        expiresAt: payment.date_of_expiration || null
      }
      
    } catch (error) {
      console.error('[PixPaymentService.criarPagamentoPix] Erro:', error.message)
      
      if (error.response?.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.')
      }
      
      if (error.response?.status === 401) {
        throw new Error('Credenciais inválidas do Mercado Pago')
      }
      
      throw new Error(error.message || 'Erro ao criar pagamento PIX')
    }
  }
  
  /**
   * Consultar pagamento
   */
  async consultarPagamento(paymentId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )
      
      return response.data
      
    } catch (error) {
      console.error('[PixPaymentService.consultarPagamento] Erro:', error.message)
      throw new Error('Erro ao consultar pagamento')
    }
  }
  
  /**
   * Verificar assinatura do webhook
   */
  verificarAssinaturaWebhook(xSignature, xRequestId, dataId) {
    try {
      if (!xSignature || !xRequestId || !dataId) {
        return false
      }
      
      if (!this.webhookSecret) {
        console.warn('⚠️  MP_WEBHOOK_SECRET não configurado')
        return true // Aceitar em dev se não tiver secret
      }
      
      const parts = xSignature.split(',')
      const tsValue = parts.find(p => p.startsWith('ts='))?.split('=')[1]
      const v1Value = parts.find(p => p.startsWith('v1='))?.split('=')[1]
      
      if (!tsValue || !v1Value) return false
      
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsValue};`
      const hmac = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(manifest)
        .digest('hex')
      
      return hmac === v1Value
      
    } catch (error) {
      console.error('[PixPaymentService.verificarAssinaturaWebhook] Erro:', error)
      return false
    }
  }
  
  /**
   * Detectar ambiente
   */
  detectEnvironment() {
    return {
      environment: process.env.NODE_ENV || 'development',
      hasCredentials: !!this.accessToken
    }
  }
  
  /**
   * Mês atual no formato YYYY-MM
   */
  _mesAtual() {
    const agora = new Date()
    const ano = agora.getFullYear()
    const mes = String(agora.getMonth() + 1).padStart(2, '0')
    return `${ano}-${mes}`
  }
}

// Exportar instância singleton
module.exports = new PixPaymentService()
