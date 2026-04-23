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

      // Detecção de ambiente baseada em variáveis de ambiente e contexto
      const isProductionEnv = import.meta.env.MODE === 'production' || import.meta.env.VITE_NODE_ENV === 'production'
      const isTestEnv = import.meta.env.MODE === 'test' || import.meta.env.VITE_NODE_ENV === 'test'
      
      // Em ambiente de teste, não considera produção automaticamente pela presença de checkoutUrl
      // pois os testes podem simular cenários diversos
      const hasProductionCredentials = !!data.checkoutUrl && !isTestEnv
      
      // Considera produção se:
      // 1. Ambiente é explicitamente produção OU
      // 2. Tem credenciais de produção (checkoutUrl disponível) E não está em teste
      const isProduction = isProductionEnv || hasProductionCredentials
      
      // Lógica de seleção de URL baseada no ambiente:
      // - Em produção: prioriza checkoutUrl (produção) sobre sandboxUrl
      // - Em desenvolvimento/teste: prioriza sandboxUrl (sandbox) sobre checkoutUrl para preservar comportamento existente
      const url = isProduction 
        ? (data.checkoutUrl || data.sandboxUrl)  // Produção: checkoutUrl primeiro
        : (data.sandboxUrl || data.checkoutUrl)  // Desenvolvimento: sandboxUrl primeiro (preserva comportamento)
      
      // Logs de debug para rastreamento da URL selecionada
      console.log('[usePagamento] Ambiente detectado:', isProduction ? 'production' : 'development')
      console.log('[usePagamento] Detecção de ambiente:', { 
        isProductionEnv, 
        isTestEnv,
        hasProductionCredentials, 
        finalIsProduction: isProduction 
      })
      console.log('[usePagamento] URLs disponíveis:', { 
        checkoutUrl: data.checkoutUrl, 
        sandboxUrl: data.sandboxUrl 
      })
      console.log('[usePagamento] URL selecionada:', url)
      
      // Validação para garantir que a URL correta foi selecionada
      if (isProduction && data.checkoutUrl && url !== data.checkoutUrl) {
        console.warn('[usePagamento] AVISO: Em produção mas usando URL de sandbox!')
      }
      
      if (!isProduction && data.sandboxUrl && url !== data.sandboxUrl) {
        console.warn('[usePagamento] AVISO: Em desenvolvimento mas usando URL de produção!')
      }
      
      if (!url) throw new Error('URL de checkout não recebida.')

      // Validação adicional da URL selecionada
      const isSandboxUrl = url.includes('sandbox') || url.includes('test')
      const isProductionUrl = !isSandboxUrl && (url.includes('mercadopago') || url.includes('mercadolibre'))
      
      console.log('[usePagamento] Tipo de URL detectado:', isSandboxUrl ? 'sandbox' : 'production')
      
      // Alerta em caso de inconsistência entre ambiente e tipo de URL
      if (isProduction && isSandboxUrl) {
        console.error('[usePagamento] ERRO: Ambiente de produção mas URL de sandbox selecionada!')
      } else if (!isProduction && isProductionUrl && data.sandboxUrl) {
        console.warn('[usePagamento] AVISO: Ambiente de desenvolvimento mas URL de produção selecionada!')
      }

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
