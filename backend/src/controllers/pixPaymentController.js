// =============================================================
//  controllers/pixPaymentController.js — Controller PIX
//
//  POST /api/pagamentos/pix          → cria pagamento (autenticado)
//  GET  /api/pagamentos/status       → status do mês (autenticado)
//  POST /api/pagamentos/webhook      → notificação Mercado Pago (HMAC)
//  GET  /api/pagamentos/webhook/health → health check (público)
// =============================================================

const PagamentoModel  = require('../models/PagamentoModel')
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
    const t0        = Date.now()
    const requestId = req.headers['x-request-id'] || `req-${t0}`

    try {
      const usuarioId     = getUsuarioId(req)
      const mesReferencia = mesAtual()

      console.log(`[PIX:${requestId}] Solicitação de PIX — usuário: ${usuarioId}, mês: ${mesReferencia}`)

      // ── 1. Mês já pago? ──────────────────────────────────────
      const mesPago = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)
      if (mesPago) {
        console.log(`[PIX:${requestId}] Mês já está pago`)
        return res.status(200).json({
          success: true,
          status:  'already_paid',
          message: 'Mês já está pago',
          data:    { mesPago: true, mesReferencia },
        })
      }

      // ── 2. Verificar último registro no banco ─────────────────
      const ultimo = await PagamentoModel.buscarUltimoPorUsuarioMes(usuarioId, mesReferencia)

      // Decisão:
      //   · Sem registro          → criar novo (forcarNovo=false, primeira vez)
      //   · pending + válido      → reutilizar (não chamar API)
      //   · pending + expirado    → criar novo (forcarNovo=true)
      //   · expired               → criar novo (forcarNovo=true)
      //   · failed / outro status → criar novo (forcarNovo=true)

      if (ultimo) {
        const agora     = new Date()
        const expiresAt = ultimo.expires_at ? new Date(ultimo.expires_at) : null
        const valido    = expiresAt && expiresAt > agora

        if (ultimo.status === 'pending' && valido) {
          // ── Reutilizar PIX pendente ainda válido ──────────────
          console.log(`[PIX:${requestId}] Reutilizando PIX pendente válido — id: ${ultimo.mercado_pago_id}, expira: ${expiresAt.toISOString()}`)
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
              reutilizado:  true,
            },
          })
        }

        // Qualquer outro status (expired, failed, pending expirado) → criar novo
        console.log(`[PIX:${requestId}] Último registro status="${ultimo.status}", válido=${valido} — criando novo PIX`)
      } else {
        console.log(`[PIX:${requestId}] Nenhum registro anterior — criando primeiro PIX`)
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

      console.log(`[PIX:${requestId}] PIX criado em ${Date.now() - t0}ms — id: ${pixData.id}, expira: ${pagamento.expiresAt}`)

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
          reutilizado:  false,
        },
      })

    } catch (err) {
      console.error(`[PIX:${requestId}] Erro (${Date.now() - t0}ms):`, err.message)
      if (err.cause) console.error(`[PIX:${requestId}] Causa:`, JSON.stringify(err.cause))
      if (err.stack) console.error(`[PIX:${requestId}] Stack:`, err.stack)

      if (err.message.includes('Já existe um pagamento aprovado'))
        return res.status(409).json({ success: false, error: 'PAYMENT_ALREADY_EXISTS', message: err.message })

      if (err.message.includes('Credenciais') || err.message.includes('configuração') || err.message.includes('inválidas'))
        return res.status(500).json({ success: false, error: 'CONFIGURATION_ERROR', message: 'Erro de configuração do sistema de pagamentos. Verifique as credenciais.' })

      if (err.message.includes('Limite de requisições'))
        return res.status(429).json({ success: false, error: 'RATE_LIMIT', message: 'Muitas tentativas. Tente novamente em alguns minutos' })

      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message || 'Erro interno do servidor' })
    }
  },

  // GET /api/pagamentos/status
  async consultarStatus(req, res) {
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`

    try {
      const usuarioId    = getUsuarioId(req)
      const mesReferencia = mesAtual()
      const mesPago      = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)

      console.log(`[PIX:${requestId}] Status — usuário: ${usuarioId}, mês: ${mesReferencia}, pago: ${mesPago}`)

      return res.status(200).json({
        success: true,
        data: {
          mesPago,
          mesReferencia,
          valor: PixPaymentService.valorMensalidade,
        },
      })

    } catch (err) {
      console.error(`[PIX:${requestId}] Erro ao consultar status:`, err.message)
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Erro ao consultar status do pagamento' })
    }
  },

  // POST /api/pagamentos/webhook
  async processarWebhook(req, res) {
    const t0        = Date.now()
    const requestId = req.headers['x-request-id'] || `wh-${t0}`

    // Responde 200 imediatamente para o Mercado Pago não reenviar
    // O processamento real acontece de forma assíncrona
    res.status(200).json({ received: true })

    try {
      console.log(`[WH:${requestId}] Webhook recebido`)
      console.log(`[WH:${requestId}] Headers: x-signature=${req.headers['x-signature'] ? 'presente' : 'ausente'}, x-request-id=${req.headers['x-request-id'] ? 'presente' : 'ausente'}`)
      console.log(`[WH:${requestId}] Body:`, JSON.stringify(req.body))

      const { type, data, action } = req.body

      // Aceitar tanto "payment" quanto "payment.updated" / "payment.created"
      const isPaymentEvent = type === 'payment' || action?.startsWith('payment.')
      if (!isPaymentEvent) {
        console.log(`[WH:${requestId}] Evento ignorado: type=${type}, action=${action}`)
        return
      }

      // Extrair ID do pagamento — Mercado Pago envia em data.id ou query data.id
      const dataId = String(req.query['data.id'] || data?.id || '').trim()
      if (!dataId) {
        console.error(`[WH:${requestId}] data.id ausente no webhook`)
        return
      }

      console.log(`[WH:${requestId}] Payment ID: ${dataId}`)

      // ── Validação HMAC ────────────────────────────────────────
      const xSignature = req.headers['x-signature']
      const xRequestId = req.headers['x-request-id']

      const assinaturaValida = PixPaymentService.verificarAssinaturaWebhook(
        xSignature,
        xRequestId,
        dataId,
      )

      if (!assinaturaValida) {
        console.error(`[WH:${requestId}] Assinatura HMAC inválida — descartando`)
        return
      }

      console.log(`[WH:${requestId}] Assinatura HMAC válida`)

      // ── Consultar status REAL na API (nunca confiar só no payload) ──
      const paymentData = await PixPaymentService.consultarPagamento(dataId)
      console.log(`[WH:${requestId}] Status na API: ${paymentData.status} (${paymentData.status_detail})`)

      // Só processar se for aprovado
      if (paymentData.status !== 'approved') {
        console.log(`[WH:${requestId}] Status não é approved (${paymentData.status}) — ignorando`)
        return
      }

      // ── Buscar pagamento no banco pelo ID do Mercado Pago ─────
      const pagamento = await PagamentoModel.buscarPorMercadoPagoId(dataId)

      if (!pagamento) {
        // Pode ser um pagamento criado antes da migração ou por outro meio
        // Tentar identificar pelo external_reference (usuarioId|mesReferencia)
        const externalRef = paymentData.external_reference || ''
        console.warn(`[WH:${requestId}] Pagamento ${dataId} não encontrado no banco. external_reference: "${externalRef}"`)

        if (externalRef && externalRef.includes('|')) {
          const [usuarioId, mesReferencia] = externalRef.split('|')
          console.log(`[WH:${requestId}] Tentando criar registro via external_reference — usuário: ${usuarioId}, mês: ${mesReferencia}`)

          // Verificar se já está pago para este usuário/mês
          const jaPago = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)
          if (jaPago) {
            console.log(`[WH:${requestId}] Mês ${mesReferencia} já está pago para usuário ${usuarioId} — idempotente`)
            return
          }

          // Criar registro retroativo
          await PagamentoModel.criarPagamentoAprovado({
            usuarioId,
            mesReferencia,
            mercadoPagoId: dataId,
            valor:         paymentData.transaction_amount,
            dadosMercadoPago: {
              status:             paymentData.status,
              status_detail:      paymentData.status_detail,
              transaction_amount: paymentData.transaction_amount,
              date_approved:      paymentData.date_approved,
              webhook_received_at: new Date().toISOString(),
            },
          })

          console.log(`[WH:${requestId}] Registro retroativo criado e aprovado para usuário ${usuarioId}`)
        } else {
          console.error(`[WH:${requestId}] Não foi possível identificar o pagamento — external_reference inválido`)
        }
        return
      }

      // Pagamento encontrado — atualizar status se necessário
      if (pagamento.status === 'approved') {
        console.log(`[WH:${requestId}] Pagamento já estava aprovado — idempotente`)
        return
      }

      const atualizado = await PagamentoModel.atualizarStatus(dataId, 'approved', {
        status:             paymentData.status,
        status_detail:      paymentData.status_detail,
        transaction_amount: paymentData.transaction_amount,
        date_approved:      paymentData.date_approved,
        webhook_received_at: new Date().toISOString(),
      })

      if (atualizado) {
        console.log(`[WH:${requestId}] Pagamento ${dataId} aprovado! Usuário: ${pagamento.usuario_id} — ${Date.now() - t0}ms`)
      } else {
        console.error(`[WH:${requestId}] Falha ao atualizar status do pagamento ${dataId}`)
      }

    } catch (err) {
      // Não relançar — já respondemos 200 ao Mercado Pago
      console.error(`[WH:${requestId}] Erro no processamento (${Date.now() - t0}ms):`, err.message)
      console.error(err.stack)
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
