import { useState } from 'react'
import CodeBlock from './CodeBlock'
import FlowDiagram, { looksLikeFlow } from './FlowDiagram'
import DiagramRenderer, { isDiagramBlock } from './diagrams'
import Inline from './InlineText'
import useReveal from '../../hooks/useReveal'

/* ============================================================
   Convierte el markdown de un módulo en las secciones y bloques
   del diseño (cards, analogías, flows, tablas, código con copiar,
   pasos, warnings, glosarios, autoevaluación…).
   ============================================================ */

const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu
const cleanTitle = s =>
  s.replace(/^#{2,3}\s+/, '').replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim()
const norm = s =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

function classifySection(rawTitle) {
  const title = cleanTitle(rawTitle)
  const t = norm(title)
  const raw = rawTitle.trim()

  if (t.includes('objetivos')) return { type: 'objectives', kicker: 'Objetivos de aprendizaje' }
  if (t.includes('problema real')) return { type: 'problem', kicker: 'Problema real que resuelve' }
  if (t.includes('analog')) return { type: 'analogy', kicker: 'Analogía' }
  if (t.includes('ocurre internamente')) return { type: 'internals', kicker: '¿Qué ocurre internamente?' }
  if (t.includes('laboratorio guiado')) return { type: 'lab', kicker: 'Laboratorio guiado' }
  if (t.includes('errores comunes')) return { type: 'warn', kicker: 'Errores comunes' }
  if (t.includes('resultado esperado')) return { type: 'result', kicker: 'Resultado esperado' }
  if (t.includes('lo que debes recordar')) return { type: 'summary', kicker: 'Resumen' }
  if (t === 'resumen' || t.startsWith('resumen ')) return { type: 'summary', kicker: 'Resumen' }
  if (t.includes('glosario')) return { type: 'glossary', kicker: 'Glosario del módulo' }
  if (t.includes('autoevaluacion')) return { type: 'quiz', kicker: 'Autoevaluación' }
  if (t.includes('caso de uso')) return { type: 'case', kicker: 'Caso de uso profesional' }
  if (t.includes('ejemplo')) return { type: 'example', kicker: '' }
  if (t.includes('explicacion tecnica')) return { type: 'explain', kicker: 'Explicación técnica' }
  if (raw.startsWith('💻') || /en la practica|verificacion|comandos|leer permisos/.test(t)) {
    return { type: 'example', kicker: '' }
  }
  if (raw.startsWith('⚠️')) return { type: 'warn', kicker: title }
  return { type: 'generic', kicker: title }
}

export function parseModule(md) {
  const lines = md.split('\n')
  const sections = []
  const closeItems = []
  let cur = null
  let collectingClose = false
  let buf = []
  let list = null
  let fence = null
  let table = null
  let quote = []
  let afterDivider = false

  const addBlock = b => {
    if (collectingClose) {
      if (b.type === 'bullet') closeItems.push(...b.items)
      return
    }
    if (cur) cur.blocks.push(b)
  }
  const flushFence = () => {
    if (fence) {
      addBlock({ type: 'code', lang: fence.lang, code: fence.lines.join('\n') })
      fence = null
    }
  }
  const flushTable = () => {
    if (table) {
      addBlock({ type: 'table', rows: table.rows, hasHeader: table.hasHeader })
      table = null
    }
  }
  const flushList = () => {
    if (list) {
      addBlock({ type: list.type, items: list.items })
      list = null
    }
  }
  const flushPara = () => {
    if (buf.length) {
      addBlock({ type: 'para', text: buf.join('\n') })
      buf = []
    }
  }
  const flushQuote = () => {
    if (quote.length) {
      addBlock({ type: 'quote', text: quote.join('\n') })
      quote = []
    }
  }
  const flushAll = () => {
    flushFence()
    flushTable()
    flushList()
    flushPara()
    flushQuote()
  }

  const startList = type => {
    list = { type, items: [] }
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const line = lines[i]

    if (trimmed.startsWith('### ')) {
      flushAll()
      const spec = classifySection(trimmed)
      cur = { type: spec.type, kicker: spec.kicker, title: trimmed, blocks: [] }
      sections.push(cur)
      afterDivider = false
      continue
    }

    if (trimmed.startsWith('## ')) {
      flushAll()
      const t = norm(cleanTitle(trimmed))
      collectingClose = /cierre/.test(t)
      cur = null
      afterDivider = false
      continue
    }

    if (trimmed === '---') {
      flushAll()
      afterDivider = true
      continue
    }

    if (trimmed.startsWith('```')) {
      flushAll()
      fence = { lang: trimmed.slice(3).trim(), lines: [] }
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        fence.lines.push(lines[i])
        i++
      }
      flushFence()
      continue
    }

    if (trimmed.startsWith('|')) {
      flushAll()
      table = { rows: [], hasHeader: false }
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const row = lines[i].trim().slice(1, -1).split('|').map(c => c.trim())
        if (row.every(c => /^:?-+:?$/.test(c))) {
          table.hasHeader = true
        } else {
          table.rows.push(row)
        }
        i++
      }
      i--
      flushTable()
      continue
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\n]+)\)$/)
    if (imageMatch) {
      flushAll()
      addBlock({ type: 'image', alt: imageMatch[1], src: imageMatch[2] })
      continue
    }

    if (trimmed.startsWith('>')) {
      flushAll()
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      i--
      flushQuote()
      continue
    }

    const orderedMatch = trimmed.match(/^(\d+)[.)]\s+.*$/)
    const isBullet = /^([*+-])\s+/.test(trimmed)
    if (orderedMatch || isBullet) {
      flushPara()
      flushQuote()
      flushTable()
      flushFence()
      const type = orderedMatch ? 'ordered' : 'bullet'
      if (!list || list.type !== type) {
        if (afterDivider && type === 'ordered') {
          cur = { type: 'answers', kicker: 'Respuestas', title: '', blocks: [] }
          sections.push(cur)
        }
        flushList()
        startList(type)
      }
      const item = trimmed.replace(/^(\d+)[.)]\s+|^[*+-]\s+/, '')
      list.items.push(item)
      afterDivider = false
      continue
    }

    if (trimmed === '') {
      flushAll()
      continue
    }

    // Continuación de lista o párrafo
    if (list) {
      list.items[list.items.length - 1] += `\n${trimmed}`
    } else {
      buf.push(line)
    }
  }
  flushAll()

  // Kicker para secciones de ejemplo según el lenguaje de código
  sections.forEach(sec => {
    if (sec.type === 'example') {
      const lang = sec.blocks.find(b => b.type === 'code')?.lang
      if (lang === 'powershell' || lang === 'pwsh') sec.kicker = 'Ejemplo básico — PowerShell'
      else if (['bash', 'sh', 'zsh', 'shell'].includes(lang)) sec.kicker = 'Ejemplo básico — Terminal'
      else sec.kicker = 'Ejemplo básico'
    }
  })

  return { sections, closeItems }
}

