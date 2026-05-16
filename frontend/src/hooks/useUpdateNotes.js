// =============================================================
//  hooks/useUpdateNotes.js
//
//  Gerencia o ciclo de vida do modal de Update Notes:
//    1. Ao montar, consulta /api/update-notes/latest
//    2. Verifica localStorage para evitar reexibição
//    3. Exibe o modal apenas para atualizações MINOR ou MAJOR não vistas
//    4. Ao fechar, persiste a versão no localStorage
// =============================================================

import { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

// Chave do localStorage: armazena versões já vistas pelo usuário
const LS_KEY = 'update_notes_seen'

// Lê o Set de versões já vistas do localStorage
function getSeenVersions() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

// Persiste uma versão como vista no localStorage
function markSeenLocally(versao) {
  try {
    const seen = getSeenVersions()
    seen.add(versao)
    localStorage.setItem(LS_KEY, JSON.stringify([...seen]))
  } catch {
    // localStorage indisponível — ignora silenciosamente
  }
}

export function useUpdateNotes() {
  const [nota,        setNota]        = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [carregando,  setCarregando]  = useState(false)

  // Busca nota mais recente ao montar
  useEffect(() => {
    let cancelado = false

    async function verificar() {
      setCarregando(true)
      try {
        const data = await api.get('/update-notes/latest')

        if (cancelado || !data) return

        // Verifica se já foi vista localmente
        const seen = getSeenVersions()
        if (seen.has(data.versao)) return

        setNota(data)
        setModalAberto(true)
      } catch {
        // Falha silenciosa — não bloqueia o app
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    verificar()
    return () => { cancelado = true }
  }, [])

  // Fecha o modal e persiste a visualização no localStorage
  const fechar = useCallback(() => {
    if (!nota) return

    setModalAberto(false)
    markSeenLocally(nota.versao)
  }, [nota])

  return { nota, modalAberto, carregando, fechar }
}
