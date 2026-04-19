// =============================================================
//  server.js — Ponto de entrada da aplicação
//  Inicia o servidor HTTP na porta definida em .env
// =============================================================

require('dotenv').config()

// Inicia a conexão com o banco antes de subir o servidor
require('./config/database')

const app  = require('./app')
const port = process.env.PORT || 3333
const { iniciarScheduler } = require('./utils/relatorioScheduler')

app.listen(port, async () => {
  console.log('Servidor: ✅ ONLINE')
  iniciarScheduler()
  try {
    const r = await fetch('http://localhost:5173')
    if (r.ok) console.log('Frontend: ✅ CONECTADO')
    else console.log('Frontend: ❌ OFFLINE')
  } catch {
    console.log('Frontend: ❌ OFFLINE')
  }
})
