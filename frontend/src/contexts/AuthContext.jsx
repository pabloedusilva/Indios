// =============================================================
//  contexts/AuthContext.jsx — Estado global de autenticação
//
//  · Verifica sessão via /api/auth/me ao carregar o app
//  · Expõe: usuario, autenticado, carregando, loginFn, logoutFn
//  · Nunca armazena credenciais ou tokens no localStorage
// =============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as loginService, logout as logoutService, verificarSessao, atualizarConfiguracoes } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario,     setUsuario]     = useState(null)
  const [carregando,  setCarregando]  = useState(true)

  // Verifica se há sessão válida ao montar o app
  useEffect(() => {
    verificarSessao()
      .then((u) => setUsuario(u))
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false))
  }, [])

  const loginFn = useCallback(async (credenciais) => {
    const u = await loginService(credenciais)
    setUsuario(u)
    return u
  }, [])

  const logoutFn = useCallback(async () => {
    try {
      await logoutService()
    } finally {
      setUsuario(null)
    }
  }, [])

  const atualizarPerfilFn = useCallback(async (dados) => {
    const u = await atualizarConfiguracoes(dados)
    setUsuario(u)
    return u
  }, [])

  return (
    <AuthContext.Provider
      value={{
        usuario,
        autenticado: !!usuario,
        carregando,
        loginFn,
        logoutFn,
        atualizarPerfilFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
