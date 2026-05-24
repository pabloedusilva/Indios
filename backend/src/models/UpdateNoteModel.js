// =============================================================
//  models/UpdateNoteModel.js — Acesso a dados: Update Notes
// =============================================================

const db = require('../config/database')

// Converte linha do banco para objeto camelCase
function mapNote(row) {
  return {
    id:          row.id,
    versao:      row.versao,
    tipo:        row.tipo,
    titulo:      row.titulo,
    descricao:   row.descricao,
    melhorias:   typeof row.melhorias === 'string' ? JSON.parse(row.melhorias) : (row.melhorias ?? []),
    correcoes:   typeof row.correcoes === 'string' ? JSON.parse(row.correcoes) : (row.correcoes ?? []),
    imagem:      row.imagem,
    ativo:       Boolean(row.ativo),
    criadoEm:    row.criado_em,
    atualizadoEm: row.atualizado_em,
  }
}

const UpdateNoteModel = {
  // Retorna todas as notas ativas, ordenadas por versão decrescente
  async findAll() {
    const result = await db.query(
      `SELECT * FROM update_notes WHERE ativo = true ORDER BY criado_em DESC`
    )
    return result.rows.map(mapNote)
  },

  // Retorna a nota mais recente do tipo minor ou major.
  // O frontend usa localStorage para controlar se já foi vista.
  async findLatestRelease() {
    const result = await db.query(
      `SELECT n.*
         FROM update_notes n
        WHERE n.ativo = true
          AND n.tipo IN ('minor', 'major')
        ORDER BY n.criado_em DESC
        LIMIT 1`
    )
    return result.rows.length ? mapNote(result.rows[0]) : null
  },

  // Retorna uma nota pela versão exata
  async findByVersao(versao) {
    const result = await db.query(
      `SELECT * FROM update_notes WHERE versao = $1 LIMIT 1`,
      [versao]
    )
    return result.rows.length ? mapNote(result.rows[0]) : null
  },

  // Retorna uma nota pelo id
  async findById(id) {
    const result = await db.query(
      `SELECT * FROM update_notes WHERE id = $1 LIMIT 1`,
      [id]
    )
    return result.rows.length ? mapNote(result.rows[0]) : null
  },

  // Cria ou atualiza uma nota (upsert por versão)
  async upsert({ versao, tipo, titulo, descricao, melhorias = [], correcoes = [], imagem, ativo = true }) {
    const imagemFinal = imagem || '/update/new-update.png'
    await db.query(
      `INSERT INTO update_notes (versao, tipo, titulo, descricao, melhorias, correcoes, imagem, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (versao) DO UPDATE SET
         tipo      = EXCLUDED.tipo,
         titulo    = EXCLUDED.titulo,
         descricao = EXCLUDED.descricao,
         melhorias = EXCLUDED.melhorias,
         correcoes = EXCLUDED.correcoes,
         imagem    = EXCLUDED.imagem,
         ativo     = EXCLUDED.ativo,
         atualizado_em = CURRENT_TIMESTAMP`,
      [
        versao,
        tipo,
        titulo,
        descricao,
        JSON.stringify(melhorias),
        JSON.stringify(correcoes),
        imagemFinal,
        ativo,
      ]
    )
    return this.findByVersao(versao)
  },
}

module.exports = UpdateNoteModel
