// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Modal Selecionar Período
// ════════════════════════════════════════════════════════════════════════════
// Modal para selecionar mês e ano para visualização de notas fiscais.
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import Modal from '../ui/Modal'
import { MdCalendarMonth, MdCheckCircle } from 'react-icons/md'

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function ModalSelecionarPeriodo({ isOpen, onClose, periodosDisponiveis, onSelecionar, periodoAtual }) {
  const [anoSelecionado, setAnoSelecionado] = useState(() => {
    if (periodoAtual) {
      const [ano] = periodoAtual.split('-')
      return parseInt(ano)
    }
    return new Date().getFullYear()
  })
  
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    if (periodoAtual) {
      const [, mes] = periodoAtual.split('-')
      return parseInt(mes) - 1
    }
    return new Date().getMonth()
  })

  // Extrair anos disponíveis dos períodos
  const anosDisponiveis = [...new Set(
    periodosDisponiveis.map(p => {
      const [ano] = p.periodo.split('-')
      return parseInt(ano)
    })
  )].sort((a, b) => b - a)

  // Verificar se um mês específico tem dados
  const mesTemDados = (mes) => {
    const periodoStr = `${anoSelecionado}-${String(mes + 1).padStart(2, '0')}`
    return periodosDisponiveis.some(p => p.periodo === periodoStr)
  }

  const handleSelecionar = () => {
    const periodoStr = `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}`
    onSelecionar(periodoStr)
    onClose()
  }

  const periodoSelecionadoStr = `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}`
  const temDados = periodosDisponiveis.some(p => p.periodo === periodoSelecionadoStr)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Selecionar Período" size="lg">
      <div className="p-6 space-y-6">
        
        {/* Seletor de Ano */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-brand-text-3 uppercase tracking-wider">
            Ano
          </label>
          <div className="flex flex-wrap gap-2">
            {anosDisponiveis.map(ano => (
              <button
                key={ano}
                onClick={() => setAnoSelecionado(ano)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  anoSelecionado === ano
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'bg-brand-surface border border-brand-border text-brand-text-2 hover:text-brand-text hover:bg-brand-bg'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>

        {/* Seletor de Mês */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-brand-text-3 uppercase tracking-wider">
            Mês
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {MESES_PT.map((mes, index) => {
              const temDadosNoMes = mesTemDados(index)
              const isSelecionado = mesSelecionado === index
              
              return (
                <button
                  key={index}
                  onClick={() => setMesSelecionado(index)}
                  disabled={!temDadosNoMes}
                  className={`
                    relative px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                    ${isSelecionado
                      ? 'bg-gradient-brand text-white shadow-brand'
                      : temDadosNoMes
                        ? 'bg-brand-surface border border-brand-border text-brand-text-2 hover:text-brand-text hover:bg-brand-bg'
                        : 'bg-brand-surface border border-brand-border text-brand-text-3 opacity-40 cursor-not-allowed'
                    }
                  `}
                >
                  {mes.slice(0, 3)}
                  {temDadosNoMes && !isSelecionado && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-orange" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Info do período selecionado */}
        <div className={`rounded-xl p-4 border ${
          temDados
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl ${
              temDados
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-amber-100 dark:bg-amber-900/40'
            } flex items-center justify-center`}>
              {temDados ? (
                <MdCheckCircle className="text-emerald-600 dark:text-emerald-400" size={18} />
              ) : (
                <MdCalendarMonth className="text-amber-600 dark:text-amber-400" size={18} />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${
                temDados
                  ? 'text-emerald-900 dark:text-emerald-300'
                  : 'text-amber-900 dark:text-amber-300'
              }`}>
                {MESES_PT[mesSelecionado]} de {anoSelecionado}
              </p>
              <p className={`text-xs ${
                temDados
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}>
                {temDados
                  ? `${periodosDisponiveis.find(p => p.periodo === periodoSelecionadoStr)?.quantidade || 0} ${
                      periodosDisponiveis.find(p => p.periodo === periodoSelecionadoStr)?.quantidade === 1 ? 'nota' : 'notas'
                    } disponível`
                  : 'Nenhuma nota neste período'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3 justify-end pt-4 border-t border-brand-border">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSelecionar}
            disabled={!temDados}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdCheckCircle size={16} />
            Visualizar Período
          </button>
        </div>
      </div>
    </Modal>
  )
}
