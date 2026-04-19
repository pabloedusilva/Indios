// =============================================================
//  models/ProdutoModel.js — Camada de acesso a dados: Produtos
// =============================================================

const db = require('../config/database')
const crypto = require('crypto')

function mapProduto(row) {
  return {
    id: row.id,
    nome: row.nome,
    categoria: row.categoria,
    preco: parseFloat(row.preco),
    disponivel: Boolean(row.disponivel),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em,
  }
}

const ProdutoModel = {
  async findAll(filtros = {}) {
    let where = 'WHERE 1=1'
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

  async findById(id) {
    const [rows] = await db.execute(`SELECT * FROM produtos WHERE id = ?`, [id])
    return rows.length ? mapProduto(rows[0]) : null
  },

  async create(dados) {
    const id = crypto.randomUUID()
    await db.execute(
      `INSERT INTO produtos (id, nome, categoria, preco, disponivel) VALUES (?, ?, ?, ?, ?)`,
      [id, dados.nome, dados.categoria, dados.preco, dados.disponivel !== false ? 1 : 0]
    )
    return this.findById(id)
  },

  async update(id, dados) {
    const campos = []
    const params = []

    if (dados.nome !== undefined) { campos.push('nome = ?'); params.push(dados.nome) }
    if (dados.categoria !== undefined) { campos.push('categoria = ?'); params.push(dados.categoria) }
    if (dados.preco !== undefined) { campos.push('preco = ?'); params.push(dados.preco) }
    if (dados.disponivel !== undefined) { campos.push('disponivel = ?'); params.push(dados.disponivel ? 1 : 0) }

    if (campos.length === 0) return this.findById(id)

    params.push(id)
    const [result] = await db.execute(
      `UPDATE produtos SET ${campos.join(', ')} WHERE id = ?`,
      params
    )
    if (result.affectedRows === 0) return null
    return this.findById(id)
  },

  async toggleDisponibilidade(id) {
    const [result] = await db.execute(
      `UPDATE produtos SET disponivel = NOT disponivel WHERE id = ?`,
      [id]
    )
    if (result.affectedRows === 0) return null
    return this.findById(id)
  },

  async remove(id) {
    const [result] = await db.execute(`DELETE FROM produtos WHERE id = ?`, [id])
    return result.affectedRows > 0
  },
}

module.exports = ProdutoModel

