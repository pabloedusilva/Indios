// =============================================================
//  middlewares/authMiddleware.js — Verificação de JWT via cookie
//
//  Lê o token do cookie httpOnly "auth_token", valida a assinatura
//  e anexa o usuário ao req. Retorna 401 se inválido ou ausente.
// =============================================================

const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')

const JWT_SECRET = process.env.JWT_SECRET

// Garante que o segredo está configurado antes de iniciar
if (!JWT_SECRET) {
  console.error('[Auth] FATAL: JWT_SECRET não definido nas variáveis de ambiente.')
  process.exit(1)
}

// ── Rate limiter para rotas de autenticação ───────────────────
//  Máximo de 10 tentativas por IP em uma janela de 15 minutos
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
  // Não revelar informações sobre o limite no header
  skipSuccessfulRequests: true,
})

// ── Middleware de autenticação obrigatória ────────────────────
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Não autenticado. Faça login para continuar.',
    })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    })
    req.usuario = { id: payload.sub, usuario: payload.usuario }
    next()
  } catch (err) {
    // Token expirado ou inválido — limpa o cookie corrompido
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })
    return res.status(401).json({
      success: false,
      message: 'Sessão expirada ou inválida. Faça login novamente.',
    })
  }
}

module.exports = { requireAuth, authRateLimiter }
