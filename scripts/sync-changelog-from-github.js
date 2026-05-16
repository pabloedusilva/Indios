// =============================================================
//  scripts/sync-changelog-from-github.js
//
//  Sincroniza CHANGELOG.md com releases reais do GitHub
//
//  Responsabilidades:
//    · Buscar TODAS as releases do GitHub via API
//    · Extrair dados reais: versão, data, título, body
//    · Gerar CHANGELOG.md formatado com dados reais
//    · Manter estrutura e formatação profissional
//
//  Uso:
//    node scripts/sync-changelog-from-github.js
//
//  Variáveis de Ambiente Necessárias:
//    - GITHUB_TOKEN: Token para acessar API do GitHub (opcional, mas recomendado)
//    - GITHUB_REPOSITORY: owner/repo (ex: pabloedusilva/Indios)
// =============================================================

const https = require('https')
const fs = require('fs')
const path = require('path')

// =============================================================
// Configuração
// =============================================================

const GITHUB_API = 'https://api.github.com'
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'pabloedusilva/Indios'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md')

// =============================================================
// Funções Auxiliares - GitHub API
// =============================================================

/**
 * Faz requisição HTTPS para API do GitHub
 * @param {string} endpoint - Endpoint da API
 * @returns {Promise<object>} Resposta JSON da API
 */
function githubRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'Indios-Changelog-Sync',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }

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
 * Busca todas as releases do repositório (paginado)
 * @returns {Promise<Array>} Array de releases
 */
async function getAllReleases() {
  console.log(`[INFO] Buscando todas as releases de ${GITHUB_REPO}...`)
  
  let allReleases = []
  let page = 1
  const perPage = 100

  try {
    while (true) {
      const releases = await githubRequest(
        `/repos/${GITHUB_REPO}/releases?per_page=${perPage}&page=${page}`
      )
      
      if (releases.length === 0) break
      
      allReleases = allReleases.concat(releases)
      console.log(`[INFO] Pagina ${page}: ${releases.length} releases encontradas`)
      
      if (releases.length < perPage) break
      page++
    }
    
    console.log(`[OK] Total de ${allReleases.length} releases encontradas`)
    return allReleases
  } catch (error) {
    console.error(`[ERROR] Erro ao buscar releases: ${error.message}`)
    throw error
  }
}

// =============================================================
// Funções Auxiliares - Formatação
// =============================================================

/**
 * Formata data no padrão brasileiro
 * @param {string} isoDate - Data ISO (ex: "2024-05-16T10:30:00Z")
 * @returns {string} Data formatada (ex: "16/05/2024")
 */
