// =============================================================
//  routes/cardapio.js — Rota PÚBLICA do cardápio
//
//  GET /api/cardapio
//    · Sem autenticação — acessível por qualquer pessoa
//    · Retorna apenas produtos disponíveis (disponivel = true)
//    · Rate limiting próprio para evitar abuso
//    · Não expõe dados sensíveis (sem IDs internos de usuário,
//      sem informações de pedidos, sem dados financeiros)
// =============================================================

const router     = require('express').Router()
const rateLimit  = require('express-rate-limit')
const ProdutoModel = require('../models/ProdutoModel')

// ── Rate limiter: 120 req / minuto por IP ─────────────────────
const cardapioLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em instantes.',
  },
})

// GET /api/cardapio
router.get('/', cardapioLimiter, async (req, res, next) => {
  try {
    // Busca apenas produtos disponíveis — filtro aplicado no model
    const todos = await ProdutoModel.findAll({ disponivel: 'true' })

    // Expõe somente os campos necessários para o cardápio público
    const cardapio = todos.map(({ id, nome, categoria, preco }) => ({
      id,
      nome,
      categoria,
      preco,
    }))

    res.json({ success: true, data: cardapio })
  } catch (err) {
    next(err)
  }
})

module.exports = router
