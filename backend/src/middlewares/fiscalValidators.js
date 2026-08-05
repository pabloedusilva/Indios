// ════════════════════════════════════════════════════════════════════════════
// middlewares/fiscalValidators.js — Validadores para operações fiscais
// ════════════════════════════════════════════════════════════════════════════
// Validações de segurança para dados fiscais.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Valida CNPJ
 * @param {string} cnpj - CNPJ com ou sem formatação
 * @returns {boolean}
 */
function validarCNPJ(cnpj) {
  if (!cnpj) return false
  
  // Remove formatação
  cnpj = cnpj.replace(/\D/g, '')
  
  if (cnpj.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false
  
  // Validação do primeiro dígito verificador
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
  
  // Validação do segundo dígito verificador
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
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {boolean}
 */
function validarCPF(cpf) {
  if (!cpf) return false
  
  // Remove formatação
  cpf = cpf.replace(/\D/g, '')
  
  if (cpf.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false
  
  // Validação do primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(9))) return false
  
  // Validação do segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(10))) return false
  
  return true
}

/**
 * Valida CEP
 * @param {string} cep - CEP com ou sem formatação
 * @returns {boolean}
 */
function validarCEP(cep) {
  if (!cep) return false
  
  // Remove formatação
  cep = cep.replace(/\D/g, '')
  
  return cep.length === 8 && /^\d{8}$/.test(cep)
}

/**
 * Valida chave de acesso NFe (44 dígitos)
 * @param {string} chave - Chave de acesso
 * @returns {boolean}
 */
function validarChaveAcesso(chave) {
  if (!chave) return false
  
  // Remove espaços e formatação
  chave = chave.replace(/\s/g, '')
  
  return chave.length === 44 && /^\d{44}$/.test(chave)
}

/**
 * Middleware: Validar dados de emissão de NFe
 */
function validarEmissaoNFe(req, res, next) {
  const { pedidoId, cpfDestinatario } = req.body
  
  // PedidoId é obrigatório
  if (!pedidoId) {
    return res.status(400).json({
      success: false,
      message: 'pedidoId é obrigatório'
    })
  }
  
  // Validar CPF se fornecido
  if (cpfDestinatario && !validarCPF(cpfDestinatario)) {
    return res.status(400).json({
      success: false,
      message: 'CPF do destinatário inválido'
    })
  }
  
  next()
}

/**
 * Middleware: Validar dados de configuração fiscal
 */
function validarConfiguracaoFiscal(req, res, next) {
  const { 
    empresa_cnpj, 
    empresa_crt, 
    endereco_fiscal 
  } = req.body
  
  // Validar CNPJ
  if (empresa_cnpj && !validarCNPJ(empresa_cnpj)) {
    return res.status(400).json({
      success: false,
      message: 'CNPJ inválido'
    })
  }
  
  // Validar CRT
  if (empresa_crt && ![1, 2, 3].includes(parseInt(empresa_crt))) {
    return res.status(400).json({
      success: false,
      message: 'CRT inválido. Deve ser 1, 2 ou 3'
    })
  }
  
  // Validar CEP do endereço
  if (endereco_fiscal?.cep && !validarCEP(endereco_fiscal.cep)) {
    return res.status(400).json({
      success: false,
      message: 'CEP inválido'
    })
  }
  
  next()
}

/**
 * Middleware: Validar motivo de cancelamento
 * 
 * Valida e sanitiza o motivo de cancelamento conforme requisitos da SEFAZ:
 * - Mínimo 15 caracteres
 * - Máximo 255 caracteres
 * - Não pode ser apenas espaços
 * - Remove espaços extras e quebras de linha
 */
function validarCancelamento(req, res, next) {
  const { motivo } = req.body
  
  // Validar presença e tipo
  if (!motivo || typeof motivo !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Motivo do cancelamento é obrigatório e deve ser um texto'
    })
  }
  
  // Sanitizar motivo (trim, remover múltiplos espaços, quebras de linha)
  const { sanitizarMotivo } = require('../utils/fiscalUtils')
  const motivoLimpo = sanitizarMotivo(motivo)
  
  // Validar que não é apenas espaços
  if (motivoLimpo.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Motivo não pode conter apenas espaços'
    })
  }
  
  // Validar tamanho mínimo (requisito SEFAZ)
  if (motivoLimpo.length < 15) {
    return res.status(400).json({
      success: false,
      message: `Motivo deve ter no mínimo 15 caracteres. Atual: ${motivoLimpo.length} caracteres`
    })
  }
  
  // Validar tamanho máximo (limite SEFAZ)
  if (motivoLimpo.length > 255) {
    return res.status(400).json({
      success: false,
      message: `Motivo deve ter no máximo 255 caracteres. Atual: ${motivoLimpo.length} caracteres`
    })
  }
  
  // Adicionar motivo limpo ao request para uso no controller
  req.body.motivoLimpo = motivoLimpo
  
  next()
}

module.exports = {
  validarCNPJ,
  validarCPF,
  validarCEP,
  validarChaveAcesso,
  validarEmissaoNFe,
  validarCancelamento
}
