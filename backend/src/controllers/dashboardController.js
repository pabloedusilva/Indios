// =============================================================
//  controllers/dashboardController.js
//
//  GET /api/dashboard/resumo
//
//  Lê a VIEW resumo_dashboard (tempo real) + produtos ativos.
//  A VIEW calcula os contadores do dia atual em BRT a cada query,
//  sem cache, sem cron, sem fire-and-forget.
// =============================================================

const db          = require('../config/database')
const PedidoModel = require('../models/PedidoModel')

const resumo = async (req, res, next) => {
  try {
    const [dadosPedidos, [produtos]] = await Promise.all([
      PedidoModel.resumoDia(),
      db.execute(
        `SELECT p.id, p.nome, c.nome AS categoria, p.preco, p.disponivel
           FROM produtos p
           LEFT JOIN categorias c ON c.id = p.categoria_id
          WHERE p.deletado_em IS NULL
          ORDER BY c.nome ASC, p.nome ASC`
      ),
    ])

    const produtosMapeados = produtos.map((p) => ({
      id:         p.id,
      nome:       p.nome,
      categoria:  p.categoria,
      preco:      parseFloat(p.preco),
      disponivel: Boolean(p.disponivel),
    }))

    res.json({ success: true, data: { ...dadosPedidos, produtos: produtosMapeados } })
  } catch (err) {
    next(err)
  }
}

module.exports = { resumo }
