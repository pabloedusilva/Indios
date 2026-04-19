import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { formatarMoeda } from '../utils/formatters'
import PageLoader from '../components/ui/PageLoader'
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton'
import { MdInventory2, MdClose } from 'react-icons/md'

export default function Cardapio() {
  const { produtos, loading } = useApp()
  const navigate = useNavigate()

  const produtosDisponiveis = produtos.filter((p) => p.disponivel)
  const categorias = [...new Set(produtosDisponiveis.map((p) => p.categoria))].sort()

  if (loading) return (
    <div className="fixed inset-0 bg-brand-bg z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-brand-surface border-b border-brand-border flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <SkeletonGroup className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-5 w-48 rounded-lg" />
          </SkeletonGroup>
          <Skeleton className="h-8 w-8 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {Array.from({ length: 3 }).map((_, gi) => (
          <SkeletonGroup key={gi}>
            <Skeleton className="h-3 w-24 mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {Array.from({ length: gi === 0 ? 6 : gi === 1 ? 4 : 8 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1 px-3 py-2.5 min-h-[56px] rounded-xl bg-brand-surface border border-brand-border">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-14 rounded" />
                </div>
              ))}
            </div>
          </SkeletonGroup>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-brand-bg z-50 flex flex-col animate-fade-in">

      {/* ─── Header ─── */}
      <div className="bg-brand-surface border-b border-brand-border flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-orange/10 flex items-center justify-center">
              <MdInventory2 className="text-brand-orange" size={15} />
            </div>
            <h2 className="font-heading text-lg font-bold text-brand-text">
              Cardápio Disponível
              <span className="ml-2 text-sm font-normal text-brand-text-3">
                {produtosDisponiveis.length} itens
              </span>
            </h2>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-brand-text-3
                       hover:text-brand-text hover:bg-brand-bg transition-all"
          >
            <MdClose size={18} />
          </button>
        </div>
      </div>

      {/* ─── Conteúdo scrollável ─── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {categorias.map((categoria) => {
            const itens = produtosDisponiveis.filter((p) => p.categoria === categoria)
            if (itens.length === 0) return null
            return (
              <div key={categoria}>
                <p className="text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider mb-3">
                  {categoria}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {itens.map((produto) => (
                    <div
                      key={produto.id}
                      className="flex flex-col justify-between gap-1 px-3 py-2.5 min-h-[56px] rounded-xl
                                 bg-brand-surface border border-brand-border
                                 hover:border-brand-orange/30 hover:bg-brand-surface-2 transition-all"
                    >
                      <p className="text-xs font-semibold text-brand-text leading-tight">{produto.nome}</p>
                      <p className="text-xs font-bold text-brand-orange">{formatarMoeda(produto.preco)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {produtosDisponiveis.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <MdInventory2 className="text-brand-border-2" size={40} />
              <p className="text-brand-text-3 text-sm">Nenhum item disponível no momento</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
