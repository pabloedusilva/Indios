// =============================================================
//  scripts/run-migrations.js
//
//  Executa todas as migrations SQL na ordem correta.
//  Uso: node backend/scripts/run-migrations.js
//  Ou: npm run migrate:run (de dentro de backend/)
// =============================================================

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const fs = require('fs')
const mysql = require('mysql2/promise')

async function runMigrations() {
  let connection

  try {
    // Conecta ao banco
    connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      multipleStatements: true,
    })

    console.log('[OK] Conectado ao banco de dados')

    // Lê todos os arquivos de migration
    const migrationsDir = path.join(__dirname, '../migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`\n[INFO] Encontradas ${files.length} migrations:\n`)

    // Executa cada migration
    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf8')

      console.log(`[EXEC] Executando: ${file}`)
      
      try {
        await connection.query(sql)
        console.log(`[OK] Concluida: ${file}\n`)
      } catch (err) {
        // Se o erro for "table already exists" ou "duplicate column", ignora
        if (
          err.code === 'ER_TABLE_EXISTS_ERROR' ||
          err.code === 'ER_DUP_FIELDNAME' ||
          err.message.includes('already exists') ||
          err.message.includes('Duplicate column')
        ) {
          console.log(`[SKIP] Ja existe: ${file}\n`)
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
    if (connection) {
      await connection.end()
    }
  }
}

runMigrations()
