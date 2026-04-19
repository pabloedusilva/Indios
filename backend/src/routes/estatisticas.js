// =============================================================
//  routes/estatisticas.js
// =============================================================

const express = require('express')
const {
  listarMeses,
  estatisticasMensal,
  inicio,
  sincronizar,
  listarSnapshots,
  listarRelatorios,
  downloadRelatorio,
} = require('../controllers/estatisticasController')

const router = express.Router()

router.get('/inicio',             inicio)
router.get('/meses',              listarMeses)
router.get('/mensal',             estatisticasMensal)
router.post('/sincronizar',       sincronizar)
router.get('/snapshots',          listarSnapshots)
router.get('/relatorios',         listarRelatorios)
router.get('/relatorio/:arquivo', downloadRelatorio)

module.exports = router
