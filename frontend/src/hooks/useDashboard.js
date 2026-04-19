// =============================================================
//  hooks/useDashboard.js — Dados do Dashboard via API
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

export function useDashboard(intervalo = 30000) {
  const [dados, setDados] = useState(INITIAL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const buscar = useCallback(async () => {
    try {
      setError(null)
      const data = await api.get('/dashboard/resumo')
      setDados(data)
    } catch (err) {
      setError(err.message || 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    buscar()
    const timer = setInterval(buscar, intervalo)
    return () => clearInterval(timer)
  }, [buscar, intervalo])

  return { ...dados, loading, error, refetch: buscar }
}
