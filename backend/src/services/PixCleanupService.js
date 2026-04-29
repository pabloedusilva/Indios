// =============================================================
//  services/PixCleanupService.js — Microserviço de manutenção PIX
//
//  Dois jobs agendados via node-cron:
//
//  1. expirarPendentes  — a cada 5 minutos
//     Marca como 'expired' todos os pagamentos com status 'pending'
//     cujo expires_at já passou. Garante que o banco reflita a
//     realidade: um QR Code vencido nunca será reutilizado.
//
//  2. limparExpirados   — todo dia 24 de cada mês às 03:00 (BRT)
//     Deleta permanentemente os registros com status 'expired'
//     que foram criados há mais de 30 dias. Mantém o banco limpo
//     sem remover dados recentes que ainda possam ser auditados.
//
//  Segurança:
//    · Cada job tem lock interno para não rodar em paralelo
//    · Erros são capturados silenciosamente sem derrubar o servidor
// =============================================================

const cron           = require('node-cron')
const PagamentoModel = require('../models/PagamentoModel')

// ── Locks internos ────────────────────────────────────────────
let expirandoEmAndamento = false
let limpandoEmAndamento  = false

// ── Job 1: Expirar pendentes vencidos ─────────────────────────
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
  // Job 1: a cada 5 minutos — expira QR Codes vencidos
  cron.schedule('*/5 * * * *', expirarPendentes, {
    timezone: 'America/Sao_Paulo',
  })

  // Job 2: todo dia 24 de cada mês às 03:00 BRT — deleta expirados com > 30 dias
  cron.schedule('0 3 24 * *', limparExpirados, {
    timezone: 'America/Sao_Paulo',
  })

  // Corrige estado do banco imediatamente ao iniciar
  expirarPendentes()
}

module.exports = { iniciarPixCleanup, expirarPendentes, limparExpirados }
