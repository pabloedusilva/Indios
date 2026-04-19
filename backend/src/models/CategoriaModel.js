// =============================================================
//  models/CategoriaModel.js — Camada de acesso a dados: Categorias
// =============================================================

const db     = require('../config/database')
const crypto = require('crypto')

function mapCategoria(row) {
  return {
    id:        row.id,
    nome:      row.nome,
    criadoEm: row.criado_em,
  }
}

const CategoriaModel = {
  async findAll() {
    const [rows] = await db.execute(
      `SELECT * FROM categorias ORDER BY nome ASC`
    )
    return rows.map(mapCategoria)
  },

  async findById(id) {
    const [rows] = await db.execute(`SELECT * FROM categorias WHERE id = ?`, [id])
    return rows.length ? mapCategoria(rows[0]) : null
  },

  async findByNome(nome) {
    const [rows] = await db.execute(
      `SELECT * FROM categorias WHERE LOWER(nome) = LOWER(?)`, [nome]
    )
    return rows.length ? mapCategoria(rows[0]) : null
  },

  async create(nome) {
    const id = crypto.randomUUID()
    await db.execute(
      `INSERT INTO categorias (id, nome) VALUES (?, ?)`,
      [id, nome.trim()]
    )
    return this.findById(id)
  },

  async remove(id) {
    const [result] = await db.execute(`DELETE FROM categorias WHERE id = ?`, [id])
    return result.affectedRows > 0
  },
}

module.exports = CategoriaModel
