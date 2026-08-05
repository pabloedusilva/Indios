// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: AnimatedValue
// ════════════════════════════════════════════════════════════════════════════
// Componente para animar valores numéricos e monetários
// ════════════════════════════════════════════════════════════════════════════

import { useCountAnimation } from '../../hooks/useCountAnimation'
import { formatarMoeda } from '../../utils/formatters'

export function AnimatedValue({ value, type = 'number', duration = 1200, className = '' }) {
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value || 0
  const animatedValue = useCountAnimation(numericValue, duration, type === 'money' ? 2 : 0)

  if (type === 'money') {
    return (
      <span className={`inline-block ${className}`}>
        {formatarMoeda(animatedValue)}
      </span>
    )
  }

  return (
    <span className={`inline-block ${className}`}>
      {Math.round(animatedValue)}
    </span>
  )
}

export default AnimatedValue
