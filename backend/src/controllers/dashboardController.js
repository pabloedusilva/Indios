// =============================================================
//  controllers/dashboardController.js
//
//  Consolida estatísticas em tempo real para o Dashboard.
//  Todas as métricas são filtradas pelo dia atual.
// =============================================================

const db = require('../config/database')
const PedidoModel = require('../models/PedidoModel')

// GET /api/dashboard/resumo
const resumo = async (req, res, next) => {
  try {
    const [dadosPedidos, [produtos]] = await Promise.all([
      PedidoModel.resumoDia(),
      db.execute(
        `SELECT id, nome, categoria, preco, disponivel FROM produtos ORDER BY categoria, nome`
      ),
    ])

    const produtosMapeados = produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: p.categoria,
      preco: parseFloat(p.preco),
      disponivel: Boolean(p.disponivel),
    }))

    res.json({ success: true, data: { ...dadosPedidos, produtos: produtosMapeados } })
  } catch (err) {
    next(err)
  }
}

module.exports = { resumo }
