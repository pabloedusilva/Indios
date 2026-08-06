// =============================================================
//  hooks/useDashboard.js — Dados do Dashboard via API
//  Atualiza a cada 10s e também quando recebe o evento
//  'pedido-atualizado' disparado pelo AppContext.
// =============================================================

import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

const INITIAL = {
  totalPedidosHoje: 0,
  faturamentoHoje: 0,
  preparando: 0,
  prontos: 0,
  finalizados: 0,
  cancelados: 0,
  ticketMedio: 0,
  topProdutos: [],
  pedidosAtivos: [],
  pedidosHoje: [],
  produtos: [],
}

export function useDashboard(intervalo = 10000) {
  const [dados, setDados] = useState(INITIAL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const buscar = useCallback(async (mostrarLoading = false) => {
    try {
      if (mostrarLoading) setLoading(true)
      setError(null)
      const data = await api.get('/dashboard/resumo')
      setDados(data)
    } catch (err) {
      setError(err.message || 'Erro ao carregar dashboard')
    } finally {
      if (mostrarLoading) setLoading(false)
    }
  }, [])

  // Refetch que mostra loading
  const refetch = useCallback(async () => {
    setLoading(true)
    await buscar(true)
  }, [buscar])

  useEffect(() => {
    buscar(true)

    // Polling a cada 10s (sem mostrar loading)
    const timer = setInterval(() => buscar(false), intervalo)

    // Atualiza imediatamente quando um pedido é criado/alterado (sem mostrar loading)
    const handlePedidoAtualizado = () => buscar(false)
    window.addEventListener('pedido-atualizado', handlePedidoAtualizado)

    return () => {
      clearInterval(timer)
      window.removeEventListener('pedido-atualizado', handlePedidoAtualizado)
    }
  }, [buscar, intervalo])

  return { ...dados, loading, error, refetch }
}
