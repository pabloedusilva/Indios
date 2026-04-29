// =============================================================
//  components/ui/ModalSucesso.jsx
//
//  Modal de confirmação de pagamento com animação SVG fluida:
//    · Anel verde que se desenha suavemente (stroke-dashoffset)
//    · Checkmark que aparece após o anel completar
//    · Texto com fadeIn+slideUp
//    · Auto-fecha em 5s (timer estável via ref)
// =============================================================

import { useEffect, useRef } from 'react'
import Portal from './Portal'

const AUTO_CLOSE_MS  = 5000
const CIRCUMFERENCE  = 2 * Math.PI * 44  // 276.46

export default function ModalSucesso({ isOpen, onClose }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Timer disparado UMA vez quando isOpen vira true
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => onCloseRef.current?.(), AUTO_CLOSE_MS)
    return () => clearTimeout(t)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  return (
    <Portal>
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Pagamento confirmado"
      >
      <div
        className="modal-box flex flex-col items-center gap-5 py-10 px-8 max-w-xs text-center"
        style={{ animation: 'ms-popIn .4s cubic-bezier(.34,1.56,.64,1) both' }}
      >
        {/* Ícone SVG animado */}
        <div className="relative w-24 h-24">

          {/* Anel de fundo (estático, sempre visível) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
            <circle
              cx="50" cy="50" r="44"
              stroke="currentColor"
              className="text-green-100 dark:text-green-900/40"
              strokeWidth="7"
            />
          </svg>

          {/* Anel animado — começa invisível, desenha-se no sentido horário */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            fill="none"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="50" cy="50" r="44"
              stroke="currentColor"
              className="text-green-500"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE}
              style={{
                animation: `ms-drawRing .7s .15s cubic-bezier(.4,0,.2,1) forwards`,
              }}
            />
          </svg>

          {/* Checkmark — aparece após o anel terminar */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" fill="none">
            <polyline
              points="27,52 43,68 73,34"
              stroke="currentColor"
              className="text-green-500"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="68"
              strokeDashoffset="68"
              style={{
                animation: `ms-drawCheck .45s .82s cubic-bezier(.25,.1,.25,1) forwards`,
              }}
            />
          </svg>
        </div>

        {/* Texto */}
        <div style={{ animation: 'ms-slideUp .4s 1.1s both' }}>
          <p className="text-lg font-bold text-[var(--brand-text)] leading-tight">
            Pago com sucesso!
          </p>
          <p className="text-sm text-[var(--brand-muted)] mt-1">
            Servidor atualizado. Obrigado!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ms-popIn {
          0%   { transform: scale(.8);  opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes ms-drawRing {
          to { stroke-dashoffset: 0; }
        }
        @keyframes ms-drawCheck {
          to { stroke-dashoffset: 0; }
        }
        @keyframes ms-slideUp {
          0%   { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </div>
    </Portal>
  )
}
