// ════════════════════════════════════════════════════════════════════════════
// SERVICE: Notas Fiscais (Frontend)
// ════════════════════════════════════════════════════════════════════════════
// Cliente HTTP para comunicação com a API de notas fiscais.
// ════════════════════════════════════════════════════════════════════════════

import { api } from './api'

const BASE_PATH = '/notas-fiscais'

/**
 * Listar notas fiscais com filtros
 */
export async function listar(filtros = {}) {
  try {
    const params = new URLSearchParams()
    
    if (filtros.status && filtros.status !== 'todos') {
      params.append('status', filtros.status)
    }
    if (filtros.dataInicio) {
      params.append('dataInicio', filtros.dataInicio)
    }
    if (filtros.dataFim) {
      params.append('dataFim', filtros.dataFim)
    }
    if (filtros.busca) {
      params.append('busca', filtros.busca)
    }
    if (filtros.page) {
      params.append('page', filtros.page)
    }
    if (filtros.limit) {
      params.append('limit', filtros.limit)
    }

    const query = params.toString()
    const path = query ? `${BASE_PATH}?${query}` : BASE_PATH
    
    const response = await api.get(path)
    
    // Backend retorna: { success: true, notas: [...], total, pagina, limite }
    // Extrair array de notas
    return response?.notas || []
  } catch (error) {
    throw error
  }
}

/**
 * Buscar nota fiscal por ID
 */
export async function buscarPorId(id) {
  try {
    const response = await api.get(`${BASE_PATH}/${id}`)
    // Backend retorna: { success: true, nota: {...} }
    return response?.nota || null
  } catch (error) {
    throw error
  }
}

/**
 * Emitir nova nota fiscal
 */
export async function emitir(pedidoId, dadosDestinatario = {}) {
  try {
    const response = await api.post(BASE_PATH, {
      pedidoId,
      cpfDestinatario: dadosDestinatario.cpf,
      ufDestinatario: dadosDestinatario.uf,
      observacoes: dadosDestinatario.observacoes,
    })
    // Backend retorna: { success: true, message: '...', nota: {...} }
    return response?.nota || response
  } catch (error) {
    throw error
  }
}

/**
 * Cancelar nota fiscal
 */
export async function cancelar(id, motivo) {
  try {
    const response = await api.post(`${BASE_PATH}/${id}/cancelar`, { motivo })
    // Backend retorna: { success: true, message: '...', nota: {...} }
    return response?.nota || response
  } catch (error) {
    throw error
  }
}

/**
 * Consultar status da nota na SEFAZ
 */
export async function consultarStatus(id) {
  try {
    const response = await api.post(`${BASE_PATH}/${id}/consultar-status`)
    // Backend retorna: { success: true, message: '...', nota: {...} }
    return response?.nota || response
  } catch (error) {
    throw error
  }
}

/**
 * Consultar status de múltiplas notas em batch
 */
export async function consultarStatusBatch(notasIds) {
  try {
    const response = await api.post(`${BASE_PATH}/consultar-status-batch`, { notasIds })
    // Backend retorna: { success: true, resultados: [{notaId, success, nota}] }
    return response?.resultados || []
  } catch (error) {
    throw error
  }
}

/**
 * Download do XML da nota
 */
export async function downloadXML(id) {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
    const url = `${API_URL}/api${BASE_PATH}/${id}/xml`
    
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Erro ao baixar XML')
    }

    // Extrair nome do arquivo do header Content-Disposition
    const contentDisposition = response.headers.get('Content-Disposition')
    let nomeArquivo = 'NFe_download.xml'
    
    if (contentDisposition) {
      const patterns = [
        /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i,
        /filename[^;=\n]*=\s*"([^"]+)"/i,
        /filename[^;=\n]*=\s*'([^']+)'/i,
        /filename[^;=\n]*=\s*([^;\s]+)/i,
      ]
      
      for (const pattern of patterns) {
        const matches = contentDisposition.match(pattern)
        if (matches && matches[1]) {
          nomeArquivo = decodeURIComponent(matches[1]).trim()
          break
        }
      }
    }

    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = nomeArquivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    throw error
  }
}

/**
 * Download do DANFE (HTML para NFC-e)
 */
export async function downloadDANFE(id) {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
    const url = `${API_URL}/api${BASE_PATH}/${id}/danfe`
    
    // Para NFC-e, o backend retorna redirect para HTML hospedado
    // Abrir em nova aba diretamente
    window.open(url, '_blank')
  } catch (error) {
    throw error
  }
}

/**
 * Download ZIP com DANFEs do período
 * 
 * SEGURANÇA:
 * - Download via API Focus NFe v2/backups
 * - Autenticação Basic (username e password)
 * - Validação de data de liberação (dia 2)
 * - Tratamento de erros específicos
 */
