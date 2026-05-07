// =============================================================
//  routes/estatisticas.js
// =============================================================

const express = require('express')
const {
  inicio,
  listarMeses,
  estatisticasMensal,
  sincronizar,
  listarSnapshots,
  listarRelatorios,
  downloadRelatorio,
} = require('../controllers/estatisticasController')

const router = express.Router()

router.get('/inicio',                    inicio)
router.get('/meses',                     listarMeses)
router.get('/mensal',                    estatisticasMensal)
router.post('/sincronizar',              sincronizar)
router.get('/snapshots',                 listarSnapshots)
router.get('/relatorios',                listarRelatorios)
router.get('/relatorio/:mes/download',   downloadRelatorio)

module.exports = router
