// =============================================================
//  hooks/usePixPayment.js — Hook para Pagamentos PIX
//
//  Fluxo:
//    1. Ao montar, verifica se o mês já está pago (GET /status)
//    2. "Pagar com PIX" → POST /pix → obtém QR Code e código copia e cola
//    3. Exibe QR Code e código para o usuário
//    4. Polling em /status a cada 3s para detectar confirmação
//       (o backend é atualizado via webhook do Mercado Pago)
//    5. Confirmado → sucesso=true → banner some → ModalSucesso aparece
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

const POLL_INTERVAL_MS = 3000   // 3 segundos entre cada verificação
const MAX_POLLS        = 200    // ~10 minutos máximo de polling

export function usePixPayment() {
  const [mesPago,     setMesPago]     = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [criandoPix,  setCriandoPix]  = useState(false)
  const [pixData,     setPixData]     = useState(null)
  const [erro,        setErro]        = useState(null)
  const [sucesso,     setSucesso]     = useState(false)

  const pollingRef   = useRef(null)
  const pollCountRef = useRef(0)
  const pixIdRef     = useRef(null)   // ID do pagamento em andamento

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
        // Consulta o status no banco (atualizado pelo webhook)
        const data = await api.get('/pagamentos/status')

        if (data.mesPago) {
          console.log('[PIX] ✅ Pagamento confirmado via polling!')
          pararPolling()
          setMesPago(true)
          setSucesso(true)
          setPixData(null)
        }
      } catch (err) {
        // Erro temporário — continua tentando
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

  // Limpar polling ao desmontar
  useEffect(() => () => pararPolling(), [])

  // ── Criar pagamento PIX ───────────────────────────────────
  const criarPagamentoPix = useCallback(async () => {
    setErro(null)

    if (mesPago || sucesso) return

    try {
      setCriandoPix(true)
      console.log('[PIX] Criando pagamento...')

      const data = await api.post('/pagamentos/pix')

      // Mês já estava pago
      if (data.status === 'already_paid') {
        setMesPago(true)
        setSucesso(true)
        return
      }

      console.log('[PIX] PIX criado:', { id: data.id, valor: data.valor, reutilizado: data.reutilizado })

      setPixData({
        id:           data.id,
        qrCode:       data.qrCode,
        qrCodeBase64: data.qrCodeBase64,
        valor:        data.valor,
        mesReferencia: data.mesReferencia,
        expiresAt:    data.expiresAt,
        reutilizado:  data.reutilizado,
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

  return {
    // Estado
    mesPago,
    verificando,
    criandoPix,
    pixData,
    erro,
    sucesso,

    // Ações
    criarPagamentoPix,
    cancelarPix,
    copiarCodigoPix,
    fecharSucesso,
    verificarStatus,

    // Info
    isPolling:  !!pollingRef.current,
    pollCount:  pollCountRef.current,
  }
}
