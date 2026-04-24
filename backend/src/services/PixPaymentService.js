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

// URL pública do backend — usada na notification_url enviada ao Mercado Pago
// Em produção deve ser a URL do Render (ex: https://api-indios.onrender.com)
// Em desenvolvimento local o webhook não funciona (localhost não é acessível externamente)
const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '')

if (!MP_ACCESS_TOKEN) {
  console.error('[PixService] FATAL: MP_ACCESS_TOKEN não configurado')
  process.exit(1)
}

if (!MP_WEBHOOK_SECRET) {
  console.error('[PixService] FATAL: MP_WEBHOOK_SECRET não configurado')
  process.exit(1)
}

// ── Cliente base do SDK ───────────────────────────────────────
const mpClient = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
  options: { timeout: 15000 },
})

// ── Helpers ───────────────────────────────────────────────────

function mesAtual() {
  // Formato YYYY-MM no horário de Brasília (UTC-3)
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 7)
}

function gerarIdempotencyKey(usuarioId, mesReferencia) {
  // Chave determinística por usuário+mês — evita duplicatas na API
  return crypto
    .createHash('sha256')
    .update(`${usuarioId}-${mesReferencia}`)
    .digest('hex')
    .substring(0, 36)
}

// ── Classe principal ──────────────────────────────────────────

class PixPaymentService {

  // Detecta se as credenciais são de produção ou sandbox
  detectEnvironment() {
    if (!MP_ACCESS_TOKEN) return { environment: 'unknown', isProduction: false, credentialType: 'missing' }

    const isProd    = MP_ACCESS_TOKEN.startsWith('APP_USR-')
    const isSandbox = MP_ACCESS_TOKEN.startsWith('TEST-')

    const credentialType = isProd ? 'production' : isSandbox ? 'sandbox' : 'unknown'
    const isProduction   = isProd && process.env.NODE_ENV === 'production'

    return {
      environment:    isProduction ? 'production' : 'development',
      isProduction,
      credentialType,
    }
  }

  // Cria um pagamento PIX na API do Mercado Pago
  async criarPagamentoPix(usuarioId) {
    const mes = mesAtual()
    const env = this.detectEnvironment()

    if (env.credentialType === 'missing' || env.credentialType === 'unknown') {
      throw new Error(`Credenciais inválidas: ${env.credentialType}`)
    }

    // Aviso se a notification_url for localhost (webhook não vai funcionar)
    const notificationUrl = `${APP_URL}/api/pagamentos/webhook`
    if (APP_URL.includes('localhost') || APP_URL.includes('127.0.0.1')) {
      console.warn('[PixService] ⚠️  APP_URL é localhost — o webhook do Mercado Pago NÃO vai funcionar em desenvolvimento.')
      console.warn('[PixService] ⚠️  Configure APP_URL com a URL pública do Render para receber webhooks.')
    }

    const idempotencyKey = gerarIdempotencyKey(usuarioId, mes)

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
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      payer: {
        email:          'pagador@indiosmanager.com',
        first_name:     'Pagador',
        last_name:      'IndiosManager',
        identification: { type: 'CPF', number: '11111111111' },
      },
      metadata: {
        usuario_id:    usuarioId,
        mes_referencia: mes,
        environment:   env.environment,
      },
    }

    console.log(`[PixService] Criando PIX — usuário: ${usuarioId}, mês: ${mes}, valor: R$${VALOR_MENSALIDADE}`)
    console.log(`[PixService] notification_url: ${notificationUrl}`)
    console.log(`[PixService] idempotencyKey: ${idempotencyKey}`)

