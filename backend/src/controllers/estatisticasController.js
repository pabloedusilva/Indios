// =============================================================
//  controllers/estatisticasController.js
//
//  Estatísticas mensais + relatórios PDF gerados sob demanda.
//
//  Fluxo de relatórios:
//    · Todo dia 1 o scheduler salva os dados do mês anterior
//      na tabela relatorios_mensais (sem arquivos em disco).
//    · O download gera o PDF em memória a partir do banco,
//      sem nenhum arquivo temporário.
//    · Todos os meses são mantidos (sem limite de retenção).
//    · O painel exibe apenas os últimos 3 meses.
// =============================================================

const PDFDocument       = require('pdfkit')
const path              = require('path')
const fs                = require('fs')
const EstatisticasModel = require('../models/EstatisticasModel')

// ── Helpers de formatação para o PDF ─────────────────────────

// Remove acentos e caracteres não-Latin1 (pdfkit built-in fonts)
function n(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7E]/g, '?')
}

function moeda(val) {
  const num = parseFloat(val || 0)
  return 'R$ ' + num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function nomeMesPDF(mesStr) {
  const nomes = [
    'Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]
  const [, m] = mesStr.split('-')
  return nomes[parseInt(m, 10) - 1] || mesStr
}

function nomePagamento(forma) {
  const map = {
    pix:      'PIX',
    credito:  'Cartao Credito',
    debito:   'Cartao Debito',
    dinheiro: 'Dinheiro',
  }
  return map[forma] || n(forma)
}

function fmtDia(diaStr) {
  if (!diaStr) return '—'
  const d = new Date(diaStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDiaCurto(diaStr) {
  if (!diaStr) return '—'
  const d = new Date(diaStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ── Geração do PDF em memória (retorna Buffer) ────────────────
function gerarPDFBuffer(stats) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 0, bottom: 55, left: 50, right: 50 },
      info: {
        Title:   `Relatorio Mensal ${nomeMesPDF(stats.mes)} ${stats.mes.split('-')[0]}`,
        Author:  'Indios Churrasco Gourmet',
        Subject: 'Relatorio de Estatisticas Mensais',
      },
    })

    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const { mes, resumo, topProdutos, pagamentos, porDia, melhorDia } = stats
    const ano = mes.split('-')[0]

    const ORANGE = '#E8650A'
    const RED    = '#C93517'
    const WHITE  = '#FFFFFF'
    const DARK   = '#1C1410'
    const GRAY   = '#6B5E50'
    const LIGHT  = '#A8998A'
    const BORDER = '#EDE9E3'
    const PAGE_W = 595  // largura total A4

    // geradoEm do cabeçalho: data real de geração salva no banco
    const dataGerado = stats.geradoEm ? new Date(stats.geradoEm) : new Date()
    const geradoEmCabecalho = dataGerado.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' as ' +
      dataGerado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

    // rodapé: dinâmico — hora real do download em horário de Brasília
    const agora = new Date()
    const geradoEm = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' as ' +
      agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

    // ── Helpers de layout ─────────────────────────────────────
    const line = (y) => {
      const ly = y !== undefined ? y : doc.y
      doc.moveTo(50, ly).lineTo(545, ly).stroke(BORDER).fillColor(DARK)
    }

    const section = (title) => {
      if (doc.y > 690) doc.addPage()
      doc.moveDown(0.8)
      doc.fontSize(10).font('Helvetica-Bold').fillColor(ORANGE).text(n(title).toUpperCase(), 50)
      line()
      doc.fillColor(DARK).moveDown(0.4)
    }

    const kv = (label, value, highlight = false) => {
      const y = doc.y
      doc.fontSize(9.5).font('Helvetica').fillColor(GRAY)
         .text(n(label), 50, y, { width: 200, lineBreak: false })
      doc.font(highlight ? 'Helvetica-Bold' : 'Helvetica').fillColor(DARK)
         .text(n(value), 260, y, { width: 285, lineBreak: false })
      doc.moveDown(0.5)
    }

    // ── Cabeçalho: gradiente RED → ORANGE ────────────────────
    const HEADER_H = 130
    for (let i = 0; i < HEADER_H; i++) {
      const t   = i / (HEADER_H - 1)
      const r   = Math.round(0xC9 + (0xE8 - 0xC9) * t)
      const g   = Math.round(0x35 + (0x65 - 0x35) * t)
      const b   = Math.round(0x17 + (0x0A - 0x17) * t)
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
      doc.rect(0, i, PAGE_W, 1).fill(hex)
    }

    // ── Logo centralizada ─────────────────────────────────────
    const logoPath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'logo.png')
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, PAGE_W / 2 - 30, 10, { width: 60, height: 60 })
    }

    // ── Título e subtítulo brancos ────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').fillColor(WHITE)
       .text('RELATORIO MENSAL', 0, 78, { width: PAGE_W, align: 'center', lineBreak: false })
    doc.fontSize(10).font('Helvetica').fillColor('rgba(255,255,255,0.85)')
       .text(`${nomeMesPDF(mes)} de ${ano}`, 0, 97, { width: PAGE_W, align: 'center', lineBreak: false })
    doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.60)')
       .text(`Gerado em: ${geradoEmCabecalho}`, 0, 114, { width: PAGE_W, align: 'center', lineBreak: false })

    // ── Cursor abaixo do cabeçalho ────────────────────────────
    doc.fillColor(DARK).text('', 50, HEADER_H + 18)

    // ── Resumo do Período ─────────────────────────────────────
    section('Resumo do Periodo')
    kv('Faturamento Total',   moeda(resumo.faturamento),      true)
    kv('Total de Pedidos',    String(resumo.totalPedidos))
    kv('Pedidos Finalizados', String(resumo.finalizados))
    kv('Pedidos Cancelados',  `${resumo.cancelados}  (${resumo.taxaCancelamento}%)`)
    kv('Ticket Medio',        moeda(resumo.ticketMedio),       true)

    // ── Melhor Dia ────────────────────────────────────────────
    if (melhorDia) {
      section('Dia de Maior Movimento')
      kv('Data',               fmtDia(melhorDia.dia))
      kv('Faturamento no Dia', moeda(melhorDia.faturamento), true)
      kv('Pedidos no Dia',     String(melhorDia.pedidos))
    }

    // ── Formas de Pagamento ───────────────────────────────────
    if (pagamentos.length > 0) {
      section('Formas de Pagamento')
      const totalPag = pagamentos.reduce((s, p) => s + p.qtd, 0)
      pagamentos.forEach((p) => {
        const pct = totalPag > 0 ? ((p.qtd / totalPag) * 100).toFixed(1) : '0.0'
        kv(nomePagamento(p.forma), `${p.qtd} pedidos (${pct}%)   |   ${moeda(p.total)}`)
      })
    }

    // ── Top Produtos ──────────────────────────────────────────
    if (topProdutos.length > 0) {
      if (doc.y > 580) doc.addPage()
      section('Top Produtos do Mes')

      const y0 = doc.y
      doc.fontSize(8).font('Helvetica-Bold').fillColor(LIGHT)
      doc.text('#',        50,  y0, { width: 20,  lineBreak: false })
      doc.text('Produto',  70,  y0, { width: 230, lineBreak: false })
      doc.text('Qtd',      300, y0, { width: 80,  align: 'right', lineBreak: false })
      doc.text('Receita',  380, y0, { width: 165, align: 'right', lineBreak: false })
      doc.fillColor(DARK).moveDown(0.4)
      line()
      doc.moveDown(0.3)

      topProdutos.forEach((p, i) => {
        if (doc.y > 730) doc.addPage()
        const y = doc.y
        const nomeExibir = n(p.nome).length > 40 ? n(p.nome).slice(0, 38) + '..' : n(p.nome)
        doc.fontSize(9).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
           .fillColor(i === 0 ? ORANGE : DARK)
        doc.text(String(i + 1),       50,  y, { width: 20,  lineBreak: false })
        doc.text(nomeExibir,           70,  y, { width: 230, lineBreak: false })
        doc.fillColor(GRAY)
        doc.text(String(p.quantidade), 300, y, { width: 80,  align: 'right', lineBreak: false })
        doc.fillColor(DARK)
        doc.text(moeda(p.receita),     380, y, { width: 165, align: 'right', lineBreak: false })
        doc.moveDown(0.5)
      })
    }

    // ── Faturamento por Dia ───────────────────────────────────
    if (porDia.length > 0) {
      if (doc.y > 550) doc.addPage()
      section('Faturamento por Dia')

      const y0 = doc.y
      doc.fontSize(8).font('Helvetica-Bold').fillColor(LIGHT)
      doc.text('Data',        50,  y0, { width: 70,  lineBreak: false })
      doc.text('Pedidos',     120, y0, { width: 80,  align: 'right', lineBreak: false })
      doc.text('Cancelados',  200, y0, { width: 90,  align: 'right', lineBreak: false })
      doc.text('Faturamento', 290, y0, { width: 255, align: 'right', lineBreak: false })
      doc.fillColor(DARK).moveDown(0.4)
      line()
      doc.moveDown(0.3)

      porDia.forEach((d) => {
        if (doc.y > 730) doc.addPage()
        const y        = doc.y
        const emptyDay = d.faturamento === 0
        doc.fontSize(9).font('Helvetica').fillColor(emptyDay ? LIGHT : DARK)
        doc.text(fmtDiaCurto(d.dia),  50,  y, { width: 70,  lineBreak: false })
        doc.text(String(d.pedidos),    120, y, { width: 80,  align: 'right', lineBreak: false })
        doc.fillColor(d.cancelados > 0 ? RED : (emptyDay ? LIGHT : DARK))
        doc.text(String(d.cancelados), 200, y, { width: 90,  align: 'right', lineBreak: false })
        doc.fillColor(emptyDay ? LIGHT : DARK)
        doc.text(moeda(d.faturamento), 290, y, { width: 255, align: 'right', lineBreak: false })
        doc.moveDown(0.45)
      })
    }

    // ── Rodapé ────────────────────────────────────────────────
    doc.moveDown(1.5)
    line()
    doc.moveDown(0.4)
    doc.fontSize(7.5).fillColor(LIGHT)
       .text(
         `Indios Churrasco Gourmet  |  Relatorio Mensal ${nomeMesPDF(mes)} ${ano}  |  ${geradoEm}`,
         { align: 'center' },
       )

    doc.end()
  })
}

