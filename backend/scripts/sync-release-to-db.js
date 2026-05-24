// =============================================================
//  scripts/sync-release-to-db.js
//
//  Sincroniza release do GitHub com tabela update_notes
//
//  Responsabilidades:
//    · Buscar última release do GitHub via API
//    · Extrair versão, tipo, título e notas
//    · Parsear release notes em melhorias e correções
//    · Salvar/atualizar no banco de dados
//    · Validar dados antes de inserir
//
//  Uso:
//    node backend/scripts/sync-release-to-db.js
//    Ou de dentro de backend/scripts: node sync-release-to-db.js
//
//  Variáveis de Ambiente Necessárias:
//    - DATABASE_URL: URL de conexão com MySQL
//    - GITHUB_TOKEN: Token para acessar API do GitHub (opcional)
//    - GITHUB_REPOSITORY: owner/repo (ex: pabloedusilva/Indios)
// =============================================================

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const https = require('https')
const { Pool } = require('pg')

// =============================================================
// Configuração
// =============================================================

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'pabloedusilva/Indios'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

// =============================================================
// Funções Auxiliares - GitHub API
// =============================================================

/**
 * Faz requisição HTTPS para API do GitHub
 * @param {string} endpoint - Endpoint da API (ex: /repos/owner/repo/releases/latest)
 * @returns {Promise<object>} Resposta JSON da API
 */
function githubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'Indios-Release-Sync',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }

    // Adiciona token se disponível
    if (GITHUB_TOKEN) {
      options.headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data))
          } catch (error) {
            reject(new Error(`Erro ao parsear JSON: ${error.message}`))
          }
        } else {
          reject(new Error(`GitHub API retornou ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(new Error(`Erro na requisição: ${error.message}`))
    })

    req.end()
  })
}

/**
 * Busca a última release do repositório
 * @returns {Promise<object>} Dados da release
 */
async function getLatestRelease() {
  console.log(`[INFO] Buscando ultima release de ${GITHUB_REPO}...`)
  
  try {
    const release = await githubRequest(`/repos/${GITHUB_REPO}/releases/latest`)
    console.log(`[OK] Release encontrada: ${release.tag_name}`)
    return release
  } catch (error) {
    console.error(`[ERROR] Erro ao buscar release: ${error.message}`)
    throw error
  }
}

// =============================================================
// Funções Auxiliares - Parsing de Release Notes
// =============================================================

/**
 * Determina o tipo de release baseado na versão
 * @param {string} version - Versão (ex: "1.3.0")
 * @param {string} previousVersion - Versão anterior (ex: "1.2.4")
 * @returns {string} Tipo: 'major', 'minor' ou 'patch'
 */
function determineReleaseType(version, previousVersion) {
  const [major, minor, patch] = version.split('.').map(Number)
  const [prevMajor, prevMinor, prevPatch] = (previousVersion || '0.0.0').split('.').map(Number)

  if (major > prevMajor) return 'major'
  if (minor > prevMinor) return 'minor'
  if (patch > prevPatch) return 'patch'
  
  return 'minor' // fallback
}

/**
 * Extrai melhorias das release notes
 * @param {string} body - Corpo das release notes
 * @returns {string[]} Array de melhorias
 */
function extractMelhorias(body) {
  const melhorias = []
  
  // Procura seção "Novas Funcionalidades" ou "Features"
  const featRegex = /(?:###?\s*(?:Novas Funcionalidades|Features|✨\s*Features)[^\n]*\n)([\s\S]*?)(?=###|$)/i
  const match = body.match(featRegex)
  
  if (match && match[1]) {
    const lines = match[1].split('\n')
    for (const line of lines) {
      // Extrai itens de lista (*, -, •) ou commits
      const itemMatch = line.match(/^[\s]*[*\-•]\s*(.+)$/)
      if (itemMatch && itemMatch[1]) {
        let item = itemMatch[1].trim()
        // Remove links de commit completos (ex: "([abc1234](https://github.com/...))")
        item = item.replace(/\s*\(\[[a-f0-9]{7,}\]\(https?:\/\/[^\)]+\)\)\s*$/i, '')
        // Remove hash de commit simples (ex: "(abc1234)")
        item = item.replace(/\s*\([a-f0-9]{7,}\)\s*$/i, '')
        // Remove prefixo "feat:" se presente
        item = item.replace(/^feat:\s*/i, '')
        if (item.length > 0) {
          melhorias.push(item)
        }
      }
    }
  }
  
  return melhorias
}

/**
 * Extrai correções das release notes
 * @param {string} body - Corpo das release notes
 * @returns {string[]} Array de correções
 */
function extractCorrecoes(body) {
  const correcoes = []
  
  // Procura seção "Correções de Bugs" ou "Bug Fixes"
  const fixRegex = /(?:###?\s*(?:Correções de Bugs|Bug Fixes|🐛\s*Bug Fixes)[^\n]*\n)([\s\S]*?)(?=###|$)/i
  const match = body.match(fixRegex)
  
  if (match && match[1]) {
    const lines = match[1].split('\n')
    for (const line of lines) {
      // Extrai itens de lista (*, -, •) ou commits
      const itemMatch = line.match(/^[\s]*[*\-•]\s*(.+)$/)
      if (itemMatch && itemMatch[1]) {
        let item = itemMatch[1].trim()
        // Remove links de commit completos (ex: "([abc1234](https://github.com/...))")
        item = item.replace(/\s*\(\[[a-f0-9]{7,}\]\(https?:\/\/[^\)]+\)\)\s*$/i, '')
        // Remove hash de commit simples (ex: "(abc1234)")
        item = item.replace(/\s*\([a-f0-9]{7,}\)\s*$/i, '')
        // Remove prefixo "fix:" se presente
        item = item.replace(/^fix:\s*/i, '')
        if (item.length > 0) {
          correcoes.push(item)
        }
      }
    }
  }
  
  return correcoes
}

/**
 * Gera título amigável para a release
 * @param {string} version - Versão (ex: "1.3.0")
 * @param {string} type - Tipo (major, minor, patch)
 * @returns {string} Título formatado
 */
function generateTitle(version, type) {
  const typeLabels = {
    major: 'Grande Atualização',
    minor: 'Nova Atualização',
    patch: 'Correções e Melhorias',
  }
  
  return `${typeLabels[type] || 'Atualização'} - Versão ${version}`
}

/**
 * Gera descrição amigável para a release
 * @param {string} type - Tipo (major, minor, patch)
 * @param {number} melhorias - Quantidade de melhorias
 * @param {number} correcoes - Quantidade de correções
 * @returns {string} Descrição formatada
 */
function generateDescricao(type, melhorias, correcoes) {
  const parts = []
  
  if (type === 'major') {
    parts.push('Esta é uma atualização importante com mudanças significativas.')
  } else if (type === 'minor') {
    parts.push('Confira as novidades e melhorias desta versão.')
  } else {
    parts.push('Correções e ajustes para melhorar sua experiência.')
  }
  
  if (melhorias > 0) {
    parts.push(`${melhorias} nova${melhorias > 1 ? 's' : ''} funcionalidade${melhorias > 1 ? 's' : ''}.`)
  }
  
  if (correcoes > 0) {
    parts.push(`${correcoes} correç${correcoes > 1 ? 'ões' : 'ão'} de bug${correcoes > 1 ? 's' : ''}.`)
  }
  
  return parts.join(' ')
}

// =============================================================
// Funções Auxiliares - Banco de Dados
// =============================================================

/**
 * Conecta ao banco de dados
 * @returns {Promise<Pool>} Pool de conexão PostgreSQL
 */
async function connectDatabase() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    })
    
    // Testa a conexão
    await pool.query('SELECT NOW()')
    console.log('[OK] Conectado ao banco de dados (PostgreSQL/Supabase)')
    return pool
  } catch (error) {
    console.error('[ERROR] Erro ao conectar ao banco:', error.message)
    throw error
  }
}

/**
 * Busca versão anterior no banco
 * @param {Pool} pool - Pool de conexão PostgreSQL
 * @returns {Promise<string|null>} Versão anterior ou null
 */
async function getPreviousVersion(pool) {
  try {
    const result = await pool.query(
      `SELECT versao FROM update_notes ORDER BY criado_em DESC LIMIT 1`
    )
    return result.rows.length > 0 ? result.rows[0].versao : null
  } catch (error) {
    console.warn('[WARN] Erro ao buscar versao anterior:', error.message)
    return null
  }
}

/**
 * Salva ou atualiza nota no banco de dados
 * @param {Pool} pool - Pool de conexão PostgreSQL
 * @param {object} nota - Dados da nota
 * @returns {Promise<void>}
 */
async function upsertNota(pool, nota) {
  try {
    await pool.query(
      `INSERT INTO update_notes (versao, tipo, titulo, descricao, melhorias, correcoes, imagem, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (versao) DO UPDATE SET
         tipo      = EXCLUDED.tipo,
         titulo    = EXCLUDED.titulo,
         descricao = EXCLUDED.descricao,
         melhorias = EXCLUDED.melhorias,
         correcoes = EXCLUDED.correcoes,
         imagem    = EXCLUDED.imagem,
         ativo     = EXCLUDED.ativo,
         atualizado_em = CURRENT_TIMESTAMP`,
      [
        nota.versao,
        nota.tipo,
        nota.titulo,
        nota.descricao,
        JSON.stringify(nota.melhorias),
        JSON.stringify(nota.correcoes),
        nota.imagem,
        nota.ativo,
      ]
    )
    console.log(`[OK] Nota salva no banco: v${nota.versao}`)
  } catch (error) {
    console.error('[ERROR] Erro ao salvar nota no banco:', error.message)
    throw error
  }
}

// =============================================================
// Função Principal
// =============================================================

async function main() {
  console.log('[START] Iniciando sincronizacao de release para banco de dados...\n')

  let pool

  try {
    // 1. Buscar última release do GitHub
    const release = await getLatestRelease()
    
    // 2. Extrair versão (remove 'v' do início)
    const version = release.tag_name.replace(/^v/, '')
    console.log(`\n[INFO] Processando release v${version}`)
    
    // 3. Conectar ao banco
    pool = await connectDatabase()
    
    // 4. Buscar versão anterior para determinar tipo
    const previousVersion = await getPreviousVersion(pool)
    const tipo = determineReleaseType(version, previousVersion)
    console.log(`[INFO] Tipo de release: ${tipo.toUpperCase()}`)
    
    // 5. Parsear release notes
    const body = release.body || ''
    const melhorias = extractMelhorias(body)
    const correcoes = extractCorrecoes(body)
    
    console.log(`\n[INFO] Conteudo extraido:`)
    console.log(`   Melhorias: ${melhorias.length}`)
    console.log(`   Correcoes: ${correcoes.length}`)
    
    // 6. Gerar título e descrição
    const titulo = generateTitle(version, tipo)
    const descricao = generateDescricao(tipo, melhorias.length, correcoes.length)
    
    // 7. Preparar objeto da nota
    const nota = {
      versao: version,
      tipo: tipo,
      titulo: titulo,
      descricao: descricao,
      melhorias: melhorias,
      correcoes: correcoes,
      imagem: '/update/new-update.png',
      ativo: true,
    }
    
    // 8. Validar dados
    if (melhorias.length === 0 && correcoes.length === 0) {
      console.warn('\n[WARN] Nenhuma melhoria ou correcao encontrada nas release notes.')
      console.warn('   A nota sera criada, mas o modal pode ficar vazio.')
      console.warn('   Considere adicionar conteudo manualmente via API ou SQL.')
    }
    
    // 9. Salvar no banco
    console.log(`\n[SAVE] Salvando nota no banco de dados...`)
    await upsertNota(pool, nota)
    
    // 10. Resumo final
    console.log(`\n[SUCCESS] Sincronizacao concluida com sucesso!`)
    console.log(`\n[SUMMARY] Resumo da nota criada:`)
    console.log(`   Versao: ${nota.versao}`)
    console.log(`   Tipo: ${nota.tipo}`)
    console.log(`   Titulo: ${nota.titulo}`)
    console.log(`   Descricao: ${nota.descricao}`)
    console.log(`   Melhorias: ${nota.melhorias.length}`)
    console.log(`   Correcoes: ${nota.correcoes.length}`)
    console.log(`   Ativo: ${nota.ativo ? 'Sim' : 'Nao'}`)
    
  } catch (error) {
    console.error('\n[ERROR] Erro fatal durante sincronizacao:', error.message)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
      console.log('\n[CLOSE] Conexao com banco encerrada')
    }
  }
}

// Executar script
main()
