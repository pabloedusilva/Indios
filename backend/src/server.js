// =============================================================
//  server.js — Ponto de entrada da aplicação
//  Inicia o servidor HTTP na porta definida em .env
// =============================================================

require('dotenv').config()

// Inicia a conexão com o banco antes de subir o servidor
require('./config/database')

const app  = require('./app')
const port = process.env.PORT || 3333
const { iniciarScheduler }    = require('./utils/relatorioScheduler')
const { iniciarPixCleanup }   = require('./services/PixCleanupService')

app.listen(port, () => {
  console.log(` Servidor rodando na porta ${port}`)
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🌐 CORS habilitado para: ${process.env.CLIENT_URL || 'http://localhost:5173'}`)
  iniciarScheduler()
  iniciarPixCleanup()
})
