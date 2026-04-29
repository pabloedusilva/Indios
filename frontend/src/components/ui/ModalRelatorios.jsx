// =============================================================
//  components/ui/ModalRelatorios.jsx — Todos os Relatórios PDF
//
//  Lista todos os relatórios mensais disponíveis no banco.
//  O PDF é gerado em memória no servidor a cada download.
// =============================================================

import { useEffect, useRef, useState } from 'react'
import {
  MdClose, MdPictureAsPdf, MdFileDownload, MdRefresh, MdCalendarMonth,
} from 'react-icons/md'
import Portal from './Portal'

// ── Constantes ────────────────────────────────────────────────

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março',    'Abril',
  'Maio',    'Junho',     'Julho',    'Agosto',
  'Setembro','Outubro',   'Novembro', 'Dezembro',
]

// ── Helpers ───────────────────────────────────────────────────

/** Retorna o nome completo do mês, ex: "Março de 2026" */
function nomeMesCompleto(mesStr) {
  if (!mesStr) return ''
  const [ano, m] = mesStr.split('-')
  return `${MESES_PT[parseInt(m, 10) - 1] || m} de ${ano}`
}

/** Formata ISO string para "DD/MM/AAAA às HH:MM" em horário de Brasília */
function formatarData(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  const data = d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
  return `${data} às ${hora}`
}

// ── Componente ────────────────────────────────────────────────

export default function ModalRelatorios({ isOpen, onClose, relatorios, onBaixar, onRecarregar }) {
  const overlayRef              = useRef(null)
  const [baixando, setBaixando] = useState(null)

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

  async function handleBaixar(mes) {
    setBaixando(mes)
    try {
      await onBaixar(mes)
    } finally {
      setBaixando(null)
    }
  }

  if (!isOpen) return null

  return (
    <Portal>
      <div
        ref={overlayRef}
        className="modal-overlay p-4"
        onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      >
        <div className="modal-box w-full max-w-lg max-h-[90vh] flex flex-col">

          {/* ── Header ────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 flex items-center justify-center">
                <MdPictureAsPdf className="text-brand-red" size={17} />
              </div>
              <div>
                <h2 className="font-heading text-base font-bold text-brand-text leading-tight">
                  Relatórios Mensais
                </h2>
                <p className="text-[11px] text-brand-text-3">Todos os relatórios disponíveis</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onRecarregar && (
                <button
                  onClick={onRecarregar}
                  title="Atualizar lista"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-brand-text-3
                             hover:text-brand-text hover:bg-brand-bg transition-all"
                >
                  <MdRefresh size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-brand-text-3
                           hover:text-brand-text hover:bg-brand-bg transition-all"
              >
                <MdClose size={18} />
              </button>
            </div>
          </div>

          {/* ── Body ──────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Estado vazio */}
            {relatorios.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                  <MdPictureAsPdf className="text-brand-red" size={28} />
                </div>
                <p className="font-semibold text-brand-text">Nenhum relatório disponível</p>
                <p className="text-sm text-brand-text-3 max-w-xs">
                  Os relatórios são gerados automaticamente no dia 1 de cada mês.
                </p>
              </div>
            )}

            {/* Lista de relatórios */}
            {relatorios.length > 0 && (
              <div className="space-y-3">
                {relatorios.map((r) => (
                  <div
                    key={r.mes}
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl border
                               bg-brand-surface-2 border-brand-border hover:border-brand-border-2
                               transition-colors"
                  >
                    {/* Ícone + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 flex items-center justify-center flex-shrink-0">
                        <MdPictureAsPdf className="text-brand-red" size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-text truncate">
                          {nomeMesCompleto(r.mes)}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-brand-text-3 mt-0.5">
                          <MdCalendarMonth size={11} />
                          Gerado em {formatarData(r.geradoEm)}
                        </div>
                      </div>
                    </div>

                    {/* Botão download */}
                    <button
                      onClick={() => handleBaixar(r.mes)}
                      disabled={baixando === r.mes}
                      title="Baixar relatório PDF"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                                 bg-brand-surface border border-brand-border text-brand-text-2
                                 hover:border-brand-orange/50 hover:text-brand-orange
                                 hover:bg-orange-50 dark:hover:bg-orange-950/20
                                 transition-all duration-200 active:scale-95 flex-shrink-0
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {baixando === r.mes ? (
                        <span className="w-3.5 h-3.5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <MdFileDownload size={15} />
                      )}
                      {baixando === r.mes ? 'Gerando...' : 'Baixar PDF'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────── */}
          {relatorios.length > 0 && (
            <div className="px-6 py-3 border-t border-brand-border flex-shrink-0">
              <p className="text-[11px] text-brand-text-3 text-center">
                {relatorios.length}{' '}
                {relatorios.length === 1 ? 'relatório disponível' : 'relatórios disponíveis'}
              </p>
            </div>
          )}

        </div>
      </div>
    </Portal>
  )
}
