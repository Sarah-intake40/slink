import { createContext, useContext, useEffect, useState } from 'react'

// Light/dark theme: persisted in localStorage, applied as data-theme on <html>.
// Dark token overrides live in styles.css under [data-theme="dark"].

const KEY = 'slink-theme'
const ThemeCtx = createContext({ theme: 'light', toggle: () => {} })

export function readTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* ignore */ }
  // fall back to OS preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
