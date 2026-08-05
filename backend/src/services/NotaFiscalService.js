// ════════════════════════════════════════════════════════════════════════════
// services/NotaFiscalService.js — Lógica de Negócio de Notas Fiscais
// ════════════════════════════════════════════════════════════════════════════
// Orquestra a emissão, consulta e cancelamento de notas fiscais:
// - Validações de negócio
// - Comunicação com SEFAZ via Focus NFe
// - Persistência no banco de dados
// - Audit log
// 
// SEGURANÇA: Configurações fiscais vêm APENAS do .env.fiscal
// ════════════════════════════════════════════════════════════════════════════

const NotaFiscalModel = require('../models/NotaFiscalModel')
const fiscalConfig = require('../config/fiscal')
const focusClient = require('./FocusNFeClient')
const pool = require('../config/database')
const { verificarPrazoCancelamento, traduzirErroSEFAZ } = require('../utils/fiscalHelpers')

class NotaFiscalService {
  
  /**
   * Emitir nova nota fiscal eletrônica
   */
  static async emitir(pedidoId, usuarioId, dadosAdicionais = {}) {
    try {
      // 1. Buscar pedido com itens
      const pedidoResult = await pool.query(`
        SELECT 
          p.*,
          json_agg(
            json_build_object(
              'produtoId', ip.produto_id,
              'quantidade', ip.quantidade,
              'precoUnitario', ip.preco_unitario,
              'nomeProduto', pr.nome,
              'ncm', pr.ncm
            )
          ) as itens
        FROM pedidos p
        LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
        LEFT JOIN produtos pr ON pr.id = ip.produto_id
        WHERE p.id = $1
        GROUP BY p.id
      `, [pedidoId])
      
      if (pedidoResult.rows.length === 0) {
        throw new Error('Pedido não encontrado')
      }
      
      const pedido = pedidoResult.rows[0]
      
      // 2. Verificar se já existe nota para este pedido
      const notaExistente = await NotaFiscalModel.buscarPorPedidoId(pedidoId)
      if (notaExistente && notaExistente.status !== 'erro') {
        throw new Error('Já existe uma nota fiscal para este pedido')
      }
      
      // 3. Validar configuração fiscal (do .env.fiscal)
      fiscalConfig.validate()
      
      // 4. Montar payload da NFC-e (Modelo 65 - SEM dados do cliente)
      const payload = {
        // ═══════════════════════════════════════════════════════════
        // DADOS DO EMITENTE (EMPRESA) - DO .env.fiscal
        // ═══════════════════════════════════════════════════════════
        cnpj_emitente: String(fiscalConfig.EMPRESA_CONFIG.cnpj).replace(/\D/g, ''), // Remove formatação
        
        // ═══════════════════════════════════════════════════════════
        // DADOS DA OPERAÇÃO (OBRIGATÓRIOS)
        // ═══════════════════════════════════════════════════════════
        data_emissao: new Date().toISOString(), // Data e hora atual
        indicador_inscricao_estadual_destinatario: "9", // Não contribuinte
        modalidade_frete: "9", // Sem frete
        local_destino: "1", // Operação interna
        presenca_comprador: "1", // Presencial
        natureza_operacao: "VENDA AO CONSUMIDOR",
        
        // Itens
        items: (pedido.itens || []).map((item, index) => ({
          numero_item: String(index + 1),
          codigo_produto: String(item.produtoId),
          descricao: item.nomeProduto,
          codigo_ncm: item.ncm || '21069090', // NCM padrão para churrasco
          cfop: '5102', // Venda de mercadoria adquirida de terceiros
          unidade_comercial: 'UN',
          quantidade_comercial: item.quantidade,
          valor_unitario_comercial: parseFloat(item.precoUnitario),
          valor_bruto: item.quantidade * parseFloat(item.precoUnitario),
          unidade_tributavel: 'UN',
          quantidade_tributavel: item.quantidade,
          valor_unitario_tributavel: parseFloat(item.precoUnitario),
          
          // ICMS - Simples Nacional
          icms_origem: '0', // Nacional
          icms_situacao_tributaria: '102', // Simples Nacional sem permissão de crédito
        })),
        
        // Formas de pagamento
        formas_pagamento: [{
          forma_pagamento: pedido.forma_pagamento === 'dinheiro' ? '01' : 
                          pedido.forma_pagamento === 'pix' ? '17' : 
                          pedido.forma_pagamento === 'cartao_credito' ? '03' :
                          pedido.forma_pagamento === 'cartao_debito' ? '04' : '99',
          valor_pagamento: parseFloat(pedido.total)
        }]
      }
      
      // Adicionar troco se houver (para pagamento em dinheiro)
      if (pedido.forma_pagamento === 'dinheiro' && pedido.valor_recebido && 
          parseFloat(pedido.valor_recebido) > parseFloat(pedido.total)) {
        const troco = parseFloat(pedido.valor_recebido) - parseFloat(pedido.total)
        payload.valor_troco = troco
        payload.formas_pagamento[0].valor_pagamento = parseFloat(pedido.valor_recebido)
      }
      
      // 5. Criar registro inicial no banco (status: emitindo)
      const referencia = `pedido_${pedidoId}_${Date.now()}` // Referência única
      
      const notaId = await NotaFiscalModel.criar({
        pedido_id: pedidoId,
        valor_total: pedido.total,
        numero: null, // Será atualizado após envio
        status: 'emitindo',
        destinatario_nome: 'CONSUMIDOR FINAL', // NFC-e sem identificação
        destinatario_cnpj_cpf: null, // NFC-e sem CPF/CNPJ
        provider_ref: referencia, // Guardar referência para consultas futuras
        emitido_em: new Date()
      })
      
      // 6. Configurar token do Focus NFe (do .env.fiscal)
      focusClient.setToken(fiscalConfig.API_TOKEN)
      
      // 7. Enviar para SEFAZ via Focus NFe
      try {
        const respostaFocus = await focusClient.autorizarNFCe(referencia, payload)
        
        // 8. Atualizar nota com resposta inicial da SEFAZ
        const statusInicial = respostaFocus.data.status
        
        await NotaFiscalModel.atualizar(notaId, {
          status: statusInicial === 'autorizado' ? 'autorizada' : 'emitindo',
          numero: respostaFocus.data.numero,
          serie: respostaFocus.data.serie,
          chave_acesso: respostaFocus.data.chave_nfe,
          protocolo: respostaFocus.data.protocolo,
          autorizado_em: statusInicial === 'autorizado' ? new Date() : null,
          xml_nfe: respostaFocus.data.caminho_xml_nota_fiscal,
          danfe_url: respostaFocus.data.caminho_danfe,
          metadados: respostaFocus.data
        })
        
        console.log(`[NotaFiscalService] Status inicial: ${statusInicial}`)
        
        // 9. Se status é "processando_autorizacao", aguardar autorização (polling otimizado)
        if (statusInicial === 'processando_autorizacao' || statusInicial === 'emitindo') {
          console.log('[NotaFiscalService] Aguardando autorização da SEFAZ (polling otimizado a cada 500ms)...')
          
          // Polling otimizado: consultar status até obter resposta definitiva (max 15 segundos)
          // Se demorar mais, continua em background sem bloquear a resposta
          const notaFinal = await this._aguardarAutorizacao(referencia, notaId, 15000)
          return notaFinal
        }
        
        // Buscar nota atualizada
        return await NotaFiscalModel.buscarPorId(notaId)
        
      } catch (error) {
        // Atualizar nota com erro
        await NotaFiscalModel.atualizar(notaId, {
          status: 'erro',
          metadados: { 
            erro: error.message,
            resposta_sefaz: error.response?.data || null
          }
        })
        
        throw new Error(`Erro ao enviar nota para SEFAZ: ${error.message}`)
      }
      
    } catch (error) {
      console.error('[NotaFiscalService.emitir] Erro:', error)
      throw error
    }
  }
  
