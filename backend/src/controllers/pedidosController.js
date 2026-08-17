// =============================================================
//  controllers/pedidosController.js
//
//  Cada função recebe (req, res, next) e deve:
//   1. Chamar o Model/Service correspondente
//   2. Responder com JSON padronizado
//   3. Passar erros para next(error)
//
//  Quando o banco de dados for integrado, substitua as chamadas
//  de PedidoModel pelos queries/ORM reais.
// =============================================================

const PedidoModel = require('../models/PedidoModel')

// GET /api/pedidos
// Query opcionais: status, periodo (hoje|7d|30d), busca (nome ou número)
const listar = async (req, res, next) => {
  try {
    // TODO: passar filtros de req.query para o model/query
    const pedidos = await PedidoModel.findAll(req.query)
    res.json({ success: true, data: pedidos })
  } catch (err) {
    next(err)
  }
}

// GET /api/pedidos/ativos
// Retorna pedidos com status 'preparando' ou 'pronto', ordenados por criadoEm ASC
const listarAtivos = async (req, res, next) => {
  try {
    const ativos = await PedidoModel.findAtivos()
    res.json({ success: true, data: ativos })
  } catch (err) {
    next(err)
  }
}

// GET /api/pedidos/:id
const buscarPorId = async (req, res, next) => {
  try {
    const pedido = await PedidoModel.findById(req.params.id)
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' })
    res.json({ success: true, data: pedido })
  } catch (err) {
    next(err)
  }
}

// POST /api/pedidos
// Body: { nomeCliente, observacoes, itens: [{ produtoId, nomeProduto, quantidade, precoUnitario }] }
const criar = async (req, res, next) => {
  try {
    const novoPedido = await PedidoModel.create(req.body)
    res.status(201).json({ success: true, data: novoPedido })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/pedidos/:id/adicionar-itens
// Body: { itens: [{ produtoId, nomeProduto, quantidade, precoUnitario }] }
// Adiciona novos itens ao pedido existente e recalcula o total
const adicionarItens = async (req, res, next) => {
  try {
    const { itens } = req.body
    
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'É necessário informar pelo menos um item para adicionar' 
      })
    }

    const pedido = await PedidoModel.adicionarItens(req.params.id, itens)
    
    if (!pedido) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pedido não encontrado' 
      })
    }
    
    res.json({ 
      success: true, 
      data: pedido,
      message: `${itens.length} item(ns) adicionado(s) com sucesso` 
    })
  } catch (err) {
    if (err.message === 'Pedido não encontrado') {
      return res.status(404).json({ success: false, message: err.message })
    }
    if (err.message.includes('finalizado ou cancelado')) {
      return res.status(400).json({ success: false, message: err.message })
    }
    next(err)
  }
}

// PATCH /api/pedidos/:id/pronto
// Muda status para 'pronto' e registra prontoEm
const marcarPronto = async (req, res, next) => {
  try {
    const pedido = await PedidoModel.marcarPronto(req.params.id)
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' })
    res.json({ success: true, data: pedido })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/pedidos/:id/finalizar
// Body: { formaPagamento, valorRecebido, troco }
// Muda status para 'finalizado', registra entregueEm + pagamentoEm + dados do pagamento
// Emite NFe automaticamente em modo homologação
const finalizar = async (req, res, next) => {
  try {
    const { formaPagamento, valorRecebido, troco } = req.body
    const pedido = await PedidoModel.finalizar(req.params.id, {
      formaPagamento,
      valorRecebido,
      troco,
    })
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' })
    
    // ─── Emissão automática de NFe após finalização ───────────────────────
    // Se falhar, não bloqueia a finalização do pedido
    try {
      const NotaFiscalService = require('../services/NotaFiscalService')
      
      const nota = await NotaFiscalService.emitir(
        req.params.id,
        req.usuario?.id || 1,
        {
          cpfDestinatario: req.body.cpfCliente || null,
          ufDestinatario: 'MG',
          observacoes: req.body.observacoes || null
        }
      )
      
      console.log(`[PedidosController] NFe emitida - Pedido #${pedido.numero}, Nota #${nota.numero}`)
      
      return res.json({ 
        success: true, 
        data: pedido,
        nfe: {
          emitida: true,
          numero: nota.numero,
          status: nota.status,
          mensagem: 'Nota fiscal emitida automaticamente'
        }
      })
      
    } catch (nfeError) {
      console.error(`[PedidosController] Erro ao emitir NFe - Pedido #${pedido.numero}: ${nfeError.message}`)
      
      return res.json({ 
        success: true, 
        data: pedido,
        nfe: {
          emitida: false,
          erro: true,
          mensagem: 'Pedido finalizado com sucesso',
          detalhes: nfeError.message,
          observacao: 'A nota pode ser emitida manualmente em Contabilidade'
        }
      })
    }
    
  } catch (err) {
    next(err)
  }
}

// PATCH /api/pedidos/:id/cancelar
// Muda status para 'cancelado'
const cancelar = async (req, res, next) => {
  try {
    const pedido = await PedidoModel.cancelar(req.params.id)
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' })
    res.json({ success: true, data: pedido })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/pedidos/:id
// Remove permanentemente do histórico
const excluir = async (req, res, next) => {
  try {
    const removido = await PedidoModel.remove(req.params.id)
    if (!removido) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' })
    res.json({ success: true, message: 'Pedido excluído com sucesso.' })
  } catch (err) {
    next(err)
  }
}

module.exports = { listar, listarAtivos, buscarPorId, criar, adicionarItens, marcarPronto, finalizar, cancelar, excluir }
