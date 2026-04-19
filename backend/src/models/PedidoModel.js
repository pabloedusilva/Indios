// =============================================================
//  models/PedidoModel.js — Camada de acesso a dados: Pedidos
// =============================================================

const db = require('../config/database')

// Retorna a data de hoje em BRT (YYYY-MM-DD)
function hoje() {
  const d = new Date()
  // UTC-3
  d.setHours(d.getHours() - 3)
  return d.toISOString().slice(0, 10)
}

// Mapeia uma linha do banco (snake_case) para o formato do frontend (camelCase)
function mapPedido(row) {
  const itensRaw = row.itens
  let itens = []
  if (itensRaw) {
    const parsed = typeof itensRaw === 'string' ? JSON.parse(itensRaw) : itensRaw
    itens = (Array.isArray(parsed) ? parsed : []).filter(Boolean).map((i) => ({
      id: i.id,
      produtoId: i.produto_id,
      nomeProduto: i.nome_produto,
      quantidade: i.quantidade,
      precoUnitario: parseFloat(i.preco_unitario),
      subtotal: parseFloat(i.subtotal),
    }))
  }
  return {
    id: row.id,
    numero: row.numero,
    nomeCliente: row.nome_cliente,
    observacoes: row.observacoes,
    status: row.status,
    total: parseFloat(row.total),
    criadoEm: row.criado_em,
    prontoEm: row.pronto_em,
    entregueEm: row.entregue_em,
    pagamentoEm: row.pagamento_em,
    formaPagamento: row.forma_pagamento,
    valorRecebido: row.valor_recebido != null ? parseFloat(row.valor_recebido) : null,
    troco: row.troco != null ? parseFloat(row.troco) : null,
    itens,
  }
}

// Query base para pedidos com itens agrupados
const SELECT_PEDIDO = `
  SELECT
    p.id, p.numero, p.nome_cliente, p.observacoes, p.status, p.total,
    p.criado_em, p.pronto_em, p.entregue_em, p.pagamento_em,
    p.forma_pagamento, p.valor_recebido, p.troco,
    JSON_ARRAYAGG(
      CASE WHEN i.id IS NOT NULL THEN JSON_OBJECT(
        'id', i.id,
        'produto_id', i.produto_id,
        'nome_produto', i.nome_produto,
        'quantidade', i.quantidade,
        'preco_unitario', i.preco_unitario,
        'subtotal', i.subtotal
      ) END
    ) AS itens
  FROM pedidos p
  LEFT JOIN itens_pedido i ON i.pedido_id = p.id
`