export function getCloseItems(md) {
  return parseModule(md).closeItems
}

/* ---------- Bloques ---------- */

// Secuencia explicativa (lista numerada): los pasos entran en cascada cuando
// la lista aparece en pantalla (una sola vez).
function StepsList({ items }) {
  const { ref, inView } = useReveal(0.08)
  return (
    <ol ref={ref} className={`list-steps${inView ? ' in' : ''}`}>
      {items.map((it, j) => (
        <li key={j} style={{ '--i': j }}>{Inline(it)}</li>
      ))}
    </ol>
  )
}

function renderBlock(b, key) {
  switch (b.type) {
    case 'para':
      return <p key={key}>{Inline(b.text)}</p>
    case 'bullet':
      return (
        <ul key={key} className="list-plain">
          {b.items.map((it, j) => (
            <li key={j}>{Inline(it)}</li>
          ))}
        </ul>
      )
    case 'ordered':
      return <StepsList key={key} items={b.items} />
    case 'table':
      return (
        <div key={key} className="b tbl-wrap">
          <table>
            {b.hasHeader && (
              <thead>
                <tr>
                  {b.rows[0].map((c, j) => (
                    <th key={j}>{Inline(c)}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(b.hasHeader ? b.rows.slice(1) : b.rows).map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{Inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'quote':
      return (
        <div key={key} className="note">
          <span className="kicker">Nota</span>
          <p>{Inline(b.text)}</p>
        </div>
      )
    case 'image':
      return (
        <figure key={key} className="b module-figure">
          <img src={b.src} alt={b.alt} loading="lazy" />
          {b.alt && <figcaption>{b.alt}</figcaption>}
        </figure>
      )
    case 'code':
      if (isDiagramBlock(b.lang)) {
        return <DiagramRenderer key={key} code={b.code} />
      }
      if (b.lang === 'text' && looksLikeFlow(b.code)) {
        return <FlowDiagram key={key} code={b.code} />
      }
      return <CodeBlock key={key} lang={b.lang} code={b.code} />
    default:
      return null
  }
}

function flattenItems(blocks, type) {
  return blocks.filter(b => b.type === type).flatMap(b => b.items)
}

function parseDef(item) {
  const cleaned = item.trim()
  let term = cleaned
  let desc = ''
  const ci = cleaned.indexOf(':')
  if (ci > 0) {
    term = cleaned.slice(0, ci).trim()
    desc = cleaned.slice(ci + 1).trim()
  }
  term = term.replace(/\*\*/g, '').trim()
  return { term, desc }
}

/* ---------- Secciones ---------- */

function SectionBlocks({ section }) {
  const { type, kicker, blocks } = section
  if (!blocks.length) return null

  if (type === 'objectives') {
    return (
      <div className="b card">
        <span className="kicker">{kicker}</span>
        {blocks.map((b, i) =>
          b.type === 'bullet' ? (
            <ul key={i} className="list-check two-col">
              {b.items.map((it, j) => (
                <li key={j}>{Inline(it)}</li>
              ))}
            </ul>
          ) : (
            renderBlock(b, i)
          )
        )}
      </div>
    )
  }

  if (type === 'example') {
    return (
      <div className="b">
        <span className="kicker">{kicker}</span>
        {blocks.map((b, i) =>
          b.type === 'para' ? (
            <p key={i} className="example-intro">
              {Inline(b.text)}
            </p>
          ) : (
            renderBlock(b, i)
          )
        )}
      </div>
    )
  }

  if (type === 'lab') {
    return (
      <div className="b card">
        <span className="kicker">{kicker}</span>
        {blocks.map((b, i) =>
          b.type === 'ordered' ? <StepsList key={i} items={b.items} /> : renderBlock(b, i)
        )}
      </div>
    )
  }

  if (type === 'warn') {
    return (
      <div className="b card-warn">
        <span className="kicker">{kicker}</span>
        {blocks.map((b, i) =>
          b.type === 'bullet' ? (
            <ul key={i} className="list-warn">
              {b.items.map((it, j) => (
                <li key={j}>{Inline(it)}</li>
              ))}
            </ul>
          ) : (
            renderBlock(b, i)
          )
        )}
      </div>
    )
  }

  if (type === 'result') {
    return (
      <div className="b card-result">
        <span className="kicker">{kicker}</span>
        {blocks.map((b, i) => renderBlock(b, i))}
      </div>
    )
  }

  if (type === 'glossary') {
    const items = flattenItems(blocks, 'bullet')
    return (
      <div className="b card">
        <span className="kicker">{kicker}</span>
        <div className="def-grid">
          {items.map((it, i) => {
            const { term, desc } = parseDef(it)
            return (
              <div className="def-row" key={i}>
                <span className="def-term">{term}</span>
                <span className="def-desc">{Inline(desc)}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (type === 'analogy') {
    return (
      <div className="b card-analogy">
        <span className="qm">“</span>
        <span className="kicker">{kicker}</span>
        {blocks.map((b, i) => (b.type === 'para' ? <p key={i}>{Inline(b.text)}</p> : renderBlock(b, i)))}
      </div>
    )
  }

  if (type === 'quiz') {
    // answerItems injected by ModuleContent when pairing quiz+answers
    const { answerItems = [] } = section
    const questions = blocks.flatMap(b => (b.type === 'ordered' ? b.items : []))
    return <QuizSection kicker={kicker} questions={questions} answers={answerItems} />
  }

  if (type === 'answers') {
    // Rendered inline by QuizSection — skip standalone render
    return null
  }

  // card / problem / case / explain / internals / summary / generic
  if (blocks.length === 1 && blocks[0].type === 'table') {
    return renderBlock(blocks[0])
  }
  return (
    <div className="b card">
      <span className="kicker">{kicker}</span>
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  )
}

function QuizSection({ kicker, questions, answers }) {
  const [revealed, setRevealed] = useState({})
  const toggle = i => setRevealed(prev => ({ ...prev, [i]: !prev[i] }))
  const onKeyDown = (e, i) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle(i)
    }
  }
  return (
    <div className="b card">
      <span className="kicker">{kicker}</span>
      <ol className="list-quiz">
        {questions.map((q, i) => (
          <li
            key={i}
            className={`quiz-item${revealed[i] ? ' quiz-open' : ''}`}
            role="button"
            tabIndex={0}
            aria-expanded={Boolean(revealed[i])}
            onClick={() => toggle(i)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            <div className="quiz-question">
              <span className="quiz-q-text">{Inline(q)}</span>
              <span className="quiz-toggle-icon" aria-hidden="true">▼</span>
            </div>
            <div className="quiz-answer" aria-hidden={!revealed[i]}>
              <div className="quiz-answer-inner">
                {answers[i] && <div>{Inline(answers[i])}</div>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function ModuleContent({ content }) {
  const { sections } = parseModule(content)
  // Pair each quiz section with the immediately following answers section
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].type === 'quiz' && sections[i + 1]?.type === 'answers') {
      const answerItems = sections[i + 1].blocks.flatMap(b =>
        b.type === 'ordered' ? b.items : []
      )
      sections[i].answerItems = answerItems
    }
  }
  return sections.map((sec, i) => <SectionBlocks key={i} section={sec} />)
}
