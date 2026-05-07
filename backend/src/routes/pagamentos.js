// =============================================================
//  routes/pagamentos.js — Rotas de Pagamentos PIX
//
//  POST  /api/pagamentos/pix              → cria pagamento PIX (autenticado)
//  GET   /api/pagamentos/status           → status do mês atual (autenticado)
//  GET   /api/pagamentos/historico        → histórico de pagamentos aprovados (autenticado)
//  GET   /api/pagamentos/comprovante/:id  → gera PDF do comprovante (autenticado)
//  POST  /api/pagamentos/webhook          → callback Mercado Pago (público, HMAC)
//  GET   /api/pagamentos/webhook/health   → health check (público)
// =============================================================

const router = require('express').Router()
const { requireAuth } = require('../middlewares/authMiddleware')
const pixPaymentController = require('../controllers/pixPaymentController')

// ── Rotas públicas ────────────────────────────────────────────
router.get('/webhook/health', pixPaymentController.healthCheck)
router.post('/webhook',       pixPaymentController.processarWebhook)

// ── Rotas protegidas ──────────────────────────────────────────
router.use(requireAuth)

router.post('/pix',                  pixPaymentController.criarPagamentoPix)
router.get('/status',                pixPaymentController.consultarStatus)
router.get('/historico',             pixPaymentController.listarHistorico)
router.get('/comprovante/:id',       pixPaymentController.gerarComprovante)

module.exports = router
