// ════════════════════════════════════════════════════════════════════════════
// utils/impostoCalculator.js — Calculadora de Impostos para NFC-e
// ════════════════════════════════════════════════════════════════════════════
// Calcula impostos aproximados baseados no regime tributário da empresa.
// IMPORTANTE: Valores são ESTIMADOS para fins contábeis. O cálculo exato
// deve ser feito pelo contador considerando todos os fatores específicos.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tabelas do Simples Nacional 2024 - Anexo I (Comércio)
 * Fonte: Resolução CGSN nº 140/2018 com atualizações
 * 
 * Base: Receita Bruta Acumulada nos últimos 12 meses
 */
const SIMPLES_NACIONAL_ANEXO_I = [
  { faixaAte: 180000, aliquota: 4.00, deducao: 0 },
  { faixaAte: 360000, aliquota: 7.30, deducao: 5940 },
  { faixaAte: 720000, aliquota: 9.50, deducao: 13860 },
  { faixaAte: 1800000, aliquota: 10.70, deducao: 22500 },
  { faixaAte: 3600000, aliquota: 14.30, deducao: 87300 },
  { faixaAte: 4800000, aliquota: 19.00, deducao: 378000 }
]

/**
 * Distribuição média dos tributos no Simples Nacional - Anexo I
 * Fonte: Receita Federal do Brasil
 */
const DISTRIBUICAO_TRIBUTOS_ANEXO_I = {
  irpj: 0.05,      // 5% do total
  csll: 0.04,      // 4% do total
  cofins: 0.12,    // 12% do total
  pis: 0.03,       // 3% do total
  cpp: 0.42,       // 42% do total (maior parcela)
  icms: 0.34       // 34% do total
}

/**
 * Alíquotas de ICMS por UF (apenas para referência/backup)
 * Valor médio usado: 18% (padrão para a maioria dos estados)
 */
const ALIQUOTA_ICMS_PADRAO = 18.00

/**
 * Calcular impostos aproximados de uma nota fiscal
 * 
 * @param {object} nota - Dados da nota fiscal
 * @param {number} nota.valorTotal - Valor total da nota
 * @param {number} nota.empresaCrt - CRT da empresa (1=Simples Nacional, 2=Simples Nacional Excesso, 3=Normal)
 * @param {number} nota.receitaBruta12Meses - Receita bruta acumulada últimos 12 meses (para Simples)
 * @param {string} nota.uf - UF da operação (para ICMS)
 * 
 * @returns {object} Objeto com valores dos impostos calculados
 */
function calcularImpostos(nota) {
  const {
    valorTotal = 0,
    empresaCrt = 1, // 1 = Simples Nacional (padrão)
    receitaBruta12Meses = 0,
    uf = 'SP'
  } = nota
  
  // Validações
  if (!valorTotal || valorTotal <= 0) {
    return gerarResultadoVazio()
  }
  
  // Selecionar método de cálculo baseado no CRT
  if (empresaCrt === 1 || empresaCrt === 2) {
    // Simples Nacional
    return calcularSimplesNacional(valorTotal, receitaBruta12Meses)
  } else {
    // Regime Normal (Lucro Real ou Presumido)
    return calcularRegimeNormal(valorTotal, uf)
  }
}

/**
 * Calcular impostos para empresas do Simples Nacional
 * @private
 */
