// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Estatísticas de Notas Fiscais
// ════════════════════════════════════════════════════════════════════════════
// Exibe estatísticas detalhadas do status das notas fiscais de um período
// ════════════════════════════════════════════════════════════════════════════

import { useMemo } from 'react'
import {
  MdCheckCircle,
  MdHourglassEmpty,
  MdCancel,
  MdError,
  MdReceipt,
} from 'react-icons/md'

export default function EstatisticasNotas({ stats, loading = false }) {
  // Calcular percentuais
  const percentuais = useMemo(() => {
    if (!stats || stats.totalNotas === 0) {
      return {
        autorizadas: 0,
        emitindo: 0,
        canceladas: 0,
        erro: 0,
      }
    }

    const total = stats.totalNotas

    return {
      autorizadas: ((stats.autorizadas / total) * 100).toFixed(1),
      emitindo: ((stats.emitindo / total) * 100).toFixed(1),
      canceladas: ((stats.canceladas / total) * 100).toFixed(1),
      erro: ((stats.erro / total) * 100).toFixed(1),
    }
  }, [stats])

  // Skeleton durante loading
  if (loading) {
    return (
      <div className="card space-y-4 h-full flex flex-col">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-4 h-4 rounded bg-brand-border animate-pulse" />
          <div className="h-4 w-48 bg-brand-border animate-pulse rounded" />
        </div>
        <div className="space-y-2.5 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-border animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-brand-border animate-pulse rounded" />
                <div className="h-1.5 w-full bg-brand-border animate-pulse rounded-full" />
              </div>
              <div className="h-6 w-14 bg-brand-border animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-brand-border flex-shrink-0">
          <div className="h-3 w-full bg-brand-border animate-pulse rounded" />
        </div>
      </div>
    )
  }

  // Sem dados
  if (!stats || stats.totalNotas === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900/30 flex items-center justify-center">
          <MdReceipt className="text-brand-text-3" size={24} />
        </div>
        <div className="max-w-md">
          <p className="font-semibold text-brand-text mb-1 text-sm">
            Sem dados de notas fiscais
          </p>
          <p className="text-xs text-brand-text-3 leading-relaxed">
            Nenhuma nota fiscal foi emitida neste período
          </p>
        </div>
      </div>
    )
  }

  const statusData = [
    {
      id: 'autorizadas',
      label: 'Autorizadas',
      value: stats.autorizadas,
      percent: percentuais.autorizadas,
      icon: MdCheckCircle,
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      iconColor: 'text-green-600 dark:text-green-400',
      barColor: 'bg-green-500',
      description: 'Processadas pela SEFAZ',
    },
    {
      id: 'emitindo',
      label: 'Processando',
      value: stats.emitindo,
      percent: percentuais.emitindo,
      icon: MdHourglassEmpty,
      color: 'orange',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      iconColor: 'text-brand-orange',
      barColor: 'bg-brand-orange',
      description: 'Aguardando SEFAZ',
    },
    {
      id: 'canceladas',
      label: 'Canceladas',
      value: stats.canceladas,
      percent: percentuais.canceladas,
      icon: MdCancel,
      color: 'gray',
      bgColor: 'bg-gray-50 dark:bg-gray-900/30',
      iconColor: 'text-brand-text-3',
      barColor: 'bg-brand-text-3',
      description: 'Canceladas pelo emissor',
    },
    {
      id: 'erro',
      label: 'Com Erro',
      value: stats.erro,
      percent: percentuais.erro,
      icon: MdError,
      color: 'red',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      iconColor: 'text-brand-red',
      barColor: 'bg-brand-red',
      description: 'Rejeitadas pela SEFAZ',
    },
  ]

  return (
    <div className="card space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MdReceipt className="text-brand-orange" size={18} />
          <h3 className="font-semibold text-brand-text text-sm">
            Status das Notas Fiscais
          </h3>
        </div>
        <div className="text-xs text-brand-text-3">
          <span className="font-bold text-brand-text">{stats.totalNotas}</span> {stats.totalNotas === 1 ? 'nota' : 'notas'}
        </div>
      </div>

      {/* Lista de Status */}
      <div className="space-y-2.5 flex-1">
        {statusData.map((status) => (
          <div
            key={status.id}
            className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-surface transition-colors"
          >
            {/* Ícone */}
            <div
              className={`w-9 h-9 rounded-xl ${status.bgColor} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}
            >
              <status.icon className={status.iconColor} size={18} />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-brand-text">
                  {status.label}
                </span>
                <span className="text-[10px] text-brand-text-3 font-medium">
                  {status.percent}%
                </span>
              </div>

              {/* Barra de progresso */}
              <div className="relative w-full h-1.5 bg-brand-bg rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${status.barColor} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${status.percent}%` }}
                />
              </div>

              <p className="text-[10px] text-brand-text-3 mt-1">
                {status.description}
              </p>
            </div>

            {/* Valor */}
            <div
              className={`px-2.5 py-1 rounded-lg ${status.bgColor} flex-shrink-0`}
            >
              <span className={`text-sm font-bold ${status.iconColor}`}>
                {status.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo */}
      <div className="pt-3 border-t border-brand-border flex-shrink-0">
        <div className="flex items-center justify-between text-xs">
          <span className="text-brand-text-3">Taxa de Sucesso</span>
          <span className="font-bold text-green-600 dark:text-green-400">
            {percentuais.autorizadas}%
          </span>
        </div>
      </div>
    </div>
  )
}
