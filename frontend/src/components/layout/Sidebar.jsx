import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MdDashboard, MdRestaurantMenu, MdInventory2,
  MdHistory, MdClose, MdLogout, MdBarChart, MdSettings, MdPayment,
} from 'react-icons/md'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import ModalConfiguracoes from '../ui/ModalConfiguracoes'
import ModalPagamentos from '../ui/ModalPagamentos'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',    icon: MdDashboard,      exact: true },
  { to: '/pedidos',      label: 'Pedidos',      icon: MdRestaurantMenu },
  { to: '/produtos',     label: 'Produtos',     icon: MdInventory2 },
  { to: '/historico',    label: 'Histórico',    icon: MdHistory },
  { to: '/estatisticas', label: 'Estatísticas', icon: MdBarChart },
]

export default function Sidebar({ isOpen, onClose }) {
  const { pedidosAtivos } = useApp()
  const { logoutFn } = useAuth()
  const navigate = useNavigate()
  const pendentes = pedidosAtivos.filter((p) => p.status === 'preparando').length
  const [modalConfigOpen,    setModalConfigOpen]    = useState(false)
  const [modalPagamentosOpen, setModalPagamentosOpen] = useState(false)

  async function handleLogout() {
    await logoutFn()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-60
          bg-brand-surface border-r border-brand-border shadow-sidebar
          flex flex-col transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:h-screen
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="relative flex items-center justify-center border-b border-brand-border overflow-hidden">
          {/* Imagem de fundo */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
            style={{ backgroundImage: 'url(/sidebar-bg.jpg)' }}
          />
          <div className="relative z-10 flex items-center justify-center px-5 py-4 w-full">
            <img src="/logo.png" alt="Índios Churrasco Gourmet" className="h-24 w-24 object-contain [filter:drop-shadow(0_4px_16px_rgba(0,0,0,0.45))] dark:[filter:none]" />
            <span className="absolute bottom-2 left-3 text-[10px] font-medium text-black/40 dark:text-white/50 select-none">
              v1.0.0
            </span>
            {/* Botão de pagamentos */}
            <button
              onClick={() => setModalPagamentosOpen(true)}
              title="Pagamentos"
              className="absolute bottom-2 right-9 text-black/40 dark:text-white/50 hover:text-brand-orange dark:hover:text-brand-orange transition-colors p-0.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
            >
              <MdPayment size={15} />
            </button>
            {/* Engrenagem de configurações */}
            <button
              onClick={() => setModalConfigOpen(true)}
              title="Configurações"
              className="absolute bottom-2 right-3 text-black/40 dark:text-white/50 hover:text-brand-orange dark:hover:text-brand-orange transition-colors p-0.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
            >
              <MdSettings size={15} />
            </button>
            <button
              onClick={onClose}
              className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-3 hover:text-brand-text transition-colors p-1 rounded-lg hover:bg-brand-bg"
            >
              <MdClose size={18} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-bold text-brand-text-3 uppercase tracking-widest px-3 py-2">
            Navegação
          </p>
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {label === 'Pedidos' && pendentes > 0 && (
                <span className="bg-gradient-brand text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {pendentes}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé */}
        <div className="px-3 py-4 border-t border-brand-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-brand-text-3 hover:text-brand-red hover:bg-red-50 dark:hover:bg-red-950/20 transition-all text-sm font-medium"
          >
            <MdLogout size={18} className="flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <ModalConfiguracoes
        isOpen={modalConfigOpen}
        onClose={() => setModalConfigOpen(false)}
      />
      <ModalPagamentos
        isOpen={modalPagamentosOpen}
        onClose={() => setModalPagamentosOpen(false)}
      />
    </>
  )
}
