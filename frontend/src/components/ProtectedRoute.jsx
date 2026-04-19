// =============================================================
//  components/ProtectedRoute.jsx — Guarda de rotas autenticadas
//
//  · Exibe loader enquanto a sessão é verificada
//  · Redireciona para /login se não autenticado
//  · Renderiza o children apenas com sessão válida
// =============================================================

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import PageLoader from './ui/PageLoader'

export default function ProtectedRoute({ children }) {
  const { autenticado, carregando } = useAuth()

  if (carregando) return <PageLoader />
  if (!autenticado) return <Navigate to="/login" replace />

  return children
}