  /**
   * Consultar status de uma nota na SEFAZ
   */
  static async consultarStatus(notaId, usuarioId) {
    try {
      const nota = await NotaFiscalModel.buscarPorId(notaId)
      
      if (!nota) {
        throw new Error('Nota fiscal não encontrada')
      }
      
      // Se já está autorizada ou cancelada, retornar status atual
      if (nota.status === 'autorizada' || nota.status === 'cancelada') {
        return {
          status: nota.status,
          chave: nota.chaveAcesso,
          protocolo: nota.protocolo,
          mensagem: `Nota fiscal ${nota.status}`
        }
      }
      
      // Usar a referência armazenada no banco
      const referencia = nota.providerRef
      
      if (!referencia) {
        throw new Error('Referência da nota não encontrada. Não é possível consultar o status.')
      }
      
      const resultado = await focusClient.consultarNFCe(referencia)
      const statusAtual = resultado.data.status
      
      // Atualizar nota com novo status
      await NotaFiscalModel.atualizar(notaId, {
        status: statusAtual === 'autorizado' ? 'autorizada' : 
                statusAtual === 'erro_autorizacao' ? 'erro' : 'emitindo',
        chave_acesso: resultado.data.chave_nfe || nota.chaveAcesso,
        protocolo: resultado.data.protocolo || nota.protocolo,
        autorizado_em: statusAtual === 'autorizado' && !nota.autorizadoEm ? new Date() : nota.autorizadoEm,
        xml_nfe: resultado.data.caminho_xml_nota_fiscal || nota.xmlNfe,
        danfe_url: resultado.data.caminho_danfe || nota.danfeUrl,
        metadados: {
          ...nota.metadados,
          mensagem_sefaz: resultado.data.mensagem_sefaz || null,
          ultima_consulta: new Date(),
          resultado_consulta: resultado.data
        }
      })
      
      return {
        status: statusAtual,
        chave: resultado.data.chave_nfe,
        protocolo: resultado.data.protocolo,
        mensagem: resultado.data.mensagem_sefaz
      }
      
    } catch (error) {
      console.error('[NotaFiscalService.consultarStatus] Erro:', error)
      throw error
    }
  }
  
