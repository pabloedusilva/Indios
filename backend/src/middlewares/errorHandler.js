// =============================================================
//  middlewares/errorHandler.js
//
//  Middleware global de tratamento de erros.
//  Captura qualquer erro passado via next(err) e responde
//  com JSON padronizado, nunca expondo stack em produção.
// =============================================================

const errorHandler = (err, req, res, _next) => {
  const status = err.status ?? err.statusCode ?? 500
  const isProd = process.env.NODE_ENV === 'production'

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`)

  res.status(status).json({
    success: false,
    message: status === 500 && isProd
      ? 'Erro interno do servidor.'
      : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  })
}

module.exports = errorHandler
