import { useEffect, useRef } from 'react'
import { MdClose } from 'react-icons/md'
import Portal from './Portal'

export default function Modal({
  isOpen, onClose, title, children, size = 'lg', fullscreen = false, overlayClassName = '',
}) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl',
    xl: 'max-w-5xl', '2xl': 'max-w-7xl',
  }

  const ModalHeader = () => (
    <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
      <h2 className="font-heading text-lg font-bold text-brand-text">{title}</h2>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-brand-text-3
                   hover:text-brand-text hover:bg-brand-bg transition-all"
      >
        <MdClose size={18} />
      </button>
    </div>
  )

  if (fullscreen) {
    return (
      <Portal>
        <div className="fixed inset-0 bg-brand-bg z-50 flex flex-col animate-fade-in">
          <div className="bg-brand-surface border-b border-brand-border flex-shrink-0">
            <ModalHeader />
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </Portal>
    )
  }

  return (
    <Portal>
      <div
        ref={overlayRef}
        className={`modal-overlay p-4 ${overlayClassName}`}
        onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      >
        <div className={`modal-box w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}>
          <ModalHeader />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </Portal>
  )
}
