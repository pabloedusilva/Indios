import { useState } from 'react'
import Modal from '../ui/Modal'
import { MdAdd, MdDeleteOutline } from 'react-icons/md'

export default function ModalCategoria({ isOpen, onClose, categorias, produtosPorCategoria, onAdicionar, onRemover }) {
  const [novaCategoria, setNovaCategoria] = useState('')
  const [erro, setErro] = useState('')

  const handleAdicionar = () => {
    const nome = novaCategoria.trim()
    if (!nome) return
    if (categorias.map((c) => c.toLowerCase()).includes(nome.toLowerCase())) {
      setErro('Já existe uma categoria com esse nome.')
      return
    }
    onAdicionar(nome)
    setNovaCategoria('')
    setErro('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdicionar()
    if (e.key === 'Escape') onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Categorias" size="sm">
      <div className="p-6 space-y-5">

        {/* Adicionar */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-brand-text-2 uppercase tracking-wider">
            Nova Categoria
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={novaCategoria}
              onChange={(e) => { setNovaCategoria(e.target.value); setErro('') }}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Sobremesas, Combos..."
              className="input-field flex-1"
              autoFocus
            />
            <button
              onClick={handleAdicionar}
              disabled={!novaCategoria.trim()}
              className="btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            >
              <MdAdd size={18} />
            </button>
          </div>
          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        {/* Lista */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-brand-text-2 uppercase tracking-wider">
            Categorias Existentes
          </label>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {categorias.length === 0 ? (
              <p className="text-sm text-brand-text-3 text-center py-4">Nenhuma categoria criada.</p>
            ) : (
              categorias.map((cat) => {
                const count = produtosPorCategoria[cat] ?? 0
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl
                               bg-brand-bg border border-brand-border group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm font-semibold text-brand-text truncate">{cat}</span>
                      <span className="text-xs text-brand-text-3 flex-shrink-0">
                        {count} produto{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemover(cat)}
                      disabled={count > 0}
                      title={count > 0 ? 'Remova os produtos para excluir esta categoria' : 'Excluir categoria'}
                      className="flex-shrink-0 ml-2 w-7 h-7 rounded-lg flex items-center justify-center
                                 text-brand-text-3 hover:text-red-500 hover:bg-red-500/10
                                 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                                 disabled:hover:text-brand-text-3 disabled:hover:bg-transparent"
                    >
                      <MdDeleteOutline size={16} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </Modal>
  )
}
