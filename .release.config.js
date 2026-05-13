// =============================================================
// .release.config.js — Configuracao do semantic-release
//
// Fluxo de execucao a cada push na main:
//   1. @semantic-release/commit-analyzer        — calcula proxima versao
//   2. @semantic-release/release-notes-generator — gera notas da release
//   3. @semantic-release/npm                    — atualiza version no package.json
//                                                  localmente durante o workflow
//   4. @semantic-release/changelog              — atualiza CHANGELOG.md
//   5. @semantic-release/github                 — cria GitHub Release com tag + notas
//
// Nota: o commit do package.json de volta na main e feito pelo workflow
// (release.yml) via git push explicito, nao pelo @semantic-release/git.
// Isso garante compatibilidade com GITHUB_TOKEN sem necessidade de PAT.
// =============================================================

/** @type {import('semantic-release').GlobalConfig} */
export default {
  // Branch que dispara releases de producao
  branches: ['main'],

  // Plugins executados em ordem
  plugins: [
    // ── 1. Analisa commits e determina o tipo de bump ──────────────────────
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          // MAJOR — breaking changes
          { breaking: true, release: 'major' },
          { type: 'feat',   breaking: true, release: 'major' },
          // MINOR — novas funcionalidades
          { type: 'feat',   release: 'minor' },
          // PATCH — correcoes e melhorias
          { type: 'fix',    release: 'patch' },
          { type: 'perf',   release: 'patch' },
          { type: 'revert', release: 'patch' },
          // Sem release
          { type: 'docs',     release: false },
          { type: 'style',    release: false },
          { type: 'chore',    release: false },
          { type: 'test',     release: false },
          { type: 'build',    release: false },
          { type: 'ci',       release: false },
          { type: 'refactor', release: false },
        ],
      },
    ],

    // ── 2. Gera as notas da release (usadas no CHANGELOG e GitHub) ─────────
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat',     section: 'Novas Funcionalidades' },
            { type: 'fix',      section: 'Correcoes de Bugs' },
            { type: 'perf',     section: 'Melhorias de Performance' },
            { type: 'revert',   section: 'Reversoes' },
            { type: 'docs',     section: 'Documentacao',  hidden: false },
            { type: 'refactor', section: 'Refatoracoes',  hidden: true },
            { type: 'test',     section: 'Testes',        hidden: true },
            { type: 'build',    section: 'Build',         hidden: true },
            { type: 'ci',       section: 'CI/CD',         hidden: true },
            { type: 'chore',    section: 'Manutencao',    hidden: true },
            { type: 'style',    section: 'Estilo',        hidden: true },
          ],
        },
      },
    ],

    // ── 3. Atualiza version no package.json (sem publicar no npm) ──────────
    // O workflow (release.yml) commita este arquivo de volta na main
    // via git push explicito apos o semantic-release concluir.
    [
      '@semantic-release/npm',
      {
        npmPublish: false,
      },
    ],

    // ── 4. Atualiza o CHANGELOG.md ─────────────────────────────────────────
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle:
          '# Changelog\n\nTodas as mudancas notaveis deste projeto estao documentadas aqui.\n\nFormato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/).',
      },
    ],

    // ── 5. Cria a GitHub Release com tag e release notes ───────────────────
    [
      '@semantic-release/github',
      {
        successComment:
          'Esta issue foi incluida na release v${nextRelease.version}.',
        failComment:
          'O pipeline de release falhou. Verifique os logs do workflow.',
        releasedLabels: ['released'],
      },
    ],
  ],
}
