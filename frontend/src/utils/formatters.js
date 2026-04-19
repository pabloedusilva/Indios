// Utilitários de formatação e helpers gerais

export const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

// FIX: todas as funções de formatação explicitam timeZone: 'America/Sao_Paulo'
// para garantir exibição correta independente do timezone do navegador/servidor.
// As datas são armazenadas em UTC no banco e convertidas somente aqui.
const TZ_SP = 'America/Sao_Paulo'

export const formatarData = (dataISO) => {
  if (!dataISO) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ_SP,
  }).format(new Date(dataISO))
}

export const formatarHora = (dataISO) => {
  if (!dataISO) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_SP,
  }).format(new Date(dataISO))
}

export const formatarDataHora = (dataISO) => {
  if (!dataISO) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_SP,
  }).format(new Date(dataISO))
}

export const isHoje = (dataISO) => {
  if (!dataISO) return false
  // FIX: comparar datas no timezone de São Paulo para não depender do
  // timezone local da máquina. getDate() anterior usava horário local.
  const opts = { timeZone: TZ_SP, year: 'numeric', month: '2-digit', day: '2-digit' }
  const dataSP = new Date(dataISO).toLocaleDateString('pt-BR', opts)
  const hojeSP = new Date().toLocaleDateString('pt-BR', opts)
  return dataSP === hojeSP
}

export const calcularTotalItens = (itens) => {
  return itens.reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0)
}

export const agruparPorData = (pedidos) => {
  const grupos = {}
  pedidos.forEach((pedido) => {
    const data = formatarData(pedido.criadoEm)
    if (!grupos[data]) grupos[data] = []
    grupos[data].push(pedido)
  })
  return grupos
}
