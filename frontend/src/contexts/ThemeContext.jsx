import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

// ── Helpers de cookie ────────────────────────────────────────
// O cookie `theme` permite que páginas pré-autenticação (ex: Login)
// também leiam e apliquem a preferência de tema do usuário.

function getThemeCookie() {
  const match = document.cookie.match(/(?:^|; )theme=([^;]*)/)
  const val = match ? decodeURIComponent(match[1]) : null
  return val === 'dark' || val === 'light' ? val : null
}

function setThemeCookie(value) {
  const expires = new Date(Date.now() + 365 * 864e5).toUTCString()
  document.cookie = `theme=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`
}

// ── Provider ─────────────────────────────────────────────────

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return getThemeCookie() || localStorage.getItem('theme') || 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
    setThemeCookie(theme)
  }, [theme])

  const toggleTheme = (event) => {
    const next = theme === 'light' ? 'dark' : 'light'

    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(next)
      return
    }

    // Posição do clique para o círculo expandir a partir do botão
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = Math.round(rect.left + rect.width / 2)
      const y = Math.round(rect.top + rect.height / 2)
      document.documentElement.style.setProperty('--vt-x', `${x}px`)
      document.documentElement.style.setProperty('--vt-y', `${y}px`)
    }

    document.startViewTransition(() => {
      setTheme(next)
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
