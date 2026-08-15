// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Timeline da Nota Fiscal
// ════════════════════════════════════════════════════════════════════════════
// Timeline visual dos eventos da nota fiscal seguindo padrão do app
// ════════════════════════════════════════════════════════════════════════════

import { MdAdd, MdSend, MdCheckCircle, MdError, MdCancel } from 'react-icons/md'
import { formatarDataHora } from '../../utils/formatters'

export default function TimelineNota({ nota }) {
  const eventos = []
  
  // 1. Criação
  if (nota.criadoEm) {
    eventos.push({
      ordem: 1,
      tipo: 'criada',
      titulo: 'Nota criada',
      descricao: 'Registro inicial no sistema',
      data: nota.criadoEm,
      icone: MdAdd,
      cor: 'blue'
    })
  }
  
  // 2. Emissão
  if (nota.emitidoEm) {
    eventos.push({
      ordem: 2,
      tipo: 'enviada',
      titulo: 'Enviada para SEFAZ',
      descricao: 'Aguardando processamento',
      data: nota.emitidoEm,
      icone: MdSend,
      cor: 'orange'
    })
  }
  
  // 3. Autorização ou Erro
  if (nota.autorizadoEm) {
    eventos.push({
      ordem: 3,
      tipo: 'autorizada',
      titulo: 'Autorizada pela SEFAZ',
      descricao: `Protocolo ${nota.protocolo || '—'}`,
      data: nota.autorizadoEm,
      icone: MdCheckCircle,
      cor: 'green'
    })
  } else if (nota.status === 'erro') {
    eventos.push({
      ordem: 3,
      tipo: 'erro',
      titulo: 'Erro na emissão',
      descricao: nota.metadados?.erro || 'Falha ao processar nota',
      data: nota.atualizadoEm || nota.emitidoEm,
      icone: MdError,
      cor: 'red'
    })
  }
  
  // 4. Cancelamento (opcional)
  if (nota.canceladoEm) {
    eventos.push({
      ordem: 4,
      tipo: 'cancelada',
      titulo: 'Cancelada',
      descricao: nota.motivoCancelamento || 'Nota fiscal cancelada',
      data: nota.canceladoEm,
      icone: MdCancel,
      cor: 'red'
    })
  }
  
  // Ordenar por ordem lógica
  eventos.sort((a, b) => a.ordem - b.ordem)
  
  if (eventos.length === 0) {
    return (
      <div className="text-center py-8 text-brand-text-3 text-sm">
        Nenhum evento registrado
      </div>
    )
  }
  
  const cores = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-900/40',
      icon: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
      line: 'bg-gradient-to-b from-blue-300 to-blue-200 dark:from-blue-800 dark:to-blue-900',
      pulse: 'animate-pulse-ring-blue'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-900/40',
      icon: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20',
      text: 'text-orange-700 dark:text-orange-400',
      line: 'bg-gradient-to-b from-orange-300 to-orange-200 dark:from-orange-800 dark:to-orange-900',
      pulse: 'animate-pulse-ring-orange'
    },
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-900/40',
      icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      line: 'bg-gradient-to-b from-emerald-300 to-emerald-200 dark:from-emerald-800 dark:to-emerald-900',
      pulse: 'animate-pulse-ring-green'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-900/40',
      icon: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-500/20',
      text: 'text-red-700 dark:text-red-400',
      line: 'bg-gradient-to-b from-red-300 to-red-200 dark:from-red-800 dark:to-red-900',
      pulse: 'animate-pulse-ring-red'
    }
  }
  
  return (
    <div className="relative space-y-0">
      {eventos.map((evento, index) => {
        const cor = cores[evento.cor]
        const Icone = evento.icone
        const isLast = index === eventos.length - 1
        
        return (
          <div 
            key={evento.tipo} 
            className="relative pb-6 group"
          >
            {/* Linha conectora */}
            {!isLast && (
              <div className={`absolute left-5 top-11 w-0.5 h-full ${cor.line} rounded-full transition-all duration-200`} />
            )}
            
            {/* Card do evento */}
            <div className="relative flex items-start gap-4">
              {/* Ícone com pulso no último evento */}
              <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-xl ${cor.icon} flex items-center justify-center transform transition-all duration-200 group-hover:scale-105 ${isLast ? cor.pulse : ''}`}>
                <Icone size={18} />
              </div>
              
              {/* Conteúdo */}
              <div className={`flex-1 ${cor.bg} border ${cor.border} rounded-xl p-4 transition-all duration-200 group-hover:shadow-sm`}>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <h4 className={`font-semibold text-sm ${cor.text} transition-colors`}>
                    {evento.titulo}
                  </h4>
                  <span className="text-xs text-brand-text-3 whitespace-nowrap flex-shrink-0">
                    {formatarDataHora(evento.data)}
                  </span>
                </div>
                <p className="text-xs text-brand-text-2 leading-relaxed">
                  {evento.descricao}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
