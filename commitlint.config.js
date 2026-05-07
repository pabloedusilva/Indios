// =============================================================
// commitlint.config.js — Configuração do commitlint
//
// Responsabilidades:
//   · Validar mensagens de commit contra Conventional Commits
//   · Bloquear commits com formato inválido via Husky hook
//   · Garantir rastreabilidade e geração automática de changelog
//
// Formato obrigatório:
//   <tipo>(<escopo opcional>): <descrição curta>
//
//   [corpo opcional]
//
//   [rodapé opcional — BREAKING CHANGE, closes #issue]
//
// Exemplos válidos:
//   feat(pedidos): adiciona filtro por status
//   fix(api): corrige timeout na rota de pagamentos
//   feat!: remove suporte ao método de pagamento legado
//   BREAKING CHANGE: endpoint /v1/pedidos renomeado para /v2/pedidos
//
// Documentação: https://commitlint.js.org
// =============================================================

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  // Estende as regras do padrão Conventional Commits
  extends: ['@commitlint/config-conventional'],

  // ----------------------------------------------------------
  // IGNORES
  // Mensagens de commit que devem ser ignoradas pela validação.
  // Merge commits gerados automaticamente pelo GitHub ("Merge pull
  // request #N" e "Merge branch '...'") são excluídos para não
  // bloquear PRs que contenham esse tipo de commit no histórico.
  // ----------------------------------------------------------
  ignores: [
    (message) => message.startsWith('Merge pull request'),
    (message) => message.startsWith('Merge branch'),
    (message) => /^Merge remote-tracking branch/.test(message),
  ],

  // ----------------------------------------------------------
  // PARSER — interpreta a estrutura da mensagem de commit
  // ----------------------------------------------------------
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\((\S+)\))?!?: (.+)$/,
      breakingHeaderPattern: /^(\w*)(?:\((\S+)\))?!: (.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
      noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
      revertPattern: /^(?:Revert|revert:)\s"?([\s\S]+?)"?\s*This reverts commit (\w*)\./i,
      revertCorrespondence: ['header', 'hash'],
    },
  },

  // ----------------------------------------------------------
  // REGRAS
  // Nível: 0 = desabilitado, 1 = aviso, 2 = erro (bloqueia commit)
  // Aplicação: 'always' = deve seguir a regra, 'never' = não deve
  // ----------------------------------------------------------
  rules: {
    // ---- TIPO ----
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nova funcionalidade (gera MINOR release)
        'fix',      // Correção de bug (gera PATCH release)
        'perf',     // Melhoria de performance (gera PATCH release)
        'revert',   // Reverter commit anterior (gera PATCH release)
        'refactor', // Refatoração sem mudança de comportamento (sem release)
        'docs',     // Documentação (sem release)
        'test',     // Testes (sem release)
        'build',    // Mudanças no sistema de build (sem release)
        'ci',       // Mudanças em CI/CD (sem release)
        'chore',    // Manutenção geral (sem release)
        'style',    // Formatação, estilos, sem mudança de lógica (sem release)
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // ---- ESCOPO ----
    'scope-case': [2, 'always', ['lower-case', 'camel-case', 'kebab-case']],
    'scope-empty': [0], // Escopo é opcional

    // ---- SUBJECT (descrição) ----
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [
      1, // Aviso (não bloqueia)
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-min-length': [2, 'always', 10],
    'subject-max-length': [2, 'always', 100],

    // ---- HEADER ----
    'header-max-length': [2, 'always', 120],
    'header-trim': [2, 'always'],

    // ---- BODY ----
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 200],

    // ---- FOOTER ----
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 200],
  },
};
