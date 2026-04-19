// =============================================================
//  routes/produtos.js
//
//  GET    /api/produtos                  → listar todos
//  GET    /api/produtos/:id              → buscar um
//  POST   /api/produtos                  → criar
//  PUT    /api/produtos/:id              → editar completo
//  PATCH  /api/produtos/:id/disponibilidade → ativar/desativar
//  DELETE /api/produtos/:id              → remover
// =============================================================

const router             = require('express').Router()
const produtosController = require('../controllers/produtosController')
const { validarProduto } = require('../middlewares/validators')

router.get('/',                             produtosController.listar)
router.get('/:id',                          produtosController.buscarPorId)
router.post('/',         validarProduto,    produtosController.criar)
router.put('/:id',       validarProduto,    produtosController.editar)
router.patch('/:id/disponibilidade',        produtosController.toggleDisponibilidade)
router.delete('/:id',                       produtosController.remover)

module.exports = router
