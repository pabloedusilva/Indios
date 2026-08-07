// ════════════════════════════════════════════════════════════════════════════
// controllers/notasFiscaisController.js — Controlador de Notas Fiscais
// ════════════════════════════════════════════════════════════════════════════
// Gerencia requisições HTTP relacionadas a notas fiscais eletrônicas.
// ════════════════════════════════════════════════════════════════════════════

const NotaFiscalService = require('../services/NotaFiscalService')
const NotaFiscalModel = require('../models/NotaFiscalModel')

/**
 * Listar notas fiscais
 * GET /api/notas-fiscais
 */
async function listar(req, res) {
  try {
    const { status, periodo, busca, limite, pagina } = req.query
    
    const resultado = await NotaFiscalModel.listar({
      status,
      periodo,
      busca,
      limite: parseInt(limite) || 50,
      pagina: parseInt(pagina) || 1
    })
    
    res.json({
      success: true,
      ...resultado
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao listar notas fiscais',
      error: error.message
    })
  }
}

/**
 * Buscar nota por ID
 * GET /api/notas-fiscais/:id
 */
async function buscarPorId(req, res) {
  try {
    const { id } = req.params
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      })
    }
    
    const nota = await NotaFiscalModel.buscarPorId(id)
    
    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      })
    }
    
    // Buscar dados do pedido para enriquecer a resposta
    const pool = require('../config/database')
    const pedidoResult = await pool.query(`
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'produtoId', ip.produto_id,
            'nomeProduto', pr.nome,
            'quantidade', ip.quantidade,
            'precoUnitario', ip.preco_unitario,
            'descricao', pr.nome,
            'valorUnitario', ip.preco_unitario,
            'valorTotal', ip.quantidade * ip.preco_unitario
          )
        ) as itens
      FROM pedidos p
      LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
      LEFT JOIN produtos pr ON pr.id = ip.produto_id
      WHERE p.id = $1
      GROUP BY p.id
    `, [nota.pedidoId])
    
    const pedido = pedidoResult.rows[0]
    
    // Buscar configuração fiscal (do .env.fiscal)
    const fiscalConfig = require('../config/fiscal')
    
    // Enriquecer nota com dados completos
    const notaEnriquecida = {
      ...nota,
      itens: pedido?.itens || [],
      pedido: pedido ? {
        numero: pedido.numero_pedido,
        nomeCliente: pedido.nome_cliente,
        formaPagamento: pedido.forma_pagamento
      } : null,
      emitente: {
        razaoSocial: fiscalConfig.EMPRESA_CONFIG.razaoSocial,
        nomeFantasia: fiscalConfig.EMPRESA_CONFIG.nomeFantasia,
        cnpj: fiscalConfig.EMPRESA_CONFIG.cnpj,
        ie: fiscalConfig.EMPRESA_CONFIG.ie,
        endereco: fiscalConfig.EMPRESA_CONFIG.endereco
      },
      destinatario: {
        nome: nota.destinatarioNome || pedido?.nome_cliente || 'CONSUMIDOR FINAL',
        cpf: nota.destinatarioCnpjCpf && nota.destinatarioCnpjCpf.length === 11 ? nota.destinatarioCnpjCpf : null,
        cnpj: nota.destinatarioCnpjCpf && nota.destinatarioCnpjCpf.length === 14 ? nota.destinatarioCnpjCpf : null
      }
    }
    
    res.json({
      success: true,
      nota: notaEnriquecida
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar nota fiscal',
      error: error.message
    })
  }
}

/**
 * Emitir nova nota fiscal
 * POST /api/notas-fiscais
 * Body: { pedidoId, cpfDestinatario?, ufDestinatario?, observacoes? }
 */
