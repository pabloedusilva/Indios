// =============================================================
//  models/PedidoModel.js — Camada de acesso a dados: Pedidos
//  PostgreSQL/Supabase (UTC com conversão para Brasília)
// =============================================================

const db = require('../config/database')

// Converte Date do pg para ISO string
function toISO(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return val
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
  
  // Mapeia status do banco (em_preparo) para o frontend (preparando)
  let status = row.status
  if (status === 'em_preparo') status = 'preparando'
  
  return {
    id: row.id,
    numero: row.numero_pedido,
    nomeCliente: row.nome_cliente,
    observacoes: row.observacoes,
    status,
    total: parseFloat(row.total),
    criadoEm: toISO(row.created_at),
    prontoEm: toISO(row.pronto_em),
    entregueEm: toISO(row.entregue_em),
    pagamentoEm: toISO(row.pagamento_em),
    formaPagamento: row.forma_pagamento,
    valorRecebido: row.valor_recebido != null ? parseFloat(row.valor_recebido) : null,
    troco: row.troco != null ? parseFloat(row.troco) : null,
    itens,
  }
}

// Query base para pedidos com itens agrupados (PostgreSQL)
const SELECT_PEDIDO = `
  SELECT
    p.id, p.numero_pedido, p.nome_cliente, p.observacoes, p.status, p.total,
    p.created_at, p.pronto_em, p.entregue_em, p.pagamento_em,
    p.forma_pagamento, p.valor_recebido, p.troco,
    COALESCE(
      json_agg(
        json_build_object(
          'id', i.id,
          'produto_id', i.produto_id,
          'nome_produto', i.nome_produto,
          'quantidade', i.quantidade,
          'preco_unitario', i.preco_unitario,
          'subtotal', i.subtotal
        )
        ORDER BY i.created_at
      ) FILTER (WHERE i.id IS NOT NULL),
      '[]'::json
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
    let paramIndex = 1

    if (filtros.status) {
      where += ` AND p.status = $${paramIndex}`
      params.push(filtros.status)
      paramIndex++
    }
    if (filtros.periodo === 'hoje') {
      // Compara a data em Brasília (America/Sao_Paulo)
      where += ` AND (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date 
                   = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date`
    } else if (filtros.periodo === '7d') {
      where += ` AND p.created_at >= NOW() - INTERVAL '7 days'`
    } else if (filtros.periodo === '30d') {
      where += ` AND p.created_at >= NOW() - INTERVAL '30 days'`
    }
    if (filtros.busca) {
      where += ` AND p.nome_cliente ILIKE $${paramIndex}`
      params.push(`%${filtros.busca}%`)
      paramIndex++
    }

    const sql = `${SELECT_PEDIDO} ${where} GROUP BY p.id ORDER BY p.created_at DESC`
    const [rows] = await db.execute(sql, params)
    return rows.map(mapPedido)
  },

  // Retorna apenas pedidos com status em_preparo ou pronto ordenados por criadoEm ASC
  async findAtivos() {
    const sql = `
      ${SELECT_PEDIDO}
      WHERE p.status IN ('em_preparo', 'pronto')
      GROUP BY p.id
      ORDER BY p.created_at ASC
    `
    const [rows] = await db.execute(sql)
    return rows.map(mapPedido)
  },

  // Retorna um pedido com seus itens pelo id
  async findById(id) {
    const sql = `${SELECT_PEDIDO} WHERE p.id = $1 GROUP BY p.id`
    const [rows] = await db.execute(sql, [id])
    return rows.length ? mapPedido(rows[0]) : null
  },

  // Insere o pedido + itens em transação, retorna o pedido completo
  // dados: { nomeCliente, observacoes, itens: [{ produtoId, nomeProduto, quantidade, precoUnitario }] }
  async create(dados) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const total = dados.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)

      // Busca o próximo número de pedido da sequência
      const seqResult = await client.query(`SELECT nextval('pedidos_numero_seq') AS numero`)
      const numeroPedido = seqResult.rows[0].numero

      // Detecta se é pedido sem identificação (Cliente #TEMP do frontend)
      let nomeCliente = dados.nomeCliente
      if (nomeCliente === 'Cliente #TEMP') {
        nomeCliente = `Cliente #${String(numeroPedido).padStart(4, '0')}`
      }

      // Insere o pedido e retorna o id gerado
      const pedidoResult = await client.query(
        `INSERT INTO pedidos (numero_pedido, nome_cliente, observacoes, total, status) 
         VALUES ($1, $2, $3, $4, 'em_preparo')
         RETURNING id`,
        [String(numeroPedido).padStart(4, '0'), nomeCliente, dados.observacoes || '', total]
      )
      const pedidoId = pedidoResult.rows[0].id

      for (const item of dados.itens) {
        const subtotal = item.quantidade * item.precoUnitario
        await client.query(
          `INSERT INTO itens_pedido (pedido_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pedidoId, item.produtoId, item.nomeProduto, item.precoUnitario, item.quantidade, subtotal]
        )
      }

      await client.query('COMMIT')
      client.release()
      return this.findById(pedidoId)
    } catch (err) {
      await client.query('ROLLBACK')
      client.release()
      throw err
    }
  },

  // Adiciona novos itens ao pedido existente e recalcula o total
  // novosItens: [{ produtoId, nomeProduto, quantidade, precoUnitario }]
  async adicionarItens(id, novosItens) {
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      // Verifica se o pedido existe e não está finalizado/cancelado
      const pedidoResult = await client.query(
        `SELECT id, status FROM pedidos WHERE id = $1`,
        [id]
      )
      
      if (pedidoResult.rows.length === 0) {
        throw new Error('Pedido não encontrado')
      }
      
      const pedido = pedidoResult.rows[0]
      if (['finalizado', 'cancelado'].includes(pedido.status)) {
        throw new Error('Não é possível adicionar itens a um pedido finalizado ou cancelado')
      }

      // Adiciona os novos itens
      for (const item of novosItens) {
        const subtotal = item.quantidade * item.precoUnitario
        await client.query(
          `INSERT INTO itens_pedido (pedido_id, produto_id, nome_produto, preco_unitario, quantidade, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.produtoId, item.nomeProduto, item.precoUnitario, item.quantidade, subtotal]
        )
      }

      // Recalcula o total do pedido
      const totalResult = await client.query(
        `SELECT COALESCE(SUM(subtotal), 0) AS novo_total 
         FROM itens_pedido 
         WHERE pedido_id = $1`,
        [id]
      )
      const novoTotal = totalResult.rows[0].novo_total

      // Atualiza o total do pedido
      await client.query(
        `UPDATE pedidos SET total = $1 WHERE id = $2`,
        [novoTotal, id]
      )

      await client.query('COMMIT')
      client.release()
      return this.findById(id)
    } catch (err) {
      await client.query('ROLLBACK')
      client.release()
      throw err
    }
  },

  // Muda status → 'pronto' e registra pronto_em
  async marcarPronto(id) {
    await db.execute(
      `UPDATE pedidos SET status = 'pronto', pronto_em = NOW() WHERE id = $1`,
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
             forma_pagamento = $1, valor_recebido = $2, troco = $3
       WHERE id = $4`,
      [pagamento.formaPagamento, pagamento.valorRecebido, pagamento.troco ?? 0, id]
    )
    return this.findById(id)
  },

  // Muda status → 'cancelado'
  async cancelar(id) {
    await db.execute(`UPDATE pedidos SET status = 'cancelado' WHERE id = $1`, [id])
    return this.findById(id)
  },

  // Remove permanentemente o pedido e seus itens (cascade)
  async remove(id) {
    const [result] = await db.execute(`DELETE FROM pedidos WHERE id = $1`, [id])
    return result.rowCount > 0
  },

  // Consolida estatísticas do dia + pedidos ativos + pedidos de hoje
  async resumoDia() {
    const SQL_TOP_PRODUTOS = `
      SELECT
        i.nome_produto        AS nome,
        SUM(i.quantidade)     AS "totalVendido",
        SUM(i.subtotal)       AS receita
      FROM itens_pedido i
      JOIN pedidos p ON p.id = i.pedido_id
      WHERE (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date 
              = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        AND p.status != 'cancelado'
      GROUP BY i.nome_produto
      ORDER BY "totalVendido" DESC
      LIMIT 3
    `
    const SQL_TICKET_MEDIO = `
      SELECT COALESCE(AVG(total), 0) AS "ticketMedio"
      FROM pedidos
      WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date 
              = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date
        AND status != 'cancelado'
    `

    const [
      [resumoRows],
      pedidosAtivos,
      pedidosHoje,
      [topProdutosRows],
      [ticketMedioRows],
    ] = await Promise.all([
      db.execute(`SELECT * FROM resumo_dashboard`),
      this.findAtivos(),
      this.findAll({ periodo: 'hoje' }),
      db.execute(SQL_TOP_PRODUTOS),
      db.execute(SQL_TICKET_MEDIO),
    ])

    const resumo = resumoRows[0] || {}
    const ticketMedio = ticketMedioRows[0] || {}

    const topProdutos = topProdutosRows.map((r) => ({
      nome: r.nome,
      totalVendido: Number(r.totalVendido),
      receita: parseFloat(r.receita),
    }))

    return {
      totalPedidosHoje: Number(resumo.total_pedidos ?? 0),
      faturamentoHoje:  parseFloat(resumo.faturamento ?? 0),
      preparando:       Number(resumo.preparando ?? 0),
      prontos:          Number(resumo.prontos ?? 0),
      finalizados:      Number(resumo.finalizados ?? 0),
      cancelados:       Number(resumo.cancelados ?? 0),
      atualizadoEm:     toISO(resumo.atualizado_em),
      ticketMedio:      parseFloat(ticketMedio.ticketMedio ?? 0),
      topProdutos,
      pedidosAtivos,
      pedidosHoje,
    }
  },
}

module.exports = PedidoModel