function formatDate(isoDate) {
  const date = new Date(isoDate)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Extrai versão anterior de uma release (do compare link)
 * @param {string} body - Corpo da release
 * @param {string} currentVersion - Versão atual
 * @returns {string|null} Versão anterior ou null
 */
function extractPreviousVersion(body, currentVersion) {
  // Procura por links de comparação no formato: compare/v1.2.0...v1.3.0
  const compareRegex = /compare\/v?([0-9.]+)\.\.\.v?([0-9.]+)/
  const match = body.match(compareRegex)
  
  if (match && match[1]) {
    return match[1]
  }
  
  return null
}

/**
 * Limpa e formata o body da release
 * @param {string} body - Corpo da release
 * @returns {string} Body formatado
 */
function formatReleaseBody(body) {
  if (!body) return ''
  
  // Remove linhas vazias duplicadas
  let formatted = body.replace(/\n{3,}/g, '\n\n')
  
  // Garante que seções tenham espaçamento adequado
  formatted = formatted.replace(/\n(#{1,3}\s)/g, '\n\n$1')
  
  // Remove espaços em branco no final das linhas
  formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n')
  
  return formatted.trim()
}

/**
 * Gera seção de uma release para o CHANGELOG
 * @param {object} release - Dados da release do GitHub
 * @param {string|null} previousVersion - Versão anterior
 * @returns {string} Seção formatada
 */
function generateReleaseSection(release, previousVersion) {
  const version = release.tag_name.replace(/^v/, '')
  const date = formatDate(release.published_at)
  const body = formatReleaseBody(release.body)
  
  let section = `## v${version} (${date})\n\n`
  section += `[Ver release](${release.html_url})\n\n`
  
  // Adiciona link de comparação se houver versão anterior
  if (previousVersion) {
    section += `[${version}](https://github.com/${GITHUB_REPO}/compare/v${previousVersion}...v${version}) (${release.published_at.split('T')[0]})\n\n`
  } else {
    section += `[${version}](${release.html_url}) (${release.published_at.split('T')[0]})\n\n`
  }
  
  // Adiciona corpo da release
  if (body) {
    section += body + '\n\n'
  } else {
    section += 'Sem notas de release.\n\n'
  }
  
  return section
}

// =============================================================
// Funções Auxiliares - Geração do CHANGELOG
// =============================================================

/**
 * Gera conteúdo completo do CHANGELOG.md
 * @param {Array} releases - Array de releases do GitHub
 * @returns {string} Conteúdo do CHANGELOG
 */
function generateChangelog(releases) {
  console.log('[INFO] Gerando CHANGELOG.md...')
  
  // Ordena releases por data (mais recente primeiro)
  const sortedReleases = releases.sort((a, b) => {
    return new Date(b.published_at) - new Date(a.published_at)
  })
  
  // Cabeçalho do CHANGELOG
  let changelog = `# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/).

Histórico completo de releases do projeto.

`
  
  // Gera seção para cada release
  for (let i = 0; i < sortedReleases.length; i++) {
    const release = sortedReleases[i]
    const previousRelease = sortedReleases[i + 1]
    const previousVersion = previousRelease 
      ? previousRelease.tag_name.replace(/^v/, '')
      : extractPreviousVersion(release.body, release.tag_name.replace(/^v/, ''))
    
    changelog += generateReleaseSection(release, previousVersion)
  }
  
  // Rodapé do CHANGELOG
  changelog += `---

## Tipos de Mudanças

- **Novas Funcionalidades** - Novos recursos adicionados
- **Melhorias** - Melhorias em recursos existentes
- **Correções** - Correções de bugs
- **Refatorações** - Mudanças de código sem alterar funcionalidade
- **Documentação** - Mudanças na documentação
- **Testes** - Adição ou correção de testes
- **Infraestrutura** - Mudanças em build, CI/CD, dependências
- **BREAKING CHANGES** - Mudanças incompatíveis com versões anteriores

---

## Versionamento Semântico

Este projeto segue o [Semantic Versioning](https://semver.org/lang/pt-BR/):

- **MAJOR** (X.0.0) - Mudanças incompatíveis na API
- **MINOR** (0.X.0) - Novas funcionalidades mantendo compatibilidade
- **PATCH** (0.0.X) - Correções de bugs mantendo compatibilidade

---

## Como Contribuir

Para adicionar uma entrada ao changelog:

1. Faça commits seguindo [Conventional Commits](https://www.conventionalcommits.org/)
2. O changelog será atualizado automaticamente pelo semantic-release
3. Formato dos commits:
   - \`feat:\` - Nova funcionalidade (MINOR)
   - \`fix:\` - Correção de bug (PATCH)
   - \`feat!:\` ou \`BREAKING CHANGE:\` - Mudança incompatível (MAJOR)
   - \`docs:\` - Documentação
   - \`style:\` - Formatação
   - \`refactor:\` - Refatoração
   - \`test:\` - Testes
   - \`chore:\` - Manutenção

---

## Links Úteis

- [Repositório](https://github.com/${GITHUB_REPO})
- [Issues](https://github.com/${GITHUB_REPO}/issues)
- [Pull Requests](https://github.com/${GITHUB_REPO}/pulls)
- [Releases](https://github.com/${GITHUB_REPO}/releases)
- [Documentação](https://github.com/${GITHUB_REPO}#readme)

---

**Nota**: Este changelog é gerado e mantido automaticamente pelo [semantic-release](https://github.com/semantic-release/semantic-release).
`
  
  return changelog
}

/**
 * Salva CHANGELOG.md no disco
 * @param {string} content - Conteúdo do CHANGELOG
 */
function saveChangelog(content) {
  try {
    fs.writeFileSync(CHANGELOG_PATH, content, 'utf8')
    console.log(`[OK] CHANGELOG.md salvo em: ${CHANGELOG_PATH}`)
  } catch (error) {
    console.error(`[ERROR] Erro ao salvar CHANGELOG.md: ${error.message}`)
    throw error
  }
}

// =============================================================
// Função Principal
// =============================================================

async function main() {
  console.log('[START] Iniciando sincronizacao do CHANGELOG.md com GitHub...\n')

  try {
    // 1. Buscar todas as releases do GitHub
    const releases = await getAllReleases()
    
    if (releases.length === 0) {
      console.warn('[WARN] Nenhuma release encontrada no GitHub')
      console.warn('   Certifique-se de que o repositorio possui releases publicadas')
      process.exit(0)
    }
    
    // 2. Gerar CHANGELOG.md
    const changelog = generateChangelog(releases)
    
    // 3. Salvar arquivo
    saveChangelog(changelog)
    
    // 4. Resumo final
    console.log(`\n[SUCCESS] CHANGELOG.md sincronizado com sucesso!`)
    console.log(`\n[SUMMARY] Resumo:`)
    console.log(`   Total de releases: ${releases.length}`)
    console.log(`   Arquivo: ${CHANGELOG_PATH}`)
    console.log(`   Tamanho: ${(changelog.length / 1024).toFixed(2)} KB`)
    
    console.log(`\n[INFO] Proximos passos:`)
    console.log(`   1. Revise o CHANGELOG.md gerado`)
    console.log(`   2. Faça commit das alteracoes: git add CHANGELOG.md && git commit -m "docs: atualizar CHANGELOG.md com dados reais do GitHub"`)
    console.log(`   3. Faça push: git push`)
    
  } catch (error) {
    console.error('\n[ERROR] Erro fatal durante sincronizacao:', error.message)
    process.exit(1)
  }
}

// Executar script
main()
