// =============================================================
// .releaserc.js — Configuração do semantic-release
//
// Responsabilidades:
//   · Analisar commits e calcular próxima versão semântica
//   · Gerar release notes e atualizar CHANGELOG.md
//   · Criar tags Git e GitHub Releases automaticamente
//   · Atualizar package.json raiz (workspaces sincronizados pelo workflow)
//
// Documentação: https://semantic-release.gitbook.io/semantic-release
// =============================================================

/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  // Branch que dispara releases de produção
  branches: ['main'],

  // URL do repositório (inferido automaticamente, mas explicitado para CI)
  repositoryUrl: 'https://github.com/pabloedusilva/Indios.git',

  // Plugins executados em sequência
  plugins: [
    // 1. Analisa commits e determina tipo de bump (MAJOR, MINOR, PATCH)
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          // MAJOR — breaking changes
          { breaking: true, release: 'major' },
          { type: 'feat', scope: 'BREAKING', release: 'major' },
          // MINOR — novas funcionalidades
          { type: 'feat', release: 'minor' },
          // PATCH — correções e melhorias
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'revert', release: 'patch' },
          // Sem release
          { type: 'chore', release: false },
          { type: 'docs', release: false },
          { type: 'style', release: false },
          { type: 'refactor', release: false },
          { type: 'test', release: false },
          { type: 'ci', release: false },
          { type: 'build', release: false },
        ],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
        },
      },
    ],

    // 2. Gera release notes agrupadas por tipo
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: 'Novas Funcionalidades', hidden: false },
            { type: 'fix', section: 'Correções de Bugs', hidden: false },
            { type: 'perf', section: 'Melhorias de Performance', hidden: false },
            { type: 'revert', section: 'Revertidos', hidden: false },
            { type: 'refactor', section: 'Refatorações', hidden: false },
            { type: 'docs', section: 'Documentação', hidden: false },
            { type: 'test', section: 'Testes', hidden: false },
            { type: 'build', section: 'Build', hidden: true },
            { type: 'ci', section: 'CI/CD', hidden: true },
            { type: 'chore', section: 'Manutenção', hidden: true },
            { type: 'style', section: 'Estilo', hidden: true },
          ],
        },
        writerOpts: {
          commitsSort: ['subject', 'scope'],
        },
      },
    ],

    // 3. Atualiza CHANGELOG.md
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

    // 4. Atualiza versão no package.json raiz (não publica no npm)
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],

    // 5. Cria GitHub Release com tag e notas
    [
      '@semantic-release/github',
      {
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

    // 6. Commita arquivos atualizados (CHANGELOG, package.json) e faz push
    [
      '@semantic-release/git',
      {
        assets: [
          'CHANGELOG.md',
          'package.json',
          'frontend/package.json',
          'backend/package.json',
        ],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
