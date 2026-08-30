// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Modal Cancelar Nota
// ════════════════════════════════════════════════════════════════════════════
// Modal para solicitar cancelamento de nota fiscal autorizada.
//
// MELHORIAS IMPLEMENTADAS:
// - ✅ Validação de prazo de 24h (legislação brasileira)
// - ✅ Countdown visual do tempo restante
// - ✅ Dropdown com motivos comuns pré-definidos
// - ✅ Checkbox de confirmação explícita
// - ✅ Validação em tempo real (15-255 caracteres)
// - ✅ Sanitização de entrada
// - ✅ Feedback visual aprimorado
// - ✅ Tratamento de erros específicos
// - ✅ Segurança e conformidade legal
//
// PROPS:
// - isOpen: boolean
// - onClose: () => void
// - nota: Object (nota fiscal autorizada)
// - onConfirmar: (notaId, motivo) => Promise<void>
//
// FLUXO:
// 1. Valida prazo de 24h
// 2. Exibe dados da nota e countdown
// 3. Oferece motivos comuns ou digitação livre
// 4. Valida motivo (15-255 chars)
// 5. Requer checkbox de confirmação
// 6. Processa cancelamento
// 7. Feedback de sucesso/erro
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { MdWarning, MdCancel, MdAccessTime, MdCheckCircle } from 'react-icons/md'
import { formatarMoeda } from '../../utils/formatters'
import { validarMotivoCancelamento } from '../../utils/fiscalValidators'
import { verificarPrazoCancelamento, formatarTempoRestante, MOTIVOS_COMUNS } from '../../utils/fiscalUtils'