  /**
   * Cancelar nota fiscal (prazo de 24h)
   */
  static async cancelar(notaId, motivo, usuarioId, userIp) {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Configurar token do Focus NFe (do .env.fiscal)
      focusClient.setToken(fiscalConfig.API_TOKEN)
      
      // 2. Buscar nota com lock (evita race conditions)
      const notaResult = await client.query(
        'SELECT * FROM notas_fiscais WHERE id = $1 FOR UPDATE',
        [notaId]
      )
      
      if (notaResult.rows.length === 0) {
        throw new Error('Nota fiscal não encontrada')
      }
      
      const nota = notaResult.rows[0]
      
      // 3. Validar status
      if (nota.status !== 'autorizada') {
        throw new Error('Apenas notas autorizadas podem ser canceladas')
      }
      
      if (nota.status === 'cancelada') {
        throw new Error('Esta nota já foi cancelada')
      }
      
      // 4. Validar prazo de 24 horas
      const { dentroDoPrazo, horasRestantes, mensagem } = verificarPrazoCancelamento(nota.autorizado_em)
      
      if (!dentroDoPrazo) {
        throw new Error(`Prazo expirado para cancelamento. ${mensagem}. Para reverter a venda, emita uma nota de devolução.`)
      }
      
      // 5. Validar motivo
      if (!motivo || motivo.length < 15) {
        throw new Error('O motivo do cancelamento deve ter no mínimo 15 caracteres')
      }
      
      if (motivo.length > 255) {
        throw new Error('O motivo do cancelamento deve ter no máximo 255 caracteres')
      }
      
      console.log(`[cancelar] Cancelando nota ${notaId}. Prazo restante: ${horasRestantes.toFixed(1)}h`)
      
      const inicioProcessamento = Date.now()
      
      // 6. Usar a referência armazenada no banco
      const referencia = nota.provider_ref
      
      if (!referencia) {
        throw new Error('Referência da nota não encontrada. Não é possível cancelar.')
      }
      
      // 7. Enviar cancelamento para SEFAZ via Focus NFe
      try {
        const respostaCancelamento = await focusClient.cancelarNFCe(referencia, motivo)
        
        const tempoProcessamento = Date.now() - inicioProcessamento
        
        // 8. Atualizar nota no banco
        await client.query(`
          UPDATE notas_fiscais 
          SET 
            status = 'cancelada',
            cancelado_em = NOW(),
            motivo_cancelamento = $1,
            metadados = $2,
            atualizado_em = NOW()
          WHERE id = $3
        `, [
          motivo,
          JSON.stringify({
            ...(nota.metadados || {}),
            cancelamento: {
              protocolo: respostaCancelamento.data?.protocolo || respostaCancelamento.data?.protocolo_cancelamento,
              data_cancelamento: new Date().toISOString(),
              tempo_processamento_ms: tempoProcessamento,
              resposta_sefaz: respostaCancelamento.data
            }
          }),
          notaId
        ])
        
        // 9. Registrar em audit log
        await client.query(`
          INSERT INTO audit_log_fiscal (
            operacao, entidade, entidade_id, usuario_id, ip_address,
            dados_anteriores, dados_novos, resultado, mensagem
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          'cancelamento',
          'nota_fiscal',
          notaId,
          usuarioId,
          userIp,
          JSON.stringify({ status: 'autorizada', chave: nota.chave_acesso }),
          JSON.stringify({ 
            status: 'cancelada', 
            motivo,
            protocolo: respostaCancelamento.data?.protocolo || respostaCancelamento.data?.protocolo_cancelamento,
            prazo_restante_horas: horasRestantes,
            tempo_processamento_ms: tempoProcessamento
          }),
          'sucesso',
          'Nota fiscal cancelada com sucesso'
        ])
        
        await client.query('COMMIT')
        
        console.log(`[cancelar] Nota ${notaId} cancelada com sucesso (${tempoProcessamento}ms)`)
        
        // Retornar nota atualizada
        return await NotaFiscalModel.buscarPorId(notaId)
        
      } catch (error) {
        await client.query('ROLLBACK')
        
        // Registrar erro no audit log
        await pool.query(`
          INSERT INTO audit_log_fiscal (
            operacao, entidade, entidade_id, usuario_id, ip_address,
            erro_detalhes, resultado, mensagem
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          'cancelamento_falhou',
          'nota_fiscal',
          notaId,
          usuarioId,
          userIp,
          JSON.stringify({ erro: error.message, stack: error.stack }),
          'erro',
          error.message
        ])
        
        const mensagemTraduzida = traduzirErroSEFAZ(error)
        throw new Error(mensagemTraduzida)
      }
      
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[NotaFiscalService.cancelar] Erro:', error)
      throw error
    } finally {
      client.release()
    }
  }
  
  /**
   * Download do XML da nota
   */
  static async downloadXML(notaId, configureToken = true) {
    try {
      // Configurar token antes de cada download (importante para chamadas em lote)
      if (configureToken) {
        focusClient.setToken(fiscalConfig.API_TOKEN)
      }
      
      const nota = await NotaFiscalModel.buscarPorId(notaId)
      
      if (!nota) {
        throw new Error('Nota fiscal não encontrada')
      }
      
      if (nota.status !== 'autorizada' && nota.status !== 'cancelada') {
        throw new Error('XML disponível apenas para notas autorizadas ou canceladas')
      }
      
      // Se já temos o caminho do XML salvo, usar ele
      if (nota.xmlNfe) {
        try {
          const xml = await focusClient.downloadXMLPorCaminho(nota.xmlNfe)
          return xml
        } catch (error) {
          console.warn('[downloadXML] Erro ao baixar via caminho salvo, tentando via referência:', error.message)
        }
      }
      
      // Caso contrário, consultar pela referência
      const referencia = nota.providerRef
      
      if (!referencia) {
        throw new Error('Referência da nota não encontrada')
      }
      
      // Usar o endpoint correto para NFC-e
      const resultado = await focusClient.consultarNFCe(referencia)
      
      if (resultado.data.caminho_xml_nota_fiscal) {
        const xml = await focusClient.downloadXMLPorCaminho(resultado.data.caminho_xml_nota_fiscal)
        
        // Atualizar o caminho no banco para próximas consultas
        await NotaFiscalModel.atualizar(notaId, {
          xml_nfe: resultado.data.caminho_xml_nota_fiscal
        })
        
        return xml
      }
      
      throw new Error('XML não disponível para esta nota')
      
    } catch (error) {
      console.error('[NotaFiscalService.downloadXML] Erro:', error)
      throw error
    }
  }
  
  /**
   * Aguarda autorização da SEFAZ com polling otimizado
   * @private
   */
  static async _aguardarAutorizacao(referencia, notaId, timeoutMs = 15000) {
    const startTime = Date.now()
    const intervalo = 500 // Consultar a cada 500ms (mais rápido!)
    const maxTentativas = 30 // Máximo 30 tentativas (15 segundos)
    let tentativa = 0
    
    while (Date.now() - startTime < timeoutMs && tentativa < maxTentativas) {
      tentativa++
      
      // Aguardar intervalo (exceto na primeira tentativa)
      if (tentativa > 1) {
        await new Promise(resolve => setTimeout(resolve, intervalo))
      }
      
      try {
        // Consultar status na Focus NFe
        const respostaConsulta = await focusClient.consultarNFCe(referencia)
        const statusAtual = respostaConsulta.data.status
        
        console.log(`[_aguardarAutorizacao] Tentativa ${tentativa}: ${statusAtual}`)
        
        // Status definitivos (parar polling)
        if (statusAtual === 'autorizado') {
          await NotaFiscalModel.atualizar(notaId, {
            status: 'autorizada',
            numero: respostaConsulta.data.numero,
            serie: respostaConsulta.data.serie,
            chave_acesso: respostaConsulta.data.chave_nfe,
            protocolo: respostaConsulta.data.protocolo,
            autorizado_em: new Date(),
            xml_nfe: respostaConsulta.data.caminho_xml_nota_fiscal,
            danfe_url: respostaConsulta.data.caminho_danfe,
            metadados: respostaConsulta.data
          })
          
          console.log(`[_aguardarAutorizacao] ✓ Nota AUTORIZADA em ${Date.now() - startTime}ms`)
          return await NotaFiscalModel.buscarPorId(notaId)
        }
        
        if (statusAtual === 'erro_autorizacao' || statusAtual === 'denegado' || statusAtual === 'cancelado') {
          await NotaFiscalModel.atualizar(notaId, {
            status: 'erro',
            metadados: respostaConsulta.data
          })
          
          throw new Error(`Erro na autorização: ${respostaConsulta.data.mensagem_sefaz || statusAtual}`)
        }
        
        // Se ainda está processando, continuar polling
        
      } catch (error) {
        // Se for erro de autorização, propagar
        if (error.message.includes('Erro na autorização')) {
          throw error
        }
        
        console.error(`[_aguardarAutorizacao] Erro na tentativa ${tentativa}:`, error.message)
        
        // Se for erro de comunicação e ainda há tempo, continuar tentando
        if (Date.now() - startTime >= timeoutMs || tentativa >= maxTentativas) {
          throw error
        }
      }
    }
    
    // Timeout atingido - iniciar polling em background
    console.warn(`[_aguardarAutorizacao] ⚠️  Timeout de ${timeoutMs}ms atingido. Iniciando polling em background...`)
    
    // Polling em background (não bloqueia resposta)
    this._pollingBackgroundAutorizacao(referencia, notaId).catch(err => {
      console.error('[_pollingBackgroundAutorizacao] Erro:', err)
    })
    
    return await NotaFiscalModel.buscarPorId(notaId)
  }
  
  /**
   * Polling em background para notas que demoraram mais que o esperado
   * @private
   */
  static async _pollingBackgroundAutorizacao(referencia, notaId) {
    const maxTentativasBackground = 60 // 60 tentativas x 2s = 2 minutos
    const intervaloBackground = 2000 // A cada 2 segundos
    
    for (let i = 0; i < maxTentativasBackground; i++) {
      await new Promise(resolve => setTimeout(resolve, intervaloBackground))
      
      try {
        const nota = await NotaFiscalModel.buscarPorId(notaId)
        
        // Se já foi atualizada, parar
        if (nota.status !== 'emitindo') {
          console.log(`[_pollingBackgroundAutorizacao] Nota ${notaId} já atualizada para: ${nota.status}`)
          return
        }
        
        // Consultar status
        const respostaConsulta = await focusClient.consultarNFCe(referencia)
        const statusAtual = respostaConsulta.data.status
        
        console.log(`[_pollingBackgroundAutorizacao] Background check ${i + 1}: ${statusAtual}`)
        
        if (statusAtual === 'autorizado') {
          await NotaFiscalModel.atualizar(notaId, {
            status: 'autorizada',
            numero: respostaConsulta.data.numero,
            serie: respostaConsulta.data.serie,
            chave_acesso: respostaConsulta.data.chave_nfe,
            protocolo: respostaConsulta.data.protocolo,
            autorizado_em: new Date(),
            xml_nfe: respostaConsulta.data.caminho_xml_nota_fiscal,
            danfe_url: respostaConsulta.data.caminho_danfe,
            metadados: respostaConsulta.data
          })
          
          console.log(`[_pollingBackgroundAutorizacao] ✓ Nota autorizada em background`)
          return
        }
        
        if (statusAtual === 'erro_autorizacao' || statusAtual === 'denegado') {
          await NotaFiscalModel.atualizar(notaId, {
            status: 'erro',
            metadados: respostaConsulta.data
          })
          
          console.log(`[_pollingBackgroundAutorizacao] ✗ Nota com erro: ${statusAtual}`)
          return
        }
        
      } catch (error) {
        console.error(`[_pollingBackgroundAutorizacao] Erro na tentativa ${i + 1}:`, error.message)
      }
    }
    
    console.warn(`[_pollingBackgroundAutorizacao] ⚠️  Polling em background finalizado sem resolução para nota ${notaId}`)
  }
  
  /**
   * Download do DANFE (link da NFC-e)
   */
  static async downloadDANFE(notaId) {
    try {
      const nota = await NotaFiscalModel.buscarPorId(notaId)
      
      if (!nota) {
        throw new Error('Nota fiscal não encontrada')
      }
      
      if (nota.status !== 'autorizada' && nota.status !== 'cancelada') {
        throw new Error('DANFE disponível apenas para notas autorizadas ou canceladas')
      }
      
      const fiscalConfig = require('../config/fiscal')
      
      // Para NFC-e, o DANFE é um HTML hospedado na Focus NFe
      if (nota.danfeUrl) {
        // Se já é uma URL completa, retornar direto
        if (nota.danfeUrl.startsWith('http')) {
          return nota.danfeUrl
        }
        
        // Se é caminho relativo, construir URL completa
        const baseUrl = fiscalConfig.API_BASE_URL
        return `${baseUrl}${nota.danfeUrl}`
      }
      
      // Se não tiver URL salva, buscar via API
      const referencia = nota.providerRef
      
      if (!referencia) {
        throw new Error('Referência da nota não encontrada')
      }
      
      const resultado = await focusClient.consultarNFCe(referencia)
      
      if (resultado.data.caminho_danfe) {
        const danfePath = resultado.data.caminho_danfe
        
        // Atualizar URL no banco para próximas consultas
        await NotaFiscalModel.atualizar(notaId, {
          danfe_url: danfePath
        })
        
        // Construir URL completa se for caminho relativo
        if (danfePath.startsWith('http')) {
          return danfePath
        } else {
          const baseUrl = fiscalConfig.API_BASE_URL
          return `${baseUrl}${danfePath}`
        }
      }
      
      throw new Error('DANFE não disponível para esta nota')
      
    } catch (error) {
      console.error('[NotaFiscalService.downloadDANFE] Erro:', error)
      throw error
    }
  }
}

module.exports = NotaFiscalService
