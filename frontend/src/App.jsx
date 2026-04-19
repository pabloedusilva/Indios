import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './contexts/AppContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
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
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas — sem autenticação */}
          <Route path="/login" element={<Login />} />

          {/* Rotas privadas — AppProvider só monta após autenticação */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <AppProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard"    element={<Dashboard />} />
                      <Route path="/pedidos"      element={<Pedidos />} />
                      <Route path="/pedidos/novo" element={<Pedidos />} />
                      <Route path="/produtos"     element={<Produtos />} />
                      <Route path="/historico"    element={<Historico />} />
                      <Route path="/estatisticas" element={<Estatisticas />} />
                      <Route path="/cardapio"     element={<Cardapio />} />
                      <Route path="*"             element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </AppProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App

