import { useEffect, useRef, useState } from 'react'

/* Contador que anima de 0 → value cuando entra en viewport.
   Delight tier (primer vistazo): ~900ms ease-out. Con reduced-motion
   muestra el valor final de inmediato. */

export default function CountUp({ value, className = '', duration = 900 }) {
  const ref = useRef(null)
  const [display, setDisplay] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setDisplay(value)
      return
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !started.current) {
            started.current = true
            io.disconnect()
            const t0 = performance.now()
            const tick = now => {
              const p = Math.min((now - t0) / duration, 1)
              const eased = 1 - Math.pow(1 - p, 3)
              setDisplay(Math.round(value * eased))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  return (
    <div className={className} ref={ref}>
      {display}
    </div>
  )
}
