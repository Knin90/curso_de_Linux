import { useRef } from 'react'
import Inline from './InlineText'
import useReveal from '../../hooks/useReveal'

// Detects whether a fenced "text" block is a simple vertical flow diagram
// (vs. a boxed ASCII diagram or a plain text table).
export function looksLikeFlow(code) {
  const lines = code.split('\n')
  // Box-corner chars → complex art, keep as code
  if (lines.some(l => /[┌┐┘]/.test(l))) return false
  let vertical = 0
  for (const l of lines) {
    if (/[│▼]/.test(l)) vertical++
  }
  return vertical >= 2
}

const CONNECTOR_RE = /^[\s│▼├└─v|^►]+$/

export default function FlowDiagram({ code }) {
  // Reveal animado: los nodos y conectores entran en cascada cuando el
  // diagrama aparece en pantalla (una sola vez).
  const { ref, inView } = useReveal(0.25)
  const nodes = []
  for (const raw of code.split('\n')) {
    const t = raw.trim()
    if (!t) continue
    if (CONNECTOR_RE.test(t) && /[│▼├└v]/.test(t)) {
      if (nodes[nodes.length - 1]?.kind !== 'edge') nodes.push({ kind: 'edge' })
      continue
    }
    let label = t.replace(/^[\s│├└─]+/, '')
    let meta = ''
    const s1 = label.indexOf(' — ')
    const s2 = label.indexOf(' → ')
    if (s1 !== -1) {
      meta = label.slice(s1 + 3).trim()
      label = label.slice(0, s1).trim()
    } else if (s2 !== -1) {
      meta = label.slice(s2 + 3).trim()
      label = label.slice(0, s2).trim()
    }
    nodes.push({ kind: 'node', label, meta })
  }

  return (
    <div ref={ref} className={`flow${inView ? ' in' : ''}`}>
      {nodes.map((n, i) =>
        n.kind === 'edge' ? (
          <div key={i} className="fedge" style={{ '--i': i }} />
        ) : (
          <div key={i} className="fnode" style={{ '--i': i }}>
            <div>
              <div className="fn-label">{Inline(n.label)}</div>
              {n.meta && <div className="fn-meta">{Inline(n.meta)}</div>}
            </div>
          </div>
        )
      )}
    </div>
  )
}
