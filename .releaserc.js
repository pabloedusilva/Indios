// =============================================================
// .releaserc.js — Configuração do semantic-release
//
// Responsabilidades:
//   · Definir em quais branches releases são geradas
//   · Configurar plugins de análise, notas e publicação
//   · Mapear tipos de commit para incrementos de versão
//   · Garantir continuidade a partir da tag v1.0.0 existente
//
// Documentação: https://semantic-release.gitbook.io/semantic-release
// =============================================================

/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  // ----------------------------------------------------------
  // BRANCHES
  // · main   → releases estáveis (latest)
  // · next   → releases de preview/RC (se necessário no futuro)
  // ----------------------------------------------------------
  branches: [
    'main',
    // Descomente para ativar canal de pre-release:
    // { name: 'develop', prerelease: 'beta' },
    // { name: 'next', prerelease: 'rc' },
  ],

  // ----------------------------------------------------------
  // REPOSITÓRIO
  // Inferido automaticamente via git remote, mas explicitado
  // para garantir configuração correta em ambientes CI
  // ----------------------------------------------------------
  repositoryUrl: 'https://github.com/pabloedusilva/Indios.git',

  // ----------------------------------------------------------
  // PLUGINS
  // Executados em sequência na ordem definida abaixo
  // ----------------------------------------------------------
  plugins: [
    // 1. ANALISA os commits desde a última tag
    //    Determina se a próxima versão é MAJOR, MINOR ou PATCH
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          // MAJOR — mudanças incompatíveis com versão anterior
          { breaking: true,   release: 'major' },
          { type: 'feat',     scope: 'BREAKING', release: 'major' },

          // MINOR — novas funcionalidades compatíveis
          { type: 'feat',     release: 'minor' },

          // PATCH — correções e melhorias menores
          { type: 'fix',      release: 'patch' },
          { type: 'perf',     release: 'patch' },
          { type: 'revert',   release: 'patch' },

          // SEM RELEASE — manutenção e organização interna
          { type: 'chore',    release: false },
          { type: 'docs',     release: false },
          { type: 'style',    release: false },
          { type: 'refactor', release: false },
          { type: 'test',     release: false },
          { type: 'ci',       release: false },
          { type: 'build',    release: false },
        ],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
        },
      },
    ],

    // 2. GERA as notas de release (texto do GitHub Release)
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat',     section: 'Novas Funcionalidades',   hidden: false },
            { type: 'fix',      section: 'Correções de Bugs',        hidden: false },
            { type: 'perf',     section: 'Melhorias de Performance', hidden: false },
            { type: 'revert',   section: 'Revertidos',               hidden: false },
            { type: 'refactor', section: 'Refatorações',             hidden: false },
            { type: 'docs',     section: 'Documentação',             hidden: false },
            { type: 'test',     section: 'Testes',                   hidden: false },
            { type: 'build',    section: 'Build',                    hidden: true  },
            { type: 'ci',       section: 'CI/CD',                    hidden: true  },
            { type: 'chore',    section: 'Manutenção',               hidden: true  },
            { type: 'style',    section: 'Estilo',                   hidden: true  },
          ],
        },
        writerOpts: {
          // Ordena seções: breaking changes primeiro, depois features, fixes, etc.
          commitsSort: ['subject', 'scope'],
        },
      },
    ],

    // 3. ATUALIZA o CHANGELOG.md no repositório
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle:
          '# Changelog\n\n' +
          'Todas as mudanças notáveis deste projeto são documentadas aqui.\n\n' +
          'Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)\n' +
          'e este projeto segue [Semantic Versioning](https://semver.org/lang/pt-BR/).',
      },
    ],

    // 4. ATUALIZA a versão no package.json raiz
    //    npmPublish: false — apenas bumpa a versão, não publica no npm registry
    //    O número de versão atualizado é lido pelo vite.config.js em build-time
    //    e injetado como import.meta.env.VITE_APP_VERSION no frontend
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],

    // 5. FAZ O COMMIT do CHANGELOG.md e package.json atualizados de volta ao repositório
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n' +
          '${nextRelease.notes}',
      },
    ],

    // 6. CRIA a GitHub Release com tag, notas e assets
    [
      '@semantic-release/github',
      {
        // Adiciona labels automáticos às issues/PRs incluídos na release
        successComment:
          'Esta issue foi incluída na **[release v${nextRelease.version}](${releases[0].url})**!',
        failTitle: 'Falha na release automática',
        failComment:
          '⚠️ O pipeline de release automático falhou na tentativa de publicar a versão **${nextRelease.version}**.\n\n' +
          'Por favor, verifique os [logs do workflow](${options.repositoryUrl}/actions) e corrija o problema.',
        labels: ['released'],
        releasedLabels: ['released@${nextRelease.channel}'],
      },
    ],
  ],
};