async function emitir(req, res) {
  try {
    const { pedidoId, cpfDestinatario, ufDestinatario, observacoes } = req.body
    const usuarioId = req.usuario.id
    
    // Validações
    if (!pedidoId) {
      return res.status(400).json({
        success: false,
        message: 'pedidoId é obrigatório'
      })
    }
    
    const dadosAdicionais = {
      cpfDestinatario,
      ufDestinatario,
      observacoes
    }
    
    const nota = await NotaFiscalService.emitir(pedidoId, usuarioId, dadosAdicionais)
    
    res.status(201).json({
      success: true,
      message: 'Nota fiscal emitida com sucesso',
      nota
    })
  } catch (error) {
    // Erros específicos
    if (error.message.includes('não encontrado') || 
        error.message.includes('já existe') ||
        error.message.includes('Configure os dados')) {
      return res.status(400).json({
        success: false,
        message: error.message
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao emitir nota fiscal',
      error: error.message
    })
  }
}

/**
 * Consultar status rápido (apenas do banco, sem chamar API)
 * GET /api/notas-fiscais/:id/status-rapido
 */
async function consultarStatusRapido(req, res) {
  try {
    const { id } = req.params
    
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      })
    }
    
    const nota = await NotaFiscalModel.buscarPorId(id)
    
    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      })
    }
    
    res.json({
      success: true,
      status: nota.status,
      numero: nota.numero,
      chaveAcesso: nota.chaveAcesso,
      autorizadoEm: nota.autorizadoEm
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao consultar status',
      error: error.message
    })
  }
}

/**
 * Consultar status na SEFAZ
 * POST /api/notas-fiscais/:id/consultar-status
 */
async function consultarStatus(req, res) {
  try {
    const { id } = req.params
    const usuarioId = req.usuario.id
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      })
    }
    
    const resultado = await NotaFiscalService.consultarStatus(id, usuarioId)
    
    res.json({
      success: true,
      message: 'Status consultado com sucesso',
      status: resultado
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao consultar status',
      error: error.message
    })
  }
}

/**
 * Cancelar nota fiscal
 * POST /api/notas-fiscais/:id/cancelar
 * Body: { motivo }
 */
async function cancelar(req, res) {
  try {
    const { id } = req.params
    const { motivoLimpo } = req.body // Motivo já sanitizado pelo validator
    const usuarioId = req.usuario.id
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      })
    }
    
    // Capturar IP do usuário (considera proxies)
    const userIp = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown'
    
    // Validação adicional
    if (!motivoLimpo || motivoLimpo.length < 15) {
      return res.status(400).json({
        success: false,
        message: 'Motivo do cancelamento deve ter no mínimo 15 caracteres'
      })
    }
    
    const nota = await NotaFiscalService.cancelar(id, motivoLimpo, usuarioId, userIp)
    
    res.json({
      success: true,
      message: 'Nota fiscal cancelada com sucesso',
      nota
    })
  } catch (error) {
    // Erros específicos com status codes apropriados
    if (error.message.includes('não encontrada')) {
      return res.status(404).json({
        success: false,
        message: error.message
      })
    }
    
    if (error.message.includes('Apenas notas') || 
        error.message.includes('Prazo') ||
        error.message.includes('24')) {
      return res.status(422).json({
        success: false,
        message: error.message
      })
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao cancelar nota fiscal'
    })
  }
}

/**
 * Download XML
 * GET /api/notas-fiscais/:id/xml
 */
