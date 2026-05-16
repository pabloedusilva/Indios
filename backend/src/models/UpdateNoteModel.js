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
    const [rows] = await db.execute(
      `SELECT * FROM update_notes WHERE ativo = 1 ORDER BY criado_em DESC`
    )
    return rows.map(mapNote)
  },

  // Retorna a nota mais recente do tipo minor ou major.
  // O frontend usa localStorage para controlar se já foi vista.
  async findLatestRelease() {
    const [rows] = await db.execute(
      `SELECT n.*
         FROM update_notes n
        WHERE n.ativo = 1
          AND n.tipo IN ('minor', 'major')
        ORDER BY n.criado_em DESC
        LIMIT 1`
    )
    return rows.length ? mapNote(rows[0]) : null
  },

  // Retorna uma nota pela versão exata
  async findByVersao(versao) {
    const [rows] = await db.execute(
      `SELECT * FROM update_notes WHERE versao = ? LIMIT 1`,
      [versao]
    )
    return rows.length ? mapNote(rows[0]) : null
  },

  // Retorna uma nota pelo id
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT * FROM update_notes WHERE id = ? LIMIT 1`,
      [id]
    )
    return rows.length ? mapNote(rows[0]) : null
  },

  // Cria ou atualiza uma nota (upsert por versão)
  async upsert({ versao, tipo, titulo, descricao, melhorias = [], correcoes = [], imagem, ativo = 1 }) {
    const imagemFinal = imagem || '/update/new-update.png'
    await db.execute(
      `INSERT INTO update_notes (versao, tipo, titulo, descricao, melhorias, correcoes, imagem, ativo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         tipo      = VALUES(tipo),
         titulo    = VALUES(titulo),
         descricao = VALUES(descricao),
         melhorias = VALUES(melhorias),
         correcoes = VALUES(correcoes),
         imagem    = VALUES(imagem),
         ativo     = VALUES(ativo)`,
      [
        versao,
        tipo,
        titulo,
        descricao,
        JSON.stringify(melhorias),
        JSON.stringify(correcoes),
        imagemFinal,
        ativo ? 1 : 0,
      ]
    )
    return this.findByVersao(versao)
  },
}

module.exports = UpdateNoteModel
