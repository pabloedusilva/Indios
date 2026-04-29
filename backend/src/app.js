// =============================================================
//  app.js — Configuração central do Express
//  Servidor de API pura. O frontend roda separado (Vite).
// =============================================================

const express      = require('express')
const cors         = require('cors')
const cookieParser = require('cookie-parser')

const authRoutes        = require('./routes/auth')
const produtosRoutes    = require('./routes/produtos')
const pedidosRoutes     = require('./routes/pedidos')
const dashboardRoutes   = require('./routes/dashboard')
const categoriasRoutes  = require('./routes/categorias')
const estatisticasRoutes = require('./routes/estatisticas')
const pagamentosRoutes  = require('./routes/pagamentos')
const errorHandler      = require('./middlewares/errorHandler')
const { requireAuth }   = require('./middlewares/authMiddleware')

const app = express()

// ── CORS ──────────────────────────────────────────────────────
//  Permite requisições do frontend hospedado no Render e localhost
//  CLIENT_URL pode conter múltiplas origens separadas por vírgula
//  Também permite requisições do Mercado Pago para webhooks
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))

// Adiciona domínios do Mercado Pago para webhooks
const mercadoPagoOrigins = [
  'https://api.mercadopago.com',
  'https://www.mercadopago.com',
  'https://api.mercadolibre.com',
  'https://www.mercadolibre.com',
  'https://ipnpb.mercadopago.com',
  'https://ipnpb.mercadolibre.com'
]

const allAllowedOrigins = [...allowedOrigins, ...mercadoPagoOrigins]

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite chamadas sem origin (ex.: curl, Postman, webhooks)
      if (!origin || allAllowedOrigins.includes(origin)) return callback(null, true)
      
      // Log para debug de CORS
      console.log(`[CORS] Origem rejeitada: ${origin}`)
      console.log(`[CORS] Origens permitidas:`, allAllowedOrigins)
      
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-signature', 'x-request-id'],
    credentials: true,
  }),
)

// ── Middlewares globais ───────────────────────────────────────
// Log de todas as requisições para debug
app.use((req, res, next) => {
  if (req.path.includes('/webhook')) {
    console.log(`[Request] ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'} - User-Agent: ${req.get('user-agent') || 'none'}`)
  }
  next()
})

// Captura rawBody para verificação de assinatura HMAC nos webhooks
app.use((req, _res, next) => {
  let data = ''
  req.on('data', (chunk) => { data += chunk })
  req.on('end', () => { req.rawBody = data })
  next()
})
app.use(express.json())
app.use(cookieParser())

// ── Rotas públicas ────────────────────────────────────────────
app.use('/api/auth',       authRoutes)
// Webhook do Mercado Pago é público (sem requireAuth) mas protegido por HMAC
app.use('/api/pagamentos', pagamentosRoutes)

// ── Health check (público) ────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Rotas privadas — exigem autenticação ──────────────────────
app.use('/api/produtos',      requireAuth, produtosRoutes)
app.use('/api/pedidos',       requireAuth, pedidosRoutes)
app.use('/api/dashboard',     requireAuth, dashboardRoutes)
app.use('/api/categorias',    requireAuth, categoriasRoutes)
app.use('/api/estatisticas',  requireAuth, estatisticasRoutes)

// ── Rota não encontrada ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.path}`,
  })
})

// ── Tratamento de erros ───────────────────────────────────────
app.use(errorHandler)

module.exports = app

