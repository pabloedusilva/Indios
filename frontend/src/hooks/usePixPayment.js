// =============================================================
//  hooks/usePixPayment.js — Hook para Pagamentos PIX
//
//  Fluxo:
//    1. Ao montar, verifica se o mês já está pago (GET /status)
//    2. "Pagar com PIX" → POST /pix → obtém QR Code e código copia e cola
//    3. Exibe QR Code e código para o usuário
//    4. Faz polling em /status para verificar se o pagamento foi confirmado
//    5. Confirmado → sucesso=true → ModalSucesso aparece → banner some
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 100

export function usePixPayment() {
  const [mesPago, setMesPago] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [criandoPix, setCriandoPix] = useState(false)
  const [pixData, setPixData] = useState(null)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(false)

  const pollingRef = useRef(null)
  const pollCountRef = useRef(0)

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
    } catch (error) {
      console.error('[usePixPayment] Erro ao verificar status:', error)
    } finally {
      setVerificando(false)
    }
  }

  function iniciarPolling() {
    pararPolling()
    pollCountRef.current = 0
    
    console.log('[usePixPayment] Iniciando polling de status')
    
    pollingRef.current = setInterval(async () => {
      pollCountRef.current += 1
      
      if (pollCountRef.current > MAX_POLLS) {
        console.log('[usePixPayment] Polling timeout - parando')
        pararPolling()
        return
      }
      
      try {
        const data = await api.get('/pagamentos/status')
        
        if (data.mesPago) {
          console.log('[usePixPayment] Pagamento confirmado')
          pararPolling()
          setMesPago(true)
          setSucesso(true)
          setPixData(null)
        }
      } catch (error) {
        console.error('[usePixPayment] Erro no polling:', error)
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

  const criarPagamentoPix = useCallback(async () => {
    setErro(null)

    if (mesPago || sucesso) {
      console.log('[usePixPayment] Mês já está pago')
      return
    }

    try {
      setCriandoPix(true)
      console.log('[usePixPayment] Criando pagamento PIX...')
      
      const data = await api.post('/pagamentos/pix')

      if (data.status === 'already_paid') {
        console.log('[usePixPayment] Mês já está pago')
        setMesPago(true)
        setSucesso(true)
        return
      }

      console.log('[usePixPayment] PIX criado:', {
        id: data.id,
        valor: data.valor,
        reutilizado: data.reutilizado
      })

      setPixData({
        id: data.id,
        qrCode: data.qrCode,
        qrCodeBase64: data.qrCodeBase64,
        valor: data.valor,
        mesReferencia: data.mesReferencia,
        expiresAt: data.expiresAt,
        reutilizado: data.reutilizado
      })

      iniciarPolling()

    } catch (error) {
      console.error('[usePixPayment] Erro ao criar PIX:', error)
      
      if (error.status === 409) {
        setErro('Já existe um pagamento aprovado para este mês')
      } else if (error.status === 429) {
        setErro('Muitas tentativas. Tente novamente em alguns minutos')
      } else {
        setErro(error.message || 'Erro ao criar pagamento PIX. Tente novamente.')
      }
    } finally {
      setCriandoPix(false)
    }
  }, [mesPago, sucesso])

  const fecharSucesso = useCallback(() => {
    setSucesso(false)
  }, [])

  const cancelarPix = useCallback(() => {
    console.log('[usePixPayment] Cancelando pagamento PIX')
    pararPolling()
    setPixData(null)
    setErro(null)
  }, [])

  const copiarCodigoPix = useCallback(async () => {
    if (!pixData?.qrCode) return false

    try {
      await navigator.clipboard.writeText(pixData.qrCode)
      console.log('[usePixPayment] Código PIX copiado')
      return true
    } catch (error) {
      console.error('[usePixPayment] Erro ao copiar código PIX:', error)
      return false
    }
  }, [pixData])

  return {
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
    
    isPolling: !!pollingRef.current,
    pollCount: pollCountRef.current
  }
}