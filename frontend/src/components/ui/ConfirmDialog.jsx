import Portal from './Portal'

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', danger = false }) {
  if (!isOpen) return null
  return (
    <Portal>
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-brand-surface rounded-2xl border border-brand-border shadow-card-hover max-w-sm w-full p-6 animate-slide-up">
          <h3 className="font-heading text-base font-bold text-brand-text mb-2">{title}</h3>
          <p className="text-sm text-brand-text-2 mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={onConfirm}
              className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}
