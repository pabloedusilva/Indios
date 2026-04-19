// =============================================================
//  middlewares/notFound.js
//
//  Captura qualquer rota não definida e retorna 404 JSON.
// =============================================================

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  })
}

module.exports = notFound