async function downloadXML(req, res) {
  try {
    const { id } = req.params
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      })
    }
    
    // Buscar nota antes do download para pegar a chave de acesso
    let nota = await NotaFiscalModel.buscarPorId(id)
    
    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      })
    }
    
    // Se a nota não tiver chave de acesso, tentar consultar o status para obtê-la
    if (!nota.chaveAcesso && nota.providerRef) {
      try {
        await NotaFiscalService.consultarStatus(id)
        nota = await NotaFiscalModel.buscarPorId(id)
      } catch (err) {
        // Continuar mesmo se a consulta falhar
      }
    }
    
    // Download do XML
    const xml = await NotaFiscalService.downloadXML(id)
    
    // Definir nome do arquivo baseado na chave de acesso
    let nomeArquivo = 'NFe_sem_chave.xml'
    
    if (nota.chaveAcesso && nota.chaveAcesso.trim()) {
      nomeArquivo = `${nota.chaveAcesso.trim()}.xml`
    } else if (nota.numero && Number.isInteger(nota.numero)) {
      nomeArquivo = `NFe_${nota.numero.toString().padStart(9, '0')}.xml`
    } else if (nota.providerRef && nota.providerRef.trim()) {
      nomeArquivo = `NFe_${nota.providerRef.trim()}.xml`
    }
    
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
    res.send(xml)
  } catch (error) {
    console.error('[downloadXML] Erro:', error)
    res.status(500).json({
      success: false,
      message: 'Erro ao baixar XML',
      error: error.message
    })
  }
}

/**
 * Download DANFE (HTML da NFC-e)
 * GET /api/notas-fiscais/:id/danfe
 */
async function downloadDANFE(req, res) {
  try {
    const { id } = req.params
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      })
    }
    
    const danfeUrl = await NotaFiscalService.downloadDANFE(id)
    
    // Para NFC-e, o DANFE é HTML hospedado na Focus NFe
    // Redirecionar para a URL
    res.redirect(danfeUrl)
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao acessar DANFE',
      error: error.message
    })
  }
}

/**
 * Obter estatísticas
 * GET /api/notas-fiscais/estatisticas
 */
async function obterEstatisticas(req, res) {
  try {
    const stats = await NotaFiscalModel.obterEstatisticas()
    
    res.json({
      success: true,
      stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    })
  }
}

/**
 * Download de todas as notas do mês em ZIP
 * GET /api/notas-fiscais/download-mes/:periodo
 * Params: periodo (formato YYYY-MM)
 */
