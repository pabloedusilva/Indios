import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { ConnectionProvider } from './contexts/ConnectionContext'
import { PixPaymentProvider } from './contexts/PixPaymentContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pedidos from './pages/Pedidos'
import Produtos from './pages/Produtos'
import Historico from './pages/Historico'
import Cardapio from './pages/Cardapio'
import Estatisticas from './pages/Estatisticas'

function App() {
  return (
    <ConnectionProvider>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <AppProvider>
                    {/* PixPaymentProvider envolve o Layout para que Banner,
                        ModalPixPayment e ModalSucesso compartilhem o mesmo estado */}
                    <PixPaymentProvider>
                      <Layout>
                        <Routes>
                          <Route path="/dashboard"    element={<Dashboard />} />
                          <Route path="/pedidos"      element={<Pedidos />} />
                          <Route path="/pedidos/novo" element={<Pedidos />} />
                          <Route path="/produtos"     element={<Produtos />} />
                          <Route path="/historico"    element={<Historico />} />
                          <Route path="/estatisticas" element={<Estatisticas />} />
                          <Route path="/cardapio"     element={<Cardapio />} />
                          <Route path="*"             element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Layout>
                    </PixPaymentProvider>
                  </AppProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </ConnectionProvider>
  )
}

export default App

