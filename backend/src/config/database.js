// =============================================================
//  config/database.js — Pool de conexão PostgreSQL (Supabase)
//  Utiliza pg (node-postgres) para suporte a async/await.
// =============================================================

require('dotenv').config()

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
  // Força uso de IPv4 para evitar problemas com IPv6
  host: 'db.erluhsofpxlcdunfwktp.supabase.co',
  options: '-c search_path=public',
})

// Testa a conexão na inicialização e exibe status no terminal
pool.connect()
  .then(async (client) => {
    // Mantém timezone UTC (padrão do Supabase) para armazenamento correto
    // A conversão para America/Sao_Paulo é feita apenas no frontend
    console.log('Banco de dados: ✅ CONECTADO (PostgreSQL/Supabase)')
    client.release()
  })
  .catch((err) => {
    console.error('Banco de dados: ❌ FALHA —', err.message)
    console.error('⚠️  O servidor continuará rodando, mas as operações de banco falharão.')
    console.error('⚠️  Verifique sua conexão com a internet e a URL do banco de dados.')
    // Não encerra o processo para permitir que o servidor continue rodando
    // process.exit(1)
  })

// Wrapper para manter compatibilidade com código existente que usa pool.execute()
// PostgreSQL usa pool.query() ao invés de pool.execute()
pool.execute = async function(sql, params) {
  const result = await this.query(sql, params)
  // Retorna no formato [rows, fields] para compatibilidade com mysql2
  return [result.rows, result.fields]
}

module.exports = pool
