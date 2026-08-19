import useReveal from '../../../hooks/useReveal'

/* ============================================================
   Caja única dividida en filas por líneas horizontales — no es
   una jerarquía conceptual, es una lista/tabla con borde (tipos
   de NAT, tablas de iptables, estructura de un filesystem…).
   Cubre la forma TABLE_LIKE del inventario de contenido.

   Props:
   - title?: string
   - rows: [{ key?, value }]   (key en mono-acento si está, si no
     solo value en el color de texto normal)
   ============================================================ */

const MIN_W = 620
const MAX_W = 920
const HEAD_H = 40
const LINE_H = 19
const ROW_PAD = 13
const TOP = 20
const CHAR_W = 6.6

function wrapText(text, maxChars) {
  if (!text) return ['']
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines
}

export default function TableLikeDiagram({ title, rows }) {
  const { ref, inView } = useReveal(0.2)
  const headH = title ? HEAD_H : 0
  const longestRow = Math.max(
    0,
    ...rows.map(r => (r.key ? r.key.length + 3 : 0) + (r.value?.length || 0))
  )
  const W = Math.min(MAX_W, Math.max(MIN_W, longestRow * CHAR_W + 72))

  // Cada fila se envuelve en varias líneas si su value no entra en el
  // ancho disponible (que se reduce si además hay un key adelante).
  const rowsWrapped = rows.map(row => {
    const valueX = row.key ? 36 + row.key.length * 7.6 + 20 : 36
    const availW = W - valueX - 16
    const maxChars = Math.max(12, Math.floor(availW / CHAR_W))
    return { ...row, valueX, lines: wrapText(row.value, maxChars) }
  })
  const rowHeights = rowsWrapped.map(r => Math.max(1, r.lines.length) * LINE_H + ROW_PAD)
  const rowYOffsets = []
  let acc = 0
  for (const h of rowHeights) {
    rowYOffsets.push(acc)
    acc += h
  }
  const boxH = headH + acc + 8
  const svgH = TOP + boxH + 20

  return (
    <figure ref={ref} className={`dg-diagram${inView ? ' in' : ''}`}>
      <svg viewBox={`0 0 ${W + 40} ${svgH}`} role="img" aria-labelledby="dg-table-title" className="dg-svg">
        <title id="dg-table-title">{title || 'Tabla'}</title>

        <g className="dg-node" style={{ '--i': 0 }}>
          <rect x="20" y={TOP} width={W} height={boxH} rx="10" className="dg-box" />
          {title && (
            <>
              <rect x="20" y={TOP} width={W} height={headH} rx="10" className="dg-box-focal" />
              <line x1="20" y1={TOP + headH} x2={20 + W} y2={TOP + headH} className="dg-row-sep" />
              <text x="36" y={TOP + headH / 2 + 5} className="dg-name-focal">
                {title}
              </text>
            </>
          )}
          {rowsWrapped.map((row, i) => {
            const y = TOP + headH + 8 + rowYOffsets[i]
            return (
              <g key={i}>
                {i > 0 && <line x1="20" y1={y} x2={20 + W} y2={y} className="dg-row-sep" />}
                {row.key && (
                  <text x="36" y={y + 20} className="dg-row-key">
                    {row.key}
                  </text>
                )}
                <text x={row.valueX} y={y + 20} className="dg-row-text">
                  {row.lines.map((line, li) => (
                    <tspan key={li} x={row.valueX} dy={li === 0 ? 0 : LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </figure>
  )
}
