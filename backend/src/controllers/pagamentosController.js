// =============================================================
//  controllers/pagamentosController.js
//
//  POST  /api/pagamentos/checkout   → cria preference e retorna URL de checkout
//  GET   /api/pagamentos/status-mes → verifica se o mês foi pago
//  GET   /api/pagamentos/poll       → polling de status após retorno do checkout
//  POST  /api/pagamentos/webhook    → callback do Mercado Pago (público, HMAC)
// =============================================================

const PagamentoModel = require('../models/PagamentoModel')
const PaymentService = require('../services/PaymentService')

// ── POST /api/pagamentos/checkout ────────────────────────────
// Cria preference no Mercado Pago e retorna a URL de checkout.
async function checkout(req, res, next) {
  try {
    const usuarioId     = req.usuario.id
    const mesReferencia = PaymentService.mesAtual

    const pagamentoExistente = await PagamentoModel.findPagamentoMes(mesReferencia)
    if (pagamentoExistente) {
      return res.json({ success: true, data: { status: 'pago', mesReferencia } })
    }

    const preference = await PaymentService.criarPreference(usuarioId)

    await PagamentoModel.criar({
      usuarioId,
      valor:         preference.valor,
      preferenceId:  preference.preferenceId,
      mesReferencia: preference.mesReferencia,
    })

    console.log(`[Pagamento] Preference criada — mes=${preference.mesReferencia} preferenceId=${preference.preferenceId}`)

    return res.status(201).json({
      success: true,
      data: {
        checkoutUrl:   preference.checkoutUrl,
        sandboxUrl:    preference.sandboxUrl,
        preferenceId:  preference.preferenceId,
        valor:         preference.valor,
        mesReferencia: preference.mesReferencia,
      },
    })
  } catch (err) {
    console.error('[Pagamento] Erro ao criar preference:', err.message)
    next(err)
  }
}

// ── GET /api/pagamentos/status-mes ───────────────────────────
async function statusMes(req, res, next) {
  try {
    const mesReferencia = PaymentService.mesAtual
    const pagamento     = await PagamentoModel.findPagamentoMes(mesReferencia)
    return res.json({ success: true, data: { mesPago: !!pagamento, mesReferencia } })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/pagamentos/poll ──────────────────────────────────
// Polling do frontend para saber se pagamento foi confirmado pelo webhook.
async function poll(req, res, next) {
  try {
    const mesReferencia = PaymentService.mesAtual
    const pagamento     = await PagamentoModel.findPagamentoMes(mesReferencia)
    return res.json({ success: true, data: { pago: !!pagamento, mesReferencia } })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/pagamentos/webhook ─────────────────────────────
// Rota PÚBLICA — recebe notificação do Mercado Pago (IPN/Webhooks)
async function webhook(req, res) {
  try {
    const xSignature = req.headers['x-signature']  || ''
    const xRequestId = req.headers['x-request-id'] || ''
    const dataId     = req.query['data.id'] || req.body?.data?.id || ''

    const valido = PaymentService.verificarAssinaturaWebhook(xSignature, xRequestId, dataId)
    if (!valido) {
      console.warn('[Webhook] Assinatura inválida — requisição rejeitada.')
      return res.status(401).json({ success: false, message: 'Assinatura inválida.' })
    }

    const tipo = req.body?.type || req.body?.topic || ''
    if (tipo !== 'payment') {
      return res.status(200).json({ received: true })
    }

    if (!dataId) {
      console.warn('[Webhook] payment_id ausente no payload.')
      return res.status(400).json({ success: false, message: 'payment_id ausente.' })
    }

    const payment      = await PaymentService.consultarPagamento(dataId)
    const statusMP     = payment?.status || ''
    const externalRef  = payment?.external_reference || ''
    const preferenceId = payment?.preference_id || ''

    if (statusMP === 'approved') {
      const mesReferencia = externalRef.split('|')[1]
      if (!mesReferencia) {
        console.warn(`[Webhook] external_reference inválido: ${externalRef}`)
        return res.status(200).json({ received: true })
      }
      const confirmado = await PagamentoModel.confirmarPagamento(preferenceId, dataId)
      if (confirmado) {
        console.log(`[Webhook] ✅ Pagamento confirmado — mes=${mesReferencia} paymentId=${dataId}`)
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[Webhook] Erro:', err.message)
    return res.status(200).json({ received: true })
  }
}

module.exports = { checkout, statusMes, poll, webhook }
