// =============================================================
//  pages/Cardapio.jsx — Cardápio público
//
//  · Rota pública: /cardapio — acessível sem autenticação
//  · Dados em tempo real via /api/cardapio (auto-refresh 60s)
//  · Sem botão fechar — página independente
//  · Desktop: 3 slots com double-buffer + crossfade suave
//  · Mobile: 1 slot com double-buffer + crossfade suave
// =============================================================

import { useEffect, useRef, useState, useCallback } from 'react'
import { useCardapio } from '../hooks/useCardapio'
import { formatarMoeda } from '../utils/formatters'
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton'
import { MdInventory2 } from 'react-icons/md'

// ── Lista de vídeos de fundo ──────────────────────────────────
const VIDEOS = [
  '/cardapio/1.mp4',
  '/cardapio/2.mp4',
  '/cardapio/3.mp4',
  '/cardapio/4.mp4',
  '/cardapio/5.mp4',
  '/cardapio/6.mp4',
]

const FADE_MS = 800 // duração do crossfade em ms

function escolherAleatorio(excluir = []) {
  const disponiveis = VIDEOS.map((_, i) => i).filter((i) => !excluir.includes(i))
  if (disponiveis.length === 0) {
    const ultimo = excluir[excluir.length - 1] ?? -1
    const fb = VIDEOS.map((_, i) => i).filter((i) => i !== ultimo)
    return fb[Math.floor(Math.random() * fb.length)]
  }
  return disponiveis[Math.floor(Math.random() * disponiveis.length)]
}

