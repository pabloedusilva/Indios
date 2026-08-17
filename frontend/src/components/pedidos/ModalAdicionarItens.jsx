import { useState, useMemo } from 'react'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useApp } from '../../contexts/AppContext'
import { formatarMoeda, calcularTotalItens } from '../../utils/formatters'
import {
  MdAdd, MdRemove, MdSearch, MdDelete,
  MdShoppingCart, MdCheck, MdEdit,
} from 'react-icons/md'

export default function ModalAdicionarItens({ isOpen, onClose, pedido }) {
  const { produtos, adicionarItensPedido } = useApp()

  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos')
  const [itens, setItens] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [confirmFechar, setConfirmFechar] = useState(false)

  const produtosDisponiveis = produtos.filter((p) => p.disponivel)

  const categorias = useMemo(() => {
    const cats = [...new Set(produtosDisponiveis.map((p) => p.categoria))]
    return ['Todos', ...cats]
  }, [produtosDisponiveis])

  const produtosFiltrados = useMemo(() => {
    return produtosDisponiveis.filter((p) => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
      const matchCat = categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva
      return matchBusca && matchCat
    })
  }, [produtosDisponiveis, busca, categoriaAtiva])

  const total = useMemo(() => calcularTotalItens(itens), [itens])

  const quantidadeNoCarrinho = (produtoId) => {
    const item = itens.find((i) => i.produtoId === produtoId)
    return item ? item.quantidade : 0
  }

  const adicionarItem = (produto) => {
    setItens((prev) => {
      const existente = prev.find((i) => i.produtoId === produto.id)
      if (existente) {
        return prev.map((i) =>
          i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      }
      return [...prev, {
        produtoId: produto.id,
        nomeProduto: produto.nome,
        quantidade: 1,
        precoUnitario: produto.preco,
      }]
    })
  }

  const removerItem = (produtoId) => {
    setItens((prev) => {
      const existente = prev.find((i) => i.produtoId === produtoId)
      if (!existente) return prev
      if (existente.quantidade === 1) return prev.filter((i) => i.produtoId !== produtoId)
      return prev.map((i) =>
        i.produtoId === produtoId ? { ...i, quantidade: i.quantidade - 1 } : i
      )
    })
  }

  const excluirItem = (produtoId) => {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId))
  }

  const handleFechar = () => {
    setBusca('')
    setCategoriaAtiva('Todos')
    setItens([])
    setConfirmFechar(false)
    onClose()
  }

  const tentarFechar = () => {
    if (itens.length === 0) {
      handleFechar()
    } else {
      setConfirmFechar(true)
    }
  }

  const handleConfirmar = async () => {
    if (itens.length === 0) return
    
    setSalvando(true)
    try {
      await adicionarItensPedido(pedido.id, itens)
      handleFechar()
    } catch {
      // toast exibido pelo AppContext
    } finally {
      setSalvando(false)
    }
  }

  if (!pedido) return null

  return (
    <>
      <Modal isOpen={isOpen} onClose={tentarFechar} title={`Adicionar Itens — Pedido #${pedido.numero}`} fullscreen>
        <div className="flex flex-col lg:flex-row h-full">

          {/* ═══════════════════ PAINEL PRINCIPAL ═══════════════════ */}
          <div className="flex-1 flex flex-col min-h-0 bg-brand-bg">
            
            {/* Header com informações do pedido */}
            <div className="px-5 py-3 border-b border-brand-border bg-brand-surface flex-shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <MdEdit className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={16} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-brand-text truncate">{pedido.nomeCliente}</p>
                    <p className="text-[10px] text-brand-text-3">Total: {formatarMoeda(pedido.total)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex-shrink-0">
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Editando</span>
                </div>
              </div>
            </div>

            {/* Busca + categorias */}
            <div className="px-5 py-4 border-b border-brand-border bg-brand-surface space-y-3 flex-shrink-0">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-3" size={17} />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produto..."
                  className="input-field pl-10"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaAtiva(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
                      ${categoriaAtiva === cat
                        ? 'bg-gradient-brand text-white shadow-brand'
                        : 'bg-brand-bg text-brand-text-2 hover:text-brand-text border border-brand-border hover:border-brand-orange/40'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade de produtos */}
            <div className="flex-1 overflow-y-auto p-5">
              {produtosFiltrados.length === 0 ? (
                <div className="text-center py-12 text-brand-text-3 text-sm">
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {produtosFiltrados.map((produto) => {
                    const qtd = quantidadeNoCarrinho(produto.id)
                    return (
                      <div
                        key={produto.id}
                        className={`rounded-xl border p-4 cursor-pointer transition-all duration-200
                          ${qtd > 0
                            ? 'border-brand-orange/50 bg-orange-50 dark:bg-orange-950/40 shadow-brand'
                            : 'border-brand-border bg-brand-surface hover:border-brand-orange/30 hover:shadow-card'
                          }`}
                        onClick={() => adicionarItem(produto)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-brand-text leading-tight truncate">
                              {produto.nome}
                            </p>
                            <p className="text-xs text-brand-text-3 truncate mt-0.5">{produto.categoria}</p>
                          </div>
                          {qtd > 0 && (
                            <span className="queue-number text-xs flex-shrink-0">{qtd}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-brand-orange font-bold text-sm">{formatarMoeda(produto.preco)}</span>
                          {qtd > 0 && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); removerItem(produto.id) }}
                                className="w-6 h-6 rounded-full bg-brand-text/10 hover:bg-brand-red/10 hover:text-brand-red flex items-center justify-center transition-colors"
                              >
                                <MdRemove size={13} className="text-brand-text-2" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); adicionarItem(produto) }}
                                className="w-6 h-6 rounded-full bg-brand-orange/10 hover:bg-brand-orange/20 flex items-center justify-center transition-colors"
                              >
                                <MdAdd size={13} className="text-brand-orange" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Rodapé com total */}
            <div className="px-5 py-4 border-t border-brand-border bg-brand-surface flex items-center justify-between gap-4 flex-shrink-0">
              <div>
                {itens.length > 0 ? (
                  <p className="text-sm text-brand-text-2">
                    <span className="font-bold text-brand-text">{itens.reduce((a, i) => a + i.quantidade, 0)}</span> novos itens
                    {' - '}<span className="font-bold text-brand-orange">{formatarMoeda(total)}</span>
                  </p>
                ) : (
                  <p className="text-sm text-brand-text-3">Nenhum item adicionado</p>
                )}
              </div>
              <button 
                onClick={tentarFechar} 
                disabled={salvando}
                className="btn-secondary px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>

          {/* ═══════════════════ CARRINHO (lg+) ═══════════════════ */}
          <div className="hidden lg:flex flex-col w-64 border-l border-brand-border bg-brand-surface">
            <div className="px-4 py-4 border-b border-brand-border flex items-center gap-2">
              <MdShoppingCart className="text-brand-orange" size={18} />
              <h3 className="font-semibold text-brand-text text-sm">Novos Itens</h3>
              {itens.length > 0 && (
                <span className="ml-auto bg-gradient-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {itens.reduce((a, i) => a + i.quantidade, 0)}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {itens.length === 0 ? (
                <div className="text-center py-8 text-brand-text-3 text-sm">Nenhum item ainda</div>
              ) : (
                itens.map((item) => (
                  <div key={item.produtoId} className="flex items-center gap-2 p-3 rounded-xl bg-brand-bg border border-brand-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-brand-text truncate">{item.nomeProduto}</p>
                      <p className="text-xs text-brand-orange font-bold">{formatarMoeda(item.quantidade * item.precoUnitario)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => removerItem(item.produtoId)}
                        className="w-6 h-6 rounded-full bg-brand-border hover:bg-red-500/15 flex items-center justify-center transition-colors"
                      >
                        <MdRemove size={11} className="text-brand-text-2" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-brand-text">{item.quantidade}</span>
                      <button 
                        onClick={() => { const p = produtos.find((x) => x.id === item.produtoId); if (p) adicionarItem(p) }}
                        className="w-6 h-6 rounded-full bg-brand-border hover:bg-brand-orange/20 flex items-center justify-center transition-colors"
                      >
                        <MdAdd size={11} className="text-brand-text-2" />
                      </button>
                      <button 
                        onClick={() => excluirItem(item.produtoId)}
                        className="w-6 h-6 rounded-full hover:bg-red-500/15 flex items-center justify-center transition-colors ml-1"
                      >
                        <MdDelete size={13} className="text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {itens.length > 0 && (
              <div className="p-4 border-t border-brand-border space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-brand-text-2 font-semibold">Total</span>
                  <span className="text-brand-orange font-bold">{formatarMoeda(total)}</span>
                </div>
                <button 
                  onClick={handleConfirmar}
                  disabled={salvando}
                  className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {salvando ? 'Salvando...' : <><MdCheck size={15} /> Adicionar</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmFechar}
        title="Deseja realmente sair?"
        message="Você tem itens selecionados que serão perdidos. Ao fechar, os itens não serão adicionados ao pedido."
        confirmLabel="Sim, descartar"
        danger
        onConfirm={handleFechar}
        onCancel={() => setConfirmFechar(false)}
      />
    </>
  )
}
