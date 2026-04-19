// =============================================================
//  controllers/categoriasController.js
// =============================================================

const CategoriaModel = require('../models/CategoriaModel')

// GET /api/categorias
const listar = async (req, res, next) => {
  try {
    const categorias = await CategoriaModel.findAll()
    res.json({ success: true, data: categorias })
  } catch (err) {
    next(err)
  }
}

// POST /api/categorias
// Body: { nome }
const criar = async (req, res, next) => {
  try {
    const { nome } = req.body
    if (!nome || !nome.trim()) {
      return res.status(422).json({ success: false, message: 'Nome da categoria é obrigatório.' })
    }
    const existente = await CategoriaModel.findByNome(nome.trim())
    if (existente) {
      return res.status(409).json({ success: false, message: 'Já existe uma categoria com esse nome.' })
    }
    const nova = await CategoriaModel.create(nome.trim())
    res.status(201).json({ success: true, data: nova })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/categorias/:id
const remover = async (req, res, next) => {
  try {
    const removida = await CategoriaModel.remove(req.params.id)
    if (!removida) {
      return res.status(404).json({ success: false, message: 'Categoria não encontrada.' })
    }
    res.json({ success: true, message: 'Categoria removida com sucesso.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { listar, criar, remover }
