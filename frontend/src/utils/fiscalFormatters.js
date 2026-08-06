// ════════════════════════════════════════════════════════════════════════════
// UTIL: Fiscal Formatters
// ════════════════════════════════════════════════════════════════════════════

export function formatarCNPJ(cnpj) {
  if (!cnpj) return ''
  const numeros = cnpj.replace(/\D/g, '')
  if (numeros.length !== 14) return cnpj
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function formatarCPF(cpf) {
  if (!cpf) return ''
  const numeros = cpf.replace(/\D/g, '')
  if (numeros.length !== 11) return cpf
  return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

export function formatarChaveAcesso(chave) {
  if (!chave) return ''
  const numeros = chave.replace(/\D/g, '')
  if (numeros.length !== 44) return chave
  return numeros.replace(/(\d{4})/g, '$1 ').trim()
}

export function formatarChaveAcessoResumida(chave) {
  if (!chave) return ''
  const numeros = chave.replace(/\D/g, '')
  if (numeros.length !== 44) return chave
  return `${numeros.slice(0, 5)}...${numeros.slice(-6)}`
}

export function formatarCEP(cep) {
  if (!cep) return ''
  const numeros = cep.replace(/\D/g, '')
  if (numeros.length !== 8) return cep
  return numeros.replace(/^(\d{5})(\d{3})$/, '$1-$2')
}

export function mascaraCNPJ(input) {
  let numeros = input.replace(/\D/g, '')
  if (numeros.length > 14) numeros = numeros.slice(0, 14)
  
  if (numeros.length <= 2) return numeros
  if (numeros.length <= 5) return numeros.replace(/^(\d{2})(\d{0,3})/, '$1.$2')
  if (numeros.length <= 8) return numeros.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3')
  if (numeros.length <= 12) return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4')
  return numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5')
}

export function mascaraCPF(input) {
  let numeros = input.replace(/\D/g, '')
  if (numeros.length > 11) numeros = numeros.slice(0, 11)
  
  if (numeros.length <= 3) return numeros
  if (numeros.length <= 6) return numeros.replace(/^(\d{3})(\d{0,3})/, '$1.$2')
  if (numeros.length <= 9) return numeros.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
  return numeros.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4')
}

export function mascaraCEP(input) {
  let numeros = input.replace(/\D/g, '')
  if (numeros.length > 8) numeros = numeros.slice(0, 8)
  
  if (numeros.length <= 5) return numeros
  return numeros.replace(/^(\d{5})(\d{0,3})/, '$1-$2')
}

export function removerMascara(texto) {
  if (!texto) return ''
  return texto.replace(/\D/g, '')
}

