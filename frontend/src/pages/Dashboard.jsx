import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import { formatarMoeda, formatarHora } from '../utils/formatters'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import ModalPedido from '../components/pedidos/ModalPedido'
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton'
import {
  MdAdd, MdRestaurantMenu, MdAttachMoney, MdCheckCircle,
  MdHourglassBottom, MdOutlineLocalFireDepartment, MdArrowForward,
  MdInventory2, MdAccessTime, MdRefresh, MdHistory,
  MdLeaderboard, MdShowChart, MdWarning,
} from 'react-icons/md'
import PageLoader from '../components/ui/PageLoader'

export default function Dashboard() {
  const {
    totalPedidosHoje,
    faturamentoHoje,
    preparando,
    prontos,
    finalizados,
    cancelados,
    ticketMedio,
    topProdutos,
    pedidosAtivos,
    pedidosHoje,
    loading,
    error,
    refetch,
  } = useDashboard()

  const [pedidoSelecionado, setPedidoSelecionado] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await refetch()
    setTimeout(() => setRefreshing(false), 600)
  }

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <SkeletonGroup className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </SkeletonGroup>

      {/* StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonGroup key={i} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-3 w-28" />
          </SkeletonGroup>
        ))}
      </div>

      {/* Ações rápidas */}
      <SkeletonGroup className="card">
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 p-4 rounded-xl border border-brand-border bg-brand-bg">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonGroup>

      {/* Fila Ativa + Pedidos de Hoje */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <SkeletonGroup key={i} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </SkeletonGroup>
        ))}
      </div>

      {/* Mais Vendidos + Ticket Médio */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <SkeletonGroup className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="divide-y divide-brand-border">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <Skeleton className="h-3 w-4" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonGroup>

        <SkeletonGroup className="card flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
          <div className="mt-auto pt-4 border-t border-brand-border space-y-3">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </SkeletonGroup>
      </div>
    </div>
  )

  if (error) {
    return (
      <div className="-m-5 lg:-m-7 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <MdWarning className="text-brand-red" size={24} />
          </div>
          <p className="text-brand-text-2 text-sm">{error}</p>
          <button onClick={refetch} className="btn-primary px-4 py-2 text-sm gap-1.5">
            <MdRefresh size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const hora = new Date().getHours()
  const saudacao =
    hora >= 5 && hora < 12  ? 'Bom dia, time!'    :
    hora >= 12 && hora < 18 ? 'Boa tarde, time!'  :
                              'Boa noite, time!'

  const acoesRapidas = [
    {
      label: 'Novo Pedido',
      desc: 'Registrar um pedido',
      icon: MdAdd,
      color: 'bg-brand-orange/10 text-brand-orange',
      onClick: () => navigate('/pedidos/novo'),
      primary: true,
    },
    {
      label: 'Ver Cardápio',
      desc: 'Itens disponíveis',
      icon: MdInventory2,
      color: 'bg-brand-orange/10 text-brand-orange',
      onClick: () => navigate('/cardapio'),
    },
    {
      label: 'Pedidos',
      desc: 'Fila em andamento',
      icon: MdOutlineLocalFireDepartment,
      color: 'bg-brand-red/10 text-brand-red',
      onClick: () => navigate('/pedidos'),
    },
    {
      label: 'Histórico',
      desc: 'Pedidos anteriores',
      icon: MdHistory,
      color: 'bg-brand-text-3/10 text-brand-text-2',
      onClick: () => navigate('/historico'),
    },
  ]

  return (
    <>
      <div className="space-y-6 animate-fade-in">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-brand-text">{saudacao}</h1>
            <p className="text-brand-text-3 text-sm mt-0.5 capitalize">{hoje}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title="Atualizar dashboard"
              className="p-2 rounded-xl text-brand-text-3 hover:text-brand-text hover:bg-brand-surface border border-brand-border transition-all active:scale-95"
            >
              <MdRefresh size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => navigate('/pedidos/novo')} className="btn-primary px-6 py-3 text-sm shadow-brand">
              <MdAdd size={20} />
              Criar Novo Pedido
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pedidos Hoje" value={totalPedidosHoje} icon={MdRestaurantMenu} color="red" sub={`${finalizados} finalizados`} />
          <StatCard label="Faturamento Hoje" value={formatarMoeda(faturamentoHoje)} icon={MdAttachMoney} color="orange" />
          <StatCard label="Na Fila" value={preparando} icon={MdHourglassBottom} color="gold" sub="aguardando preparo" />
          <StatCard label="Prontos" value={prontos} icon={MdCheckCircle} color="green" sub={prontos > 0 ? 'Aguardando finalização' : 'Tudo em dia'} />
        </div>

        <div className="card">
          <h2 className="font-heading text-sm font-bold text-brand-text mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {acoesRapidas.map(({ label, desc, icon: Icon, color, onClick, primary }) => (
              <button
                key={label}
                onClick={onClick}
                className={`flex flex-col items-start gap-3 p-4 rounded-xl border transition-all text-left hover:border-brand-orange/40 hover:bg-brand-bg active:scale-[0.98] ${primary ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-brand-border bg-brand-bg'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={17} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-text leading-tight">{label}</p>
                  <p className="text-xs text-brand-text-3 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-red/10 flex items-center justify-center">
                  <MdOutlineLocalFireDepartment className="text-brand-red" size={16} />
                </div>
                <h2 className="font-heading text-sm font-bold text-brand-text">Fila Ativa</h2>
              </div>
              <button onClick={() => navigate('/pedidos')} className="flex items-center gap-1 text-xs text-brand-orange hover:text-brand-orange-dark transition-colors font-medium">
                Ver todos <MdArrowForward size={13} />
              </button>
            </div>

            {pedidosAtivos.length === 0 ? (
              <div className="text-center py-10">
                <MdRestaurantMenu className="text-brand-border-2 mx-auto mb-2" size={32} />
                <p className="text-brand-text-3 text-sm">Fila vazia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pedidosAtivos.slice(0, 5).map((pedido) => (
                  <button
                    key={pedido.id}
                    onClick={() => setPedidoSelecionado(pedido)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-brand-bg hover:bg-brand-border/50 border border-transparent hover:border-brand-border transition-all text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-text text-sm truncate">{pedido.nomeCliente}</p>
                      <p className="text-xs text-brand-text-3 flex items-center gap-1">
                        <MdAccessTime size={11} />
                        {pedido.itens.length} itens · {formatarHora(pedido.criadoEm)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={pedido.status} />
                      <span className="text-xs font-bold text-brand-orange">{formatarMoeda(pedido.total)}</span>
                    </div>
                  </button>
                ))}
                {pedidosAtivos.length > 5 && (
                  <p className="text-center text-xs text-brand-text-3 pt-1">+{pedidosAtivos.length - 5} pedidos na fila</p>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <MdCheckCircle className="text-emerald-500 dark:text-emerald-400" size={15} />
                </div>
                <h2 className="font-heading text-sm font-bold text-brand-text">Pedidos de Hoje</h2>
              </div>
              <button onClick={() => navigate('/historico')} className="flex items-center gap-1 text-xs text-brand-orange hover:text-brand-orange-dark transition-colors font-medium">
                Historico <MdArrowForward size={13} />
              </button>
            </div>

            {pedidosHoje.length === 0 ? (
              <div className="text-center py-10">
                <MdRestaurantMenu className="text-brand-border-2 mx-auto mb-2" size={32} />
                <p className="text-brand-text-3 text-sm">Nenhum pedido hoje ainda</p>
              </div>
            ) : (
              <div className="space-y-1">
                {pedidosHoje.slice(0, 6).map((pedido) => (
                  <button
                    key={pedido.id}
                    onClick={() => setPedidoSelecionado(pedido)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-bg transition-all text-left"
                  >
                    <span className="text-xs font-mono font-bold text-brand-text-3 w-10">#{String(pedido.numero).padStart(3, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-text text-sm truncate">{pedido.nomeCliente}</p>
                      <p className="text-xs text-brand-text-3">{formatarHora(pedido.criadoEm)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={pedido.status} />
                      <span className="text-xs font-bold text-brand-orange">{formatarMoeda(pedido.total)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ── Insights do Dia ──────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Produtos Mais Vendidos */}
          <div className="card xl:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                  <MdLeaderboard className="text-brand-gold" size={16} />
                </div>
                <h2 className="font-heading text-sm font-bold text-brand-text">Mais Vendidos Hoje</h2>
              </div>
              <span className="text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider">Top 3</span>
            </div>

            {topProdutos.length === 0 ? (
              <div className="text-center py-10">
                <MdLeaderboard className="text-brand-border-2 mx-auto mb-2" size={32} />
                <p className="text-brand-text-3 text-sm">Nenhuma venda registrada hoje</p>
              </div>
            ) : (() => {
              const rankAccents = [
                { dot: 'bg-amber-400', label: 'text-amber-500 dark:text-amber-400' },
                { dot: 'bg-zinc-400',  label: 'text-zinc-500 dark:text-zinc-400'   },
                { dot: 'bg-orange-400',label: 'text-orange-400 dark:text-orange-400'},
              ]

              return (
                <div className="divide-y divide-brand-border">
                  {topProdutos.map((produto, idx) => {
                    const acc = rankAccents[idx]

                    return (
                      <div key={produto.nome} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                        <span className={`text-xs font-bold tabular-nums w-4 text-right flex-shrink-0 ${acc.label}`}>
                          {idx + 1}
                        </span>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="font-semibold text-brand-text text-sm truncate leading-none">{produto.nome}</p>
                            <span className="text-sm font-bold text-brand-orange flex-shrink-0 tabular-nums">
                              {formatarMoeda(produto.receita)}
                            </span>
                          </div>
                          <span className="text-[11px] text-brand-text-3 tabular-nums">
                            {produto.totalVendido} un. vendidas
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Ticket Médio */}
          <div className="card flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-orange/10 flex items-center justify-center">
                <MdShowChart className="text-brand-orange" size={16} />
              </div>
              <h2 className="font-heading text-sm font-bold text-brand-text">Ticket Médio</h2>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider mb-1">Valor por pedido</p>
              <p className="text-3xl font-bold font-heading text-brand-text">
                {formatarMoeda(ticketMedio)}
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-brand-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-text-3">Pedidos faturados</span>
                <span className="text-xs font-semibold text-brand-text tabular-nums">
                  {finalizados + preparando + prontos}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-brand-text-3">Faturamento total</span>
                <span className="text-xs font-semibold text-brand-orange tabular-nums">
                  {formatarMoeda(faturamentoHoje)}
                </span>
              </div>
              {cancelados > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-brand-text-3">Cancelados</span>
                  <span className="text-xs font-semibold text-brand-red tabular-nums">{cancelados}</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      <ModalPedido isOpen={!!pedidoSelecionado} onClose={() => setPedidoSelecionado(null)} pedido={pedidoSelecionado} />
    </>
  )
}
