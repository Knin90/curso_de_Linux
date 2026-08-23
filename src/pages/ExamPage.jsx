import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getLevel } from '../registry'
import { contentRegistry } from '../content/contentRegistry'
import { getExam } from '../content/examRegistry'
import ThemeToggle from '../components/ThemeToggle'
import ZoomControl from '../components/ZoomControl'
import useLevelProgress from '../hooks/useLevelProgress'
import useRevealOnScroll from '../hooks/useRevealOnScroll'
import { readExamEntry, saveExamScore } from '../hooks/examStorage'
import './level.css'

const TOTAL_QUESTIONS = 50
const PASS_SCORE = 35

// Fisher-Yates: orden de aparición de las preguntas, distinto en cada intento.
function shuffledOrder(n) {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function ExamPage() {
  const { levelId } = useParams()
  const navigate = useNavigate()

  const level = getLevel(levelId)
  const levelContent = contentRegistry[Number(levelId)]
  const isValid = Boolean(level && level.status === 'available' && levelContent)
  const moduleIds = useMemo(
    () => (isValid ? levelContent.modules.map(m => m.id) : []),
    [isValid, levelContent]
  )
  const { count } = useLevelProgress(levelId, moduleIds)
  const moduleCount = level?.moduleCount ?? moduleIds.length
  const modulesComplete = isValid && moduleCount > 0 && count >= moduleCount

  const questions = isValid ? getExam(Number(levelId)) : null

  const [answers, setAnswers] = useState(() => Array(TOTAL_QUESTIONS).fill(null))
  const [submitted, setSubmitted] = useState(false)
  // Orden de las preguntas para este intento — se re-sortea en cada retry().
  const [order, setOrder] = useState(() => shuffledOrder(TOTAL_QUESTIONS))
  const [best, setBest] = useState(() => readExamEntry(levelId).best)
  const pageRef = useRef(null)
  // Sin esto, las 50 preguntas ([data-reveal]) quedan en opacity:0 para
  // siempre — la regla vive en overview.css y solo se levanta cuando algún
  // hook agrega la clase "in" al entrar en viewport.
  useRevealOnScroll(pageRef)

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

  // Guardia de completitud: no se puede entrar (ni por deep-link) al examen
  // si faltan módulos por completar — redirect duro, sin intento parcial.
  if (!modulesComplete) {
    return <Navigate to={`/nivel/${levelId}`} replace state={{ examLocked: true }} />
  }

  const allAnswered = answers.every(a => a !== null)
  const score = submitted ? answers.filter((a, i) => a === questions[i].correct).length : 0
  const passed = score >= PASS_SCORE
  // Revelado progresivo: se ve una sola pregunta a la vez, en el orden
  // sorteado (`order`) — la actual desaparece y aparece la siguiente al
  // responder. Una vez enviado el examen se muestran todas juntas, en ese
  // mismo orden, para revisar la corrección completa.
  const firstUnansweredPos = order.findIndex(qi => answers[qi] === null)
  const currentPos = firstUnansweredPos === -1 ? TOTAL_QUESTIONS - 1 : firstUnansweredPos

  const select = (qIdx, optIdx) => {
    if (submitted) return
    setAnswers(prev => {
      const next = [...prev]
      next[qIdx] = optIdx
      return next
    })
  }

  const submit = () => {
    if (!allAnswered || submitted) return
    const s = answers.filter((a, i) => a === questions[i].correct).length
    const entry = saveExamScore(levelId, s)
    setBest(entry.best)
    setSubmitted(true)
    window.scrollTo(0, 0)
  }

  const retry = () => {
    setAnswers(Array(TOTAL_QUESTIONS).fill(null))
    setSubmitted(false)
    setOrder(shuffledOrder(TOTAL_QUESTIONS))
    window.scrollTo(0, 0)
  }

  return (
    <div className="level-page" ref={pageRef}>
      <header className="nav">
        <div className="container nav-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">&gt;_</span>
            Curso de Linux
          </Link>
          <span className="nav-level">Nivel {level.id} · Examen final</span>
          <ZoomControl />
          <ThemeToggle />
          <Link className="nav-cta" to={`/nivel/${level.id}`}>Volver al nivel</Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container">
            <nav className="crumbs" aria-label="Ruta">
              <Link to="/#estructura">Índice general</Link>
              <span className="sep">/</span>
              <Link to={`/nivel/${level.id}`}>Nivel {level.id}</Link>
              <span className="sep">/</span>
              <span className="cur">Examen final</span>
            </nav>
            <h1><span className="n">EXAMEN</span>{contentRegistry[level.id].meta.title}</h1>
            <p className="hero-lead">
              {TOTAL_QUESTIONS} preguntas de opción múltiple. Necesitás {PASS_SCORE}/{TOTAL_QUESTIONS} ({Math.round((PASS_SCORE / TOTAL_QUESTIONS) * 100)}%) para aprobar.
            </p>
            {best > 0 && !submitted && (
              <div className="hero-meta">
                <span className="chip">Ya rendiste, tu mejor puntaje es <b>&nbsp;{best}/{TOTAL_QUESTIONS}</b></span>
              </div>
            )}
          </div>
        </section>

        <section className="container" style={{ paddingBottom: 72 }}>
          {!questions ? (
            <div className="card" data-reveal>
              <span className="kicker">Examen final</span>
              <p>El examen de este nivel está en preparación — próximamente.</p>
            </div>
          ) : (
            <>
              {submitted && (
                <div className={passed ? 'card-result exam-banner' : 'card-warn exam-banner'}>
                  <span className="kicker">{passed ? 'Aprobado' : 'Desaprobado'}</span>
                  <p>
                    Obtuviste <b>{score}/{TOTAL_QUESTIONS}</b> ({Math.round((score / TOTAL_QUESTIONS) * 100)}%).
                    {' '}Mejor puntaje: <b>{best}/{TOTAL_QUESTIONS}</b>.
                  </p>
                  <button type="button" className="exam-retry" onClick={retry}>Reintentar</button>
                </div>
              )}

              <div className="exam-list">
                {(submitted ? order : [order[currentPos]]).map((qi, i) => {
                  const pos = submitted ? i : currentPos
                  const q = questions[qi]
                  const selected = answers[qi]
                  const isCorrect = submitted && selected === q.correct
                  const isWrong = submitted && selected !== null && selected !== q.correct
                  return (
                    <div
                      key={qi}
                      className={`exam-question${isCorrect ? ' exam-correct' : ''}${isWrong ? ' exam-incorrect' : ''}`}
                    >
                      <span className="exam-q-num">Pregunta {pos + 1}/{TOTAL_QUESTIONS}</span>
                      <p className="exam-q-text">{q.q}</p>
                      <div className="exam-options" role="radiogroup" aria-label={`Pregunta ${pos + 1}`}>
                        {q.options.map((opt, oi) => {
                          const isSelected = selected === oi
                          const showCorrect = submitted && oi === q.correct
                          const showWrongPick = submitted && isSelected && oi !== q.correct
                          return (
                            <button
                              type="button"
                              key={oi}
                              role="radio"
                              aria-checked={isSelected}
                              className={`exam-option${isSelected ? ' selected' : ''}${showCorrect ? ' correct' : ''}${showWrongPick ? ' incorrect' : ''}`}
                              disabled={submitted}
                              onClick={() => select(qi, oi)}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {!submitted && (
                <div className="exam-submit-bar">
                  <span className="exam-progress">{answers.filter(a => a !== null).length}/{TOTAL_QUESTIONS} respondidas</span>
                  <button type="button" className="exam-submit" disabled={!allAnswered} onClick={submit}>
                    Entregar examen
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>Curso de Linux · Nivel {level.id} — Examen final</span>
          <span><Link to={`/nivel/${level.id}`}>Volver al nivel</Link></span>
        </div>
      </footer>
    </div>
  )
}
