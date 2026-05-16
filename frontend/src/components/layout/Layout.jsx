import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BannerPixPayment from '../ui/BannerPixPayment'
import ModalSucesso from '../ui/ModalSucesso'
import ModalBloqueio from '../ui/ModalBloqueio'
import ModalUpdateNotes from '../ui/ModalUpdateNotes'
import { usePixPayment } from '../../hooks/usePixPayment'
import { useUpdateNotes } from '../../hooks/useUpdateNotes'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { sucesso, fecharSucesso, bloqueado } = usePixPayment()
  const { nota, modalAberto, fechar: fecharUpdate } = useUpdateNotes()

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <BannerPixPayment />

        {/* Conteúdo bloqueado via pointer-events quando há bloqueio ativo */}
        <main
          className="relative flex-1 overflow-y-auto"
          style={bloqueado ? { pointerEvents: 'none', userSelect: 'none' } : undefined}
          aria-hidden={bloqueado || undefined}
        >
          <div className="p-5 lg:p-7 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Modal de sucesso — independente do ciclo de vida do banner */}
      <ModalSucesso isOpen={sucesso} onClose={fecharSucesso} />

      {/* Modal de bloqueio — sobrepõe tudo quando prazo expirou sem pagamento */}
      <ModalBloqueio visivel={bloqueado} />

      {/* Modal de novidades — exibido automaticamente em releases MINOR/MAJOR */}
      <ModalUpdateNotes isOpen={modalAberto} onClose={fecharUpdate} nota={nota} />
    </div>
  )
}
