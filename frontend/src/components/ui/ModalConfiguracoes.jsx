// =============================================================
//  components/ui/ModalConfiguracoes.jsx
//
//  Modal de configurações de conta — alterar usuário e/ou senha.
//  · Senha atual obrigatória para qualquer alteração
//  · Validação completa no frontend antes de enviar
//  · Nenhuma credencial armazenada no estado além do necessário
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MdClose, MdPerson, MdLock, MdVisibility, MdVisibilityOff,
  MdWarning,
} from 'react-icons/md'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import Portal from './Portal'

// ── Componente de campo de input reutilizável ─────────────────
function Campo({ label, id, type = 'text', value, onChange, error, autoComplete, rightSlot, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-brand-text-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`
            w-full px-3.5 py-2.5 pr-${rightSlot ? '10' : '3.5'} rounded-xl border bg-brand-bg text-brand-text
            text-sm placeholder-brand-text-3 transition-all outline-none
            ${error
              ? 'border-red-400 dark:border-red-600 focus:ring-2 focus:ring-red-400/30'
              : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20'
            }
          `}
        />
        {rightSlot && (
          <div className="absolute right-0 top-0 h-full flex items-center pr-3">
            {rightSlot}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
          <MdWarning size={13} /> {error}
        </p>
      )}
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────
export default function ModalConfiguracoes({ isOpen, onClose }) {
  const { usuario, atualizarPerfilFn } = useAuth()
  const overlayRef = useRef(null)

  // ── Campos do formulário ───────────────────────────────────
  const [novoUsuario,   setNovoUsuario]   = useState('')
  const [senhaAtual,    setSenhaAtual]    = useState('')
  const [novaSenha,     setNovaSenha]     = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')

  // ── Visibilidade das senhas ────────────────────────────────
  const [showSenhaAtual,    setShowSenhaAtual]    = useState(false)
  const [showNovaSenha,     setShowNovaSenha]     = useState(false)
  const [showConfirmaSenha, setShowConfirmaSenha] = useState(false)

  // ── Estado da submissão ────────────────────────────────────
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [erroGeral, setErroGeral] = useState('')

  // Inicializa o campo de usuário com o valor atual
  useEffect(() => {
    if (isOpen && usuario) {
      setNovoUsuario(usuario.usuario || '')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmaSenha('')
      setErrors({})
      setErroGeral('')
      setShowSenhaAtual(false)
      setShowNovaSenha(false)
      setShowConfirmaSenha(false)
    }
  }, [isOpen, usuario])

  // Fecha com Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen]) // eslint-disable-line

  const handleClose = useCallback(() => {
    if (loading) return
    onClose()
  }, [loading, onClose])

  // ── Validação local ────────────────────────────────────────
  function validar() {
    const e = {}

    if (!senhaAtual.trim()) {
      e.senhaAtual = 'A senha atual é obrigatória.'
    }

    const usuarioAlterado = novoUsuario.trim() !== (usuario?.usuario || '')
    if (usuarioAlterado) {
      if (novoUsuario.trim().length < 3) e.novoUsuario = 'Mínimo 3 caracteres.'
      else if (novoUsuario.trim().length > 30) e.novoUsuario = 'Máximo 30 caracteres.'
      else if (!/^[a-zA-Z0-9_.-]+$/.test(novoUsuario.trim()))
        e.novoUsuario = 'Apenas letras, números, ponto, traço e underscore.'
    }

    const senhaAlterada = novaSenha.length > 0
    if (senhaAlterada) {
      if (novaSenha.length < 6) e.novaSenha = 'Mínimo 6 caracteres.'
      if (novaSenha !== confirmaSenha) e.confirmaSenha = 'As senhas não coincidem.'
    }

    if (!usuarioAlterado && !senhaAlterada) {
      e.geral = 'Nenhuma alteração detectada.'
    }

    return e
  }

  // ── Envio ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setErroGeral('')

    const errosLocais = validar()
    if (Object.keys(errosLocais).length > 0) {
      setErrors(errosLocais)
      return
    }
    setErrors({})

    const payload = { senhaAtual }
    if (novoUsuario.trim() !== (usuario?.usuario || '')) payload.novoUsuario = novoUsuario.trim()
    if (novaSenha.length > 0) payload.novaSenha = novaSenha

    try {
      setLoading(true)
      await atualizarPerfilFn(payload)
      toast.success('Configurações salvas com sucesso!')
      // Limpa campos de senha após sucesso
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmaSenha('')
    } catch (err) {
      setErroGeral(err.message || 'Erro ao atualizar configurações.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const BotaoOlho = ({ show, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="text-brand-text-3 hover:text-brand-text transition-colors p-0.5"
      aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
    >
      {show ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
    </button>
  )

  return (
    <Portal>
      <div
        ref={overlayRef}
        className="modal-overlay p-4"
        onClick={(e) => { if (e.target === overlayRef.current) handleClose() }}
      >
      <div className="modal-box w-full max-w-md max-h-[90vh] flex flex-col">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <h2 className="font-heading text-lg font-bold text-brand-text">Configurações</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-brand-text-3
                       hover:text-brand-text hover:bg-brand-bg transition-all disabled:opacity-40"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Feedback de sucesso */}

          {/* Erro geral */}
          {erroGeral && (
            <div className="mb-5 flex items-center gap-3 bg-red-50 dark:bg-red-950/30
                            border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3">
              <MdWarning className="text-red-500 shrink-0" size={20} />
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">{erroGeral}</p>
            </div>
          )}

          {errors.geral && (
            <div className="mb-5 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30
                            border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
              <MdWarning className="text-amber-500 shrink-0" size={20} />
              <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">{errors.geral}</p>
            </div>
          )}

          <form id="form-config" onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* ── Seção: Dados da conta ──────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdPerson size={15} className="text-brand-text-3" />
                <p className="text-[11px] font-bold text-brand-text-3 uppercase tracking-wider">
                  Dados da Conta
                </p>
              </div>
              <Campo
                label="Nome de usuário"
                id="novoUsuario"
                value={novoUsuario}
                onChange={(e) => { setNovoUsuario(e.target.value); setErrors((p) => ({ ...p, novoUsuario: '' })) }}
                error={errors.novoUsuario}
                autoComplete="username"
                placeholder="Seu nome de usuário"
              />
            </div>

            {/* Divisor */}
            <div className="border-t border-brand-border" />

            {/* ── Seção: Alterar Senha ───────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdLock size={15} className="text-brand-text-3" />
                <p className="text-[11px] font-bold text-brand-text-3 uppercase tracking-wider">
                  Alterar Senha
                </p>
              </div>
              <div className="space-y-3">
                <Campo
                  label="Nova senha"
                  id="novaSenha"
                  type={showNovaSenha ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => { setNovaSenha(e.target.value); setErrors((p) => ({ ...p, novaSenha: '' })) }}
                  error={errors.novaSenha}
                  autoComplete="new-password"
                  placeholder="Deixe em branco para não alterar"
                  rightSlot={<BotaoOlho show={showNovaSenha} onToggle={() => setShowNovaSenha((v) => !v)} />}
                />
                <Campo
                  label="Confirmar nova senha"
                  id="confirmaSenha"
                  type={showConfirmaSenha ? 'text' : 'password'}
                  value={confirmaSenha}
                  onChange={(e) => { setConfirmaSenha(e.target.value); setErrors((p) => ({ ...p, confirmaSenha: '' })) }}
                  error={errors.confirmaSenha}
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                  rightSlot={<BotaoOlho show={showConfirmaSenha} onToggle={() => setShowConfirmaSenha((v) => !v)} />}
                />
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-brand-border" />

            {/* ── Confirmação de identidade ──────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdLock size={15} className="text-brand-orange" />
                <p className="text-[11px] font-bold text-brand-text-3 uppercase tracking-wider">
                  Confirmar Identidade
                </p>
              </div>
              <Campo
                label="Senha atual *"
                id="senhaAtual"
                type={showSenhaAtual ? 'text' : 'password'}
                value={senhaAtual}
                onChange={(e) => { setSenhaAtual(e.target.value); setErrors((p) => ({ ...p, senhaAtual: '' })) }}
                error={errors.senhaAtual}
                autoComplete="current-password"
                placeholder="Obrigatória para salvar qualquer alteração"
                rightSlot={<BotaoOlho show={showSenhaAtual} onToggle={() => setShowSenhaAtual((v) => !v)} />}
              />
              <p className="mt-2 text-[11px] text-brand-text-3 leading-relaxed">
                Por segurança, sua senha atual é sempre exigida para confirmar qualquer alteração na conta.
              </p>
            </div>
          </form>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-brand-border flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-brand-text-2
                       hover:bg-brand-surface-2 border border-brand-border transition-all
                       disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-config"
            disabled={loading}
            className="btn-primary px-5 py-2 text-sm gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando…
              </>
            ) : 'Salvar alterações'}
          </button>
        </div>
      </div>
      </div>
    </Portal>
  )
}
