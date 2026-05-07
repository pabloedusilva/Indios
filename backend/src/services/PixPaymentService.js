// =============================================================
//  services/PixPaymentService.js — Serviço de Pagamentos PIX
//
//  Responsabilidades:
//    · Criar pagamentos PIX via API do Mercado Pago
//    · Validar assinatura HMAC dos webhooks
//    · Consultar status de pagamentos com retry
// =============================================================

const { MercadoPagoConfig, Payment } = require('mercadopago')
const crypto = require('crypto')

// ── Variáveis de ambiente ─────────────────────────────────────
const MP_ACCESS_TOKEN   = process.env.MP_ACCESS_TOKEN
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET
const VALOR_MENSALIDADE = parseFloat(process.env.VALOR_MENSALIDADE || '99.90')
const APP_URL           = (process.env.APP_URL || '').replace(/\/$/, '')

// ── Cliente base do SDK ───────────────────────────────────────
const mpClient = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: { timeout: 15000 },
})

// ── Helpers ───────────────────────────────────────────────────

function mesAtual() {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 7)
}

// forcarNovo=true → inclui timestamp → Mercado Pago cria novo pagamento
// forcarNovo=false → chave determinística → Mercado Pago reutiliza se existir
function gerarIdempotencyKey(usuarioId, mesReferencia, forcarNovo = false) {
  const seed = forcarNovo
    ? `${usuarioId}-${mesReferencia}-${Date.now()}`
    : `${usuarioId}-${mesReferencia}`
  return crypto.createHash('sha256').update(seed).digest('hex').substring(0, 36)
}

// ── Classe principal ──────────────────────────────────────────

class PixPaymentService {

  detectEnvironment() {
    if (!MP_ACCESS_TOKEN) return { environment: 'unknown', isProduction: false, credentialType: 'missing' }
    const isProd    = MP_ACCESS_TOKEN.startsWith('APP_USR-')
    const isSandbox = MP_ACCESS_TOKEN.startsWith('TEST-')
    const credentialType = isProd ? 'production' : isSandbox ? 'sandbox' : 'unknown'
    return {
      environment:    isProd && process.env.NODE_ENV === 'production' ? 'production' : 'development',
      isProduction:   isProd && process.env.NODE_ENV === 'production',
      credentialType,
    }
  }

  // Cria um pagamento PIX na API do Mercado Pago.
  // forcarNovo=true → gera nova idempotencyKey com timestamp,
  //   garantindo que o Mercado Pago crie um novo pagamento mesmo
  //   que já exista um anterior expirado com a mesma chave.
  async criarPagamentoPix(usuarioId, forcarNovo = false) {
    const mes = mesAtual()
    const env = this.detectEnvironment()

    if (!MP_ACCESS_TOKEN) {
      throw new Error('MP_ACCESS_TOKEN não configurado nas variáveis de ambiente')
    }
    if (env.credentialType === 'unknown') {
      throw new Error('MP_ACCESS_TOKEN com formato inválido (deve começar com APP_USR- ou TEST-)')
    }

    const notificationUrl = `${APP_URL}/api/pagamentos/webhook`
    const idempotencyKey  = gerarIdempotencyKey(usuarioId, mes, forcarNovo)

    const paymentClient = new Payment(new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN,
      options: { timeout: 15000, idempotencyKey },
    }))

    const body = {
      transaction_amount: VALOR_MENSALIDADE,
      description:        `Mensalidade IndiosManager - ${mes}`,
      payment_method_id:  'pix',
      external_reference: `${usuarioId}|${mes}`,
      notification_url:   notificationUrl,
      date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      payer: {
        email:          'pagador@indiosmanager.com',
        first_name:     'Pagador',
        last_name:      'IndiosManager',
        identification: { type: 'CPF', number: '11111111111' },
      },
      metadata: {
        usuario_id:     usuarioId,
        mes_referencia: mes,
        environment:    env.environment,
        forcado_novo:   forcarNovo,
      },
    }

    try {
      const payment = await paymentClient.create({ body })
      const txData  = payment.point_of_interaction?.transaction_data

      if (!txData?.qr_code) {
        throw new Error('QR Code não retornado pela API do Mercado Pago')
      }

      return {
        id:            String(payment.id),
        status:        payment.status,
        qrCode:        txData.qr_code,
        qrCodeBase64:  txData.qr_code_base64 || null,
        valor:         VALOR_MENSALIDADE,
        mesReferencia: mes,
        expiresAt:     new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

    } catch (err) {
      if (err.status === 400) throw new Error(`Dados inválidos para criação do PIX: ${err.cause ? JSON.stringify(err.cause) : err.message}`)
      if (err.status === 401) throw new Error('Credenciais do Mercado Pago inválidas ou expiradas (401)')
      if (err.status === 403) throw new Error('Sem permissão para criar pagamentos PIX (403) — verifique as permissões da aplicação')
      if (err.status === 429) throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos')
      throw new Error(`Erro na API do Mercado Pago (${err.status || 'sem status'}): ${err.message}`)
    }
  }

  // Consulta o status real de um pagamento na API (com retry e backoff)
  async consultarPagamento(paymentId, maxTentativas = 3, timeoutMs = 10000) {
    const client = new Payment(mpClient)
    let ultimoErro

    for (let i = 1; i <= maxTentativas; i++) {
      try {
        const payment = await Promise.race([
          client.get({ id: String(paymentId) }),
          new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout ${timeoutMs}ms`)), timeoutMs)),
        ])

        if (!payment?.id) throw new Error('Resposta inválida da API')
        if (String(payment.id) !== String(paymentId)) throw new Error(`ID divergente: esperado ${paymentId}, recebido ${payment.id}`)

        return payment

      } catch (err) {
        ultimoErro = err

        const retry = err.message.includes('timeout') ||
                      err.message.includes('ECONNRESET') ||
                      err.message.includes('ENOTFOUND') ||
                      err.status === 429 ||
                      (err.status >= 500 && err.status < 600)

        if (!retry) throw err
        if (i < maxTentativas) {
          const delay = Math.min(Math.pow(2, i - 1) * 1000, 8000)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    throw ultimoErro
  }

  // Verifica a assinatura HMAC do webhook do Mercado Pago
  verificarAssinaturaWebhook(xSignature, xRequestId, dataId) {
    if (!MP_WEBHOOK_SECRET || !xSignature || !xRequestId) return false

    try {
      const parts = Object.fromEntries(
        xSignature.split(',').map(p => p.trim().split('=')).filter(([k, v]) => k && v)
      )

      if (!parts.ts || !parts.v1) return false

      const manifest    = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`
      const esperada    = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex')
      const bufEsperada = Buffer.from(esperada, 'hex')
      const bufRecebida = Buffer.from(parts.v1, 'hex')

      if (bufEsperada.length !== bufRecebida.length) return false

      return crypto.timingSafeEqual(bufEsperada, bufRecebida)

    } catch {
      return false
    }
  }

  get valorMensalidade() { return VALOR_MENSALIDADE }
  get mesAtual()         { return mesAtual() }
}

module.exports = new PixPaymentService()
