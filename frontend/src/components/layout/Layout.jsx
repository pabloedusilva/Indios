import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BannerPixPayment from '../ui/BannerPixPayment'
import ModalSucesso from '../ui/ModalSucesso'
import { usePixPayment } from '../../hooks/usePixPayment'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // O ModalSucesso vive aqui — nunca é desmontado por mudanças no banner
  const { sucesso, fecharSucesso } = usePixPayment()

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <BannerPixPayment />
        <main className="relative flex-1 overflow-y-auto">
          <div className="p-5 lg:p-7 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Modal de sucesso montado no Layout — independente do ciclo de vida do banner */}
      <ModalSucesso isOpen={sucesso} onClose={fecharSucesso} />
    </div>
  )
}
