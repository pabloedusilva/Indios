// ════════════════════════════════════════════════════════════════════════════
// PÁGINA: Contabilidade (Nova Implementação com Integração Backend)
// ════════════════════════════════════════════════════════════════════════════
// Página completa de gerenciamento de notas fiscais eletrônicas com
// visualização por períodos (últimos 3 meses + seletor de período)
// ════════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNotasFiscais } from '../hooks/useNotasFiscais'
import { useApp } from '../contexts/AppContext'
import { formatarMoeda } from '../utils/formatters'
import * as notasFiscaisService from '../services/notasFiscaisService'
import { toast } from '../utils/toastWithSound'
import {
  MdReceipt,
  MdAttachMoney,
  MdArticle,
  MdRefresh,
  MdWarning,
  MdCheckCircle,
  MdCalendarMonth,
  MdMoreTime,
  MdSearch,
  MdClear,
  MdDownload,
  MdFilterList,
  MdInfo,
} from 'react-icons/md'

// Importar componentes
import {
  CardNotaFiscal,
  ModalVisualizarNota,
  ModalCancelarNota,
  ModalSelecionarPeriodo,
  NotaFiscalSkeleton,
  EmptyStateNotas,
  EstatisticasNotas,
  CardImpostosPeriodo,
} from '../components/contabilidade'

import { KpiCard } from '../components/common'

// ── Helpers ───────────────────────────────────────────────────

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const FILTROS_STATUS = [
  { id: 'todos',      label: 'Todos' },
  { id: 'autorizada', label: 'Autorizadas' },
  { id: 'emitindo',   label: 'Processando' },
  { id: 'cancelada',  label: 'Canceladas' },
  { id: 'erro',       label: 'Com Erro' },
]

function nomeMes(mesStr) {
  if (!mesStr) return ''
  const [, m] = mesStr.split('-')
  return MESES_PT[parseInt(m, 10) - 1] || mesStr
}

function nomeMesAbrev(mesStr) {
  if (!mesStr) return ''
  const [ano, m] = mesStr.split('-')
  const nome = MESES_PT[parseInt(m, 10) - 1] || m
  return `${nome.slice(0, 3)} ${ano}`
}

