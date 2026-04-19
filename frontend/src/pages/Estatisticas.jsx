import { useMemo } from 'react'
import { useEstatisticas } from '../hooks/useEstatisticas'
import { formatarMoeda } from '../utils/formatters'
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton'
import {
  MdAttachMoney, MdRestaurantMenu, MdCheckCircle, MdCancel,
  MdTrendingUp, MdWarning, MdFileDownload, MdPictureAsPdf,
  MdCalendarMonth, MdAutoGraph, MdStar, MdPayment, MdLeaderboard,
  MdRefresh, MdSync,
} from 'react-icons/md'

// ── Helpers ───────────────────────────────────────────────────

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function nomeMes(mesStr) {
  if (!mesStr) return ''
  const [, m] = mesStr.split('-')
  return MESES_PT[parseInt(m, 10) - 1] || mesStr
}

function nomeMesAbrev(mesStr) {
  if (!mesStr) return ''
  const [ano, m] = mesStr.split('-')
  const nome = MESES_PT[parseInt(m, 10) - 1] || m
  return `${nome.slice(0, 3)} ${ano}`
}

const PAGAMENTO_LABEL = {
  pix:      'PIX',
  credito:  'Cartão Crédito',
  debito:   'Cartão Débito',
  dinheiro: 'Dinheiro',
}

const PAGAMENTO_COLOR = {
  pix:      'bg-emerald-500',
  credito:  'bg-blue-500',
  debito:   'bg-violet-500',
  dinheiro: 'bg-amber-500',
}

const PAGAMENTO_BG = {
  pix:      'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
  credito:  'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
  debito:   'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400',
  dinheiro: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
}

