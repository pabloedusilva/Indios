// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: KpiCard
// ════════════════════════════════════════════════════════════════════════════
// Card para exibição de KPIs com contagem animada e ícones estilizados
// ════════════════════════════════════════════════════════════════════════════

import AnimatedValue from './AnimatedValue'

const READ_ONLY_CARD = 'bg-yellow-50/60 dark:bg-yellow-950/10 border-yellow-200/70 dark:border-yellow-800/30'

// Mapeamento de cores para os ícones
const ICON_STYLES = {
  orange: {
    container: 'bg-brand-orange/10',
    icon: 'text-brand-orange',
  },
  red: {
    container: 'bg-brand-red/10',
    icon: 'text-brand-red',
  },
  green: {
    container: 'bg-emerald-500/10',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
  blue: {
    container: 'bg-blue-500/10',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  gold: {
    container: 'bg-brand-gold/10',
    icon: 'text-brand-gold',
  },
  violet: {
    container: 'bg-violet-500/10',
    icon: 'text-violet-600 dark:text-violet-400',
  },
  gray: {
    container: 'bg-brand-text-3/10',
    icon: 'text-brand-text-2',
  },
}

export function KpiCard({ icon: Icon, label, value, type = 'number', subtitle, sub, readOnly = false, color = 'gray' }) {
  // Detectar tipo automaticamente se não especificado
  const isMonetary = typeof value === 'string' && value.includes('R$')
  const isPercentage = typeof value === 'string' && value.includes('%')
  const isNumeric = !isNaN(parseFloat(value)) && isFinite(value)
  
  const detectedType = type || (isMonetary ? 'money' : (isNumeric && !isPercentage ? 'number' : 'text'))
  
  // Extrair valor numérico
  let numericValue = value
  if (isMonetary && detectedType === 'money') {
    numericValue = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0
  } else if (isPercentage) {
    numericValue = value // Manter string para percentagens
  }

  const shouldAnimate = detectedType !== 'text'
  const subtitleText = subtitle || sub
  const iconStyle = ICON_STYLES[color] || ICON_STYLES.gray

  return (
    <div className={`card flex flex-col gap-3 hover:shadow-card-hover transition-smooth ${readOnly ? READ_ONLY_CARD : ''}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl ${iconStyle.container} flex items-center justify-center flex-shrink-0`}>
            <Icon className={iconStyle.icon} size={16} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-brand-text font-heading leading-none">
        {shouldAnimate ? (
          <AnimatedValue value={numericValue} type={detectedType} />
        ) : (
          value
        )}
      </p>
      {subtitleText && (
        <p className="text-xs text-brand-text-3 leading-tight">{subtitleText}</p>
      )}
    </div>
  )
}

export default KpiCard