export default function ModalCancelarNota({ isOpen, onClose, nota, onConfirmar }) {
  const [motivo, setMotivo] = useState('')
  const [motivoSelecionado, setMotivoSelecionado] = useState('')
  const [confirmacaoLida, setConfirmacaoLida] = useState(false)
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)
  const [prazoInfo, setPrazoInfo] = useState(null)

  // Atualizar informações de prazo quando nota muda ou a cada minuto
  useEffect(() => {
    if (!nota || !isOpen) return

    const atualizarPrazo = () => {
      const info = verificarPrazoCancelamento(nota.autorizadoEm)
      setPrazoInfo(info)
    }

    // Atualizar imediatamente
    atualizarPrazo()

    // Atualizar a cada minuto
    const interval = setInterval(atualizarPrazo, 60000) // 60 segundos

    return () => clearInterval(interval)
  }, [nota, isOpen])

  if (!nota) return null

  const handleMotivoChange = (e) => {
    setMotivo(e.target.value)
    if (erro) setErro('')
  }

  const handleMotivoSelecionadoChange = (e) => {
    const selecionado = e.target.value
    setMotivoSelecionado(selecionado)
    
    if (selecionado) {
      const motivoObj = MOTIVOS_COMUNS.find(m => m.id === selecionado)
      if (motivoObj && motivoObj.id !== 'outro') {
        setMotivo(motivoObj.label)
      } else {
        setMotivo('')
      }
    }
    
    if (erro) setErro('')
  }

  const handleConfirmar = async () => {
    // Validar prazo novamente (pode ter expirado)
    const infoPrazo = verificarPrazoCancelamento(nota.autorizadoEm)
    if (!infoPrazo.dentroDoPrazo) {
      setErro('Prazo de 24h expirado. Não é mais possível cancelar esta nota.')
      return
    }

    // Validar motivo
    const validacao = validarMotivoCancelamento(motivo)
    if (!validacao.valido) {
      setErro(validacao.erro)
      return
    }

    // Validar checkbox de confirmação
    if (!confirmacaoLida) {
      setErro('Você deve confirmar que leu e compreendeu que esta ação é irreversível')
      return
    }

    setProcessando(true)
    setErro('')
    
    try {
      await onConfirmar(nota.id, motivo.trim())
      handleClose()
    } catch (err) {
      setErro(err.message || 'Erro ao cancelar nota fiscal. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const handleClose = () => {
    setMotivo('')
    setMotivoSelecionado('')
    setConfirmacaoLida(false)
    setErro('')
    setPrazoInfo(null)
    onClose()
  }

  const caracteres = motivo.trim().length
  const motivoValido = caracteres >= 15 && caracteres <= 255
  const podeConfirmar = motivoValido && confirmacaoLida && !processando && prazoInfo?.dentroDoPrazo

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Cancelar Nota Fiscal" size="lg">
      <div className="p-6 space-y-6">
        
        {/* Aviso de Ação Irreversível */}
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl p-4">
          <div className="flex gap-3">
            <MdWarning className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 dark:text-red-300 text-sm mb-1">
                ATENÇÃO: Ação Irreversível
              </h4>
              <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                O cancelamento de uma nota fiscal é permanente e será comunicado à SEFAZ.
                Esta ação não pode ser desfeita. Certifique-se de que realmente deseja cancelar.
              </p>
            </div>
          </div>
        </div>

        {/* Prazo para Cancelamento */}
        {prazoInfo && (
          <div className={`rounded-xl p-4 border ${
            prazoInfo.dentroDoPrazo 
              ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/40'
              : 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800/40'
          }`}>
            <div className="flex items-center gap-2.5">
              <MdAccessTime className={prazoInfo.dentroDoPrazo ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'} size={18} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${
                  prazoInfo.dentroDoPrazo 
                    ? 'text-yellow-900 dark:text-yellow-300' 
                    : 'text-gray-700 dark:text-gray-400'
                }`}>
                  {prazoInfo.dentroDoPrazo ? 'Prazo para Cancelamento' : 'Prazo Expirado'}
                </p>
                <p className={`text-xs mt-0.5 ${
                  prazoInfo.dentroDoPrazo 
                    ? 'text-yellow-700 dark:text-yellow-400' 
                    : 'text-gray-600 dark:text-gray-500'
                }`}>
                  {prazoInfo.dentroDoPrazo 
                    ? `${formatarTempoRestante(prazoInfo.horasRestantes)} para cancelar (legislação: 24h após autorização)`
                    : 'Prazo de 24h expirado. Para corrigir, emita uma nota de devolução.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dados da Nota */}
        <div className="bg-brand-bg rounded-xl p-4 border border-brand-border space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-3 mb-3">
            Dados da Nota
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-brand-text-3">Número da Nota</span>
            <span className="font-semibold text-brand-text">#{nota.numero}</span>
          </div>
          {nota.nomeCliente && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-text-3">Cliente</span>
              <span className="font-semibold text-brand-text">{nota.nomeCliente}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-brand-text-3">Destinatário</span>
            <span className="font-semibold text-brand-text">{nota.destinatarioNome || 'Consumidor Final'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-brand-text-3">Valor Total</span>
            <span className="font-bold text-brand-orange">{formatarMoeda(nota.valor)}</span>
          </div>
          {nota.criadoEm && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-text-3">Emitida em</span>
              <span className="text-sm text-brand-text-2">
                {new Date(nota.criadoEm).toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {/* Motivo do Cancelamento */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-brand-text block">
            Motivo do Cancelamento *
          </label>
          
          {/* Dropdown de Sugestões */}
          <select
            value={motivoSelecionado}
            onChange={handleMotivoSelecionadoChange}
            className="input-field"
            disabled={processando}
          >
            <option value="">Selecione um motivo comum ou digite abaixo</option>
            {MOTIVOS_COMUNS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          
          {/* Campo de Texto */}
          <textarea
            value={motivo}
            onChange={handleMotivoChange}
            placeholder="Digite ou complemente o motivo do cancelamento (mínimo 15 caracteres)..."
            rows={4}
            maxLength={255}
            disabled={processando || (motivoSelecionado && motivoSelecionado !== 'outro')}
            className={`input-field resize-none ${
              erro ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : ''
            }`}
          />
          
          {/* Contador de Caracteres */}
          <div className="flex justify-end">
            <span className={`text-xs font-mono ${
              motivoValido 
                ? 'text-green-600 dark:text-green-400 font-semibold' 
                : caracteres > 255
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-brand-text-3'
            }`}>
              {caracteres}/255
            </span>
          </div>
          
          {/* Erro */}
          {erro && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg">
              <MdWarning className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-red-700 dark:text-red-400">{erro}</p>
            </div>
          )}
        </div>

        {/* Checkbox de Confirmação */}
        {prazoInfo?.dentroDoPrazo && (
          <label className="flex items-start gap-3 p-3 rounded-lg border border-brand-border hover:bg-brand-surface cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={confirmacaoLida}
              onChange={(e) => setConfirmacaoLida(e.target.checked)}
              disabled={processando}
              className="mt-0.5 w-4 h-4 text-brand-orange border-brand-border rounded focus:ring-brand-orange/20 focus:ring-2 cursor-pointer"
            />
            <span className="text-sm text-brand-text-2 leading-relaxed">
              Confirmo que li e compreendo que esta ação é <strong className="text-brand-text">irreversível</strong> e 
              será <strong className="text-brand-text">comunicada à SEFAZ</strong>
            </span>
          </label>
        )}

        {/* Ações */}
        <div className="flex items-center gap-3 justify-end pt-4 border-t border-brand-border">
          <button
            onClick={handleClose}
            disabled={processando}
            className="btn-secondary"
          >
            Voltar
          </button>
          
          {prazoInfo?.dentroDoPrazo ? (
            <button
              onClick={handleConfirmar}
              disabled={!podeConfirmar}
              className="btn-danger gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <MdCancel size={16} />
                  Confirmar Cancelamento
                </>
              )}
            </button>
          ) : (
            <div className="text-sm text-brand-text-3 italic">
              Prazo expirado. Emita uma nota de devolução.
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
