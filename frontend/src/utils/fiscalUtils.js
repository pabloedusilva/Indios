// ════════════════════════════════════════════════════════════════════════════
// UTIL: Fiscal Utils (Frontend)
// ════════════════════════════════════════════════════════════════════════════
// Utilitários para operações fiscais no frontend.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se nota está dentro do prazo de cancelamento (24h)
 * 
 * @param {Date|string} autorizadoEm - Data de autorização pela SEFAZ
 * @returns {{dentroDoPrazo: boolean, horasRestantes: number, mensagem: string}}
 */
export function verificarPrazoCancelamento(autorizadoEm) {
  if (!autorizadoEm) {
    return {
      dentroDoPrazo: false,
      horasRestantes: 0,
      mensagem: 'Data de autorização não disponível'
    }
  }
  
  const agora = new Date()
  const dataAutorizacao = new Date(autorizadoEm)
  
  // Validar se a data é válida
  if (isNaN(dataAutorizacao.getTime())) {
    return {
      dentroDoPrazo: false,
      horasRestantes: 0,
      mensagem: 'Data de autorização inválida'
    }
  }
  
  // Calcular horas passadas
  const milissegundosPassados = agora - dataAutorizacao
  const horasPassadas = milissegundosPassados / (1000 * 60 * 60)
  const horasRestantes = Math.max(24 - horasPassadas, 0)
  
  const dentroDoPrazo = horasPassadas < 24
  
  let mensagem
  if (dentroDoPrazo) {
    const horas = Math.floor(horasRestantes)
    const minutos = Math.floor((horasRestantes - horas) * 60)
    mensagem = `${horas}h ${minutos}min restantes`
  } else {
    mensagem = 'Prazo expirado'
  }
  
  return {
    dentroDoPrazo,
    horasRestantes,
    horasPassadas,
    mensagem
  }
}

/**
 * Formata tempo restante em formato legível
 * 
 * @param {number} horasRestantes - Horas restantes (pode ser decimal)
 * @returns {string} - Tempo formatado (ex: "23h 45min")
 */
export function formatarTempoRestante(horasRestantes) {
  if (horasRestantes <= 0) {
    return 'Prazo expirado'
  }
  
  const horas = Math.floor(horasRestantes)
  const minutos = Math.floor((horasRestantes - horas) * 60)
  
  if (horas === 0) {
    return `${minutos}min restantes`
  }
  
  if (minutos === 0) {
    return `${horas}h restantes`
  }
  
  return `${horas}h ${minutos}min restantes`
}

/**
 * Motivos comuns pré-definidos para cancelamento
 */
export const MOTIVOS_COMUNS = [
  {
    id: 'erro-valor',
    label: 'Erro no valor informado na nota fiscal',
    descricao: 'Valor do produto ou total da nota incorreto'
  },
  {
    id: 'erro-destinatario',
    label: 'Erro no cadastro do destinatário',
    descricao: 'Dados do cliente incorretos (nome, CPF, etc)'
  },
  {
    id: 'duplicidade',
    label: 'Nota emitida em duplicidade',
    descricao: 'Nota fiscal emitida mais de uma vez para o mesmo pedido'
  },
  {
    id: 'desistencia',
    label: 'Cliente desistiu da compra antes da entrega',
    descricao: 'Cancelamento solicitado pelo cliente'
  },
  {
    id: 'nao-retirado',
    label: 'Mercadoria não foi retirada pelo cliente',
    descricao: 'Cliente não compareceu para retirar o pedido'
  },
  {
    id: 'erro-produto',
    label: 'Erro no tipo de produto lançado',
    descricao: 'Produto incorreto informado na nota'
  },
  {
    id: 'outro',
    label: 'Outro motivo (digite abaixo)',
    descricao: 'Digite o motivo completo no campo de texto'
  }
]
