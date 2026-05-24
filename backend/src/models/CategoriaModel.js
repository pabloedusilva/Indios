// =============================================================
//  models/CategoriaModel.js — Camada de acesso a dados: Categorias
//  PostgreSQL/Supabase — usa $1, $2... e id SERIAL
// =============================================================

const db = require('../config/database')

function mapCategoria(row) {
  return {
    id:        row.id,
    nome:      row.nome,
    ordem:     row.ordem,
    ativo:     Boolean(row.ativo),
    criadoEm:  row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

const CategoriaModel = {
  async findAll() {
    const [rows] = await db.execute(
      `SELECT * FROM categorias ORDER BY ordem ASC, nome ASC`
    )
    return rows.map(mapCategoria)
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT * FROM categorias WHERE id = $1`,
      [id]
    )
    return rows.length ? mapCategoria(rows[0]) : null
  },

  async findByNome(nome) {
    const [rows] = await db.execute(
      `SELECT * FROM categorias WHERE LOWER(nome) = LOWER($1)`,
      [nome]
    )
    return rows.length ? mapCategoria(rows[0]) : null
  },

  async create(nome) {
    const [rows] = await db.execute(
      `INSERT INTO categorias (nome) VALUES ($1) RETURNING *`,
      [nome.trim()]
    )
    return mapCategoria(rows[0])
  },

  async remove(id) {
    const [rows] = await db.execute(
      `DELETE FROM categorias WHERE id = $1 RETURNING id`,
      [id]
    )
    return rows.length > 0
  },
}

module.exports = CategoriaModel
