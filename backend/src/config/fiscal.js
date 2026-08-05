// ════════════════════════════════════════════════════════════════════════════
// config/fiscal.js — Configuração centralizada para integração Focus NFe
// ════════════════════════════════════════════════════════════════════════════
// SEGURANÇA:
// - Tokens nunca devem ser expostos em logs ou respostas
// - Usar HTTPS em produção
// - Validar certificados SSL
// - Implementar rate limiting
// ════════════════════════════════════════════════════════════════════════════

require('dotenv').config()

// Carregar variáveis do .env.fiscal se existir
const path = require('path')
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.fiscal') })
} catch (err) {
  console.warn('⚠️  Arquivo .env.fiscal não encontrado. Usando apenas .env')
}

// ── Configuração baseada no ambiente ─────────────────────────────────────
const ENV = process.env.FOCUS_NFE_ENV || 'homologacao'
const IS_PRODUCAO = ENV === 'producao'

// URLs base da API
const API_URLS = {
  homologacao: process.env.FOCUS_NFE_API_HOMOLOGACAO || 'https://homologacao.focusnfe.com.br',
  producao: process.env.FOCUS_NFE_API_PRODUCAO || 'https://api.focusnfe.com.br'
}

const API_BASE_URL = API_URLS[ENV]

// Token de autenticação
const API_TOKEN = process.env.FOCUS_NFE_TOKEN

// Validação obrigatória
if (!API_TOKEN) {
  throw new Error('FOCUS_NFE_TOKEN não configurado no .env ou .env.fiscal')
}

// ── Configuração da empresa ──────────────────────────────────────────────
const EMPRESA_CONFIG = {
  cnpj: process.env.EMPRESA_CNPJ || '66614685000174',
  ie: process.env.EMPRESA_IE || '005520547.00-62',
  razaoSocial: process.env.EMPRESA_RAZAO_SOCIAL || 'INDIOS CHURRASCO GOURMET LTDA',
  nomeFantasia: process.env.EMPRESA_NOME_FANTASIA || 'Índios Churrasco Gourmet',
  crt: parseInt(process.env.EMPRESA_CRT || '1'), // 1=Simples Nacional
  
  // Endereço fiscal
  endereco: {
    logradouro: process.env.EMPRESA_ENDERECO_LOGRADOURO || '',
    numero: process.env.EMPRESA_ENDERECO_NUMERO || '',
    complemento: process.env.EMPRESA_ENDERECO_COMPLEMENTO || '',
    bairro: process.env.EMPRESA_ENDERECO_BAIRRO || '',
    municipio: process.env.EMPRESA_ENDERECO_MUNICIPIO || '',
    uf: process.env.EMPRESA_ENDERECO_UF || 'MG',
    cep: process.env.EMPRESA_ENDERECO_CEP || '',
    codigoMunicipio: process.env.EMPRESA_ENDERECO_CODIGO_MUNICIPIO || ''
  }
}

// ── Configurações NFe ────────────────────────────────────────────────────
const NFE_CONFIG = {
  serie: parseInt(process.env.NFE_SERIE || '1'),
  proximoNumero: parseInt(process.env.NFE_PROXIMO_NUMERO || '1'),
  naturezaOperacao: 'Venda de Mercadoria',
  finalidadeEmissao: '1', // 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução
  indicadorPresenca: '1', // 1=Presencial
  indicadorDestinatario: '1', // 1=Operação interna
  indicadorFinal: '1', // 1=Consumidor final
}

// ── Timeout e Retry ──────────────────────────────────────────────────────
const TIMEOUT_MS = parseInt(process.env.FOCUS_NFE_TIMEOUT || '30000')
const MAX_RETRIES = parseInt(process.env.FOCUS_NFE_MAX_RETRIES || '3')

// ── Debug ────────────────────────────────────────────────────────────────
const DEBUG = process.env.FISCAL_DEBUG === 'true'

// ── Tabela NCM e Tributação (do documento fornecido) ─────────────────────
const TABELA_NCM = {
  // Produtos com Substituição Tributária (ST)
  '1602.50.00': { tipo: 'ST', descricao: 'Carnes e miudezas preparadas' },
  '2103.90.91': { tipo: 'ST', descricao: 'Molhos e condimentos' },
  '2201.10.00': { tipo: 'ST', descricao: 'Águas' },
  '2202.10.00': { tipo: 'ST', descricao: 'Refrigerantes com cola' },
  '2202.99.00': { tipo: 'ST', descricao: 'Outras bebidas não alcoólicas' },
  '2009.41.00': { tipo: 'ST', descricao: 'Suco de abacaxi' },
  '2009.89.90': { tipo: 'ST', descricao: 'Outros sucos' },
  '1602.32.20': { tipo: 'ST', descricao: 'Miudezas de aves' },
  '2203.00.00': { tipo: 'ST', descricao: 'Cervejas e chopes' },
  '1604.19.00': { tipo: 'ST', descricao: 'Peixes preparados' },
  
  // Produtos Tributados
  '2106.90.90': { tipo: 'TRIBUTADO', descricao: 'Preparações alimentícias' },
  '1901.90.90': { tipo: 'TRIBUTADO', descricao: 'Farofas' },
  '0406.90.90': { tipo: 'TRIBUTADO', descricao: 'Queijos' },
  '2004.10.00': { tipo: 'TRIBUTADO', descricao: 'Batatas fritas' },
}

