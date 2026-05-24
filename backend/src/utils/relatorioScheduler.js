// =============================================================
//  utils/relatorioScheduler.js
//
//  Agendamento de relatórios mensais.
//
//  O resumo do dashboard é uma VIEW em tempo real — não precisa
//  de nenhum scheduler para atualizar.
//
//  Relatórios mensais:
//    · Todo dia 1 às 00:05 BRT salva os dados do mês anterior
//      na tabela relatorios_mensais (idempotente).
//    · No boot, verifica se hoje é dia 1 e o relatório falta.
// =============================================================

const cron              = require('node-cron')
const EstatisticasModel = require('../models/EstatisticasModel')

// ── Helpers ───────────────────────────────────────────────────

function mesAnterior(data = new Date()) {
  const d = new Date(data)
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

// ── Relatórios Mensais ────────────────────────────────────────

async function salvarRelatorioMes(mes) {
  try {
    const existente = await EstatisticasModel.buscarRelatorio(mes)
    if (existente) {
      console.log(`[Relatórios] Já existe relatório para ${mes} — ignorando.`)
      return
    }
    console.log(`[Relatórios] Gerando relatório de ${mes}...`)
    const stats = await EstatisticasModel.estatisticasMes(mes)
    await EstatisticasModel.salvarRelatorio(mes, stats)
    console.log(`[Relatórios] Relatório de ${mes} salvo com sucesso.`)
  } catch (err) {
    console.error(`[Relatórios] Erro ao salvar relatório de ${mes}:`, err.message)
  }
}

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
  // Dia 1 às 00:05 BRT (03:05 UTC) — salva relatório do mês anterior
  cron.schedule('5 3 1 * *', async () => {
    const mes = mesAnterior()
    await salvarRelatorioMes(mes)
  })

  // Boot: verifica se hoje é dia 1 e falta salvar o relatório
  verificarNoBoot().catch(() => {})
}

module.exports = { iniciarScheduler, salvarRelatorioMes, mesAnterior }
