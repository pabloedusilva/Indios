// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Card de Impostos do Período
// ════════════════════════════════════════════════════════════════════════════
// Exibe cálculo detalhado de impostos aproximados para o período selecionado
// ════════════════════════════════════════════════════════════════════════════

import {
  MdAccountBalance,
  MdAttachMoney,
  MdTrendingUp,
  MdInfo,
  MdExpandMore,
  MdExpandLess,
  MdWarning,
} from 'react-icons/md'
import { formatarMoeda } from '../../utils/formatters'
import { useState } from 'react'

export default function CardImpostosPeriodo({ dados, loading }) {
  const [expandido, setExpandido] = useState(false)

  if (loading) {
    return (
      <div className="card space-y-4 h-full flex flex-col animate-pulse">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-5 h-5 bg-brand-border rounded" />
          <div className="h-5 w-40 bg-brand-border rounded" />
        </div>
        <div className="grid grid-cols-3 gap-3 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-brand-border rounded-xl" />
          ))}
        </div>
        <div className="h-10 bg-brand-border rounded-xl flex-shrink-0" />
      </div>
    )
  }

  if (!dados || !dados.totais) {
    return null
  }

  const { totais, regime, quantidadeNotas, receitaBruta12Meses } = dados

  return (
    <div className="card space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MdAccountBalance className="text-brand-orange" size={18} />
          <h2 className="font-semibold text-brand-text text-sm">
            Impostos Estimados do Período
          </h2>
        </div>
        
        {/* Tooltip de Info */}
        <div className="group relative">
          <button className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors">
            <MdInfo className="text-brand-text-3" size={16} />
          </button>
          <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-brand-surface border border-brand-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="flex items-start gap-2">
              <MdWarning className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-xs font-bold text-brand-text mb-1">Valores Estimados</p>
                <p className="text-xs text-brand-text-2 leading-relaxed">
                  Os impostos são calculados de forma aproximada com base no regime tributário.
                  O cálculo exato deve ser feito pelo contador considerando todos os créditos e especificidades.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        {/* Valor Total */}
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
          <div className="flex items-center gap-1.5 mb-1">
            <MdAttachMoney className="text-blue-600 dark:text-blue-400" size={14} />
            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
              Faturamento
            </span>
          </div>
          <p className="text-xl font-bold text-blue-900 dark:text-blue-100 font-heading">
            {formatarMoeda(totais.valorTotal)}
          </p>
          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
            {quantidadeNotas} {quantidadeNotas === 1 ? 'nota' : 'notas'}
          </p>
        </div>

        {/* Total Impostos */}
        <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 rounded-xl border border-red-200 dark:border-red-900/30">
          <div className="flex items-center gap-1.5 mb-1">
            <MdAccountBalance className="text-red-600 dark:text-red-400" size={14} />
            <span className="text-[10px] font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider">
              Impostos
            </span>
          </div>
          <p className="text-xl font-bold text-red-900 dark:text-red-100 font-heading">
            {formatarMoeda(totais.totalImpostos)}
          </p>
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
            {totais.percentualMedio.toFixed(2)}% do faturamento
          </p>
        </div>

        {/* Valor Líquido */}
        <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl border border-green-200 dark:border-green-900/30">
          <div className="flex items-center gap-1.5 mb-1">
            <MdTrendingUp className="text-green-600 dark:text-green-400" size={14} />
            <span className="text-[10px] font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">
              Líquido
            </span>
          </div>
          <p className="text-xl font-bold text-green-900 dark:text-green-100 font-heading">
            {formatarMoeda(totais.totalLiquido)}
          </p>
          <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
            após impostos
          </p>
        </div>
      </div>

      {/* Botão Expandir Detalhes */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-brand-bg transition-colors text-xs font-medium text-brand-text-2 hover:text-brand-text flex-shrink-0"
      >
        <span>Ver detalhamento dos tributos</span>
        {expandido ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
      </button>

      {/* Detalhamento Expandido */}
      {expandido && (
        <div className="space-y-3 pt-3 border-t border-brand-border animate-slide-down flex-1 overflow-auto">
          {/* Regime Tributário */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-text-3">Regime Tributário:</span>
            <span className="font-semibold text-brand-text">{regime || 'Simples Nacional'}</span>
          </div>

          {/* Receita Bruta 12 Meses */}
          {receitaBruta12Meses > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-text-3">Receita Bruta (12 meses):</span>
              <span className="font-semibold text-brand-text">{formatarMoeda(receitaBruta12Meses)}</span>
            </div>
          )}

          {/* Composição dos Impostos */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold text-brand-text-3 uppercase tracking-wider mb-2">
              Composição Estimada dos Impostos
            </p>
            
            {/* Mostrar distribuição dos impostos do período */}
            {dados.notas && dados.notas.length > 0 && dados.notas[0].impostos && dados.notas[0].impostos.impostos && (
              <div className="space-y-2">
                {[
                  { key: 'irpj', nome: 'IRPJ (Imposto de Renda)' },
                  { key: 'csll', nome: 'CSLL (Contrib. Social)' },
                  { key: 'cofins', nome: 'COFINS' },
                  { key: 'pis', nome: 'PIS/PASEP' },
                  { key: 'cpp', nome: 'CPP (Previdência)' },
                  { key: 'icms', nome: 'ICMS' },
                ].map(({ key, nome }) => {
                  // Calcular o total deste imposto para todas as notas do período
                  const valorTotalImposto = dados.notas.reduce((acc, nota) => {
                    const valor = nota.impostos?.impostos?.[key]
                    return acc + (typeof valor === 'number' ? valor : 0)
                  }, 0)
                  
                  // Pular impostos com valor zero
                  if (valorTotalImposto <= 0) return null
                  
                  // Calcular percentual em relação ao faturamento total
                  const percentual = totais.valorTotal > 0 
                    ? (valorTotalImposto / totais.valorTotal) * 100 
                    : 0

                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-brand-text-2 font-medium">{nome}</span>
                          <span className="text-brand-text-3">{percentual.toFixed(2)}%</span>
                        </div>
                        <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-brand rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(percentual * 10, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-brand-text min-w-[70px] text-right">
                        {formatarMoeda(valorTotalImposto)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Observação Legal */}
          <div className="mt-4 p-2.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-xl">
            <div className="flex items-start gap-2">
              <MdWarning className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={14} />
              <div>
                <p className="text-[10px] font-bold text-orange-700 dark:text-orange-300 mb-0.5">Aviso Legal</p>
                <p className="text-[10px] text-orange-700 dark:text-orange-300 leading-relaxed">
                  Os valores apresentados são estimativas calculadas com base no regime tributário e faturamento.
                  Para apuração exata dos impostos devidos, consulte seu contador, que considerará todos os créditos fiscais,
                  deduções e especificidades da sua empresa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
