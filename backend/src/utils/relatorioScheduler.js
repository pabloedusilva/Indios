// =============================================================
//  utils/relatorioScheduler.js
//
//  Agendamento automático de relatórios PDF mensais.
//  Regra: todo dia 1º de cada mês às 00:05, gera o relatório
//  do mês anterior (se ainda não existir).
//
//  Também executa uma verificação no boot: se hoje é dia 1
//  e o relatório do mês anterior ainda não foi gerado, gera.
// =============================================================

const cron = require('node-cron')
const path = require('path')
const fs   = require('fs')

const db = require('../config/database')
const EstatisticasModel  = require('../models/EstatisticasModel')
const { gerarPDFInterno } = require('../controllers/estatisticasController')

const RELATORIOS_DIR = path.join(__dirname, '..', '..', 'relatorios')
const MAX_RELATORIOS  = 3

// ── Resumo Dashboard ──────────────────────────────────────────

// Recalcula e grava a linha única de resumo_dashboard para HOJE
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
  } catch (err) {
    // silencioso
  }
}

// ── Relatórios PDF ────────────────────────────────────────────

function garantirPasta() {
  if (!fs.existsSync(RELATORIOS_DIR)) {
    fs.mkdirSync(RELATORIOS_DIR, { recursive: true })
  }
}

function listarPDFs() {
  garantirPasta()
  return fs
    .readdirSync(RELATORIOS_DIR)
    .filter((f) => /^relatorio-\d{4}-\d{2}\.pdf$/.test(f))
    .sort()
}

function gerenciarLimite() {
  const pdfs = listarPDFs()
  if (pdfs.length >= MAX_RELATORIOS) {
    const maisAntigo = pdfs[0]
    fs.unlinkSync(path.join(RELATORIOS_DIR, maisAntigo))
  }
}

// Retorna 'YYYY-MM' do mês anterior em relação a uma data
function mesAnterior(data = new Date()) {
  const d = new Date(data)
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

async function gerarRelatorioMes(mes) {
  const arquivo  = `relatorio-${mes}.pdf`
  const filePath = path.join(RELATORIOS_DIR, arquivo)

  if (fs.existsSync(filePath)) {
    return
  }

  try {
    gerenciarLimite()
    const stats = await EstatisticasModel.estatisticasMes(mes)
    await gerarPDFInterno(stats, filePath)
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
}

// Verifica no boot se hoje é dia 1 e se falta gerar o relatório do mês anterior
async function verificarNoBoot() {
  const agora = new Date()
  // Usa horário de Brasília (UTC-3)
  const horaBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  if (horaBrasilia.getUTCDate() === 1) {
    const mes = mesAnterior(horaBrasilia)
    await gerarRelatorioMes(mes)
  }
}

function iniciarScheduler() {
  // ── Cron: todo dia 1 às 00:05 BRT — gera relatório do mês anterior ──
  // UTC 03:05 = 00:05 BRT
  cron.schedule('5 3 1 * *', async () => {
    const mes = mesAnterior()
    await gerarRelatorioMes(mes)
  })

  // ── Cron: toda meia-noite BRT (03:00 UTC) — reseta resumo do dia ────
  cron.schedule('0 3 * * *', async () => {
    await refreshResumoDashboard()
  })



  // ── Boot: popula resumo_dashboard com dados de hoje ─────────────────
  refreshResumoDashboard()

  // ── Boot: verifica se hoje é dia 1 e falta gerar relatório ──────────
  verificarNoBoot().catch(() => {})
}

module.exports = { iniciarScheduler, gerarRelatorioMes, mesAnterior, refreshResumoDashboard }
