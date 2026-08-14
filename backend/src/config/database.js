// =============================================================
//  config/database.js — Pool de conexão PostgreSQL (Supabase)
//  Utiliza pg (node-postgres) para suporte a async/await.
// =============================================================

require('dotenv').config()

const { Pool } = require('pg')

// Configuração otimizada para conexão direta Supabase (melhor performance)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  application_name: 'indios_backend',
  max: 10, // Conexões diretas: menor pool é mais eficiente
  min: 1, // Mantém 1 conexão sempre ativa
  idleTimeoutMillis: 30000, // 30s antes de fechar conexão ociosa
  connectionTimeoutMillis: 10000, // 10s para estabelecer conexão (direto é mais rápido)
  query_timeout: 30000, // 30s timeout por query
  allowExitOnIdle: false,
  // Otimizações para conexão direta
  keepAlive: true, // Mantém conexão alive
  keepAliveInitialDelayMillis: 10000, // Delay inicial do keepalive
})

pool.connect()
  .then(client => client.release())
  .catch(err => {
    console.error('[Database] Falha na conexao inicial:', err.message)
  })

// Monitorar erros inesperados no pool
pool.on('error', (err) => {
  console.error('[Database] Erro inesperado no pool de conexões:', err.message)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Database] Encerrando pool de conexoes')
  await pool.end()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('[Database] Encerrando pool de conexoes')
  await pool.end()
  process.exit(0)
})

// Wrapper para manter compatibilidade com código existente que usa pool.execute()
// PostgreSQL usa pool.query() ao invés de pool.execute()
pool.execute = async function(sql, params) {
  let retries = 3
  let lastError
  
  while (retries > 0) {
    try {
      const result = await this.query(sql, params)
      // Retorna no formato [rows, fields] para compatibilidade com mysql2
      return [result.rows, result.fields]
    } catch (error) {
      lastError = error
      retries--
      
      // Se for timeout e ainda tiver retries, aguarda e tenta novamente
      if ((error.message?.includes('timeout') || error.code === 'ETIMEDOUT') && retries > 0) {
        console.warn(`[Database] Timeout na query, tentando novamente (${3 - retries}/3)`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }
      
      // Se for outro erro ou acabaram os retries, lança o erro
      throw error
    }
  }
  
  // Se chegou aqui, todas as tentativas falhar
  throw lastError
}

module.exports = pool
