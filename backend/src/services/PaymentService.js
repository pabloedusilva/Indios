// =============================================================
//  services/PaymentService.js — Integração com Mercado Pago
//
//  Responsabilidades:
//    · Criar preference de checkout (Mercado Pago Checkout Pro)
//    · Verificar assinatura HMAC dos webhooks
//    · Consultar status de pagamento por preferenceId
//
//  Variáveis de ambiente obrigatórias (.env):
//    MP_ACCESS_TOKEN   → Access Token do Mercado Pago (começa com APP_USR-)
//    MP_WEBHOOK_SECRET → Secret para validar assinatura do webhook (x-signature)
//    VALOR_MENSALIDADE → Valor fixo em reais (ex: 99.90)
//    APP_URL           → URL pública do backend (para back_urls e webhook)
//    CLIENT_URL        → URL pública do frontend (para back_urls de retorno)
// =============================================================

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago')
const crypto = require('crypto')

// ── Validação de variáveis críticas ──────────────────────────
const MP_ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET
const VALOR_MENSALIDADE = parseFloat(process.env.VALOR_MENSALIDADE || '99.90')
const APP_URL           = process.env.APP_URL   || 'http://localhost:3333'
const CLIENT_URL        = process.env.CLIENT_URL || 'http://localhost:5173'

if (!MP_ACCESS_TOKEN) {
  process.exit(1)
}

// ── Cliente SDK Mercado Pago ──────────────────────────────────
const mpClient = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: { timeout: 15000 },
})

// ── Helpers ───────────────────────────────────────────────────

function mesAtual() {
  // Formato YYYY-MM em horário de Brasília
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 7)
}

// ── PaymentService ────────────────────────────────────────────

class PaymentService {
  /**
   * Detecta o tipo de ambiente baseado no prefixo do MP_ACCESS_TOKEN.
   * 
   * @returns {{ environment: string, isProduction: boolean, credentialType: string }}
   */
  detectEnvironment() {
    if (!MP_ACCESS_TOKEN) {
      return {
        environment: 'unknown',
        isProduction: false,
        credentialType: 'missing'
      }
    }

    const isProductionCredential = MP_ACCESS_TOKEN.startsWith('APP_USR-')
    const isSandboxCredential = MP_ACCESS_TOKEN.startsWith('TEST-')
    
    let credentialType = 'unknown'
    if (isProductionCredential) {
      credentialType = 'production'
    } else if (isSandboxCredential) {
      credentialType = 'sandbox'
    }

    const nodeEnv = process.env.NODE_ENV || 'development'
    const isProduction = isProductionCredential && nodeEnv === 'production'
    
    return {
      environment: isProduction ? 'production' : 'development',
      isProduction,
      credentialType
    }
  }

  /**
   * Valida se as credenciais estão configuradas corretamente para o ambiente.
   * 
   * @returns {{ valid: boolean, message?: string }}
   */
  validateCredentials() {
    const { environment, isProduction, credentialType } = this.detectEnvironment()
    
    if (credentialType === 'missing') {
      return {
        valid: false,
        message: 'MP_ACCESS_TOKEN não configurado'
      }
    }
    
    if (credentialType === 'unknown') {
      return {
        valid: false,
        message: 'MP_ACCESS_TOKEN com formato inválido (deve começar com APP_USR- ou TEST-)'
      }
    }
    
    const nodeEnv = process.env.NODE_ENV || 'development'
    
    if (credentialType === 'production' && nodeEnv === 'development') {
    }
    
    if (credentialType === 'sandbox' && nodeEnv === 'production') {
    }
    
    return {
      valid: true,
      message: `Credenciais ${credentialType} válidas para ambiente ${environment}`
    }
  }

  /**
   * Cria uma preference de checkout no Mercado Pago.
   * O frontend redireciona o usuário para o init_point retornado.
   *
   * @param {string} usuarioId   - ID do usuário autenticado (external_reference)
   * @returns {{ preferenceId, checkoutUrl, sandboxUrl, valor, mesReferencia, environment, credentialType }}
   */
  async criarPreference(usuarioId) {
    const mes = mesAtual()
    
    const environmentInfo = this.detectEnvironment()
    const credentialValidation = this.validateCredentials()
    
    if (!credentialValidation.valid) {
      throw new Error(`Erro de configuração: ${credentialValidation.message}`)
    }

    const preference = new Preference(mpClient)

    const body = {
      items: [
        {
          id:          `mensalidade-${mes}`,
          title:       `Mensalidade IndiosManager — ${mes}`,
          description: 'Pagamento mensal do servidor IndiosManager',
          quantity:    1,
          unit_price:  VALOR_MENSALIDADE,
          currency_id: 'BRL',
        },
      ],
      external_reference: `${usuarioId}|${mes}`,
      notification_url: `${APP_URL}/api/pagamentos/webhook`,
      
      // Configuração de métodos de pagamento - PIX prioritário
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1, // Apenas à vista
        default_payment_method_id: null,
      },
      
      // URLs de retorno
      back_urls: {
        success: `${CLIENT_URL}/dashboard?payment=success`,
        failure: `${CLIENT_URL}/dashboard?payment=failure`,
        pending: `${CLIENT_URL}/dashboard?payment=pending`,
      },
      auto_return: 'approved',
      
      // Configurações de expiração
      expiration_date_from: new Date().toISOString(),
      expiration_date_to:   new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
      
      // Configurações adicionais de segurança
      binary_mode: false, // Permite status pending para PIX
      
      metadata: {
        usuario_id:     usuarioId,
        mes_referencia: mes,
        environment:    environmentInfo.environment,
        credential_type: environmentInfo.credentialType,
        created_at:     new Date().toISOString(),
      },
      
      // Configurações específicas para PIX
      purpose: 'wallet_purchase',
      
      // Informações do pagador (opcional, mas melhora a experiência)
      payer: {
        name: 'Cliente IndiosManager',
        email: 'cliente@indiosmanager.com',
      },
    }

