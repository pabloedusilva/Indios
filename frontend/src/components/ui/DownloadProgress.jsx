// =============================================================
//  components/ui/DownloadProgress.jsx — Indicador de Download
//
//  Componente flutuante que mostra o progresso de downloads
//  com animações modernas e feedback visual.
// =============================================================

import { useEffect, useState } from 'react'
import { MdDownload, MdCheckCircle, MdClose } from 'react-icons/md'

export default function DownloadProgress({ isDownloading, onClose }) {
  const [showSuccess, setShowSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isDownloading) {
      setMounted(true)
      setShowSuccess(false)
    } else if (mounted && !isDownloading) {
      // Mostrar sucesso quando download terminar
      setShowSuccess(true)
      // Fechar automaticamente após 3 segundos
      const timer = setTimeout(() => {
        setMounted(false)
        setShowSuccess(false)
        if (onClose) onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isDownloading, mounted, onClose])

  if (!mounted) return null

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        bg-white dark:bg-[#1a1410]
        border border-gray-200 dark:border-[#2d2420]
        rounded-xl shadow-2xl
        p-4 w-[280px]
        transition-all duration-300 ease-out
        ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
      `}
    >
      {/* Botão Fechar */}
      <button
        onClick={() => {
          setMounted(false)
          if (onClose) onClose()
        }}
        className="absolute top-2 right-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2d2420] transition-colors"
        aria-label="Fechar"
      >
        <MdClose size={16} className="text-gray-500 dark:text-gray-400" />
      </button>

      <div className="flex items-start gap-3">
        {/* Ícone Animado */}
        <div className="flex-shrink-0 pt-0.5">
          {showSuccess ? (
            <div className="relative">
              <MdCheckCircle 
                size={32} 
                className="text-green-500 dark:text-green-400 animate-scale-check"
              />
              <div className="absolute inset-0 rounded-full bg-green-500/20 dark:bg-green-400/10 animate-ping" />
            </div>
          ) : (
            <div className="relative animate-float-subtle">
              <MdDownload 
                size={32} 
                className="text-brand-orange dark:text-brand-orange-light"
              />
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 pr-6">
          {showSuccess ? (
            <>
              <h3 className="text-sm font-bold text-green-600 dark:text-green-400 mb-0.5">
                Download Concluído!
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Arquivo baixado com sucesso
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                Preparando Download...
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Gerando arquivo ZIP das notas fiscais
              </p>
              
              {/* Barra de Progresso - Preenchimento Contínuo */}
              <div className="relative h-1 bg-gray-200/50 dark:bg-[#2d2420]/50 rounded-full overflow-hidden">
                {/* Barra de preenchimento */}
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-orange to-brand-orange-light dark:from-brand-orange-light dark:to-brand-orange rounded-full animate-progress-fill" 
                     style={{ transformOrigin: 'left' }} />
                {/* Flash de luz bem visível */}
                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-white/0 via-white/70 to-white/0 animate-progress-flash" 
                     style={{ filter: 'blur(2px)' }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
