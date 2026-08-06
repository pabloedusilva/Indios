// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Empty State Notas
// ════════════════════════════════════════════════════════════════════════════

import { MdReceipt, MdFilterList, MdError, MdSettings, MdRefresh, MdClear } from 'react-icons/md'

const ESTADOS = {
  nenhuma: {
    icon: MdReceipt,
    titulo: 'Nenhuma nota fiscal emitida',
    descricao: 'As notas fiscais aparecerão aqui após a emissão dos pedidos finalizados',
    action: null,
  },
  filtros: {
    icon: MdFilterList,
    titulo: 'Nenhum resultado encontrado',
    descricao: 'Ajuste os filtros para ver mais resultados ou limpe-os para ver todas as notas',
    action: 'limparFiltros',
    actionLabel: 'Limpar Filtros',
    actionIcon: MdClear,
  },
  erro: {
    icon: MdError,
    titulo: 'Erro ao carregar notas',
    descricao: 'Ocorreu um erro ao buscar as notas fiscais. Tente novamente.',
    action: 'tentar',
    actionLabel: 'Tentar Novamente',
    actionIcon: MdRefresh,
  },
  'nao-configurado': {
    icon: MdSettings,
    titulo: 'Configuração necessária',
    descricao: '',
    action: null,
    actionLabel: null,
    actionIcon: null,
    badge: null,
  },
}

export default function EmptyStateNotas({
  tipo = 'nenhuma',
  mensagemErro,
  onLimparFiltros,
  onTentarNovamente,
}) {
  const estado = ESTADOS[tipo] || ESTADOS.nenhuma
  const Icon = estado.icon
  const ActionIcon = estado.actionIcon

  const handleAction = () => {
    if (estado.action === 'limparFiltros' && onLimparFiltros) {
      onLimparFiltros()
    } else if (estado.action === 'tentar' && onTentarNovamente) {
      onTentarNovamente()
    }
  }

  return (
    <div className="card flex flex-col items-center gap-3 py-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
        <Icon className="text-brand-orange" size={28} />
      </div>

      {estado.titulo && (
        <div className="max-w-md">
          <p className="font-semibold text-brand-text mb-1">
            {estado.titulo}
          </p>
          {estado.descricao && (
            <p className="text-sm text-brand-text-3 leading-relaxed">
              {tipo === 'erro' && mensagemErro ? mensagemErro : estado.descricao}
            </p>
          )}
        </div>
      )}

      {estado.action && (
        <button onClick={handleAction} className="btn-secondary gap-1.5 mt-2">
          {ActionIcon && <ActionIcon size={15} />}
          {estado.actionLabel}
        </button>
      )}
    </div>
  )
}
