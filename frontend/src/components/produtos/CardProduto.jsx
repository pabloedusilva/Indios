import { useState } from 'react'
import { useApp } from '../../contexts/AppContext'
import { formatarMoeda } from '../../utils/formatters'
import ConfirmDialog from '../ui/ConfirmDialog'
import { MdEdit, MdDelete, MdVisibility, MdVisibilityOff } from 'react-icons/md'

export default function CardProduto({ produto, onEditar }) {
  const { removerProduto, toggleDisponibilidadeProduto } = useApp()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <div className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-200 bg-brand-surface
        ${produto.disponivel ? 'border-brand-border hover:border-brand-orange/40 hover:shadow-card' : 'border-brand-border opacity-55'}
      `}>
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm leading-tight ${produto.disponivel ? 'text-brand-text' : 'text-brand-text-3'}`}>
              {produto.nome}
            </p>
            <span className="text-xs text-brand-text-3 mt-0.5 block">{produto.categoria}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => toggleDisponibilidadeProduto(produto.id)}
              title={produto.disponivel ? 'Tornar indisponível' : 'Tornar disponível'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all
                ${produto.disponivel
                  ? 'text-emerald-500 hover:bg-emerald-500/10'
                  : 'text-brand-text-3 hover:bg-brand-bg'
                }`}
            >
              {produto.disponivel ? <MdVisibility size={15} /> : <MdVisibilityOff size={15} />}
            </button>
            <button
              onClick={() => onEditar(produto)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-text-3
                         hover:text-brand-orange hover:bg-brand-orange/10 transition-all"
            >
              <MdEdit size={15} />
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-text-3
                         hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
              <MdDelete size={15} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-1 border-t border-brand-border">
          <span className="text-brand-orange font-bold text-base">{formatarMoeda(produto.preco)}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
            ${produto.disponivel ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-500'}`}
          >
            {produto.disponivel ? 'Disponível' : 'Indisponível'}
          </span>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Remover Produto"
        message={`Remover "${produto.nome}" do cardápio?`}
        confirmLabel="Remover"
        danger
        onConfirm={() => { removerProduto(produto.id); setShowConfirm(false) }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
