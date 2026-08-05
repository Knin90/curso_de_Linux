import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getLevel, levels, stages } from '../registry'
import { contentRegistry } from '../content/contentRegistry'
import ModuleContent, { getCloseItems } from '../components/level/LevelContent'
import Inline from '../components/level/InlineText'
import ThemeToggle from '../components/ThemeToggle'
import './level.css'

const pad = n => String(n).padStart(2, '0')
const norm = s =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export default function LevelPage() {
  const { levelId } = useParams()
  const level = getLevel(levelId)
  const levelContent = contentRegistry[Number(levelId)]

  const [active, setActive] = useState(null)
  const sectionRefs = useRef({})

  const isValid = Boolean(level && level.status === 'available' && levelContent)

  const nextLevel = useMemo(() => {
    if (!isValid || !level) return null
    const idx = levels.findIndex(l => l.id === level.id)
    for (let i = idx + 1; i < levels.length; i++) {
      const l = levels[i]
      if (l.status === 'available' && contentRegistry[l.id]) return l
    }
    return null
  }, [isValid, level])

  const { meta, modules, contentMap } = isValid
    ? levelContent
    : { meta: null, modules: [], contentMap: {} }
  const nextContent = nextLevel ? contentRegistry[nextLevel.id] : null

  const closeItems = useMemo(() => {
    if (!isValid || !modules.length) return []
    const lastModule = modules[modules.length - 1]
    const parsed = getCloseItems(contentMap[lastModule.id] || '')
    return parsed.length ? parsed : modules.map(m => m.title)
  }, [isValid, modules, contentMap])

  // ================= Scrollspy =================
  useEffect(() => {
    if (!isValid || !modules.length) return
    const onScroll = () => {
      const pos = window.scrollY + 150
      let current = modules[0]?.id ?? null
      modules.forEach(m => {
        const el = sectionRefs.current[m.id]
        if (el && el.offsetTop <= pos) current = m.id
      })
      setActive(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [isValid, modules])

  // ================= Estados vacíos =================
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
  const hasLab = modules.some(m => norm(m.title).includes('laboratorio'))

  return (
    <div className="level-page">
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">&gt;_</span>
            Curso de Linux
          </Link>
          <span className="nav-level">Nivel {level.id} · {meta.title}</span>
          <ThemeToggle />
          <a className="nav-cta" href="#modulos">Ir a los módulos</a>
        </div>
      </header>

      <main id="top">
        {/* ---------- HERO ---------- */}
        <section className="hero">
          <div className="container">
            <nav className="crumbs" aria-label="Ruta">
              <a href="/#estructura">Índice general</a>
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
                {hasLab ? ' + laboratorio integrador' : ''}
              </span>
            </div>
          </div>
        </section>

        {/* ---------- MODULE CHIPS (mobile TOC) ---------- */}
        <section className="toc-strip" id="modulos" aria-label="Módulos del nivel">
          <div className="container toc-strip-inner">
            {modules.map(m => (
              <a key={m.id} className="toc-chip" href={`#m${m.id}`}>
                <span className="n">{pad(m.id)}</span>{m.title}
              </a>
            ))}
          </div>
        </section>

        <div className="container layout">
          {/* ---------- RAIL ---------- */}
          <aside className="rail">
            <div className="rail-label">Módulos</div>
            <ol>
              {modules.map(m => (
                <li key={m.id}>
                  <a href={`#m${m.id}`} className={active === m.id ? 'active' : ''}>
                    <span className="rn">{pad(m.id)}</span>{m.title}
                  </a>
                </li>
              ))}
            </ol>
            <div className="rail-foot">
              {modules.length} módulos{hasLab ? ' · 1 laboratorio real' : ''}<br />
              <a href="/#estructura">← Volver a la estructura</a>
            </div>
          </aside>

          {/* ---------- CONTENT ---------- */}
          <article className="content">
            {modules.map((m, idx) => {
              const nextMod = modules[idx + 1]
              return (
                <section key={m.id} className="module" id={`m${m.id}`} ref={el => { sectionRefs.current[m.id] = el }}>
                  <header className="module-head">
                    <span className="module-num">MÓDULO {pad(m.id)}</span>
                    <h2>{m.title}</h2>
                  </header>

                  {contentMap[m.id] ? (
                    <ModuleContent content={contentMap[m.id]} />
                  ) : (
                    <div className="b card">
                      <span className="kicker">Próximamente</span>
                      <p>Este módulo está en desarrollo.</p>
                    </div>
                  )}

                  {nextMod && (
                    <a className="next-link" href={`#m${nextMod.id}`}>
                      <span>
                        <div className="nl-label">Siguiente</div>
                        <div className="nl-title">Módulo {pad(nextMod.id)} — {nextMod.title}</div>
                      </span>
                      <span className="nl-arrow">→</span>
                    </a>
                  )}
                </section>
              )
            })}

            {/* ---------- CIERRE ---------- */}
            <section className="close-card">
              <span className="kicker">Cierre del nivel</span>
              <ul className="list-close">
                {closeItems.map((item, i) => (
                  <li key={i}>{Inline(item)}</li>
                ))}
              </ul>
            </section>

            {/* ---------- NEXT LEVEL ---------- */}
            {nextLevel && nextContent ? (
              <Link className="next-level" to={`/nivel/${nextLevel.id}`}>
                <span>
                  <div className="nl-k">Siguiente nivel</div>
                  <div className="nl-t">Nivel {nextLevel.id} — {nextContent.meta.title}</div>
                  <div className="nl-d">{nextContent.meta.description}</div>
                </span>
                <span className="nl-go">→</span>
              </Link>
            ) : (
              <a className="next-level" href="/#estructura">
                <span>
                  <div className="nl-k">Fin del recorrido</div>
                  <div className="nl-t">Volver al índice general</div>
                  <div className="nl-d">Has completado todos los niveles disponibles del curso.</div>
                </span>
                <span className="nl-go">→</span>
              </a>
            )}
          </article>
        </div>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>Curso de Linux · Nivel {level.id} — {meta.title}</span>
          <span><a href="/#estructura">Estructura del curso</a> · Etapa {stage?.id} de {stages.length}</span>
        </div>
      </footer>
    </div>
  )
}
