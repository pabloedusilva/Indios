// =============================================================
//  components/ui/DownloadProgress.jsx — Indicador de Download
// =============================================================

import { useEffect, useState } from 'react'

export default function DownloadProgress({ isDownloading, onClose }) {
  const [mounted, setMounted]         = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [visible, setVisible]         = useState(false)

  useEffect(() => {
    if (isDownloading) {
      setMounted(true)
      setShowSuccess(false)
      requestAnimationFrame(() => setVisible(true))
    } else if (mounted && !isDownloading) {
      setShowSuccess(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setTimeout(() => {
          setMounted(false)
          setShowSuccess(false)
          if (onClose) onClose()
        }, 300)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [isDownloading, mounted, onClose])

  if (!mounted) return null

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        w-64
        bg-white dark:bg-[#141414]
        border border-gray-200/80 dark:border-white/[0.07]
        rounded-2xl shadow-lg
        overflow-hidden
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
    >
      {/* Barra de progresso indeterminada — topo */}
      {!showSuccess && (
        <div className="h-[2px] w-full bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
          <div className="h-full bg-brand-orange/80 animate-indeterminate" />
        </div>
      )}

      <div className="px-4 py-3.5 flex items-center gap-3">

        {/* Indicador */}
        <div className="flex-shrink-0">
          {showSuccess ? (
            // Checkmark minimalista
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-4 h-4 text-emerald-500 dark:text-emerald-400"
            >
              <path
                d="M4 10.5l4 4 8-8"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            // Spinner fino
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="w-4 h-4 animate-spin text-brand-orange/70 dark:text-brand-orange-light/70"
            >
              <circle
                cx="10" cy="10" r="7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.2"
              />
              <path
                d="M10 3a7 7 0 0 1 7 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </div>

        {/* Texto */}
        <div className="min-w-0">
          {showSuccess ? (
            <p className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400 leading-snug">
              Download concluído
            </p>
          ) : (
            <>
              <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100 leading-snug">
                Preparando download
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                Gerando arquivo ZIP das notas fiscais
              </p>
            </>
          )}
        </div>

        {/* Fechar */}
        <button
          onClick={() => {
            setVisible(false)
            setTimeout(() => {
              setMounted(false)
              if (onClose) onClose()
            }, 300)
          }}
          className="flex-shrink-0 ml-auto p-1 rounded-lg
            text-gray-300 dark:text-white/20
            hover:text-gray-500 dark:hover:text-white/50
            transition-colors"
          aria-label="Fechar"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
