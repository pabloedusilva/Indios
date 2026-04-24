import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BannerPixPayment from '../ui/BannerPixPayment'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    </div>
  )
}
