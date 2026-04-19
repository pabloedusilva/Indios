export default function PageLoader({ label = 'Carregando...' }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-brand-text-3">
        <div className="w-9 h-9 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}
