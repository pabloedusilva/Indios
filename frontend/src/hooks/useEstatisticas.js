// =============================================================
//  hooks/useEstatisticas.js — Dados de Estatísticas Mensais
//
//  Relatórios:
//    · Lista vem do banco (todos os meses, sem limite)
//    · Download chama GET /relatorio/:mes/download que gera
//      o PDF em memória no servidor e envia direto
// =============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const STATS_VAZIA = {
  mes: '',
  resumo: {
    totalPedidos:     0,
    finalizados:      0,
    cancelados:       0,
    faturamento:      0,
    ticketMedio:      0,
    taxaCancelamento: 0,
  },
  topProdutos: [],
  pagamentos:  [],
  porDia:      [],
  melhorDia:   null,
}

export function useEstatisticas() {
  const [meses,        setMeses]        = useState([])
  const [mesAtivo,     setMesAtivo]     = useState(null)
  const [stats,        setStats]        = useState(STATS_VAZIA)
  const [relatorios,   setRelatorios]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [error,        setError]        = useState(null)

  // Impede que o efeito de mesAtivo dispare carregarStats na carga inicial
  const primeiraCarrega = useRef(true)

  // ── Busca meses disponíveis + stats iniciais ──────────────
  // Sempre reseta para o mês mais recente ao montar (ao entrar na rota)
  const carregarMeses = useCallback(async () => {
    try {
      setError(null)
      const data = await api.get('/estatisticas/inicio')
      setMeses(data.meses)
      if (data.meses.length > 0) {
        // Sempre usa o mês mais recente ao carregar — ignora mesAtivo anterior
        const mesMaisRecente = data.meses[0].mes
        setMesAtivo(mesMaisRecente)
        if (data.stats) setStats(data.stats)
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar meses')
    } finally {
      setLoading(false)
      primeiraCarrega.current = false
    }
  }, []) // sem dependências — sempre reseta ao montar

  // ── Busca estatísticas do mês ativo ───────────────────────
  const carregarStats = useCallback(async (mes) => {
    if (!mes) return
    try {
      const data = await api.get(`/estatisticas/mensal?mes=${mes}`)
      setStats(data)
    } catch {
      toast.error('Erro ao carregar estatísticas do mês')
    }
  }, [])

  // ── Sincroniza todos os meses no banco ────────────────────
  const sincronizar = useCallback(async () => {
    setSincronizando(true)
    try {
      await api.post('/estatisticas/sincronizar', {})
      if (mesAtivo) await carregarStats(mesAtivo)
    } catch (err) {
      toast.error(err.message || 'Erro ao sincronizar')
    } finally {
      setSincronizando(false)
    }
  }, [mesAtivo, carregarStats])

  // ── Busca lista de relatórios disponíveis no banco ────────
  const carregarRelatorios = useCallback(async () => {
    try {
      const data = await api.get('/estatisticas/relatorios')
      setRelatorios(data)
    } catch {
      // silencioso — relatórios são secundários
    }
  }, [])

  // ── Baixa o PDF de um relatório (gerado em memória no servidor) ──
  const baixarRelatorio = useCallback(async (mes) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
      const response = await fetch(`${API_URL}/api/estatisticas/relatorio/${mes}/download`, {
        method:      'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF do relatório')
      }

      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `relatorio-${mes}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.message || 'Erro ao baixar relatório')
    }
  }, [])

  // ── Efeitos ───────────────────────────────────────────────
  useEffect(() => {
    carregarMeses()
    carregarRelatorios()
  }, []) // eslint-disable-line

  useEffect(() => {
    if (primeiraCarrega.current) return
    if (mesAtivo) carregarStats(mesAtivo)
  }, [mesAtivo, carregarStats])

  // Verifica se o mês ativo já tem relatório salvo no banco
  const relatorioDoMesAtivo = relatorios.find((r) => r.mes === mesAtivo) || null

  return {
    meses,
    mesAtivo,
    setMesAtivo,
    stats,
    relatorios,
    relatorioDoMesAtivo,
    loading,
    sincronizando,
    error,
    sincronizar,
    baixarRelatorio,
    recarregarRelatorios: carregarRelatorios,
    refetch: carregarMeses,
  }
}
