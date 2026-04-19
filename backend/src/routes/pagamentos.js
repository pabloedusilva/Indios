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

// Rota pública — webhook do Mercado Pago (sem auth, mas com HMAC)
// Deve ser declarada ANTES do middleware requireAuth
router.post('/webhook', webhook)

// Rotas protegidas
router.use(requireAuth)

router.post('/checkout',  checkout)
router.get('/status-mes', statusMes)
router.get('/poll',       poll)

module.exports = router
