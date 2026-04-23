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

    return res.status(201).json({
      success: true,
      data: {
        checkoutUrl:   preference.checkoutUrl,
        sandboxUrl:    preference.sandboxUrl,
        preferenceId:  preference.preferenceId,
        valor:         preference.valor,
        mesReferencia: preference.mesReferencia,
        environment:   preference.environment,
        credentialType: preference.credentialType,
        isProduction:  preference.isProduction,
      },
    })
  } catch (err) {
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
  const startTime = Date.now()
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`
  
  try {
    const xSignature = req.headers['x-signature']  || ''
    const xRequestId = req.headers['x-request-id'] || ''
    const dataId     = req.query['data.id'] || req.body?.data?.id || ''

    // Validação de assinatura com logging detalhado
    const valido = PaymentService.verificarAssinaturaWebhook(xSignature, xRequestId, dataId)
    if (!valido) {
      return res.status(401).json({ success: false, message: 'Assinatura inválida.' })
    }

    const tipo = req.body?.type || req.body?.topic || ''
    
    if (tipo !== 'payment') {
      return res.status(200).json({ received: true })
    }

    if (!dataId) {
      return res.status(400).json({ success: false, message: 'payment_id ausente.' })
    }

    // Consulta do pagamento com retry e validação robusta
    const payment = await consultarPagamentoComRetry(dataId, requestId)
    
    if (!payment) {
      return res.status(200).json({ received: true })
    }

    const statusMP     = payment?.status || ''
    const externalRef  = payment?.external_reference || ''
    const preferenceId = payment?.preference_id || ''

    // Validação de campos obrigatórios
    if (!statusMP) {
      return res.status(200).json({ received: true })
    }

    if (statusMP === 'approved') {
      
      // Parsing mais flexível do external_reference
      const mesReferencia = extrairMesReferencia(externalRef, requestId)
      if (!mesReferencia) {
        return res.status(200).json({ received: true })
      }

      // Validação de preferenceId
      if (!preferenceId) {
        return res.status(200).json({ received: true })
      }

      // Confirmação do pagamento com validação de existência
      const confirmado = await confirmarPagamentoComValidacao(preferenceId, dataId, requestId)
      
      if (confirmado) {
        const duration = Date.now() - startTime
      }
    }

    const duration = Date.now() - startTime
    return res.status(200).json({ received: true })
    
  } catch (err) {
    const duration = Date.now() - startTime
    return res.status(200).json({ received: true })
  }
}

// ── Função auxiliar: Consulta com retry e backoff exponencial ──
async function consultarPagamentoComRetry(paymentId, requestId, maxTentativas = 3) {
  let ultimoErro = null
  
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    try {
      const payment = await PaymentService.consultarPagamento(paymentId)
      
      if (!payment || typeof payment !== 'object') {
        throw new Error('Resposta da API inválida ou vazia')
      }

      if (!payment.hasOwnProperty('status')) {
        throw new Error('Campo status ausente na resposta da API')
      }

      return payment
      
    } catch (err) {
      ultimoErro = err
      
      if (tentativa < maxTentativas) {
        const delay = Math.pow(2, tentativa - 1) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  return null
}

// ── Função auxiliar: Extração flexível do mês de referência ──
function extrairMesReferencia(externalRef, requestId) {
  if (!externalRef) {
    return null
  }

  try {
    const partes = externalRef.split('|')
    if (partes.length >= 2) {
      const mesReferencia = partes[1]
      if (/^\d{4}-\d{2}$/.test(mesReferencia)) {
        return mesReferencia
      }
    }

    const match = externalRef.match(/\d{4}-\d{2}/)
    if (match) {
      const mesReferencia = match[0]
      return mesReferencia
    }

    return null
    
  } catch (err) {
    return null
  }
}

// ── Função auxiliar: Confirmação com validação de existência ──
async function confirmarPagamentoComValidacao(preferenceId, paymentId, requestId) {
  try {
    const resultado = await PagamentoModel.confirmarPagamento(preferenceId, paymentId)
    
    if (resultado.success) {
      return true
    } else {
      return false
    }
    
  } catch (err) {
    return false
  }
}

module.exports = { checkout, statusMes, poll, webhook }