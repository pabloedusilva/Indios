import { useState, useMemo, useRef } from 'react'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useApp } from '../../contexts/AppContext'
import { formatarMoeda, calcularTotalItens } from '../../utils/formatters'
import CupomTermico from './CupomTermico'
import ComandaCozinha from './ComandaCozinha'
import {
  MdAdd, MdRemove, MdSearch, MdDelete, MdPerson,
  MdRestaurantMenu, MdShoppingCart, MdCheck, MdPrint, MdRestaurant, MdReceipt,
} from 'react-icons/md'

export default function ModalNovoPedido({ isOpen, onClose }) {
  const { produtos, criarPedido } = useApp()

  const [nomeCliente, setNomeCliente] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos')
  const [itens, setItens] = useState([])
  const [step, setStep] = useState(1)
  const [pedidoCriado, setPedidoCriado] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const cupomRef = useRef(null)
  const comandaRef = useRef(null)

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

  const [confirmFechar, setConfirmFechar] = useState(false)

  const handleFechar = () => {
    setNomeCliente(''); setObservacoes(''); setBusca('')
    setCategoriaAtiva('Todos'); setItens([]); setStep(1); setPedidoCriado(null)
    setConfirmFechar(false)
    onClose()
  }

  const tentarFechar = () => {
    if (pedidoCriado || (!nomeCliente.trim() && itens.length === 0)) {
      handleFechar()
    } else {
      setConfirmFechar(true)
    }
  }

  const imprimirJanela = (conteudo, titulo) => {
    const janela = window.open('', '_blank', 'width=400,height=600')
    janela.document.write(
      `<!DOCTYPE html><html><head><title>${titulo}</title><meta charset="utf-8"/>` +
      `<style>* { margin:0; padding:0; box-sizing:border-box; } body { background:#fff; } @page { margin:0; size:80mm auto; }</style>` +
      `</head><body>${conteudo}</body></html>`
    )
    janela.document.close()
    janela.focus()
    setTimeout(() => { janela.print(); janela.close() }, 300)
  }

  const handleConfirmar = async () => {
    if (!nomeCliente.trim() || itens.length === 0) return
    setSalvando(true)
    try {
      const novoPedido = await criarPedido({ nomeCliente: nomeCliente.trim(), itens, observacoes: observacoes.trim() })
      setPedidoCriado(novoPedido)
    } catch {
      // toast exibido pelo AppContext
    } finally {
      setSalvando(false)
    }
  }

  const imprimirComanda = () => {
    setTimeout(() => {
      if (comandaRef.current) imprimirJanela(comandaRef.current.innerHTML, `Comanda — Pedido #${pedidoCriado?.numero}`)
    }, 100)
  }

  const imprimirCupom = () => {
    setTimeout(() => {
      if (cupomRef.current) imprimirJanela(cupomRef.current.innerHTML, `Cupom — Pedido #${pedidoCriado?.numero}`)
    }, 100)
  }

  // —— Indicador de steps ————————————————————————————————————————————
  const StepBar = () => {
    const steps = [
      { num: 1, label: 'Cliente' },
      { num: 2, label: 'Produtos' },
      { num: 3, label: 'Revisão' },
      { num: 4, label: 'Confirmado' },
    ]

    return (
      <div className="flex items-center px-6 py-4 border-b border-brand-border bg-brand-surface flex-shrink-0">
        {steps.map((s, i) => {
          const ativo = !pedidoCriado && step === s.num
          const concluido = pedidoCriado ? true : step > s.num
          const bloqueado = !!pedidoCriado || s.num === 4

          return (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => {
                  if (bloqueado) return
                  if (s.num < step || (s.num === 2 && nomeCliente.trim())) setStep(s.num)
                }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-semibold cursor-default
                  ${ativo ? 'text-brand-orange' : concluido ? 'text-emerald-500' : 'text-brand-text-3'}
                  ${!bloqueado && concluido ? 'hover:bg-emerald-500/10 cursor-pointer' : ''}`}
              >
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 transition-all duration-200
                  ${ativo ? 'bg-brand-orange text-white shadow-brand' : concluido ? 'bg-emerald-500 text-white' : 'bg-brand-bg border border-brand-border text-brand-text-3'}`}>
                  {concluido ? <MdCheck size={12} /> : s.num}
                </span>
                {s.label}
              </button>
              {i < steps.length - 1 && (
                <div className={`w-10 h-px mx-1 rounded-full transition-all duration-300 ${concluido ? 'bg-emerald-400' : 'bg-brand-border'}`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={tentarFechar} title="Novo Pedido" fullscreen>
      <div className="flex flex-col lg:flex-row h-full">

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PAINEL PRINCIPAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="flex-1 flex flex-col min-h-0 bg-brand-bg">
          <StepBar />

          {/* ——— STEP 1: Cliente ——— */}
          {step === 1 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-brand">
                <MdPerson className="text-white text-2xl" />
              </div>
              <div className="w-full max-w-md space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-text-2 mb-1.5 uppercase tracking-wider">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && nomeCliente.trim() && setStep(2)}
                    placeholder="Ex: João Silva"
                    className="input-field text-base"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-text-2 mb-1.5 uppercase tracking-wider">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Sem cebola, bem passado..."
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={!nomeCliente.trim()}
                  className="btn-primary w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <MdRestaurantMenu size={18} />
                  Escolher Produtos
                </button>
              </div>
            </div>
          )}

          {/* ——— STEP 2: Produtos ——— */}
          {step === 2 && (
            <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
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

              {/* Rodapé step 2 */}
              <div className="px-5 py-4 border-t border-brand-border bg-brand-surface flex items-center justify-between gap-4 flex-shrink-0">
                <div>
                  {itens.length > 0 ? (
                    <p className="text-sm text-brand-text-2">
                      <span className="font-bold text-brand-text">{itens.reduce((a, i) => a + i.quantidade, 0)}</span> itens
                      {' â€” '}<span className="font-bold text-brand-orange">{formatarMoeda(total)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-brand-text-3">Nenhum item adicionado</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="btn-secondary px-4 py-2">Voltar</button>
                </div>
              </div>
            </div>
          )}

          {/* ——— STEP 3: Revisão ——— */}
          {pedidoCriado && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg">
                <MdCheck className="text-white" size={32} />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-brand-text">Pedido #{String(pedidoCriado.numero).padStart(4, '0')} criado!</p>
                <p className="text-sm text-brand-text-3 mt-1">Escolha o que deseja imprimir</p>
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button onClick={imprimirComanda} className="btn-primary w-full py-3">
                  <MdRestaurant size={18} /> Imprimir Comanda do Vendedor
                </button>
                <button onClick={imprimirCupom} className="btn-primary w-full py-3">
                  <MdReceipt size={18} /> Imprimir Cupom do Cliente
                </button>
                <button onClick={handleFechar} className="btn-secondary w-full py-3 mt-2">
                  Fechar
                </button>
              </div>
            </div>
          )}

          {!pedidoCriado && step === 3 && (
            <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
              <div className="max-w-lg mx-auto space-y-4">
                {/* Info cliente */}
                <div className="rounded-xl border border-brand-orange/30 bg-orange-50 dark:bg-orange-950/30 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MdPerson className="text-brand-orange" size={16} />
                    <span className="text-[10px] text-brand-text-3 uppercase tracking-wider font-semibold">Cliente</span>
                  </div>
                  <p className="text-base font-bold text-brand-text">{nomeCliente}</p>
                  {observacoes && <p className="text-xs text-brand-text-2 mt-1">Obs: {observacoes}</p>}
                </div>

                {/* Itens */}
                <div className="card space-y-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <MdShoppingCart className="text-brand-orange" size={16} />
                    <span className="text-[10px] text-brand-text-3 uppercase tracking-wider font-semibold">Itens do Pedido</span>
                  </div>
                  {itens.map((item) => (
                    <div key={item.produtoId} className="flex items-center gap-3 p-3 rounded-xl bg-brand-bg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-text truncate">{item.nomeProduto}</p>
                        <p className="text-xs text-brand-text-3">{formatarMoeda(item.precoUnitario)} × {item.quantidade}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => removerItem(item.produtoId)}
                          className="w-6 h-6 rounded-full bg-brand-border hover:bg-red-500/15 flex items-center justify-center transition-colors">
                          <MdRemove size={12} className="text-brand-text-2" />
                        </button>
                        <span className="w-6 text-center font-bold text-brand-text text-sm">{item.quantidade}</span>
                        <button onClick={() => { const p = produtos.find((x) => x.id === item.produtoId); if (p) adicionarItem(p) }}
                          className="w-6 h-6 rounded-full bg-brand-border hover:bg-brand-orange/20 flex items-center justify-center transition-colors">
                          <MdAdd size={12} className="text-brand-text-2" />
                        </button>
                        <span className="w-20 text-right font-bold text-brand-orange text-sm">
                          {formatarMoeda(item.quantidade * item.precoUnitario)}
                        </span>
                        <button onClick={() => excluirItem(item.produtoId)}
                          className="w-6 h-6 rounded-full hover:bg-red-500/15 flex items-center justify-center transition-colors ml-1">
                          <MdDelete size={13} className="text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-brand-border pt-3 flex justify-between items-center">
                    <span className="text-brand-text-2 font-semibold text-sm">Total</span>
                    <span className="text-2xl font-bold text-brand-orange">{formatarMoeda(total)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} disabled={salvando} className="btn-secondary flex-1">Editar Itens</button>
                  <button onClick={handleConfirmar} disabled={salvando} className="btn-primary flex-1 py-3 disabled:opacity-60 disabled:cursor-not-allowed">
                    {salvando ? 'Enviando...' : <><MdCheck size={18} /> Confirmar Pedido</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• CARRINHO (lg+) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {step === 2 && (
          <div className="hidden lg:flex flex-col w-64 border-l border-brand-border bg-brand-surface">
            <div className="px-4 py-4 border-b border-brand-border flex items-center gap-2">
              <MdShoppingCart className="text-brand-orange" size={18} />
              <h3 className="font-semibold text-brand-text text-sm">Carrinho</h3>
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
                      <button onClick={() => removerItem(item.produtoId)}
                        className="w-6 h-6 rounded-full bg-brand-border hover:bg-red-500/15 flex items-center justify-center transition-colors">
                        <MdRemove size={11} className="text-brand-text-2" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-brand-text">{item.quantidade}</span>
                      <button onClick={() => { const p = produtos.find((x) => x.id === item.produtoId); if (p) adicionarItem(p) }}
                        className="w-6 h-6 rounded-full bg-brand-border hover:bg-brand-orange/20 flex items-center justify-center transition-colors">
                        <MdAdd size={11} className="text-brand-text-2" />
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
                <button onClick={() => setStep(3)} className="btn-primary w-full">
                  <MdCheck size={15} /> Revisar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cupons ocultos para impressão */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', visibility: 'hidden' }}>
        <CupomTermico ref={cupomRef} pedido={pedidoCriado} />
        <ComandaCozinha ref={comandaRef} pedido={pedidoCriado} />
      </div>

      <ConfirmDialog
        isOpen={confirmFechar}
        title="Deseja realmente sair?"
        message="Você tem um pedido em andamento. Ao fechar, todo o progresso será perdido e o pedido não será salvo."
        confirmLabel="Sim, descartar"
        danger
        onConfirm={handleFechar}
        onCancel={() => setConfirmFechar(false)}
      />
    </Modal>
  )
}