async function downloadMesZip(req, res) {
  try {
    const { periodo } = req.params
    
    // Validar formato do período
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de período inválido. Use YYYY-MM (ex: 2024-01)'
      })
    }

    // 1. Configurar token do Focus NFe ANTES de tudo
    const fiscalConfig = require('../config/fiscal')
    const focusClient = require('../services/FocusNFeClient')
    
    if (!fiscalConfig.API_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'Configuração fiscal não encontrada. Verifique o arquivo .env.fiscal'
      })
    }
    
    focusClient.setToken(fiscalConfig.API_TOKEN)

    // 2. Buscar todas as notas autorizadas do período
    const resultado = await NotaFiscalModel.listar({
      status: 'autorizada',
      periodo,
      limite: 1000
    })

    if (!resultado.notas || resultado.notas.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma nota autorizada encontrada para este período'
      })
    }

    // 3. Baixar XMLs de todas as notas (com delay progressivo para evitar rate limit)
    const notasComXml = []
    let sucessos = 0
    let falhas = 0
    const totalNotas = resultado.notas.length
    
    // Configurar delays inteligentes baseados na quantidade
    const DELAY_BASE = 500 // 500ms base
    const DELAY_EXTRA = totalNotas > 20 ? 200 : 0 // +200ms se > 20 notas

    for (let i = 0; i < resultado.notas.length; i++) {
      const nota = resultado.notas[i]
      
      try {
        // Passar false para não reconfigurar token a cada chamada (já configuramos uma vez)
        const xml = await NotaFiscalService.downloadXML(nota.id, false)
        
        notasComXml.push({
          numero: nota.numero,
          chaveAcesso: nota.chaveAcesso, // Incluir chave de acesso para o nome do arquivo
          xml
        })
        sucessos++
        
        // Delay progressivo: aumenta conforme avançamos (evita rate limit acumulado)
        const delayAtual = DELAY_BASE + DELAY_EXTRA + (i > 10 ? 100 : 0)
        
        // Não aplicar delay após a última nota
        if (i < resultado.notas.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayAtual))
        }
        
      } catch (error) {
        falhas++
        
        // Verificar tipo de erro pela mensagem (FocusNFeClient lança erros com mensagens específicas)
        const errorMsg = error.message.toLowerCase()
        
        // Se for rate limit (429)
        if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests') || error.status === 429) {
          // Se já baixou algumas, oferecer ZIP parcial
          if (notasComXml.length > 0) {
            const { criarZipNotas, formatarNomeArquivoZip } = require('../utils/zipHelper')
            const zipBuffer = await criarZipNotas(notasComXml, periodo)
            const nomeArquivo = formatarNomeArquivoZip(periodo).replace('.zip', '_PARCIAL.zip')
            
            res.set({
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
              'Content-Length': zipBuffer.length,
              'X-Partial-Download': 'true',
              'X-Downloaded-Count': sucessos.toString(),
              'X-Total-Count': totalNotas.toString()
            })
            
            return res.send(zipBuffer)
          }
          
          return res.status(429).json({
            success: false,
            message: `Limite de requisições atingido após ${sucessos} notas. Aguarde alguns minutos e tente novamente.`,
            detalhes: {
              baixadas: sucessos,
              total: totalNotas,
              mensagem: 'A API Focus NFe tem limite de requisições por minuto. Tente novamente em 5 minutos.'
            }
          })
        }
        
        // Se for erro de autenticação (401, 403)
        if (errorMsg.includes('token') || errorMsg.includes('unauthorized') || 
            errorMsg.includes('forbidden') || error.status === 401 || error.status === 403) {
          return res.status(401).json({
            success: false,
            message: 'Erro de autenticação com a Focus NFe. Verifique o token nas configurações fiscais.',
            detalhes: {
              baixadas: sucessos,
              total: totalNotas,
              erro: error.message
            }
          })
        }
        
        // Para outros erros, continuar tentando as próximas notas
      }
    }

    // 4. Verificar se conseguiu algum XML
    if (notasComXml.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Não foi possível obter nenhum XML das notas fiscais',
        detalhes: {
          totalNotas,
          falhas
        }
      })
    }

    // 5. Criar arquivo ZIP
    const { criarZipNotas, formatarNomeArquivoZip } = require('../utils/zipHelper')
    const zipBuffer = await criarZipNotas(notasComXml, periodo)
    const nomeArquivo = formatarNomeArquivoZip(periodo)

    // 6. Enviar ZIP
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
      'Content-Length': zipBuffer.length
    })
    
    // Se houve falhas parciais, adicionar header informativo
    if (falhas > 0) {
      res.set({
        'X-Partial-Success': 'true',
        'X-Downloaded-Count': sucessos.toString(),
        'X-Failed-Count': falhas.toString(),
        'X-Total-Count': totalNotas.toString()
      })
    }
    
    res.send(zipBuffer)

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar arquivo ZIP',
      error: error.message
    })
  }
}

/**
 * Obter estatísticas por período
 * GET /api/notas-fiscais/estatisticas/:periodo
 * Params: periodo (formato YYYY-MM)
 */
async function obterEstatisticasPorPeriodo(req, res) {
  try {
    const { periodo } = req.params
    
    // Validar formato do período
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de período inválido. Use YYYY-MM (ex: 2024-01)'
      })
    }
    
    const stats = await NotaFiscalModel.obterEstatisticasPorPeriodo(periodo)
    
    res.json({
      success: true,
      periodo,
      stats
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    })
  }
}

/**
 * Calcular impostos aproximados de uma nota
 * GET /api/notas-fiscais/:id/impostos
 */
