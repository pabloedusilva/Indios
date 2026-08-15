// =============================================================
//  models/EstatisticasModel.js — Estatísticas e Relatórios Mensais
//  PostgreSQL/Supabase (UTC com conversão para Brasília)
//  Queries convertem timestamps para 'America/Sao_Paulo' quando necessário
// =============================================================

const db = require('../config/database')

// ── Helpers internos ──────────────────────────────────────────

// Condição WHERE para um mês específico (YYYY-MM) em Brasília
// Agora que as colunas são TIMESTAMPTZ, a conversão é mais simples
function condMes(campo, ano, mes) {
  return `EXTRACT(YEAR FROM (${campo} AT TIME ZONE 'America/Sao_Paulo')) = ${ano}
      AND EXTRACT(MONTH FROM (${campo} AT TIME ZONE 'America/Sao_Paulo')) = ${mes}`
}

// Converte Date do pg para ISO string
function toISO(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return val
}

// Normaliza valor de data para string YYYY-MM-DD.
function diaStr(val) {
  if (!val) return null
  if (typeof val === 'string') return val.slice(0, 10)
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val).slice(0, 10)
}

// Mapeia uma linha da tabela estatisticas_mensais para o formato do frontend
function mapSnapshot(row) {
  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v)
  return {
    mes: row.mes,
    atualizadoEm: toISO(row.atualizado_em),
    resumo: {
      faturamento:      parseFloat(row.faturamento),
      totalPedidos:     Number(row.total_pedidos),
      finalizados:      Number(row.finalizados),
      cancelados:       Number(row.cancelados),
      ticketMedio:      parseFloat(row.ticket_medio),
      taxaCancelamento: parseFloat(row.taxa_cancelamento),
    },
    melhorDia: row.melhor_dia
      ? {
          dia:         diaStr(row.melhor_dia),
          faturamento: parseFloat(row.melhor_dia_faturamento),
          pedidos:     Number(row.melhor_dia_pedidos),
        }
      : null,
    topProdutos: parse(row.top_produtos) ?? [],
    pagamentos:  parse(row.pagamentos)   ?? [],
    porDia:      parse(row.por_dia)      ?? [],
  }
}

// Mapeia uma linha da tabela relatorios_mensais
function mapRelatorio(row) {
  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v)
  return {
    mes:      row.mes,
    geradoEm: toISO(row.gerado_em),
    resumo: {
      faturamento:      parseFloat(row.faturamento),
      totalPedidos:     Number(row.total_pedidos),
      finalizados:      Number(row.finalizados),
      cancelados:       Number(row.cancelados),
      ticketMedio:      parseFloat(row.ticket_medio),
      taxaCancelamento: parseFloat(row.taxa_cancelamento),
    },
    melhorDia: row.melhor_dia
      ? {
          dia:         diaStr(row.melhor_dia),
          faturamento: parseFloat(row.melhor_dia_faturamento),
          pedidos:     Number(row.melhor_dia_pedidos),
        }
      : null,
    topProdutos: parse(row.top_produtos) ?? [],
    pagamentos:  parse(row.pagamentos)   ?? [],
    porDia:      parse(row.por_dia)      ?? [],
  }
}

