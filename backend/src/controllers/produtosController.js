// =============================================================
//  controllers/produtosController.js
//
//  Cada função recebe (req, res, next) e deve:
//   1. Chamar o Model/Service correspondente
//   2. Responder com JSON padronizado via helpers de resposta
//   3. Passar erros para next(error)
//
//  Quando o banco de dados for integrado, substitua as chamadas
//  de ProdutoModel pelos queries/ORM reais.
// =============================================================

const ProdutoModel = require('../models/ProdutoModel')

// GET /api/produtos
// Query opcionais: categoria, disponivel (true|false), busca
const listar = async (req, res, next) => {
  try {
    // TODO: passar filtros de req.query para o model/query
    const produtos = await ProdutoModel.findAll(req.query)
    res.json({ success: true, data: produtos })
  } catch (err) {
    next(err)
  }
}

// GET /api/produtos/:id
const buscarPorId = async (req, res, next) => {
  try {
    const produto = await ProdutoModel.findById(req.params.id)
    if (!produto) return res.status(404).json({ success: false, message: 'Produto não encontrado.' })
    res.json({ success: true, data: produto })
  } catch (err) {
    next(err)
  }
}

// POST /api/produtos
// Body: { nome, categoria, preco, disponivel, icone }
const criar = async (req, res, next) => {
  try {
    const novoProduto = await ProdutoModel.create(req.body)
    res.status(201).json({ success: true, data: novoProduto })
  } catch (err) {
    next(err)
  }
}

// PUT /api/produtos/:id
// Body: { nome, categoria, preco, disponivel, icone }
const editar = async (req, res, next) => {
  try {
    const atualizado = await ProdutoModel.update(req.params.id, req.body)
    if (!atualizado) return res.status(404).json({ success: false, message: 'Produto não encontrado.' })
    res.json({ success: true, data: atualizado })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/produtos/:id/disponibilidade
const toggleDisponibilidade = async (req, res, next) => {
  try {
    const atualizado = await ProdutoModel.toggleDisponibilidade(req.params.id)
    if (!atualizado) return res.status(404).json({ success: false, message: 'Produto não encontrado.' })
    res.json({ success: true, data: atualizado })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/produtos/:id
const remover = async (req, res, next) => {
  try {
    const removido = await ProdutoModel.remove(req.params.id)
    if (!removido) return res.status(404).json({ success: false, message: 'Produto não encontrado.' })
    res.json({ success: true, message: 'Produto removido com sucesso.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { listar, buscarPorId, criar, editar, toggleDisponibilidade, remover }
