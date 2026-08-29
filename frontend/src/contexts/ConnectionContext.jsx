// =============================================================
//  contexts/ConnectionContext.jsx — Contexto de verificação de conexão
//
//  · Usa hook useBackendStatus para detecção resiliente
//  · Zero flicker visual em recarregamentos
//  · Loader apenas quando necessário (> 300ms)
//  · Transições suaves com overlay preto
// =============================================================

import { createContext, useContext, useState, useEffect } from 'react'
import { useBackendStatus } from '../hooks/useBackendStatus'

const ConnectionContext = createContext(null)

export function ConnectionProvider({ children }) {
  const { isOnline, showLoader, error, retry } = useBackendStatus()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showChildren, setShowChildren] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)

  // ── Effect: Transição quando conectar ───────────────────────
  useEffect(() => {
    if (isOnline && !showChildren && !isTransitioning) {
      // Mostrar "Conectado!" por 600ms
      setTimeout(() => {
        setIsTransitioning(true)
        setShowOverlay(true)
        
        // Após 800ms, mostrar app diretamente (sem fade)
        setTimeout(() => {
          setShowChildren(true)
        }, 800)
      }, 600)
    }
  }, [isOnline, showChildren, isTransitioning])

  // ── Render: App ou Loader ────────────────────────────────────
  // Se já terminou transição, mostra APENAS o app (loader removido do DOM)
  if (showChildren) {
    return (
      <ConnectionContext.Provider value={{ isOnline }}>
        {children}
      </ConnectionContext.Provider>
    )
  }

  // Se conectou mas não deve mostrar loader, mostra app direto
  if (isOnline && !showLoader && !error) {
    return (
      <ConnectionContext.Provider value={{ isOnline }}>
        {children}
      </ConnectionContext.Provider>
    )
  }

  // SEMPRE mostrar loader quando não estiver pronto (mesmo que conexão seja rápida)
  // Isso garante a animação completa sempre
  return (
    <ConnectionContext.Provider value={{ isOnline }}>
      {/* Loader com fundo preto e transição suave */}
      <div 
        className={`fixed inset-0 flex flex-col z-[9999] overflow-hidden ${
          isTransitioning 
            ? 'animate-loader-fade-out' 
            : 'opacity-100'
        }`}
        style={{ backgroundColor: '#000000' }}
      >
          {/* ── Área central — cresce para empurrar footer para baixo ── */}
          <div className="flex-1 flex items-center justify-center relative -mt-32">
            {/* ── Vídeo de loader (posicionado absolutamente) ────── */}
            <video
              src="/loader.mp4"
              autoPlay
              muted
              playsInline
              className="absolute w-[520px] h-[520px] object-contain"
              onEnded={(e) => {
                e.currentTarget.pause()
                e.currentTarget.currentTime = e.currentTarget.duration
              }}
            />

            {/* ── Conteúdo sobreposto ao vídeo ───────────────────── */}
            <div
              className={`flex flex-col items-center relative z-10 ${
                isTransitioning ? 'animate-content-fade-out' : 'opacity-100'
              }`}
            >
              {/* Espaçador para empurrar o texto para baixo do vídeo */}
              <div className="h-[340px]" />

              {/* ── Mensagem de status ─────────────────────────────── */}
              <div className="mt-6 h-8 flex items-center justify-center relative w-full px-4">
                <p
                  role="status"
                  aria-live="polite"
                  className={`absolute font-medium whitespace-nowrap transition-all duration-300 text-lg ${
                    error 
                      ? 'text-red-400' 
                      : isOnline 
                        ? 'text-white animate-pulse-soft' 
                        : 'text-white/70'
                  }`}
                >
                  {error ? 'Não foi possível conectar ao servidor' : (isOnline ? 'Conectado!' : (
                    <span className="flex items-center gap-1.5">
                      Carregando
                      <span className="flex gap-1 ml-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-[pulse_1.5s_ease-in-out_0s_infinite]" style={{ opacity: 0.4 }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-[pulse_1.5s_ease-in-out_0.3s_infinite]" style={{ opacity: 0.4 }}></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-[pulse_1.5s_ease-in-out_0.6s_infinite]" style={{ opacity: 0.4 }}></span>
                      </span>
                    </span>
                  ))}
                </p>
              </div>

              {/* ── Botão de retry — estático ──────────────────────── */}
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

          {/* ── Footer ─────────────────────────────────────────── */}
          <p className="text-center text-xs text-white/30 pb-4">
            Desenvolvido por{' '}
            <a
              href="https://github.com/pabloedusilva"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-orange underline underline-offset-2 hover:text-brand-orange-dark transition-colors"
            >
              Pablo Silva
            </a>
          </p>

          {/* ── Overlay preto para transição final ──────────────── */}
          {showOverlay && (
            <div 
              className="fixed inset-0 bg-black z-10 animate-overlay-fade-in"
              aria-hidden="true"
            />
          )}
        </div>
      </ConnectionContext.Provider>
    )
}

export function useConnection() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider')
  return ctx
}
