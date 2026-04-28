// =============================================================
//  contexts/PixPaymentContext.jsx
//
//  Contexto global para o sistema de pagamento PIX.
//  Garante que Layout, BannerPixPayment e ModalPixPayment
//  compartilhem o mesmo estado — evitando instâncias duplicadas
//  do hook que causariam timers e estados dessincronizados.
// =============================================================

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS        = 200

const PixPaymentContext = createContext(null)

export function PixPaymentProvider({ children }) {
  const [mesPago,     setMesPago]     = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [criandoPix,  setCriandoPix]  = useState(false)
  const [pixData,     setPixData]     = useState(null)
  const [erro,        setErro]        = useState(null)
  const [sucesso,     setSucesso]     = useState(false)

  const pollingRef   = useRef(null)
  const pollCountRef = useRef(0)
  const pixIdRef     = useRef(null)

  // ── Verificar status ao montar ────────────────────────────
  useEffect(() => {
    verificarStatus()
  }, [])

  async function verificarStatus() {
    try {
      setVerificando(true)
      const data = await api.get('/pagamentos/status')
      if (data.mesPago) {
        setMesPago(true)
        setPixData(null)
      }
    } catch (err) {
      console.error('[PIX] Erro ao verificar status:', err.message)
    } finally {
      setVerificando(false)
    }
  }

  // ── Polling ───────────────────────────────────────────────
  function iniciarPolling(paymentId) {
    pararPolling()
    pollCountRef.current = 0
    pixIdRef.current     = paymentId

    console.log(`[PIX] Iniciando polling para pagamento ${paymentId}`)

    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1

      if (pollCountRef.current > MAX_POLLS) {
        console.warn('[PIX] Polling expirou após 10 minutos')
        pararPolling()
        return
      }

      try {
        const data = await api.get('/pagamentos/status')
        if (data.mesPago) {
          console.log('[PIX] ✅ Pagamento confirmado via polling!')
          pararPolling()
          setMesPago(true)
          setPixData(null)
          // Pequeno delay para garantir que o modal PIX feche antes do sucesso abrir
          setTimeout(() => setSucesso(true), 100)
        }
      } catch (err) {
        console.warn('[PIX] Erro no polling (tentando novamente):', err.message)
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
      console.log('[PIX] Criando pagamento...')

      const data = await api.post('/pagamentos/pix')

      if (data.status === 'already_paid') {
        setMesPago(true)
        setTimeout(() => setSucesso(true), 100)
        return
      }

      console.log('[PIX] PIX criado:', { id: data.id, valor: data.valor, reutilizado: data.reutilizado })

      setPixData({
        id:            data.id,
        qrCode:        data.qrCode,
        qrCodeBase64:  data.qrCodeBase64,
        valor:         data.valor,
        mesReferencia: data.mesReferencia,
        expiresAt:     data.expiresAt,
        reutilizado:   data.reutilizado,
      })

      iniciarPolling(data.id)

    } catch (err) {
      console.error('[PIX] Erro ao criar PIX:', err.message)
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
      criarPagamentoPix,
      cancelarPix,
      copiarCodigoPix,
      fecharSucesso,
      verificarStatus,
      isPolling:  !!pollingRef.current,
      pollCount:  pollCountRef.current,
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
