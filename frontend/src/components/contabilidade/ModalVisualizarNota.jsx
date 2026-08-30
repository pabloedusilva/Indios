// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Modal Visualizar Nota
// ════════════════════════════════════════════════════════════════════════════
// Modal para visualizar detalhes completos de uma nota fiscal.
//
// PROPS:
// - isOpen: boolean
// - onClose: () => void
// - notaId: string
//
// SEÇÕES:
// - Identificação (número, série, chave de acesso)
// - Status (badge colorido)
// - Dados do emitente
// - Dados do destinatário
// - Itens/produtos
// - Totalizadores
// - Forma de pagamento
// - Dados da autorização (protocolo, data)
// - Timeline de eventos
//
// AÇÕES:
// - Download XML
// - Download DANFE (PDF)
// - Consultar status na SEFAZ
// - Cancelar (se autorizada e dentro do prazo)
// - Imprimir DANFE
//
// DESIGN:
// - Layout clean e profissional
// - Badge de status destacado
// - Chave de acesso formatada
// - Timeline visual dos eventos
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import Modal from '../ui/Modal'
import { MdDownload, MdPictureAsPdf, MdRefresh, MdCancel, MdContentCopy } from 'react-icons/md'
import { formatarMoeda, formatarData, formatarDataHora } from '../../utils/formatters'
import { formatarChaveAcesso, formatarCNPJ, formatarCPF } from '../../utils/fiscalFormatters'
import StatusBadgeNota from './StatusBadgeNota'
import TimelineNota from './TimelineNota'

