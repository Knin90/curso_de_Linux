import { useLayoutEffect, useState } from 'react'

const STORAGE_KEY = 'od-theme'

function getInitialDark() {
  if (typeof window === 'undefined') return false
  let stored = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* noop */
  }
  if (stored !== null) return stored === 'dark'
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(getInitialDark)

  useLayoutEffect(() => {
    const root = document.documentElement
    if (dark) root.setAttribute('data-theme', 'dark')
    else root.removeAttribute('data-theme')
  }, [dark])

  const handleClick = () => {
    const next = !dark
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      /* noop */
    }
    setDark(next)
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={handleClick}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      <svg className="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg className="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </button>
  )
}
