// =============================================================
//  hooks/useEstatisticas.js — Dados de Estatísticas Mensais
// =============================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const STATS_VAZIA = {
  mes: '',
  resumo: {
    totalPedidos: 0,
    finalizados: 0,
    cancelados: 0,
    faturamento: 0,
    ticketMedio: 0,
    taxaCancelamento: 0,
  },
  topProdutos: [],
  pagamentos: [],
  porDia: [],
  melhorDia: null,
}

export function useEstatisticas() {
  const [meses, setMeses]           = useState([])
  const [mesAtivo, setMesAtivo]     = useState(null)
  const [stats, setStats]           = useState(STATS_VAZIA)
  const [relatorios, setRelatorios] = useState([])
  const [loading, setLoading]       = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [error, setError]           = useState(null)

  // Impede que o efeito de mesAtivo dispare carregarStats na carga inicial
  const primeiraCarrega = useRef(true)

  // ── Busca os meses disponíveis + stats iniciais ───────────
  const carregarMeses = useCallback(async () => {
    try {
      setError(null)
      // Endpoint único: retorna meses + stats do mês mais recente
      const data = await api.get('/estatisticas/inicio')
      setMeses(data.meses)
      if (data.meses.length > 0) {
        const mes = mesAtivo || data.meses[0].mes
        if (!mesAtivo) setMesAtivo(mes)
        if (data.stats) setStats(data.stats)
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar meses')
    } finally {
      setLoading(false)
      primeiraCarrega.current = false
    }
  }, [mesAtivo])

  // ── Busca estatísticas do mês ativo ───────────────────────
  const carregarStats = useCallback(async (mes) => {
    if (!mes) return
    try {
      const data = await api.get(`/estatisticas/mensal?mes=${mes}`)
      setStats(data)
    } catch (err) {
      toast.error('Erro ao carregar estatísticas do mês')
    }
  }, [])

  // ── Sincroniza todos os meses no banco ───────────────────
  const sincronizar = useCallback(async () => {
    setSincronizando(true)
    try {
      await api.post('/estatisticas/sincronizar', {})
      // Recarrega o mês ativo para pegar o atualizadoEm novo
      if (mesAtivo) await carregarStats(mesAtivo)
    } catch (err) {
      toast.error(err.message || 'Erro ao sincronizar')
    } finally {
      setSincronizando(false)
    }
  }, [mesAtivo, carregarStats])

  // ── Busca lista de relatórios gerados ─────────────────────
  const carregarRelatorios = useCallback(async () => {
    try {
      const data = await api.get('/estatisticas/relatorios')
      setRelatorios(data)
    } catch (_) {
      // silencioso — relatórios são secundários
    }
  }, [])

  // ── Gera um novo relatório PDF ─────────────────────────────
  const gerarRelatorio = useCallback(async (mes) => {
    setGerandoPDF(true)
    try {
      const data = await api.post('/estatisticas/relatorio', { mes })
      toast.success('Relatório gerado com sucesso!')
      await carregarRelatorios()
      return data
    } catch (err) {
      const msg = err.message || 'Erro ao gerar relatório'
      if (msg.includes('já gerado')) {
        toast.error('Relatório já gerado para este período.')
      } else {
        toast.error(msg)
      }
      throw err
    } finally {
      setGerandoPDF(false)
    }
  }, [carregarRelatorios])

  // ── Baixa um relatório existente ──────────────────────────
  const baixarRelatorio = useCallback((arquivo) => {
    const link = document.createElement('a')
    link.href = `/api/estatisticas/relatorio/${arquivo}`
    link.download = arquivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  // ── Efeitos ───────────────────────────────────────────────
  useEffect(() => {
    carregarMeses()
    carregarRelatorios()
  }, []) // eslint-disable-line

  useEffect(() => {
    // Pula a primeira carga — já tratada dentro de carregarMeses
    if (primeiraCarrega.current) return
    if (mesAtivo) carregarStats(mesAtivo)
  }, [mesAtivo, carregarStats])

  // Verifica se o mês ativo já tem relatório gerado
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
    refetch: carregarMeses,
  }
}
