// =============================================================================
// controllers/notasFiscaisController.js — Controlador de Notas Fiscais
// =============================================================================
// Gerencia requisições HTTP relacionadas a notas fiscais eletrônicas.
// =============================================================================

const NotaFiscalService = require('../services/NotaFiscalService')
const NotaFiscalModel = require('../models/NotaFiscalModel')

/**
 * Listar notas fiscais
 * GET /api/notas-fiscais
 */
async function listar(req, res) {
  try {
    const { status, periodo, busca, limite, pagina } = req.query
    
    console.log(`[listar] Listando notas fiscais - Status: ${status || 'todos'} | Período: ${periodo || 'todos'}`)
    
    const resultado = await NotaFiscalModel.listar({
      status,
      periodo,
      busca,
      limite: parseInt(limite) || 50,
      pagina: parseInt(pagina) || 1
    })
    
    console.log(`[listar] ${resultado.notas?.length || 0} nota(s) encontrada(s)`)
    
    res.json({
      success: true,
      ...resultado
    })
  } catch (error) {
    console.error('[listar] Erro:', error)
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
    
    console.log(`[buscarPorId] Buscando nota fiscal ID: ${id}`)
    
    // Validar ID
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      })
    }
    
    const nota = await NotaFiscalModel.buscarPorId(id)
    
    if (!nota) {
      console.warn(`[buscarPorId] Nota fiscal não encontrada - ID: ${id}`)
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
    
    // Buscar configuração fiscal (do .env)
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
    
    console.log(`[emitir] Emitindo nota fiscal - Pedido: ${pedidoId} | Usuário: ${usuarioId}`)
    
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
    
    console.log(`[emitir] Nota fiscal emitida - ID: ${nota.id} | Status: ${nota.status}`)
    
    res.status(201).json({
      success: true,
      message: 'Nota fiscal emitida com sucesso',
      nota
    })
  } catch (error) {
    console.error('[emitir] Erro:', error)
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
    
    const notaAtualizada = await NotaFiscalService.consultarStatus(id, usuarioId)
    
    res.json({
      success: true,
      message: 'Status consultado com sucesso',
      nota: notaAtualizada
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
 * Consultar status de múltiplas notas em batch
 * POST /api/notas-fiscais/consultar-status-batch
 * Body: { notasIds: [1, 2, 3] }
 */
async function consultarStatusBatch(req, res) {
  try {
    const { notasIds } = req.body
    const usuarioId = req.usuario.id
    
    if (!Array.isArray(notasIds) || notasIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array de IDs é obrigatório'
      })
    }
    
    if (notasIds.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Máximo de 10 notas por consulta'
      })
    }
    
    // Consultar status de todas as notas
    const resultados = []
    
    for (const notaId of notasIds) {
      try {
        const notaAtualizada = await NotaFiscalService.consultarStatus(notaId, usuarioId)
        resultados.push({
          notaId,
          success: true,
          nota: notaAtualizada
        })
      } catch (error) {
        resultados.push({
          notaId,
          success: false,
          error: error.message
        })
      }
    }
    
    res.json({
      success: true,
      resultados
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao consultar status em lote',
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
 * ════════════════════════════════════════════════════════════════════════════
 * HELPER: Download de Backup do Focus NFe
 * ════════════════════════════════════════════════════════════════════════════
 * Função auxiliar para fazer download de backups (DANFEs ou XMLs) da API Focus NFe
 * usando autenticação Basic com username e password do .env
 * 
 * @param {Object} params - Parâmetros do download
 * @param {string} params.periodo - Período no formato YYYY-MM
 * @param {string} params.tipo - Tipo de arquivo ('danfes' ou 'xmls')
 * @param {Object} params.res - Objeto response do Express
 * @param {string} params.usuarioId - ID do usuário que solicitou o download
 * ════════════════════════════════════════════════════════════════════════════
 */
async function downloadBackupFocusNFe({ periodo, tipo, res, usuarioId }) {
  const fiscalConfig = require('../config/fiscal')
  const isDebug = fiscalConfig.DEBUG === true
  
  return new Promise((resolve, reject) => {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. VALIDAÇÕES DE SEGURANÇA
    // ═══════════════════════════════════════════════════════════════════════
    
    // Validar formato do período (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de período inválido. Use YYYY-MM (ex: 2024-01)'
      })
    }
    
    // Validar se o período não é futuro
    const [ano, mes] = periodo.split('-').map(Number)
    const periodoDate = new Date(ano, mes - 1, 1)
    const hoje = new Date()
    
    const hojeSemDia = new Date(hoje)
    hojeSemDia.setDate(1) // Comparar apenas ano e mês
    
    if (periodoDate > hojeSemDia) {
      if (isDebug) console.warn(`[downloadBackup] Período futuro solicitado: ${periodo}`)
      return res.status(400).json({
        success: false,
        message: 'Não é possível baixar backup de períodos futuros'
      })
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 2. VALIDAÇÃO DE DATA DE LIBERAÇÃO (DIA 2 DO MÊS SEGUINTE)
    // ═══════════════════════════════════════════════════════════════════════
    const dataLiberacao = new Date(ano, mes, 2) // Mês seguinte, dia 2
    
    if (hoje < dataLiberacao) {
      if (isDebug) {
        console.warn(`[downloadBackup] Tentativa de download antes da data de liberação`)
        console.warn(`[downloadBackup] Período: ${periodo}, Liberação: ${dataLiberacao.toISOString().split('T')[0]}`)
      }
      
      return res.status(403).json({
        success: false,
        message: 'Backup estará disponível a partir do dia 2 do próximo mês',
        detalhes: {
          periodo,
          dataLiberacao: dataLiberacao.toISOString().split('T')[0],
          observacao: 'O Focus NFe gera backups mensais no dia 1º de cada mês. Recomenda-se fazer o download a partir do dia 2.'
        }
      })
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 3. CONFIGURAÇÃO E AUTENTICAÇÃO FOCUS NFE
    // ═══════════════════════════════════════════════════════════════════════
    
    const username = process.env.FOCUS_NFE_USERNAME
    const password = process.env.FOCUS_NFE_PASSWORD
    const cnpj = process.env.EMPRESA_CNPJ
    
    if (!username || !password) {
      console.error('[downloadBackup] Credenciais do Focus NFe não configuradas')
      return res.status(500).json({
        success: false,
        message: 'Credenciais de autenticação não configuradas. Verifique FOCUS_NFE_USERNAME e FOCUS_NFE_PASSWORD no .env'
      })
    }
    
    if (!cnpj) {
      console.error('[downloadBackup] CNPJ da empresa não configurado')
      return res.status(500).json({
        success: false,
        message: 'CNPJ da empresa não configurado. Verifique EMPRESA_CNPJ no .env'
      })
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 4. REQUISIÇÃO À API FOCUS NFE
    // ═══════════════════════════════════════════════════════════════════════
    
    const https = require('https')
    const http = require('http')
    
    const baseUrl = fiscalConfig.IS_PRODUCAO 
      ? 'https://api.focusnfe.com.br' 
      : 'https://homologacao.focusnfe.com.br'
    
    const backupUrl = `${baseUrl}/v2/backups/${cnpj}.json`
    
    // Log informativo em produção
    console.log(`[downloadBackup] Download de ${tipo} solicitado - Período: ${periodo} | Usuário: ${usuarioId}`)
    
    // Logs detalhados apenas em debug
    if (isDebug) {
      console.log(`[downloadBackup] CNPJ: ${cnpj}`)
      console.log(`[downloadBackup] Ambiente: ${fiscalConfig.ENV}`)
      console.log(`[downloadBackup] URL: ${backupUrl}`)
    }
    
    const auth = Buffer.from(`${username}:${password}`).toString('base64')
    const protocolo = baseUrl.startsWith('https') ? https : http
    const url = new URL(backupUrl)
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 60000
    }
    
    const proxyReq = protocolo.request(options, (proxyRes) => {
      const statusCode = proxyRes.statusCode
      
      // ═══════════════════════════════════════════════════════════════════════
      // 5. TRATAMENTO DE ERROS DA API
      // ═══════════════════════════════════════════════════════════════════════
      
      if (statusCode === 404) {
        console.warn(`[downloadBackup] Backup não encontrado - Período: ${periodo}`)
        return res.status(404).json({
          success: false,
          message: 'Backup não disponível para este período. O backup pode ainda não ter sido gerado ou não há notas neste período.'
        })
      }
      
      if (statusCode === 401 || statusCode === 403) {
        let errorData = ''
        proxyRes.on('data', (chunk) => {
          errorData += chunk.toString()
        })
        
        proxyRes.on('end', () => {
          console.error(`[downloadBackup] Erro de autenticação: ${statusCode}`)
          
          if (isDebug) {
            console.error(`[downloadBackup] Detalhes do erro: ${errorData}`)
            console.error(`[downloadBackup] Username: ${username ? username.substring(0, 10) + '...' : 'não definido'}`)
          }
          
          return res.status(401).json({
            success: false,
            message: 'Erro de autenticação com a Focus NFe. Verifique as credenciais FOCUS_NFE_USERNAME e FOCUS_NFE_PASSWORD no .env'
          })
        })
        
        return
      }
      
      if (statusCode !== 200) {
        console.error(`[downloadBackup] Erro inesperado da API: ${statusCode}`)
        
        let errorData = ''
        proxyRes.on('data', (chunk) => {
          errorData += chunk.toString()
        })
        
        proxyRes.on('end', () => {
          if (isDebug) console.error(`[downloadBackup] Resposta: ${errorData}`)
          return res.status(statusCode).json({
            success: false,
            message: 'Erro ao buscar backup na API Focus NFe'
          })
        })
        
        return
      }
      
      // ═══════════════════════════════════════════════════════════════════════
      // 6. PROCESSAR RESPOSTA E LOCALIZAR BACKUP DO PERÍODO
      // ═══════════════════════════════════════════════════════════════════════
      
      let jsonData = ''
      proxyRes.on('data', (chunk) => {
        jsonData += chunk.toString()
      })
      
      proxyRes.on('end', () => {
        try {
          const backupList = JSON.parse(jsonData)
          
          if (isDebug) {
            console.log(`[downloadBackup] Backups disponíveis: ${Array.isArray(backupList) ? backupList.length : 'formato inválido'}`)
          }
          
          // Normalizar período (remover hífen): "2026-08" -> "202608"
          const periodoNormalizado = periodo.replace('-', '')
          
          // Encontrar backup do período solicitado
          const backupMes = Array.isArray(backupList) ? backupList.find(b => b.mes === periodoNormalizado) : null
          
          if (!backupMes) {
            console.warn(`[downloadBackup] Período ${periodo} não encontrado nos backups disponíveis`)
            
            if (isDebug && Array.isArray(backupList)) {
              console.log(`[downloadBackup] Períodos disponíveis: ${backupList.map(b => b.mes).join(', ')}`)
            }
            
            return res.status(404).json({
              success: false,
              message: `Backup não disponível para o período ${periodo}. Verifique se há notas emitidas neste período.`
            })
          }
          
          // Obter URL de download
          let downloadUrl = null
          let nomeArquivo = null
          
          if (tipo === 'danfes') {
            downloadUrl = backupMes.danfes
            nomeArquivo = `DANFEs_NFCe_${periodo}.zip`
            
            if (!downloadUrl) {
              console.warn(`[downloadBackup] DANFEs não disponíveis - Período: ${periodo}`)
              return res.status(404).json({
                success: false,
                message: 'DANFEs não disponíveis para este período. Isso pode ocorrer quando apenas XMLs foram gerados.'
              })
            }
          } else if (tipo === 'xmls') {
            downloadUrl = backupMes.xmls
            nomeArquivo = `XMLs_NFCe_${periodo}.zip`
            
            if (!downloadUrl) {
              console.error(`[downloadBackup] XMLs não disponíveis - Período: ${periodo}`)
              return res.status(404).json({
                success: false,
                message: 'XMLs não disponíveis para este período.'
              })
            }
          }
          
          if (isDebug) {
            console.log(`[downloadBackup] Backup encontrado - Tipo: ${tipo} | URL: ${downloadUrl.substring(0, 50)}...`)
          }
          
          // ═══════════════════════════════════════════════════════════════════
          // 7. DOWNLOAD E STREAMING DO ARQUIVO ZIP
          // ═══════════════════════════════════════════════════════════════════
          
          const fileUrl = new URL(downloadUrl)
          const fileProtocolo = downloadUrl.startsWith('https') ? https : http
          
          const fileOptions = {
            hostname: fileUrl.hostname,
            port: fileUrl.port || (fileUrl.protocol === 'https:' ? 443 : 80),
            path: fileUrl.pathname + fileUrl.search,
            method: 'GET',
            timeout: 120000
          }
          
          const fileReq = fileProtocolo.request(fileOptions, (fileRes) => {
            if (fileRes.statusCode !== 200) {
              console.error(`[downloadBackup] Erro ao baixar arquivo: ${fileRes.statusCode}`)
              return res.status(fileRes.statusCode).json({
                success: false,
                message: 'Erro ao baixar arquivo ZIP'
              })
            }
            
            // Configurar headers da resposta
            res.set({
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            })
            
            if (fileRes.headers['content-length']) {
              res.set('Content-Length', fileRes.headers['content-length'])
            }
            
            // Streaming do arquivo para o cliente
            fileRes.pipe(res)
            
            fileRes.on('end', () => {
              console.log(`[downloadBackup] Download concluído - Tipo: ${tipo} | Período: ${periodo} | Usuário: ${usuarioId}`)
              resolve()
            })
            
            fileRes.on('error', (err) => {
              console.error(`[downloadBackup] Erro no streaming:`, err)
              reject(err)
            })
          })
          
          fileReq.on('error', (err) => {
            console.error(`[downloadBackup] Erro ao baixar arquivo:`, err)
            if (!res.headersSent) {
              return res.status(500).json({
                success: false,
                message: 'Erro ao baixar arquivo ZIP'
              })
            }
            reject(err)
          })
          
          fileReq.on('timeout', () => {
            console.error(`[downloadBackup] Timeout ao baixar arquivo`)
            fileReq.destroy()
            if (!res.headersSent) {
              return res.status(504).json({
                success: false,
                message: 'Timeout ao baixar arquivo. Tente novamente.'
              })
            }
            reject(new Error('Timeout'))
          })
          
          fileReq.end()
          
        } catch (parseError) {
          console.error(`[downloadBackup] Erro ao processar resposta da API:`, parseError)
          return res.status(500).json({
            success: false,
            message: 'Erro ao processar resposta da API'
          })
        }
      })
    })
    
    proxyReq.on('error', (err) => {
      console.error(`[downloadBackup] Erro ao conectar com Focus NFe:`, err)
      
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao conectar com o servidor do Focus NFe. Tente novamente.'
        })
      }
      reject(err)
    })
    
    proxyReq.on('timeout', () => {
      console.error(`[downloadBackup] Timeout na requisição ao Focus NFe`)
      proxyReq.destroy()
      
      if (!res.headersSent) {
        return res.status(504).json({
          success: false,
          message: 'Timeout ao buscar informações do backup. Tente novamente.'
        })
      }
      reject(new Error('Timeout'))
    })
    
    proxyReq.end()
  })
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ENDPOINT: Download de DANFEs do Mês
 * ════════════════════════════════════════════════════════════════════════════
 * GET /api/notas-fiscais/download-danfes/:periodo
 * 
 * Baixa o arquivo ZIP contendo todos os PDFs (DANFEs) das notas fiscais
 * do período especificado através da API Focus NFe v2/backups
 * 
 * @param {string} periodo - Formato YYYY-MM (ex: 2024-01)
 * @returns {file} Arquivo ZIP com os DANFEs
 * ════════════════════════════════════════════════════════════════════════════
 */
