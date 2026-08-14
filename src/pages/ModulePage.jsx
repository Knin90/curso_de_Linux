import { useEffect, useMemo, useRef } from 'react'
import { Link, Navigate, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom'
import { flushSync } from 'react-dom'
import { getLevel, levels, stages } from '../registry'
import { contentRegistry } from '../content/contentRegistry'
import ModuleContent from '../components/level/LevelContent'
import ThemeToggle from '../components/ThemeToggle'
import ReadingProgress from '../components/ReadingProgress'
import useLevelProgress from '../hooks/useLevelProgress'
import useScrollMemory from '../hooks/useScrollMemory'
import { saveReadingPct } from '../hooks/progressStorage'
import './level.css'

const pad = n => String(n).padStart(2, '0')

// View Transitions API: transición de página completa al cambiar de módulo
// (Chrome/Edge/Safari). En navegadores sin soporte se usa la animación de
// entrada por CSS (module-enter-*).
const supportsVT =
  typeof document !== 'undefined' && 'startViewTransition' in document

export default function ModulePage() {
  const { levelId, moduleId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navType = useNavigationType()
  useScrollMemory()

  const level = getLevel(levelId)
  const levelContent = contentRegistry[Number(levelId)]
  const isValid = Boolean(level && level.status === 'available' && levelContent)
  const modules = isValid ? levelContent.modules : []
  const module = modules.find(m => m.id === Number(moduleId)) || null

  const moduleIds = useMemo(() => modules.map(m => m.id), [modules])
  const { count, total, isDone, markMany, toggle, completeAll } = useLevelProgress(levelId, moduleIds)

  const idx = module ? modules.indexOf(module) : -1
  const prevMod = idx > 0 ? modules[idx - 1] : null
  const nextMod = idx >= 0 && idx < modules.length - 1 ? modules[idx + 1] : null
  const isLast = Boolean(module && idx === modules.length - 1)

  const nextLevel = useMemo(() => {
    if (!isValid || !level) return null
    const li = levels.findIndex(l => l.id === level.id)
    for (let i = li + 1; i < levels.length; i++) {
      const l = levels[i]
      if (l.status === 'available' && contentRegistry[l.id]) return l
    }
    return null
  }, [isValid, level])

  // Dirección de la animación de entrada: el clic en siguiente/anterior lo
  // indica (location.state.dir); con atrás/adelante (POP) se usa un fade neutro.
  const dir = navType === 'POP' ? 'fade' : location.state?.dir ?? 'fade'

  // Auto-marcado: el módulo queda «leído» cuando el alumno llega al final de
  // su contenido (equivalente al scrollspy de la página antigua).
  const endRef = useRef(null)
  useEffect(() => {
    if (!module) return
    const el = endRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(en => {
          if (en.isIntersecting) markMany([module.id])
        })
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [module, markMany])

  // Porcentaje de lectura: guarda en localStorage (od-reading) el máximo
  // alcanzado de scroll del módulo actual, throttled con requestAnimationFrame.
  // Nunca retrocede (el avance persiste aunque vuelvas a subir).
  useEffect(() => {
    if (!module || !level) return
    let raf = 0
    let lastPct = 0
    const compute = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      lastPct = max > 0 ? Math.min(window.scrollY / max, 1) * 100 : 100
    }
    const save = () => {
      compute()
      saveReadingPct(level.id, module.id, lastPct)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(save)
    }
    save()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      // Persiste el último % conocido del módulo (sin releer el scroll del
      // nivel nuevo, que ya puede haberse movido al desmontar).
      saveReadingPct(level.id, module.id, lastPct)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [level, module])

  // Navegación con transición de página completa (View Transitions) cuando
  // está disponible; fallback: navegación normal + animación CSS de entrada.
  const goTo = (to, d) => {
    if (to === location.pathname) return
    const root = document.documentElement
    root.classList.remove('vt-next', 'vt-prev')
    if (supportsVT && (d === 'next' || d === 'prev')) {
      root.classList.add(`vt-${d}`)
      const t = document.startViewTransition(() =>
        flushSync(() => navigate(to, { state: { dir: d } }))
      )
      if (t && t.finished) {
        t.finished.finally(() => root.classList.remove('vt-next', 'vt-prev'))
      }
    } else {
      navigate(to, { state: { dir: d } })
    }
  }

  // Último módulo: cerrar el nivel (marcarlo completo) y encadenar al siguiente.
  const handleCloseLevel = () => {
    completeAll()
    if (nextLevel) goTo(`/nivel/${nextLevel.id}`, 'next')
    else navigate('/')
  }

  if (!level) {
    return (
      <div className="level-page">
        <div className="container" style={{ padding: '120px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 650, letterSpacing: '-0.02em' }}>Nivel no encontrado</h1>
          <p style={{ marginTop: 12, color: 'var(--muted)' }}>
            <Link to="/" style={{ borderBottom: '1px solid var(--border)' }}>← Volver al índice general</Link>
          </p>
        </div>
      </div>
    )
  }
  if (!isValid) {
    return (
      <div className="level-page">
        <div className="container" style={{ padding: '120px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>// próximamente</p>
          <p style={{ marginTop: 10, color: 'var(--muted)' }}>Este nivel está en desarrollo.</p>
        </div>
      </div>
    )
  }
  if (!module) {
    return <Navigate to={`/nivel/${levelId}`} replace />
  }

  const stage = stages.find(s => s.id === levelContent.meta.stage)
  const content = levelContent.contentMap[module.id]
  // En navegadores con View Transitions la animación de entrada la pone la API;
  // en el resto, la clase module-enter-* (direccional) del contenedor.
  const enterClass = supportsVT ? '' : ` module-enter-${dir}`
  const modUrl = mid => `/nivel/${level.id}/modulo/${mid}`

  return (
    <div className="level-page">
      <ReadingProgress />
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">&gt;_</span>
            Curso de Linux
          </Link>
          <span className="nav-level">Nivel {level.id} · Módulo {pad(module.id)}</span>
          <ThemeToggle />
          <Link className="nav-cta" to={`/nivel/${level.id}`}>Índice del nivel</Link>
        </div>
      </header>

      <main>
        {/* ---------- HERO del módulo ---------- */}
        <section className={`hero module-hero${enterClass}`}>
          <div className="container">
            <nav className="crumbs" aria-label="Ruta">
              <Link to="/#estructura">Índice general</Link>
              <span className="sep">/</span>
              <Link to={`/nivel/${level.id}`}>Nivel {level.id}</Link>
              <span className="sep">/</span>
              <span className="cur">Módulo {pad(module.id)}</span>
            </nav>
            <div className="module-hero-top">
              <div>
                <span className="module-num">MÓDULO {pad(module.id)}</span>
                <h1>{module.title}</h1>
              </div>
              <button
                type="button"
                className={`module-done${isDone(module.id) ? ' done' : ''}`}
                onClick={() => toggle(module.id)}
                aria-pressed={isDone(module.id)}
              >
                <span className="md-icon" aria-hidden="true">{isDone(module.id) ? '✓' : '○'}</span>
                {isDone(module.id) ? 'Completado' : 'Marcar como leído'}
              </button>
            </div>
            <div className="hero-meta">
              <span className="chip">Nivel: <b>&nbsp;{level.id} — {levelContent.meta.title}</b></span>
              <span className="chip">Módulo <b>&nbsp;{idx + 1} de {modules.length}</b></span>
              <span className={`chip${isDone(module.id) ? ' chip-done' : ''}`}>
                Progreso del nivel: <b>&nbsp;{count}/{total}</b>
              </span>
            </div>
            {/* Selector de módulos (stepper) */}
            <nav className="module-stepper" aria-label="Módulos del nivel">
              {modules.map((m, i) => (
                <Link
                  key={m.id}
                  to={modUrl(m.id)}
                  className={`ms-chip${m.id === module.id ? ' active' : ''}${isDone(m.id) ? ' done' : ''}`}
                  style={{ '--i': i }}
                  aria-current={m.id === module.id ? 'page' : undefined}
                  title={`Módulo ${pad(m.id)} — ${m.title}`}
                  onClick={e => {
                    e.preventDefault()
                    goTo(modUrl(m.id), m.id > module.id ? 'next' : 'prev')
                  }}
                >
                  {m.id === module.id && !isDone(m.id) && (
                    <span className="ms-pulse" aria-hidden="true" />
                  )}
                  {isDone(m.id) && (
                    <svg className="ms-check" viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                      <path
                        pathLength="1"
                        d="M2.5 6.5 L5 9 L9.5 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {pad(m.id)}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        {/* ---------- CONTENIDO ---------- */}
        <div className={`container module-body${enterClass}`} key={module.id}>
          {content ? (
            <ModuleContent content={content} />
          ) : (
            <div className="b card">
              <span className="kicker">Próximamente</span>
              <p>Este módulo está en desarrollo.</p>
            </div>
          )}
          {/* Centinela para el auto-marcado al llegar al final */}
          <div ref={endRef} className="module-end" aria-hidden="true" />
        </div>

        {/* ---------- NAVEGACIÓN ENTRE MÓDULOS ---------- */}
        <section className="container module-nav">
          {prevMod ? (
            <Link
              className="module-nav-prev"
              to={modUrl(prevMod.id)}
              onClick={e => {
                e.preventDefault()
                goTo(modUrl(prevMod.id), 'prev')
              }}
            >
              <span className="mn-arrow" aria-hidden="true">←</span>
              <span>
                <span className="mn-k">Módulo anterior</span>
                <span className="mn-t">Módulo {pad(prevMod.id)} — {prevMod.title}</span>
              </span>
            </Link>
          ) : (
            <span className="module-nav-prev is-empty" aria-hidden="true" />
          )}

          {!isLast ? (
            <Link
              className="module-nav-next"
              to={modUrl(nextMod.id)}
              onClick={e => {
                e.preventDefault()
                goTo(modUrl(nextMod.id), 'next')
              }}
            >
              <span>
                <span className="mn-k">Siguiente módulo</span>
                <span className="mn-t">Módulo {pad(nextMod.id)} — {nextMod.title}</span>
              </span>
              <span className="mn-arrow" aria-hidden="true">→</span>
            </Link>
          ) : (
            <button type="button" className="module-nav-next close-level" onClick={handleCloseLevel}>
              <span>
                <span className="mn-k">Último módulo del nivel</span>
                <span className="mn-t">
                  {nextLevel
                    ? `Cerrar nivel ${level.id} y continuar → Nivel ${nextLevel.id}`
                    : 'Cerrar nivel y volver al índice'}
                </span>
              </span>
              <span className="mn-arrow" aria-hidden="true">✓</span>
            </button>
          )}
        </section>

        {/* ---------- SIGUIENTE NIVEL (al terminar el último módulo) ---------- */}
        {isLast && nextLevel ? (
          <section className="container" style={{ paddingBottom: 72 }}>
            <Link
              className="next-level"
              to={`/nivel/${nextLevel.id}`}
              onClick={e => {
                e.preventDefault()
                goTo(`/nivel/${nextLevel.id}`, 'next')
              }}
            >
              <span>
                <div className="nl-k">Siguiente nivel</div>
                <div className="nl-t">Nivel {nextLevel.id} — {contentRegistry[nextLevel.id].meta.title}</div>
                <div className="nl-d">{contentRegistry[nextLevel.id].meta.description}</div>
              </span>
              <span className="nl-go">→</span>
            </Link>
          </section>
        ) : null}
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>Curso de Linux · Nivel {level.id} — {levelContent.meta.title}</span>
          <span>
            <Link to={`/nivel/${level.id}`}>Volver al nivel</Link> · Etapa {stage?.id} de {stages.length}
          </span>
        </div>
      </footer>
    </div>
  )
}