// ── Model ─────────────────────────────────────────────────────
const EstatisticasModel = {

  // ── Meses disponíveis (últimos 3 com pedidos) ─────────────
  async mesesDisponiveis() {
    const [rows] = await db.execute(`
      SELECT
        TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes,
        COUNT(*)                        AS "totalPedidos",
        COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0) AS faturamento
      FROM pedidos
      WHERE created_at >= NOW() - INTERVAL '3 months'
      GROUP BY TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 3
    `)
    return rows.map((r) => ({
      mes:          r.mes,
      totalPedidos: Number(r.totalPedidos),
      faturamento:  parseFloat(r.faturamento),
    }))
  },

  // ── Snapshot (estatisticas_mensais) ──────────────────────

  // Salva ou atualiza o snapshot de estatísticas de um mês
  async salvar(mes, stats) {
    const { resumo, topProdutos, pagamentos, porDia, melhorDia } = stats
    await db.execute(
      `INSERT INTO estatisticas_mensais
         (mes, faturamento, total_pedidos, finalizados, cancelados,
          ticket_medio, taxa_cancelamento,
          melhor_dia, melhor_dia_faturamento, melhor_dia_pedidos,
          top_produtos, pagamentos, por_dia)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (mes) DO UPDATE SET
         faturamento            = EXCLUDED.faturamento,
         total_pedidos          = EXCLUDED.total_pedidos,
         finalizados            = EXCLUDED.finalizados,
         cancelados             = EXCLUDED.cancelados,
         ticket_medio           = EXCLUDED.ticket_medio,
         taxa_cancelamento      = EXCLUDED.taxa_cancelamento,
         melhor_dia             = EXCLUDED.melhor_dia,
         melhor_dia_faturamento = EXCLUDED.melhor_dia_faturamento,
         melhor_dia_pedidos     = EXCLUDED.melhor_dia_pedidos,
         top_produtos           = EXCLUDED.top_produtos,
         pagamentos             = EXCLUDED.pagamentos,
         por_dia                = EXCLUDED.por_dia,
         atualizado_em          = CURRENT_TIMESTAMP`,
      [
        mes,
        resumo.faturamento,
        resumo.totalPedidos,
        resumo.finalizados,
        resumo.cancelados,
        resumo.ticketMedio,
        resumo.taxaCancelamento,
        melhorDia?.dia         ?? null,
        melhorDia?.faturamento ?? null,
        melhorDia?.pedidos     ?? null,
        JSON.stringify(topProdutos),
        JSON.stringify(pagamentos),
        JSON.stringify(porDia),
      ]
    )
  },

  // Lista todos os snapshots (do mais recente ao mais antigo)
  async listarSnapshots() {
    const [rows] = await db.execute(`
      SELECT
        mes, faturamento, total_pedidos, finalizados, cancelados,
        ticket_medio, taxa_cancelamento,
        melhor_dia, melhor_dia_faturamento, melhor_dia_pedidos,
        top_produtos, pagamentos, por_dia, atualizado_em
      FROM estatisticas_mensais
      ORDER BY mes DESC
    `)
    return rows.map(mapSnapshot)
  },

  // Busca o snapshot de um mês específico (ou null se não existir)
  async buscarSnapshot(mes) {
    const [rows] = await db.execute(
      `SELECT
        mes, faturamento, total_pedidos, finalizados, cancelados,
        ticket_medio, taxa_cancelamento,
        melhor_dia, melhor_dia_faturamento, melhor_dia_pedidos,
        top_produtos, pagamentos, por_dia, atualizado_em
       FROM estatisticas_mensais WHERE mes = $1`,
      [mes]
    )
    return rows.length ? mapSnapshot(rows[0]) : null
  },

  // ── Relatórios mensais (relatorios_mensais) ───────────────

  // Salva o relatório de um mês no banco (idempotente — não sobrescreve se já existir)
  async salvarRelatorio(mes, stats) {
    const { resumo, topProdutos, pagamentos, porDia, melhorDia } = stats

    await db.execute(
      `INSERT INTO relatorios_mensais
         (mes, faturamento, total_pedidos, finalizados, cancelados,
          ticket_medio, taxa_cancelamento,
          melhor_dia, melhor_dia_faturamento, melhor_dia_pedidos,
          top_produtos, pagamentos, por_dia)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (mes) DO NOTHING`,
      [
        mes,
        resumo.faturamento,
        resumo.totalPedidos,
        resumo.finalizados,
        resumo.cancelados,
        resumo.ticketMedio,
        resumo.taxaCancelamento,
        melhorDia?.dia         ?? null,
        melhorDia?.faturamento ?? null,
        melhorDia?.pedidos     ?? null,
        JSON.stringify(topProdutos),
        JSON.stringify(pagamentos),
        JSON.stringify(porDia),
      ]
    )
  },

  // Lista todos os relatórios salvos (do mais recente ao mais antigo)
  async listarRelatorios() {
    const [rows] = await db.execute(`
      SELECT
        mes, faturamento, total_pedidos, finalizados, cancelados,
        ticket_medio, taxa_cancelamento,
        melhor_dia, melhor_dia_faturamento, melhor_dia_pedidos,
        top_produtos, pagamentos, por_dia, gerado_em
      FROM relatorios_mensais
      ORDER BY mes DESC
    `)
    return rows.map(mapRelatorio)
  },

  // Busca o relatório de um mês específico (ou null se não existir)
  async buscarRelatorio(mes) {
    const [rows] = await db.execute(
      `SELECT
        mes, faturamento, total_pedidos, finalizados, cancelados,
        ticket_medio, taxa_cancelamento,
        melhor_dia, melhor_dia_faturamento, melhor_dia_pedidos,
        top_produtos, pagamentos, por_dia, gerado_em
       FROM relatorios_mensais WHERE mes = $1`,
      [mes]
    )
    return rows.length ? mapRelatorio(rows[0]) : null
  },

  // ── Cálculo ao vivo (a partir dos pedidos) ────────────────

  async estatisticasMes(mes) {
    const [anoStr, mesStr] = mes.split('-')
    const ano = parseInt(anoStr, 10)
    const num = parseInt(mesStr, 10)

    const COND_P = condMes('p.created_at', ano, num)
    const COND_C = condMes('created_at',   ano, num)

    const [
      [resumoRows],
      [topProdutos],
      [pagamentos],
      [porDia],
      [melhorDiaRows],
    ] = await Promise.all([
      db.execute(`
        SELECT
          COUNT(*)                                                              AS "totalPedidos",
          SUM(CASE WHEN status != 'cancelado' THEN 1 ELSE 0 END)              AS finalizados,
          SUM(CASE WHEN status = 'cancelado'  THEN 1 ELSE 0 END)              AS cancelados,
          COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0) AS faturamento,
          COALESCE(AVG(CASE WHEN status != 'cancelado' THEN total END), 0)    AS "ticketMedio"
        FROM pedidos
        WHERE ${COND_C}
      `),
      db.execute(`
        SELECT
          i.nome_produto    AS nome,
          SUM(i.quantidade) AS quantidade,
          SUM(i.subtotal)   AS receita
        FROM itens_pedido i
        JOIN pedidos p ON p.id = i.pedido_id
        WHERE ${COND_P}
          AND p.status != 'cancelado'
        GROUP BY i.nome_produto
        ORDER BY quantidade DESC
        LIMIT 10
      `),
      db.execute(`
        SELECT
          forma_pagamento AS forma,
          COUNT(*)        AS qtd,
          COALESCE(SUM(total), 0) AS total
        FROM pedidos
        WHERE ${COND_C}
          AND status = 'finalizado'
          AND forma_pagamento IS NOT NULL
        GROUP BY forma_pagamento
        ORDER BY qtd DESC
      `),
      db.execute(`
        SELECT
          TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')                                          AS dia,
          COUNT(*)                                                                    AS pedidos,
          COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0)   AS faturamento,
          SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END)                     AS cancelados
        FROM pedidos
        WHERE ${COND_C}
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
        ORDER BY dia ASC
      `),
      db.execute(`
        SELECT
          TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')                                          AS dia,
          COUNT(CASE WHEN status != 'cancelado' THEN 1 END)                         AS pedidos,
          COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0)   AS faturamento
        FROM pedidos
        WHERE ${COND_C}
          AND status != 'cancelado'
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
        ORDER BY faturamento DESC
        LIMIT 1
      `),
    ])

    const resumo      = resumoRows[0] || {}
    const totalPedidos = Number(resumo.totalPedidos ?? 0)
    const cancelados   = Number(resumo.cancelados   ?? 0)

    return {
      mes,
      resumo: {
        totalPedidos,
        finalizados:      Number(resumo.finalizados ?? 0),
        cancelados,
        faturamento:      parseFloat(resumo.faturamento ?? 0),
        ticketMedio:      parseFloat(resumo.ticketMedio ?? 0),
        taxaCancelamento: totalPedidos > 0
          ? parseFloat(((cancelados / totalPedidos) * 100).toFixed(1))
          : 0,
      },
      topProdutos: topProdutos.map((r) => ({
        nome:       r.nome,
        quantidade: Number(r.quantidade),
        receita:    parseFloat(r.receita),
      })),
      pagamentos: pagamentos.map((r) => ({
        forma: r.forma,
        qtd:   Number(r.qtd),
        total: parseFloat(r.total),
      })),
      porDia: porDia.map((r) => ({
        dia:         diaStr(r.dia),
        pedidos:     Number(r.pedidos),
        faturamento: parseFloat(r.faturamento),
        cancelados:  Number(r.cancelados),
      })),
      melhorDia: melhorDiaRows[0]
        ? {
            dia:         diaStr(melhorDiaRows[0].dia),
            pedidos:     Number(melhorDiaRows[0].pedidos),
            faturamento: parseFloat(melhorDiaRows[0].faturamento),
          }
        : null,
    }
  },
}

module.exports = EstatisticasModel
