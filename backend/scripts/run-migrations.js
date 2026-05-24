// =============================================================
//  scripts/run-migrations.js
//
//  Executa migrations SQL na ordem correta.
//  Usa a tabela `migrations` para rastrear o que já foi executado.
//  Só roda migrations cujo `version` ainda não está na tabela.
// =============================================================

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const fs   = require('fs')
const { Pool } = require('pg')

async function runMigrations() {
  let pool

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })

    console.log('[OK] Conectado ao banco de dados (PostgreSQL/Supabase)')

    // Garante que a tabela migrations existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        version     VARCHAR(10) PRIMARY KEY,
        description TEXT        NOT NULL,
        executed_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Busca versões já executadas
    const { rows: executadas } = await pool.query('SELECT version FROM migrations')
    const jaExecutadas = new Set(executadas.map(r => r.version))

    // Lê arquivos de migration ordenados
    const migrationsDir = path.join(__dirname, '../migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`\n[INFO] Encontradas ${files.length} migrations:\n`)

    for (const file of files) {
      // Extrai versão do nome do arquivo (ex: "009" de "009_create_resumo_dashboard.sql")
      const version = file.split('_')[0]

      if (jaExecutadas.has(version)) {
        console.log(`[SKIP] Já executada: ${file}\n`)
        continue
      }

      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')

      console.log(`[EXEC] Executando: ${file}`)

      try {
        await pool.query(sql)
        console.log(`[OK] Concluída: ${file}\n`)
      } catch (err) {
        // Ignora erros de "já existe" para idempotência
        if (
          err.code === '42P07' ||  // relation already exists
          err.code === '42701' ||  // duplicate column
          err.message.includes('already exists') ||
          err.message.includes('duplicate')
        ) {
          console.log(`[SKIP] Já existe: ${file}\n`)
        } else {
          throw err
        }
      }
    }

    console.log('[SUCCESS] Todas as migrations foram executadas com sucesso!')
  } catch (error) {
    console.error('[ERROR] Erro ao executar migrations:', error.message)
    process.exit(1)
  } finally {
    if (pool) await pool.end()
  }
}

runMigrations()
