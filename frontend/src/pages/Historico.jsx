import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../contexts/AppContext'
import PageLoader from '../components/ui/PageLoader'
import StatusBadge from '../components/ui/StatusBadge'
import ModalPedido from '../components/pedidos/ModalPedido'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { formatarMoeda, formatarHora, agruparPorData } from '../utils/formatters'
import {
  MdHistory, MdSearch, MdFilterList, MdCalendarToday,
  MdDelete, MdPrint, MdAttachMoney, MdRestaurantMenu,
  MdCheckCircle, MdCancel, MdExpandMore, MdExpandLess, MdClear,
  MdChevronLeft, MdChevronRight, MdRefresh, MdWarning,
} from 'react-icons/md'
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton'

const FILTROS_STATUS = [
  { id: 'todos',     label: 'Todos' },
  { id: 'finalizado', label: 'Finalizados' },
  { id: 'preparando', label: 'Preparando' },
  { id: 'pronto',    label: 'Prontos' },
  { id: 'cancelado', label: 'Cancelados' },
]

const PERIODOS = [
  { id: 'hoje',  label: 'Hoje' },
  { id: '7d',    label: '7 dias' },
  { id: '30d',   label: '30 dias' },
  { id: 'todos', label: 'Tudo' },
]

// FIX: comparar datas no timezone de São Paulo evita erro na virada do dia
// (ex: pedido feito à 23h SP que cai no dia seguinte em UTC).
const TZ_SP = 'America/Sao_Paulo'

function isNoPeriodo(dataISO, periodo) {
  if (periodo === 'todos') return true
  const data = new Date(dataISO)
  const agora = new Date()
  if (periodo === 'hoje') {
    // FIX: usa toLocaleDateString com timezone explícito em vez de getDate()
    const opts = { timeZone: TZ_SP, year: 'numeric', month: '2-digit', day: '2-digit' }
    return data.toLocaleDateString('pt-BR', opts) === agora.toLocaleDateString('pt-BR', opts)
  }
  const dias = periodo === '7d' ? 7 : 30
  const limite = new Date()
  limite.setDate(limite.getDate() - dias)
  return data >= limite
}

