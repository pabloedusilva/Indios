// =============================================================
//  services/PixPaymentService.js — Serviço de Pagamentos PIX
//
//  Responsabilidades:
//    · Criar pagamentos PIX via API do Mercado Pago
//    · Validar webhooks com assinatura HMAC
//    · Consultar status de pagamentos na API
//    · Gerenciar configurações e credenciais
// =============================================================

const { MercadoPagoConfig, Payment } = require('mercadopago')
const crypto = require('crypto')

// ── Validação de variáveis críticas ──────────────────────────
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET
const VALOR_MENSALIDADE = parseFloat(process.env.VALOR_MENSALIDADE || '99.90')

if (!MP_ACCESS_TOKEN) {
  console.error('[PixPaymentService] ERRO: MP_ACCESS_TOKEN não configurado')
  process.exit(1)
}

if (!MP_WEBHOOK_SECRET) {
  console.error('[PixPaymentService] ERRO: MP_WEBHOOK_SECRET não configurado')
  process.exit(1)
}

// ── Cliente SDK Mercado Pago ──────────────────────────────────
const mpClient = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: { 
    timeout: 15000,
    idempotencyKey: undefined
  },
})

// ── Helpers ───────────────────────────────────────────────────

function mesAtual() {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 7)
}

function gerarIdempotencyKey(usuarioId, mesReferencia) {
  return crypto.createHash('sha256')
    .update(`${usuarioId}-${mesReferencia}-${Date.now()}`)
    .digest('hex')
    .substring(0, 32)
}

// ── PixPaymentService ─────────────────────────────────────────

class PixPaymentService {
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

  validateCredentials() {
    const { credentialType } = this.detectEnvironment()
    
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
    
    return {
      valid: true,
      message: `Credenciais ${credentialType} válidas`
    }
  }

  async criarPagamentoPix(usuarioId) {
    const mes = mesAtual()
    
    const environmentInfo = this.detectEnvironment()
    const credentialValidation = this.validateCredentials()
    
    if (!credentialValidation.valid) {
      throw new Error(`Erro de configuração: ${credentialValidation.message}`)
    }

    const idempotencyKey = gerarIdempotencyKey(usuarioId, mes)
    const paymentClient = new Payment(new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: { 
        timeout: 15000,
        idempotencyKey
      }
    }))

    const paymentData = {
      transaction_amount: VALOR_MENSALIDADE,
      description: `Mensalidade IndiosManager - ${mes}`,
      payment_method_id: 'pix',
      external_reference: `${usuarioId}|${mes}`,
      notification_url: `${process.env.APP_URL}/api/pagamentos/webhook`,
      
      payer: {
        email: 'cliente@indiosmanager.com',
        first_name: 'Cliente',
        last_name: 'IndiosManager',
        identification: {
          type: 'CPF',
          number: '11111111111'
        }
      },
      
      metadata: {
        usuario_id: usuarioId,
        mes_referencia: mes,
        environment: environmentInfo.environment,
        credential_type: environmentInfo.credentialType,
        created_at: new Date().toISOString(),
        payment_type: 'pix_only'
      }
    }

    console.log(`[PixPaymentService] Criando pagamento PIX para usuário ${usuarioId}, mês ${mes}`)
    console.log(`[PixPaymentService] Ambiente: ${environmentInfo.environment}, Credencial: ${environmentInfo.credentialType}`)
    console.log(`[PixPaymentService] Valor: R$ ${VALOR_MENSALIDADE}`)
    console.log(`[PixPaymentService] Idempotency Key: ${idempotencyKey}`)

    try {
      const payment = await paymentClient.create({ body: paymentData })

      console.log(`[PixPaymentService] Pagamento PIX criado com sucesso: ${payment.id}`)
      console.log(`[PixPaymentService] Status: ${payment.status}`)
      console.log(`[PixPaymentService] QR Code disponível: ${!!payment.point_of_interaction?.transaction_data?.qr_code}`)

      const transactionData = payment.point_of_interaction?.transaction_data
      
      if (!transactionData?.qr_code) {
        throw new Error('QR Code PIX não foi gerado pela API do Mercado Pago')
      }

      return {
        id: payment.id,
        status: payment.status,
        qrCode: transactionData.qr_code,
        qrCodeBase64: transactionData.qr_code_base64,
        valor: VALOR_MENSALIDADE,
        mesReferencia: mes,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        environment: environmentInfo.environment,
        credentialType: environmentInfo.credentialType
      }

    } catch (error) {
      console.error(`[PixPaymentService] Erro ao criar pagamento PIX:`, error.message)
      
      if (error.cause) {
        console.error(`[PixPaymentService] Causa:`, error.cause)
      }
      
      if (error.status === 400) {
        throw new Error('Dados inválidos para criação do pagamento PIX')
      } else if (error.status === 401) {
        throw new Error('Credenciais do Mercado Pago inválidas')
      } else if (error.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos')
      } else {
        throw new Error(`Erro interno do Mercado Pago: ${error.message}`)
      }
    }
  }

  async consultarPagamento(paymentId, maxTentativas = 3, timeoutMs = 10000) {
    const paymentClient = new Payment(mpClient)
    let ultimoErro = null
    
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
      try {
        console.log(`[PixPaymentService] Consultando pagamento ${paymentId} (tentativa ${tentativa}/${maxTentativas})`)
        
        const startTime = Date.now()
        
        const consultaPromise = paymentClient.get({ id: String(paymentId) })
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout de ${timeoutMs}ms excedido`)), timeoutMs)
        })
        
        const payment = await Promise.race([consultaPromise, timeoutPromise])
        const duration = Date.now() - startTime
        
        console.log(`[PixPaymentService] Pagamento consultado em ${duration}ms - Status: ${payment.status}`)
        
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
        console.error(`[PixPaymentService] Erro na tentativa ${tentativa}:`, err.message)
        
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
          
          console.log(`[PixPaymentService] Aguardando ${delay}ms antes da próxima tentativa`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw ultimoErro
  }

  verificarAssinaturaWebhook(xSignature, xRequestId, dataId) {
    if (!MP_WEBHOOK_SECRET) {
      console.error('[PixPaymentService] WEBHOOK_SECRET não configurado')
      return false
    }
    
    if (!xSignature || !xRequestId) {
      console.error('[PixPaymentService] Headers x-signature ou x-request-id ausentes')
      return false
    }

    try {
      const parts = {}
      xSignature.split(',').forEach((part) => {
        const [k, v] = part.trim().split('=')
        if (k && v) parts[k] = v
      })

      if (!parts.ts || !parts.v1) {
        console.error('[PixPaymentService] Formato de assinatura inválido')
        return false
      }

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`

      const esperada = crypto
        .createHmac('sha256', MP_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex')

      const recebida = Buffer.from(parts.v1, 'hex')
      const calculada = Buffer.from(esperada, 'hex')

      if (recebida.length !== calculada.length) {
        console.error('[PixPaymentService] Tamanho da assinatura não confere')
        return false
      }
      
      const isValid = crypto.timingSafeEqual(recebida, calculada)
      
      if (isValid) {
        console.log('[PixPaymentService] Assinatura webhook válida')
      } else {
        console.error('[PixPaymentService] Assinatura webhook inválida')
      }
      
      return isValid
      
    } catch (error) {
      console.error('[PixPaymentService] Erro ao verificar assinatura:', error.message)
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

module.exports = new PixPaymentService()