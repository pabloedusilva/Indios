// =============================================================
//  pages/Cardapio.jsx — Cardápio público
//
//  · Rota pública: /cardapio — acessível sem autenticação
//  · Dados em tempo real via /api/cardapio (auto-refresh 60s)
//  · Sem botão fechar — página independente
//  · Fundo: cardapio-bg.png com overlay sutil
// =============================================================

import { useCardapio } from '../hooks/useCardapio'
import { formatarMoeda } from '../utils/formatters'
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton'
import { MdInventory2 } from 'react-icons/md'

// ── Skeleton de loading ───────────────────────────────────────
function CardapioSkeleton() {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in">
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2.5 px-4 sm:px-6 py-4">
          <Skeleton className="h-7 w-7 rounded-lg bg-white/10" />
          <Skeleton className="h-5 w-48 rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
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

  const produtosDisponiveis = produtos.filter((p) => p.disponivel !== false)
  const categorias = [...new Set(produtosDisponiveis.map((p) => p.categoria))].sort()

  if (loading) return <CardapioSkeleton />

  return (
    <div className="fixed inset-0 flex flex-col animate-fade-in">

      {/* ── Fundo ───────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/cardapio/cardapio-bg.png')" }}
      />
      {/* Película sutil para melhorar legibilidade sem esconder o fundo */}
      <div className="absolute inset-0 bg-black/40" />

      {/* ── Header ──────────────────────────────────────── */}
      <header className="relative z-10 flex-shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
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
          <img
            src="/logo.png"
            alt="Logo"
            className="h-8 sm:h-10 w-auto object-contain flex-shrink-0 ml-4 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
          />
        </div>
      </header>

      {/* ── Conteúdo scrollável ──────────────────────────── */}
      <main className="relative z-10 flex-1 overflow-y-auto">

        {/* ── Slogan ───────────────────────────────────── */}
        <div className="flex justify-center px-4 sm:px-6 pt-3 pb-0">
          <img
            src="/cardapio/slogan.png"
            alt="Slogan Índios Churrasco Gourmet"
            className="w-full max-w-[200px] sm:max-w-sm md:max-w-md lg:max-w-lg object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] -mb-2"
            draggable={false}
          />
        </div>

        <div className="px-4 sm:px-6 pt-2 pb-6 space-y-6">

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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-0.5 h-4 rounded-full bg-brand-orange flex-shrink-0" />
                  <p className="font-heading text-xs sm:text-sm font-bold text-white uppercase tracking-[0.15em]">
                    {categoria}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {itens.map((produto) => (
                    <div
                      key={produto.id}
                      className="flex flex-col justify-between gap-1.5 px-3 py-3 min-h-[64px] rounded-xl
                                 bg-white/10 border border-white/15 backdrop-blur-sm
                                 hover:bg-white/15 hover:border-brand-orange/50 transition-all"
                    >
                      <p className="text-xs sm:text-sm font-semibold text-white leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                        {produto.nome}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-brand-orange drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
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

        {/* ── Footer ───────────────────────────────────── */}
        <footer className="border-t border-white/10 mt-2">
          <p className="text-center text-xs text-white/40 py-3">
            Índios Churrasco Gourmet
          </p>
        </footer>
      </main>
    </div>
  )
}
