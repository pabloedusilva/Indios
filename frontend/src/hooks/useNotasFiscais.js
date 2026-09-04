// ════════════════════════════════════════════════════════════════════════════
// HOOK: useNotasFiscais
// ════════════════════════════════════════════════════════════════════════════
// Hook customizado para gerenciar estado e operações de notas fiscais.
// Inclui polling automático para notas com status "emitindo".
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import * as notasFiscaisService from '../services/notasFiscaisService'

export function useNotasFiscais(filtrosIniciais = {}) {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState(filtrosIniciais)
  const pollingIntervalRef = useRef(null)

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

  // ─── Polling automático para notas com status "emitindo" ───────────────────
  useEffect(() => {
    // Limpar intervalo anterior
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Encontrar notas que estão "emitindo"
    const notasEmitindo = notas.filter(n => n.status === 'emitindo')

    if (notasEmitindo.length === 0) {
      return // Nada para fazer
    }

    console.log(`[useNotasFiscais] Iniciando polling para ${notasEmitindo.length} nota(s) com status "emitindo"`)

    // Consultar status a cada 3 segundos
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const idsParaConsultar = notasEmitindo.map(n => n.id).slice(0, 10) // Máximo 10 por vez

        const resultados = await notasFiscaisService.consultarStatusBatch(idsParaConsultar)

        // Atualizar notas com os novos status
        setNotas(prev => {
          const novasNotas = [...prev]
          
          resultados.forEach(resultado => {
            if (resultado.success && resultado.nota) {
              const index = novasNotas.findIndex(n => n.id === resultado.notaId)
              if (index !== -1) {
                novasNotas[index] = {
                  ...novasNotas[index],
                  ...resultado.nota,
                  id: novasNotas[index].id, // Garantir ID
                }
                
                // Log de mudança de status
                if (novasNotas[index].status !== prev[index]?.status) {
                  console.log(`[useNotasFiscais] Nota ${resultado.notaId} atualizada: ${prev[index]?.status} → ${novasNotas[index].status}`)
                }
              }
            }
          })
          
          return novasNotas
        })

      } catch (err) {
        console.error('[useNotasFiscais] Erro no polling:', err)
      }
    }, 3000) // 3 segundos

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [notas])

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
      const notaAtualizada = await notasFiscaisService.consultarStatus(notaId)
      
      // Atualizar a nota com status real da SEFAZ
      setNotas(prev => prev.map(n => {
        if (n.id === notaId) {
          if (typeof notaAtualizada === 'object' && notaAtualizada !== null) {
            return {
              ...n,
              ...notaAtualizada,
              // Garantir que dados essenciais não sejam sobrescritos com undefined
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

  // Download DANFEs do mês
  const downloadDanfesMes = useCallback(async (periodo) => {
    await notasFiscaisService.downloadDanfesMes(periodo)
  }, [])

  // Download XMLs do mês
  const downloadXmlsMes = useCallback(async (periodo) => {
    await notasFiscaisService.downloadXmlsMes(periodo)
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
    downloadDanfesMes,
    downloadXmlsMes,
    refetch,
    buscarPorId,
    
    // Estados derivados
    stats,
    notasPorMes,
  }
}

export default useNotasFiscais