// ── Controllers ───────────────────────────────────────────────

// GET /api/estatisticas/inicio
// Retorna meses disponíveis + stats do mês mais recente em uma única chamada
const inicio = async (req, res, next) => {
  try {
    const meses = await EstatisticasModel.mesesDisponiveis()
    if (meses.length === 0) {
      return res.json({ success: true, data: { meses: [], stats: null } })
    }

    const mesMaisRecente = meses[0].mes
    const stats = await EstatisticasModel.estatisticasMes(mesMaisRecente)

    // Persiste em background (fire-and-forget)
    EstatisticasModel.salvar(mesMaisRecente, stats)
      .catch((e) => console.error('[Estatísticas] Erro ao persistir snapshot:', e.message))

    const snapshot = await EstatisticasModel.buscarSnapshot(mesMaisRecente)

    return res.json({
      success: true,
      data: {
        meses,
        stats: { ...stats, atualizadoEm: snapshot?.atualizadoEm ?? new Date().toISOString() },
      },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/meses
const listarMeses = async (req, res, next) => {
  try {
    const meses = await EstatisticasModel.mesesDisponiveis()
    res.json({ success: true, data: meses })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/mensal?mes=YYYY-MM
const estatisticasMensal = async (req, res, next) => {
  try {
    const { mes } = req.query
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({ success: false, message: 'Parâmetro mes inválido. Use o formato YYYY-MM.' })
    }

    const stats = await EstatisticasModel.estatisticasMes(mes)

    EstatisticasModel.salvar(mes, stats)
      .catch((e) => console.error('[Estatísticas] Erro ao persistir snapshot:', e.message))

    const snapshot = await EstatisticasModel.buscarSnapshot(mes)

    return res.json({
      success: true,
      data: { ...stats, atualizadoEm: snapshot?.atualizadoEm ?? new Date().toISOString() },
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/estatisticas/sincronizar
const sincronizar = async (req, res, next) => {
  try {
    const meses = await EstatisticasModel.mesesDisponiveis()
    const resultados = []

    for (const { mes } of meses) {
      const stats = await EstatisticasModel.estatisticasMes(mes)
      await EstatisticasModel.salvar(mes, stats)
      const snap = await EstatisticasModel.buscarSnapshot(mes)
      resultados.push({ mes, atualizadoEm: snap?.atualizadoEm })
    }

    return res.json({ success: true, data: resultados })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/snapshots
const listarSnapshots = async (req, res, next) => {
  try {
    const data = await EstatisticasModel.listarSnapshots()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/relatorios
// Lista os relatórios disponíveis no banco (todos os meses)
const listarRelatorios = async (req, res, next) => {
  try {
    const relatorios = await EstatisticasModel.listarRelatorios()
    const data = relatorios.map(({ mes, geradoEm }) => ({ mes, geradoEm }))
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/relatorio/:mes/download
// Gera o PDF em memória a partir dos dados do banco e envia para download
const downloadRelatorio = async (req, res, next) => {
  try {
    const { mes } = req.params
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({ success: false, message: 'Mês inválido. Use o formato YYYY-MM.' })
    }

    const relatorio = await EstatisticasModel.buscarRelatorio(mes)
    if (!relatorio) {
      return res.status(404).json({ success: false, message: 'Relatório não encontrado para este mês.' })
    }

    const pdfBuffer = await gerarPDFBuffer(relatorio)
    const filename  = `relatorio-${mes}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.setHeader('Cache-Control', 'no-store')
    return res.send(pdfBuffer)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  inicio,
  listarMeses,
  estatisticasMensal,
  sincronizar,
  listarSnapshots,
  listarRelatorios,
  downloadRelatorio,
  gerarPDFBuffer,
}