function LinhaPedido({ pedido, onVerCupom, onExcluir }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div className={`rounded-xl border bg-brand-surface overflow-hidden
      hover:border-brand-orange/30 transition-all duration-200
      ${expandido ? 'border-brand-orange/30 shadow-sm' : 'border-brand-border'}`}>
      <button
        className="w-full flex items-center gap-4 px-4 py-3.5 text-left"
        onClick={() => setExpandido(!expandido)}
      >
        <span className="flex-shrink-0 w-12 text-xs font-mono text-brand-text-3">
          #{String(pedido.numero).padStart(4, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-text text-sm truncate">{pedido.nomeCliente}</p>
          <p className="text-xs text-brand-text-3">
            {pedido.itens.length} item{pedido.itens.length !== 1 ? 'ns' : ''} · {formatarHora(pedido.criadoEm)}
          </p>
        </div>
        <div className="flex-shrink-0 hidden sm:flex sm:justify-end w-24">
          <StatusBadge status={pedido.status} />
        </div>
        <p className="flex-shrink-0 font-bold text-brand-orange text-sm w-20 text-right">
          {formatarMoeda(pedido.total)}
        </p>
        <span className="flex-shrink-0 text-brand-text-3">
          {expandido ? <MdExpandLess size={17} /> : <MdExpandMore size={17} />}
        </span>
      </button>

      {expandido && (
        <div className="border-t border-brand-border px-4 pb-4 pt-3 space-y-3 bg-brand-bg">
          <div className="sm:hidden mb-1"><StatusBadge status={pedido.status} /></div>

          {/* Itens */}
          <div className="space-y-1">
            {pedido.itens.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-brand-text-2">
                  <span className="font-semibold text-brand-text">{item.quantidade}x</span>{' '}{item.nomeProduto}
                </span>
                <span className="text-brand-text-3 font-mono tabular-nums">{formatarMoeda(item.quantidade * item.precoUnitario)}</span>
              </div>
            ))}
          </div>

          {/* Observações */}
          {pedido.observacoes && (
            <p className="text-xs text-amber-600 italic border-t border-brand-border pt-2">
              Obs: {pedido.observacoes}
            </p>
          )}

          {/* Rodapé: info + total */}
          <div className="flex items-end justify-between border-t border-brand-border pt-2.5">
            <div className="text-xs text-brand-text-3 space-y-0.5">
              <p>Criado: {formatarHora(pedido.criadoEm)}</p>
              {pedido.prontoEm    && <p>Pronto: {formatarHora(pedido.prontoEm)}</p>}
              {pedido.entregueEm  && <p>Finalizado: {formatarHora(pedido.entregueEm)}</p>}
              {pedido.formaPagamento && (
                <p className="font-medium text-brand-text-2">
                  Pago via {{
                    pix: 'PIX', credito: 'Cartão Crédito',
                    debito: 'Cartão Débito', dinheiro: 'Dinheiro',
                  }[pedido.formaPagamento] ?? pedido.formaPagamento}
                  {pedido.formaPagamento === 'dinheiro' && pedido.troco > 0 && (
                    <span className="text-brand-text-3"> · Troco: {formatarMoeda(pedido.troco)}</span>
                  )}
                </p>
              )}
            </div>
            <p className="font-bold text-brand-orange tabular-nums">{formatarMoeda(pedido.total)}</p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 pt-1 border-t border-brand-border">
            <button
              onClick={() => onVerCupom(pedido)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                         text-xs font-semibold text-brand-text-2 bg-brand-surface border border-brand-border
                         hover:border-brand-orange/40 hover:text-brand-text
                         transition-all duration-200 active:scale-[0.98]"
            >
              <MdPrint size={13} />
              Ver Pedido
            </button>
            <button
              onClick={() => onExcluir(pedido)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                         text-xs font-semibold text-red-500/80 bg-brand-surface border border-brand-border
                         hover:border-red-500/40 hover:text-red-500 hover:bg-red-500/5
                         transition-all duration-200 active:scale-[0.98]"
            >
              <MdDelete size={13} />
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GrupoData({ data, pedidos, onVerCupom, onExcluir }) {
  const totalGrupo = pedidos
    .filter((p) => p.status !== 'cancelado')
    .reduce((acc, p) => acc + p.total, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MdCalendarToday className="text-brand-text-3" size={13} />
          <h3 className="text-xs font-bold text-brand-text-2 uppercase tracking-wider">{data}</h3>
          <span className="text-xs text-brand-text-3">({pedidos.length})</span>
        </div>
        <span className="text-xs font-bold text-brand-orange">{formatarMoeda(totalGrupo)}</span>
      </div>
      <div className="space-y-2">
        {pedidos.map((pedido) => (
          <LinhaPedido key={pedido.id} pedido={pedido} onVerCupom={onVerCupom} onExcluir={onExcluir} />
        ))}
      </div>
    </div>
  )
}

const POR_PAGINA = 50

export default function Historico() {
  const { pedidos, excluirPedido, loading, errorPedidos, refetchPedidos } = useApp()

  const [busca, setBusca]                 = useState('')
  const [filtroStatus, setFiltroStatus]   = useState('todos')
  const [periodo, setPeriodo]             = useState('todos')
  const [pagina, setPagina]               = useState(1)
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null)
  const [pedidoExcluir, setPedidoExcluir] = useState(null)
  const [refreshing, setRefreshing]       = useState(false)

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await refetchPedidos()
    setTimeout(() => setRefreshing(false), 600)
  }

  const pedidosFiltrados = useMemo(() => {
    return pedidos
      .filter((p) => {
        const matchBusca = p.nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
                           String(p.numero).includes(busca)
        const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus
        const matchPeriodo = isNoPeriodo(p.criadoEm, periodo)
        return matchBusca && matchStatus && matchPeriodo
      })
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
  }, [pedidos, busca, filtroStatus, periodo])

  const pedidosPagina = useMemo(() =>
    pedidosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
  [pedidosFiltrados, pagina])

  const pedidosAgrupados = useMemo(() => agruparPorData(pedidosPagina), [pedidosPagina])

  // Reseta para página 1 quando filtros mudam
  useEffect(() => { setPagina(1) }, [busca, filtroStatus, periodo])

  const totalPaginas = Math.max(1, Math.ceil(pedidosFiltrados.length / POR_PAGINA))

  const stats = useMemo(() => {
    const validos = pedidosFiltrados.filter((p) => p.status !== 'cancelado')
    return {
      total:       pedidosFiltrados.length,
      faturamento: validos.reduce((acc, p) => acc + p.total, 0),
      entregues:   pedidosFiltrados.filter((p) => p.status === 'finalizado').length,
      cancelados:  pedidosFiltrados.filter((p) => p.status === 'cancelado').length,
    }
  }, [pedidosFiltrados])

  const filtrosAtivos = busca !== '' || filtroStatus !== 'todos' || periodo !== 'todos'
  const limparFiltros = () => { setBusca(''); setFiltroStatus('todos'); setPeriodo('todos') }

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <SkeletonGroup className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 rounded-xl" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl self-start sm:self-auto" />
      </SkeletonGroup>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonGroup key={i} className="card flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-3 w-16" />
          </SkeletonGroup>
        ))}
      </div>

      {/* Filtros */}
      <SkeletonGroup className="card space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-12" />
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </SkeletonGroup>

      {/* Linhas de pedidos */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonGroup key={i} className="rounded-xl border border-brand-border bg-brand-surface px-4 py-3.5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-12" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full hidden sm:block" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </SkeletonGroup>
        ))}
      </div>
    </div>
  )

  if (errorPedidos) {
    return (
      <div className="-m-5 lg:-m-7 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <MdWarning className="text-brand-red" size={24} />
          </div>
          <p className="text-brand-text-2 text-sm">{errorPedidos}</p>
          <button onClick={refetchPedidos} className="btn-primary px-4 py-2 text-sm gap-1.5">
            <MdRefresh size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-brand-text flex items-center gap-2">
              <MdHistory className="text-brand-orange" size={26} />
              Historico de Pedidos
            </h1>
            <p className="text-brand-text-3 text-sm mt-0.5">Consulte e gerencie todos os pedidos</p>
          </div>
          <button
            onClick={handleRefresh}
            title="Atualizar histórico"
            className="p-2 rounded-xl text-brand-text-3 hover:text-brand-text hover:bg-brand-surface border border-brand-border transition-all active:scale-95 self-start sm:self-auto"
          >
            <MdRefresh size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3 flex items-center gap-1.5">
              <MdRestaurantMenu size={13}/> Pedidos
            </span>
            <p className="text-2xl font-bold text-brand-text font-heading">{stats.total}</p>
            <p className="text-xs text-brand-text-3">no periodo</p>
          </div>
          <div className="card flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3 flex items-center gap-1.5">
              <MdAttachMoney size={13}/> Faturamento
            </span>
            <p className="text-2xl font-bold text-brand-text font-heading">{formatarMoeda(stats.faturamento)}</p>
            <p className="text-xs text-brand-text-3">excl. cancelados</p>
          </div>
          <div className="card flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3 flex items-center gap-1.5">
              <MdCheckCircle size={13}/> Finalizados
            </span>
            <p className="text-2xl font-bold text-brand-text font-heading">{stats.entregues}</p>
            <p className="text-xs text-brand-text-3">finalizados</p>
          </div>
          <div className="card flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3 flex items-center gap-1.5">
              <MdCancel size={13}/> Cancelados
            </span>
            <p className="text-2xl font-bold text-brand-text font-heading">{stats.cancelados}</p>
            <p className="text-xs text-brand-text-3">pedidos cancelados</p>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <MdFilterList className="text-brand-orange" size={17} />
            <h2 className="font-semibold text-brand-text text-sm">Filtros</h2>
            {filtrosAtivos && (
              <button onClick={limparFiltros}
                className="ml-auto flex items-center gap-1 text-xs text-brand-text-3 hover:text-brand-orange transition-colors">
                <MdClear size={13} /> Limpar
              </button>
            )}
          </div>

          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-3" size={16} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por cliente ou numero do pedido..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <p className="text-[10px] text-brand-text-3 uppercase tracking-wider font-bold">Periodo</p>
              <div className="flex gap-2 flex-wrap">
                {PERIODOS.map(({ id, label }) => (
                  <button key={id} onClick={() => setPeriodo(id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                      ${periodo === id
                        ? 'bg-gradient-brand text-white shadow-brand'
                        : 'bg-brand-bg text-brand-text-2 border border-brand-border hover:border-brand-orange/40'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <p className="text-[10px] text-brand-text-3 uppercase tracking-wider font-bold">Status</p>
              <div className="flex gap-2 flex-wrap">
                {FILTROS_STATUS.map(({ id, label }) => (
                  <button key={id} onClick={() => setFiltroStatus(id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                      ${filtroStatus === id
                        ? 'bg-gradient-brand text-white shadow-brand'
                        : 'bg-brand-bg text-brand-text-2 border border-brand-border hover:border-brand-orange/40'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {pedidosFiltrados.length === 0 ? (
          <EmptyState
            icon={MdHistory}
            title="Nenhum pedido encontrado"
            description={filtrosAtivos ? 'Ajuste os filtros para ver mais resultados.' : 'Nenhum pedido registrado ainda.'}
            action={filtrosAtivos && (
              <button onClick={limparFiltros} className="btn-secondary">
                <MdClear size={15} /> Limpar Filtros
              </button>
            )}
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(pedidosAgrupados).map(([data, pedidosDoDia]) => (
              <GrupoData key={data} data={data} pedidos={pedidosDoDia}
                onVerCupom={setPedidoSelecionado} onExcluir={setPedidoExcluir} />
            ))}

            {/* ─── Paginação ─── */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-brand-border
                             text-brand-text-3 hover:text-brand-text hover:border-brand-orange/40
                             disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <MdChevronLeft size={18} />
                </button>

                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 2)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...')
                    acc.push(n)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    item === '...' ? (
                      <span key={`ellipsis-${idx}`} className="w-8 text-center text-xs text-brand-text-3">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setPagina(item)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all
                          ${ pagina === item
                            ? 'bg-gradient-brand text-white shadow-brand'
                            : 'border border-brand-border text-brand-text-2 hover:border-brand-orange/40 hover:text-brand-text'
                          }`}
                      >
                        {item}
                      </button>
                    )
                  )
                }

                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="w-8 h-8 rounded-xl flex items-center justify-center border border-brand-border
                             text-brand-text-3 hover:text-brand-text hover:border-brand-orange/40
                             disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <MdChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ModalPedido isOpen={!!pedidoSelecionado} onClose={() => setPedidoSelecionado(null)} pedido={pedidoSelecionado} />
      <ConfirmDialog
        isOpen={!!pedidoExcluir}
        title="Excluir do Historico"
        message={pedidoExcluir
          ? `Excluir pedido #${String(pedidoExcluir.numero).padStart(4,'0')} de "${pedidoExcluir.nomeCliente}"?`
          : ''}
        confirmLabel="Excluir"
        danger
        onConfirm={() => { excluirPedido(pedidoExcluir.id); setPedidoExcluir(null) }}
        onCancel={() => setPedidoExcluir(null)}
      />
    </>
  )
}
