// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Card Nota Fiscal
// ════════════════════════════════════════════════════════════════════════════
// Card compacto para exibir nota fiscal em lista.
//
// MELHORIAS IMPLEMENTADAS:
// - ✅ Badge de prazo para cancelamento (24h)
// - ✅ Validação de elegibilidade para cancelamento
// - ✅ Tooltip explicativo quando não pode cancelar
// - ✅ Countdown visual do tempo restante
// - ✅ Desabilita botão se prazo expirado
//
// PROPS:
// - nota: Object (dados da nota)
// - onVisualizarDetalhes: (notaId) => void
// - onCancelar: (notaId) => void
// - onDownloadXML: (notaId) => void
// - onDownloadDANFE: (notaId) => void
//
// INFORMAÇÕES EXIBIDAS:
// - Número da nota (destaque)
// - Data de emissão
// - Destinatário (nome ou CNPJ)
// - Valor total
// - Status (badge colorido)
// - Badge de prazo (se autorizada)
// - Chave de acesso (resumida, expandível)
//
// AÇÕES RÁPIDAS:
// - Visualizar detalhes completos
// - Download XML
// - Download DANFE
// - Cancelar (se autorizada E dentro do prazo)
//
// ESTADOS DE STATUS:
// - 'emitindo': Badge amarelo + ícone loading
// - 'autorizada': Badge verde + ícone check + badge de prazo
// - 'cancelada': Badge vermelho + ícone X
// - 'erro': Badge vermelho + ícone warning
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { 
  MdArticle, MdVisibility, MdDownload, MdPictureAsPdf, MdCancel, 
  MdMoreVert, MdAccessTime, MdBlock 
} from 'react-icons/md'
import { formatarMoeda, formatarData } from '../../utils/formatters'
import { formatarChaveAcessoResumida } from '../../utils/fiscalFormatters'
import { verificarPrazoCancelamento, formatarTempoRestante } from '../../utils/fiscalUtils'
import StatusBadgeNota from './StatusBadgeNota'

export default function CardNotaFiscal({
  nota,
  onVisualizarDetalhes,
  onCancelar,
  onDownloadXML,
  onDownloadDANFE,
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [baixando, setBaixando] = useState({ xml: false, danfe: false })

  const handleDownloadXML = async (e) => {
    e.stopPropagation()
    if (!nota || !nota.id) return
    
    setBaixando({ ...baixando, xml: true })
    try {
      await onDownloadXML(nota.id)
    } finally {
      setTimeout(() => setBaixando({ ...baixando, xml: false }), 600)
    }
  }

  const handleDownloadDANFE = async (e) => {
    e.stopPropagation()
    if (!nota || !nota.id) return
    
    setBaixando({ ...baixando, danfe: true })
    try {
      await onDownloadDANFE(nota.id)
    } finally {
      setTimeout(() => setBaixando({ ...baixando, danfe: false }), 600)
    }
  }

  const handleCancelar = (e) => {
    e.stopPropagation()
    if (!nota || !nota.id) return
    
    setMenuAberto(false)
    onCancelar(nota.id)
  }

  const handleVisualizar = () => {
    onVisualizarDetalhes(nota.id)
  }

  // Verificar prazo de cancelamento
  const prazoInfo = nota.status === 'autorizada' && nota.autorizadoEm 
    ? verificarPrazoCancelamento(nota.autorizadoEm)
    : null

  const podeCancelar = nota.status === 'autorizada' && prazoInfo?.dentroDoPrazo
  const podeDownload = nota.status === 'autorizada'

  return (
    <div
      className="rounded-xl border bg-brand-surface transition-all duration-200 hover:border-brand-orange/30 hover:shadow-sm border-brand-border cursor-pointer"
      onClick={handleVisualizar}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Ícone */}
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center">
          <MdArticle className="text-brand-orange" size={17} />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-brand-text-3">
              NF-e #{nota.numero || '---'}
            </span>
            {nota.nomeCliente && (
              <span className="text-sm font-semibold text-brand-text truncate">
                {nota.nomeCliente}
              </span>
            )}
            <span className="text-xs text-brand-text-3">
              Consumidor Final
            </span>
            <StatusBadgeNota status={nota.status} size="sm" />
            
            {/* Badge de Prazo (apenas para notas autorizadas) */}
            {prazoInfo && (
              <span 
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  prazoInfo.dentroDoPrazo
                    ? 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/40'
                    : 'bg-gray-50 dark:bg-gray-950/30 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800/40'
                }`}
                title={prazoInfo.mensagem}
              >
                {prazoInfo.dentroDoPrazo ? (
                  <>
                    <MdAccessTime size={10} />
                    {formatarTempoRestante(prazoInfo.horasRestantes)}
                  </>
                ) : (
                  <>
                    <MdBlock size={10} />
                    Prazo expirado
                  </>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-brand-text-3">
              {formatarData(nota.criadoEm)}
            </span>
            {nota.chaveAcesso && (
              <span className="text-[10px] font-mono text-brand-text-3">
                {formatarChaveAcessoResumida(nota.chaveAcesso)}
              </span>
            )}
          </div>
        </div>

        {/* Valor */}
        <span className="flex-shrink-0 font-bold text-brand-orange text-sm tabular-nums">
          {formatarMoeda(nota.valor || 0)}
        </span>

        {/* Ações rápidas */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleVisualizar}
            title="Ver detalhes"
            className="p-2 rounded-lg text-brand-text-3 hover:text-brand-text hover:bg-brand-bg transition-colors"
          >
            <MdVisibility size={14} />
          </button>

          <button
            onClick={handleDownloadXML}
            disabled={!podeDownload || baixando.xml}
            title={podeDownload ? "Baixar XML" : "Disponível apenas para notas autorizadas"}
            className="p-2 rounded-lg text-brand-text-3 hover:text-brand-text hover:bg-brand-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brand-text-3"
          >
            <MdDownload size={14} className={baixando.xml ? 'animate-bounce' : ''} />
          </button>

          <button
            onClick={handleDownloadDANFE}
            disabled={!podeDownload || baixando.danfe}
            title={podeDownload ? "Baixar DANFE (PDF)" : "Disponível apenas para notas autorizadas"}
            className="p-2 rounded-lg text-brand-text-3 hover:text-brand-text hover:bg-brand-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brand-text-3"
          >
            <MdPictureAsPdf size={14} className={baixando.danfe ? 'animate-pulse' : ''} />
          </button>

          {/* Menu de mais opções (apenas se pode cancelar) */}
          {nota.status === 'autorizada' && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuAberto(!menuAberto)
                }}
                title={podeCancelar ? 'Mais opções' : 'Prazo de 24h expirado. Emita nota de devolução.'}
                className="p-2 rounded-lg text-brand-text-3 hover:text-brand-text hover:bg-brand-bg transition-colors"
              >
                <MdMoreVert size={14} />
              </button>

              {menuAberto && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuAberto(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-brand-surface border border-brand-border rounded-xl shadow-card-hover overflow-hidden z-20 min-w-[200px] animate-slide-up">
                    {podeCancelar ? (
                      <button
                        onClick={handleCancelar}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <MdCancel size={14} />
                        Cancelar NFe
                      </button>
                    ) : (
                      <div className="px-4 py-3 text-xs text-brand-text-3">
                        <div className="flex items-start gap-2">
                          <MdBlock size={14} className="flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-brand-text-2 mb-1">Prazo Expirado</p>
                            <p className="leading-relaxed">
                              Notas só podem ser canceladas em até 24h após autorização.
                              Para corrigir, emita uma nota de devolução.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
