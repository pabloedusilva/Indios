// =============================================================
//  hooks/useBackendStatus.js — Hook de detecção de backend
//
//  · Detecção resiliente e performática de disponibilidade
//  · Zero flicker visual em recarregamentos
//  · Retry com backoff exponencial
//  · Persistência de estado com invalidação inteligente
//  · Cancelamento de requisições e cleanup completo
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Constantes de Configuração ──────────────────────────────
// URL base do backend (vem do .env)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'

const CONFIG = {
  HEALTH_ENDPOINT: `${API_URL}/api/health`,
  LOADER_THRESHOLD: 300,           // ms - só mostra loader após 300ms
  INITIAL_RETRY_DELAY: 1000,       // ms - delay inicial entre retries
  MAX_RETRY_DELAY: 30000,          // ms - delay máximo (30s)
  BACKOFF_MULTIPLIER: 1.5,         // multiplicador para backoff exponencial
  REQUEST_TIMEOUT: 10000,          // ms - timeout por requisição
  GLOBAL_TIMEOUT: 60000,           // ms - timeout global (1 minuto)
  CACHE_KEY: 'backend_status',     // chave do localStorage
  CACHE_TTL: 30000,                // ms - TTL do cache (30s)
}

// ── Estados Possíveis ────────────────────────────────────────
const STATUS = {
  CHECKING: 'checking',
  ONLINE: 'online',
  OFFLINE: 'offline',
  TIMEOUT: 'timeout',
}

// ── Helpers de Cache ─────────────────────────────────────────
const cache = {
  get() {
    try {
      const item = localStorage.getItem(CONFIG.CACHE_KEY)
      if (!item) return null
      
      const { status, timestamp } = JSON.parse(item)
      const age = Date.now() - timestamp
      
      // Invalida cache se expirou
      if (age > CONFIG.CACHE_TTL) {
        this.clear()
        return null
      }
      
      return status
    } catch {
      return null
    }
  },
  
  set(status) {
    try {
      localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
        status,
        timestamp: Date.now(),
      }))
    } catch {
      // Ignora erros de localStorage (ex: modo privado)
    }
  },
  
  clear() {
    try {
      localStorage.removeItem(CONFIG.CACHE_KEY)
    } catch {
      // Ignora erros
    }
  },
}

// ── Hook Principal ───────────────────────────────────────────
export function useBackendStatus() {
  // Estados
  const [status, setStatus] = useState(() => {
    // Tenta usar cache para evitar loader desnecessário
    const cached = cache.get()
    return cached === STATUS.ONLINE ? STATUS.ONLINE : STATUS.CHECKING
  })
  const [showLoader, setShowLoader] = useState(false)
  const [error, setError] = useState(null)
  
  // Refs para controle
  const abortControllerRef = useRef(null)
  const loaderTimerRef = useRef(null)
  const retryTimerRef = useRef(null)
  const globalTimeoutRef = useRef(null)
  const retryCountRef = useRef(0)
  const startTimeRef = useRef(Date.now())
  const isMountedRef = useRef(true)

  // ── Função: Calcular delay com backoff exponencial ──────────
  const getRetryDelay = useCallback(() => {
    const delay = Math.min(
      CONFIG.INITIAL_RETRY_DELAY * Math.pow(CONFIG.BACKOFF_MULTIPLIER, retryCountRef.current),
      CONFIG.MAX_RETRY_DELAY
    )
    return delay
  }, [])

  // ── Função: Health Check ─────────────────────────────────────
  const checkHealth = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    try {
      // Timeout individual por requisição
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort()
      }, CONFIG.REQUEST_TIMEOUT)

      const response = await fetch(CONFIG.HEALTH_ENDPOINT, {
        method: 'GET',
        signal,
        credentials: 'include',
      })

      clearTimeout(timeoutId)

      if (!isMountedRef.current) return

      if (response.ok) {
        // ✅ Backend online!
        setStatus(STATUS.ONLINE)
        setError(null)
        cache.set(STATUS.ONLINE)
        
        // Limpar loader e timers
        if (loaderTimerRef.current) {
          clearTimeout(loaderTimerRef.current)
          loaderTimerRef.current = null
        }
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current)
          retryTimerRef.current = null
        }
        if (globalTimeoutRef.current) {
          clearTimeout(globalTimeoutRef.current)
          globalTimeoutRef.current = null
        }
        
        setShowLoader(false)
        retryCountRef.current = 0
        return true
      }
      
      return false
    } catch (err) {
      if (err.name === 'AbortError') {
        // Requisição cancelada - não fazer nada
        return false
      }
      
      if (!isMountedRef.current) return false
      
      // Erro de rede ou timeout
      console.log(`[Backend] Tentativa ${retryCountRef.current + 1} falhou`)
      return false
    }
  }, [])

  // ── Função: Iniciar tentativas com retry ────────────────────
  const startHealthCheck = useCallback(async () => {
    const success = await checkHealth()
    
    if (success || !isMountedRef.current) return

    // Verificar timeout global
    const elapsed = Date.now() - startTimeRef.current
    if (elapsed >= CONFIG.GLOBAL_TIMEOUT) {
      setStatus(STATUS.TIMEOUT)
      setError('Não foi possível conectar ao servidor.')
      setShowLoader(true)
      cache.clear()
      return
    }

    // Agendar próxima tentativa com backoff exponencial
    retryCountRef.current++
    const delay = getRetryDelay()
    
    retryTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        startHealthCheck()
      }
    }, delay)
  }, [checkHealth, getRetryDelay])

  // ── Função: Retry manual ─────────────────────────────────────
  const retry = useCallback(() => {
    setStatus(STATUS.CHECKING)
    setError(null)
    setShowLoader(false)
    retryCountRef.current = 0
    startTimeRef.current = Date.now()
    
    // Limpar timers existentes
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (globalTimeoutRef.current) {
      clearTimeout(globalTimeoutRef.current)
      globalTimeoutRef.current = null
    }
    
    startHealthCheck()
  }, [startHealthCheck])

  // ── Effect: Inicialização ────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true
    
    // Se já está online (cache), não fazer nada
    if (status === STATUS.ONLINE) {
      return
    }

    // Timer para mostrar loader apenas se demorar
    loaderTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && status === STATUS.CHECKING) {
        setShowLoader(true)
      }
    }, CONFIG.LOADER_THRESHOLD)

    // Timer de timeout global
    globalTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && status === STATUS.CHECKING) {
        setStatus(STATUS.TIMEOUT)
        setError('Não foi possível conectar ao servidor.')
        setShowLoader(true)
        cache.clear()
      }
    }, CONFIG.GLOBAL_TIMEOUT)

    // Iniciar health check
    startHealthCheck()

    // Cleanup
    return () => {
      isMountedRef.current = false
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (loaderTimerRef.current) {
        clearTimeout(loaderTimerRef.current)
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }
      if (globalTimeoutRef.current) {
        clearTimeout(globalTimeoutRef.current)
      }
    }
  }, [status, startHealthCheck])

  return {
    status,           // 'checking' | 'online' | 'offline' | 'timeout'
    isOnline: status === STATUS.ONLINE,
    isChecking: status === STATUS.CHECKING,
    isOffline: status === STATUS.OFFLINE || status === STATUS.TIMEOUT,
    showLoader,       // true apenas se demorar > threshold
    error,            // mensagem de erro (se houver)
    retry,            // função para retry manual
  }
}
