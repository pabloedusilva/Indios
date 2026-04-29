// =============================================================
//  services/PixCleanupService.js — Microserviço de manutenção PIX
//
//  Dois jobs agendados via node-cron:
//
//  1. expirarPendentes  — todo dia às 01:00 (BRT)
//     Marca como 'expired' todos os pagamentos com status 'pending'
//     cujo expires_at já passou (> 24h desde a criação).
//     Roda uma vez por dia — suficiente pois o expires_at é sempre
//     NOW() + 24h, então só expira no dia seguinte à criação.
//
//  2. limparExpirados   — todo dia 24 de cada mês às 03:00 (BRT)
//     Deleta permanentemente os registros com status 'expired'
//     que foram criados há mais de 30 dias. Mantém o banco limpo
//     sem remover dados recentes que ainda possam ser auditados.
//
//  Segurança:
//    · Cada job tem lock interno para não rodar em paralelo
//    · Erros são capturados silenciosamente sem derrubar o servidor
//    · O modelo usa FOR UPDATE no banco para evitar race conditions
// =============================================================

const cron           = require('node-cron')
const PagamentoModel = require('../models/PagamentoModel')

// ── Locks internos ────────────────────────────────────────────
let expirandoEmAndamento = false
let limpandoEmAndamento  = false

// ── Job 1: Expirar pendentes vencidos (> 24h) ─────────────────
async function expirarPendentes() {
  if (expirandoEmAndamento) return

  expirandoEmAndamento = true
  try {
    await PagamentoModel.expirarPendentesVencidos()
  } catch {
    // erro silencioso — não derruba o servidor
  } finally {
    expirandoEmAndamento = false
  }
}

// ── Job 2: Deletar expirados antigos (> 30 dias) ──────────────
async function limparExpirados() {
  if (limpandoEmAndamento) return

  limpandoEmAndamento = true
  try {
    await PagamentoModel.deletarExpiradosAntigos()
  } catch {
    // erro silencioso — não derruba o servidor
  } finally {
    limpandoEmAndamento = false
  }
}

// ── Inicialização ─────────────────────────────────────────────
function iniciarPixCleanup() {
  // Job 1: todo dia às 01:00 BRT — expira pendentes com > 24h
  // PIX expira em 24h desde a criação, então rodar uma vez por dia é suficiente
  cron.schedule('0 1 * * *', expirarPendentes, {
    timezone: 'America/Sao_Paulo',
  })

  // Job 2: todo dia 24 de cada mês às 03:00 BRT — deleta expirados com > 30 dias
  cron.schedule('0 3 24 * *', limparExpirados, {
    timezone: 'America/Sao_Paulo',
  })
}

module.exports = { iniciarPixCleanup, expirarPendentes, limparExpirados }
