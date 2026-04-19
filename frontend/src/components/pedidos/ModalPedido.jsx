import { useRef, useState } from 'react'
import Modal from '../ui/Modal'
import CupomTermico from './CupomTermico'
import ComandaCozinha from './ComandaCozinha'
import ModalPagamento from './ModalPagamento'
import StatusBadge from '../ui/StatusBadge'
import {
  MdPrint, MdCheck, MdRestaurant, MdReceipt,
  MdPerson, MdAccessTime, MdPayment,
} from 'react-icons/md'
import { formatarMoeda, formatarHora, formatarData } from '../../utils/formatters'

const ABAS = [
  { id: 'comanda', label: 'Comanda de Cozinha', icon: MdRestaurant },
  { id: 'cupom',   label: 'Cupom do Cliente',   icon: MdReceipt },
]

export default function ModalPedido({ isOpen, onClose, pedido }) {
  const cupomRef   = useRef(null)
  const comandaRef = useRef(null)
  const [abaAtiva, setAbaAtiva]       = useState('comanda')
  const [showPagamento, setShowPagamento] = useState(false)

  if (!pedido) return null

  const imprimir = (ref, titulo) => {
    const conteudo = ref.current?.innerHTML
    if (!conteudo) return
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8"/>
    <title>${titulo} — Pedido #${pedido.numero}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 2mm 4mm; size: 80mm auto; }
    </style>
  </head>
  <body>${conteudo}</body>
</html>`
    const blob   = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url    = URL.createObjectURL(blob)
    const janela = window.open(url, '_blank', 'width=420,height=720')
    if (!janela) return
    janela.addEventListener('load', () => {
      setTimeout(() => { janela.print(); URL.revokeObjectURL(url) }, 300)
    })
  }

  const pagamento = {
    pix: 'PIX', credito: 'Cartão de Crédito',
    debito: 'Cartão de Débito', dinheiro: 'Dinheiro',
  }[pedido.formaPagamento] ?? pedido.formaPagamento

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Pedido #${String(pedido.numero).padStart(4, '0')}`} size="lg">
      <div className="flex flex-col divide-y divide-brand-border">

        {/* ── Resumo do pedido ── */}
        <div className="p-6">
          <div className="bg-brand-bg rounded-2xl overflow-hidden border border-brand-border">

            {/* Cabeçalho: cliente + badge */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-brand-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <MdPerson className="text-brand-orange" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-brand-text text-base leading-tight truncate">{pedido.nomeCliente}</p>
                  <p className="text-xs text-brand-text-3 flex items-center gap-1 mt-0.5">
                    <MdAccessTime size={11} />
                    {formatarData(pedido.criadoEm)} · {formatarHora(pedido.criadoEm)}
                    <span>·</span>
                    {pedido.itens.length} item{pedido.itens.length !== 1 ? 'ns' : ''}
                  </p>
                </div>
              </div>
              <StatusBadge status={pedido.status} />
            </div>

            {/* Itens */}
            {pedido.itens.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-xs border-b border-brand-border last:border-b-0">
                <span className="text-brand-text-2">
                  <span className="font-semibold text-brand-text">{item.quantidade}×</span>{' '}{item.nomeProduto}
                </span>
                <span className="text-brand-text-3 tabular-nums flex-shrink-0 ml-3">
                  {formatarMoeda(item.quantidade * item.precoUnitario)}
                </span>
              </div>
            ))}
            {pedido.observacoes && (
              <p className="px-4 py-2.5 text-[11px] text-amber-600 italic border-t border-brand-border">
                Obs: {pedido.observacoes}
              </p>
            )}

            {/* Rodapé: pagamento + total */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border">
              <div className="flex items-center gap-1.5 text-xs text-brand-text-3">
                {pedido.formaPagamento && (
                  <>
                    <MdPayment size={13} className="text-brand-orange" />
                    <span className="font-medium text-brand-text-2">{pagamento}</span>
                    {pedido.formaPagamento === 'dinheiro' && pedido.troco > 0 && (
                      <span>· Troco: {formatarMoeda(pedido.troco)}</span>
                    )}
                  </>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-text-3 mb-0.5">Total</p>
                <p className="text-2xl font-bold font-heading text-brand-orange leading-none">{formatarMoeda(pedido.total)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Impressão ── */}
        <div className="p-6 space-y-4">

          {/* Abas */}
          <div className="flex gap-1 p-1 bg-brand-bg border border-brand-border rounded-xl">
            {ABAS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAbaAtiva(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                  ${abaAtiva === id
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'text-brand-text-2 hover:text-brand-text hover:bg-brand-surface'
                  }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Prévia */}
          <div className="flex justify-center border border-brand-border rounded-xl p-4 bg-brand-bg overflow-auto" style={{ maxHeight: '320px' }}>
            <div style={{ transform: 'scale(0.72)', transformOrigin: 'top center', marginBottom: '-72px' }}>
              {abaAtiva === 'comanda'
                ? <ComandaCozinha ref={comandaRef} pedido={pedido} />
                : <CupomTermico   ref={cupomRef}   pedido={pedido} />
              }
            </div>
          </div>

          {/* Botão de impressão */}
          <button
            onClick={() => abaAtiva === 'comanda'
              ? imprimir(comandaRef, 'Comanda')
              : imprimir(cupomRef,   'Cupom')
            }
            className="btn-primary w-full py-3"
          >
            <MdPrint size={18} />
            {abaAtiva === 'comanda' ? 'Imprimir Comanda' : 'Imprimir Cupom'}
          </button>
        </div>

        {/* ── Finalizar (status = pronto) ── */}
        {pedido.status === 'pronto' && (
          <div className="p-6">
            <button
              onClick={() => setShowPagamento(true)}
              className="btn-success w-full py-3 font-bold tracking-wide"
            >
              <MdCheck size={18} /> Finalizar Pedido
            </button>
          </div>
        )}

      </div>

      <ModalPagamento
        isOpen={showPagamento}
        onClose={() => { setShowPagamento(false); onClose() }}
        pedido={pedido}
      />
    </Modal>
  )
}