// ── Double-buffer video slot ──────────────────────────────────
// Dois elementos <video> sobrepostos. O "ativo" toca em frente,
// o "buffer" carrega o próximo em background. Na troca, faz
// crossfade via opacity e inverte os papéis.
function VideoSlot({ initialIndex, excluirGlobal = [] }) {
  const refA = useRef(null)
  const refB = useRef(null)
  // active: qual buffer está na frente (0 = A, 1 = B)
  const activeRef = useRef(0)
  const [activeLayer, setActiveLayer] = useState(0)
  const currentIndexRef = useRef(initialIndex)
  const excluirRef = useRef(excluirGlobal)
  const fadingRef = useRef(false)

  // Mantém excluirGlobal atualizado sem re-render
  useEffect(() => { excluirRef.current = excluirGlobal }, [excluirGlobal])

  // Inicia o próximo vídeo no buffer inativo e faz crossfade
  const trocar = useCallback(() => {
    if (fadingRef.current) return
    fadingRef.current = true

    const nextActive = activeRef.current === 0 ? 1 : 0
    const nextRef = nextActive === 0 ? refA : refB
    const el = nextRef.current
    if (!el) { fadingRef.current = false; return }

    // Escolhe próximo vídeo evitando o atual e os outros slots
    const excluir = [...excluirRef.current, currentIndexRef.current]
    const nextIndex = escolherAleatorio(excluir)
    currentIndexRef.current = nextIndex

    el.src = VIDEOS[nextIndex]
    el.load()

    const onCanPlay = () => {
      el.removeEventListener('canplay', onCanPlay)
      el.play().catch(() => {})
      // Crossfade: traz o buffer para frente
      activeRef.current = nextActive
      setActiveLayer(nextActive)
      setTimeout(() => { fadingRef.current = false }, FADE_MS)
    }

    el.addEventListener('canplay', onCanPlay)

    // Fallback: se demorar mais de 3s, troca mesmo assim
    setTimeout(() => {
      el.removeEventListener('canplay', onCanPlay)
      if (fadingRef.current) {
        el.play().catch(() => {})
        activeRef.current = nextActive
        setActiveLayer(nextActive)
        setTimeout(() => { fadingRef.current = false }, FADE_MS)
      }
    }, 3000)
  }, [])

  // Inicialização: carrega e toca o vídeo inicial no layer A
  useEffect(() => {
    const elA = refA.current
    const elB = refB.current
    if (!elA || !elB) return

    elA.src = VIDEOS[initialIndex]
    elA.load()
    elA.play().catch(() => {})

    // Pré-carrega o próximo no buffer B silenciosamente
    const nextIndex = escolherAleatorio([initialIndex, ...excluirRef.current])
    elB.src = VIDEOS[nextIndex]
    elB.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const styleA = {
    opacity: activeLayer === 0 ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease-in-out`,
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover',
  }
  const styleB = {
    opacity: activeLayer === 1 ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease-in-out`,
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover',
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <video ref={refA} style={styleA} muted playsInline preload="auto" onEnded={trocar} />
      <video ref={refB} style={styleB} muted playsInline preload="auto" onEnded={trocar} />
    </div>
  )
}

// ── Fundo desktop: 3 slots lado a lado ───────────────────────
function VideoBackgroundDesktop() {
  // Distribui vídeos iniciais sem repetição entre os 3 slots — calculado uma vez
  const initialSlots = useRef(null)
  if (!initialSlots.current) {
    const shuffled = [...VIDEOS.keys()].sort(() => Math.random() - 0.5)
    initialSlots.current = [shuffled[0], shuffled[1], shuffled[2]]
  }

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      {[0, 1, 2].map((slotIdx) => (
        <div key={slotIdx} className="flex-1 h-full overflow-hidden relative">
          <VideoSlot
            initialIndex={initialSlots.current[slotIdx]}
            excluirGlobal={[]}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-black/85" />
    </div>
  )
}

// ── Fundo mobile: 1 slot ─────────────────────────────────────
function VideoBackgroundMobile() {
  const initialIndex = useRef(Math.floor(Math.random() * VIDEOS.length)).current

  return (
    <div className="absolute inset-0 overflow-hidden">
      <VideoSlot initialIndex={initialIndex} excluirGlobal={[]} />
      <div className="absolute inset-0 bg-black/85" />
    </div>
  )
}

// ── Fundo responsivo ─────────────────────────────────────────
function VideoBackground() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsMobile(!e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile ? <VideoBackgroundMobile /> : <VideoBackgroundDesktop />
}

// ── Skeleton de loading ───────────────────────────────────────
function CardapioSkeleton() {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in">
      {/* Header skeleton */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2.5 px-6 py-4">
          <Skeleton className="h-7 w-7 rounded-lg bg-white/10" />
          <Skeleton className="h-5 w-48 rounded-lg bg-white/10" />
        </div>
      </div>
      {/* Conteúdo skeleton */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {Array.from({ length: 3 }).map((_, gi) => (
          <SkeletonGroup key={gi}>
            <Skeleton className="h-3 w-24 mb-4 bg-white/10" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {Array.from({ length: gi === 0 ? 6 : gi === 1 ? 4 : 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1 px-3 py-3 min-h-[64px] rounded-xl bg-white/10 border border-white/10">
                  <Skeleton className="h-3 w-full rounded bg-white/10" />
                  <Skeleton className="h-3 w-14 rounded bg-white/10" />
                </div>
              ))}
            </div>
          </SkeletonGroup>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function Cardapio() {
  const { produtos, loading, error } = useCardapio()

  // A API já retorna apenas disponíveis, mas garantimos no cliente também
  const produtosDisponiveis = produtos.filter((p) => p.disponivel !== false)
  const categorias = [...new Set(produtosDisponiveis.map((p) => p.categoria))].sort()

  if (loading) return <CardapioSkeleton />

  return (
    <div className="fixed inset-0 flex flex-col animate-fade-in">

      {/* ── Fundo de vídeo ──────────────────────────────── */}
      <VideoBackground />

      {/* ── Header ──────────────────────────────────────── */}
      <header className="relative z-10 flex-shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Esquerda — ícone + título */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
              <MdInventory2 className="text-brand-orange" size={15} />
            </div>
            <h1 className="font-heading text-base sm:text-lg font-bold text-white truncate">
              Cardápio Disponível
              {!error && (
                <span className="ml-2 text-xs sm:text-sm font-normal text-white/60">
                  {produtosDisponiveis.length} {produtosDisponiveis.length === 1 ? 'item' : 'itens'}
                </span>
              )}
            </h1>
          </div>

          {/* Direita — logo */}
          <img
            src="/logo.png"
            alt="Logo"
            className="h-8 sm:h-10 w-auto object-contain flex-shrink-0 ml-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
          />
        </div>
      </header>

      {/* ── Conteúdo scrollável ──────────────────────────── */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        {/* ── Slogan — centralizado, logo abaixo do header ─ */}
        <div className="flex justify-center px-6 pt-2 pb-0">
          <img
            src="/cardapio/slogan.png"
            alt="Slogan Índios Churrasco Gourmet"
            className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] -mb-4"
            draggable={false}
          />
        </div>

        <div className="px-6 pt-0 pb-6 space-y-6">

          {/* Estado de erro */}
          {error && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <MdInventory2 className="text-white/20" size={40} />
              <p className="text-white/40 text-sm">Não foi possível carregar o cardápio.</p>
              <p className="text-white/25 text-xs">{error}</p>
            </div>
          )}

          {/* Categorias e produtos */}
          {!error && categorias.map((categoria) => {
            const itens = produtosDisponiveis.filter((p) => p.categoria === categoria)
            if (itens.length === 0) return null
            return (
              <section key={categoria}>
                {/* Rótulo da categoria */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-0.5 h-4 rounded-full bg-brand-orange flex-shrink-0" />
                  <p className="font-heading text-sm font-bold text-white uppercase tracking-[0.15em]">
                    {categoria}
                  </p>
                </div>

                {/* Grid de produtos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {itens.map((produto) => (
                    <div
                      key={produto.id}
                      className="flex flex-col justify-between gap-1.5 px-3 py-3 min-h-[64px] rounded-xl
                                 bg-white/10 border border-white/15 backdrop-blur-sm
                                 hover:bg-white/15 hover:border-brand-orange/50 transition-all"
                    >
                      <p className="text-sm font-semibold text-white leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                        {produto.nome}
                      </p>
                      <p className="text-sm font-bold text-brand-orange drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                        {formatarMoeda(produto.preco)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}

          {/* Estado vazio */}
          {!error && produtosDisponiveis.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <MdInventory2 className="text-white/20" size={40} />
              <p className="text-white/40 text-sm">Nenhum item disponível no momento</p>
            </div>
          )}

        </div>

        {/* ── Footer — sempre no final do conteúdo ─────── */}
        <footer className="border-t border-white/10 mt-2">
          <p className="text-center text-xs text-white/40 py-3">
            Índios Churrasco Gourmet
          </p>
        </footer>
      </main>
    </div>
  )
}
