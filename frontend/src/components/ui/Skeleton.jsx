// =============================================================
//  Skeleton — bloco de shimmer para estados de carregamento
//
//  Uso básico:
//    <Skeleton className="h-6 w-32 rounded-lg" />
//
//  Todos os filhos herdam o efeito animate-pulse do pai.
// =============================================================

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-brand-border/70 dark:bg-brand-border/50 rounded-lg ${className}`}
    />
  )
}

// Grupo: envolve vários Skeletons com um único pulse sincronizado
export function SkeletonGroup({ children, className = '' }) {
  return <div className={`animate-pulse ${className}`}>{children}</div>
}