export async function downloadDanfesMes(periodo) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
  const url = `${API_URL}/api${BASE_PATH}/download-danfes/${periodo}`
  
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Mensagens de erro específicas baseadas no status
    let mensagem = errorData.message || 'Erro ao baixar DANFEs'
    
    if (response.status === 403) {
      mensagem = errorData.message || 'Backup estará disponível a partir do dia 2 do próximo mês'
    } else if (response.status === 404) {
      mensagem = 'DANFEs não disponíveis para este período.'
    } else if (response.status === 401) {
      mensagem = 'Erro de autenticação. Verifique as credenciais Focus NFe.'
    } else if (response.status === 400) {
      mensagem = errorData.message || 'Período inválido.'
    } else if (response.status === 504) {
      mensagem = 'Timeout ao baixar DANFEs. Tente novamente.'
    }
    
    throw new Error(mensagem)
  }

  const blob = await response.blob()
  
  // Extrair nome do arquivo do header Content-Disposition
  const contentDisposition = response.headers.get('Content-Disposition')
  let nomeArquivo = `DANFEs_NFCe_${periodo}.zip`
  
  if (contentDisposition) {
    const matches = /filename="([^"]+)"/.exec(contentDisposition)
    if (matches && matches[1]) {
      nomeArquivo = matches[1]
    }
  }
  
  // Fazer download
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
  
  return {
    nomeArquivo,
    success: true
  }
}

/**
 * Download ZIP com XMLs do período
 * 
 * SEGURANÇA:
 * - Download via API Focus NFe v2/backups
 * - Autenticação Basic (username e password)
 * - Validação de data de liberação (dia 2)
 * - Tratamento de erros específicos
 */
export async function downloadXmlsMes(periodo) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
  const url = `${API_URL}/api${BASE_PATH}/download-xmls/${periodo}`
  
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Mensagens de erro específicas baseadas no status
    let mensagem = errorData.message || 'Erro ao baixar XMLs'
    
    if (response.status === 403) {
      mensagem = errorData.message || 'Backup estará disponível a partir do dia 2 do próximo mês'
    } else if (response.status === 404) {
      mensagem = 'XMLs não disponíveis para este período.'
    } else if (response.status === 401) {
      mensagem = 'Erro de autenticação. Verifique as credenciais Focus NFe.'
    } else if (response.status === 400) {
      mensagem = errorData.message || 'Período inválido.'
    } else if (response.status === 504) {
      mensagem = 'Timeout ao baixar XMLs. Tente novamente.'
    }
    
    throw new Error(mensagem)
  }

  const blob = await response.blob()
  
  // Extrair nome do arquivo do header Content-Disposition
  const contentDisposition = response.headers.get('Content-Disposition')
  let nomeArquivo = `XMLs_NFCe_${periodo}.zip`
  
  if (contentDisposition) {
    const matches = /filename="([^"]+)"/.exec(contentDisposition)
    if (matches && matches[1]) {
      nomeArquivo = matches[1]
    }
  }
  
  // Fazer download
  const downloadUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = downloadUrl
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(downloadUrl)
  
  return {
    nomeArquivo,
    success: true
  }
}

/**
 * Obter estatísticas por período específico
 */
export async function obterEstatisticasPorPeriodo(periodo) {
  try {
    const response = await api.get(`${BASE_PATH}/estatisticas/${periodo}`)
    // Backend retorna: { success: true, periodo, stats: {...} }
    return response?.stats || null
  } catch (error) {
    throw error
  }
}

/**
 * Calcular impostos aproximados de um período
 */
export async function calcularImpostosPeriodo(periodo) {
  try {
    const response = await api.get(`${BASE_PATH}/impostos/${periodo}`)
    // Backend retorna: { success: true, periodo, quantidadeNotas, totais: {...}, notas: [...] }
    return response || null
  } catch (error) {
    throw error
  }
}

/**
 * Calcular impostos aproximados de uma nota específica
 */
export async function calcularImpostosNota(id) {
  try {
    const response = await api.get(`${BASE_PATH}/${id}/impostos`)
    // Backend retorna: { success: true, impostos: {...} }
    return response?.impostos || null
  } catch (error) {
    throw error
  }
}

export default {
  listar,
  buscarPorId,
  emitir,
  cancelar,
  consultarStatus,
  consultarStatusBatch,
  downloadXML,
  downloadDANFE,
  downloadDanfesMes,
  downloadXmlsMes,
  obterEstatisticasPorPeriodo,
  calcularImpostosPeriodo,
  calcularImpostosNota,
}
