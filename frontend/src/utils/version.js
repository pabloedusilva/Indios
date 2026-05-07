// =============================================================
// version.js — Versão da aplicação
//
// A versão é injetada em build-time pelo Vite a partir do
// package.json raiz do monorepo (campo "version").
//
// O semantic-release atualiza automaticamente esse valor a cada
// nova release via @semantic-release/npm, garantindo que a versão
// exibida na dashboard reflita sempre a release atual do GitHub.
//
// Fluxo completo:
//   git tag v1.2.0 (semantic-release)
//   → package.json atualizado para "version": "1.2.0"
//   → Render.com reconstrói o frontend
//   → Vite lê package.json e injeta "1.2.0" no bundle
//   → APP_VERSION === "1.2.0" em toda a aplicação
// =============================================================

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.0.0'