export default function ModalVisualizarNota({ isOpen, onClose, nota, onCancelar, onDownloadXML, onDownloadDANFE, onConsultarStatus }) {
  const [copiado, setCopiado] = useState(false)
  const [baixando, setBaixando] = useState({ xml: false, danfe: false })
  const [consultando, setConsultando] = useState(false)

  if (!nota) return null

  const handleCopiarChave = async () => {
    if (nota.chaveAcesso) {
      try {
        await navigator.clipboard.writeText(nota.chaveAcesso)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2000)
      } catch (err) {
        // Falha silenciosa ao copiar
      }
    }
  }

  const handleDownloadXML = async () => {
    if (!nota || !nota.id) return
    setBaixando({ ...baixando, xml: true })
    try {
      await onDownloadXML(nota.id)
    } finally {
      setTimeout(() => setBaixando({ ...baixando, xml: false }), 600)
    }
  }

  const handleDownloadDANFE = async () => {
    if (!nota || !nota.id) return
    setBaixando({ ...baixando, danfe: true })
    try {
      await onDownloadDANFE(nota.id)
    } finally {
      setTimeout(() => setBaixando({ ...baixando, danfe: false }), 600)
    }
  }

  const handleConsultarStatus = async () => {
    if (!nota || !nota.id) return
    setConsultando(true)
    try {
      await onConsultarStatus(nota.id)
    } finally {
      setTimeout(() => setConsultando(false), 1000)
    }
  }

  const podeCancelar = nota.status === 'autorizada'
  const podeDownload = nota.status === 'autorizada'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Nota Fiscal" size="xl">
      <div className="p-6 space-y-6">
        {/* Identificação e Status */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-heading font-bold text-brand-text">
                NF-e #{nota.numero || '---'}
              </h3>
              <StatusBadgeNota status={nota.status} size="lg" />
            </div>
            <p className="text-sm text-brand-text-3">
              Série {nota.serie || '1'} • Emitida em {formatarDataHora(nota.criadoEm)}
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleConsultarStatus}
              disabled={consultando || nota.status === 'emitindo'}
              className="btn-secondary text-xs py-2 px-3 gap-1.5"
            >
              <MdRefresh size={13} className={consultando ? 'animate-spin' : ''} />
              Atualizar
            </button>
            <button
              onClick={handleDownloadXML}
              disabled={!podeDownload || baixando.xml}
              title={podeDownload ? "Baixar XML" : "Disponível apenas para notas autorizadas"}
              className="btn-secondary text-xs py-2 px-3 gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <MdDownload size={13} className={baixando.xml ? 'animate-bounce' : ''} />
              XML
            </button>
            <button
              onClick={handleDownloadDANFE}
              disabled={!podeDownload || baixando.danfe}
              title={podeDownload ? "Baixar DANFE (PDF)" : "Disponível apenas para notas autorizadas"}
              className="btn-secondary text-xs py-2 px-3 gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <MdPictureAsPdf size={13} className={baixando.danfe ? 'animate-pulse' : ''} />
              DANFE
            </button>
            {podeCancelar && (
              <button
                onClick={() => onCancelar(nota.id)}
                className="btn-danger text-xs py-2 px-3 gap-1.5"
              >
                <MdCancel size={13} />
                Cancelar NFe
              </button>
            )}
          </div>
        </div>

        {/* Chave de Acesso */}
        {nota.chaveAcesso && (
          <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
            <label className="text-xs font-semibold text-brand-text-3 uppercase tracking-wider block mb-2">
              Chave de Acesso
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-brand-text break-all">
                {formatarChaveAcesso(nota.chaveAcesso)}
              </code>
              <button
                onClick={handleCopiarChave}
                className="p-2 rounded-lg hover:bg-brand-surface transition-colors flex-shrink-0"
                title="Copiar chave"
              >
                <MdContentCopy size={16} className={copiado ? 'text-green-600' : 'text-brand-text-3'} />
              </button>
            </div>
            {copiado && (
              <p className="text-xs text-green-600 mt-1">Chave copiada!</p>
            )}
          </div>
        )}

        {/* Grid de informações */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Emitente */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider">Emitente</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-xs text-brand-text-3">Razão Social:</span>
                <p className="font-semibold text-brand-text">{nota.emitente?.razaoSocial || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-brand-text-3">CNPJ:</span>
                <p className="font-mono text-brand-text">{nota.emitente?.cnpj ? formatarCNPJ(nota.emitente.cnpj) : '—'}</p>
              </div>
            </div>
          </div>

          {/* Destinatário */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider">Destinatário</h4>
            <div className="space-y-2 text-sm">
              {nota.nomeCliente && (
                <div>
                  <span className="text-xs text-brand-text-3">Cliente:</span>
                  <p className="font-semibold text-brand-text">{nota.nomeCliente}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-brand-text-3">Nota emitida para:</span>
                <p className="font-semibold text-brand-text">{nota.destinatario?.nome || nota.destinatario?.razaoSocial || 'Consumidor Final'}</p>
              </div>
              {nota.destinatario?.cpf && (
                <div>
                  <span className="text-xs text-brand-text-3">CPF:</span>
                  <p className="font-mono text-brand-text">{formatarCPF(nota.destinatario.cpf)}</p>
                </div>
              )}
              {nota.destinatario?.cnpj && (
                <div>
                  <span className="text-xs text-brand-text-3">CNPJ:</span>
                  <p className="font-mono text-brand-text">{formatarCNPJ(nota.destinatario.cnpj)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itens */}
        {nota.itens && nota.itens.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider">Itens</h4>
            <div className="bg-brand-bg rounded-xl border border-brand-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-brand-surface">
                  <tr className="border-b border-brand-border">
                    <th className="text-left px-4 py-2 text-xs text-brand-text-3 font-semibold">Produto</th>
                    <th className="text-center px-4 py-2 text-xs text-brand-text-3 font-semibold">Qtd</th>
                    <th className="text-right px-4 py-2 text-xs text-brand-text-3 font-semibold">Unit.</th>
                    <th className="text-right px-4 py-2 text-xs text-brand-text-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {nota.itens.map((item, idx) => (
                    <tr key={idx} className="border-b border-brand-border last:border-0">
                      <td className="px-4 py-3 text-sm text-brand-text">{item.descricao || item.nome}</td>
                      <td className="px-4 py-3 text-center text-sm text-brand-text-2">{item.quantidade}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-brand-text-2">{formatarMoeda(item.valorUnitario)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-sm text-brand-text">{formatarMoeda(item.valorTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totalizadores */}
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-4 border border-orange-100 dark:border-orange-900/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-text">Valor Total da Nota</span>
            <span className="text-2xl font-bold text-brand-orange font-heading">{formatarMoeda(nota.valor)}</span>
          </div>
        </div>

        {/* Protocolo de Autorização */}
        {nota.protocolo && nota.status === 'autorizada' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Protocolo SEFAZ</span>
                <p className="font-mono text-sm text-emerald-900 dark:text-emerald-300 mt-0.5">{nota.protocolo}</p>
              </div>
              {nota.autorizadoEm && (
                <span className="text-xs text-emerald-700 dark:text-emerald-400">
                  {formatarDataHora(nota.autorizadoEm)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Timeline de Eventos */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider">Histórico</h4>
          <div className="bg-brand-bg rounded-xl p-4 border border-brand-border">
            <TimelineNota nota={nota} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

