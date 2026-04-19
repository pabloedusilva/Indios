import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { formatarMoeda } from '../../utils/formatters'

const valoresIniciais = {
  nome: '',
  categoria: '',
  preco: '',
  disponivel: true,
}

export default function ModalProduto({ isOpen, onClose, produtoEditando, onSalvar, categorias = [] }) {
  const [form, setForm] = useState(valoresIniciais)
  const [errors, setErrors] = useState({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (produtoEditando) {
      setForm({
        nome: produtoEditando.nome,
        categoria: produtoEditando.categoria,
        preco: String(produtoEditando.preco),
        disponivel: produtoEditando.disponivel,
      })
    } else {
      setForm({ ...valoresIniciais, categoria: categorias[0] ?? '' })
    }
    setErrors({})
    setSalvando(false)
  }, [produtoEditando, isOpen])

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (!form.preco || isNaN(parseFloat(form.preco)) || parseFloat(form.preco) <= 0)
      e.preco = 'Preço inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSalvar = async () => {
    if (!validar()) return
    setSalvando(true)
    try {
      await onSalvar({
        nome: form.nome.trim(),
        categoria: form.categoria,
        preco: parseFloat(form.preco),
        disponivel: form.disponivel,
      })
      onClose()
    } catch {
      // erro exibido pelo AppContext via toast
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={produtoEditando ? 'Editar Produto' : 'Novo Produto'}
      size="md"
    >
      <div className="p-6 space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-xs font-semibold text-brand-text-2 mb-1.5 uppercase tracking-wider">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            placeholder="Ex: Espetinho de Picanha"
            className={`input-field ${errors.nome ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
            autoFocus
          />
          {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
        </div>

        {/* Categoria + Preço */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-text-2 mb-1.5 uppercase tracking-wider">Categoria</label>
            <select
              value={form.categoria}
              onChange={(e) => set('categoria', e.target.value)}
              className="input-field"
            >
              {categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-text-2 mb-1.5 uppercase tracking-wider">Preço (R$) *</label>
            <input
              type="number"
              value={form.preco}
              onChange={(e) => set('preco', e.target.value)}
              placeholder="0,00"
              min="0"
              step="0.50"
              className={`input-field ${errors.preco ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
            />
            {errors.preco && <p className="text-red-500 text-xs mt-1">{errors.preco}</p>}
          </div>
        </div>

        {/* Disponível */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-brand-bg border border-brand-border">
          <div>
            <p className="text-sm font-semibold text-brand-text">Disponível para venda</p>
            <p className="text-xs text-brand-text-3 mt-0.5">Produtos indisponíveis não aparecem nos pedidos</p>
          </div>
          <button
            type="button"
            onClick={() => set('disponivel', !form.disponivel)}
            className={`relative w-10 h-6 rounded-full transition-all duration-300 flex-shrink-0
              ${form.disponivel ? 'bg-gradient-brand' : 'bg-brand-border-2'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300
              ${form.disponivel ? 'translate-x-4' : 'translate-x-0'}`}
            />
          </button>
        </div>

        {/* Prévia */}
        {form.nome && form.preco && (
          <div className={`rounded-xl border p-3.5 flex items-center justify-between transition-all duration-300 ${
            form.disponivel
              ? 'border-brand-orange/30 bg-orange-50 dark:bg-orange-950/30'
              : 'border-brand-border bg-brand-surface-2 opacity-50 grayscale'
          }`}>
            <div>
              <p className={`font-semibold text-sm ${form.disponivel ? 'text-brand-text' : 'text-brand-text-3'}`}>{form.nome}</p>
              <p className="text-xs text-brand-text-3">{form.categoria}</p>
            </div>
            <p className={`font-bold ${form.disponivel ? 'text-brand-orange' : 'text-brand-text-3'}`}>{formatarMoeda(parseFloat(form.preco) || 0)}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} disabled={salvando} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSalvar} disabled={salvando} className="btn-primary flex-1 disabled:opacity-60 disabled:cursor-not-allowed">
            {salvando ? 'Salvando...' : produtoEditando ? 'Salvar Alterações' : 'Adicionar Produto'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
