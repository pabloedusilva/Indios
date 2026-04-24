// =============================================================
//  routes/pagamentos.js — Rotas de Pagamentos PIX
//
//  POST  /api/pagamentos/pix        → cria pagamento PIX (autenticado)
//  GET   /api/pagamentos/status     → status do mês atual (autenticado)
//  POST  /api/pagamentos/webhook    → callback Mercado Pago (público, HMAC)
//  GET   /api/pagamentos/webhook/health → health check (público)
// =============================================================

const router = require('express').Router()
const { requireAuth } = require('../middlewares/authMiddleware')
const pixPaymentController = require('../controllers/pixPaymentController')

// ── Rotas públicas (sem autenticação) ─────────────────────────

// Health check para verificar acessibilidade do webhook
router.get('/webhook/health', pixPaymentController.healthCheck)

// Webhook do Mercado Pago (sem auth, mas com HMAC)
router.post('/webhook', (req, res, next) => {
  console.log('[Routes] Webhook PIX recebido:', {
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    hasSignature: !!req.get('x-signature'),
    hasRequestId: !!req.get('x-request-id')
  })
  pixPaymentController.processarWebhook(req, res, next)
})

// ── Rotas protegidas (requerem autenticação) ──────────────────

router.use(requireAuth)

// Criar pagamento PIX
router.post('/pix', pixPaymentController.criarPagamentoPix)

// Consultar status do pagamento
router.get('/status', pixPaymentController.consultarStatus)

module.exports = router
