import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import CardPedido from '../components/pedidos/CardPedido'
import ModalNovoPedido from '../components/pedidos/ModalNovoPedido'
import EmptyState from '../components/ui/EmptyState'
import PageLoader from '../components/ui/PageLoader'
import { MdAdd, MdRestaurantMenu, MdHourglassBottom, MdCheckCircle, MdLocalFireDepartment, MdRefresh, MdWarning } from 'react-icons/md'
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton'

const ABAS = [
  { id: 'todos',    label: 'Fila Ativa',  icon: MdLocalFireDepartment },
  { id: 'preparando', label: 'Preparando', icon: MdHourglassBottom },
  { id: 'pronto',   label: 'Prontos',     icon: MdCheckCircle },
]

export default function Pedidos() {
  const { pedidosAtivos, loading, errorPedidosAtivos, refetchPedidosAtivos } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [abaAtiva, setAbaAtiva] = useState('todos')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await refetchPedidosAtivos()
    setTimeout(() => setRefreshing(false), 600)
  }

  const modalNovoPedido = location.pathname === '/pedidos/novo'
  const abrirModal = () => navigate('/pedidos/novo')
  const fecharModal = () => navigate('/pedidos', { replace: true })

  const pedidosFiltrados = abaAtiva === 'todos'
    ? pedidosAtivos
    : pedidosAtivos.filter((p) => p.status === abaAtiva)

  const contarPorStatus = (status) =>
    pedidosAtivos.filter((p) => p.status === status).length

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <SkeletonGroup className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-52 rounded-xl" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </SkeletonGroup>

      {/* Tab bar */}
      <SkeletonGroup className="flex gap-1 p-1 bg-brand-surface border border-brand-border rounded-xl w-fit">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </SkeletonGroup>

      {/* Cards de pedido */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonGroup key={i} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-1.5 border-t border-brand-border pt-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-brand-border pt-3">
              <Skeleton className="h-9 flex-1 rounded-xl" />
              <Skeleton className="h-9 flex-1 rounded-xl" />
            </div>
          </SkeletonGroup>
        ))}
      </div>
    </div>
  )

  if (errorPedidosAtivos) {
    return (
      <div className="-m-5 lg:-m-7 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <MdWarning className="text-brand-red" size={24} />
          </div>
          <p className="text-brand-text-2 text-sm">{errorPedidosAtivos}</p>
          <button onClick={refetchPedidosAtivos} className="btn-primary px-4 py-2 text-sm gap-1.5">
            <MdRefresh size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-brand-text">Pedidos em Andamento</h1>
            <p className="text-brand-text-3 text-sm mt-0.5">
              {pedidosAtivos.length} pedido{pedidosAtivos.length !== 1 ? 's' : ''} na fila
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title="Atualizar pedidos"
              className="p-2 rounded-xl text-brand-text-3 hover:text-brand-text hover:bg-brand-surface border border-brand-border transition-all active:scale-95"
            >
              <MdRefresh size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={abrirModal}
              className="btn-primary px-6 py-3 shadow-brand"
            >
              <MdAdd size={20} />
              Criar Novo Pedido
            </button>
          </div>
        </div>

        {/* Abas de filtro */}
        <div className="flex gap-1 p-1 bg-brand-surface border border-brand-border rounded-xl w-fit">
          {ABAS.map(({ id, label, icon: Icon }) => {
            const count = id === 'todos' ? pedidosAtivos.length : contarPorStatus(id)
            return (
              <button
                key={id}
                onClick={() => setAbaAtiva(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                  ${abaAtiva === id
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'text-brand-text-2 hover:text-brand-text hover:bg-brand-bg'
                  }`}
              >
                <Icon size={15} />
                {label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center
                    ${abaAtiva === id ? 'bg-white/25 text-white' : 'bg-gradient-brand text-white'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Grade de pedidos */}
        {pedidosFiltrados.length === 0 ? (
          <EmptyState
            icon={MdRestaurantMenu}
            title="Nenhum pedido nesta categoria"
            description={
              abaAtiva === 'todos'
                ? 'A fila está vazia. Crie um novo pedido para começar!'
                : `Não há pedidos com status "${abaAtiva}" no momento.`
            }
            action={
              abaAtiva === 'todos' && (
                <button onClick={abrirModal} className="btn-primary">
                  <MdAdd size={18} />
                  Criar Primeiro Pedido
                </button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {pedidosFiltrados.map((pedido) => (
              <CardPedido key={pedido.id} pedido={pedido} />
            ))}
          </div>
        )}
      </div>

      <ModalNovoPedido
        isOpen={modalNovoPedido}
        onClose={fecharModal}
      />
    </>
  )
}
