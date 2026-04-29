// =============================================================
//  components/ui/ModalBloqueio.jsx — Bloqueio por falta de pagamento
//
//  Exibido em tela cheia quando o prazo de pagamento expirou.
//
//  Segurança:
//    · z-index máximo — sobrepõe absolutamente tudo
//    · Sem botão de fechar — só some com pagamento confirmado
//    · Bloqueia scroll, Escape e clique fora
//    · Todas as rotas e interações do app ficam inacessíveis
// =============================================================

import { useEffect, useState } from 'react'
import { usePixPayment } from '../../hooks/usePixPayment'
import ModalPixPayment from './ModalPixPayment'
import { MdLock, MdQrCode2 } from 'react-icons/md'

export default function ModalBloqueio({ visivel }) {
  const { criandoPix, pixData, erro, criarPagamentoPix } = usePixPayment()
  const [mostrarModalPix, setMostrarModalPix] = useState(false)

  // Bloquear teclado e scroll enquanto ativo
  useEffect(() => {
    if (!visivel) return

    const bloquearTeclado = (e) => {
      if (['Escape', 'F5', 'F11'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', bloquearTeclado, true)

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', bloquearTeclado, true)
    }
  }, [visivel])

  // Abrir modal PIX quando QR Code estiver disponível
  useEffect(() => {
    if (pixData) setMostrarModalPix(true)
  }, [pixData])

  if (!visivel) return null

  return (
    <>
      {/* Backdrop — z-[9999] garante que fica acima de tudo */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.75)' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Card */}
        <div
          className="relative w-full max-w-sm bg-brand-surface rounded-3xl border border-brand-border overflow-hidden"
          style={{
            animation: 'bl-popIn .45s cubic-bezier(.34,1.56,.64,1) both',
            boxShadow: '0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,53,23,0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-8 pt-8 pb-7 flex flex-col items-center gap-5 text-center">

            {/* Ícone */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30 border border-red-100 dark:border-red-900/30 flex items-center justify-center">
              <MdLock size={30} className="text-[#C93517]" />
            </div>

            {/* Texto principal */}
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-brand-text tracking-tight">
                Acesso Suspenso
              </h2>
              <p className="text-sm text-brand-text-2 leading-relaxed">
                O prazo de pagamento do servidor expirou. Regularize o pagamento para continuar usando o sistema.
              </p>
            </div>

            {/* Divisor */}
            <div className="w-full h-px bg-brand-border" />

            {/* Erro, se houver */}
            {erro && (
              <p className="text-xs text-red-500 font-medium w-full text-left -mb-1">
                {erro}
              </p>
            )}

            {/* Botão de pagar */}
            <button
              onClick={criarPagamentoPix}
              disabled={criandoPix}
              className="
                w-full py-3.5 rounded-2xl font-bold text-sm text-white
                bg-gradient-to-r from-[#C93517] to-[#E8650A]
                transition-all duration-200
                hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                flex items-center justify-center gap-2 shadow-brand
              "
            >
              <MdQrCode2 size={17} />
              {criandoPix ? 'Gerando PIX...' : 'Pagar agora com PIX'}
            </button>

            {/* Rodapé */}
            <p className="text-xs text-brand-text-3 leading-relaxed">
              O acesso é restaurado automaticamente após a confirmação do pagamento.
            </p>

          </div>
        </div>
      </div>

      {/* Modal PIX — z-[10000] para ficar acima do bloqueio */}
      {mostrarModalPix && (
        <ModalPixPayment
          isOpen={mostrarModalPix}
          onClose={() => setMostrarModalPix(false)}
          pixData={pixData}
          overlayClassName="!z-[10000]"
        />
      )}

      <style>{`
        @keyframes bl-popIn {
          0%   { transform: scale(.88) translateY(8px); opacity: 0; }
          100% { transform: scale(1)   translateY(0);   opacity: 1; }
        }
      `}</style>
    </>
  )
}
