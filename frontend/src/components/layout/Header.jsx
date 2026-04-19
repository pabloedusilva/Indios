import { MdMenu } from 'react-icons/md'
import { useApp } from '../../contexts/AppContext'
import ThemeToggle from '../ui/ThemeToggle'
import { formatarMoeda } from '../../utils/formatters'
import { useLocation } from 'react-router-dom'
import { Skeleton } from '../ui/Skeleton'

const titulos = {
  '/dashboard': 'Dashboard',
  '/pedidos': 'Pedidos',
  '/produtos': 'Produtos',
  '/historico': 'Histórico',
}

const subtitulos = {
  '/dashboard': 'Visão geral do dia',
  '/pedidos': 'Fila ativa de pedidos',
  '/produtos': 'Cardápio e estoque',
  '/historico': 'Todos os pedidos',
}

export default function Header({ onMenuClick }) {
  const { faturamentoHoje, pedidosHoje, loading } = useApp()
  const location = useLocation()
  const titulo = titulos[location.pathname] || 'Painel'
  const sub = subtitulos[location.pathname] || ''
  const pedidosCount = pedidosHoje.filter((p) => p.status !== 'cancelado').length

  return (
    <header className="h-16 bg-brand-surface border-b border-brand-border flex items-center justify-between px-5 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-brand-bg text-brand-text-2 hover:text-brand-text transition-colors"
        >
          <MdMenu size={20} />
        </button>
        <div>
          <h2 className="font-heading text-base font-bold text-brand-text leading-tight">{titulo}</h2>
          <p className="text-[11px] text-brand-text-3">{sub}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-brand-text-3 uppercase tracking-wider">Faturamento hoje</p>
            {loading
              ? <Skeleton className="h-4 w-20 mt-0.5 ml-auto" />
              : <p className="text-sm font-bold text-brand-orange">{formatarMoeda(faturamentoHoje)}</p>
            }
          </div>
          <div className="w-px h-7 bg-brand-border" />
          <div className="text-right">
            <p className="text-[10px] text-brand-text-3 uppercase tracking-wider">Pedidos hoje</p>
            {loading
              ? <Skeleton className="h-4 w-8 mt-0.5 ml-auto" />
              : <p className="text-sm font-bold text-brand-text">{pedidosCount}</p>
            }
          </div>
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
