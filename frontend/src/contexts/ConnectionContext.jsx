// =============================================================
//  contexts/ConnectionContext.jsx — Contexto de verificação de conexão
//
//  · Usa hook useBackendStatus para detecção resiliente
//  · Zero flicker visual em recarregamentos
//  · Loader apenas quando necessário (> 300ms)
//  · Transições suaves e profissionais com fade-out elaborado
// =============================================================

import { createContext, useContext, useState, useEffect } from 'react'
import { useBackendStatus } from '../hooks/useBackendStatus'

const ConnectionContext = createContext(null)

export function ConnectionProvider({ children }) {
  const { isOnline, showLoader, error, retry } = useBackendStatus()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showChildren, setShowChildren] = useState(false)

  // ── Effect: Transição quando conectar ───────────────────────
  useEffect(() => {
    if (isOnline && !showChildren) {
      // Delay maior para mostrar "Conectado!" claramente (1500ms)
      setTimeout(() => {
        setIsTransitioning(true)
        
        // Após fade-out completo (800ms), mostrar app
        setTimeout(() => {
          setShowChildren(true)
        }, 800)
      }, 1500)
    }
  }, [isOnline, showChildren])

  // ── Render: App ou Loader ────────────────────────────────────
  // Se já conectou e terminou transição, mostra app
  if (showChildren) {
    return (
      <ConnectionContext.Provider value={{ isOnline }}>
        {children}
      </ConnectionContext.Provider>
    )
  }

  // Se conectou mas ainda não mostrou loader, mostra app direto (zero flicker)
  if (isOnline && !showLoader) {
    return (
      <ConnectionContext.Provider value={{ isOnline }}>
        {children}
      </ConnectionContext.Provider>
    )
  }

  // Se deve mostrar loader (demorou > 300ms ou erro)
  if (showLoader || error) {
    return (
      <ConnectionContext.Provider value={{ isOnline }}>
        {/* Loader com fundo preto e transição suave */}
        <div 
          className={`fixed inset-0 flex flex-col items-center justify-center z-[9999] ${
            isTransitioning 
              ? 'animate-loader-fade-out' 
              : 'opacity-100'
          }`}
          style={{ backgroundColor: '#000000' }}
        >
          {/* ── Container com fade-out adicional ──────────────────── */}
          <div className={`flex flex-col items-center ${
            isTransitioning ? 'animate-content-fade-out' : 'opacity-100'
          }`}>
            {/* ── Vídeo de loader ────────────────────────────────── */}
            <video
              src="/loader.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-64 h-64 object-contain"
              aria-label="Carregando aplicação"
            />

            {/* ── Mensagem de status ─────────────────────────────── */}
            <div className="mt-6 h-8 flex items-center justify-center relative w-full px-4">
              <p
                role="status"
                aria-live="polite"
                className={`absolute text-base font-medium whitespace-nowrap transition-all duration-300 ${
                  error 
                    ? 'text-brand-red' 
                    : isOnline 
                      ? 'text-white animate-pulse-soft' 
                      : 'text-white'
                }`}
              >
                {error || (isOnline ? 'Conectado!' : 'Conectando ao servidor...')}
              </p>
            </div>

            {/* ── Botão de retry (condicional) ───────────────────── */}
            {error && (
              <button
                onClick={retry}
                className="mt-6 bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95 animate-fade-in"
                aria-label="Tentar conectar novamente"
              >
                Tentar Novamente
              </button>
            )}
          </div>
        </div>
      </ConnectionContext.Provider>
    )
  }

  // Estado inicial: não mostra nada (evita flicker)
  return null
}

export function useConnection() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider')
  return ctx
}
