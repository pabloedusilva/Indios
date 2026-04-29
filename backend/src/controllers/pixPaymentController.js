// =============================================================
//  controllers/pixPaymentController.js — Controller PIX
//
//  POST /api/pagamentos/pix          → cria pagamento (autenticado)
//  GET  /api/pagamentos/status       → status do mês (autenticado)
//  POST /api/pagamentos/webhook      → notificação Mercado Pago (HMAC)
//  GET  /api/pagamentos/webhook/health → health check (público)
//
//  Fluxo de criação de PIX:
//    1. Mês já pago?          → retorna already_paid
//    2. Tem pending válido?   → reutiliza (sem chamar API)
//    3. Tem expired/failed?   → cria novo (forcarNovo=true)
//    4. Sem registro?         → cria novo (forcarNovo=false)
// =============================================================

const PagamentoModel    = require('../models/PagamentoModel')
const PixPaymentService = require('../services/PixPaymentService')

// ── Helpers ───────────────────────────────────────────────────

function getUsuarioId(req) {
  if (!req.usuario?.id) throw new Error('Usuário não autenticado')
  return req.usuario.id
}

function mesAtual() {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 7)
}

// ── Controller ────────────────────────────────────────────────

const pixPaymentController = {

  // POST /api/pagamentos/pix
  async criarPagamentoPix(req, res) {
    try {
      const usuarioId     = getUsuarioId(req)
      const mesReferencia = mesAtual()

      // ── 1. Mês já pago? ──────────────────────────────────────
      const mesPago = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)
      if (mesPago) {
        return res.status(200).json({
          success: true,
          status:  'already_paid',
          message: 'Mês já está pago',
          data:    { mesPago: true, mesReferencia },
        })
      }

      // ── 2. Verificar último registro no banco ─────────────────
      const ultimo = await PagamentoModel.buscarUltimoPorUsuarioMes(usuarioId, mesReferencia)

      if (ultimo) {
        const agora     = new Date()
        const expiresAt = ultimo.expires_at ? new Date(ultimo.expires_at) : null
        const valido    = expiresAt && expiresAt > agora

        // Reutilizar PIX pendente ainda válido (não expirou as 24h)
        if (ultimo.status === 'pending' && valido) {
          return res.status(200).json({
            success: true,
            message: 'PIX reutilizado',
            data: {
              id:           ultimo.mercado_pago_id,
              qrCode:       ultimo.qr_code,
              qrCodeBase64: ultimo.qr_code_base64,
              valor:        parseFloat(ultimo.valor),
              mesReferencia,
              expiresAt:    expiresAt.toISOString(),
              status:       'pending',
            },
          })
        }

        // Qualquer outro status (expired, failed, pending expirado) → criar novo
      }

      // ── 3. Criar novo PIX na API do Mercado Pago ──────────────
      // forcarNovo=true quando já existe registro anterior (evita reutilizar
      // pagamento expirado via idempotencyKey determinística)
      const forcarNovo = !!ultimo
      const pixData    = await PixPaymentService.criarPagamentoPix(usuarioId, forcarNovo)

      // ── 4. Persistir no banco ─────────────────────────────────
      const pagamento = await PagamentoModel.criarPagamento({
        usuarioId,
        valor:         pixData.valor,
        mesReferencia,
        mercadoPagoId: pixData.id,
        qrCode:        pixData.qrCode,
        qrCodeBase64:  pixData.qrCodeBase64,
      })

      return res.status(201).json({
        success: true,
        message: 'PIX criado com sucesso',
        data: {
          id:           pagamento.mercadoPagoId,
          qrCode:       pagamento.qrCode,
          qrCodeBase64: pagamento.qrCodeBase64,
          valor:        pixData.valor,
          mesReferencia,
          expiresAt:    pagamento.expiresAt,
          status:       'pending',
        },
      })

    } catch (err) {
      if (err.message.includes('Já existe um pagamento aprovado'))
        return res.status(409).json({ success: false, error: 'PAYMENT_ALREADY_EXISTS', message: err.message })

      if (err.message.includes('Credenciais') || err.message.includes('configuração') || err.message.includes('inválidas'))
        return res.status(500).json({ success: false, error: 'CONFIGURATION_ERROR', message: 'Erro de configuração do sistema de pagamentos.' })

      if (err.message.includes('Limite de requisições'))
        return res.status(429).json({ success: false, error: 'RATE_LIMIT', message: 'Muitas tentativas. Tente novamente em alguns minutos.' })

      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message || 'Erro interno do servidor' })
    }
  },

  // GET /api/pagamentos/status
  async consultarStatus(req, res) {
    try {
      const usuarioId     = getUsuarioId(req)
      const mesReferencia = mesAtual()
      const mesPago       = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)

      return res.status(200).json({
        success: true,
        data: {
          mesPago,
          mesReferencia,
          valor: PixPaymentService.valorMensalidade,
        },
      })

    } catch (err) {
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Erro ao consultar status do pagamento' })
    }
  },

  // POST /api/pagamentos/webhook
  async processarWebhook(req, res) {
    // Responde 200 imediatamente — o Mercado Pago não reenviar
    res.status(200).json({ received: true })

    try {
      const { type, data, action } = req.body

      const isPaymentEvent = type === 'payment' || action?.startsWith('payment.')
      if (!isPaymentEvent) return

      const dataId = String(req.query['data.id'] || data?.id || '').trim()
      if (!dataId) return

      // ── Validação HMAC ────────────────────────────────────────
      const assinaturaValida = PixPaymentService.verificarAssinaturaWebhook(
        req.headers['x-signature'],
        req.headers['x-request-id'],
        dataId,
      )
      if (!assinaturaValida) return

      // ── Consultar status REAL na API (nunca confiar só no payload) ──
      const paymentData = await PixPaymentService.consultarPagamento(dataId)
      if (paymentData.status !== 'approved') return

      // ── Buscar pagamento no banco pelo ID do Mercado Pago ─────
      const pagamento = await PagamentoModel.buscarPorMercadoPagoId(dataId)

      if (!pagamento) {
        // Tentar identificar pelo external_reference (usuarioId|mesReferencia)
        const externalRef = paymentData.external_reference || ''
        if (!externalRef.includes('|')) return

        const [usuarioId, mesReferencia] = externalRef.split('|')

        const jaPago = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)
        if (jaPago) return

        await PagamentoModel.criarPagamentoAprovado({
          usuarioId,
          mesReferencia,
          mercadoPagoId: dataId,
          valor:         paymentData.transaction_amount,
          dadosMercadoPago: {
            status:              paymentData.status,
            status_detail:       paymentData.status_detail,
            transaction_amount:  paymentData.transaction_amount,
            date_approved:       paymentData.date_approved,
            webhook_received_at: new Date().toISOString(),
          },
        })
        return
      }

      // Pagamento encontrado — idempotência: já aprovado, não faz nada
      if (pagamento.status === 'approved') return

      await PagamentoModel.atualizarStatus(dataId, 'approved', {
        status:              paymentData.status,
        status_detail:       paymentData.status_detail,
        transaction_amount:  paymentData.transaction_amount,
        date_approved:       paymentData.date_approved,
        webhook_received_at: new Date().toISOString(),
      })

    } catch {
      // Não relançar — já respondemos 200 ao Mercado Pago
    }
  },

  // GET /api/pagamentos/webhook/health
  async healthCheck(_req, res) {
    return res.status(200).json({
      status:      'ok',
      service:     'PIX Webhook',
      endpoint:    '/api/pagamentos/webhook',
      timestamp:   new Date().toISOString(),
      environment: PixPaymentService.detectEnvironment().environment,
    })
  },
}

module.exports = pixPaymentController
