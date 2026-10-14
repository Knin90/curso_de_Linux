import { useEffect, useRef, useState } from 'react'

/* ============================================================
   Figura interactiva generada con la skill «anatomy».
   Un bloque ```anatomy del contenido trae un JSON:
     { "src": "permisos-octal", "title": "Permisos en octal" }
   La página se compila en public/figuras/<src>.html (oscuro) y
   <src>-light.html (claro) con `npm run figuras`.
   ============================================================ */

const isDark = () =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'

export function isAnatomyBlock(lang) {
  return lang === 'anatomy'
}

export default function AnatomyFigure({ code }) {
  let spec = null
  try {
    spec = JSON.parse(code)
  } catch {
    /* bloque mal formado: no se pinta */
  }
  const frame = useRef(null)
  const [dark, setDark] = useState(isDark)
  const [height, setHeight] = useState(560)

  // Sigue el tema del sitio (ThemeToggle cambia data-theme en <html>).
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    // El tema puede haberse aplicado entre el render y este efecto.
    setDark(isDark())
    return () => observer.disconnect()
  }, [])

  // La figura avisa de su altura con postMessage para no tener scroll interno.
  useEffect(() => {
    const onMessage = event => {
      if (event.source !== frame.current?.contentWindow) return
      const h = event.data?.height
      if (typeof h === 'number' && h > 0) setHeight(h)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!spec?.src || !/^[a-z0-9-]+$/.test(spec.src)) return null
  const file = `${import.meta.env.BASE_URL}figuras/${spec.src}${dark ? '' : '-light'}.html`

  return (
    <figure className="b module-figure anatomy-figure">
      <iframe
        ref={frame}
        src={file}
        title={spec.title || 'Figura interactiva'}
        loading="lazy"
        style={{ height }}
      />
    </figure>
  )
}
