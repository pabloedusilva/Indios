// =============================================================
//  config/database.js — Pool de conexão PostgreSQL (Supabase)
//  Utiliza pg (node-postgres) para suporte a async/await.
// =============================================================

require('dotenv').config()

const { Pool } = require('pg')

// Configuração do Supabase Pooler com application_name para debug
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  application_name: 'indios_backend',
  max: 20, // Aumentado de 10 para 20 conexões
  min: 2, // Mantém 2 conexões sempre ativas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Aumentado de 10s para 30s
  query_timeout: 60000, // Aumentado de 30s para 60s
  allowExitOnIdle: false, // Previne que o pool feche as conexões prematuramente
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

// Event listeners para monitorar o pool
pool.on('error', (err, client) => {
  console.error('❌ Erro inesperado no pool de conexões:', err.message)
})

pool.on('connect', () => {
  // console.log('🔌 Nova conexão estabelecida no pool')
})

pool.on('acquire', () => {
  // console.log('📥 Conexão adquirida do pool')
})

pool.on('remove', () => {
  // console.log('📤 Conexão removida do pool')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando pool de conexões...')
  await pool.end()
  console.log('✅ Pool encerrado')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Encerrando pool de conexões...')
  await pool.end()
  console.log('✅ Pool encerrado')
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
        console.warn(`⚠️  Timeout na query, tentando novamente (${3 - retries}/3)...`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Aguarda 1s antes de retry
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
