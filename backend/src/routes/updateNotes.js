// =============================================================
//  routes/updateNotes.js
//
//  GET  /api/update-notes/latest         — nota mais recente (minor/major)
//  GET  /api/update-notes/version/:versao — nota de versão específica
//  GET  /api/update-notes                — histórico de notas ativas
//  POST /api/update-notes                — cria/atualiza nota (admin)
// =============================================================

const router = require('express').Router()
const ctrl   = require('../controllers/updateNotesController')

router.get('/latest',          ctrl.getLatest)
router.get('/version/:versao', ctrl.getByVersion)
router.get('/',                ctrl.listar)
router.post('/',               ctrl.upsert)

module.exports = router
