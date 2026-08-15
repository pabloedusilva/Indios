// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Status Badge Nota
// ════════════════════════════════════════════════════════════════════════════
// Badge visual para exibir status da nota fiscal.
//
// PROPS:
// - status: 'emitindo' | 'autorizada' | 'cancelada' | 'erro'
// - size: 'sm' | 'md' | 'lg' (opcional, padrão 'md')
// - showIcon: boolean (opcional, padrão true)
//
// ESTILOS POR STATUS:
// 
// emitindo:
//   - Cor: Amarelo/Laranja
//   - Ícone: MdHourglassEmpty (loading animation)
//   - Label: "Emitindo..."
//   - Descrição: "Aguardando processamento SEFAZ"
//
// autorizada:
//   - Cor: Verde
//   - Ícone: MdCheckCircle
//   - Label: "Autorizada"
//   - Descrição: "NFe autorizada pela SEFAZ"
//
// cancelada:
//   - Cor: Vermelho
//   - Ícone: MdCancel
//   - Label: "Cancelada"
//   - Descrição: "NFe cancelada"
//
// erro:
//   - Cor: Vermelho escuro
//   - Ícone: MdError
//   - Label: "Erro"
//   - Descrição: "Falha na emissão"
//
// ANIMAÇÕES:
// - Status 'emitindo': Pulsação suave no ícone
// - Hover: Aumenta levemente (scale 1.02)
// ════════════════════════════════════════════════════════════════════════════

import { MdHourglassEmpty, MdCheckCircle, MdCancel, MdError } from 'react-icons/md'

const STATUS_CONFIG = {
  emitindo: {
    label: 'Emitindo...',
    icon: MdHourglassEmpty,
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800/40',
    dotClass: 'bg-amber-400',
    animate: true,
  },
  autorizada: {
    label: 'Autorizada',
    icon: MdCheckCircle,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-200 dark:border-emerald-800/40',
    dotClass: 'bg-emerald-500',
    animate: false,
  },
  cancelada: {
    label: 'Cancelada',
    icon: MdCancel,
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    textClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800/40',
    dotClass: 'bg-red-400',
    animate: false,
  },
  erro: {
    label: 'Erro',
    icon: MdError,
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-300 dark:border-red-800/40',
    dotClass: 'bg-red-600',
    animate: false,
  },
}

const SIZE_CONFIG = {
  sm: {
    container: 'px-2 py-0.5 text-[10px]',
    icon: 11,
    dot: 'w-1 h-1',
  },
  md: {
    container: 'px-2.5 py-1 text-xs',
    icon: 13,
    dot: 'w-1.5 h-1.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-sm',
    icon: 14,
    dot: 'w-2 h-2',
  },
}

export default function StatusBadgeNota({ status = 'emitindo', size = 'md', showIcon = true }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.emitindo
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md
  const Icon = config.icon

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-lg font-semibold border
        transition-transform duration-200 hover:scale-[1.02]
        ${config.bgClass} ${config.textClass} ${config.borderClass} ${sizeConfig.container}
      `}
    >
      {showIcon ? (
        <Icon
          size={sizeConfig.icon}
          className={config.animate ? 'animate-pulse' : ''}
        />
      ) : (
        <span className={`${sizeConfig.dot} rounded-full ${config.dotClass} inline-block`} />
      )}
      {config.label}
    </span>
  )
}

