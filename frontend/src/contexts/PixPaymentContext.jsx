// =============================================================
//  contexts/PixPaymentContext.jsx
//
//  Contexto global para o sistema de pagamento PIX.
//  Garante que Layout, BannerPixPayment e ModalPixPayment
//  compartilhem o mesmo estado — evitando instâncias duplicadas
//  do hook que causariam timers e estados dessincronizados.
//
//  Fluxo ao clicar em "Pagar com PIX":
//    1. Verifica status imediatamente no banco
//    2. Se já pago → exibe sucesso sem chamar API
//    3. Se não pago → chama POST /pagamentos/pix
//       · Backend decide: reutiliza pending válido ou cria novo
//    4. Polling a cada 1,5s até confirmação (máx. 200 tentativas)
//
//  Lógica de bloqueio:
//    · Janela de cobrança: dia 20 ao dia 24 (5 dias)
//    · Após o dia 24 sem pagamento → `bloqueado = true`
//    · Bloqueio some automaticamente ao confirmar pagamento
//
//  Otimização de flash:
//    · sessionStorage guarda o resultado da última verificação
//    · Se já pago na sessão, `mesPago` começa true e `verificando`
//      começa false — zero flash na tela
// =============================================================

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

const POLL_INTERVAL_MS  = 1500   // polling rápido para resposta quase instantânea
const MAX_POLLS         = 200
const SESSION_KEY       = 'pix_mes_pago'

// Após o dia 29 sem pagamento, o acesso é bloqueado
const DIA_VENCIMENTO = 29

const PixPaymentContext = createContext(null)

// ── Helpers ───────────────────────────────────────────────────
function diaBRT() {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.getUTCDate()
}

function calcularBloqueado(mesPago) {
  if (mesPago) return false
  return diaBRT() > DIA_VENCIMENTO
}

// Lê o cache da sessão — retorna true se o mês já foi pago nesta sessão
function lerCacheSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

function gravarCacheSession(pago) {
  try {
    if (pago) sessionStorage.setItem(SESSION_KEY, 'true')
    else sessionStorage.removeItem(SESSION_KEY)
  } catch { /* sem suporte a sessionStorage */ }
}

// ── Provider ──────────────────────────────────────────────────
export function PixPaymentProvider({ children }) {
  // Se já temos cache de "pago" nesta sessão, começamos com mesPago=true
  // e verificando=false — sem flash algum
  const cachePago = lerCacheSession()

  const [mesPago,     setMesPago]     = useState(cachePago)
  const [verificando, setVerificando] = useState(!cachePago)
  const [criandoPix,  setCriandoPix]  = useState(false)
  const [pixData,     setPixData]     = useState(null)
  const [erro,        setErro]        = useState(null)
  const [sucesso,     setSucesso]     = useState(false)
  const [bloqueado,   setBloqueado]   = useState(false)

  const pollingRef   = useRef(null)
  const pollCountRef = useRef(0)
  const pixIdRef     = useRef(null)

  // ── Verificar status ao montar (só se não temos cache) ───────
  useEffect(() => {
    if (cachePago) return   // já sabemos que está pago — não precisa verificar
    verificarStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recalcular bloqueio quando mesPago ou verificando mudam ──
  useEffect(() => {
    if (!verificando) {
      setBloqueado(calcularBloqueado(mesPago))
    }
  }, [mesPago, verificando])

  async function verificarStatus() {
    try {
      setVerificando(true)
      const data = await api.get('/pagamentos/status')
      if (data.mesPago) {
        setMesPago(true)
        gravarCacheSession(true)
        setPixData(null)
      }
    } catch {
      // falha silenciosa — não derruba o app
    } finally {
      setVerificando(false)
    }
  }

  // ── Polling ───────────────────────────────────────────────
  function iniciarPolling(paymentId) {
    pararPolling()
    pollCountRef.current = 0
    pixIdRef.current     = paymentId

    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1

      if (pollCountRef.current > MAX_POLLS) {
        pararPolling()
        return
      }

      try {
        const data = await api.get('/pagamentos/status')
        if (data.mesPago) {
          pararPolling()
          setMesPago(true)
          gravarCacheSession(true)
          setPixData(null)
          setBloqueado(false)
          setTimeout(() => setSucesso(true), 100)
        }
      } catch {
        // erro transitório — tenta novamente no próximo tick
      }
    }, POLL_INTERVAL_MS)
  }

  function pararPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  useEffect(() => () => pararPolling(), [])

  // ── Criar pagamento PIX ───────────────────────────────────
  const criarPagamentoPix = useCallback(async () => {
    setErro(null)
    if (mesPago || sucesso) return

    try {
      setCriandoPix(true)

      // Verificar status imediatamente antes de criar — resposta instantânea
      // se o pagamento já foi confirmado (ex: webhook chegou enquanto o modal estava aberto)
      const statusAtual = await api.get('/pagamentos/status')
      if (statusAtual.mesPago) {
        setMesPago(true)
        gravarCacheSession(true)
        setBloqueado(false)
        setTimeout(() => setSucesso(true), 100)
        return
      }

      // Solicitar criação/reutilização do PIX
      const data = await api.post('/pagamentos/pix')

      if (data.status === 'already_paid') {
        setMesPago(true)
        gravarCacheSession(true)
        setBloqueado(false)
        setTimeout(() => setSucesso(true), 100)
        return
      }

      setPixData({
        id:            data.id,
        qrCode:        data.qrCode,
        qrCodeBase64:  data.qrCodeBase64,
        valor:         data.valor,
        mesReferencia: data.mesReferencia,
        expiresAt:     data.expiresAt,
      })

      iniciarPolling(data.id)

    } catch (err) {
      if (err.message?.includes('409') || err.status === 409)
        setErro('Já existe um pagamento aprovado para este mês.')
      else if (err.status === 429)
        setErro('Muitas tentativas. Aguarde alguns minutos.')
      else
        setErro(err.message || 'Erro ao gerar PIX. Tente novamente.')
    } finally {
      setCriandoPix(false)
    }
  }, [mesPago, sucesso])

  // ── Ações auxiliares ──────────────────────────────────────
  const fecharSucesso = useCallback(() => setSucesso(false), [])

  const cancelarPix = useCallback(() => {
    pararPolling()
    setPixData(null)
    setErro(null)
    pixIdRef.current = null
  }, [])

  const copiarCodigoPix = useCallback(async () => {
    if (!pixData?.qrCode) return false
    try {
      await navigator.clipboard.writeText(pixData.qrCode)
      return true
    } catch {
      return false
    }
  }, [pixData])

  return (
    <PixPaymentContext.Provider value={{
      mesPago,
      verificando,
      criandoPix,
      pixData,
      erro,
      sucesso,
      bloqueado,
      criarPagamentoPix,
      cancelarPix,
      copiarCodigoPix,
      fecharSucesso,
      verificarStatus,
      isPolling: !!pollingRef.current,
    }}>
      {children}
    </PixPaymentContext.Provider>
  )
}

export function usePixPayment() {
  const ctx = useContext(PixPaymentContext)
  if (!ctx) throw new Error('usePixPayment deve ser usado dentro de <PixPaymentProvider>')
  return ctx
}
