// Convierte markdown inline (`code`, **bold**, *italic*, [link](url)) en nodos React.
// Recibe directamente el string de texto.
const TOKEN_RE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]]+\]\([^)\n]+\))|(\*[^*\n]+\*)/g

export default function Inline(text) {
  if (typeof text !== 'string') return null
  const out = []
  let last = 0
  let m
  TOKEN_RE.lastIndex = 0
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const full = m[0]
    if (m[1]) {
      out.push(<code key={out.length}>{m[1].slice(1, -1)}</code>)
    } else if (m[2]) {
      out.push(<strong key={out.length}>{m[2].slice(2, -2)}</strong>)
    } else if (m[3]) {
      const inner = m[3].match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      out.push(
        <a key={out.length} href={inner[2]} target="_blank" rel="noreferrer">
          {inner[1]}
        </a>
      )
    } else if (m[4]) {
      out.push(<em key={out.length}>{m[4].slice(1, -1)}</em>)
    }
    last = m.index + full.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
