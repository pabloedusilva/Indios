import { useState, useMemo } from 'react'
import Modal from '../ui/Modal'
import { formatarMoeda } from '../../utils/formatters'
import { useApp } from '../../contexts/AppContext'
import {
  MdQrCode2, MdCreditCard, MdCreditScore, MdAttachMoney,
  MdCheckCircle, MdPerson,
} from 'react-icons/md'

// ── Formas de pagamento disponíveis ───────────────────────────
const FORMAS_PAGAMENTO = [
  { id: 'pix',      label: 'PIX',     icon: MdQrCode2      },
  { id: 'credito',  label: 'Crédito', icon: MdCreditCard   },
  { id: 'debito',   label: 'Débito',  icon: MdCreditScore  },
  { id: 'dinheiro', label: 'Dinheiro',icon: MdAttachMoney  },
]

export default function ModalPagamento({ isOpen, onClose, pedido }) {
  const { finalizarPedido } = useApp()

  const [formaPagamento, setFormaPagamento] = useState(null)
  const [valorRecebido, setValorRecebido]   = useState('')
  const [salvando, setSalvando]             = useState(false)

  // ── Derivados ─────────────────────────────────────────────
  const valorFloat = useMemo(
    () => parseFloat(String(valorRecebido).replace(',', '.')) || 0,
    [valorRecebido],
  )

  const troco = useMemo(() => {
    if (formaPagamento !== 'dinheiro') return 0
    return Math.max(0, valorFloat - (pedido?.total ?? 0))
  }, [formaPagamento, valorFloat, pedido?.total])

  const valorInsuficiente = useMemo(
    () => formaPagamento === 'dinheiro' && valorRecebido !== '' && valorFloat < (pedido?.total ?? 0),
    [formaPagamento, valorFloat, valorRecebido, pedido?.total],
  )

  const podeConfirmar = useMemo(() => {
    if (!formaPagamento) return false
    if (formaPagamento === 'dinheiro') return valorFloat >= (pedido?.total ?? 0)
    return true
  }, [formaPagamento, valorFloat, pedido?.total])

  if (!pedido) return null

  // ── Handlers ──────────────────────────────────────────────
  const resetar = () => {
    setFormaPagamento(null)
    setValorRecebido('')
    setSalvando(false)
  }

  const handleClose = () => {
    resetar()
    onClose()
  }

  const handleSelecionarForma = (id) => {
    setFormaPagamento(id)
    setValorRecebido('')
  }

  const handleConfirmar = async () => {
    const recebido = formaPagamento === 'dinheiro' ? valorFloat : pedido.total
    setSalvando(true)
    try {
      await finalizarPedido(pedido.id, {
        formaPagamento,
        valorRecebido: recebido,
        troco: formaPagamento === 'dinheiro' ? troco : 0,
      })
      resetar()
      onClose()
    } catch {
      // toast exibido pelo AppContext
      setSalvando(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Finalizar Pedido" size="md">
      <div className="p-6 flex flex-col gap-5">

        {/* Resumo do pedido */}
        <div className="bg-brand-bg rounded-2xl border border-brand-border overflow-hidden">
          {/* Cabeçalho cliente */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-brand-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                <MdPerson className="text-brand-orange" size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-brand-text text-base truncate">{pedido.nomeCliente}</p>
                <p className="text-xs text-brand-text-3 mt-0.5">
                  {pedido.itens.length} item{pedido.itens.length !== 1 ? 'ns' : ''}
                </p>
              </div>
            </div>
            <span className="font-bold text-brand-text text-base flex-shrink-0">
              #{String(pedido.numero).padStart(3, '0')}
            </span>
          </div>

          {/* Itens */}
          <div className="divide-y divide-brand-border">
            {pedido.itens.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-xs">
                <span className="text-brand-text-2">
                  <span className="font-semibold text-brand-text">{item.quantidade}×</span> {item.nomeProduto}
                </span>
                <span className="text-brand-text-3 tabular-nums flex-shrink-0 ml-3">
                  {formatarMoeda(item.quantidade * item.precoUnitario)}
                </span>
              </div>
            ))}
            {pedido.observacoes && (
              <p className="px-4 py-2.5 text-[11px] text-amber-600 italic">Obs: {pedido.observacoes}</p>
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-end px-4 py-3 border-t border-brand-border">
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-text-3 mb-0.5">Total</p>
              <p className="text-2xl font-bold font-heading text-brand-orange leading-none">
                {formatarMoeda(pedido.total)}
              </p>
            </div>
          </div>
        </div>

        {/* Seleção de forma de pagamento */}
        <div>
          <p className="text-sm font-semibold text-brand-text mb-3">Forma de Pagamento</p>
          <div className="grid grid-cols-2 gap-2.5">
            {FORMAS_PAGAMENTO.map(({ id, label, icon: Icon }) => {
              const selecionado = formaPagamento === id
              return (
                <button
                  key={id}
                  onClick={() => handleSelecionarForma(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-semibold text-sm
                    transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50
                    ${selecionado
                      ? 'border-brand-orange bg-orange-50 dark:bg-orange-950/40 text-brand-orange shadow-brand'
                      : 'border-brand-border bg-brand-surface text-brand-text-2 hover:border-brand-orange/40 hover:text-brand-text'
                    }`}
                >
                  <Icon size={26} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Campo de valor recebido — visível apenas para Dinheiro */}
        {formaPagamento === 'dinheiro' && (
          <div className="space-y-3 animate-fade-in">
            <div>
              <label htmlFor="valor-recebido" className="block text-sm font-semibold text-brand-text mb-1.5">
                Valor Recebido
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-3 font-semibold text-sm select-none">
                  R$
                </span>
                <input
                  id="valor-recebido"
                  type="number"
                  min={pedido.total}
                  step="0.01"
                  placeholder="0,00"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  className="input-field w-full pl-10"
                  autoFocus
                />
              </div>
            </div>

            {/* Troco / aviso de valor insuficiente */}
            {valorRecebido !== '' && (
              <div
                className={`rounded-xl p-3.5 flex items-center justify-between border animate-fade-in
                  ${valorInsuficiente
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}
              >
                <span className={`text-sm font-semibold ${valorInsuficiente ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {valorInsuficiente ? 'Valor insuficiente' : 'Troco'}
                </span>
                <span className={`text-xl font-bold font-heading ${valorInsuficiente ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {valorInsuficiente
                    ? `– ${formatarMoeda((pedido.total) - valorFloat)}`
                    : formatarMoeda(troco)
                  }
                </span>
              </div>
            )}
          </div>
        )}

        {/* Botão de confirmação */}
        <button
          onClick={handleConfirmar}
          disabled={!podeConfirmar || salvando}
          className="btn-success w-full py-3 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <MdCheckCircle size={20} />
          {salvando ? 'Finalizando...' : 'Finalizar Pedido'}
        </button>

      </div>
    </Modal>
  )
}
