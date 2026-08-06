// =============================================================
//  components/ui/BannerPagamento.jsx — Banner Informativo
//
//  Exibe lembrete genérico no dia 05 de cada mês sobre pagamento
//  do servidor. Sem funcionalidade de pagamento integrada.
// =============================================================

import { useState, useEffect } from 'react'
import { MdInfo, MdClose } from 'react-icons/md'

// Helper: retorna dia atual no timezone de Brasília
function diaBRT() {
  const agora = new Date()
  const brasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  return brasilia.getDate()
}

// Helper: retorna mês no formato YYYY-MM
function mesAtual() {
  const agora = new Date()
  const brasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const ano = brasilia.getFullYear()
  const mes = String(brasilia.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

const STORAGE_KEY = 'banner_pagamento_fechado'

export default function BannerPagamento() {
  const [mostrar, setMostrar] = useState(false)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const dia = diaBRT()
    const mes = mesAtual()

    // Verifica se o banner foi fechado neste mês
    const fechadoEm = localStorage.getItem(STORAGE_KEY)
    if (fechadoEm === mes) {
      return // Usuário já fechou o banner este mês
    }

    // Mostrar apenas no dia 05
    if (dia === 5) {
      setMostrar(true)
      // Delay para animação suave
      setTimeout(() => setVisivel(true), 100)
    } else {
      // Limpar flag se não é mais dia 05
      if (fechadoEm) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const fecharBanner = () => {
    setVisivel(false)
    setTimeout(() => {
      setMostrar(false)
      // Salvar flag de fechado para este mês
      localStorage.setItem(STORAGE_KEY, mesAtual())
    }, 300)
  }

  if (!mostrar) return null

  return (
    <div
      className={`
        bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30
        border-b border-amber-200 dark:border-amber-800/30
        transition-all duration-300 ease-out
        ${visivel ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Ícone + Mensagem */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <MdInfo className="text-amber-600 dark:text-amber-500" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Lembrete de Pagamento
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Não se esqueça de realizar o pagamento mensal do servidor
              </p>
            </div>
          </div>

          {/* Botão fechar */}
          <button
            onClick={fecharBanner}
            className="p-1.5 rounded-lg hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors flex-shrink-0"
            title="Fechar"
          >
            <MdClose className="text-amber-700 dark:text-amber-400" size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