    try {
      const payment = await paymentClient.create({ body })

      const txData = payment.point_of_interaction?.transaction_data
      if (!txData?.qr_code) {
        throw new Error('QR Code não retornado pela API do Mercado Pago')
      }

      console.log(`[PixService] PIX criado — id: ${payment.id}, status: ${payment.status}`)

      return {
        id:           String(payment.id),
        status:       payment.status,
        qrCode:       txData.qr_code,
        qrCodeBase64: txData.qr_code_base64 || null,
        valor:        VALOR_MENSALIDADE,
        mesReferencia: mes,
        expiresAt:    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }

    } catch (err) {
      console.error('[PixService] Erro ao criar PIX:', err.message)
      if (err.cause) console.error('[PixService] Causa:', JSON.stringify(err.cause))

      if (err.status === 400) throw new Error('Dados inválidos para criação do PIX')
      if (err.status === 401) throw new Error('Credenciais do Mercado Pago inválidas')
      if (err.status === 429) throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos')
      throw new Error(`Erro na API do Mercado Pago: ${err.message}`)
    }
  }

  // Consulta o status real de um pagamento na API (com retry)
  async consultarPagamento(paymentId, maxTentativas = 3, timeoutMs = 10000) {
    const client = new Payment(mpClient)
    let ultimoErro

    for (let i = 1; i <= maxTentativas; i++) {
      try {
        console.log(`[PixService] Consultando pagamento ${paymentId} (tentativa ${i}/${maxTentativas})`)

        const t0 = Date.now()
        const payment = await Promise.race([
          client.get({ id: String(paymentId) }),
          new Promise((_, rej) => setTimeout(() => rej(new Error(`Timeout ${timeoutMs}ms`)), timeoutMs)),
        ])

        console.log(`[PixService] Consulta OK em ${Date.now() - t0}ms — status: ${payment.status}`)

        if (!payment?.id) throw new Error('Resposta inválida da API')
        if (String(payment.id) !== String(paymentId)) throw new Error(`ID divergente: esperado ${paymentId}, recebido ${payment.id}`)

        return payment

      } catch (err) {
        ultimoErro = err
        console.error(`[PixService] Erro tentativa ${i}:`, err.message)

        const retry = err.message.includes('timeout') ||
                      err.message.includes('ECONNRESET') ||
                      err.message.includes('ENOTFOUND') ||
                      err.status === 429 ||
                      (err.status >= 500 && err.status < 600)

        if (!retry) throw err
        if (i < maxTentativas) {
          const delay = Math.min(Math.pow(2, i - 1) * 1000, 8000)
          console.log(`[PixService] Aguardando ${delay}ms antes de tentar novamente`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    throw ultimoErro
  }

  // Verifica a assinatura HMAC do webhook do Mercado Pago
  verificarAssinaturaWebhook(xSignature, xRequestId, dataId) {
    if (!MP_WEBHOOK_SECRET) {
      console.error('[PixService] MP_WEBHOOK_SECRET não configurado')
      return false
    }

    if (!xSignature || !xRequestId) {
      console.error('[PixService] Headers x-signature ou x-request-id ausentes')
      return false
    }

    try {
      // Parsear "ts=...,v1=..."
      const parts = Object.fromEntries(
        xSignature.split(',').map(p => p.trim().split('=')).filter(([k, v]) => k && v)
      )

      if (!parts.ts || !parts.v1) {
        console.error('[PixService] Formato de x-signature inválido:', xSignature)
        return false
      }

      // Manifesto conforme documentação do Mercado Pago
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`

      const esperada  = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex')
      const bufEsperada = Buffer.from(esperada, 'hex')
      const bufRecebida = Buffer.from(parts.v1, 'hex')

      if (bufEsperada.length !== bufRecebida.length) {
        console.error('[PixService] Tamanho da assinatura diverge')
        return false
      }

      const valida = crypto.timingSafeEqual(bufEsperada, bufRecebida)
      console.log(`[PixService] Assinatura HMAC: ${valida ? 'VÁLIDA' : 'INVÁLIDA'}`)
      return valida

    } catch (err) {
      console.error('[PixService] Erro ao verificar assinatura:', err.message)
      return false
    }
  }

  get valorMensalidade() { return VALOR_MENSALIDADE }
  get mesAtual()         { return mesAtual() }
}

module.exports = new PixPaymentService()
