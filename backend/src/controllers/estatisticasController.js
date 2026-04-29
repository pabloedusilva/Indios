// =============================================================
//  controllers/estatisticasController.js
//  Estatísticas mensais + geração e gestão de relatórios PDF
// =============================================================

const path = require('path')
const fs   = require('fs')
const PDFDocument      = require('pdfkit')
const EstatisticasModel = require('../models/EstatisticasModel')

// ── Configuração do diretório de relatórios ───────────────────
const RELATORIOS_DIR = path.join(__dirname, '..', '..', 'relatorios')
const MAX_RELATORIOS  = 3

function garantirPasta() {
  if (!fs.existsSync(RELATORIOS_DIR)) {
    fs.mkdirSync(RELATORIOS_DIR, { recursive: true })
  }
}

// Lista PDFs existentes ordenados cronologicamente (mais antigo primeiro)
function listarPDFs() {
  garantirPasta()
  return fs
    .readdirSync(RELATORIOS_DIR)
    .filter((f) => /^relatorio-\d{4}-\d{2}\.pdf$/.test(f))
    .sort()
}

// Remove o mais antigo se estiver no limite, abrindo espaço para 1 novo
function gerenciarLimite() {
  const pdfs = listarPDFs()
  if (pdfs.length >= MAX_RELATORIOS) {
    const maisAntigo = pdfs[0]
    fs.unlinkSync(path.join(RELATORIOS_DIR, maisAntigo))
    console.log(`[Relatórios] Removido (limite atingido): ${maisAntigo}`)
  }
}

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
  // diaStr = 'YYYY-MM-DD'
  if (!diaStr) return '—'
  const d = new Date(diaStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDiaCurto(diaStr) {
  if (!diaStr) return '—'
  const d = new Date(diaStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ── Geração do PDF (interna — usada pelo scheduler) ─────────
async function gerarPDFInterno(stats, filePath) {return gerarPDF(stats, filePath)}
function gerarPDF(stats, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 55, bottom: 55, left: 50, right: 50 },
      info: {
        Title:   `Relatorio Mensal ${nomeMesPDF(stats.mes)} ${stats.mes.split('-')[0]}`,
        Author:  'Indios Churrasco Gourmet',
        Subject: 'Relatorio de Estatisticas Mensais',
      },
    })

    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)
    stream.on('finish', resolve)
    stream.on('error', reject)

    const { mes, resumo, topProdutos, pagamentos, porDia, melhorDia } = stats
    const ano = mes.split('-')[0]

    const ORANGE    = '#E8650A'
    const RED       = '#C93517'
    const DARK      = '#1C1410'
    const GRAY      = '#6B5E50'
    const LIGHT     = '#A8998A'
    const BG_WARM   = '#FDF9F6'
    const BORDER    = '#EDE9E3'
    const PAGE_W    = 495  // largura útil (595 - 50 - 50)

    const agora = new Date()
    const geradoEm = agora.toLocaleDateString('pt-BR') + ' as ' +
      agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    // ── Helpers ───────────────────────────────────────────────
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
      doc.fontSize(9.5).font('Helvetica').fillColor(GRAY).text(n(label), 50, y, { width: 200, lineBreak: false })
      doc.font(highlight ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(highlight ? DARK : DARK)
         .text(n(value), 260, y, { width: 285, lineBreak: false })
      doc.moveDown(0.5)
    }

    // ── Cabeçalho ─────────────────────────────────────────────
    doc.rect(50, 45, PAGE_W, 88).fill(BG_WARM).stroke(BORDER)
    doc.fillColor(RED)
    doc.fontSize(22).font('Helvetica-Bold')
       .text('RELATORIO MENSAL', 50, 58, { width: PAGE_W, align: 'center', lineBreak: false })
    doc.fillColor(DARK)
    doc.fontSize(14).font('Helvetica')
       .text(`${nomeMesPDF(mes)} de ${ano}`, 50, 85, { width: PAGE_W, align: 'center', lineBreak: false })
    doc.fontSize(8).fillColor(LIGHT)
       .text(`Indios Churrasco Gourmet  |  Gerado em: ${geradoEm}`, 50, 108, { width: PAGE_W, align: 'center', lineBreak: false })

    // Reposicionar cursor após cabeçalho fixo
    doc.fillColor(DARK).text('', 50, 148)

    // ── Resumo do Período ──────────────────────────────────────
    section('Resumo do Periodo')
    kv('Faturamento Total',    moeda(resumo.faturamento),       true)
    kv('Total de Pedidos',     String(resumo.totalPedidos))
    kv('Pedidos Finalizados',  String(resumo.finalizados))
    kv('Pedidos Cancelados',   `${resumo.cancelados}  (${resumo.taxaCancelamento}%)`)
    kv('Ticket Medio',         moeda(resumo.ticketMedio),        true)

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
        kv(
          nomePagamento(p.forma),
          `${p.qtd} pedidos (${pct}%)   |   ${moeda(p.total)}`,
        )
      })
    }

    // ── Top Produtos ──────────────────────────────────────────
    if (topProdutos.length > 0) {
      if (doc.y > 580) doc.addPage()
      section('Top Produtos do Mes')

      // Cabeçalho da tabela
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
        doc.fontSize(9).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fillColor(i === 0 ? ORANGE : DARK)
        doc.text(String(i + 1),      50,  y, { width: 20,  lineBreak: false })
        doc.text(nomeExibir,          70,  y, { width: 230, lineBreak: false })
        doc.fillColor(GRAY)
        doc.text(String(p.quantidade), 300, y, { width: 80,  align: 'right', lineBreak: false })
        doc.fillColor(DARK)
        doc.text(moeda(p.receita),    380, y, { width: 165, align: 'right', lineBreak: false })
        doc.moveDown(0.5)
      })
    }

    // ── Faturamento por Dia ───────────────────────────────────
    if (porDia.length > 0) {
      if (doc.y > 550) doc.addPage()
      section('Faturamento por Dia')

      // Cabeçalho da tabela
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
        const y = doc.y
        const emptyDay = d.faturamento === 0
        doc.fontSize(9).font('Helvetica').fillColor(emptyDay ? LIGHT : DARK)
        doc.text(fmtDiaCurto(d.dia),    50,  y, { width: 70,  lineBreak: false })
        doc.text(String(d.pedidos),      120, y, { width: 80,  align: 'right', lineBreak: false })
        doc.fillColor(d.cancelados > 0 ? RED : (emptyDay ? LIGHT : DARK))
        doc.text(String(d.cancelados),   200, y, { width: 90,  align: 'right', lineBreak: false })
        doc.fillColor(emptyDay ? LIGHT : DARK)
        doc.text(moeda(d.faturamento),   290, y, { width: 255, align: 'right', lineBreak: false })
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

// GET /api/estatisticas/meses
const listarMeses = async (req, res, next) => {
  try {
    const meses = await EstatisticasModel.mesesDisponiveis()
    res.json({ success: true, data: meses })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/inicio
// Retorna meses disponíveis + stats do mês mais recente em uma única chamada,
// eliminando a cascata de requisições do frontend.
const inicio = async (req, res, next) => {
  try {
    const meses = await EstatisticasModel.mesesDisponiveis()
    if (meses.length === 0) {
      return res.json({
        success: true,
        data: {
          meses: [],
          stats: null,
        },
      })
    }

    const mesMaisRecente = meses[0].mes
    const stats = await EstatisticasModel.estatisticasMes(mesMaisRecente)

    // Persiste em background (fire-and-forget)
    EstatisticasModel.salvar(mesMaisRecente, stats)
      .then(() => EstatisticasModel.limparAntigos())
      .catch((e) => console.error('[Estatísticas] Erro ao persistir snapshot:', e.message))

    const snapshot = await EstatisticasModel.buscarSnapshot(mesMaisRecente)

    res.json({
      success: true,
      data: {
        meses,
        stats: {
          ...stats,
          atualizadoEm: snapshot?.atualizadoEm ?? new Date().toISOString(),
        },
      },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/mensal?mes=2026-04
// Calcula ao vivo, persiste na tabela e retorna com atualizadoEm
const estatisticasMensal = async (req, res, next) => {
  try {
    const { mes } = req.query
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({ success: false, message: 'Parâmetro mes inválido. Use o formato YYYY-MM.' })
    }

    // Calcula ao vivo a partir dos pedidos
    const stats = await EstatisticasModel.estatisticasMes(mes)

    // Persiste / atualiza na tabela (fire-and-forget com log em caso de erro)
    EstatisticasModel.salvar(mes, stats)
      .then(() => EstatisticasModel.limparAntigos())
      .catch((e) => console.error('[Estatísticas] Erro ao persistir snapshot:', e.message))

    // Busca o atualizadoEm já gravado (pode ser ligeiramente atrasado, mas é apenas informativo)
    const snapshot = await EstatisticasModel.buscarSnapshot(mes)

    res.json({
      success: true,
      data: {
        ...stats,
        atualizadoEm: snapshot?.atualizadoEm ?? new Date().toISOString(),
      },
    })
  } catch (err) {
    next(err)
  }
}

// POST /api/estatisticas/sincronizar
// Recalcula e salva todos os meses disponíveis de uma vez
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

    await EstatisticasModel.limparAntigos()

    res.json({ success: true, data: resultados })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/snapshots — lista os snapshots salvos no banco
const listarSnapshots = async (req, res, next) => {
  try {
    const data = await EstatisticasModel.listarSnapshots()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/relatorios
const listarRelatorios = async (req, res, next) => {
  try {
    const pdfs = listarPDFs()
    const data = pdfs.map((f) => {
      const mes   = f.replace('relatorio-', '').replace('.pdf', '')
      const stat  = fs.statSync(path.join(RELATORIOS_DIR, f))
      return { arquivo: f, mes, geradoEm: stat.mtime.toISOString() }
    })
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

// GET /api/estatisticas/relatorio/:arquivo  (download)
const downloadRelatorio = async (req, res, next) => {
  try {
    const { arquivo } = req.params
    // Valida nome (evita path traversal)
    if (!/^relatorio-\d{4}-\d{2}\.pdf$/.test(arquivo)) {
      return res.status(400).json({ success: false, message: 'Nome de arquivo inválido.' })
    }
    const filePath = path.join(RELATORIOS_DIR, arquivo)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Relatório não encontrado.' })
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${arquivo}"`)
    fs.createReadStream(filePath).pipe(res)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listarMeses,
  estatisticasMensal,
  inicio,
  sincronizar,
  listarSnapshots,
  listarRelatorios,
  downloadRelatorio,
  gerarPDFInterno,
}
