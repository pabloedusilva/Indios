// =============================================================
//  hooks/useCardapio.js — Dados públicos do cardápio
//
//  · Não requer autenticação
//  · Busca diretamente /api/cardapio (rota pública do backend)
//  · Sem cookies, sem token — seguro para uso público
//  · Auto-refresh a cada 60 segundos para manter dados em tempo real
// =============================================================

import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

export function useCardapio() {
  const [produtos, setProdutos]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const buscar = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/cardapio`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Sem credentials — rota pública, sem cookie de auth
      })

      if (!res.ok) {
        throw new Error(`Erro ${res.status}: não foi possível carregar o cardápio.`)
      }

      const json = await res.json()
      const data = json?.data ?? json
      setProdutos(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Erro ao carregar cardápio.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial
  useEffect(() => {
    buscar()
  }, [buscar])

  // Auto-refresh a cada 60 s para refletir mudanças em tempo real
  useEffect(() => {
    const intervalo = setInterval(buscar, 60_000)
    return () => clearInterval(intervalo)
  }, [buscar])

  return { produtos, loading, error, refetch: buscar }
}
