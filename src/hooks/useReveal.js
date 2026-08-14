import { useEffect, useRef, useState } from 'react'

// Reveal on scroll: `inView` pasa a true cuando el elemento (ref) entra en
// viewport, una sola vez. Sin IntersectionObserver, se muestra de inmediato.
export default function useReveal(threshold = 0.2) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            setInView(true)
            io.disconnect()
          }
        })
      },
      { threshold }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return { ref, inView }
}
