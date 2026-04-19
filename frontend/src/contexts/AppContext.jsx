import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import { isHoje } from '../utils/formatters'
import toast from 'react-hot-toast'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [produtos, setProdutos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [pedidosAtivos, setPedidosAtivos] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorProdutos, setErrorProdutos] = useState(null)
  const [errorCategorias, setErrorCategorias] = useState(null)
  const [errorPedidos, setErrorPedidos] = useState(null)
  const [errorPedidosAtivos, setErrorPedidosAtivos] = useState(null)

  // —— Fetch ——————————————————————————————————————————————————
  const carregarCategorias = useCallback(async () => {
    try {
      const data = await api.get('/categorias')
      setCategorias(data)
      setErrorCategorias(null)
    } catch (err) {
      setErrorCategorias(err.message || 'Erro ao carregar categorias.')
    }
  }, [])

  const carregarProdutos = useCallback(async () => {
    try {
      const data = await api.get('/produtos')
      setProdutos(data)
      setErrorProdutos(null)
    } catch (err) {
      setErrorProdutos(err.message || 'Erro ao carregar produtos.')
    }
  }, [])

  const carregarPedidosAtivos = useCallback(async () => {
    try {
      const data = await api.get('/pedidos/ativos')
      setPedidosAtivos(data)
      setErrorPedidosAtivos(null)
    } catch (err) {
      setErrorPedidosAtivos(err.message || 'Erro ao carregar pedidos ativos.')
    }
  }, [])

  const carregarPedidos = useCallback(async () => {
    try {
      const data = await api.get('/pedidos')
      setPedidos(data)
      setErrorPedidos(null)
    } catch (err) {
      setErrorPedidos(err.message || 'Erro ao carregar pedidos.')
    }
  }, [])

  // ── Carregamento inicial + auto-refresh da fila ────────────
  useEffect(() => {
    const init = async () => {
      await Promise.all([carregarCategorias(), carregarProdutos(), carregarPedidos(), carregarPedidosAtivos()])
      setLoading(false)
    }
    init()
    const t = setInterval(carregarPedidosAtivos, 30000)
    return () => clearInterval(t)
  }, [carregarCategorias, carregarProdutos, carregarPedidos, carregarPedidosAtivos])

  // —— Derivados ——————————————————————————————————————————————
  const pedidosHoje = pedidos.filter((p) => isHoje(p.criadoEm))
  const faturamentoHoje = pedidosHoje
    .filter((p) => p.status !== 'cancelado')
    .reduce((acc, p) => acc + p.total, 0)

  // —— Actions: Produtos —————————————————————————————————————
  const adicionarCategoria = useCallback(async (nome) => {
    try {
      await api.post('/categorias', { nome })
      await carregarCategorias()
    } catch (err) {
      toast.error(err.message || 'Erro ao adicionar categoria.')
      throw err
    }
  }, [carregarCategorias])

  // Aceita o nome da categoria; busca o id internamente
  const removerCategoria = useCallback(async (nome) => {
    try {
      const cat = categorias.find((c) => c.nome === nome)
      if (!cat) return
      await api.delete(`/categorias/${cat.id}`)
      await carregarCategorias()
    } catch (err) {
      toast.error(err.message || 'Erro ao remover categoria.')
      throw err
    }
  }, [categorias, carregarCategorias])

  const adicionarProduto = useCallback(async (dadosProduto) => {
    try {
      const novo = await api.post('/produtos', dadosProduto)
      await carregarProdutos()
      toast.success(`Produto "${novo.nome}" adicionado!`)
      return novo
    } catch (err) {
      toast.error(err.message || 'Erro ao adicionar produto.')
      throw err
    }
  }, [carregarProdutos])

  const editarProduto = useCallback(async (id, dadosAtualizados) => {
    try {
      await api.put(`/produtos/${id}`, dadosAtualizados)
      await carregarProdutos()
      toast.success('Produto atualizado!')
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar produto.')
      throw err
    }
  }, [carregarProdutos])

  const removerProduto = useCallback(async (id) => {
    try {
      await api.delete(`/produtos/${id}`)
      await carregarProdutos()
      toast.success('Produto removido!')
    } catch (err) {
      toast.error(err.message || 'Erro ao remover produto.')
      throw err
    }
  }, [carregarProdutos])

  const toggleDisponibilidadeProduto = useCallback(async (id) => {
    try {
      await api.patch(`/produtos/${id}/disponibilidade`)
      await carregarProdutos()
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar disponibilidade.')
    }
  }, [carregarProdutos])

  // —— Actions: Pedidos ——————————————————————————————————————
  const criarPedido = useCallback(async (dadosPedido) => {
    try {
      const novoPedido = await api.post('/pedidos', dadosPedido)
      carregarPedidosAtivos()
      carregarPedidos()
      toast.success(`Pedido #${novoPedido.numero} criado para ${novoPedido.nomeCliente}!`)
      return novoPedido
    } catch (err) {
      toast.error(err.message || 'Erro ao criar pedido.')
      throw err
    }
  }, [carregarPedidosAtivos, carregarPedidos])

  const marcarPronto = useCallback(async (id) => {
    try {
      await api.patch(`/pedidos/${id}/pronto`)
      carregarPedidosAtivos()
      toast.success('Pedido marcado como pronto!')
    } catch (err) {
      toast.error(err.message || 'Erro ao marcar pedido como pronto.')
    }
  }, [carregarPedidosAtivos])

  const finalizarPedido = useCallback(async (id, { formaPagamento, valorRecebido, troco }) => {
    try {
      await api.patch(`/pedidos/${id}/finalizar`, { formaPagamento, valorRecebido, troco })
      carregarPedidosAtivos()
      carregarPedidos()
      const label = { pix: 'PIX', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro' }[formaPagamento] ?? formaPagamento
      toast.success(`Pedido finalizado! Pagamento via ${label} ✅`)
    } catch (err) {
      toast.error(err.message || 'Erro ao finalizar pedido.')
      throw err
    }
  }, [carregarPedidosAtivos, carregarPedidos])

  const cancelarPedido = useCallback(async (id) => {
    try {
      await api.patch(`/pedidos/${id}/cancelar`)
      carregarPedidosAtivos()
      carregarPedidos()
      toast.error('Pedido cancelado.')
    } catch (err) {
      toast.error(err.message || 'Erro ao cancelar pedido.')
    }
  }, [carregarPedidosAtivos, carregarPedidos])

  const excluirPedido = useCallback(async (id) => {
    try {
      await api.delete(`/pedidos/${id}`)
      await carregarPedidos()
      toast.success('Pedido excluído do histórico.')
    } catch (err) {
      toast.error(err.message || 'Erro ao excluir pedido.')
    }
  }, [carregarPedidos])

  // —— Valor exposto —————————————————————————————————————————
  const value = {
    // Estado
    loading,
    // Erros por recurso
    errorProdutos,
    errorCategorias,
    errorPedidos,
    errorPedidosAtivos,
    // Dados
    produtos,
    // categorias como strings (nomes) para uso nos selects/filtros
    categorias: categorias.map((c) => c.nome),
    pedidos,
    pedidosHoje,
    pedidosAtivos,
    faturamentoHoje,
    // Refresh helpers
    refetchProdutos: carregarProdutos,
    refetchCategorias: carregarCategorias,
    refetchPedidosAtivos: carregarPedidosAtivos,
    refetchPedidos: carregarPedidos,
    // Actions: Produtos
    adicionarCategoria,
    removerCategoria,
    adicionarProduto,
    editarProduto,
    removerProduto,
    toggleDisponibilidadeProduto,
    // Actions: Pedidos
    criarPedido,
    marcarPronto,
    finalizarPedido,
    cancelarPedido,
    excluirPedido,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
