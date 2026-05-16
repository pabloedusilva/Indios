// =============================================================
//  controllers/updateNotesController.js
//
//  GET  /api/update-notes/latest   — nota mais recente (minor/major)
//  GET  /api/update-notes          — todas as notas ativas (histórico)
//  POST /api/update-notes          — cria/atualiza uma nota (admin)
//
//  A visualização agora é gerenciada apenas no localStorage do frontend.
// =============================================================

const UpdateNoteModel = require('../models/UpdateNoteModel')

// GET /api/update-notes/latest
// Retorna a nota minor/major mais recente.
// O frontend usa localStorage para controlar se já foi vista.
const getLatest = async (req, res, next) => {
  try {
    const nota = await UpdateNoteModel.findLatestRelease()
    res.json({ success: true, data: nota })
  } catch (err) {
    next(err)
  }
}

// GET /api/update-notes
// Histórico completo de notas ativas
const listar = async (req, res, next) => {
  try {
    const notas = await UpdateNoteModel.findAll()
    res.json({ success: true, data: notas })
  } catch (err) {
    next(err)
  }
}

// POST /api/update-notes
// Cria ou atualiza uma nota de release (upsert por versão).
// Body: { versao, tipo, titulo, descricao, melhorias, correcoes, imagem, ativo }
const upsert = async (req, res, next) => {
  try {
    const { versao, tipo, titulo, descricao, melhorias, correcoes, imagem, ativo } = req.body

    if (!versao || !tipo || !titulo || !descricao) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: versao, tipo, titulo, descricao.',
      })
    }

    if (!['major', 'minor', 'patch'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        message: 'tipo deve ser: major, minor ou patch.',
      })
    }

    const nota = await UpdateNoteModel.upsert({
      versao,
      tipo,
      titulo,
      descricao,
      melhorias: melhorias ?? [],
      correcoes: correcoes ?? [],
      imagem,
      ativo: ativo !== undefined ? ativo : 1,
    })

    res.status(201).json({ success: true, data: nota })
  } catch (err) {
    next(err)
  }
}

module.exports = { getLatest, listar, upsert }
