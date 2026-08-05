import { AnimatedValue } from '../common'

export default function StatCard({ label, value, icon: Icon, sub, color = 'red', type = 'text' }) {
  const colorMap = {
    red:    { icon: 'text-brand-red',    bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-100 dark:border-red-900/40' },
    orange: { icon: 'text-brand-orange', bg: 'bg-orange-50 dark:bg-orange-950/30',  border: 'border-orange-100 dark:border-orange-900/40' },
    gold:   { icon: 'text-brand-gold',   bg: 'bg-amber-50 dark:bg-amber-950/30',   border: 'border-amber-100 dark:border-amber-900/40' },
    green:  { icon: 'text-emerald-600 dark:text-emerald-400',  bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/40' },
  }
  const c = colorMap[color] || colorMap.red

  // Verificar se o valor é numérico para aplicar animação
  const isNumeric = !isNaN(parseFloat(value)) && isFinite(value)
  const shouldAnimate = type === 'number' || type === 'money' || (isNumeric && !value.toString().includes('R$'))

  return (
    <div className="card flex flex-col gap-3 hover:shadow-card-hover transition-smooth">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center transition-smooth`}>
            <Icon className={`${c.icon}`} size={17} />
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-brand-text font-heading">
          {shouldAnimate ? (
            <AnimatedValue value={value} type={type} />
          ) : (
            value
          )}
        </p>
        {sub && <p className="text-xs text-brand-text-3 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
