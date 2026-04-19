// =============================================================
//  hooks/usePagamento.js — Estado global do fluxo de pagamento
//
//  Fluxo:
//    1. Ao montar, verifica se o mês já está pago (GET /status-mes)
//    2. "Pagar agora" → POST /checkout → obtém URL do Mercado Pago
//    3. Abre a URL em nova aba (window.open)
//    4. Quando o usuário retorna (evento "focus"), faz polling em
//       GET /poll para saber se o pagamento foi confirmado
//    5. Confirmado → sucesso=true → ModalSucesso aparece
//       → banner some com animação
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

// Intervalo de polling quando o usuário está na aba (ms)
const POLL_INTERVAL_MS = 4000
// Número máximo de tentativas de polling após retornar à aba
const MAX_POLLS = 20

export function usePagamento() {
  const [mesPago,     setMesPago]     = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [abrindo,     setAbrindo]     = useState(false)  // criando preference
  const [erroCobrar,  setErroCobrar]  = useState(null)
  const [sucesso,     setSucesso]     = useState(false)  // mostra ModalSucesso

  const pollingRef   = useRef(null)
  const pollCountRef = useRef(0)

  // ── Verifica status do mês ao montar ─────────────────────
  useEffect(() => {
    verificarMes()
  }, [])

  async function verificarMes() {
    try {
      setVerificando(true)
      const data = await api.get('/pagamentos/status-mes')
      if (data.mesPago) setMesPago(true)
    } catch {
      // falha silenciosa — não bloqueia a UI
    } finally {
      setVerificando(false)
    }
  }

  // ── Polling de confirmação ────────────────────────────────
  function iniciarPolling() {
    pararPolling()
    pollCountRef.current = 0
    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1
      if (pollCountRef.current > MAX_POLLS) {
        pararPolling()
        return
      }
      try {
        const data = await api.get('/pagamentos/poll')
        if (data.pago) {
          pararPolling()
          setMesPago(true)
          setSucesso(true)
        }
      } catch {
        // ignora erros temporários de rede
      }
    }, POLL_INTERVAL_MS)
  }

  function pararPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  // ── Listener de foco: reinicia polling ao retornar à aba ─
  useEffect(() => {
    function handleFocus() {
      // Só inicia polling se o pagamento ainda não foi confirmado
      if (!mesPago && !sucesso) {
        iniciarPolling()
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [mesPago, sucesso])

  // Para polling ao desmontar
  useEffect(() => () => pararPolling(), [])

  // ── Abre checkout Mercado Pago ────────────────────────────
  const abrirCheckout = useCallback(async () => {
    setErroCobrar(null)

    if (mesPago || sucesso) return

    try {
      setAbrindo(true)
      const data = await api.post('/pagamentos/checkout')

      if (data.status === 'pago') {
        setMesPago(true)
        setSucesso(true)
        return
      }

      // Em testes usa sandboxUrl, em produção usa checkoutUrl
      const url = data.sandboxUrl || data.checkoutUrl
      if (!url) throw new Error('URL de checkout não recebida.')

      window.open(url, '_blank', 'noopener,noreferrer')

      // Inicia polling imediatamente (o usuário pode pagar rápido)
      iniciarPolling()
    } catch (err) {
      setErroCobrar(err.message || 'Erro ao abrir checkout. Tente novamente.')
    } finally {
      setAbrindo(false)
    }
  }, [mesPago, sucesso])

  // ── Fecha modal de sucesso ────────────────────────────────
  const fecharSucesso = useCallback(() => {
    setSucesso(false)
  }, [])

  return {
    mesPago,
    verificando,
    abrindo,
    erroCobrar,
    sucesso,
    abrirCheckout,
    fecharSucesso,
  }
}