export default function Contabilidade() {
  // Hooks
  const {
    notas,
    loading,
    error,
    cancelar,
    consultarStatus,
    downloadXML,
    downloadDANFE,
    downloadMesZip,
    refetch,
    stats,
    buscarPorId,
    notasPorMes,
  } = useNotasFiscais()
  
  // Estado global de download
  const { baixandoZip, setBaixandoZip, erroDownloadZip, setErroDownloadZip } = useApp()

  // Estados
  const [modalVisualizar, setModalVisualizar] = useState(null)
  const [modalCancelar, setModalCancelar] = useState(null)
  const [modalPeriodo, setModalPeriodo] = useState(false)
  const [mesSelecionado, setMesSelecionado] = useState(null)
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [estatisticasMes, setEstatisticasMes] = useState(null)
  const [loadingEstatisticas, setLoadingEstatisticas] = useState(false)
  const [impostosPeriodo, setImpostosPeriodo] = useState(null)
  const [loadingImpostos, setLoadingImpostos] = useState(false)
  const [atualizandoTudo, setAtualizandoTudo] = useState(false)

  // Calcular períodos disponíveis (ordenados do mais recente para o mais antigo)
  const periodosDisponiveis = useMemo(() => {
    const periodos = Object.keys(notasPorMes)
      .map(periodo => ({
        periodo,
        quantidade: notasPorMes[periodo].length,
        notas: notasPorMes[periodo],
      }))
      .sort((a, b) => b.periodo.localeCompare(a.periodo))
    return periodos
  }, [notasPorMes])

  // Últimos 3 meses
  const ultimos3Meses = useMemo(() => {
    return periodosDisponiveis.slice(0, 3)
  }, [periodosDisponiveis])

  // Definir mês atual automaticamente (mais recente)
  const mesAtual = useMemo(() => {
    return periodosDisponiveis.length > 0 ? periodosDisponiveis[0].periodo : null
  }, [periodosDisponiveis])

  // Mês ativo (selecionado ou atual)
  const mesAtivo = mesSelecionado || mesAtual

  // Função para buscar estatísticas e impostos
  const buscarDadosPeriodo = useCallback(async (periodo) => {
    if (!periodo) return
    
    // Buscar estatísticas
    setLoadingEstatisticas(true)
    try {
      const stats = await notasFiscaisService.obterEstatisticasPorPeriodo(periodo)
      setEstatisticasMes(stats)
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      setEstatisticasMes(null)
    } finally {
      setLoadingEstatisticas(false)
    }

    // Buscar cálculo de impostos
    setLoadingImpostos(true)
    try {
      const impostos = await notasFiscaisService.calcularImpostosPeriodo(periodo)
      setImpostosPeriodo(impostos)
    } catch (error) {
      console.error('Erro ao buscar impostos:', error)
      setImpostosPeriodo(null)
    } finally {
      setLoadingImpostos(false)
    }
  }, [])

  // Buscar estatísticas do mês ativo quando ele muda
  useEffect(() => {
    buscarDadosPeriodo(mesAtivo)
  }, [mesAtivo, buscarDadosPeriodo])

  // Função para atualizar tudo
  const atualizarTudo = useCallback(async () => {
    setAtualizandoTudo(true)
    try {
      // 1. Recarregar todas as notas
      await refetch()
      
      // 2. Recarregar estatísticas e impostos do período ativo
      await buscarDadosPeriodo(mesAtivo)
    } catch (error) {
      console.error('Erro ao atualizar:', error)
    } finally {
      setAtualizandoTudo(false)
    }
  }, [refetch, mesAtivo, buscarDadosPeriodo])

  // Atualizar automaticamente quando notas mudarem (ex: status atualizado via polling)
  useEffect(() => {
    // Debounce para evitar múltiplas atualizações consecutivas
    const timeoutId = setTimeout(() => {
      if (mesAtivo && !loading && !atualizandoTudo) {
        buscarDadosPeriodo(mesAtivo)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [notas, mesAtivo, loading, atualizandoTudo, buscarDadosPeriodo, notasPorMes])

  // Notas filtradas pelo mês ativo
  const notasFiltradas = useMemo(() => {
    if (!mesAtivo || !notasPorMes[mesAtivo]) return []
    
    let notas = notasPorMes[mesAtivo].sort((a, b) => 
      new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    )

    // Aplicar filtro de status
    if (filtroStatus !== 'todos') {
      notas = notas.filter(nota => nota.status === filtroStatus)
    }

    // Aplicar busca se houver termo
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase().trim()
      notas = notas.filter(nota => {
        // Buscar por protocolo SEFAZ
        const protocolo = (nota.protocolo || '').toLowerCase()
        if (protocolo.includes(termo)) return true

        // Buscar por chave de acesso
        const chave = (nota.chaveAcesso || '').toLowerCase()
        if (chave.includes(termo)) return true

        return false
      })
    }

    return notas
  }, [mesAtivo, notasPorMes, termoBusca, filtroStatus])

  // Contar notas autorizadas do mês ativo (sem filtros)
  const notasAutorizadasMes = useMemo(() => {
    if (!mesAtivo || !notasPorMes[mesAtivo]) return 0
    return notasPorMes[mesAtivo].filter(n => n.status === 'autorizada').length
  }, [mesAtivo, notasPorMes])

  // Verificar se há filtros ativos
  const filtrosAtivos = termoBusca !== '' || filtroStatus !== 'todos'
  
  const limparFiltros = () => {
    setTermoBusca('')
    setFiltroStatus('todos')
  }

  // Handlers
  const handleVisualizarNota = async (notaId) => {
    try {
      const notaCompleta = await notasFiscaisService.buscarPorId(notaId)
      if (notaCompleta) {
        setModalVisualizar(notaCompleta)
      }
    } catch (error) {
      const nota = buscarPorId(notaId)
      if (nota) {
        setModalVisualizar(nota)
      }
    }
  }

  const handleCancelarNota = (notaId) => {
    const nota = buscarPorId(notaId)
    if (nota) {
      setModalCancelar(nota)
    }
  }

  const handleConfirmarCancelamento = async (notaId, motivo) => {
    try {
      await cancelar(notaId, motivo)
      setModalCancelar(null)
      setModalVisualizar(null) // Fechar também o modal de visualização
      toast.success('Nota fiscal cancelada com sucesso!')
      
      // Atualizar tudo após cancelamento
      await atualizarTudo()
    } catch (err) {
      throw err
    }
  }

  const handleConsultarStatus = async (notaId) => {
    try {
      await consultarStatus(notaId)
      
      // Atualizar estatísticas e impostos após consulta
      await buscarDadosPeriodo(mesAtivo)
    } catch (error) {
      toast.error(error.message || 'Erro ao consultar status')
    }
  }

  const handleSelecionarPeriodo = (periodo) => {
    setMesSelecionado(periodo)
    setModalPeriodo(false)
  }

  const handleLimparPeriodo = () => {
    setPeriodoSelecionado(null)
  }

  const handleDownloadZipMes = async () => {
    if (!mesAtivo) return
    
    if (notasAutorizadasMes === 0) {
      toast.error('Não há notas autorizadas para baixar neste período')
      return
    }

    // Validar se pode baixar (dia 2 ou posterior para o mês atual)
    const podeBAixar = podeBaixarBackup(mesAtivo)
    if (!podeBAixar.permitido) {
      toast.error(podeBAixar.mensagem)
      return
    }

    setBaixandoZip(true)
    setErroDownloadZip(false)
    try {
      await downloadMesZip(mesAtivo)
      toast.success('Download concluído com sucesso!')
    } catch (error) {
      setErroDownloadZip(true)
      toast.error(error.message || 'Erro ao baixar backup')
    } finally {
      setBaixandoZip(false)
    }
  }

  // Verificar se pode baixar backup do período
  const podeBaixarBackup = (periodo) => {
    if (!periodo) return { permitido: false, mensagem: 'Período inválido' }
    
    const hoje = new Date()
    const [ano, mes] = periodo.split('-').map(Number)
    
    // Criar data do período (dia 1)
    const dataPeriodo = new Date(ano, mes - 1, 1)
    
    // Criar data do dia 2 do mês seguinte ao período
    const dataLiberacao = new Date(ano, mes, 2) // mês seguinte, dia 2
    
    // Se hoje é antes da data de liberação, bloquear
    if (hoje < dataLiberacao) {
      return {
        permitido: false,
        mensagem: 'Backup estará disponível a partir do dia 2 do próximo mês'
      }
    }
    
    return { permitido: true, mensagem: '' }
  }

  // Verificar status do botão de download para o mês ativo
  const statusDownloadMesAtivo = useMemo(() => {
    return podeBaixarBackup(mesAtivo)
  }, [mesAtivo])

  // Loading
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-brand-border animate-pulse rounded-xl" />
          <div className="h-10 w-32 bg-brand-border animate-pulse rounded-xl" />
        </div>
        
        {/* KPIs skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>

        {/* Lista skeleton */}
        <NotaFiscalSkeleton count={8} />
      </div>
    )
  }

  // Erro
  if (error) {
    return (
      <div className="-m-5 lg:-m-7 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <MdWarning className="text-brand-red" size={24} />
          </div>
          <p className="text-brand-text-2 text-sm">{error}</p>
          <button onClick={refetch} className="btn-primary px-4 py-2 text-sm gap-1.5">
            <MdRefresh size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // Sem notas fiscais
  if (periodosDisponiveis.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-brand-text">
            Contabilidade
          </h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3 flex items-center gap-1.5">
              <MdArticle size={13} /> Total de Notas
            </span>
            <p className="text-2xl font-bold text-brand-text font-heading">0</p>
            <p className="text-xs text-brand-text-3">notas emitidas</p>
          </div>

          <div className="card flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3 flex items-center gap-1.5">
              <MdAttachMoney size={13} /> Faturamento
            </span>
            <p className="text-2xl font-bold text-brand-text font-heading">{formatarMoeda(0)}</p>
            <p className="text-xs text-brand-text-3">notas autorizadas</p>
          </div>

          <div className="card flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3 flex items-center gap-1.5">
              <MdCheckCircle size={13} /> Autorizadas
            </span>
            <p className="text-2xl font-bold text-brand-text font-heading">0</p>
            <p className="text-xs text-brand-text-3">processadas pela SEFAZ</p>
          </div>

          <div className="card flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-3 flex items-center gap-1.5">
              <MdReceipt size={13} /> Pendentes
            </span>
            <p className="text-2xl font-bold text-brand-text font-heading">0</p>
            <p className="text-xs text-brand-text-3">aguardando processamento</p>
          </div>
        </div>

        <EmptyStateNotas tipo="nenhuma" />
      </div>
    )
  }

  // Página principal com dados
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-brand-text">
            Contabilidade
          </h1>
          <p className="text-sm text-brand-text-3 mt-0.5">
            Gerenciamento de Notas Fiscais Eletrônicas
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            onClick={atualizarTudo}
            disabled={atualizandoTudo}
            title="Atualizar"
            className="p-2 rounded-xl text-brand-text-3 hover:text-brand-text hover:bg-brand-surface border border-brand-border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdRefresh size={16} className={atualizandoTudo ? 'animate-spin' : ''} />
          </button>

          {/* Tabs dos últimos 3 meses */}
          {ultimos3Meses.length > 0 && (
            <div className="flex gap-1.5 p-1 bg-brand-surface rounded-xl border border-brand-border shadow-sm">
              {ultimos3Meses.map((m) => (
                <button
                  key={m.periodo}
                  onClick={() => setMesSelecionado(m.periodo)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    mesAtivo === m.periodo
                      ? 'bg-gradient-brand text-white shadow-brand'
                      : 'text-brand-text-2 hover:text-brand-text hover:bg-brand-bg'
                  }`}
                >
                  {nomeMesAbrev(m.periodo)}
                </button>
              ))}
            </div>
          )}

          {/* Botão Ver Todos */}
          {periodosDisponiveis.length > 0 && (
            <button
              onClick={() => setModalPeriodo(true)}
              className="btn-secondary gap-2 text-xs py-2 px-3"
            >
              <MdMoreTime size={14} />
              Ver Todos
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards - Filtrados por Período */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={MdArticle}
          label="Total de Notas"
          value={estatisticasMes?.totalNotas || 0}
          type="number"
          subtitle="notas no período"
          color="blue"
        />

        <KpiCard
          icon={MdAttachMoney}
          label="Faturamento"
          value={estatisticasMes?.faturamento || 0}
          type="money"
          subtitle="notas autorizadas"
          color="orange"
        />

        <KpiCard
          icon={MdCheckCircle}
          label="Autorizadas"
          value={estatisticasMes?.autorizadas || 0}
          type="number"
          subtitle="processadas pela SEFAZ"
          color="green"
        />

        <KpiCard
          icon={MdReceipt}
          label="Pendentes"
          value={estatisticasMes?.emitindo || 0}
          type="number"
          subtitle="aguardando processamento"
          color="gray"
        />
      </div>

      {/* Seção de Estatísticas e Impostos - Lado a Lado */}
      {mesAtivo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Estatísticas de Status do Mês */}
          <EstatisticasNotas 
            stats={estatisticasMes} 
            loading={loadingEstatisticas} 
          />

          {/* Card de Impostos do Período */}
          {notasAutorizadasMes > 0 ? (
            <CardImpostosPeriodo 
              dados={impostosPeriodo} 
              loading={loadingImpostos} 
            />
          ) : (
            <div className="card flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                <MdAttachMoney className="text-brand-orange" size={24} />
              </div>
              <div className="max-w-md">
                <p className="font-semibold text-brand-text mb-1 text-sm">
                  Sem notas autorizadas
                </p>
                <p className="text-xs text-brand-text-3 leading-relaxed">
                  O cálculo de impostos será exibido quando houver notas autorizadas no período
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <MdFilterList className="text-brand-orange" size={17} />
          <h2 className="font-semibold text-brand-text text-sm">Filtros</h2>
          {filtrosAtivos && (
            <button
              onClick={limparFiltros}
              className="ml-auto flex items-center gap-1 text-xs text-brand-text-3 hover:text-brand-orange transition-colors"
            >
              <MdClear size={13} /> Limpar
            </button>
          )}
        </div>

        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-3" size={16} />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por protocolo SEFAZ ou chave de acesso..."
            className="input-field pl-10"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-brand-text-3 uppercase tracking-wider font-bold">Status</p>
          <div className="flex gap-2 flex-wrap">
            {FILTROS_STATUS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFiltroStatus(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-spring
                  ${filtroStatus === id
                    ? 'bg-gradient-brand text-white shadow-brand scale-105'
                    : 'bg-brand-bg text-brand-text-2 border border-brand-border hover:border-brand-orange/40 hover:scale-105'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Botão Download ZIP */}
      {mesAtivo && notasAutorizadasMes > 0 && (
        <div className="flex justify-end items-center gap-2 animate-slide-down">
          {/* Tooltip informativo quando bloqueado */}
          {!statusDownloadMesAtivo.permitido && (
            <div className="group relative">
              <button className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors cursor-help">
                <MdInfo className="text-brand-text-3" size={16} />
              </button>
              <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-brand-surface border border-brand-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="flex items-start gap-2">
                  <MdWarning className="text-orange-500 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs font-bold text-brand-text mb-1">Backup Indisponível</p>
                    <p className="text-xs text-brand-text-2 leading-relaxed">
                      O backup estará disponível a partir do dia 2 do próximo mês. O Focus NFe gera os backups no dia 1º de cada mês.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleDownloadZipMes}
            disabled={baixandoZip || !statusDownloadMesAtivo.permitido}
            title={!statusDownloadMesAtivo.permitido ? statusDownloadMesAtivo.mensagem : 'Baixar backup mensal'}
            className={`btn-primary gap-2 transition-smooth ${
              !statusDownloadMesAtivo.permitido 
                ? 'opacity-40 cursor-not-allowed hover:shadow-none' 
                : 'hover:shadow-brand-lg disabled:opacity-60 disabled:cursor-not-allowed'
            }`}
          >
            <MdDownload size={18} />
            {baixandoZip ? 'Gerando ZIP...' : 'Baixar Todas'}
          </button>
        </div>
      )}

      {/* Lista de Notas */}
      {notasFiltradas.length === 0 ? (
        filtrosAtivos ? (
          <div className="card flex flex-col items-center gap-3 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
              <MdSearch className="text-brand-orange" size={28} />
            </div>
            <div className="max-w-md">
              <p className="font-semibold text-brand-text mb-1">
                Nenhuma nota encontrada
              </p>
              <p className="text-sm text-brand-text-3 leading-relaxed">
                Nenhuma nota corresponde aos filtros aplicados
              </p>
            </div>
            <button
              onClick={limparFiltros}
              className="btn-secondary gap-1.5 mt-2"
            >
              <MdClear size={15} />
              Limpar filtros
            </button>
          </div>
        ) : (
          <EmptyStateNotas tipo="nenhuma" />
        )
      ) : (
        <div className="space-y-2">
          {filtrosAtivos && (
            <div className="flex items-center gap-2 px-1 py-2">
              <span className="text-sm text-brand-text-3">
                {notasFiltradas.length} {notasFiltradas.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
              </span>
            </div>
          )}
          {notasFiltradas.map((nota) => (
            <CardNotaFiscal
              key={nota.id}
              nota={nota}
              onVisualizarDetalhes={handleVisualizarNota}
              onCancelar={handleCancelarNota}
              onDownloadXML={downloadXML}
              onDownloadDANFE={downloadDANFE}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      <ModalVisualizarNota
        isOpen={!!modalVisualizar}
        onClose={() => setModalVisualizar(null)}
        nota={modalVisualizar}
        onCancelar={handleCancelarNota}
        onDownloadXML={downloadXML}
        onDownloadDANFE={downloadDANFE}
        onConsultarStatus={handleConsultarStatus}
      />

      <ModalCancelarNota
        isOpen={!!modalCancelar}
        onClose={() => setModalCancelar(null)}
        nota={modalCancelar}
        onConfirmar={handleConfirmarCancelamento}
      />

      <ModalSelecionarPeriodo
        isOpen={modalPeriodo}
        onClose={() => setModalPeriodo(false)}
        periodosDisponiveis={periodosDisponiveis}
        onSelecionar={handleSelecionarPeriodo}
        periodoAtual={mesAtivo}
      />
    </div>
  )
}
