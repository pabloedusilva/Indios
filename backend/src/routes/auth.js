// =============================================================
//  routes/auth.js — Rotas de autenticação
// =============================================================

const express = require('express')
const router  = express.Router()

const { login, logout, me, atualizarConfiguracoes } = require('../controllers/authController')
const { requireAuth, authRateLimiter } = require('../middlewares/authMiddleware')

// Aplicar rate limiter apenas nas rotas de login (anti brute-force)
router.post('/login',          authRateLimiter, login)
router.post('/logout',         logout)
router.get('/me',              requireAuth, me)
router.put('/configuracoes',   requireAuth, atualizarConfiguracoes)

module.exports = router
