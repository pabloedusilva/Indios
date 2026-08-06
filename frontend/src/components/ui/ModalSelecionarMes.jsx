// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Modal Selecionar Mês (Genérico)
// ════════════════════════════════════════════════════════════════════════════
// Modal genérico para selecionar mês e ano - reutilizável em múltiplas páginas
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import Modal from './Modal'
import { MdCalendarMonth, MdCheckCircle } from 'react-icons/md'

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export default function ModalSelecionarMes({ 
  isOpen, 
  onClose, 
  mesesDisponiveis, 
  onSelecionar, 
  mesAtual,
  titulo = "Selecionar Período" 
}) {
  const [anoSelecionado, setAnoSelecionado] = useState(() => {
    if (mesAtual) {
      const [ano] = mesAtual.split('-')
      return parseInt(ano)
    }
    return new Date().getFullYear()
  })
  
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    if (mesAtual) {
      const [, mes] = mesAtual.split('-')
      return parseInt(mes) - 1
    }
    return new Date().getMonth()
  })

  // Extrair anos disponíveis dos meses
  const anosDisponiveis = [...new Set(
    mesesDisponiveis.map(m => {
      const [ano] = m.mes.split('-')
      return parseInt(ano)
    })
  )].sort((a, b) => b - a)

  // Verificar se um mês específico tem dados
  const mesTemDados = (mes) => {
    const mesStr = `${anoSelecionado}-${String(mes + 1).padStart(2, '0')}`
    return mesesDisponiveis.some(m => m.mes === mesStr)
  }

  const handleSelecionar = () => {
    const mesStr = `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}`
    onSelecionar(mesStr)
    onClose()
  }

  const mesSelecionadoStr = `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}`
  const temDados = mesesDisponiveis.some(m => m.mes === mesSelecionadoStr)
  const mesInfo = mesesDisponiveis.find(m => m.mes === mesSelecionadoStr)
  const qtdRegistros = mesInfo ? (mesInfo.total || mesInfo.totalPedidos || mesInfo.quantidade || 0) : 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titulo} size="lg">
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

        {/* Info do mês selecionado */}
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
                {temDados && mesInfo
                  ? `${qtdRegistros} ${qtdRegistros === 1 ? 'registro' : 'registros'}`
                  : 'Nenhum registro neste período'
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
