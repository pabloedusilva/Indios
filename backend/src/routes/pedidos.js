// =============================================================
//  routes/pedidos.js
//
//  GET    /api/pedidos                   → listar todos (aceita query: status, periodo, busca)
//  GET    /api/pedidos/ativos            → listar preparando + prontos (fila ativa)
//  GET    /api/pedidos/:id               → buscar um pedido
//  POST   /api/pedidos                   → criar novo pedido
//  PATCH  /api/pedidos/:id/pronto        → marcar como pronto (cozinha finalizou)
//  PATCH  /api/pedidos/:id/finalizar     → finalizar — registra entrega + pagamento
//  PATCH  /api/pedidos/:id/cancelar      → cancelar pedido
//  DELETE /api/pedidos/:id               → excluir do histórico
// =============================================================

const router            = require('express').Router()
const pedidosController = require('../controllers/pedidosController')
const { validarPedido, validarPagamento } = require('../middlewares/validators')

router.get('/',                                         pedidosController.listar)
router.get('/ativos',                                   pedidosController.listarAtivos)
router.get('/:id',                                      pedidosController.buscarPorId)
router.post('/',            validarPedido,              pedidosController.criar)
router.patch('/:id/pronto',                             pedidosController.marcarPronto)
router.patch('/:id/finalizar', validarPagamento,        pedidosController.finalizar)
router.patch('/:id/cancelar',                           pedidosController.cancelar)
router.delete('/:id',                                   pedidosController.excluir)

module.exports = router