function calcularSimplesNacional(valorTotal, receitaBruta12Meses) {
  // Se não temos receita bruta informada, usar primeira faixa (mais conservador)
  const receitaBruta = receitaBruta12Meses || 0
  
  // Encontrar faixa de enquadramento
  const faixa = SIMPLES_NACIONAL_ANEXO_I.find(f => receitaBruta <= f.faixaAte) 
    || SIMPLES_NACIONAL_ANEXO_I[SIMPLES_NACIONAL_ANEXO_I.length - 1]
  
  // Calcular alíquota efetiva usando a fórmula do Simples Nacional
  // Alíquota Efetiva = ((RBT12 × Aliq) - PD) / RBT12
  // Onde: RBT12 = Receita Bruta últimos 12 meses, Aliq = Alíquota nominal, PD = Parcela a Deduzir
  
  let aliquotaEfetiva
  
  if (receitaBruta > 0) {
    aliquotaEfetiva = ((receitaBruta * faixa.aliquota / 100) - faixa.deducao) / receitaBruta * 100
  } else {
    // Se não temos histórico, usar alíquota da primeira faixa (4%)
    aliquotaEfetiva = 4.00
  }
  
  // Garantir que alíquota não seja negativa
  aliquotaEfetiva = Math.max(aliquotaEfetiva, 0)
  
  // Calcular valor total do Simples Nacional
  const valorSimplesNacional = (valorTotal * aliquotaEfetiva) / 100
  
  // Distribuir entre os tributos usando as proporções do Anexo I
  const impostos = {
    irpj: valorSimplesNacional * DISTRIBUICAO_TRIBUTOS_ANEXO_I.irpj,
    csll: valorSimplesNacional * DISTRIBUICAO_TRIBUTOS_ANEXO_I.csll,
    cofins: valorSimplesNacional * DISTRIBUICAO_TRIBUTOS_ANEXO_I.cofins,
    pis: valorSimplesNacional * DISTRIBUICAO_TRIBUTOS_ANEXO_I.pis,
    cpp: valorSimplesNacional * DISTRIBUICAO_TRIBUTOS_ANEXO_I.cpp,
    icms: valorSimplesNacional * DISTRIBUICAO_TRIBUTOS_ANEXO_I.icms
  }
  
  return {
    regime: 'Simples Nacional',
    faixa: faixa.faixaAte,
    aliquotaNominal: faixa.aliquota,
    aliquotaEfetiva: parseFloat(aliquotaEfetiva.toFixed(2)),
    valorTotal: parseFloat(valorTotal.toFixed(2)),
    impostos: {
      irpj: parseFloat(impostos.irpj.toFixed(2)),
      csll: parseFloat(impostos.csll.toFixed(2)),
      cofins: parseFloat(impostos.cofins.toFixed(2)),
      pis: parseFloat(impostos.pis.toFixed(2)),
      cpp: parseFloat(impostos.cpp.toFixed(2)),
      icms: parseFloat(impostos.icms.toFixed(2))
    },
    totalImpostos: parseFloat(valorSimplesNacional.toFixed(2)),
    valorLiquido: parseFloat((valorTotal - valorSimplesNacional).toFixed(2)),
    percentualImpostos: parseFloat(aliquotaEfetiva.toFixed(2)),
    observacao: 'Valores estimados com base no Simples Nacional Anexo I. ' +
                'Cálculo exato deve ser feito pelo contador considerando todos os créditos e especificidades.'
  }
}

/**
 * Calcular impostos para empresas do Regime Normal
 * @private
 */
