// =============================================================
//  config/database.js — Pool de conexão MySQL (Railway)
//  Utiliza mysql2/promise para suporte a async/await.
// =============================================================

require('dotenv').config()

const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  uri:                process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // FIX: usar '+00:00' (UTC) para que mysql2 interprete corretamente os
  // valores DATETIME do servidor (Railway usa UTC). Com '-03:00' anterior,
  // mysql2 adicionava 3h ao ler datas, causando o bug de +3h no frontend.
  // A conversão para 'America/Sao_Paulo' é feita apenas na exibição.
  timezone:           '+00:00',
})

// Testa a conexão na inicialização e exibe status no terminal
pool.getConnection()
  .then((conn) => {
    console.log('Banco de dados: ✅ CONECTADO')
    conn.release()
  })
  .catch((err) => {
    console.error('Banco de dados: ❌ FALHA —', err.message)
    process.exit(1)
  })

module.exports = pool
