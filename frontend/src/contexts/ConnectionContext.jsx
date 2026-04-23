// =============================================================
//  contexts/ConnectionContext.jsx — Contexto de verificação de conexão
//
//  · Verifica conexão com backend antes de renderizar qualquer rota
//  · Exibe loader fullscreen enquanto verifica
//  · Permite retry em caso de erro
//  · Bloqueia toda a aplicação até conexão ser estabelecida
// =============================================================

import { createContext, useContext, useState, useEffect, useRef } from 'react'

const ConnectionContext = createContext(null)

export function ConnectionProvider({ children }) {
  // ── Estados ──────────────────────────────────────────────────
  const [connectionStatus, setConnectionStatus] = useState('checking') // 'checking' | 'connected' | 'error'
  const [statusMessage, setStatusMessage] = useState('Carregando...')
  const [showRetry, setShowRetry] = useState(false)
  
  // Refs para controle de timers
  const messageTimerRef = useRef(null)
  const startTimeRef = useRef(null)
  const checkIntervalRef = useRef(null)

  // ── Função: Verificar conexão com backend ───────────────────
  const checkConnection = async () => {
    try {
      // Criar AbortController para timeout de 10 segundos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      // Fazer requisição ao endpoint de health check
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        // Conexão bem-sucedida
        setConnectionStatus('connected')
        setStatusMessage('Conectado!')
        setShowRetry(false)
        
        // Limpar timer de mensagens progressivas
        if (messageTimerRef.current) {
          clearInterval(messageTimerRef.current)
          messageTimerRef.current = null
        }
      } else {
        // Erro HTTP (4xx, 5xx)
        throw new Error('Erro ao conectar com o servidor')
      }
    } catch (error) {
      // Erro de rede, timeout ou outro erro
      console.error('Erro na verificação de conexão:', error)
      setConnectionStatus('error')
      setStatusMessage('Não foi possível conectar ao servidor. Verifique sua conexão.')
      setShowRetry(true)
      
      // Limpar timer de mensagens progressivas
      if (messageTimerRef.current) {
        clearInterval(messageTimerRef.current)
        messageTimerRef.current = null
      }
    }
  }

  // ── Função: Atualizar mensagens progressivas ────────────────
  const updateProgressiveMessages = () => {
    if (connectionStatus !== 'checking') return

    const elapsed = Date.now() - startTimeRef.current

    if (elapsed >= 4000) {
      setStatusMessage('Conectando ao servidor...')
    } else if (elapsed >= 2000) {
      setStatusMessage('Aguarde só mais um momento...')
    } else {
      setStatusMessage('Carregando...')
    }
  }

  // ── Função: Tentar novamente ────────────────────────────────
  const handleRetry = () => {
    setConnectionStatus('checking')
    setStatusMessage('Carregando...')
    setShowRetry(false)
    startTimeRef.current = Date.now()
    checkConnection()
  }

  // ── Effect: Iniciar verificação ao montar ───────────────────
  useEffect(() => {
    startTimeRef.current = Date.now()
    checkConnection()

    // Verificar conexão periodicamente a cada 30 segundos quando conectado
    checkIntervalRef.current = setInterval(() => {
      if (connectionStatus === 'connected') {
        // Verificação silenciosa em background
        fetch('/api/health', { 
          method: 'GET',
          credentials: 'include' 
        }).catch(() => {
          // Se perder conexão, voltar para checking
          setConnectionStatus('checking')
          setStatusMessage('Carregando...')
          startTimeRef.current = Date.now()
          checkConnection()
        })
      }
    }, 30000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [])

  // ── Effect: Timer para mensagens progressivas ───────────────
  useEffect(() => {
    if (connectionStatus === 'checking') {
      messageTimerRef.current = setInterval(updateProgressiveMessages, 100)
    } else {
      if (messageTimerRef.current) {
        clearInterval(messageTimerRef.current)
      }
    }

    return () => {
      if (messageTimerRef.current) {
        clearInterval(messageTimerRef.current)
      }
    }
  }, [connectionStatus])

  // ── Render: Loader ou Children ──────────────────────────────
  // Se não estiver conectado, mostra loader fullscreen
  if (connectionStatus !== 'connected') {
    return (
      <div 
        className="fixed inset-0 flex flex-col items-center justify-center z-[9999]"
        style={{ backgroundColor: '#000000' }}
      >
        {/* ── Vídeo de loader ──────────────────────────────────── */}
        <video
          src="/loader.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-64 h-64 object-contain"
          aria-label="Carregando aplicação"
        />

        {/* ── Mensagem de status ───────────────────────────────── */}
        <p
          role="status"
          aria-live="polite"
          className={`mt-6 text-base font-medium ${
            connectionStatus === 'error' 
              ? 'text-brand-red' 
              : 'text-white'
          }`}
        >
          {statusMessage}
        </p>

        {/* ── Botão de retry (condicional) ─────────────────────── */}
        {showRetry && (
          <button
            onClick={handleRetry}
            className="mt-6 bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Tentar conectar novamente"
          >
            Tentar Novamente
          </button>
        )}
      </div>
    )
  }

  // Se conectado, renderiza os children (toda a aplicação)
  return (
    <ConnectionContext.Provider value={{ connectionStatus }}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider')
  return ctx
}
