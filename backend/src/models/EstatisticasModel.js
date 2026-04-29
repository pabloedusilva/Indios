// =============================================================
//  models/EstatisticasModel.js — Estatísticas e Relatórios Mensais
//  Todas as datas são convertidas para America/Sao_Paulo (UTC-3)
// =============================================================

const db = require('../config/database')

// ── Helpers internos ──────────────────────────────────────────

// Condição WHERE para um mês específico (YYYY-MM)
function condMes(campo, ano, mes) {
  return `YEAR(CONVERT_TZ(${campo}, '+00:00', '-03:00')) = ${ano}
      AND MONTH(CONVERT_TZ(${campo}, '+00:00', '-03:00')) = ${mes}`
}

// MySQL DATE columns podem vir como Date ou string — normaliza para YYYY-MM-DD
function diaStr(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString().slice(0, 10)
  return String(val).slice(0, 10)
}

// Mapeia uma linha da tabela estatisticas_mensais para o formato do frontend
function mapSnapshot(row) {
  const parse = (v) => (typeof v === 'string' ? JSON.parse(v) : v)
  return {
    mes: row.mes,
    atualizadoEm: row.atualizado_em instanceof Date
      ? row.atualizado_em.toISOString()
      : row.atualizado_em,
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
    geradoEm: row.gerado_em instanceof Date
      ? row.gerado_em.toISOString()
      : row.gerado_em,
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
        DATE_FORMAT(CONVERT_TZ(criado_em, '+00:00', '-03:00'), '%Y-%m') AS mes,
        COUNT(*)                                                          AS totalPedidos,
        COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0) AS faturamento
      FROM pedidos
      WHERE criado_em >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
      GROUP BY DATE_FORMAT(CONVERT_TZ(criado_em, '+00:00', '-03:00'), '%Y-%m')
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         faturamento            = VALUES(faturamento),
         total_pedidos          = VALUES(total_pedidos),
         finalizados            = VALUES(finalizados),
         cancelados             = VALUES(cancelados),
         ticket_medio           = VALUES(ticket_medio),
         taxa_cancelamento      = VALUES(taxa_cancelamento),
         melhor_dia             = VALUES(melhor_dia),
         melhor_dia_faturamento = VALUES(melhor_dia_faturamento),
         melhor_dia_pedidos     = VALUES(melhor_dia_pedidos),
         top_produtos           = VALUES(top_produtos),
         pagamentos             = VALUES(pagamentos),
         por_dia                = VALUES(por_dia),
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
       FROM estatisticas_mensais WHERE mes = ?`,
      [mes]
    )
    return rows.length ? mapSnapshot(rows[0]) : null
  },

  // ── Relatórios mensais (relatorios_mensais) ───────────────

  // Salva o relatório de um mês no banco (idempotente — não sobrescreve se já existir)
  async salvarRelatorio(mes, stats) {
    const { resumo, topProdutos, pagamentos, porDia, melhorDia } = stats
    await db.execute(
      `INSERT IGNORE INTO relatorios_mensais
         (mes, faturamento, total_pedidos, finalizados, cancelados,
          ticket_medio, taxa_cancelamento,
          melhor_dia, melhor_dia_faturamento, melhor_dia_pedidos,
          top_produtos, pagamentos, por_dia)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
       FROM relatorios_mensais WHERE mes = ?`,
      [mes]
    )
    return rows.length ? mapRelatorio(rows[0]) : null
  },

  // ── Cálculo ao vivo (a partir dos pedidos) ────────────────

  async estatisticasMes(mes) {
    const [anoStr, mesStr] = mes.split('-')
    const ano = parseInt(anoStr, 10)
    const num = parseInt(mesStr, 10)

    const COND   = condMes('criado_em',   ano, num)
    const COND_P = condMes('p.criado_em', ano, num)

    const [
      [[resumo]],
      [topProdutos],
      [pagamentos],
      [porDia],
      [[melhorDia]],
    ] = await Promise.all([
      db.execute(`
        SELECT
          COUNT(*)                                                              AS totalPedidos,
          SUM(CASE WHEN status != 'cancelado' THEN 1 ELSE 0 END)              AS finalizados,
          SUM(CASE WHEN status = 'cancelado'  THEN 1 ELSE 0 END)              AS cancelados,
          COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0) AS faturamento,
          COALESCE(AVG(CASE WHEN status != 'cancelado' THEN total END), 0)    AS ticketMedio
        FROM pedidos
        WHERE ${COND}
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
          COALESCE(forma_pagamento, 'nao_informado') AS forma,
          COUNT(*)                                   AS qtd,
          COALESCE(SUM(total), 0)                    AS total
        FROM pedidos
        WHERE ${COND}
          AND status = 'finalizado'
        GROUP BY forma_pagamento
        ORDER BY qtd DESC
      `),
      db.execute(`
        SELECT
          DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00'))                         AS dia,
          COUNT(*)                                                                  AS pedidos,
          COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0) AS faturamento,
          SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END)                   AS cancelados
        FROM pedidos
        WHERE ${COND}
        GROUP BY DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00'))
        ORDER BY dia ASC
      `),
      db.execute(`
        SELECT
          DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00'))   AS dia,
          COUNT(CASE WHEN status != 'cancelado' THEN 1 END)  AS pedidos,
          COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total ELSE 0 END), 0) AS faturamento
        FROM pedidos
        WHERE ${COND}
          AND status != 'cancelado'
        GROUP BY DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00'))
        ORDER BY faturamento DESC
        LIMIT 1
      `),
    ])

    const totalPedidos = Number(resumo.totalPedidos)
    const cancelados   = Number(resumo.cancelados)

    return {
      mes,
      resumo: {
        totalPedidos,
        finalizados:      Number(resumo.finalizados),
        cancelados,
        faturamento:      parseFloat(resumo.faturamento),
        ticketMedio:      parseFloat(resumo.ticketMedio),
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
      melhorDia: melhorDia
        ? {
            dia:         diaStr(melhorDia.dia),
            pedidos:     Number(melhorDia.pedidos),
            faturamento: parseFloat(melhorDia.faturamento),
          }
        : null,
    }
  },
}

module.exports = EstatisticasModel
