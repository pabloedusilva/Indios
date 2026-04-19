import { useState, useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import CardProduto from '../components/produtos/CardProduto'
import ModalProduto from '../components/produtos/ModalProduto'
import ModalCategoria from '../components/produtos/ModalCategoria'
import EmptyState from '../components/ui/EmptyState'
import PageLoader from '../components/ui/PageLoader'
import { MdAdd, MdTune, MdSearch, MdInventory2, MdFilterList, MdRefresh, MdWarning } from 'react-icons/md'
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton'

export default function Produtos() {
  const {
    produtos, categorias,
    adicionarProduto, editarProduto,
    adicionarCategoria, removerCategoria,
    loading, errorProdutos, errorCategorias, refetchProdutos,
  } = useApp()
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos')
  const [filtroDisponivel, setFiltroDisponivel] = useState('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await refetchProdutos()
    setTimeout(() => setRefreshing(false), 600)
  }

  const produtosPorCategoria = useMemo(() => {
    return categorias.reduce((acc, cat) => {
      acc[cat] = produtos.filter((p) => p.categoria === cat).length
      return acc
    }, {})
  }, [produtos, categorias])

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase()) ||
                         p.categoria.toLowerCase().includes(busca.toLowerCase())
      const matchCat = categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva
      const matchDisp =
        filtroDisponivel === 'todos' ? true :
        filtroDisponivel === 'disponivel' ? p.disponivel :
        !p.disponivel
      return matchBusca && matchCat && matchDisp
    })
  }, [produtos, busca, categoriaAtiva, filtroDisponivel])

  const handleEditar = (produto) => {
    setProdutoEditando(produto)
    setModalAberto(true)
  }

  const handleFecharModal = () => {
    setModalAberto(false)
    setProdutoEditando(null)
  }

  const handleSalvar = async (dados) => {
    if (produtoEditando) {
      await editarProduto(produtoEditando.id, dados)
    } else {
      await adicionarProduto(dados)
    }
  }

  const handleAdicionarCategoria = async (nome) => {
    await adicionarCategoria(nome)
  }

  const handleRemoverCategoria = async (nome) => {
    await removerCategoria(nome)
    if (categoriaAtiva === nome) setCategoriaAtiva('Todos')
  }

  const totais = {
    todos: produtos.length,
    disponiveis: produtos.filter((p) => p.disponivel).length,
    indisponiveis: produtos.filter((p) => !p.disponivel).length,
  }

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <SkeletonGroup className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36 rounded-xl" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </SkeletonGroup>

      {/* Filtros */}
      <SkeletonGroup className="card space-y-3">
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className={`h-7 rounded-full ${i === 0 ? 'w-14' : 'w-20'}`} />
          ))}
          <div className="flex-1" />
          <Skeleton className="h-7 w-48 rounded-lg" />
        </div>
      </SkeletonGroup>

      {/* Grade de produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonGroup key={i} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between border-t border-brand-border pt-3">
              <Skeleton className="h-5 w-20" />
              <div className="flex gap-1.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </SkeletonGroup>
        ))}
      </div>
    </div>
  )

  const errorGeral = errorProdutos || errorCategorias
  if (errorGeral) {
    return (
      <div className="-m-5 lg:-m-7 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <MdWarning className="text-brand-red" size={24} />
          </div>
          <p className="text-brand-text-2 text-sm">{errorGeral}</p>
          <button onClick={refetchProdutos} className="btn-primary px-4 py-2 text-sm gap-1.5">
            <MdRefresh size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-brand-text">Produtos</h1>
            <p className="text-brand-text-3 text-sm mt-0.5">
              {totais.todos} produto{totais.todos !== 1 ? 's' : ''} · {totais.disponiveis} disponíve{totais.disponiveis !== 1 ? 'is' : 'l'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title="Atualizar produtos"
              className="p-2 rounded-xl text-brand-text-3 hover:text-brand-text hover:bg-brand-surface border border-brand-border transition-all active:scale-95"
            >
              <MdRefresh size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setModalAberto(true)}
              className="btn-primary px-6 py-3 text-sm"
            >
              <MdAdd size={20} />
              Adicionar Produto
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="card space-y-3">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-3" size={17} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto ou categoria..."
              className="input-field pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <MdFilterList className="text-brand-text-3" size={16} />
            {['Todos', ...categorias].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                  ${categoriaAtiva === cat
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'bg-brand-bg text-brand-text-2 hover:text-brand-text border border-brand-border hover:border-brand-orange/40'
                  }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setModalCategoriaAberto(true)}
              title="Gerenciar categorias"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-text-3
                         hover:text-brand-orange hover:bg-brand-orange/10 border border-brand-border
                         hover:border-brand-orange/40 transition-all duration-200"
            >
              <MdTune size={15} />
            </button>

            <div className="flex-1" />

            <div className="flex gap-1 p-1 bg-brand-bg rounded-lg border border-brand-border">
              {[
                { id: 'todos', label: `Todos (${totais.todos})` },
                { id: 'disponivel', label: `Disponíveis (${totais.disponiveis})` },
                { id: 'indisponivel', label: `Indisp. (${totais.indisponiveis})` },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setFiltroDisponivel(id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all
                    ${filtroDisponivel === id
                      ? 'bg-gradient-brand text-white shadow-brand'
                      : 'text-brand-text-3 hover:text-brand-text'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grade de produtos */}
        {produtosFiltrados.length === 0 ? (
          <EmptyState
            icon={MdInventory2}
            title="Nenhum produto encontrado"
            description="Tente ajustar os filtros ou adicione um novo produto ao cardápio."
            action={
              <button onClick={() => setModalAberto(true)} className="btn-primary">
                <MdAdd size={18} />
                Adicionar Produto
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {produtosFiltrados.map((produto) => (
              <CardProduto key={produto.id} produto={produto} onEditar={handleEditar} />
            ))}
          </div>
        )}
      </div>

      <ModalProduto
        isOpen={modalAberto}
        onClose={handleFecharModal}
        produtoEditando={produtoEditando}
        onSalvar={handleSalvar}
        categorias={categorias}
      />

      <ModalCategoria
        isOpen={modalCategoriaAberto}
        onClose={() => setModalCategoriaAberto(false)}
        categorias={categorias}
        produtosPorCategoria={produtosPorCategoria}
        onAdicionar={handleAdicionarCategoria}
        onRemover={handleRemoverCategoria}
      />
    </>
  )
}
