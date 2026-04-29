// =============================================================
//  pages/Cardapio.jsx — Cardápio público
//
//  · Rota pública: /cardapio — acessível sem autenticação
//  · Dados em tempo real via /api/cardapio (auto-refresh 60s)
//  · Sem botão fechar — página independente
//  · Desktop: 3 vídeos lado a lado com troca aleatória
//  · Mobile: 1 vídeo em tela cheia
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

// Escolhe índice aleatório excluindo os proibidos
function escolherAleatorio(excluir = []) {
  const disponiveis = VIDEOS.map((_, i) => i).filter((i) => !excluir.includes(i))
  if (disponiveis.length === 0) {
    const ultimo = excluir[excluir.length - 1] ?? -1
    const fb = VIDEOS.map((_, i) => i).filter((i) => i !== ultimo)
    return fb[Math.floor(Math.random() * fb.length)]
  }
  return disponiveis[Math.floor(Math.random() * disponiveis.length)]
}

// Pré-carrega um vídeo em background sem reproduzir
function preloadVideo(src) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'video'
  link.href = src
  document.head.appendChild(link)
}

// ── Slot de vídeo individual (desktop) ───────────────────────
// O elemento <video> permanece estável no DOM — apenas o src muda via ref,
// evitando desmontagem/remontagem e re-download desnecessário.
function VideoSlot({ indice, onEnded }) {
  const videoRef = useRef(null)
  const indiceRef = useRef(indice)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const src = VIDEOS[indice]

    // Só recarrega se o src realmente mudou
    if (indiceRef.current !== indice) {
      indiceRef.current = indice
      el.src = src
      el.load()
    }

    el.play().catch(() => {})

    // Pré-carrega o próximo vídeo aleatório enquanto este toca
    const proximo = escolherAleatorio([indice])
    preloadVideo(VIDEOS[proximo])
  }, [indice])

  return (
    <video
      ref={videoRef}
      onEnded={onEnded}
      muted
      playsInline
      autoPlay
      preload="auto"
      src={VIDEOS[indice]}
      className="w-full h-full object-cover"
    />
  )
}

// ── Fundo desktop: 3 vídeos lado a lado ──────────────────────
function VideoBackgroundDesktop() {
  const [slots, setSlots] = useState(() => {
    const shuffled = [...VIDEOS.keys()].sort(() => Math.random() - 0.5)
    return [shuffled[0], shuffled[1], shuffled[2]]
  })
  const lastUsed = useRef([null, null, null])

  const handleEnded = useCallback((slotIdx) => {
    setSlots((prev) => {
      const outros = prev.filter((_, i) => i !== slotIdx)
      const excluir = [...outros, lastUsed.current[slotIdx]].filter((v) => v !== null)
      const novo = escolherAleatorio(excluir)
      lastUsed.current[slotIdx] = prev[slotIdx]
      const next = [...prev]
      next[slotIdx] = novo
      return next
    })
  }, [])

  return (
    <div className="absolute inset-0 flex overflow-hidden">
      {slots.map((videoIdx, slotIdx) => (
        // key={slotIdx} fixo — mantém o elemento no DOM, só muda o src
        <div key={slotIdx} className="flex-1 h-full overflow-hidden">
          <VideoSlot indice={videoIdx} onEnded={() => handleEnded(slotIdx)} />
        </div>
      ))}
      <div className="absolute inset-0 bg-black/85" />
    </div>
  )
}

// ── Fundo mobile: 1 vídeo em loop sequencial ─────────────────
// Elemento <video> estável — src trocado via ref sem remontar.
function VideoBackgroundMobile() {
  const [indice, setIndice] = useState(0)
  const videoRef = useRef(null)
  const indiceRef = useRef(0)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    if (indiceRef.current !== indice) {
      indiceRef.current = indice
      el.src = VIDEOS[indice]
      el.load()
    }

    el.play().catch(() => {})

    // Pré-carrega o próximo
    const proximo = (indice + 1) % VIDEOS.length
    preloadVideo(VIDEOS[proximo])
  }, [indice])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <video
        ref={videoRef}
        onEnded={() => setIndice((i) => (i + 1) % VIDEOS.length)}
        muted
        playsInline
        autoPlay
        preload="auto"
        src={VIDEOS[0]}
        className="absolute inset-0 w-full h-full object-cover"
      />
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
