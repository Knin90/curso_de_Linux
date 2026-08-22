import { useLayoutEffect, useState } from 'react'

const STORAGE_KEY = 'od-zoom'
const STEPS = [90, 100, 110, 125, 150]
const DEFAULT_ZOOM = 100

function getInitialZoom() {
  if (typeof window === 'undefined') return DEFAULT_ZOOM
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    if (STEPS.includes(stored)) return stored
  } catch {
    /* noop */
  }
  return DEFAULT_ZOOM
}

// Zoom de página completa (no solo diagramas): un botón que recorre pasos
// fijos en porcentaje y aplica `zoom` al elemento raíz — layout real, no un
// scale() que desborda ni afecta solo una parte de la UI.
export default function ZoomControl() {
  const [zoom, setZoom] = useState(getInitialZoom)

  useLayoutEffect(() => {
    document.documentElement.style.zoom = `${zoom}%`
  }, [zoom])

  const handleClick = () => {
    const i = STEPS.indexOf(zoom)
    const next = STEPS[(i + 1) % STEPS.length]
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      /* noop */
    }
    setZoom(next)
  }

  return (
    <button
      className="zoom-toggle"
      type="button"
      onClick={handleClick}
      aria-label={`Zoom de la página: ${zoom}%. Click para cambiar.`}
      title="Zoom de la página"
    >
      {zoom}%
    </button>
  )
}
