// =============================================================
//  routes/pagamentos.js
//
//  POST  /api/pagamentos/checkout   → cria preference MP (autenticado)
//  GET   /api/pagamentos/status-mes → status do mês atual (autenticado)
//  GET   /api/pagamentos/poll       → polling pós-checkout (autenticado)
//  POST  /api/pagamentos/webhook    → callback Mercado Pago (público, HMAC)
// =============================================================

const router = require('express').Router()
const { requireAuth } = require('../middlewares/authMiddleware')
const {
  checkout,
  statusMes,
  poll,
  webhook,
} = require('../controllers/pagamentosController')

// Rotas públicas — devem ser declaradas ANTES do middleware requireAuth

// Health check para verificar acessibilidade do webhook
router.get('/webhook/health', (_req, res) => {
  console.log('[Webhook Health] Health check endpoint accessed')
  res.json({ 
    status: 'ok', 
    endpoint: '/api/pagamentos/webhook',
    timestamp: new Date().toISOString(),
    message: 'Webhook endpoint is accessible'
  })
})

// Webhook do Mercado Pago (sem auth, mas com HMAC)
router.post('/webhook', (req, res, next) => {
  console.log('[Webhook] POST request received:', {
    method: req.method,
    path: req.path,
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    hasSignature: !!req.get('x-signature'),
    hasRequestId: !!req.get('x-request-id')
  })
  webhook(req, res, next)
})

// Rotas protegidas
router.use(requireAuth)

router.post('/checkout',  checkout)
router.get('/status-mes', statusMes)
router.get('/poll',       poll)

module.exports = router
