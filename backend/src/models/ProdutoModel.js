// =============================================================
//  models/ProdutoModel.js — Camada de acesso a dados: Produtos
//  PostgreSQL/Supabase — usa $1, $2... e categoria_id (FK)
//
//  Exclusão via soft delete (deletado_em):
//    · Produtos excluídos ficam na tabela com deletado_em preenchido
//    · Todas as queries filtram WHERE deletado_em IS NULL
//    · Isso preserva a integridade referencial com itens_pedido
// =============================================================

const db = require('../config/database')

// Converte Date do pg para ISO string
function toISO(val) {
  if (!val) return null
  if (val instanceof Date) return val.toISOString()
  return val
}

// ── Helper de mapeamento ──────────────────────────────────────

function mapProduto(row) {
  return {
    id:           row.id,
    nome:         row.nome,
    descricao:    row.descricao || null,
    categoria:    row.categoria_nome || null,
    categoriaId:  row.categoria_id   || null,
    preco:        parseFloat(row.preco),
    imagem:       row.imagem || null,
    disponivel:   Boolean(row.disponivel),
    ordem:        row.ordem ?? 0,
    criadoEm:     toISO(row.created_at),
    atualizadoEm: toISO(row.updated_at),
  }
}

// ── Model ─────────────────────────────────────────────────────

const ProdutoModel = {

  // Retorna todos os produtos ativos (não deletados)
  async findAll(filtros = {}) {
    const params = []
    const conds  = ['p.deletado_em IS NULL']

    if (filtros.categoria) {
      params.push(filtros.categoria)
      conds.push(`c.nome = $${params.length}`)
    }
    if (filtros.disponivel !== undefined) {
      params.push(filtros.disponivel === 'true' || filtros.disponivel === true)
      conds.push(`p.disponivel = $${params.length}`)
    }
    if (filtros.busca) {
      params.push(`%${filtros.busca}%`)
      conds.push(`p.nome ILIKE $${params.length}`)
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''

    const [rows] = await db.execute(
      `SELECT p.*, c.nome AS categoria_nome
         FROM produtos p
         LEFT JOIN categorias c ON c.id = p.categoria_id
         ${where}
         ORDER BY c.nome ASC, p.nome ASC`,
      params
    )
    return rows.map(mapProduto)
  },

  // Busca produto ativo por ID
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT p.*, c.nome AS categoria_nome
         FROM produtos p
         LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE p.id = $1 AND p.deletado_em IS NULL`,
      [id]
    )
    return rows.length ? mapProduto(rows[0]) : null
  },

  // Cria novo produto
  async create(dados) {
    const [rows] = await db.execute(
      `INSERT INTO produtos (nome, descricao, preco, categoria_id, imagem, disponivel, ordem)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        dados.nome,
        dados.descricao || null,
        dados.preco,
        dados.categoriaId || dados.categoria_id || null,
        dados.imagem || null,
        dados.disponivel !== false,
        dados.ordem ?? 0,
      ]
    )
    return this.findById(rows[0].id)
  },

  // Atualiza campos do produto
  async update(id, dados) {
    const campos = []
    const params = []

    if (dados.nome        !== undefined) { params.push(dados.nome);        campos.push(`nome = $${params.length}`) }
    if (dados.descricao   !== undefined) { params.push(dados.descricao);   campos.push(`descricao = $${params.length}`) }
    if (dados.categoriaId !== undefined) { params.push(dados.categoriaId); campos.push(`categoria_id = $${params.length}`) }
    if (dados.categoria_id!== undefined) { params.push(dados.categoria_id);campos.push(`categoria_id = $${params.length}`) }
    if (dados.preco       !== undefined) { params.push(dados.preco);       campos.push(`preco = $${params.length}`) }
    if (dados.imagem      !== undefined) { params.push(dados.imagem);      campos.push(`imagem = $${params.length}`) }
    if (dados.disponivel  !== undefined) { params.push(Boolean(dados.disponivel)); campos.push(`disponivel = $${params.length}`) }
    if (dados.ordem       !== undefined) { params.push(dados.ordem);       campos.push(`ordem = $${params.length}`) }

    if (campos.length === 0) return this.findById(id)

    params.push(id)
    const [rows] = await db.execute(
      `UPDATE produtos SET ${campos.join(', ')} WHERE id = $${params.length} AND deletado_em IS NULL RETURNING id`,
      params
    )
    if (!rows.length) return null
    return this.findById(id)
  },

  // Alterna disponibilidade do produto
  async toggleDisponibilidade(id) {
    const [rows] = await db.execute(
      `UPDATE produtos SET disponivel = NOT disponivel WHERE id = $1 AND deletado_em IS NULL RETURNING id`,
      [id]
    )
    if (!rows.length) return null
    return this.findById(id)
  },

  // Soft delete — marca deletado_em sem remover o registro
  async remove(id) {
    const [rows] = await db.execute(
      `UPDATE produtos SET deletado_em = NOW() WHERE id = $1 AND deletado_em IS NULL RETURNING id`,
      [id]
    )
    return rows.length > 0
  },
}

module.exports = ProdutoModel