// ── Gráfico de barras CSS ─────────────────────────────────────
function BarChart({ data }) {
  const max = useMemo(() => Math.max(...data.map((d) => d.faturamento), 0.01), [data])
  if (data.length === 0) return null

  // Linhas de referência horizontais
  const gridLines = [0, 25, 50, 75, 100]

  return (
    <div className="relative mt-4 select-none">
      {/* Grid lines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
        {gridLines.map((g) => (
          <div key={g} className="w-full h-px bg-brand-border/60" />
        ))}
      </div>

      {/* Barras */}
      <div className="flex items-end gap-1.5 h-36 w-full relative z-10 pb-5">
        {data.map((d, i) => {
          const pct    = Math.max((d.faturamento / max) * 100, d.faturamento === 0 ? 1.5 : 2.5)
          const isEmpty = d.faturamento === 0
          const dataFmt = d.dia
            ? new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
              })
            : ''

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0 group/bar min-w-0">
              {/* Área da barra */}
              <div className="relative w-full flex items-end justify-center" style={{ height: '108px' }}>

                {/* Tooltip */}
                <div className="
                  absolute -top-10 left-1/2 -translate-x-1/2
                  hidden group-hover/bar:flex flex-col items-center
                  pointer-events-none z-20
                ">
                  <div className="
                    bg-brand-text text-brand-surface text-[10px] font-semibold
                    px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-card-hover
                    flex flex-col items-center gap-0.5
                  ">
                    <span className="text-brand-orange font-bold text-[11px]">
                      {formatarMoeda(d.faturamento)}
                    </span>
                    <span className="text-brand-surface/60 text-[9px] font-normal">
                      {d.pedidos} {d.pedidos === 1 ? 'pedido' : 'pedidos'}
                      {d.cancelados > 0 && ` · ${d.cancelados} cancel.`}
                    </span>
                  </div>
                  <div className="w-2 h-2 bg-brand-text rotate-45 -mt-1" />
                </div>

                {/* Barra propriamente dita */}
                <div
                  className={`
                    relative w-full rounded-t-lg overflow-hidden
                    transition-all duration-200 ease-out
                    ${isEmpty
                      ? 'bg-brand-border/50'
                      : 'group-hover/bar:brightness-110 cursor-pointer'
                    }
                  `}
                  style={{ height: `${pct}%` }}
                >
                  {!isEmpty && (
                    <>
                      {/* Gradiente principal */}
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-red via-brand-orange to-brand-orange-light" />
                      {/* Brilho no topo */}
                      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent" />
                      {/* Brilho lateral */}
                      <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent" />
                    </>
                  )}
                </div>
              </div>

              {/* Label do dia */}
              <span className="text-[9px] text-brand-text-3 leading-none mt-1 font-medium tabular-nums">
                {dataFmt}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Card de resumo ────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }) {
  const map = {
    orange: {
      icon: 'text-brand-orange',
      bg:   'bg-orange-50 dark:bg-orange-950/30',
      bd:   'border-orange-100 dark:border-orange-900/40',
    },
    red: {
      icon: 'text-brand-red',
      bg:   'bg-red-50 dark:bg-red-950/30',
      bd:   'border-red-100 dark:border-red-900/40',
    },
    green: {
      icon: 'text-emerald-600 dark:text-emerald-400',
      bg:   'bg-emerald-50 dark:bg-emerald-950/30',
      bd:   'border-emerald-100 dark:border-emerald-900/40',
    },
    gold: {
      icon: 'text-brand-gold',
      bg:   'bg-amber-50 dark:bg-amber-950/30',
      bd:   'border-amber-100 dark:border-amber-900/40',
    },
    blue: {
      icon: 'text-blue-600 dark:text-blue-400',
      bg:   'bg-blue-50 dark:bg-blue-950/30',
      bd:   'border-blue-100 dark:border-blue-900/40',
    },
    violet: {
      icon: 'text-violet-600 dark:text-violet-400',
      bg:   'bg-violet-50 dark:bg-violet-950/30',
      bd:   'border-violet-100 dark:border-violet-900/40',
    },
  }
  const c = map[color] || map.orange

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider leading-tight">
          {label}
        </p>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl ${c.bg} border ${c.bd} flex items-center justify-center shrink-0`}>
            <Icon className={c.icon} size={17} />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-brand-text font-heading leading-none">{value}</p>
        {sub && <p className="text-xs text-brand-text-3 mt-1.5 leading-tight">{sub}</p>}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function Estatisticas() {
  const {
    meses,
    mesAtivo,
    setMesAtivo,
    stats,
    relatorioDoMesAtivo,
    loading,
    sincronizando,
    error,
    sincronizar,
    baixarRelatorio,
    refetch,
  } = useEstatisticas()

  if (loading) return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <SkeletonGroup className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44 rounded-xl" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex gap-1.5 p-1 bg-brand-surface rounded-xl border border-brand-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-lg" />
            ))}
          </div>
        </div>
      </SkeletonGroup>

      {/* 6 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonGroup key={i} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-3 w-32" />
          </SkeletonGroup>
        ))}
      </div>

      {/* Melhor dia + Pagamentos */}
      <div className="grid lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <SkeletonGroup key={i} className="card flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>
          </SkeletonGroup>
        ))}
      </div>

      {/* Top Produtos */}
      <SkeletonGroup className="card">
        <div className="flex items-center gap-2.5 mb-4">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className={`h-3.5 ${i === 0 ? 'w-40' : 'w-32'}`} />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonGroup>

      {/* Gráfico faturamento por dia */}
      <SkeletonGroup className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
        {/* Barras do gráfico */}
        <div className="flex items-end gap-1.5 h-36 pb-5">
          {Array.from({ length: 20 }).map((_, i) => {
            const heights = [40,70,55,90,30,75,60,85,45,95,50,65,80,35,70,55,88,42,68,78]
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end" style={{ height: '108px' }}>
                <Skeleton className="w-full rounded-t-lg" style={{ height: `${heights[i]}%` }} />
              </div>
            )
          })}
        </div>
        {/* Tabela resumida */}
        <div className="border-t border-brand-border pt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 px-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-8 mx-auto" />
              <Skeleton className="h-3 w-6 mx-auto" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </SkeletonGroup>
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

  if (meses.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader meses={[]} mesAtivo={null} setMesAtivo={() => {}} />
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
            <MdAutoGraph className="text-brand-orange" size={28} />
          </div>
          <p className="font-semibold text-brand-text">Nenhum dado disponível</p>
          <p className="text-sm text-brand-text-3 max-w-xs">
            As estatísticas aparecerão aqui após os primeiros pedidos serem registrados.
          </p>
        </div>
      </div>
    )
  }

  const { resumo, topProdutos, pagamentos, porDia, melhorDia } = stats
  const totalPag = pagamentos.reduce((s, p) => s + p.qtd, 0)

  // Data formatada do melhor dia
  const melhorDiaFmt = melhorDia
    ? new Date(melhorDia.dia + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      })
    : null

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Cabeçalho + seletor de mês ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text font-heading">Estatísticas</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-brand-text-3">
              Análise detalhada dos últimos {meses.length} {meses.length === 1 ? 'mês' : 'meses'}
            </p>
            {stats.atualizadoEm && (
              <>
                <span className="text-brand-border-2">·</span>
                <p className="text-xs text-brand-text-3">
                  Atualizado às{' '}
                  {new Date(stats.atualizadoEm).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
                  })}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão sincronizar */}
          <button
            onClick={sincronizar}
            disabled={sincronizando}
            title="Sincronizar dados"
            className="p-2 rounded-xl text-brand-text-3 hover:text-brand-text hover:bg-brand-surface border border-brand-border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdSync size={16} className={sincronizando ? 'animate-spin' : ''} />
          </button>

          {/* Tabs de mês */}
          <div className="flex gap-1.5 p-1 bg-brand-surface rounded-xl border border-brand-border shadow-sm">
            {meses.map((m) => (
              <button
                key={m.mes}
                onClick={() => setMesAtivo(m.mes)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                  mesAtivo === m.mes
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'text-brand-text-2 hover:text-brand-text hover:bg-brand-bg'
                }`}
              >
                {nomeMesAbrev(m.mes)}
              </button>
            ))}
          </div>
        </div>
      </div>

        {/* ── KPIs principais ──────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <KpiCard
            label="Faturamento Total"
            value={formatarMoeda(resumo.faturamento)}
            sub={`${resumo.finalizados} pedidos finalizados`}
            icon={MdAttachMoney}
            color="orange"
          />
          <KpiCard
            label="Total de Pedidos"
            value={resumo.totalPedidos}
            sub={`Período: ${nomeMes(mesAtivo)}`}
            icon={MdRestaurantMenu}
            color="blue"
          />
          <KpiCard
            label="Ticket Médio"
            value={formatarMoeda(resumo.ticketMedio)}
            sub="por pedido finalizado"
            icon={MdTrendingUp}
            color="gold"
          />
          <KpiCard
            label="Finalizados"
            value={resumo.finalizados}
            sub={`${resumo.totalPedidos > 0 ? (100 - resumo.taxaCancelamento).toFixed(1) : 0}% do total`}
            icon={MdCheckCircle}
            color="green"
          />
          <KpiCard
            label="Cancelados"
            value={resumo.cancelados}
            sub={`${resumo.taxaCancelamento}% do total`}
            icon={MdCancel}
            color="red"
          />
          <KpiCard
            label="Taxa de Conclusão"
            value={`${resumo.totalPedidos > 0 ? (100 - resumo.taxaCancelamento).toFixed(1) : 0}%`}
            sub="pedidos finalizados com sucesso"
            icon={MdAutoGraph}
            color="violet"
          />
        </div>

        {/* ── Melhor dia + Formas de pagamento ─────────────── */}
        <div className="grid lg:grid-cols-2 gap-4 mb-5">

          {/* Melhor dia */}
          <div className="card flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center">
                <MdStar className="text-brand-gold" size={17} />
              </div>
              <p className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider">
                Dia de Maior Movimento
              </p>
            </div>

            {melhorDia ? (
              <div>
                <p className="text-lg font-bold text-brand-text font-heading leading-snug">
                  {melhorDiaFmt}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="bg-brand-surface-2 rounded-xl p-3 border border-brand-border">
                    <p className="text-[10px] text-brand-text-3 font-semibold uppercase tracking-wider mb-1">
                      Faturamento
                    </p>
                    <p className="text-lg font-bold text-brand-orange font-heading">
                      {formatarMoeda(melhorDia.faturamento)}
                    </p>
                  </div>
                  <div className="bg-brand-surface-2 rounded-xl p-3 border border-brand-border">
                    <p className="text-[10px] text-brand-text-3 font-semibold uppercase tracking-wider mb-1">
                      Pedidos
                    </p>
                    <p className="text-lg font-bold text-brand-text font-heading">
                      {melhorDia.pedidos}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-brand-text-3 py-4 text-center">Nenhum dado disponível</p>
            )}
          </div>

          {/* Formas de pagamento */}
          <div className="card flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center">
                <MdPayment className="text-blue-600 dark:text-blue-400" size={17} />
              </div>
              <p className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider">
                Formas de Pagamento
              </p>
            </div>

            {pagamentos.length > 0 ? (
              <div className="space-y-3">
                {pagamentos.map((p) => {
                  const pct = totalPag > 0 ? (p.qtd / totalPag) * 100 : 0
                  const barColor = PAGAMENTO_COLOR[p.forma] || 'bg-brand-text-3'
                  const badgeCls = PAGAMENTO_BG[p.forma] || 'bg-brand-surface-2 text-brand-text-2'
                  return (
                    <div key={p.forma}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
                            {PAGAMENTO_LABEL[p.forma] || p.forma}
                          </span>
                          <span className="text-xs text-brand-text-3">{p.qtd} pedidos</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-brand-text">
                            {pct.toFixed(1)}%
                          </span>
                          <span className="text-[11px] text-brand-text-3 ml-1.5">
                            {formatarMoeda(p.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-brand-text-3 py-4 text-center">Nenhum pagamento registrado</p>
            )}
          </div>
        </div>

        {/* ── Top Produtos ──────────────────────────────────── */}
        <div className="card mb-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center">
              <MdLeaderboard className="text-brand-orange" size={17} />
            </div>
            <p className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider">
              Top Produtos do Mês
            </p>
          </div>

          {topProdutos.length > 0 ? (
            <div className="space-y-2">
              {topProdutos.map((p, i) => {
                const maxQtd = topProdutos[0]?.quantidade || 1
                const pct    = (p.quantidade / maxQtd) * 100
                return (
                  <div key={p.nome} className="flex items-center gap-3 group">
                    {/* Posição */}
                    <div className={`
                      w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0
                      ${i === 0 ? 'bg-gradient-brand text-white' : 'bg-brand-surface-2 text-brand-text-3'}
                    `}>
                      {i + 1}
                    </div>

                    {/* Nome + barra */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm truncate ${i === 0 ? 'font-semibold text-brand-text' : 'text-brand-text-2'}`}>
                          {p.nome}
                        </span>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs text-brand-text-3 tabular-nums">
                            {p.quantidade} {p.quantidade === 1 ? 'venda' : 'vendas'}
                          </span>
                          <span className="text-xs font-semibold text-brand-text tabular-nums w-24 text-right">
                            {formatarMoeda(p.receita)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            i === 0 ? 'bg-gradient-brand' : 'bg-brand-orange/50'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-brand-text-3 py-6 text-center">Nenhum produto vendido neste período</p>
          )}
        </div>

        {/* ── Gráfico de faturamento por dia ────────────────── */}
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center">
                <MdAutoGraph className="text-brand-orange" size={17} />
              </div>
              <p className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider">
                Faturamento por Dia
              </p>
            </div>
            {porDia.length > 0 && (
              <p className="text-xs text-brand-text-3">
                {porDia.length} {porDia.length === 1 ? 'dia' : 'dias'} com registros
              </p>
            )}
          </div>

          {porDia.length > 0 ? (
            <>
              <BarChart data={porDia} />
              {/* Tabela resumida */}
              <div className="mt-4 border-t border-brand-border pt-4">
                <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider mb-2 px-1">
                  <span>Data</span>
                  <span className="text-center">Pedidos</span>
                  <span className="text-center">Cancelados</span>
                  <span className="text-right">Faturamento</span>
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {porDia.map((d) => {
                    const dataFmt = new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo',
                    })
                    const temFat = d.faturamento > 0
                    return (
                      <div
                        key={d.dia}
                        className={`grid grid-cols-4 gap-2 px-1 py-1.5 rounded-lg text-xs transition-colors ${
                          temFat ? 'hover:bg-brand-surface-2' : 'opacity-50'
                        }`}
                      >
                        <span className="font-medium text-brand-text-2">{dataFmt}</span>
                        <span className="text-center text-brand-text">{d.pedidos}</span>
                        <span className={`text-center ${d.cancelados > 0 ? 'text-brand-red font-semibold' : 'text-brand-text-3'}`}>
                          {d.cancelados}
                        </span>
                        <span className={`text-right font-semibold tabular-nums ${temFat ? 'text-brand-text' : 'text-brand-text-3'}`}>
                          {formatarMoeda(d.faturamento)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-brand-text-3 py-6 text-center">Nenhum dado para este período</p>
          )}
        </div>

        {/* ── Relatório PDF ─────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 flex items-center justify-center">
              <MdPictureAsPdf className="text-brand-red" size={17} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider">
                Relatório PDF
              </p>
              <p className="text-xs text-brand-text-3 mt-0.5">
                {nomeMes(mesAtivo)}
              </p>
            </div>
          </div>

          {relatorioDoMesAtivo ? (
            /* Relatório disponível para download */
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                            bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40
                            rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <MdPictureAsPdf className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Relatório disponível
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                    Gerado em{' '}
                    {new Date(relatorioDoMesAtivo.geradoEm).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => baixarRelatorio(relatorioDoMesAtivo.arquivo)}
                className="btn-success px-4 py-2 text-sm gap-1.5 shrink-0"
              >
                <MdFileDownload size={16} />
                Baixar PDF
              </button>
            </div>
          ) : (() => {
            /* Calcula a data em que o relatório do mesAtivo estará disponível */
            const [ano, mes] = (mesAtivo || '2000-01').split('-').map(Number)
            const dataDisp = new Date(ano, mes, 1) // dia 1 do mês seguinte
            const hoje = new Date()
            hoje.setHours(0, 0, 0, 0)
            const jaDeveriaTerSido = hoje >= dataDisp

            return (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
                              bg-brand-surface-2 border border-brand-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-surface-3 flex items-center justify-center">
                    <MdCalendarMonth className="text-brand-text-3" size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-text">
                      {jaDeveriaTerSido
                        ? 'Relatório sendo processado...'
                        : `Disponível em ${dataDisp.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                    </p>
                    <p className="text-xs text-brand-text-3 mt-0.5">
                      {jaDeveriaTerSido
                        ? 'O relatório é gerado automaticamente no dia 1 de cada mês.'
                        : `O relatório de ${nomeMes(mesAtivo)} será gerado automaticamente no dia 1 do mês seguinte.`}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Dica sobre limite de 3 arquivos */}
          <p className="text-[11px] text-brand-text-3 mt-3 flex items-center gap-1.5">
            <MdCalendarMonth size={13} className="text-brand-text-3" />
            Apenas os relatórios dos últimos 3 meses são mantidos no servidor.
          </p>
        </div>
    </div>
  )
}
