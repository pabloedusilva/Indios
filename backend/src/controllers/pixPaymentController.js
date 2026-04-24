// =============================================================
//  controllers/pixPaymentController.js — Controller de Pagamentos PIX
//
//  Responsabilidades:
//    · Criar pagamentos PIX para usuários autenticados
//    · Processar webhooks do Mercado Pago com validação
//    · Consultar status de pagamentos
//    · Validar entrada e tratar erros
// =============================================================

const PagamentoModel = require('../models/PagamentoModel')
const PixPaymentService = require('../services/PixPaymentService')

// ── Helpers de validação ──────────────────────────────────────

function validarUsuarioAutenticado(req) {
  if (!req.usuario?.id) {
    throw new Error('Usuário não autenticado')
  }
  return req.usuario.id
}

function mesAtual() {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 7)
}

// ── Controller ─────────────────────────────────────────────────

const pixPaymentController = {
  async criarPagamentoPix(req, res) {
    const startTime = Date.now()
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`
    
    try {
      console.log(`[PixController:${requestId}] Iniciando criação de pagamento PIX`)
      
      const usuarioId = validarUsuarioAutenticado(req)
      const mesReferencia = mesAtual()
      
      console.log(`[PixController:${requestId}] Usuário: ${usuarioId}, Mês: ${mesReferencia}`)
      
      const mesPago = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)
      
      if (mesPago) {
        console.log(`[PixController:${requestId}] Mês já está pago`)
        return res.status(200).json({
          success: true,
          status: 'already_paid',
          message: 'Mês já está pago',
          data: {
            mesPago: true,
            mesReferencia
          }
        })
      }
      
      console.log(`[PixController:${requestId}] Criando pagamento PIX na API`)
      const pixData = await PixPaymentService.criarPagamentoPix(usuarioId)
      
      console.log(`[PixController:${requestId}] Salvando pagamento no banco`)
      const pagamento = await PagamentoModel.criarPagamento({
        usuarioId,
        valor: pixData.valor,
        mesReferencia,
        mercadoPagoId: pixData.id,
        qrCode: pixData.qrCode,
        qrCodeBase64: pixData.qrCodeBase64
      })
      
      const duration = Date.now() - startTime
      
      console.log(`[PixController:${requestId}] Pagamento PIX criado em ${duration}ms`)
      console.log(`[PixController:${requestId}] ID: ${pagamento.mercadoPagoId}, Reutilizado: ${pagamento.reutilizado}`)
      
      res.status(201).json({
        success: true,
        message: pagamento.reutilizado ? 'Pagamento PIX reutilizado' : 'Pagamento PIX criado com sucesso',
        data: {
          id: pagamento.mercadoPagoId,
          qrCode: pagamento.qrCode,
          qrCodeBase64: pagamento.qrCodeBase64,
          valor: pixData.valor,
          mesReferencia,
          expiresAt: pixData.expiresAt,
          status: pagamento.status,
          reutilizado: pagamento.reutilizado
        }
      })
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error(`[PixController:${requestId}] Erro após ${duration}ms:`, error.message)
      
      if (error.message.includes('Já existe um pagamento aprovado')) {
        return res.status(409).json({
          success: false,
          error: 'PAYMENT_ALREADY_EXISTS',
          message: 'Já existe um pagamento aprovado para este mês'
        })
      }
      
      if (error.message.includes('Credenciais')) {
        return res.status(500).json({
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'Erro de configuração do sistema de pagamentos'
        })
      }
      
      if (error.message.includes('Limite de requisições')) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT',
          message: 'Muitas tentativas. Tente novamente em alguns minutos'
        })
      }
      
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      })
    }
  },

  async consultarStatus(req, res) {
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`
    
    try {
      console.log(`[PixController:${requestId}] Consultando status do pagamento`)
      
      const usuarioId = validarUsuarioAutenticado(req)
      const mesReferencia = mesAtual()
      
      const mesPago = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)
      
      console.log(`[PixController:${requestId}] Status: ${mesPago ? 'PAGO' : 'PENDENTE'}`)
      
      res.status(200).json({
        success: true,
        data: {
          mesPago,
          mesReferencia,
          valor: PixPaymentService.valorMensalidade
        }
      })
      
    } catch (error) {
      console.error(`[PixController:${requestId}] Erro:`, error.message)
      
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Erro ao consultar status do pagamento'
      })
    }
  },

  async processarWebhook(req, res) {
    const startTime = Date.now()
    const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`
    
    try {
      console.log(`[PixController:${requestId}] Webhook recebido`)
      console.log(`[PixController:${requestId}] Headers:`, {
        'x-signature': req.headers['x-signature'] ? 'presente' : 'ausente',
        'x-request-id': req.headers['x-request-id'] ? 'presente' : 'ausente',
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      })
      
      const { type, data } = req.body
      const dataId = req.query['data.id'] || data?.id
      
      console.log(`[PixController:${requestId}] Tipo: ${type}, Data ID: ${dataId}`)
      
      if (type !== 'payment') {
        console.log(`[PixController:${requestId}] Tipo de notificação ignorado: ${type}`)
        return res.status(200).json({ received: true, message: 'Tipo de notificação ignorado' })
      }
      
      if (!dataId) {
        console.error(`[PixController:${requestId}] Data ID ausente`)
        return res.status(400).json({
          success: false,
          error: 'MISSING_DATA_ID',
          message: 'ID do pagamento ausente na notificação'
        })
      }
      
      const xSignature = req.headers['x-signature']
      const xRequestId = req.headers['x-request-id']
      
      const assinaturaValida = PixPaymentService.verificarAssinaturaWebhook(
        xSignature,
        xRequestId,
        dataId
      )
      
      if (!assinaturaValida) {
        console.error(`[PixController:${requestId}] Assinatura inválida`)
        return res.status(401).json({
          success: false,
          error: 'INVALID_SIGNATURE',
          message: 'Assinatura inválida'
        })
      }
      
      console.log(`[PixController:${requestId}] Assinatura válida`)
      
      const pagamento = await PagamentoModel.buscarPorMercadoPagoId(dataId)
      
      if (!pagamento) {
        console.error(`[PixController:${requestId}] Pagamento não encontrado: ${dataId}`)
        return res.status(404).json({
          success: false,
          error: 'PAYMENT_NOT_FOUND',
          message: 'Pagamento não encontrado'
        })
      }
      
      console.log(`[PixController:${requestId}] Pagamento encontrado - Status atual: ${pagamento.status}`)
      
      console.log(`[PixController:${requestId}] Consultando status na API do Mercado Pago`)
      const paymentData = await PixPaymentService.consultarPagamento(dataId)
      
      console.log(`[PixController:${requestId}] Status na API: ${paymentData.status}`)
      
      if (paymentData.status !== pagamento.status) {
        console.log(`[PixController:${requestId}] Atualizando status: ${pagamento.status} → ${paymentData.status}`)
        
        const atualizado = await PagamentoModel.atualizarStatus(
          dataId,
          paymentData.status,
          {
            webhook_received_at: new Date().toISOString(),
            mercado_pago_data: {
              status: paymentData.status,
              status_detail: paymentData.status_detail,
              transaction_amount: paymentData.transaction_amount,
              date_approved: paymentData.date_approved,
              date_last_updated: paymentData.date_last_updated
            }
          }
        )
        
        if (atualizado) {
          console.log(`[PixController:${requestId}] Status atualizado com sucesso`)
          
          if (paymentData.status === 'approved') {
            console.log(`[PixController:${requestId}] Pagamento aprovado. Usuário: ${pagamento.usuario_id}`)
          }
        } else {
          console.error(`[PixController:${requestId}] Falha ao atualizar status`)
        }
      } else {
        console.log(`[PixController:${requestId}] Status já está atualizado`)
      }
      
      const duration = Date.now() - startTime
      
      console.log(`[PixController:${requestId}] Webhook processado em ${duration}ms`)
      
      res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
        data: {
          paymentId: dataId,
          status: paymentData.status,
          processed: true
        }
      })
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error(`[PixController:${requestId}] Erro após ${duration}ms:`, error.message)
      
      res.status(200).json({
        success: false,
        error: 'WEBHOOK_ERROR',
        message: 'Erro interno no processamento do webhook'
      })
    }
  },

  async healthCheck(req, res) {
    console.log('[PixController] Health check do webhook acessado')
    
    res.status(200).json({
      status: 'ok',
      service: 'PIX Payment Webhook',
      endpoint: '/api/pagamentos/webhook',
      timestamp: new Date().toISOString(),
      environment: PixPaymentService.detectEnvironment().environment
    })
  }
}

module.exports = pixPaymentController