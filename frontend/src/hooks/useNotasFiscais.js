// ════════════════════════════════════════════════════════════════════════════
// HOOK: useNotasFiscais
// ════════════════════════════════════════════════════════════════════════════
// Hook customizado para gerenciar estado e operações de notas fiscais.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react'
import * as notasFiscaisService from '../services/notasFiscaisService'

export function useNotasFiscais(filtrosIniciais = {}) {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState(filtrosIniciais)

  // Carregar notas
  const carregarNotas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await notasFiscaisService.listar(filtros)
      setNotas(data)
    } catch (err) {
      setError(err.message || 'Erro ao carregar notas fiscais')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    carregarNotas()
  }, [carregarNotas])

  // Refetch manual
  const refetch = useCallback(() => {
    return carregarNotas()
  }, [carregarNotas])

  // Emitir nota
  const emitir = useCallback(async (pedidoId, dadosDestinatario) => {
    try {
      const novaNota = await notasFiscaisService.emitir(pedidoId, dadosDestinatario)
      setNotas(prev => [novaNota, ...prev])
      return novaNota
    } catch (err) {
      throw new Error(err.message || 'Erro ao emitir nota fiscal')
    }
  }, [])

  // Cancelar nota
  const cancelar = useCallback(async (notaId, motivo) => {
    try {
      const notaAtualizada = await notasFiscaisService.cancelar(notaId, motivo)
      
      // Atualizar a nota mantendo dados essenciais
      setNotas(prev => prev.map(n => {
        if (n.id === notaId) {
          if (typeof notaAtualizada === 'object' && notaAtualizada !== null) {
            return {
              ...n,
              ...notaAtualizada,
              // Garantir que dados essenciais não sejam sobrescritos
              id: n.id,
              criadoEm: notaAtualizada.criadoEm || n.criadoEm,
              emitidoEm: notaAtualizada.emitidoEm || n.emitidoEm,
            }
          }
          return n
        }
        return n
      }))
      
      return notaAtualizada
    } catch (err) {
      throw new Error(err.message || 'Erro ao cancelar nota fiscal')
    }
  }, [])

  // Consultar status
  const consultarStatus = useCallback(async (notaId) => {
    try {
      const statusAtualizado = await notasFiscaisService.consultarStatus(notaId)
      
      // Atualizar apenas o status na nota existente, mantendo todos os outros dados
      setNotas(prev => prev.map(n => {
        if (n.id === notaId) {
          // Se statusAtualizado é um objeto com campos da nota, fazer merge
          if (typeof statusAtualizado === 'object' && statusAtualizado !== null) {
            return {
              ...n,
              ...statusAtualizado,
              // Garantir que dados essenciais não sejam sobrescritos com undefined
              id: n.id,
              criadoEm: statusAtualizado.criadoEm || n.criadoEm,
              emitidoEm: statusAtualizado.emitidoEm || n.emitidoEm,
            }
          }
          return n
        }
        return n
      }))
      
      return statusAtualizado
    } catch (err) {
      throw new Error(err.message || 'Erro ao consultar status')
    }
  }, [])

  // Download XML
  const downloadXML = useCallback(async (notaId) => {
    try {
      await notasFiscaisService.downloadXML(notaId)
    } catch (err) {
      throw new Error(err.message || 'Erro ao baixar XML')
    }
  }, [])

  // Download DANFE
  const downloadDANFE = useCallback(async (notaId) => {
    try {
      await notasFiscaisService.downloadDANFE(notaId)
    } catch (err) {
      throw new Error(err.message || 'Erro ao baixar DANFE')
    }
  }, [])

  // Download ZIP mensal
  const downloadMesZip = useCallback(async (periodo) => {
    await notasFiscaisService.downloadMesZip(periodo)
  }, [])

  // Estados derivados
  const stats = useMemo(() => {
    const totalNotas = notas.length
    const notasPendentes = notas.filter(n => n.status === 'emitindo').length
    const notasAutorizadas = notas.filter(n => n.status === 'autorizada').length
    const notasCanceladas = notas.filter(n => n.status === 'cancelada').length
    const notasComErro = notas.filter(n => n.status === 'erro').length
    const faturamento = notas
      .filter(n => n.status === 'autorizada')
      .reduce((acc, n) => acc + (n.valor || 0), 0)

    return {
      totalNotas,
      notasPendentes,
      notasAutorizadas,
      notasCanceladas,
      notasComErro,
      faturamento,
    }
  }, [notas])

  // Agrupar por mês
  const notasPorMes = useMemo(() => {
    const mapa = {}
    notas.forEach(nota => {
      try {
        // Verificar se a data é válida
        if (!nota.criadoEm && !nota.emitidoEm) {
          return // Pular esta nota
        }
        
        const data = new Date(nota.criadoEm || nota.emitidoEm)
        
        // Verificar se a data é válida
        if (isNaN(data.getTime())) {
          return // Pular esta nota
        }
        
        const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
        if (!mapa[mesAno]) {
          mapa[mesAno] = []
        }
        mapa[mesAno].push(nota)
      } catch (error) {
        // Silenciosamente pular notas com erros
      }
    })
    return mapa
  }, [notas])

  // Buscar nota por ID
  const buscarPorId = useCallback((notaId) => {
    return notas.find(n => n.id === notaId)
  }, [notas])

  return {
    notas,
    loading,
    error,
    filtros,
    setFiltros,
    
    // Funções
    listar: carregarNotas,
    emitir,
    cancelar,
    consultarStatus,
    downloadXML,
    downloadDANFE,
    downloadMesZip,
    refetch,
    buscarPorId,
    
    // Estados derivados
    stats,
    notasPorMes,
  }
}

export default useNotasFiscais
