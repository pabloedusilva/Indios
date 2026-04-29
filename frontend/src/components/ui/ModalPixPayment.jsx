// =============================================================
//  components/ui/ModalPixPayment.jsx — Modal de Pagamento PIX
//
//  Exibe o QR Code e código copia e cola do PIX.
//  Permite copiar o código e monitora o status do pagamento.
// =============================================================

import { useState, useEffect } from 'react'
import Modal from './Modal'
import { usePixPayment } from '../../hooks/usePixPayment'
import { formatarMoeda } from '../../utils/formatters'
import { 
  MdQrCode2, 
  MdContentCopy, 
  MdCheck, 
  MdTimer,
  MdInfo
} from 'react-icons/md'

export default function ModalPixPayment({ isOpen, onClose, pixData, overlayClassName = '' }) {
  const { copiarCodigoPix, cancelarPix } = usePixPayment()
  const [copiado, setCopiado] = useState(false)
  const [tempoRestante, setTempoRestante] = useState(null)

  // Calcular tempo restante para expiração
  useEffect(() => {
    if (!pixData?.expiresAt) return

    const interval = setInterval(() => {
      const agora = new Date()
      const expira = new Date(pixData.expiresAt)
      const diff = expira - agora

      if (diff <= 0) {
        setTempoRestante('Expirado')
        clearInterval(interval)
      } else {
        const horas = Math.floor(diff / 3600000)
        const minutos = Math.floor((diff % 3600000) / 60000)
        const segundos = Math.floor((diff % 60000) / 1000)
        setTempoRestante(
          `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`
        )
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [pixData?.expiresAt])

  const handleCopiarCodigo = async () => {
    const sucesso = await copiarCodigoPix()
    if (sucesso) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const handleFechar = () => {
    cancelarPix()
    onClose()
  }

  if (!pixData) return null

  return (
    <Modal isOpen={isOpen} onClose={handleFechar} title="Pagamento PIX" size="lg" overlayClassName={overlayClassName}>
      <div className="p-6 flex flex-col gap-6">

        {/* Header com informações do pagamento */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium mb-3">
            <MdQrCode2 size={16} />
            PIX Gerado
          </div>
          
          <h3 className="text-2xl font-bold text-brand-text mb-1">
            {formatarMoeda(pixData.valor)}
          </h3>
          
          <p className="text-sm text-brand-text-2">
            Mensalidade {pixData.mesReferencia}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white rounded-2xl shadow-sm border border-brand-border">
            {pixData.qrCodeBase64 ? (
              <img 
                src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <MdQrCode2 size={48} className="text-gray-400" />
              </div>
            )}
          </div>

          {/* Tempo restante */}
          {tempoRestante && (
            <div className="flex items-center gap-2 text-sm text-brand-text-2">
              <MdTimer size={16} />
              <span>
                {tempoRestante === 'Expirado' ? (
                  <span className="text-red-500 font-medium">PIX Expirado</span>
                ) : (
                  <>Expira em: <span className="font-mono font-medium">{tempoRestante}</span></>
                )}
              </span>
            </div>
          )}
          
          <p className="text-xs text-brand-text-3 text-center max-w-sm">
            Escaneie o QR Code com o app do seu banco ou use o código copia e cola abaixo
          </p>
        </div>

        {/* Código copia e cola */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-brand-text">
            Código PIX (Copia e Cola)
          </label>
          
          <div className="relative">
            <textarea
              value={pixData.qrCode}
              readOnly
              rows={3}
              className="w-full p-3 pr-12 text-xs font-mono bg-brand-surface border border-brand-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
            />
            
            <button
              onClick={handleCopiarCodigo}
              className={`
                absolute top-3 right-3 p-2 rounded-lg transition-all duration-200
                ${copiado 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                  : 'bg-brand-surface-2 text-brand-text-2 hover:bg-brand-orange/10 hover:text-brand-orange'
                }
              `}
            >
              {copiado ? <MdCheck size={16} /> : <MdContentCopy size={16} />}
            </button>
          </div>
          
          <button
            onClick={handleCopiarCodigo}
            className={`
              w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200
              ${copiado
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-default'
                : 'bg-brand-orange text-white hover:bg-brand-orange/90 active:scale-[0.98]'
              }
            `}
          >
            {copiado ? (
              <>
                <MdCheck size={20} className="inline mr-2" />
                Código Copiado!
              </>
            ) : (
              <>
                <MdContentCopy size={20} className="inline mr-2" />
                Copiar Código PIX
              </>
            )}
          </button>
        </div>

        {/* Informações adicionais */}
        <div className="space-y-3">
          {/* Instruções */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
            <div className="flex items-start gap-2">
              <MdInfo size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-1">Como pagar:</p>
                <ul className="text-xs space-y-1 opacity-90">
                  <li>• Abra o app do seu banco</li>
                  <li>• Escolha "PIX" → "Pagar com QR Code" ou "Copia e Cola"</li>
                  <li>• Escaneie o código ou cole o texto acima</li>
                  <li>• Confirme o pagamento</li>
                  <li>• O sistema será liberado automaticamente</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Modal>
  )
}