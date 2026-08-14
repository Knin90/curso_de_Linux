import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Posición de scroll guardada por ruta (portada de nivel o página de módulo).
// Al volver con atrás/adelante (POP) se restaura; en entradas normales
// («Siguiente módulo», «Siguiente nivel») se arranca desde arriba.
const scrollByPath = new Map()

export default function useScrollMemory() {
  const location = useLocation()
  const navType = useNavigationType()

  useLayoutEffect(() => {
    // Forzar recálculo de layout: scrollTo se limita contra el alto actual y,
    // sin esto, podría usar el alto de la ruta anterior y truncar el salto.
    void document.documentElement.scrollHeight
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null
    if (target) {
      target.scrollIntoView({ block: 'start' })
    } else if (navType === 'POP') {
      window.scrollTo({ top: scrollByPath.get(location.pathname) ?? 0, behavior: 'instant' })
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    // La cleanup guarda la posición de la ruta en curso antes de que cambie el
    // scroll (también al desmontar, p. ej. al volver a la landing).
    return () => {
      scrollByPath.set(location.pathname, window.scrollY)
    }
  }, [location.pathname, location.hash, navType])
}
