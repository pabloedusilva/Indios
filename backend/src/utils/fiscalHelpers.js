// ════════════════════════════════════════════════════════════════════════════
// utils/fiscalHelpers.js — Funções auxiliares para operações fiscais
// ════════════════════════════════════════════════════════════════════════════

/**
 * Verifica se uma nota está dentro do prazo de cancelamento de 24h
 * @param {Date|string} autorizadoEm - Data de autorização da nota
 * @returns {{dentroDoPrazo: boolean, horasRestantes: number, mensagem: string}}
 */
function verificarPrazoCancelamento(autorizadoEm) {
  if (!autorizadoEm) {
    return {
      dentroDoPrazo: false,
      horasRestantes: 0,
      mensagem: 'Data de autorização não disponível'
    }
  }
  
  const dataAutorizacao = new Date(autorizadoEm)
  const agora = new Date()
  const diferencaMs = agora - dataAutorizacao
  const horasPassadas = diferencaMs / (1000 * 60 * 60)
  const horasRestantes = Math.max(0, 24 - horasPassadas)
  
  const dentroDoPrazo = horasPassadas < 24
  
  let mensagem
  if (dentroDoPrazo) {
    const horas = Math.floor(horasRestantes)
    const minutos = Math.floor((horasRestantes - horas) * 60)
    mensagem = `${horas}h ${minutos}min restantes para cancelamento`
  } else {
    const horasExcedidas = Math.floor(horasPassadas - 24)
    mensagem = `Prazo expirado há ${horasExcedidas}h`
  }
  
  return {
    dentroDoPrazo,
    horasRestantes,
    mensagem
  }
}

/**
 * Sanitiza o motivo de cancelamento
 * @param {string} motivo - Motivo original
 * @returns {string} - Motivo sanitizado
 */
function sanitizarMotivo(motivo) {
  if (!motivo || typeof motivo !== 'string') {
    return ''
  }
  
  return motivo
    .trim()
    .replace(/\s+/g, ' ') // Múltiplos espaços → espaço único
    .replace(/[\r\n]+/g, ' ') // Quebras de linha → espaço
    .substring(0, 255) // Limitar a 255 caracteres
}

/**
 * Traduz erros da SEFAZ/Focus NFe para mensagens amigáveis
 * @param {Error} error - Erro original
 * @returns {string} - Mensagem traduzida
 */
function traduzirErroSEFAZ(error) {
  const mensagemOriginal = error.message || ''
  const statusCode = error.response?.status
  const codigoErro = error.response?.data?.codigo
  
  // Erros HTTP
  if (statusCode === 400) {
    return 'Dados inválidos enviados para a SEFAZ. Verifique as informações da nota.'
  }
  
  if (statusCode === 404) {
    return 'Nota fiscal não encontrada na SEFAZ.'
  }
  
  if (statusCode === 422) {
    // Verificar mensagens específicas
    if (mensagemOriginal.includes('prazo') || mensagemOriginal.includes('24')) {
      return mensagemOriginal
    }
    if (mensagemOriginal.includes('já cancelada')) {
      return mensagemOriginal
    }
    if (mensagemOriginal.includes('já foi cancelada')) {
      return 'Esta nota fiscal já foi cancelada anteriormente.'
    }
    return 'Operação não permitida pela SEFAZ. ' + mensagemOriginal
  }
  
  if (statusCode === 429) {
    return 'Muitas requisições. Aguarde alguns instantes e tente novamente.'
  }
  
  if (statusCode >= 500 && statusCode < 600) {
    return 'Erro nos servidores da SEFAZ. Tente novamente em alguns instantes.'
  }
  
  // Erros de timeout
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return 'Timeout ao comunicar com a SEFAZ. Verifique sua conexão e tente novamente.'
  }
  
  // Erros de rede
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return 'Não foi possível conectar com a SEFAZ. Verifique sua conexão de internet.'
  }
  
  // Códigos de erro específicos da SEFAZ
  if (codigoErro) {
    const codigosConhecidos = {
      '866': 'Ausência de troco quando o valor dos pagamentos é maior que o total da nota',
      '539': 'CNPJ do emitente inválido ou não cadastrado na SEFAZ',
      '227': 'A data de emissão não pode ser superior à data atual',
      '236': 'Chave de acesso duplicada',
      '539': 'Rejeição: CNPJ do destinatário inválido'
    }
    
    if (codigosConhecidos[codigoErro]) {
      return `Erro SEFAZ ${codigoErro}: ${codigosConhecidos[codigoErro]}`
    }
  }
  
  // Retornar mensagem original se não houver tradução
  return mensagemOriginal || 'Erro desconhecido ao processar nota fiscal'
}

/**
 * Formata tempo restante em formato legível
 * @param {number} horasRestantes - Horas restantes
 * @returns {string} - Formato "Xh Ymin"
 */
function formatarTempoRestante(horasRestantes) {
  if (horasRestantes <= 0) {
    return 'Prazo expirado'
  }
  
  const horas = Math.floor(horasRestantes)
  const minutos = Math.floor((horasRestantes - horas) * 60)
  
  if (horas === 0) {
    return `${minutos}min`
  }
  
  return `${horas}h ${minutos}min`
}

module.exports = {
  verificarPrazoCancelamento,
  sanitizarMotivo,
  traduzirErroSEFAZ,
  formatarTempoRestante
}
