import useReveal from '../../../hooks/useReveal'
import { Icon } from './icons'

/* ============================================================
   Comparativa de 2–3 alternativas en columnas paralelas
   (BIOS vs UEFI, activo-pasivo vs activo-activo…). Cubre la
   forma SIDE_BY_SIDE del inventario de contenido.

   Props:
   - columns: [{ title, icon?, rows: [string, ...], focal? }]
   - vsLabel?: string (por defecto "VS")
   ============================================================ */

const COL_W = 320
const MIN_GAP = 64
const HEAD_H = 44
const LINE_H = 18
const ROW_GAP = 12
const TOP = 40
const MAX_CHARS_PER_LINE = 40

// Word-wrap simple: una fila de texto larga se corta en varias líneas para
// no desbordar el ancho fijo de la columna.
function wrapLine(text) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > MAX_CHARS_PER_LINE && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines
}

export default function SideBySideDiagram({ columns, vsLabel = 'VS' }) {
  const { ref, inView } = useReveal(0.2)
  const wrapped = columns.map(c => c.rows.map(wrapLine))
  const rowCount = Math.max(...columns.map(c => c.rows.length))
  // Altura uniforme por fila (índice) entre columnas, según la que más se envuelva.
  const rowLineCounts = Array.from({ length: rowCount }, (_, ri) =>
    Math.max(1, ...wrapped.map(w => w[ri]?.length || 1))
  )
  const rowYOffsets = []
  let acc = 0
  for (const lc of rowLineCounts) {
    rowYOffsets.push(acc)
    acc += lc * LINE_H + ROW_GAP
  }
  const bodyH = acc
  const colH = HEAD_H + bodyH + 8
  // El badge central ("VS" por defecto) se agranda con labels más largos
  // ("WAL streaming", "FAILOVER") — el hueco entre columnas crece con él
  // para que el texto nunca se salga de su círculo.
  const badgeR = Math.max(20, vsLabel.length * 3.4 + 14)
  const COL_GAP = Math.max(MIN_GAP, badgeR * 2 + 24)
  const totalW = columns.length * COL_W + (columns.length - 1) * COL_GAP + 80
  const svgH = TOP + colH + 40

  return (
    <figure ref={ref} className={`dg-diagram${inView ? ' in' : ''}`}>
      <svg viewBox={`0 0 ${totalW} ${svgH}`} role="img" aria-labelledby="dg-sbs-title" className="dg-svg">
        <title id="dg-sbs-title">Comparativa: {columns.map(c => c.title).join(' vs ')}</title>

        {columns.map((col, ci) => {
          const x = 40 + ci * (COL_W + COL_GAP)
          return (
            <g key={ci} style={{ '--i': ci }} className="dg-node">
              <rect x={x} y={TOP} width={COL_W} height={colH} rx="10" className={col.focal ? 'dg-box-focal' : 'dg-box'} />
              <rect x={x} y={TOP} width={COL_W} height={HEAD_H} rx="10" className={col.focal ? 'dg-box-focal' : 'dg-box'} />
              <line x1={x} y1={TOP + HEAD_H} x2={x + COL_W} y2={TOP + HEAD_H} className="dg-row-sep" />
              {col.icon && <Icon name={col.icon} x={x + 14} y={TOP + HEAD_H / 2 - 11} size={22} className={col.focal ? 'dg-icon-focal' : 'dg-icon'} />}
              <text x={x + (col.icon ? 44 : 18)} y={TOP + HEAD_H / 2 + 5} className={col.focal ? 'dg-name-focal' : 'dg-name'}>
                {col.title}
              </text>
              {wrapped[ci].map((lines, ri) => (
                <text key={ri} x={x + 18} y={TOP + HEAD_H + 20 + rowYOffsets[ri]} className="dg-row-text">
                  {lines.map((line, li) => (
                    <tspan key={li} x={x + 18} dy={li === 0 ? 0 : LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
              ))}
            </g>
          )
        })}

        {/* VS badges entre columnas consecutivas */}
        {columns.slice(0, -1).map((_, i) => {
          const x1 = 40 + i * (COL_W + COL_GAP) + COL_W
          const cx = x1 + COL_GAP / 2
          const cy = TOP + colH / 2
          return (
            <g key={i} className="dg-edge" style={{ '--i': columns.length + i }}>
              <line x1={x1} y1={cy} x2={cx - badgeR - 2} y2={cy} className="dg-line-muted" />
              <line x1={cx + badgeR + 2} y1={cy} x2={x1 + COL_GAP} y2={cy} className="dg-line-muted" />
              <circle cx={cx} cy={cy} r={badgeR} className="dg-vs-box" />
              <text x={cx} y={cy + 4} textAnchor="middle" className="dg-vs-text">
                {vsLabel}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
