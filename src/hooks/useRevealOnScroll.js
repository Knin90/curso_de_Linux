import { useEffect } from 'react'

// Emil: stagger de entrada — añade `.in` a los elementos [data-reveal]
// dentro del contenedor cuando entran en viewport (una sola vez).
export default function useRevealOnScroll(containerRef) {
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    const els = root.querySelectorAll('[data-reveal]')
    if (!els.length) return
    // Fallback: sin IntersectionObserver, mostrar todo de inmediato
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach(el => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [containerRef])
}
