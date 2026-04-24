// =============================================================
//  scripts/migrate.js — Script de Migração do Banco de Dados
//
//  Executa as migrações SQL para atualizar a estrutura do banco
//  para o novo sistema de pagamentos PIX.
// =============================================================

const fs = require('fs')
const path = require('path')
const db = require('../src/config/database')

async function executeMigrations() {
  console.log('🚀 Iniciando migrações do banco de dados...\n')
  
  try {
    // Criar tabela de migrações se não existir
    await db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        version VARCHAR(10) PRIMARY KEY,
        description TEXT NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    console.log('✅ Tabela de migrações criada/verificada')
    
    // Listar arquivos de migração
    const migrationsDir = path.join(__dirname, '../migrations')
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()
    
    console.log(`📁 Encontrados ${migrationFiles.length} arquivos de migração\n`)
    
    for (const file of migrationFiles) {
      const version = file.split('_')[0]
      const filePath = path.join(migrationsDir, file)
      
      // Verificar se já foi executada
      const [existing] = await db.execute(
        'SELECT version FROM migrations WHERE version = ?',
        [version]
      )
      
      if (existing.length > 0) {
        console.log(`⏭️  Migração ${version} já executada - pulando`)
        continue
      }
      
      console.log(`🔄 Executando migração ${version}: ${file}`)
      
      // Ler e executar SQL
      const sql = fs.readFileSync(filePath, 'utf8')
      
      // Dividir por statements (separados por ;)
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await db.execute(statement)
          } catch (error) {
            // Ignorar erros de "já existe" para idempotência
            if (!error.message.includes('already exists') && 
                !error.message.includes('Duplicate entry')) {
              throw error
            }
          }
        }
      }
      
      console.log(`✅ Migração ${version} executada com sucesso`)
    }
    
    console.log('\n🎉 Todas as migrações foram executadas com sucesso!')
    
    // Verificar estrutura final
    console.log('\n📊 Verificando estrutura final...')
    
    const [tables] = await db.execute(`
      SELECT TABLE_NAME, TABLE_COMMENT 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('pagamentos', 'webhook_logs', 'migrations')
    `)
    
    console.log('\n📋 Tabelas criadas:')
    tables.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME}${table.TABLE_COMMENT ? ` - ${table.TABLE_COMMENT}` : ''}`)
    })
    
    // Verificar colunas da tabela pagamentos
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'pagamentos'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('\n📋 Estrutura da tabela pagamentos:')
    columns.forEach(col => {
      console.log(`  📄 ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.COLUMN_COMMENT || 'Sem comentário'}`)
    })
    
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await db.end()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executeMigrations()
}

module.exports = { executeMigrations }