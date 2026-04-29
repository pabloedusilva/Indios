// =============================================================
//  utils/relatorioScheduler.js
//
//  Agendamento automático de relatórios e resumo do dashboard.
//
//  Relatórios mensais:
//    · Todo dia 1 às 00:05 BRT salva os dados do mês anterior
//      na tabela relatorios_mensais (idempotente — não duplica).
//    · No boot, verifica se hoje é dia 1 e o relatório do mês
//      anterior ainda não foi salvo.
//
//  Resumo do dashboard:
//    · Toda meia-noite BRT recalcula o resumo do dia atual.
//    · Também executa no boot.
// =============================================================

const cron = require('node-cron')
const db   = require('../config/database')
const EstatisticasModel = require('../models/EstatisticasModel')

// ── Helpers ───────────────────────────────────────────────────

// Retorna 'YYYY-MM' do mês anterior em relação a uma data
function mesAnterior(data = new Date()) {
  const d = new Date(data)
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

// ── Resumo Dashboard ──────────────────────────────────────────

async function refreshResumoDashboard() {
  try {
    await db.execute(`
      INSERT INTO resumo_dashboard
        (id, data_ref, total_pedidos, faturamento, preparando, prontos, finalizados, cancelados)
      SELECT
        1,
        DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00')),
        COUNT(CASE WHEN status != 'cancelado' THEN 1 END),
        COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total END), 0),
        COUNT(CASE WHEN status = 'preparando' THEN 1 END),
        COUNT(CASE WHEN status = 'pronto'     THEN 1 END),
        COUNT(CASE WHEN status = 'finalizado' THEN 1 END),
        COUNT(CASE WHEN status = 'cancelado'  THEN 1 END)
      FROM pedidos
      WHERE DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00'))
          = DATE(CONVERT_TZ(NOW(),     '+00:00', '-03:00'))
      ON DUPLICATE KEY UPDATE
        data_ref      = VALUES(data_ref),
        total_pedidos = VALUES(total_pedidos),
        faturamento   = VALUES(faturamento),
        preparando    = VALUES(preparando),
        prontos       = VALUES(prontos),
        finalizados   = VALUES(finalizados),
        cancelados    = VALUES(cancelados)
    `)
  } catch {
    // silencioso — não derruba o servidor
  }
}

// ── Relatórios Mensais ────────────────────────────────────────

// Salva os dados do mês no banco (idempotente — INSERT IGNORE)
async function salvarRelatorioMes(mes) {
  try {
    // Verifica se já existe para não recalcular desnecessariamente
    const existente = await EstatisticasModel.buscarRelatorio(mes)
    if (existente) {
      console.log(`[Relatórios] Já existe relatório para ${mes} — ignorando.`)
      return
    }

    console.log(`[Relatórios] Gerando relatório de ${mes}...`)
    const stats = await EstatisticasModel.estatisticasMes(mes)
    await EstatisticasModel.salvarRelatorio(mes, stats)
    console.log(`[Relatórios] Relatório de ${mes} salvo no banco com sucesso.`)
  } catch (err) {
    console.error(`[Relatórios] Erro ao salvar relatório de ${mes}:`, err.message)
  }
}

// Verifica no boot se hoje é dia 1 e o relatório do mês anterior ainda não foi salvo
async function verificarNoBoot() {
  const agora        = new Date()
  const horaBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  if (horaBrasilia.getUTCDate() === 1) {
    const mes = mesAnterior(horaBrasilia)
    await salvarRelatorioMes(mes)
  }
}

// ── Inicialização ─────────────────────────────────────────────

function iniciarScheduler() {
  // Cron: todo dia 1 às 00:05 BRT (03:05 UTC) — salva relatório do mês anterior
  cron.schedule('5 3 1 * *', async () => {
    const mes = mesAnterior()
    await salvarRelatorioMes(mes)
  })

  // Cron: toda meia-noite BRT (03:00 UTC) — reseta resumo do dia
  cron.schedule('0 3 * * *', async () => {
    await refreshResumoDashboard()
  })

  // Boot: popula resumo_dashboard com dados de hoje
  refreshResumoDashboard()

  // Boot: verifica se hoje é dia 1 e falta salvar o relatório
  verificarNoBoot().catch(() => {})
}

module.exports = { iniciarScheduler, salvarRelatorioMes, mesAnterior, refreshResumoDashboard }