function calcularRegimeNormal(valorTotal, uf) {
  // Alíquotas aproximadas para Regime Normal (Lucro Presumido)
  const aliquotas = {
    irpj: 1.20,     // IRPJ: 15% sobre 8% de presunção = 1.2%
    csll: 1.08,     // CSLL: 9% sobre 12% de presunção = 1.08%
    cofins: 3.00,   // COFINS: 3% (regime cumulativo)
    pis: 0.65,      // PIS: 0.65% (regime cumulativo)
    icms: ALIQUOTA_ICMS_PADRAO // ICMS: 18% (padrão)
  }
  
  // Calcular cada imposto
  const impostos = {
    irpj: (valorTotal * aliquotas.irpj) / 100,
    csll: (valorTotal * aliquotas.csll) / 100,
    cofins: (valorTotal * aliquotas.cofins) / 100,
    pis: (valorTotal * aliquotas.pis) / 100,
    icms: (valorTotal * aliquotas.icms) / 100
  }
  
  const totalImpostos = Object.values(impostos).reduce((acc, val) => acc + val, 0)
  const percentualTotal = (totalImpostos / valorTotal) * 100
  
  return {
    regime: 'Regime Normal (Lucro Presumido)',
    faixa: null,
    aliquotaNominal: null,
    aliquotaEfetiva: parseFloat(percentualTotal.toFixed(2)),
    valorTotal: parseFloat(valorTotal.toFixed(2)),
    impostos: {
      irpj: parseFloat(impostos.irpj.toFixed(2)),
      csll: parseFloat(impostos.csll.toFixed(2)),
      cofins: parseFloat(impostos.cofins.toFixed(2)),
      pis: parseFloat(impostos.pis.toFixed(2)),
      cpp: 0, // Não incluído no Regime Normal para comércio
      icms: parseFloat(impostos.icms.toFixed(2))
    },
    totalImpostos: parseFloat(totalImpostos.toFixed(2)),
    valorLiquido: parseFloat((valorTotal - totalImpostos).toFixed(2)),
    percentualImpostos: parseFloat(percentualTotal.toFixed(2)),
    observacao: 'Valores estimados com base no Lucro Presumido. ' +
                'Não considera créditos de ICMS. Cálculo exato deve ser feito pelo contador.'
  }
}

/**
 * Gerar resultado vazio (para casos de erro)
 * @private
 */
function gerarResultadoVazio() {
  return {
    regime: null,
    faixa: null,
    aliquotaNominal: null,
    aliquotaEfetiva: 0,
    valorTotal: 0,
    impostos: {
      irpj: 0,
      csll: 0,
      cofins: 0,
      pis: 0,
      cpp: 0,
      icms: 0
    },
    totalImpostos: 0,
    valorLiquido: 0,
    percentualImpostos: 0,
    observacao: 'Não foi possível calcular os impostos.'
  }
}

/**
 * Calcular receita bruta acumulada dos últimos 12 meses
 * (usado para determinar faixa do Simples Nacional)
 * 
 * @param {Array} notas - Array de notas fiscais dos últimos 12 meses
 * @returns {number} Receita bruta acumulada
 */
function calcularReceitaBruta12Meses(notas) {
  if (!Array.isArray(notas) || notas.length === 0) {
    return 0
  }
  
  // Data limite: 12 meses atrás
  const dataLimite = new Date()
  dataLimite.setMonth(dataLimite.getMonth() - 12)
  
  // Somar apenas notas autorizadas dos últimos 12 meses
  const receitaBruta = notas
    .filter(nota => {
      if (nota.status !== 'autorizada') return false
      
      const dataEmissao = new Date(nota.emitidoEm || nota.autorizadoEm)
      return dataEmissao >= dataLimite
    })
    .reduce((total, nota) => total + parseFloat(nota.valorTotal || nota.valor || 0), 0)
  
  return parseFloat(receitaBruta.toFixed(2))
}

/**
 * Formatar resultado para exibição
 */
function formatarResultado(resultado) {
  if (!resultado || !resultado.regime) {
    return null
  }
  
  return {
    ...resultado,
    impostos: {
      irpj: { nome: 'IRPJ', valor: resultado.impostos.irpj },
      csll: { nome: 'CSLL', valor: resultado.impostos.csll },
      cofins: { nome: 'COFINS', valor: resultado.impostos.cofins },
      pis: { nome: 'PIS/PASEP', valor: resultado.impostos.pis },
      cpp: { nome: 'CPP', valor: resultado.impostos.cpp },
      icms: { nome: 'ICMS', valor: resultado.impostos.icms }
    }
  }
}

module.exports = {
  calcularImpostos,
  calcularReceitaBruta12Meses,
  formatarResultado,
  SIMPLES_NACIONAL_ANEXO_I,
  DISTRIBUICAO_TRIBUTOS_ANEXO_I
}
