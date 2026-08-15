// ════════════════════════════════════════════════════════════════════════════
// utils/fiscalUtils.js — Utilitários fiscais e validações
// ════════════════════════════════════════════════════════════════════════════

/**
 * Sanitiza o motivo de cancelamento
 * Remove caracteres especiais, limita tamanho
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
    .replace(/[^\w\s\-.,;:()/]/g, '') // Remove caracteres especiais perigosos
    .substring(0, 255) // Limitar a 255 caracteres
}

/**
 * Valida CNPJ
 * @param {string} cnpj - CNPJ para validar
 * @returns {boolean}
 */
function validarCNPJ(cnpj) {
  if (!cnpj) return false
  
  // Remove formatação
  cnpj = cnpj.replace(/[^\d]/g, '')
  
  if (cnpj.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false
  
  // Validação dos dígitos verificadores
  let tamanho = cnpj.length - 2
  let numeros = cnpj.substring(0, tamanho)
  const digitos = cnpj.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--
    if (pos < 2) pos = 9
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado != digitos.charAt(0)) return false
  
  tamanho = tamanho + 1
  numeros = cnpj.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--
    if (pos < 2) pos = 9
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado != digitos.charAt(1)) return false
  
  return true
}

/**
 * Valida CPF
 * @param {string} cpf - CPF para validar
 * @returns {boolean}
 */
function validarCPF(cpf) {
  if (!cpf) return false
  
  // Remove formatação
  cpf = cpf.replace(/[^\d]/g, '')
  
  if (cpf.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false
  
  // Validação do primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let resto = 11 - (soma % 11)
  let digito1 = resto === 10 || resto === 11 ? 0 : resto
  
  if (digito1 !== parseInt(cpf.charAt(9))) return false
  
  // Validação do segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i)
  }
  resto = 11 - (soma % 11)
  let digito2 = resto === 10 || resto === 11 ? 0 : resto
  
  if (digito2 !== parseInt(cpf.charAt(10))) return false
  
  return true
}

/**
 * Formata CNPJ
 * @param {string} cnpj - CNPJ sem formatação
 * @returns {string} - CNPJ formatado: 00.000.000/0000-00
 */
function formatarCNPJ(cnpj) {
  if (!cnpj) return ''
  
  cnpj = cnpj.replace(/[^\d]/g, '')
  
  if (cnpj.length !== 14) return cnpj
  
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

/**
 * Formata CPF
 * @param {string} cpf - CPF sem formatação
 * @returns {string} - CPF formatado: 000.000.000-00
 */
function formatarCPF(cpf) {
  if (!cpf) return ''
  
  cpf = cpf.replace(/[^\d]/g, '')
  
  if (cpf.length !== 11) return cpf
  
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

/**
 * Formata chave de acesso NFe (44 dígitos)
 * @param {string} chave - Chave sem formatação
 * @returns {string} - Chave formatada em blocos
 */
function formatarChaveAcesso(chave) {
  if (!chave) return ''
  
  chave = chave.replace(/[^\d]/g, '')
  
  if (chave.length !== 44) return chave
  
  return chave.replace(/^(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})$/, 
    '$1 $2 $3 $4 $5 $6 $7 $8 $9 $10 $11')
}

/**
 * Valida chave de acesso NFe
 * @param {string} chave - Chave de 44 dígitos
 * @returns {boolean}
 */
function validarChaveAcesso(chave) {
  if (!chave) return false
  
  chave = chave.replace(/[^\d]/g, '')
  
  return chave.length === 44 && /^\d+$/.test(chave)
}

/**
 * Extrai informações da chave de acesso
 * @param {string} chave - Chave de 44 dígitos
 * @returns {object|null} - { uf, anoMes, cnpj, modelo, serie, numero, codigoNumerico, digitoVerificador }
 */
function extrairInfoChaveAcesso(chave) {
  if (!validarChaveAcesso(chave)) return null
  
  chave = chave.replace(/[^\d]/g, '')
  
  return {
    uf: chave.substring(0, 2),
    anoMes: chave.substring(2, 6), // AAMM
    cnpj: chave.substring(6, 20),
    modelo: chave.substring(20, 22), // 55=NFe, 65=NFCe
    serie: chave.substring(22, 25),
    numero: chave.substring(25, 34),
    codigoNumerico: chave.substring(34, 43),
    digitoVerificador: chave.substring(43, 44)
  }
}

/**
 * Formata valor monetário para exibição
 * @param {number} valor - Valor numérico
 * @returns {string} - Valor formatado: R$ 1.234,56
 */
function formatarValorMonetario(valor) {
  if (typeof valor !== 'number') {
    valor = parseFloat(valor) || 0
  }
  
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

/**
 * Mapeia status da nota para texto legível
 * @param {string} status - Status da nota
 * @returns {string} - Texto legível
 */
function obterTextoStatus(status) {
  const textos = {
    'emitindo': 'Emitindo',
    'autorizada': 'Autorizada',
    'cancelada': 'Cancelada',
    'erro': 'Erro',
    'denegada': 'Denegada',
    'rejeitada': 'Rejeitada'
  }
  
  return textos[status] || status
}

/**
 * Mapeia status para cor/classe CSS
 * @param {string} status - Status da nota
 * @returns {string} - Classe CSS
 */
function obterCorStatus(status) {
  const cores = {
    'emitindo': 'warning',
    'autorizada': 'success',
    'cancelada': 'secondary',
    'erro': 'danger',
    'denegada': 'danger',
    'rejeitada': 'danger'
  }
  
  return cores[status] || 'secondary'
}

module.exports = {
  sanitizarMotivo,
  validarCNPJ,
  validarCPF,
  formatarCNPJ,
  formatarCPF,
  formatarChaveAcesso,
  validarChaveAcesso,
  extrairInfoChaveAcesso,
  formatarValorMonetario,
  obterTextoStatus,
  obterCorStatus
}
