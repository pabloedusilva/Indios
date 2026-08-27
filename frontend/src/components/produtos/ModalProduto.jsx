import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { formatarMoeda } from '../../utils/formatters'
import { useApp } from '../../contexts/AppContext'

const valoresIniciais = {
  nome: '',
  categoriaId: '',
  preco: '',
  ncm: '',
  disponivel: true,
}

export default function ModalProduto({ isOpen, onClose, produtoEditando, onSalvar, categorias = [] }) {
  const { categoriasCompletas } = useApp()
  const [form, setForm] = useState(valoresIniciais)
  const [errors, setErrors] = useState({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (produtoEditando) {
      setForm({
        nome: produtoEditando.nome,
        categoriaId: produtoEditando.categoriaId || '',
        preco: String(produtoEditando.preco),
        // Remove pontos e espaços do NCM ao carregar para edição
        ncm: (produtoEditando.ncm || '').replace(/\D/g, ''),
        disponivel: produtoEditando.disponivel,
      })
    } else {
      // Pega o ID da primeira categoria disponível
      const primeiraCategoria = categoriasCompletas?.[0]
      setForm({ 
        ...valoresIniciais, 
        categoriaId: primeiraCategoria?.id || '' 
      })
    }
    setErrors({})
    setSalvando(false)
  }, [produtoEditando, isOpen, categoriasCompletas])

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }))
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (!form.preco || isNaN(parseFloat(form.preco)) || parseFloat(form.preco) <= 0)
      e.preco = 'Preço inválido'
    if (!form.ncm.trim()) e.ncm = 'NCM obrigatório'
    else if (!/^\d{8}$/.test(form.ncm.replace(/\D/g, ''))) e.ncm = 'NCM deve ter 8 dígitos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSalvar = async () => {
    if (!validar()) return
    setSalvando(true)
    try {
      await onSalvar({
        nome: form.nome.trim(),
        categoriaId: form.categoriaId ? parseInt(form.categoriaId) : null,
        preco: parseFloat(form.preco),
        ncm: form.ncm.replace(/\D/g, ''),
        disponivel: form.disponivel,
      })
      onClose()
    } catch {
      // erro exibido pelo AppContext via toast
    } finally {
      setSalvando(false)
    }
  }

  // Encontra o nome da categoria selecionada para exibição
  const categoriaSelecionada = categoriasCompletas?.find(c => c.id === parseInt(form.categoriaId))

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

        {/* NCM */}
        <div>
          <label className="block text-xs font-semibold text-brand-text-2 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            NCM *
            <div className="relative group">
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[10px] text-brand-text-3 border border-brand-border-2 rounded-full cursor-help">ℹ</span>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-2.5 bg-brand-surface border border-brand-border rounded-lg shadow-lg text-xs text-brand-text-2 leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                Se não tiver o número do NCM do novo produto, peça o contador para gerar enviando o nome do novo produto
              </div>
            </div>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form.ncm}
            onChange={(e) => {
              // Remove tudo que não é número e limita a 8 dígitos
              const valor = e.target.value.replace(/\D/g, '').slice(0, 8)
              set('ncm', valor)
            }}
            onPaste={(e) => {
              // Permite colar e limpa automaticamente
              e.preventDefault()
              const texto = e.clipboardData.getData('text')
              const valor = texto.replace(/\D/g, '').slice(0, 8)
              set('ncm', valor)
            }}
            placeholder="Ex: 02109900"
            maxLength="8"
            className={`input-field font-mono ${errors.ncm ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
          />
          {errors.ncm && <p className="text-red-500 text-xs mt-1">{errors.ncm}</p>}
          <p className="text-xs text-brand-text-3 mt-1">Apenas 8 dígitos numéricos (sem pontos ou espaços)</p>
        </div>

        {/* Categoria + Preço */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-text-2 mb-1.5 uppercase tracking-wider">Categoria</label>
            <select
              value={form.categoriaId || ''}
              onChange={(e) => set('categoriaId', e.target.value)}
              className="input-field"
            >
              {categoriasCompletas?.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
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
              <p className="text-xs text-brand-text-3">{categoriaSelecionada?.nome || 'Sem categoria'}</p>
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
