// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Nota Fiscal Skeleton
// ════════════════════════════════════════════════════════════════════════════
// Loading skeleton para cards de notas fiscais.
//
// PROPS:
// - count: number (quantidade de skeletons, padrão 5)
//
// ESTRUTURA DO SKELETON:
// - Card com bordas arredondadas
// - Linha para número da nota (largura ~20%)
// - Linha para data (largura ~30%)
// - Linha para destinatário (largura ~60%)
// - Linha para valor (largura ~25%)
// - Badge de status (largura fixa)
// - Botões de ação (3 círculos)
//
// ANIMAÇÃO:
// - Shimmer effect (gradiente animado)
// - Pulsação suave
// - Duração: 1.5s loop infinito
//
// DESIGN:
// - Segue padrão dos cards reais
// - Cores neutras (brand-border)
// - Espaçamento idêntico ao card real
// - Responsive (adapta ao tamanho do container)
//
// USO:
// <NotaFiscalSkeleton count={8} />
// ════════════════════════════════════════════════════════════════════════════

import { Skeleton, SkeletonGroup } from '../ui/Skeleton'

function SingleNotaSkeleton() {
  return (
    <SkeletonGroup className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3.5">
      <div className="flex items-center gap-3">
        {/* Ícone */}
        <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />

        {/* Info principal */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-5 w-20 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Valor */}
        <Skeleton className="h-4 w-24 flex-shrink-0" />

        {/* Botões de ação */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </SkeletonGroup>
  )
}

export default function NotaFiscalSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <SingleNotaSkeleton key={i} />
      ))}
    </div>
  )
}

