// ════════════════════════════════════════════════════════════════════════════
// UTIL: Fiscal Validators
// ════════════════════════════════════════════════════════════════════════════
// Validadores client-side para dados fiscais.
//
// FUNÇÕES:
//
// validarCNPJ(cnpj)
//   → Valida formato e dígitos verificadores
//   → Retorna: { valido: boolean, erro: string }
//
// validarCPF(cpf)
//   → Valida formato e dígitos verificadores
//   → Retorna: { valido: boolean, erro: string }
//
// validarIE(ie, uf)
//   → Valida IE de acordo com regras da UF
//   → Retorna: { valido: boolean, erro: string }
//
// validarCEP(cep)
//   → Valida formato 12345-678
//   → Retorna: { valido: boolean, erro: string }
//
// validarChaveAcesso(chave)
//   → Valida 44 dígitos + dígito verificador
//   → Retorna: { valido: boolean, erro: string }
//
// validarDadosEmitente(dados)
//   → Valida conjunto completo de dados do emitente
//   → Retorna: { valido: boolean, erros: Array }
//
// validarDadosDestinatario(dados)
//   → Valida conjunto completo de dados do destinatário
//   → Retorna: { valido: boolean, erros: Array }
//
// validarEndereco(endereco)
//   → Valida endereço completo
//   → Retorna: { valido: boolean, erros: Array }
//
// validarMotivoCancelamento(motivo)
//   → Min 15 chars, max 255
//   → Retorna: { valido: boolean, erro: string }
//
// MENSAGENS DE ERRO:
// - Claras e em português
// - Indicam exatamente o que está errado
// - Sugerem correção quando possível
// ════════════════════════════════════════════════════════════════════════════

/**
 * Remove caracteres não numéricos de uma string
 */
function apenasNumeros(str) {
  if (!str) return ''
  return String(str).replace(/\D/g, '')
}

/**
 * Valida CNPJ - formato e dígitos verificadores
 * @param {string} cnpj - CNPJ com ou sem formatação
 * @returns {{valido: boolean, erro?: string}}
 */
export function validarCNPJ(cnpj) {
  const numeros = apenasNumeros(cnpj)

  if (!numeros) {
    return { valido: false, erro: 'CNPJ é obrigatório' }
  }

  if (numeros.length !== 14) {
    return { valido: false, erro: 'CNPJ deve conter 14 dígitos' }
  }

  // Verifica sequências inválidas (todos os dígitos iguais)
  if (/^(\d)\1+$/.test(numeros)) {
    return { valido: false, erro: 'CNPJ inválido' }
  }

  // Cálculo do primeiro dígito verificador
  let tamanho = numeros.length - 2
  let numBase = numeros.substring(0, tamanho)
  let digitos = numeros.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numBase.charAt(tamanho - i)) * pos--
    if (pos < 2) pos = 9
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0))) {
    return { valido: false, erro: 'CNPJ inválido - dígito verificador incorreto' }
  }

  // Cálculo do segundo dígito verificador
  tamanho = tamanho + 1
  numBase = numeros.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numBase.charAt(tamanho - i)) * pos--
    if (pos < 2) pos = 9
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(1))) {
    return { valido: false, erro: 'CNPJ inválido - dígito verificador incorreto' }
  }

  return { valido: true }
}

/**
 * Valida CPF - formato e dígitos verificadores
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {{valido: boolean, erro?: string}}
 */
export function validarCPF(cpf) {
  const numeros = apenasNumeros(cpf)

  if (!numeros) {
    return { valido: false, erro: 'CPF é obrigatório' }
  }

  if (numeros.length !== 11) {
    return { valido: false, erro: 'CPF deve conter 11 dígitos' }
  }

  // Verifica sequências inválidas (todos os dígitos iguais)
  if (/^(\d)\1+$/.test(numeros)) {
    return { valido: false, erro: 'CPF inválido' }
  }

  // Cálculo do primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros.charAt(i)) * (10 - i)
  }
  let resto = soma % 11
  let dv1 = resto < 2 ? 0 : 11 - resto

  if (dv1 !== parseInt(numeros.charAt(9))) {
    return { valido: false, erro: 'CPF inválido - dígito verificador incorreto' }
  }

  // Cálculo do segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros.charAt(i)) * (11 - i)
  }
  resto = soma % 11
  let dv2 = resto < 2 ? 0 : 11 - resto

  if (dv2 !== parseInt(numeros.charAt(10))) {
    return { valido: false, erro: 'CPF inválido - dígito verificador incorreto' }
  }

  return { valido: true }
}

