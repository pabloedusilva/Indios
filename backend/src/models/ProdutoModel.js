// =============================================================
//  models/ProdutoModel.js — Camada de acesso a dados: Produtos
//
//  Exclusão via soft delete (deletado_em):
//    · Produtos excluídos ficam na tabela com deletado_em preenchido
//    · Todas as queries filtram WHERE deletado_em IS NULL
//    · Isso preserva a integridade referencial com itens_pedido
// =============================================================

const db     = require('../config/database')
const crypto = require('crypto')

// ── Helper de mapeamento ──────────────────────────────────────

function mapProduto(row) {
  return {
    id:           row.id,
    nome:         row.nome,
    categoria:    row.categoria,
    preco:        parseFloat(row.preco),
    disponivel:   Boolean(row.disponivel),
    criadoEm:     row.criado_em,
    atualizadoEm: row.atualizado_em,
  }
}

// ── Model ─────────────────────────────────────────────────────

const ProdutoModel = {

  // Retorna todos os produtos ativos (não deletados)
  async findAll(filtros = {}) {
    let where = 'WHERE deletado_em IS NULL'
    const params = []

    if (filtros.categoria) {
      where += ' AND categoria = ?'
      params.push(filtros.categoria)
    }
    if (filtros.disponivel !== undefined) {
      where += ' AND disponivel = ?'
      params.push(filtros.disponivel === 'true' || filtros.disponivel === true ? 1 : 0)
    }
    if (filtros.busca) {
      where += ' AND nome LIKE ?'
      params.push(`%${filtros.busca}%`)
    }

    const [rows] = await db.execute(
      `SELECT * FROM produtos ${where} ORDER BY categoria, nome`,
      params
    )
    return rows.map(mapProduto)
  },

  // Busca produto ativo por ID
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT * FROM produtos WHERE id = ? AND deletado_em IS NULL`,
      [id]
    )
    return rows.length ? mapProduto(rows[0]) : null
  },

  // Cria novo produto
  async create(dados) {
    const id = crypto.randomUUID()
    await db.execute(
      `INSERT INTO produtos (id, nome, categoria, preco, disponivel) VALUES (?, ?, ?, ?, ?)`,
      [id, dados.nome, dados.categoria, dados.preco, dados.disponivel !== false ? 1 : 0]
    )
    return this.findById(id)
  },

  // Atualiza campos do produto
  async update(id, dados) {
    const campos = []
    const params = []

    if (dados.nome       !== undefined) { campos.push('nome = ?');       params.push(dados.nome) }
    if (dados.categoria  !== undefined) { campos.push('categoria = ?');  params.push(dados.categoria) }
    if (dados.preco      !== undefined) { campos.push('preco = ?');      params.push(dados.preco) }
    if (dados.disponivel !== undefined) { campos.push('disponivel = ?'); params.push(dados.disponivel ? 1 : 0) }

    if (campos.length === 0) return this.findById(id)

    params.push(id)
    const [result] = await db.execute(
      `UPDATE produtos SET ${campos.join(', ')} WHERE id = ? AND deletado_em IS NULL`,
      params
    )
    if (result.affectedRows === 0) return null
    return this.findById(id)
  },

  // Alterna disponibilidade do produto
  async toggleDisponibilidade(id) {
    const [result] = await db.execute(
      `UPDATE produtos SET disponivel = NOT disponivel WHERE id = ? AND deletado_em IS NULL`,
      [id]
    )
    if (result.affectedRows === 0) return null
    return this.findById(id)
  },

  // Soft delete — marca deletado_em sem remover o registro
  // Preserva integridade referencial com itens_pedido (histórico de pedidos)
  async remove(id) {
    const [result] = await db.execute(
      `UPDATE produtos SET deletado_em = NOW() WHERE id = ? AND deletado_em IS NULL`,
      [id]
    )
    return result.affectedRows > 0
  },
}

module.exports = ProdutoModel