async function downloadDanfesMes(req, res) {
  try {
    const { periodo } = req.params
    const usuarioId = req.usuario?.id
    
    await downloadBackupFocusNFe({
      periodo,
      tipo: 'danfes',
      res,
      usuarioId
    })
    
  } catch (error) {
    console.error('[downloadDanfesMes] Erro inesperado:', error)
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar arquivo de DANFEs',
        error: error.message
      })
    }
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ENDPOINT: Download de XMLs do Mês
 * ════════════════════════════════════════════════════════════════════════════
 * GET /api/notas-fiscais/download-xmls/:periodo
 * 
 * Baixa o arquivo ZIP contendo todos os arquivos XML das notas fiscais
 * do período especificado através da API Focus NFe v2/backups
 * 
 * @param {string} periodo - Formato YYYY-MM (ex: 2024-01)
 * @returns {file} Arquivo ZIP com os XMLs
 * ════════════════════════════════════════════════════════════════════════════
 */
async function downloadXmlsMes(req, res) {
  try {
    const { periodo } = req.params
    const usuarioId = req.usuario?.id
    
    await downloadBackupFocusNFe({
      periodo,
      tipo: 'xmls',
      res,
      usuarioId
    })
    
  } catch (error) {
    console.error('[downloadXmlsMes] Erro inesperado:', error)
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar arquivo de XMLs',
        error: error.message
      })
    }
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
  consultarStatusBatch,
  cancelar,
  downloadXML,
  downloadDANFE,
  downloadDanfesMes,
  downloadXmlsMes,
  obterEstatisticas,
  obterEstatisticasPorPeriodo,
  calcularImpostosNota,
  calcularImpostosPeriodo
}
