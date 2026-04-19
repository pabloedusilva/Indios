// =============================================================
//  routes/categorias.js
//
//  GET    /api/categorias      → listar todas
//  POST   /api/categorias      → criar nova
//  DELETE /api/categorias/:id  → remover
// =============================================================

const router               = require('express').Router()
const categoriasController = require('../controllers/categoriasController')

router.get('/',      categoriasController.listar)
router.post('/',     categoriasController.criar)
router.delete('/:id', categoriasController.remover)

module.exports = router