async function calcularImpostosNota(req, res) {
  try {
    const { id } = req.params
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      })
    }
    
    const nota = await NotaFiscalModel.buscarPorId(id)
    
    if (!nota) {
      return res.status(404).json({
        success: false,
        message: 'Nota fiscal não encontrada'
      })
    }
    
    // Buscar configuração fiscal para CRT
    const fiscalConfig = require('../config/fiscal')
    
    // Buscar notas dos últimos 12 meses para calcular receita bruta acumulada
    const { calcularImpostos, calcularReceitaBruta12Meses } = require('../utils/impostoCalculator')
    
    const resultado = await NotaFiscalModel.listar({ limite: 10000 })
    const receitaBruta12Meses = calcularReceitaBruta12Meses(resultado.notas || [])
    
    // Calcular impostos
    const impostos = calcularImpostos({
      valorTotal: nota.valor,
      empresaCrt: fiscalConfig.EMPRESA_CONFIG.crt,
      receitaBruta12Meses,
      uf: fiscalConfig.EMPRESA_CONFIG.endereco.uf
    })
    
    res.json({
      success: true,
      impostos
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular impostos',
      error: error.message
    })
  }
}

/**
 * Calcular impostos aproximados de todas as notas de um período
 * GET /api/notas-fiscais/impostos/:periodo
 * Params: periodo (formato YYYY-MM)
 */
async function calcularImpostosPeriodo(req, res) {
  try {
    const { periodo } = req.params
    
    // Validar formato do período
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de período inválido. Use YYYY-MM (ex: 2024-01)'
      })
    }
    
    // Buscar configuração fiscal
    const fiscalConfig = require('../config/fiscal')
    
    // Buscar notas do período (apenas autorizadas)
    const resultadoPeriodo = await NotaFiscalModel.listar({
      status: 'autorizada',
      periodo,
      limite: 10000
    })
    
    // Buscar todas as notas para calcular receita bruta 12 meses
    const resultadoTotal = await NotaFiscalModel.listar({ limite: 10000 })
    
    const { calcularImpostos, calcularReceitaBruta12Meses } = require('../utils/impostoCalculator')
    const receitaBruta12Meses = calcularReceitaBruta12Meses(resultadoTotal.notas || [])
    
    // Calcular impostos para cada nota
    const notasComImpostos = resultadoPeriodo.notas.map(nota => {
      const impostos = calcularImpostos({
        valorTotal: nota.valor,
        empresaCrt: fiscalConfig.EMPRESA_CONFIG.crt,
        receitaBruta12Meses,
        uf: fiscalConfig.EMPRESA_CONFIG.endereco.uf
      })
      
      return {
        notaId: nota.id,
        numero: nota.numero,
        valor: nota.valor,
        impostos
      }
    })
    
    // Calcular totais
    const totais = notasComImpostos.reduce((acc, item) => {
      return {
        valorTotal: acc.valorTotal + item.valor,
        totalImpostos: acc.totalImpostos + item.impostos.totalImpostos,
        totalLiquido: acc.totalLiquido + item.impostos.valorLiquido
      }
    }, { valorTotal: 0, totalImpostos: 0, totalLiquido: 0 })
    
    // Percentual médio
    const percentualMedio = totais.valorTotal > 0 
      ? (totais.totalImpostos / totais.valorTotal) * 100 
      : 0
    
    res.json({
      success: true,
      periodo,
      quantidadeNotas: notasComImpostos.length,
      regime: notasComImpostos[0]?.impostos?.regime || 'Simples Nacional',
      receitaBruta12Meses,
      totais: {
        valorTotal: parseFloat(totais.valorTotal.toFixed(2)),
        totalImpostos: parseFloat(totais.totalImpostos.toFixed(2)),
        totalLiquido: parseFloat(totais.totalLiquido.toFixed(2)),
        percentualMedio: parseFloat(percentualMedio.toFixed(2))
      },
      notas: notasComImpostos
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao calcular impostos do período',
      error: error.message
    })
  }
}

module.exports = {
  listar,
  buscarPorId,
  emitir,
  consultarStatusRapido,
  consultarStatus,
  cancelar,
  downloadXML,
  downloadDANFE,
  downloadMesZip,
  obterEstatisticas,
  obterEstatisticasPorPeriodo,
  calcularImpostosNota,
  calcularImpostosPeriodo
}
