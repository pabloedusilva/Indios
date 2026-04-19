// =============================================================
//  routes/dashboard.js
//
//  GET  /api/dashboard/resumo    → estatísticas do dia:
//                                    totalPedidosHoje, faturamentoHoje,
//                                    preparando, prontos, finalizados, cancelados
// =============================================================

const router               = require('express').Router()
const dashboardController  = require('../controllers/dashboardController')

router.get('/resumo', dashboardController.resumo)

module.exports = router
