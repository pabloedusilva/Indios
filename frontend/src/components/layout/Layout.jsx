import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BannerPagamento from '../ui/BannerPagamento'
import DownloadProgress from '../ui/DownloadProgress'
import ModalUpdateNotes from '../ui/ModalUpdateNotes'
import { useUpdateNotes } from '../../hooks/useUpdateNotes'
import { useApp } from '../../contexts/AppContext'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { nota, modalAberto, fechar: fecharUpdate } = useUpdateNotes()
  const { baixandoZip, setBaixandoZip } = useApp()

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <BannerPagamento />

        <main className="relative flex-1 overflow-y-auto">
          <div className="p-5 lg:p-7 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Modal de novidades — exibido automaticamente em releases MINOR/MAJOR */}
      <ModalUpdateNotes isOpen={modalAberto} onClose={fecharUpdate} nota={nota} />
      
      {/* Indicador de Download Global — persiste entre mudanças de rota */}
      <DownloadProgress 
        isDownloading={baixandoZip}
        onClose={() => setBaixandoZip(false)}
      />
    </div>
  )
}
