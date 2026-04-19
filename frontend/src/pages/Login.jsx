// =============================================================
//  pages/Login.jsx — Página de login
//
//  · Fullscreen, sem Layout
//  · Tema claro/escuro via ThemeProvider
//  · Integrado com AuthContext e useLoginForm
// =============================================================

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdVisibility, MdVisibilityOff, MdPerson, MdLock } from 'react-icons/md'
import { useLoginForm } from '../hooks/useLoginForm'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { autenticado, carregando, loginFn } = useAuth()
  const navigate = useNavigate()

  // Se já estiver autenticado, redireciona direto
  useEffect(() => {
    if (!carregando && autenticado) navigate('/dashboard', { replace: true })
  }, [autenticado, carregando, navigate])

  const {
    fields,
    errors,
    loading,
    showSenha,
    handleChange,
    handleSubmit,
    toggleSenha,
  } = useLoginForm({
    loginFn,
    onSuccess: () => navigate('/dashboard', { replace: true }),
  })

  return (
    <div className="relative min-h-screen flex flex-col p-4 overflow-hidden">

      {/* ── Plano de fundo ───────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/sidebar-bg.jpg)' }}
      />
      {/* Overlay para legibilidade — alinha com o estilo da sidebar */}
      <div className="absolute inset-0 bg-brand-bg/80 dark:bg-brand-bg/85" />
      <div className="relative z-10 flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm animate-fade-in">

        {/* ── Formulário ───────────────────────────────────── */}
        <div className="card !p-6 space-y-5">

          {/* ── Logo e título ────────────────────────────────── */}
          <div className="flex flex-col items-center gap-4 pb-1">
            <img
              src="/logo.png"
              alt="Índios Churrasco Gourmet"
              className="w-28 h-28 object-contain drop-shadow-lg dark:drop-shadow-none [filter:drop-shadow(0_4px_16px_rgba(0,0,0,0.45))] dark:[filter:none]"
              draggable={false}
            />
            <div className="text-center">
              <h1 className="font-heading text-2xl font-bold text-brand-text">Login</h1>
              <p className="text-brand-text-3 text-sm mt-1">Acesse sua conta para continuar</p>
            </div>
          </div>

          {/* Erro geral (credenciais inválidas, servidor, etc.) */}
          {errors.geral && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{errors.geral}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Campo: Usuário */}
            <div className="space-y-1.5">
              <label
                htmlFor="usuario"
                className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider"
              >
                Usuário
              </label>
              <div className="relative">
                <MdPerson
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-3 pointer-events-none"
                  size={17}
                />
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={fields.usuario}
                  onChange={handleChange}
                  placeholder="seu usuário"
                  disabled={loading}
                  aria-invalid={!!errors.usuario}
                  aria-describedby={errors.usuario ? 'erro-usuario' : undefined}
                  className={`input-field pl-10 ${
                    errors.usuario
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                      : ''
                  }`}
                />
              </div>
              {errors.usuario && (
                <p id="erro-usuario" className="text-xs text-red-500">{errors.usuario}</p>
              )}
            </div>

            {/* Campo: Senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="senha"
                className="text-[11px] font-semibold text-brand-text-3 uppercase tracking-wider"
              >
                Senha
              </label>
              <div className="relative">
                <MdLock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-3 pointer-events-none"
                  size={17}
                />
                <input
                  id="senha"
                  name="senha"
                  type={showSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={fields.senha}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  aria-invalid={!!errors.senha}
                  aria-describedby={errors.senha ? 'erro-senha' : undefined}
                  className={`input-field pl-10 pr-11 ${
                    errors.senha
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={toggleSenha}
                  tabIndex={-1}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-text-3 hover:text-brand-text transition-colors"
                >
                  {showSenha
                    ? <MdVisibilityOff size={17} />
                    : <MdVisibility    size={17} />
                  }
                </button>
              </div>
              {errors.senha && (
                <p id="erro-senha" className="text-xs text-red-500">{errors.senha}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 mt-1 shadow-brand disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

          </form>
        </div>

      </div>
      </div>

      {/* ── Rodapé ───────────────────────────────────────── */}
      <p className="relative z-10 text-center text-xs text-brand-text-3 pb-2">
        Desenvolvido por{' '}
        <a
          href="https://github.com/pabloedusilva"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-orange underline underline-offset-2 hover:text-brand-orange-dark transition-colors"
        >
          Pablo Silva
        </a>
      </p>

    </div>
  )
}
