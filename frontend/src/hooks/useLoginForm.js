// =============================================================
//  hooks/useLoginForm.js — Estado e lógica do formulário de login
// =============================================================

import { useState, useCallback } from 'react'

const INITIAL_FIELDS = { usuario: '', senha: '' }
const INITIAL_ERRORS = { usuario: '', senha: '', geral: '' }

/**
 * Gerencia o formulário de login: campos, validação, submissão.
 *
 * @param {{ loginFn: Function, onSuccess?: (usuario: object) => void }} options
 */
export function useLoginForm({ loginFn, onSuccess } = {}) {
  const [fields,    setFields]    = useState(INITIAL_FIELDS)
  const [errors,    setErrors]    = useState(INITIAL_ERRORS)
  const [loading,   setLoading]   = useState(false)
  const [showSenha, setShowSenha] = useState(false)

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '', geral: '' }))
  }, [])

  const validate = useCallback(() => {
    const next = { ...INITIAL_ERRORS }
    let ok = true

    if (!fields.usuario.trim()) {
      next.usuario = 'Informe o usuário'
      ok = false
    }
    if (!fields.senha) {
      next.senha = 'Informe a senha'
      ok = false
    } else if (fields.senha.length < 4) {
      next.senha = 'Senha muito curta'
      ok = false
    }

    setErrors(next)
    return ok
  }, [fields])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const usuario = await loginFn({
        usuario: fields.usuario.trim(),
        senha:   fields.senha,
      })
      onSuccess?.(usuario)
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        geral: err.message || 'Erro ao autenticar. Tente novamente.',
      }))
    } finally {
      setLoading(false)
    }
  }, [fields, validate, loginFn, onSuccess])

  return {
    fields,
    errors,
    loading,
    showSenha,
    handleChange,
    handleSubmit,
    toggleSenha: () => setShowSenha((v) => !v),
  }
}

