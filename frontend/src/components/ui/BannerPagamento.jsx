// =============================================================
//  components/ui/BannerPagamento.jsx
//
//  Exibe o banner de cobrança mensal do servidor apenas entre
//  os dias 25 e 29, e somente se o mês ainda não foi pago.
//  Ao clicar em "Pagar agora", abre o checkout do Mercado Pago
//  em nova aba. Quando o pagamento é confirmado, o banner some
//  com animação e o ModalSucesso é exibido.
// =============================================================

import { useEffect, useState } from 'react'
import { usePagamento } from '../../hooks/usePagamento'
import ModalSucesso from './ModalSucesso'
import { MdWarning } from 'react-icons/md'

// Retorna o dia atual no horário de Brasília (UTC-3)
function diaBRT() {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.getUTCDate()
}

const DIA_INICIO = 23 // Início da cobrança (dia 23 do mês)
const DIAS_AVISO = 5  // 5 dias de aviso (23 a 27)

export default function BannerPagamento() {
  const {
    mesPago,
    verificando,
    abrindo,
    erroCobrar,
    sucesso,
    abrirCheckout,
    fecharSucesso,
  } = usePagamento()

  const dia    = diaBRT()
  const diaFim = DIA_INICIO + DIAS_AVISO - 1

  const dentroJanela = dia >= DIA_INICIO && dia <= diaFim

  // Animação de saída quando o pagamento for confirmado
  const [saindo, setSaindo] = useState(false)
  const [oculto, setOculto] = useState(false)

  useEffect(() => {
    if (mesPago && dentroJanela && !verificando) {
      setSaindo(true)
      const t = setTimeout(() => setOculto(true), 550)
      return () => clearTimeout(t)
    }
  }, [mesPago, dentroJanela, verificando])

  if (verificando || !dentroJanela || oculto) return null
  if (mesPago && !saindo) return null

  const diasRestantes = diaFim - dia + 1
  const urgente       = diasRestantes <= 2

  return (
    <>
      <div
        style={saindo ? { animation: 'bannerSlideUp .5s cubic-bezier(.4,0,.2,1) forwards' } : undefined}
        className={`
          relative w-full overflow-hidden border-b
          ${urgente
            ? 'bg-gradient-to-r from-red-600 to-red-500 border-red-700'
            : 'bg-gradient-to-r from-[#C93517] to-[#E8650A] border-[#C93517]'}
        `}
      >
        {/* Brilho decorativo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4 px-5 py-2.5 max-w-[1600px] mx-auto">

          {/* Ícone + texto */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <MdWarning size={15} className="text-white" />
            </div>
            <p className="text-sm font-medium text-white/95 truncate">
              <span className="font-bold text-white">Atenção:&nbsp;</span>
              Efetue o pagamento do servidor para manter o sistema online.
            </p>
          </div>

          {/* Contador + botão */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-xs font-semibold text-white tabular-nums">
              {diasRestantes} {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
            </span>
            <button
              onClick={abrirCheckout}
              disabled={abrindo}
              className="
                inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold
                bg-white text-[#C93517] shadow-sm border border-white/80
                transition-all duration-200 hover:bg-white/90 hover:scale-[1.03]
                active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {abrindo ? 'Aguarde...' : 'Pagar agora'}
            </button>
          </div>
        </div>

        {erroCobrar && (
          <p className="text-center text-xs text-white/80 pb-1.5 -mt-1">{erroCobrar}</p>
        )}
      </div>

      {/* Modal de sucesso após pagamento */}
      <ModalSucesso isOpen={sucesso} onClose={fecharSucesso} />

      <style>{`
        @keyframes bannerSlideUp {
          0%   { transform: translateY(0);    opacity: 1; max-height: 60px; }
          100% { transform: translateY(-100%); opacity: 0; max-height: 0;   }
        }
      `}</style>
    </>
  )
}
