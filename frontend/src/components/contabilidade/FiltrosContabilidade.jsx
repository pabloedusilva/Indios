// ════════════════════════════════════════════════════════════════════════════
// COMPONENT: Filtros Contabilidade
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { MdSearch, MdClear, MdFilterList } from 'react-icons/md'

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'emitindo', label: 'Emitindo' },
  { value: 'autorizada', label: 'Autorizada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'erro', label: 'Erro' },
]

const PERIODO_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'hoje', label: 'Hoje' },
  { value: '7dias', label: '7 dias' },
  { value: '30dias', label: '30 dias' },
]

const ORDENACAO_OPTIONS = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'antigas', label: 'Mais antigas' },
  { value: 'maior-valor', label: 'Maior valor' },
  { value: 'menor-valor', label: 'Menor valor' },
]

export default function FiltrosContabilidade({ filtros, onChange, onLimpar }) {
  const handleBuscaChange = (e) => {
    onChange({ ...filtros, busca: e.target.value })
  }

  const handleStatusChange = (status) => {
    onChange({ ...filtros, status })
  }

  const handlePeriodoChange = (periodo) => {
    onChange({ ...filtros, periodo })
  }

  const handleOrdenacaoChange = (e) => {
    onChange({ ...filtros, ordenacao: e.target.value })
  }

  // Contar filtros ativos
  const filtrosAtivos = [
    filtros.busca?.trim(),
    filtros.status && filtros.status !== 'todos',
    filtros.periodo && filtros.periodo !== 'todos',
  ].filter(Boolean).length

  const temFiltrosAtivos = filtrosAtivos > 0

  return (
    <div className="card space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2">
        <MdFilterList className="text-brand-orange" size={17} />
        <h2 className="font-semibold text-brand-text text-sm">Filtros</h2>
        {temFiltrosAtivos && (
          <button
            onClick={onLimpar}
            className="ml-auto flex items-center gap-1 text-xs text-brand-text-3 hover:text-brand-orange transition-colors"
          >
            <MdClear size={13} /> Limpar
          </button>
        )}
      </div>

      {/* Busca (sempre visível) */}
      <div className="relative">
        <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-3" size={16} />
        <input
          type="text"
          placeholder="Buscar por número, chave, destinatário..."
          value={filtros.busca || ''}
          onChange={handleBuscaChange}
          className="input-field pl-10"
        />
      </div>

      {/* Filtros em linha */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status */}
        <div className="space-y-2 flex-1">
          <p className="text-[10px] text-brand-text-3 uppercase tracking-wider font-bold">Status</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filtros.status === opt.value || (!filtros.status && opt.value === 'todos')
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'bg-brand-bg text-brand-text-2 border border-brand-border hover:border-brand-orange/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Período */}
        <div className="space-y-2 flex-1">
          <p className="text-[10px] text-brand-text-3 uppercase tracking-wider font-bold">Período</p>
          <div className="flex gap-2 flex-wrap">
            {PERIODO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePeriodoChange(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filtros.periodo === opt.value || (!filtros.periodo && opt.value === 'todos')
                    ? 'bg-gradient-brand text-white shadow-brand'
                    : 'bg-brand-bg text-brand-text-2 border border-brand-border hover:border-brand-orange/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


