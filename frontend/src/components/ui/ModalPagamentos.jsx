// =============================================================
//  components/ui/ModalPagamentos.jsx — Histórico de Pagamentos
//
//  Exibe todos os pagamentos aprovados do servidor, organizados
//  por mês, com botão para baixar o comprovante em PDF.
//
//  Segurança:
//    · Apenas pagamentos aprovados são exibidos
//    · O comprovante é gerado no backend com autenticação
//    · Nenhum dado sensível é exposto no frontend
// =============================================================

import { useState, useEffect, useRef } from 'react'
import {
  MdClose, MdPayment, MdFileDownload, MdCheckCircle,
  MdCalendarMonth, MdRefresh, MdReceipt,
} from 'react-icons/md'
import { api } from '../../services/api'
import { formatarMoeda } from '../../utils/formatters'

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function nomeMesCompleto(mesStr) {
  if (!mesStr) return ''
  const [ano, m] = mesStr.split('-')
  return `${MESES_PT[parseInt(m, 10) - 1] || m} de ${ano}`
}

function formatarDataHora(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export default function ModalPagamentos({ isOpen, onClose }) {
  const overlayRef              = useRef(null)
  const [pagamentos, setPagamentos] = useState([])
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState(null)
  const [baixando, setBaixando] = useState(null) // id do pagamento sendo baixado

  // Carregar histórico ao abrir
  useEffect(() => {
    if (!isOpen) return
    carregarHistorico()
  }, [isOpen])

  // Fechar com Escape
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

  async function carregarHistorico() {
    setLoading(true)
    setErro(null)
    try {
      const data = await api.get('/pagamentos/historico')
      setPagamentos(data)
    } catch (err) {
      setErro(err.message || 'Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }

  async function baixarComprovante(pagamento) {
    setBaixando(pagamento.id)
    try {
      // Faz o download via fetch com credenciais (cookie de auth)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
      const response = await fetch(`${API_URL}/api/pagamentos/comprovante/${pagamento.id}`, {
        method:      'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar comprovante')
      }

      const blob     = await response.blob()
      const url      = URL.createObjectURL(blob)
      const link     = document.createElement('a')
      link.href      = url
      link.download  = `comprovante-${pagamento.mesReferencia}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err.message || 'Erro ao baixar comprovante')
    } finally {
      setBaixando(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      className="modal-overlay p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="modal-box w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center">
              <MdPayment className="text-brand-orange" size={17} />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-brand-text leading-tight">
                Pagamentos do Servidor
              </h2>
              <p className="text-[11px] text-brand-text-3">Histórico de mensalidades aprovadas</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={carregarHistorico}
              disabled={loading}
              title="Atualizar"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-brand-text-3
                         hover:text-brand-text hover:bg-brand-bg transition-all disabled:opacity-40"
            >
              <MdRefresh size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-brand-text-3
                         hover:text-brand-text hover:bg-brand-bg transition-all"
            >
              <MdClose size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-brand-text-3">Carregando pagamentos...</p>
            </div>
          )}

          {/* Erro */}
          {!loading && erro && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <MdPayment className="text-red-500" size={24} />
              </div>
              <p className="text-sm text-brand-text-2">{erro}</p>
              <button onClick={carregarHistorico} className="btn-primary px-4 py-2 text-sm gap-1.5">
                <MdRefresh size={15} /> Tentar novamente
              </button>
            </div>
          )}

          {/* Vazio */}
          {!loading && !erro && pagamentos.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                <MdReceipt className="text-brand-orange" size={28} />
              </div>
              <p className="font-semibold text-brand-text">Nenhum pagamento registrado</p>
              <p className="text-sm text-brand-text-3 max-w-xs">
                Os pagamentos aprovados aparecerão aqui após a confirmação do PIX.
              </p>
            </div>
          )}

          {/* Lista de pagamentos */}
          {!loading && !erro && pagamentos.length > 0 && (
            <div className="space-y-3">
              {pagamentos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-4 p-4 bg-brand-surface-2 rounded-2xl border border-brand-border hover:border-brand-border-2 transition-colors"
                >
                  {/* Ícone + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center flex-shrink-0">
                      <MdCheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-text truncate">
                        {nomeMesCompleto(p.mesReferencia)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-brand-orange">
                          {formatarMoeda(p.valor)}
                        </span>
                        <span className="text-brand-border-2">·</span>
                        <div className="flex items-center gap-1 text-[11px] text-brand-text-3">
                          <MdCalendarMonth size={11} />
                          {formatarDataHora(p.dataPagamento)}
                        </div>
                      </div>
                      <p className="text-[10px] text-brand-text-3 mt-0.5 font-mono truncate">
                        ID: {p.mercadoPagoId}
                      </p>
                    </div>
                  </div>

                  {/* Botão comprovante */}
                  <button
                    onClick={() => baixarComprovante(p)}
                    disabled={baixando === p.id}
                    title="Baixar comprovante PDF"
                    className="
                      flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                      bg-brand-surface border border-brand-border text-brand-text-2
                      hover:border-brand-orange/50 hover:text-brand-orange hover:bg-orange-50 dark:hover:bg-orange-950/20
                      transition-all duration-200 active:scale-95 flex-shrink-0
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {baixando === p.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MdFileDownload size={15} />
                    )}
                    {baixando === p.id ? 'Gerando...' : 'Comprovante'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        {!loading && !erro && pagamentos.length > 0 && (
          <div className="px-6 py-3 border-t border-brand-border flex-shrink-0">
            <p className="text-[11px] text-brand-text-3 text-center">
              {pagamentos.length} {pagamentos.length === 1 ? 'pagamento aprovado' : 'pagamentos aprovados'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
