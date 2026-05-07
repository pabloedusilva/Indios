// =============================================================
//  contexts/ConnectionContext.jsx — Contexto de verificação de conexão
//
//  · Usa hook useBackendStatus para detecção resiliente
//  · Zero flicker visual em recarregamentos
//  · Loader apenas quando necessário (> 300ms)
//  · Transições suaves e profissionais com fade-out elaborado
// =============================================================

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useBackendStatus } from '../hooks/useBackendStatus'

const ConnectionContext = createContext(null)

// ── Hook de parallax com mouse ────────────────────────────────
function useParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const rafRef = useRef(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })

  const onMouseMove = useCallback((e) => {
    // Normaliza posição do mouse de -1 a 1 em relação ao centro da tela
    targetRef.current = {
      x: (e.clientX / window.innerWidth  - 0.5) * 2,
      y: (e.clientY / window.innerHeight - 0.5) * 2,
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)

    // Spring physics: lerp na posição + amortecimento na velocidade
    // Dá sensação de peso e inércia ao vídeo
    const animate = () => {
      const stiffness = 0.12  // quão rápido persegue o alvo
      const damping   = 0.75  // amortecimento (0 = sem atrito, 1 = parado)

      const dx = targetRef.current.x - currentRef.current.x
      const dy = targetRef.current.y - currentRef.current.y

      velocityRef.current.x = velocityRef.current.x * damping + dx * stiffness
      velocityRef.current.y = velocityRef.current.y * damping + dy * stiffness

      currentRef.current.x += velocityRef.current.x
      currentRef.current.y += velocityRef.current.y

      setOffset({ x: currentRef.current.x, y: currentRef.current.y })
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [onMouseMove])

  return offset
}

export function ConnectionProvider({ children }) {
  const { isOnline, showLoader, error, retry } = useBackendStatus()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showChildren, setShowChildren] = useState(false)
  const parallax = useParallax()

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
          className={`fixed inset-0 flex flex-col z-[9999] ${
            isTransitioning 
              ? 'animate-loader-fade-out' 
              : 'opacity-100'
          }`}
          style={{ backgroundColor: '#000000' }}
        >
          {/* ── Área central — cresce para empurrar footer para baixo ── */}
          <div className="flex-1 flex items-center justify-center">
            <div
              className={`flex flex-col items-center ${
                isTransitioning ? 'animate-content-fade-out' : 'opacity-100'
              }`}
            >
              {/* ── Vídeo com parallax ─────────────────────────────── */}
              <div
                style={{
                  transform: `
                    translate(${parallax.x * 28}px, ${parallax.y * 28}px)
                    rotateX(${-parallax.y * 14}deg)
                    rotateY(${parallax.x * 14}deg)
                    scale(${1 + (Math.abs(parallax.x) + Math.abs(parallax.y)) * 0.04})
                  `,
                  willChange: 'transform',
                  perspective: '600px',
                  transformStyle: 'preserve-3d',
                }}
              >
                <video
                  src="/loader.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-64 h-64 object-contain"
                  aria-label="Carregando aplicação"
                />
              </div>

              {/* ── Mensagem de status — estática ─────────────────── */}
              <div className="mt-6 h-8 flex items-center justify-center relative w-full px-4">
                <p
                  role="status"
                  aria-live="polite"
                  className={`absolute text-base font-medium whitespace-nowrap transition-all duration-300 ${
                    error 
                      ? 'text-red-400' 
                      : isOnline 
                        ? 'text-white animate-pulse-soft' 
                        : 'text-white/70'
                  }`}
                >
                  {error || (isOnline ? 'Conectado!' : 'Conectando ao servidor...')}
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

          {/* ── Footer — idêntico ao da página de Login ────────────── */}
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
