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
//  2. limparExpirados   — todo dia às 03:00 (BRT)
//     Deleta permanentemente os registros com status 'expired'
//     que foram criados há mais de 30 dias. Mantém o banco limpo
//     sem remover dados recentes que ainda possam ser auditados.
//
//  Segurança:
//    · Cada job tem lock interno para não rodar em paralelo
//    · Erros são capturados e logados sem derrubar o servidor
//    · Logs estruturados com timestamp e contagem de registros
// =============================================================

const cron         = require('node-cron')
const PagamentoModel = require('../models/PagamentoModel')

// ── Estado interno dos locks ──────────────────────────────────
let expirandoEmAndamento = false
let limpandoEmAndamento  = false

// ── Job 1: Expirar pendentes vencidos ─────────────────────────
async function expirarPendentes() {
  if (expirandoEmAndamento) {
    console.log('[PixCleanup] Job de expiração já em andamento — pulando')
    return
  }

  expirandoEmAndamento = true
  const t0 = Date.now()

  try {
    const total = await PagamentoModel.expirarPendentesVencidos()

    if (total > 0) {
      console.log(`[PixCleanup] ${total} pagamento(s) expirado(s) em ${Date.now() - t0}ms`)
    }
  } catch (err) {
    console.error('[PixCleanup] Erro ao expirar pendentes:', err.message)
  } finally {
    expirandoEmAndamento = false
  }
}

// ── Job 2: Deletar expirados antigos (> 30 dias) ──────────────
async function limparExpirados() {
  if (limpandoEmAndamento) {
    console.log('[PixCleanup] Job de limpeza já em andamento — pulando')
    return
  }

  limpandoEmAndamento = true
  const t0 = Date.now()

  try {
    const total = await PagamentoModel.deletarExpiradosAntigos()

    if (total > 0) {
      console.log(`[PixCleanup] ${total} registro(s) expirado(s) deletado(s) em ${Date.now() - t0}ms`)
    }
  } catch (err) {
    console.error('[PixCleanup] Erro ao limpar expirados:', err.message)
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

  // Job 2: todo dia às 03:00 BRT — deleta expirados com > 30 dias
  cron.schedule('0 3 * * *', limparExpirados, {
    timezone: 'America/Sao_Paulo',
  })

  console.log('[PixCleanup] Microserviço iniciado')
  console.log('[PixCleanup]   · Expiração de pendentes: a cada 5 minutos')
  console.log('[PixCleanup]   · Limpeza de expirados:   todo dia às 03:00 BRT')

  // Rodar expiração imediatamente ao iniciar (para corrigir estado do banco)
  expirarPendentes()
}

module.exports = { iniciarPixCleanup, expirarPendentes, limparExpirados }