/**
 * Valida CEP - formato brasileiro
 * @param {string} cep - CEP com ou sem formatação
 * @returns {{valido: boolean, erro?: string}}
 */
export function validarCEP(cep) {
  const numeros = apenasNumeros(cep)

  if (!numeros) {
    return { valido: false, erro: 'CEP é obrigatório' }
  }

  if (numeros.length !== 8) {
    return { valido: false, erro: 'CEP deve conter 8 dígitos (formato: 12345-678)' }
  }

  // CEP não pode ser todo zeros
  if (numeros === '00000000') {
    return { valido: false, erro: 'CEP inválido' }
  }

  return { valido: true }
}

/**
 * Valida Inscrição Estadual - validação básica
 * @param {string} ie - Inscrição Estadual
 * @param {string} uf - Unidade Federativa (sigla do estado)
 * @returns {{valido: boolean, erro?: string}}
 */
export function validarIE(ie, uf) {
  if (!ie || !String(ie).trim()) {
    return { valido: false, erro: 'Inscrição Estadual é obrigatória' }
  }

  const ieStr = String(ie).toUpperCase().trim()

  // ISENTO é válido
  if (ieStr === 'ISENTO') {
    return { valido: true }
  }

  const numeros = apenasNumeros(ieStr)

  if (!numeros) {
    return { valido: false, erro: 'Inscrição Estadual deve conter apenas números ou ser "ISENTO"' }
  }

  // Validação básica de tamanho por UF (simplificada)
  const tamanhosPorUF = {
    AC: 13, AL: 9,  AP: 9,  AM: 9,  BA: 9,  CE: 9,
    DF: 13, ES: 9,  GO: 9,  MA: 9,  MT: 11, MS: 9,
    MG: 13, PA: 9,  PB: 9,  PR: 10, PE: 14, PI: 9,
    RJ: 8,  RN: 10, RS: 10, RO: 14, RR: 9,  SC: 9,
    SP: 12, SE: 9,  TO: 11,
  }

  const tamanhoEsperado = tamanhosPorUF[uf]
  if (!tamanhoEsperado) {
    return { valido: false, erro: 'UF inválida' }
  }

  if (numeros.length !== tamanhoEsperado) {
    return {
      valido: false,
      erro: `IE de ${uf} deve ter ${tamanhoEsperado} dígitos`,
    }
  }

  return { valido: true }
}

/**
 * Valida Chave de Acesso NFe - 44 dígitos
 * @param {string} chave - Chave de acesso (44 dígitos)
 * @returns {{valido: boolean, erro?: string}}
 */
export function validarChaveAcesso(chave) {
  const numeros = apenasNumeros(chave)

  if (!numeros) {
    return { valido: false, erro: 'Chave de acesso é obrigatória' }
  }

  if (numeros.length !== 44) {
    return { valido: false, erro: 'Chave de acesso deve conter 44 dígitos' }
  }

  // Validação do dígito verificador (último dígito)
  const base = numeros.substring(0, 43)
  const dv = parseInt(numeros.charAt(43))

  let soma = 0
  let peso = 2

  for (let i = base.length - 1; i >= 0; i--) {
    soma += parseInt(base.charAt(i)) * peso
    peso++
    if (peso > 9) peso = 2
  }

  const resto = soma % 11
  const dvCalculado = resto === 0 || resto === 1 ? 0 : 11 - resto

  if (dvCalculado !== dv) {
    return { valido: false, erro: 'Chave de acesso inválida - dígito verificador incorreto' }
  }

  return { valido: true }
}

/**
 * Valida endereço completo
 * @param {Object} endereco - Objeto com campos do endereço
 * @returns {{valido: boolean, erros: Array<string>}}
 */