    console.log(`[PaymentService] Criando preference para usuário ${usuarioId}, mês ${mes}`)
    console.log(`[PaymentService] Ambiente: ${environmentInfo.environment}, Credencial: ${environmentInfo.credentialType}`)
    console.log(`[PaymentService] Valor: R$ ${VALOR_MENSALIDADE}`)

    const result = await preference.create({ body })

    console.log(`[PaymentService] Preference criada com sucesso: ${result.id}`)
    console.log(`[PaymentService] Checkout URL: ${result.init_point}`)
    if (result.sandbox_init_point) {
      console.log(`[PaymentService] Sandbox URL: ${result.sandbox_init_point}`)
    }

    return {
      preferenceId: result.id,
      checkoutUrl:  result.init_point,
      sandboxUrl:   result.sandbox_init_point,
      valor:        VALOR_MENSALIDADE,
      mesReferencia: mes,
      environment: environmentInfo.environment,
      credentialType: environmentInfo.credentialType,
      isProduction: environmentInfo.isProduction,
    }
  }

  /**
   * Consulta o status de um pagamento pelo ID retornado pelo webhook.
   * Retorna o objeto de pagamento completo do Mercado Pago.
   * Inclui retry com backoff exponencial para falhas temporárias.
   *
   * @param {string|number} paymentId
   * @param {number} maxTentativas - Número máximo de tentativas (padrão: 3)
   * @param {number} timeoutMs - Timeout por tentativa em ms (padrão: 10000)
   */
  async consultarPagamento(paymentId, maxTentativas = 3, timeoutMs = 10000) {
    const paymentClient = new Payment(mpClient)
    let ultimoErro = null
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        const startTime = Date.now()
        
        const consultaPromise = paymentClient.get({ id: String(paymentId) })
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido`)), timeoutMs)
        })
        
        const payment = await Promise.race([consultaPromise, timeoutPromise])
        const duration = Date.now() - startTime
        
        if (!payment || typeof payment !== 'object') {
          throw new Error('Resposta da API inválida ou vazia')
        }

        const camposObrigatorios = ['id', 'status']
        const camposFaltando = camposObrigatorios.filter(campo => !payment.hasOwnProperty(campo))
        
        if (camposFaltando.length > 0) {
          throw new Error(`Campos obrigatórios ausentes na resposta: ${camposFaltando.join(', ')}`)
        }

        if (String(payment.id) !== String(paymentId)) {
          throw new Error(`ID do pagamento não confere: esperado ${paymentId}, recebido ${payment.id}`)
        }

        return payment
        
      } catch (err) {
        ultimoErro = err
        const isNetworkError = err.message.includes('timeout') || 
                              err.message.includes('ECONNRESET') || 
                              err.message.includes('ENOTFOUND') ||
                              err.message.includes('ECONNREFUSED')
        
        const isRateLimitError = err.status === 429 || err.message.includes('rate limit')
        const isServerError = err.status >= 500 && err.status < 600
        
        if (!isNetworkError && !isRateLimitError && !isServerError && tentativa === 1) {
          throw err
        }
        
        if (tentativa < maxTentativas) {
          let delay = Math.pow(2, tentativa - 1) * 1000
          
          if (isRateLimitError) {
            delay = Math.max(delay, 5000)
          }
          
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw ultimoErro
  }

  /**
   * Verifica a assinatura do webhook do Mercado Pago.
   *
   * O Mercado Pago envia o header x-signature com o formato:
   *   ts=<timestamp>,v1=<hash>
   * e o header x-request-id com o ID da requisição.
   *
   * @param {string} xSignature  - Valor do header x-signature
   * @param {string} xRequestId  - Valor do header x-request-id
   * @param {string} dataId      - ID do dado (ex: id do pagamento) do query param
   * @returns {boolean}
   */
  verificarAssinaturaWebhook(xSignature, xRequestId, dataId) {
    if (!MP_WEBHOOK_SECRET) {
      return false
    }
    if (!xSignature || !xRequestId) return false

    try {
      const parts = {}
      xSignature.split(',').forEach((part) => {
        const [k, v] = part.trim().split('=')
        if (k && v) parts[k] = v
      })

      if (!parts.ts || !parts.v1) return false

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`

      const esperada = crypto
        .createHmac('sha256', MP_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex')

      const recebida = Buffer.from(parts.v1, 'hex')
      const calculada = Buffer.from(esperada, 'hex')

      if (recebida.length !== calculada.length) return false
      return crypto.timingSafeEqual(recebida, calculada)
    } catch {
      return false
    }
  }

  get valorMensalidade() {
    return VALOR_MENSALIDADE
  }

  get mesAtual() {
    return mesAtual()
  }
}

module.exports = new PaymentService()