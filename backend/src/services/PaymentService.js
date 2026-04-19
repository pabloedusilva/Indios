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
  console.error('[PaymentService] FATAL: MP_ACCESS_TOKEN não configurado.')
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
   * Cria uma preference de checkout no Mercado Pago.
   * O frontend redireciona o usuário para o init_point retornado.
   *
   * @param {string} usuarioId   - ID do usuário autenticado (external_reference)
   * @returns {{ preferenceId, checkoutUrl, valor, mesReferencia }}
   */
  async criarPreference(usuarioId) {
    const mes = mesAtual()

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
      // external_reference permite rastrear qual pagamento é qual no webhook
      external_reference: `${usuarioId}|${mes}`,
      // Notificação de pagamento (webhook) — Mercado Pago chama esta URL
      notification_url: `${APP_URL}/api/pagamentos/webhook`,
      // Expiração da preference: 30 minutos
      expiration_date_from: new Date().toISOString(),
      expiration_date_to:   new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      // Metadados para rastreabilidade
      metadata: {
        usuario_id:     usuarioId,
        mes_referencia: mes,
      },
    }

    const result = await preference.create({ body })

    return {
      preferenceId: result.id,
      checkoutUrl:  result.init_point,       // URL de produção
      sandboxUrl:   result.sandbox_init_point, // URL de sandbox (testes)
      valor:        VALOR_MENSALIDADE,
      mesReferencia: mes,
    }
  }

  /**
   * Consulta o status de um pagamento pelo ID retornado pelo webhook.
   * Retorna o objeto de pagamento completo do Mercado Pago.
   *
   * @param {string|number} paymentId
   */
  async consultarPagamento(paymentId) {
    const paymentClient = new Payment(mpClient)
    return paymentClient.get({ id: String(paymentId) })
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
      console.error('[PaymentService] MP_WEBHOOK_SECRET não configurado — webhook rejeitado.')
      return false
    }
    if (!xSignature || !xRequestId) return false

    try {
      // Extrai ts e v1 do header x-signature
      const parts = {}
      xSignature.split(',').forEach((part) => {
        const [k, v] = part.trim().split('=')
        if (k && v) parts[k] = v
      })

      if (!parts.ts || !parts.v1) return false

      // Monta a string a ser assinada conforme documentação do Mercado Pago
      // template: id:<dataId>;request-id:<xRequestId>;ts:<ts>;
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`

      const esperada = crypto
        .createHmac('sha256', MP_WEBHOOK_SECRET)
        .update(manifest)
        .digest('hex')

      // Comparação segura contra timing attacks
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
