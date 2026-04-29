// =============================================================
//  services/authService.js — Camada de autenticação
//
//  · Credenciais transitam apenas via HTTPS
//  · Sessão mantida por httpOnly cookie (sem exposição JS)
//  · Sem armazenamento de token em localStorage/sessionStorage
// =============================================================

// URL base do backend (vem do .env)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333'
const BASE = `${API_URL}/api/auth`

/**
 * Realiza o login enviando as credenciais ao servidor.
 * O backend responde setando um httpOnly cookie com o JWT.
 *
 * @param {{ usuario: string, senha: string }} credenciais
 * @returns {Promise<{ id: string, usuario: string }>}
 */
export async function login({ usuario, senha }) {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ usuario, senha }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || 'Credenciais inválidas')
  return data.usuario
}

/**
 * Encerra a sessão, invalidando o cookie de autenticação no servidor.
 * Limpa também o cache de status de pagamento da sessão.
 */
export async function logout() {
  try {
    sessionStorage.removeItem('pix_mes_pago')
  } catch { /* sem suporte */ }
  await fetch(`${BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

/**
 * Verifica a sessão ativa consultando o endpoint protegido.
 * Retorna os dados do usuário ou null se não autenticado.
 *
 * @returns {Promise<{ id: string, usuario: string } | null>}
 */
export async function verificarSessao() {
  try {
    const res = await fetch(`${BASE}/me`, { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    return data.usuario ?? null
  } catch {
    return null
  }
}

/**
 * Atualiza o nome de usuário e/ou senha da conta autenticada.
 * Sempre exige a senha atual para confirmar a identidade.
 *
 * @param {{ senhaAtual: string, novoUsuario?: string, novaSenha?: string }} dados
 * @returns {Promise<{ id: string, usuario: string }>}
 */
export async function atualizarConfiguracoes(dados) {
  const res = await fetch(`${BASE}/configuracoes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(dados),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || 'Erro ao atualizar configurações')
  return data.usuario
}

