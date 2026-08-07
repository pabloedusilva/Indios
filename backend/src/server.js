// =============================================================
//  server.js — Servidor Express principal
// =============================================================

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const app = express()
const PORT = process.env.PORT || 3333

// =============================================================
//  MIDDLEWARES GLOBAIS
// =============================================================

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))

// Parsers
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Log de requisições (dev)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`)
    next()
  })
}

// =============================================================
//  ROTAS
// =============================================================

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Rota de health check com /api prefix (para compatibilidade)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Rotas de autenticação
app.use('/api/auth', require('./routes/auth'))

// Rotas de produtos
app.use('/api/produtos', require('./routes/produtos'))

// Rotas de categorias
app.use('/api/categorias', require('./routes/categorias'))

// Rotas de pedidos
app.use('/api/pedidos', require('./routes/pedidos'))

// Rotas de notas fiscais
app.use('/api/notas-fiscais', require('./routes/notasFiscais'))

// Rotas de dashboard
app.use('/api/dashboard', require('./routes/dashboard'))

// Rotas de estatísticas
app.use('/api/estatisticas', require('./routes/estatisticas'))

// Rotas de cardápio público
app.use('/api/cardapio', require('./routes/cardapio'))

// Rotas de update notes
app.use('/api/update-notes', require('./routes/updateNotes'))

// Rota 404
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' })
})

// =============================================================
//  TRATAMENTO DE ERROS GLOBAL
// =============================================================

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err)
  
  res.status(err.status || 500).json({
    erro: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// =============================================================
//  INICIALIZAÇÃO DO SERVIDOR
// =============================================================

app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('🚀 Índios Churrasco Gourmet - Backend API')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`)
  console.log(`📅 Ambiente: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Cliente permitido: ${process.env.CLIENT_URL || 'http://localhost:5173'}`)
  console.log('═══════════════════════════════════════════════════════════\n')
})

// Tratamento gracioso de encerramento
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM recebido. Encerrando servidor...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT recebido. Encerrando servidor...')
  process.exit(0)
})