export function validarEndereco(endereco) {
  const erros = []

  if (!endereco) {
    return { valido: false, erros: ['Endereço é obrigatório'] }
  }

  if (!endereco.logradouro || endereco.logradouro.trim().length < 3) {
    erros.push('Logradouro deve ter pelo menos 3 caracteres')
  }

  if (!endereco.numero || endereco.numero.trim().length === 0) {
    erros.push('Número é obrigatório (use "S/N" se não houver número)')
  }

  if (!endereco.bairro || endereco.bairro.trim().length < 2) {
    erros.push('Bairro deve ter pelo menos 2 caracteres')
  }

  if (!endereco.municipio || endereco.municipio.trim().length < 2) {
    erros.push('Município é obrigatório')
  }

  if (!endereco.uf || endereco.uf.trim().length !== 2) {
    erros.push('UF deve conter 2 caracteres (ex: SP, RJ)')
  }

  const cepValidacao = validarCEP(endereco.cep)
  if (!cepValidacao.valido) {
    erros.push(cepValidacao.erro)
  }

  return {
    valido: erros.length === 0,
    erros,
  }
}

/**
 * Valida dados completos do emitente
 * @param {Object} dados - Dados do emitente
 * @returns {{valido: boolean, erros: Array<string>}}
 */
export function validarDadosEmitente(dados) {
  const erros = []

  if (!dados) {
    return { valido: false, erros: ['Dados do emitente são obrigatórios'] }
  }

  // Razão Social
  if (!dados.razaoSocial || dados.razaoSocial.trim().length < 3) {
    erros.push('Razão Social deve ter pelo menos 3 caracteres')
  }

  // CNPJ
  const cnpjValidacao = validarCNPJ(dados.cnpj)
  if (!cnpjValidacao.valido) {
    erros.push(cnpjValidacao.erro)
  }

  // IE
  if (dados.ie) {
    const ieValidacao = validarIE(dados.ie, dados.uf)
    if (!ieValidacao.valido) {
      erros.push(ieValidacao.erro)
    }
  }

  // Endereço
  if (dados.endereco) {
    const enderecoValidacao = validarEndereco(dados.endereco)
    if (!enderecoValidacao.valido) {
      erros.push(...enderecoValidacao.erros)
    }
  } else {
    erros.push('Endereço do emitente é obrigatório')
  }

  return {
    valido: erros.length === 0,
    erros,
  }
}

/**
 * Valida dados completos do destinatário
 * @param {Object} dados - Dados do destinatário
 * @returns {{valido: boolean, erros: Array<string>}}
 */
export function validarDadosDestinatario(dados) {
  const erros = []

  if (!dados) {
    return { valido: false, erros: ['Dados do destinatário são obrigatórios'] }
  }

  // Nome
  if (!dados.nome || dados.nome.trim().length < 3) {
    erros.push('Nome do destinatário deve ter pelo menos 3 caracteres')
  }

  // CPF ou CNPJ (ao menos um deve ser válido)
  if (dados.cpf || dados.cnpj) {
    if (dados.cpf) {
      const cpfValidacao = validarCPF(dados.cpf)
      if (!cpfValidacao.valido) {
        erros.push(cpfValidacao.erro)
      }
    }
    if (dados.cnpj) {
      const cnpjValidacao = validarCNPJ(dados.cnpj)
      if (!cnpjValidacao.valido) {
        erros.push(cnpjValidacao.erro)
      }
    }
  }

  // Endereço (opcional mas se fornecido deve ser válido)
  if (dados.endereco) {
    const enderecoValidacao = validarEndereco(dados.endereco)
    if (!enderecoValidacao.valido) {
      erros.push(...enderecoValidacao.erros)
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  }
}

/**
 * Valida motivo de cancelamento de NFe
 * @param {string} motivo - Motivo do cancelamento
 * @returns {{valido: boolean, erro?: string}}
 */
export function validarMotivoCancelamento(motivo) {
  if (!motivo || !motivo.trim()) {
    return { valido: false, erro: 'Motivo do cancelamento é obrigatório' }
  }

  const texto = motivo.trim()

  if (texto.length < 15) {
    return {
      valido: false,
      erro: 'Motivo deve ter no mínimo 15 caracteres',
    }
  }

  if (texto.length > 255) {
    return {
      valido: false,
      erro: 'Motivo deve ter no máximo 255 caracteres',
    }
  }

  return { valido: true }
}