// ── CFOP (Código Fiscal de Operações e Prestações) ──────────────────────
const CFOP_CONFIG = {
  // Produtos Tributados
  TRIBUTADO: {
    entradaEstadual: '1102',
    entradaInterestadual: '2102',
    saidaEstadual: '5102',
    saidaInterestadual: '6102'
  },
  // Produtos com Substituição Tributária
  ST: {
    entradaEstadual: '1403',
    entradaInterestadual: '2403',
    saidaEstadual: '5405',
    saidaInterestadual: '6405'
  }
}

// ── CSOSN (Código de Situação da Operação Simples Nacional) ─────────────
const CSOSN_CONFIG = {
  TRIBUTADO: '102',  // Tributação pelo Simples Nacional sem permissão de crédito
  ST: '500',         // ICMS cobrado anteriormente por substituição tributária
  DEVOLUCAO: '900'   // Outros (devolução)
}

// ── CST PIS/COFINS ───────────────────────────────────────────────────────
const CST_PIS_COFINS = '49' // Outras operações de saída

// ── Exportar configuração ────────────────────────────────────────────────
module.exports = {
  // Ambiente
  ENV,
  IS_PRODUCAO,
  API_BASE_URL,
  API_TOKEN,
  
  // Empresa
  EMPRESA_CONFIG,
  
  // NFe
  NFE_CONFIG,
  
  // Timeouts
  TIMEOUT_MS,
  MAX_RETRIES,
  
  // Debug
  DEBUG,
  
  // Tabelas fiscais
  TABELA_NCM,
  CFOP_CONFIG,
  CSOSN_CONFIG,
  CST_PIS_COFINS,
  
  // Helper: Obter CFOP correto baseado no NCM e tipo de operação
  getCFOP: (ncm, ufDestinatario, ufEmitente = 'MG') => {
    const tipoTributacao = TABELA_NCM[ncm]?.tipo || 'TRIBUTADO'
    const config = CFOP_CONFIG[tipoTributacao]
    
    // Operação estadual (mesmo UF) ou interestadual
    const isInterestadual = ufDestinatario !== ufEmitente
    
    return isInterestadual ? config.saidaInterestadual : config.saidaEstadual
  },
  
  // Helper: Obter CSOSN correto baseado no NCM
  getCSOSN: (ncm) => {
    const tipoTributacao = TABELA_NCM[ncm]?.tipo || 'TRIBUTADO'
    return CSOSN_CONFIG[tipoTributacao]
  },
  
  // Helper: Validar se está configurado corretamente
  validate: () => {
    const errors = []
    
    if (!API_TOKEN) errors.push('FOCUS_NFE_TOKEN não configurado')
    if (!EMPRESA_CONFIG.cnpj) errors.push('EMPRESA_CNPJ não configurado')
    if (!EMPRESA_CONFIG.ie) errors.push('EMPRESA_IE não configurado')
    
    if (IS_PRODUCAO) {
      console.warn('')
      console.warn('═'.repeat(70))
      console.warn('⚠️  ⚠️  ⚠️  ATENÇÃO: AMBIENTE DE PRODUÇÃO ATIVO ⚠️  ⚠️  ⚠️')
      console.warn('⚠️  Notas emitidas terão validade fiscal!')
      console.warn('⚠️  Serão enviadas para a SEFAZ (Receita Federal)!')
      console.warn('⚠️  NÃO podem ser excluídas, apenas canceladas!')
      console.warn('⚠️  Você será cobrado por cada nota emitida!')
      console.warn('═'.repeat(70))
      console.warn('')
    } else {
      console.log('ℹ️  Ambiente: HOMOLOGAÇÃO (testes - sem validade fiscal)')
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuração fiscal inválida:\n- ${errors.join('\n- ')}`)
    }
    
    console.log('✅ Configuração fiscal validada')
    console.log(`   Ambiente: ${ENV}`)
    console.log(`   API: ${API_BASE_URL}`)
    console.log(`   CNPJ: ${EMPRESA_CONFIG.cnpj}`)
    
    return true
  }
}

// Validar configuração ao carregar
if (DEBUG) {
  console.log('\n🔧 Configuração Fiscal:')
  console.log(`   Ambiente: ${ENV}`)
  console.log(`   API: ${API_BASE_URL}`)
  console.log(`   CNPJ: ${EMPRESA_CONFIG.cnpj}`)
  console.log(`   Token: ${API_TOKEN.substring(0, 10)}...`)
  
  if (IS_PRODUCAO) {
    console.log('')
    console.log('⚠️  ═════════════════════════════════════════════════════')
    console.log('⚠️  MODO PRODUÇÃO: Notas terão validade fiscal real!')
    console.log('⚠️  ═════════════════════════════════════════════════════')
  }
  
  console.log('')
}
