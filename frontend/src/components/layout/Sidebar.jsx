import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MdDashboard, MdRestaurantMenu, MdInventory2,
  MdHistory, MdClose, MdLogout, MdBarChart, MdSettings, MdRocketLaunch,
  MdReceipt,
} from 'react-icons/md'
import { useApp } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import ModalConfiguracoes from '../ui/ModalConfiguracoes'
import ModalUpdateNotes from '../ui/ModalUpdateNotes'
import { APP_VERSION } from '../../utils/version'
import { api } from '../../services/api'

const navItems = [
  { to: '/dashboard',      label: 'Dashboard',      icon: MdDashboard,      exact: true },
  { to: '/pedidos',        label: 'Pedidos',         icon: MdRestaurantMenu },
  { to: '/produtos',       label: 'Produtos',        icon: MdInventory2 },
  { to: '/historico',      label: 'Histórico',       icon: MdHistory },
  { to: '/estatisticas',   label: 'Estatísticas',    icon: MdBarChart },
  { to: '/contabilidade',  label: 'Contabilidade',   icon: MdReceipt },
]

export default function Sidebar({ isOpen, onClose }) {
  const { pedidosAtivos } = useApp()
  const { logoutFn } = useAuth()
  const navigate = useNavigate()
  const pendentes = pedidosAtivos.filter((p) => p.status === 'preparando').length
  const [modalConfigOpen,    setModalConfigOpen]    = useState(false)
  const [modalUpdateOpen,     setModalUpdateOpen]     = useState(false)
  const [updateNote,          setUpdateNote]          = useState(null)
  const [isMajor,             setIsMajor]             = useState(false)

  // Buscar nota da versão atual ao montar
  useEffect(() => {
    async function buscarNota() {
      try {
        const data = await api.get(`/update-notes/version/${APP_VERSION}`)
        if (data) {
          setUpdateNote(data)
          setIsMajor(data.tipo === 'major')
        }
      } catch {
        // Falha silenciosa - versão pode não ter nota no banco ainda
      }
    }
    buscarNota()
  }, [])

  function abrirModalUpdate() {
    // Se nota não foi carregada, busca novamente ao clicar
    if (!updateNote) {
      api.get(`/update-notes/version/${APP_VERSION}`)
        .then(data => {
          if (data) {
            setUpdateNote(data)
            setIsMajor(data.tipo === 'major')
            setModalUpdateOpen(true)
          }
        })
        .catch(() => {
          // Falha silenciosa
        })
    } else {
      setModalUpdateOpen(true)
    }
  }

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
            <img src="/logo.png" alt="Indio's Manager" className="h-24 w-24 object-contain [filter:drop-shadow(0_4px_16px_rgba(0,0,0,0.45))] dark:[filter:none]" />
            
            {/* Badge de versão clicável — mesmo estilo do modal, menor */}
            <button
              onClick={abrirModalUpdate}
              title="Ver notas da versão"
              className="absolute bottom-2 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                background: isMajor
                  ? 'linear-gradient(135deg, #C93517, #E8650A)'
                  : 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
              }}
            >
              <MdRocketLaunch size={9} />
              v{APP_VERSION}
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
      <ModalUpdateNotes
        isOpen={modalUpdateOpen}
        onClose={() => setModalUpdateOpen(false)}
        nota={updateNote}
      />
    </>
  )
}
