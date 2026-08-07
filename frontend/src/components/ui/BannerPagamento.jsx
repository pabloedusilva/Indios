// =============================================================
//  components/ui/BannerPagamento.jsx — Banner Informativo
//
//  Exibe lembrete nos dias 05, 06 e 07 de cada mês sobre pagamento
//  do servidor. Fecha apenas quando usuário clica em "Clique Aqui".
// =============================================================

import { useState, useEffect } from 'react'
import { MdNotifications } from 'react-icons/md'

// CSS para animação de shake sutil
const shakeAnimation = `
  @keyframes shake-subtle {
    0%, 100% { transform: rotate(0deg); }
    10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); }
    20%, 40%, 60%, 80% { transform: rotate(8deg); }
  }
`

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
const PAYMENT_LINK = 'https://invoice.infinitepay.io/plans/pablo_eduardo_/FP1EFXZ0sA'

export default function BannerPagamento() {
  const [mostrar, setMostrar] = useState(false)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const dia = diaBRT()
    const mes = mesAtual()

    // Verifica se o usuário já clicou no botão de pagamento neste mês
    const pagoEm = localStorage.getItem(STORAGE_KEY)
    if (pagoEm === mes) {
      return // Usuário já clicou no pagamento este mês
    }

    // Mostrar nos dias 05, 06 e 07
    if (dia === 5 || dia === 6 || dia === 7) {
      setMostrar(true)
      // Delay para animação suave
      setTimeout(() => setVisivel(true), 100)
    } else {
      // Limpar flag se passou dos dias 05-07
      const pagoEm = localStorage.getItem(STORAGE_KEY)
      if (pagoEm && dia > 7) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const handleCliqueAqui = () => {
    // Salvar no localStorage que o usuário clicou no pagamento
    localStorage.setItem(STORAGE_KEY, mesAtual())
    // Fechar banner com animação
    setVisivel(false)
    setTimeout(() => {
      setMostrar(false)
    }, 300)
    // Abrir link (navegação já é feita pelo <a> tag)
  }

  if (!mostrar) return null

  return (
    <>
      <style>{shakeAnimation}</style>
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
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <MdNotifications 
                className="text-amber-600 dark:text-amber-400 flex-shrink-0" 
                size={24}
                style={{ animation: 'shake-subtle 2s ease-in-out infinite' }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Lembrete de Pagamento
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  Não se esqueça de realizar o pagamento mensal do servidor
                </p>
              </div>
            </div>

            {/* Botão de ação */}
            <a
              href={PAYMENT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCliqueAqui}
              className="px-5 py-2 rounded-xl bg-amber-600 dark:bg-amber-500 hover:bg-amber-700 dark:hover:bg-amber-600 text-white text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md flex-shrink-0"
            >
              Pagar Agora
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
