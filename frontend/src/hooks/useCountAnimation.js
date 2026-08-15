// ════════════════════════════════════════════════════════════════════════════
// HOOK: useCountAnimation
// ════════════════════════════════════════════════════════════════════════════
// Hook customizado para animar números com efeito de contagem
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

export function useCountAnimation(endValue, duration = 1000, decimals = 0) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime = null
    let animationFrame = null

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // Easing function (easeOutQuart para suavidade)
      const easeOut = 1 - Math.pow(1 - progress, 4)
      const currentCount = endValue * easeOut
      
      setCount(Number(currentCount.toFixed(decimals)))
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [endValue, duration, decimals])

  return count
}

export default useCountAnimation
