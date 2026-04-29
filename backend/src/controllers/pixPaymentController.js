// =============================================================
//  controllers/pixPaymentController.js — Controller PIX
//
//  POST /api/pagamentos/pix          → cria pagamento (autenticado)
//  GET  /api/pagamentos/status       → status do mês (autenticado)
//  POST /api/pagamentos/webhook      → notificação Mercado Pago (HMAC)
//  GET  /api/pagamentos/webhook/health → health check (público)
//
//  Fluxo de criação de PIX:
//    1. Mês já pago?          → retorna already_paid
//    2. Tem pending válido?   → reutiliza (sem chamar API)
//    3. Tem expired/failed?   → cria novo (forcarNovo=true)
//    4. Sem registro?         → cria novo (forcarNovo=false)
// =============================================================

const PagamentoModel    = require('../models/PagamentoModel')
const PixPaymentService = require('../services/PixPaymentService')

// ── Helpers ───────────────────────────────────────────────────

function getUsuarioId(req) {
  if (!req.usuario?.id) throw new Error('Usuário não autenticado')
  return req.usuario.id
}

function mesAtual() {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.toISOString().slice(0, 7)
}

// ── Controller ────────────────────────────────────────────────

const pixPaymentController = {

  // POST /api/pagamentos/pix
  async criarPagamentoPix(req, res) {
    try {
      const usuarioId     = getUsuarioId(req)
      const mesReferencia = mesAtual()

      // ── 1. Mês já pago? ──────────────────────────────────────
      const mesPago = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)
      if (mesPago) {
        return res.status(200).json({
          success: true,
          status:  'already_paid',
          message: 'Mês já está pago',
          data:    { mesPago: true, mesReferencia },
        })
      }

      // ── 2. Verificar último registro no banco ─────────────────
      const ultimo = await PagamentoModel.buscarUltimoPorUsuarioMes(usuarioId, mesReferencia)

      if (ultimo) {
        const agora     = new Date()
        const expiresAt = ultimo.expires_at ? new Date(ultimo.expires_at) : null
        const valido    = expiresAt && expiresAt > agora

        // Reutilizar PIX pendente ainda válido (não expirou as 24h)
        if (ultimo.status === 'pending' && valido) {
          return res.status(200).json({
            success: true,
            message: 'PIX reutilizado',
            data: {
              id:           ultimo.mercado_pago_id,
              qrCode:       ultimo.qr_code,
              qrCodeBase64: ultimo.qr_code_base64,
              valor:        parseFloat(ultimo.valor),
              mesReferencia,
              expiresAt:    expiresAt.toISOString(),
              status:       'pending',
            },
          })
        }

        // Qualquer outro status (expired, failed, pending expirado) → criar novo
      }

      // ── 3. Criar novo PIX na API do Mercado Pago ──────────────
      // forcarNovo=true quando já existe registro anterior (evita reutilizar
      // pagamento expirado via idempotencyKey determinística)
      const forcarNovo = !!ultimo
      const pixData    = await PixPaymentService.criarPagamentoPix(usuarioId, forcarNovo)

      // ── 4. Persistir no banco ─────────────────────────────────
      const pagamento = await PagamentoModel.criarPagamento({
        usuarioId,
        valor:         pixData.valor,
        mesReferencia,
        mercadoPagoId: pixData.id,
        qrCode:        pixData.qrCode,
        qrCodeBase64:  pixData.qrCodeBase64,
      })

      return res.status(201).json({
        success: true,
        message: 'PIX criado com sucesso',
        data: {
          id:           pagamento.mercadoPagoId,
          qrCode:       pagamento.qrCode,
          qrCodeBase64: pagamento.qrCodeBase64,
          valor:        pixData.valor,
          mesReferencia,
          expiresAt:    pagamento.expiresAt,
          status:       'pending',
        },
      })

    } catch (err) {
      if (err.message.includes('Já existe um pagamento aprovado'))
        return res.status(409).json({ success: false, error: 'PAYMENT_ALREADY_EXISTS', message: err.message })

      if (err.message.includes('Credenciais') || err.message.includes('configuração') || err.message.includes('inválidas'))
        return res.status(500).json({ success: false, error: 'CONFIGURATION_ERROR', message: 'Erro de configuração do sistema de pagamentos.' })

      if (err.message.includes('Limite de requisições'))
        return res.status(429).json({ success: false, error: 'RATE_LIMIT', message: 'Muitas tentativas. Tente novamente em alguns minutos.' })

      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message || 'Erro interno do servidor' })
    }
  },

  // GET /api/pagamentos/historico
  async listarHistorico(req, res) {
    try {
      const usuarioId  = getUsuarioId(req)
      const pagamentos = await PagamentoModel.listarAprovadosPorUsuario(usuarioId)

      const data = pagamentos.map((p) => {
        const dados = typeof p.dados_mercado_pago === 'string'
          ? JSON.parse(p.dados_mercado_pago || '{}')
          : (p.dados_mercado_pago || {})

        return {
          id:            p.id,
          mercadoPagoId: p.mercado_pago_id,
          valor:         parseFloat(p.valor),
          mesReferencia: p.mes_referencia,
          dataPagamento: dados.date_approved || p.updated_at,
          criadoEm:      p.created_at,
        }
      })

      return res.status(200).json({ success: true, data })
    } catch (err) {
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Erro ao listar histórico de pagamentos' })
    }
  },

  // GET /api/pagamentos/comprovante/:id
  async gerarComprovante(req, res) {
    try {
      const usuarioId  = getUsuarioId(req)
      const id         = parseInt(req.params.id, 10)

      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID inválido' })
      }

      const pagamento = await PagamentoModel.buscarAprovadoPorId(id, usuarioId)
      if (!pagamento) {
        return res.status(404).json({ success: false, message: 'Pagamento não encontrado' })
      }

      const dados = typeof pagamento.dados_mercado_pago === 'string'
        ? JSON.parse(pagamento.dados_mercado_pago || '{}')
        : (pagamento.dados_mercado_pago || {})

      const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
      const [anoStr, mesStr] = pagamento.mes_referencia.split('-')
      const nomeMes = MESES[parseInt(mesStr, 10) - 1] || mesStr

      const dataPagamento = dados.date_approved
        ? new Date(dados.date_approved)
        : new Date(pagamento.updated_at)

      const dataFmt = dataPagamento.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      })
      const horaFmt = dataPagamento.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })

      const valor = parseFloat(pagamento.valor)
      const valorFmt = 'R$ ' + valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')

      // ── Gerar PDF em memória ──────────────────────────────
      const PDFDocument = require('pdfkit')
      const path        = require('path')
      const fs          = require('fs')

      const doc = new PDFDocument({
        size:    [400, 560],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        info: {
          Title:   `Comprovante de pagamento - ${nomeMes}`,
          Author:  'Índios Churrasco Gourmet',
          Subject: 'Comprovante de Pagamento',
        },
      })

      const chunks = []
      doc.on('data', (chunk) => chunks.push(chunk))

      await new Promise((resolve, reject) => {
        doc.on('end', resolve)
        doc.on('error', reject)

        const W      = 400
        const RED    = '#C93517'
        const ORANGE = '#E8650A'
        const DARK   = '#1C1410'
        const GRAY   = '#6B5E50'
        const LIGHT  = '#A8998A'
        const GREEN  = '#16a34a'
        const BG     = '#FAFAF9'
        const BORDER = '#E5E0D8'
        const WHITE  = '#FFFFFF'

        // ── Fundo geral ───────────────────────────────────────
        doc.rect(0, 0, W, 580).fill(BG)

        // ── Cabeçalho: faixa única com gradiente simulado ─────
        // Simula gradiente com 40 faixas horizontais de RED → ORANGE
        const HEADER_H = 120
        for (let i = 0; i < HEADER_H; i++) {
          const t = i / (HEADER_H - 1)
          const r = Math.round(0xC9 + (0xE8 - 0xC9) * t)
          const g = Math.round(0x35 + (0x65 - 0x35) * t)
          const b = Math.round(0x17 + (0x0A - 0x17) * t)
          const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
          doc.rect(0, i, W, 1).fill(hex)
        }

        // ── Logo ──────────────────────────────────────────────
        const logoPath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'logo.png')
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, W / 2 - 30, 10, { width: 60, height: 60 })
        }

        // ── Título principal no cabeçalho ─────────────────────
        doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE)
           .text('COMPROVANTE DE PAGAMENTO', 0, 76, { width: W, align: 'center' })

        // ── Círculo de aprovado com checkmark desenhado ───────
        const cx = W / 2
        const cy = 132
        const cr = 24

        // Sombra suave
        doc.circle(cx + 1, cy + 1, cr).fill('#00000015')
        // Círculo verde
        doc.circle(cx, cy, cr).fill(GREEN)
        // Anel branco fino
        doc.circle(cx, cy, cr).stroke(WHITE).lineWidth(1.5)

        // Checkmark desenhado com linhas (não depende de Unicode)
        doc.lineWidth(2.8)
           .strokeColor(WHITE)
           .lineCap('round')
           .lineJoin('round')
           .moveTo(cx - 10, cy)
           .lineTo(cx - 3,  cy + 8)
           .lineTo(cx + 11, cy - 9)
           .stroke()

        // ── Texto de aprovado ─────────────────────────────────
        doc.fontSize(13).font('Helvetica-Bold').fillColor(GREEN)
           .text('Pagamento Aprovado', 0, 166, { width: W, align: 'center' })

        doc.fontSize(8.5).font('Helvetica').fillColor(GRAY)
           .text(`${dataFmt} as ${horaFmt}`, 0, 183, { width: W, align: 'center' })

        // ── Card do valor ─────────────────────────────────────
        const cardX = W / 2 - 90
        const cardW = 180
        doc.rect(cardX, 202, cardW, 52)
           .fill(WHITE)
           .stroke(BORDER)
           .lineWidth(1)

        doc.fontSize(7.5).font('Helvetica').fillColor(LIGHT)
           .text('VALOR PAGO', cardX, 210, { width: cardW, align: 'center' })

        doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK)
           .text(valorFmt, cardX, 221, { width: cardW, align: 'center' })

        // ── Linha divisória ───────────────────────────────────
        doc.moveTo(30, 268).lineTo(W - 30, 268)
           .stroke(BORDER).lineWidth(0.8)

        // ── Detalhes ──────────────────────────────────────────
        const detalhe = (label, value, y) => {
          doc.fontSize(7.5).font('Helvetica').fillColor(LIGHT)
             .text(label, 35, y, { width: 140, lineBreak: false })
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(DARK)
             .text(value, 175, y, { width: W - 205, align: 'right', lineBreak: false })
        }

        detalhe('Referencia',      `${nomeMes} de ${anoStr}`,  282)
        detalhe('Metodo',          'PIX',                       300)
        detalhe('ID da Transacao', pagamento.mercado_pago_id,   318)
        detalhe('Status',          'Aprovado',                  336)

        // ── Linha divisória ───────────────────────────────────
        doc.moveTo(30, 354).lineTo(W - 30, 354)
           .stroke(BORDER).lineWidth(0.8)

        // ── Nota de autenticidade ─────────────────────────────
        doc.rect(30, 364, W - 60, 46)
           .fill('#F0FDF4')
           .stroke('#BBF7D0')
           .lineWidth(0.8)

        doc.fontSize(7.5).font('Helvetica').fillColor(GREEN)
           .text(
             'Este comprovante e gerado automaticamente.',
             38, 374, { width: W - 76, align: 'center' },
           )

        // ── Rodapé ────────────────────────────────────────────
        doc.moveTo(30, 422).lineTo(W - 30, 422)
           .stroke(BORDER).lineWidth(0.5)

        doc.fontSize(7).font('Helvetica').fillColor(LIGHT)
           .text(
             `Indios Churrasco Gourmet  |  Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
             0, 430, { width: W, align: 'center' },
           )

        doc.end()
      })

      const pdfBuffer = Buffer.concat(chunks)
      const filename  = `comprovante-${pagamento.mes_referencia}.pdf`

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', pdfBuffer.length)
      res.setHeader('Cache-Control', 'no-store')
      return res.send(pdfBuffer)

    } catch (err) {
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Erro ao gerar comprovante' })
    }
  },

  // GET /api/pagamentos/status
  async consultarStatus(req, res) {
    try {
      const usuarioId     = getUsuarioId(req)
      const mesReferencia = mesAtual()
      const mesPago       = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)

      return res.status(200).json({
        success: true,
        data: {
          mesPago,
          mesReferencia,
          valor: PixPaymentService.valorMensalidade,
        },
      })

    } catch (err) {
      return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Erro ao consultar status do pagamento' })
    }
  },

  // POST /api/pagamentos/webhook
  async processarWebhook(req, res) {
    // Responde 200 imediatamente — o Mercado Pago não reenviar
    res.status(200).json({ received: true })

    try {
      const { type, data, action } = req.body

      const isPaymentEvent = type === 'payment' || action?.startsWith('payment.')
      if (!isPaymentEvent) return

      const dataId = String(req.query['data.id'] || data?.id || '').trim()
      if (!dataId) return

      // ── Validação HMAC ────────────────────────────────────────
      const assinaturaValida = PixPaymentService.verificarAssinaturaWebhook(
        req.headers['x-signature'],
        req.headers['x-request-id'],
        dataId,
      )
      if (!assinaturaValida) return

      // ── Consultar status REAL na API (nunca confiar só no payload) ──
      const paymentData = await PixPaymentService.consultarPagamento(dataId)
      if (paymentData.status !== 'approved') return

      // ── Buscar pagamento no banco pelo ID do Mercado Pago ─────
      const pagamento = await PagamentoModel.buscarPorMercadoPagoId(dataId)

      if (!pagamento) {
        // Tentar identificar pelo external_reference (usuarioId|mesReferencia)
        const externalRef = paymentData.external_reference || ''
        if (!externalRef.includes('|')) return

        const [usuarioId, mesReferencia] = externalRef.split('|')

        const jaPago = await PagamentoModel.verificarMesPago(usuarioId, mesReferencia)
        if (jaPago) return

        await PagamentoModel.criarPagamentoAprovado({
          usuarioId,
          mesReferencia,
          mercadoPagoId: dataId,
          valor:         paymentData.transaction_amount,
          dadosMercadoPago: {
            status:              paymentData.status,
            status_detail:       paymentData.status_detail,
            transaction_amount:  paymentData.transaction_amount,
            date_approved:       paymentData.date_approved,
            webhook_received_at: new Date().toISOString(),
          },
        })
        return
      }

      // Pagamento encontrado — idempotência: já aprovado, não faz nada
      if (pagamento.status === 'approved') return

      await PagamentoModel.atualizarStatus(dataId, 'approved', {
        status:              paymentData.status,
        status_detail:       paymentData.status_detail,
        transaction_amount:  paymentData.transaction_amount,
        date_approved:       paymentData.date_approved,
        webhook_received_at: new Date().toISOString(),
      })

    } catch {
      // Não relançar — já respondemos 200 ao Mercado Pago
    }
  },

  // GET /api/pagamentos/webhook/health
  async healthCheck(_req, res) {
    return res.status(200).json({
      status:      'ok',
      service:     'PIX Webhook',
      endpoint:    '/api/pagamentos/webhook',
      timestamp:   new Date().toISOString(),
      environment: PixPaymentService.detectEnvironment().environment,
    })
  },
}

module.exports = pixPaymentController
