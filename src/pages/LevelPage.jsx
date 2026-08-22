import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getLevel, levels, stages } from '../registry'
import { contentRegistry } from '../content/contentRegistry'
import ThemeToggle from '../components/ThemeToggle'
import ZoomControl from '../components/ZoomControl'
import ReadingProgress from '../components/ReadingProgress'
import useLevelProgress from '../hooks/useLevelProgress'
import useScrollMemory from '../hooks/useScrollMemory'
import useRevealOnScroll from '../hooks/useRevealOnScroll'
import { readLevelReading } from '../hooks/progressStorage'
import './level.css'

const pad = n => String(n).padStart(2, '0')

const stateLevelRef = { current: null }

export default function LevelPage() {
  const { levelId } = useParams()
  useScrollMemory()
  const pageRef = useRef(null)
  useRevealOnScroll(pageRef)

  const level = getLevel(levelId)
  const levelContent = contentRegistry[Number(levelId)]
  const isValid = Boolean(level && level.status === 'available' && levelContent)

  const { meta, modules } = isValid ? levelContent : { meta: null, modules: [] }
  const moduleIds = useMemo(() => modules.map(m => m.id), [modules])
  const { count, total, isDone } = useLevelProgress(levelId, moduleIds)
  const pct = total ? Math.round((count / total) * 100) : 0
  const allDone = total > 0 && count >= total

  // % de lectura por módulo (od-reading), releído al montar o cambiar de nivel.
  const [reading, setReading] = useState(() => readLevelReading(levelId))
  if (stateLevelRef.current !== levelId) {
    stateLevelRef.current = levelId
    setReading(readLevelReading(levelId))
  }
  const readingPct = mid => {
    if (isDone(mid)) return 100 // completado ⇒ 100% aunque se haya desmarcado
    const p = reading[mid]
    return typeof p === 'number' ? p : 0
  }

  const nextLevel = useMemo(() => {
    if (!isValid || !level) return null
    const idx = levels.findIndex(l => l.id === level.id)
    for (let i = idx + 1; i < levels.length; i++) {
      const l = levels[i]
      if (l.status === 'available' && contentRegistry[l.id]) return l
    }
    return null
  }, [isValid, level])

  // Primer módulo sin completar: destino del CTA principal
  const firstPending = modules.find(m => !isDone(m.id)) || null
  const startTo = firstPending
    ? `/nivel/${level.id}/modulo/${firstPending.id}`
    : nextLevel
      ? `/nivel/${nextLevel.id}`
      : '/'

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

  const stage = stages.find(s => s.id === meta.stage)
  const ctaLabel = allDone
    ? (nextLevel ? 'Ir al siguiente nivel' : 'Nivel completado')
    : count > 0
      ? 'Continuar el nivel'
      : 'Comenzar el nivel'

  return (
    <div className="level-page" ref={pageRef}>
      <ReadingProgress />
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">&gt;_</span>
            Curso de Linux
          </Link>
          <span className="nav-level">Nivel {level.id} · {meta.title}</span>
          <ZoomControl />
          <ThemeToggle />
          <Link className="nav-cta" to={startTo}>{ctaLabel}</Link>
        </div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section className="hero">
          <div className="container">
            <nav className="crumbs" aria-label="Ruta">
              <Link to="/#estructura">Índice general</Link>
              <span className="sep">/</span>
              <span>Etapa {stage?.id} · {stage?.title}</span>
              <span className="sep">/</span>
              <span className="cur">Nivel {level.id}</span>
            </nav>
            <h1><span className="n">NIVEL {level.id}</span>{meta.title}</h1>
            <p className="hero-lead">{meta.description}</p>
            <div className="hero-meta">
              <span className="chip">Prerrequisito: <b>&nbsp;{meta.prerequisite}</b></span>
              <span className="chip">Siguiente: <b>&nbsp;{meta.next}</b></span>
              <span className="chip">
                Contenido: <b>&nbsp;{modules.length} módulos</b>
              </span>
              <span className={`chip${allDone ? ' chip-done' : ''}`}>
                {allDone ? 'Nivel completado' : 'Progreso:'} <b>&nbsp;{count}/{total}</b>
              </span>
            </div>
          </div>
        </section>

        {/* ---------- PROGRESO ---------- */}
        <section className="container">
          <div className="level-progress" data-reveal>
            <div className="level-progress-top">
              <span className="level-progress-label">Tu avance en este nivel</span>
              <span className={`level-progress-count${allDone ? ' done' : ''}`}>
                {count}/{total} módulos{allDone ? ' · ✓ completado' : ''}
              </span>
            </div>
            <div className="level-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={count}>
              <div className={`level-progress-fill${allDone ? ' full' : ''}`} style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          </div>
        </section>

        {/* ---------- MÓDULOS ---------- */}
        <section className="container" id="modulos">
          <div className="level-modules-head" data-reveal>
            <div>
              <span className="kicker">Contenido del nivel</span>
              <h2 className="level-modules-title">Módulos</h2>
            </div>
            <Link className="level-cta" to={startTo}>
              {ctaLabel} <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="level-modules">
            {modules.map((m, idx) => (
              <Link
                key={m.id}
                className={`level-module-card${isDone(m.id) ? ' done' : ''}`}
                to={`/nivel/${level.id}/modulo/${m.id}`}
                data-reveal
                style={{ '--i': idx }}
              >
                <span className="lmc-top">
                  <span className="lmc-num">MÓDULO {pad(m.id)}</span>
                  <span className="lmc-state" aria-hidden="true">{isDone(m.id) ? '✓' : '→'}</span>
                </span>
                <span className="lmc-title">{m.title}</span>
                <span className="lmc-reading">
                  <span className="lmc-reading-track" aria-hidden="true">
                    <span className="lmc-reading-fill" style={{ transform: `scaleX(${readingPct(m.id) / 100})` }} />
                  </span>
                  <span className="lmc-reading-pct">{readingPct(m.id)}%</span>
                </span>
                <span className="lmc-foot">
                  {isDone(m.id)
                    ? <span className="lmc-done">Completado</span>
                    : <span className="lmc-pending">
                        {readingPct(m.id) > 0 ? 'En curso' : 'Pendiente'}
                      </span>}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- SIGUIENTE NIVEL ---------- */}
        <section className="container" style={{ paddingTop: 8, paddingBottom: 72 }}>
          {nextLevel ? (
            <Link className="next-level" to={`/nivel/${nextLevel.id}`} data-reveal>
              <span>
                <div className="nl-k">Siguiente nivel</div>
                <div className="nl-t">Nivel {nextLevel.id} — {contentRegistry[nextLevel.id].meta.title}</div>
                <div className="nl-d">{contentRegistry[nextLevel.id].meta.description}</div>
              </span>
              <span className="nl-go">→</span>
            </Link>
          ) : (
            <a className="next-level" href="/#estructura" data-reveal>
              <span>
                <div className="nl-k">Fin del recorrido</div>
                <div className="nl-t">Volver al índice general</div>
                <div className="nl-d">Has completado todos los niveles disponibles del curso.</div>
              </span>
              <span className="nl-go">→</span>
            </a>
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>Curso de Linux · Nivel {level.id} — {meta.title}</span>
          <span><Link to="/#estructura">Estructura del curso</Link> · Etapa {stage?.id} de {stages.length}</span>
        </div>
      </footer>
    </div>
  )
}