const PedidoModel = {
  // Retorna todos os pedidos com itens, com filtros opcionais
  // filtros: { status, periodo (hoje|7d|30d), busca }
  async findAll(filtros = {}) {
    let where = 'WHERE 1=1'
    const params = []

    if (filtros.status) {
      where += ' AND p.status = ?'
      params.push(filtros.status)
    }
    if (filtros.periodo === 'hoje') {
      // FIX: CONVERT_TZ garante que a comparação de "hoje" use o horário de
      // Brasília (UTC-3), e não o UTC do servidor MySQL (Railway).
      // Sem isso, pedidos feitos após 21h SP (= 00h UTC) seriam contados
      // no dia seguinte.
      where += ` AND DATE(CONVERT_TZ(p.criado_em, '+00:00', '-03:00'))
                   = DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))`
    } else if (filtros.periodo === '7d') {
      where += ' AND p.criado_em >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    } else if (filtros.periodo === '30d') {
      where += ' AND p.criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
    }
    if (filtros.busca) {
      where += ' AND p.nome_cliente LIKE ?'
      params.push(`%${filtros.busca}%`)
    }

    const sql = `${SELECT_PEDIDO} ${where} GROUP BY p.id ORDER BY p.criado_em DESC`
    const [rows] = await db.execute(sql, params)
    return rows.map(mapPedido)
  },

  // Retorna apenas pedidos com status preparando ou pronto ordenados por criadoEm ASC
  async findAtivos() {
    const sql = `
      ${SELECT_PEDIDO}
      WHERE p.status IN ('preparando', 'pronto')
      GROUP BY p.id
      ORDER BY p.criado_em ASC
    `
    const [rows] = await db.execute(sql)
    return rows.map(mapPedido)
  },

  // Retorna um pedido com seus itens pelo id
  async findById(id) {
    const sql = `${SELECT_PEDIDO} WHERE p.id = ? GROUP BY p.id`
    const [rows] = await db.execute(sql, [id])
    return rows.length ? mapPedido(rows[0]) : null
  },

  // Insere o pedido + itens em transação, retorna o pedido completo
  // dados: { nomeCliente, observacoes, itens: [{ produtoId, nomeProduto, quantidade, precoUnitario }] }
  async create(dados) {
    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()

      const pedidoId = require('crypto').randomUUID()
      const total = dados.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)

      await conn.execute(
        `INSERT INTO pedidos (id, nome_cliente, observacoes, total) VALUES (?, ?, ?, ?)`,
        [pedidoId, dados.nomeCliente, dados.observacoes || '', total]
      )

      for (const item of dados.itens) {
        const itemId = require('crypto').randomUUID()
        await conn.execute(
          `INSERT INTO itens_pedido (id, pedido_id, produto_id, nome_produto, preco_unitario, quantidade)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [itemId, pedidoId, item.produtoId, item.nomeProduto, item.precoUnitario, item.quantidade]
        )
      }

      await conn.commit()
      conn.release()
      return this.findById(pedidoId)
    } catch (err) {
      await conn.rollback()
      conn.release()
      throw err
    }
  },

  // Muda status → 'pronto' e registra pronto_em
  async marcarPronto(id) {
    await db.execute(
      `UPDATE pedidos SET status = 'pronto', pronto_em = NOW() WHERE id = ?`,
      [id]
    )
    return this.findById(id)
  },

  // Muda status → 'finalizado', registra entregue_em + dados de pagamento
  // pagamento: { formaPagamento, valorRecebido, troco }
  async finalizar(id, pagamento) {
    await db.execute(
      `UPDATE pedidos
         SET status = 'finalizado', entregue_em = NOW(), pagamento_em = NOW(),
             forma_pagamento = ?, valor_recebido = ?, troco = ?
       WHERE id = ?`,
      [pagamento.formaPagamento, pagamento.valorRecebido, pagamento.troco ?? 0, id]
    )
    return this.findById(id)
  },

  // Muda status → 'cancelado'
  async cancelar(id) {
    await db.execute(`UPDATE pedidos SET status = 'cancelado' WHERE id = ?`, [id])
    return this.findById(id)
  },

  // Remove permanentemente o pedido e seus itens (cascade)
  async remove(id) {
    const [result] = await db.execute(`DELETE FROM pedidos WHERE id = ?`, [id])
    return result.affectedRows > 0
  },

  // Consolida estatísticas do dia + pedidos ativos + pedidos de hoje
  async resumoDia() {
    const SQL_TOP_PRODUTOS = `
      SELECT
        i.nome_produto        AS nome,
        SUM(i.quantidade)     AS totalVendido,
        SUM(i.subtotal)       AS receita
      FROM itens_pedido i
      JOIN pedidos p ON p.id = i.pedido_id
      WHERE DATE(CONVERT_TZ(p.criado_em, '+00:00', '-03:00'))
              = DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))
        AND p.status != 'cancelado'
      GROUP BY i.nome_produto
      ORDER BY totalVendido DESC
      LIMIT 3
    `
    const SQL_TICKET_MEDIO = `
      SELECT COALESCE(AVG(total), 0) AS ticketMedio
      FROM pedidos
      WHERE DATE(CONVERT_TZ(criado_em, '+00:00', '-03:00'))
              = DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))
        AND status != 'cancelado'
    `

    const [
      [[resumoRaw]],
      pedidosAtivos,
      pedidosHoje,
      [topProdutosRows],
      [[ticketMedioRow]],
    ] = await Promise.all([
      db.execute(`SELECT * FROM resumo_dashboard WHERE id = 1`),
      this.findAtivos(),
      this.findAll({ periodo: 'hoje' }),
      db.execute(SQL_TOP_PRODUTOS),
      db.execute(SQL_TICKET_MEDIO),
    ])

    // Guarda de segurança: se o resumo_dashboard for de um dia anterior
    // (ex: servidor ficou offline à meia-noite), zera os dados em memória
    // e dispara o recálculo em background para o novo dia.
    const dataRef = resumoRaw?.data_ref
      ? (resumoRaw.data_ref instanceof Date
          ? resumoRaw.data_ref.toISOString().slice(0, 10)
          : String(resumoRaw.data_ref).slice(0, 10))
      : null

    const resumoDesatualizado = !dataRef || dataRef !== hoje()
    if (resumoDesatualizado) {
      // Recalcula em background — próxima requisição já pega os dados corretos
      db.execute(`
        INSERT INTO resumo_dashboard
          (id, data_ref, total_pedidos, faturamento, preparando, prontos, finalizados, cancelados)
        SELECT 1,
          DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00')), 0, 0.00, 0, 0, 0, 0
        ON DUPLICATE KEY UPDATE
          data_ref      = VALUES(data_ref),
          total_pedidos = 0,
          faturamento   = 0.00,
          preparando    = 0,
          prontos       = 0,
          finalizados   = 0,
          cancelados    = 0
      `).catch(() => {})
    }

    const resumo = resumoDesatualizado ? null : resumoRaw

    const topProdutos = topProdutosRows.map((r) => ({
      nome: r.nome,
      totalVendido: Number(r.totalVendido),
      receita: parseFloat(r.receita),
    }))

    return {
      totalPedidosHoje: resumo?.total_pedidos ?? 0,
      faturamentoHoje:  parseFloat(resumo?.faturamento ?? 0),
      preparando:       resumo?.preparando ?? 0,
      prontos:          resumo?.prontos ?? 0,
      finalizados:      resumo?.finalizados ?? 0,
      cancelados:       resumo?.cancelados ?? 0,
      atualizadoEm:     resumo?.atualizado_em ?? null,
      ticketMedio:      parseFloat(ticketMedioRow.ticketMedio),
      topProdutos,
      pedidosAtivos,
      pedidosHoje,
    }
  },
}

module.exports = PedidoModel
