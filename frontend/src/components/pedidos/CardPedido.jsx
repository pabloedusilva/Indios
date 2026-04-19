import { useState } from 'react'
import { useApp } from '../../contexts/AppContext'
import StatusBadge from '../ui/StatusBadge'
import ConfirmDialog from '../ui/ConfirmDialog'
import ModalPedido from './ModalPedido'
import ModalPagamento from './ModalPagamento'
import { formatarMoeda, formatarHora } from '../../utils/formatters'
import {
  MdVisibility, MdCancel, MdKitchen, MdPayment,
  MdMoreVert, MdAccessTime,
} from 'react-icons/md'

const accentMap = {
  preparando: 'border-l-amber-400',
  pronto:     'border-l-emerald-400',
  finalizado: 'border-l-brand-border-2 opacity-60',
  cancelado: 'border-l-red-300 opacity-50',
}

export default function CardPedido({ pedido }) {
  const { marcarPronto, cancelarPedido } = useApp()
  const [showPedido, setShowPedido] = useState(false)
  const [showPagamento, setShowPagamento] = useState(false)
  const [showConfirmCancelar, setShowConfirmCancelar] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)

  const isAtivo = pedido.status === 'preparando' || pedido.status === 'pronto'
  const accent = accentMap[pedido.status] ?? 'border-l-brand-border-2'

  return (
    <>
      <div className={`bg-brand-surface rounded-2xl border border-brand-border border-l-4 ${accent} shadow-card flex flex-col transition-all duration-200`}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-brand-text text-base truncate">{pedido.nomeCliente}</p>
                <span className="text-xs font-mono font-semibold text-brand-text-3 flex-shrink-0">
                  #{String(pedido.numero).padStart(3, '0')}
                </span>
              </div>
              <p className="text-[11px] text-brand-text-3 flex items-center gap-1 mt-0.5">
                <MdAccessTime size={11} />
                {formatarHora(pedido.criadoEm)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <StatusBadge status={pedido.status} />
            {isAtivo && (
              <div className="relative">
                <button
                  onClick={() => setMenuAberto(!menuAberto)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-text-3 hover:text-brand-text hover:bg-brand-bg transition-all"
                >
                  <MdMoreVert size={16} />
                </button>
                {menuAberto && (
                  <div className="absolute right-0 top-8 z-20 bg-brand-surface border border-brand-border rounded-xl shadow-card-hover py-1 w-40 animate-fade-in">
                    <button
                      onClick={() => { setShowPedido(true); setMenuAberto(false) }}
                      className="w-full text-left px-3 py-2 text-xs text-brand-text-2 hover:text-brand-text hover:bg-brand-bg flex items-center gap-2 transition-colors"
                    >
                      <MdVisibility size={14} /> Ver Pedido
                    </button>
                    <button
                      onClick={() => { setShowConfirmCancelar(true); setMenuAberto(false) }}
                      className="w-full text-left px-3 py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                    >
                      <MdCancel size={14} /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Itens */}
        <div className="px-4 pb-3 space-y-1.5">
          {pedido.itens.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <span className="text-brand-text-2">
                <span className="font-semibold text-brand-text">{item.quantidade}×</span> {item.nomeProduto}
              </span>
              <span className="text-brand-text-3 flex-shrink-0 ml-2">
                {formatarMoeda(item.quantidade * item.precoUnitario)}
              </span>
            </div>
          ))}
          {pedido.observacoes && (
            <p className="text-[11px] text-amber-600 italic pt-0.5">Obs: {pedido.observacoes}</p>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center mx-4 py-2.5 border-t border-brand-border mt-auto">
          <span className="text-xs font-medium text-brand-text-3">Total</span>
          <span className="text-sm font-bold text-brand-orange">{formatarMoeda(pedido.total)}</span>
        </div>

        {/* Ações */}
        <div className="px-4 pb-4">
          {pedido.status === 'preparando' && (
            <button onClick={() => marcarPronto(pedido.id)} className="btn-primary w-full py-2.5">
              <MdKitchen size={15} /> Marcar Pronto
            </button>
          )}
          {pedido.status === 'pronto' && (
            <div className="flex gap-2">
              <button onClick={() => setShowPagamento(true)} className="btn-success flex-1 py-2.5 font-bold tracking-wide">
                <MdPayment size={16} /> Finalizar
              </button>
              <button onClick={() => setShowPedido(true)} className="btn-secondary px-3 py-2.5">
                <MdVisibility size={15} />
              </button>
            </div>
          )}
          {!isAtivo && (
            <button onClick={() => setShowPedido(true)} className="btn-secondary w-full py-2.5">
              <MdPrint size={15} /> Ver Pedido
            </button>
          )}
        </div>
      </div>

      <ModalPedido isOpen={showPedido} onClose={() => setShowPedido(false)} pedido={pedido} />
      <ModalPagamento isOpen={showPagamento} onClose={() => setShowPagamento(false)} pedido={pedido} />
      <ConfirmDialog
        isOpen={showConfirmCancelar}
        title="Cancelar Pedido"
        message={`Cancelar o pedido de "${pedido.nomeCliente}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Cancelar Pedido"
        danger
        onConfirm={() => { cancelarPedido(pedido.id); setShowConfirmCancelar(false) }}
        onCancel={() => setShowConfirmCancelar(false)}
      />
    </>
  )
}
