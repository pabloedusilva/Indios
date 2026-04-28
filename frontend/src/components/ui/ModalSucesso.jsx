// =============================================================
//  components/ui/ModalSucesso.jsx
//
//  Modal de confirmação de pagamento com animação SVG:
//    · Anel verde animado (stroke-dashoffset)
//    · Checkmark animado (stroke-dashoffset)
//    · Texto "Pago com sucesso!" com fadeIn+slideUp
//    · Auto-fecha em 5 s
//
//  O timer é disparado UMA única vez quando isOpen muda para true.
//  Usa ref para o onClose para evitar que re-renders reiniciem o timer.
// =============================================================

import { useEffect, useRef } from 'react'

const AUTO_CLOSE_MS = 5000

export default function ModalSucesso({ isOpen, onClose }) {
  // Guarda sempre a versão mais recente do onClose sem re-disparar o timer
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Timer disparado UMA vez quando isOpen vira true
  // Não depende de onClose diretamente — usa a ref
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => onCloseRef.current?.(), AUTO_CLOSE_MS)
    return () => clearTimeout(t)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Pagamento confirmado"
    >
      <div
        className="modal-box flex flex-col items-center gap-5 py-10 px-8 max-w-xs text-center"
        style={{ animation: 'popIn .35s cubic-bezier(.34,1.56,.64,1) both' }}
      >
        {/* Ícone SVG animado */}
        <div className="relative w-24 h-24">
          {/* Anel de fundo */}
          <svg className="absolute inset-0" viewBox="0 0 100 100" fill="none">
            <circle
              cx="50" cy="50" r="44"
              stroke="currentColor"
              className="text-green-100 dark:text-green-900/30"
              strokeWidth="8"
            />
          </svg>

          {/* Anel animado */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" fill="none">
            <circle
              cx="50" cy="50" r="44"
              stroke="currentColor"
              className="text-green-500"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="276.46"
              strokeDashoffset="276.46"
              style={{ animation: 'drawCircle .6s .1s cubic-bezier(.4,0,.2,1) forwards' }}
            />
          </svg>

          {/* Checkmark animado */}
          <svg className="absolute inset-0" viewBox="0 0 100 100" fill="none">
            <polyline
              points="28,52 44,68 72,35"
              stroke="currentColor"
              className="text-green-500"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="60"
              strokeDashoffset="60"
              style={{ animation: 'drawCheck .4s .7s cubic-bezier(.4,0,.2,1) forwards' }}
            />
          </svg>
        </div>

        {/* Texto */}
        <div style={{ animation: 'slideUpFade .4s .9s both' }}>
          <p className="text-lg font-bold text-[var(--brand-text)] leading-tight">
            Pago com sucesso!
          </p>
          <p className="text-sm text-[var(--brand-muted)] mt-1">
            Servidor atualizado. Obrigado!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          0%   { transform: scale(.85); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes drawCircle {
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
        @keyframes slideUpFade {
          0%   { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
