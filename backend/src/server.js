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
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'X-Partial-Download', 'X-Downloaded-Count', 'X-Total-Count', 'X-Partial-Success', 'X-Failed-Count']
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

app.listen(PORT, async () => {
  const env    = process.env.NODE_ENV || 'development'
  const client = process.env.CLIENT_URL || 'http://localhost:5173'
  const W      = 52 // largura interna da caixa

  const line = (label, value) => {
    const content = `  ${label.padEnd(10)}: ${value}`
    return `| ${content.padEnd(W)} |`
  }

  const divider   = `+${'-'.repeat(W + 2)}+`
  const title     = 'INDIOS CHURRASCO GOURMET  -  API'
  const titleLine = `| ${title.padStart(Math.floor((W + title.length) / 2)).padEnd(W)} |`

  // Verificar banco de dados
  let dbStatus = 'FALHA'
  try {
    const pool = require('./config/database')
    const conn = await pool.connect()
    conn.release()
    dbStatus = 'PostgreSQL/Supabase -- conectado'
  } catch (err) {
    dbStatus = `FALHA -- ${err.message.substring(0, 28)}`
  }

  // Verificar API Focus NFe
  let focusStatus = 'nao configurado'
  try {
    const fiscalConfig = require('./config/fiscal')
    const focusClient  = require('./services/FocusNFeClient')
    focusClient.setToken(fiscalConfig.API_TOKEN)
    const ok = await focusClient.ping()
    focusStatus = ok
      ? `${fiscalConfig.ENV} -- acessivel`
      : `${fiscalConfig.ENV} -- sem resposta`
  } catch {
    focusStatus = 'FALHA -- token ou configuracao ausente'
  }

  console.log('')
  console.log(divider)
  console.log(titleLine)
  console.log(divider)
  console.log(line('Porta',    String(PORT)))
  console.log(line('Ambiente', env))
  console.log(line('Cliente',  client))
  console.log(line('Database', dbStatus))
  console.log(line('Focus NFe', focusStatus))
  console.log(divider)
  console.log('')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM recebido. Encerrando servidor')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[Server] SIGINT recebido. Encerrando servidor')
  process.exit(0)
})
