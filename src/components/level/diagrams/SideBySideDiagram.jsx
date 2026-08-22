import { useId } from 'react'
import useReveal from '../../../hooks/useReveal'
import { Icon } from './icons'

/* ============================================================
   Comparativa de 2–3 alternativas en columnas paralelas
   (BIOS vs UEFI, activo-pasivo vs activo-activo…). Cubre la
   forma SIDE_BY_SIDE del inventario de contenido.

   Props:
   - columns: [{ title, icon?, rows: [string, ...], focal? }]
   - vsLabel?: string (por defecto "VS"), aplicado a todos los huecos
   - gapLabels?: [string, ...] — etiqueta por hueco (ej. ["+", "="] para
     una composición A + B = C); si falta un índice, cae a vsLabel.
   ============================================================ */

const COL_W = 340
const MIN_GAP = 60
const HEAD_H = 68
const LINE_H = 26
const ROW_GAP = 18
const TOP = 44
const MAX_CHARS_PER_LINE = 26

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

export default function SideBySideDiagram({ columns, vsLabel = 'VS', gapLabels }) {
  const { ref, inView } = useReveal(0.2)
  const uid = useId()
  const labels = columns.slice(0, -1).map((_, i) => gapLabels?.[i] ?? vsLabel)
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
  const maxLabelLen = Math.max(...labels.map(l => l.length))
  const badgeR = Math.max(30, maxLabelLen * 4.5 + 20)
  const COL_GAP = Math.max(MIN_GAP, badgeR * 2 + 24)
  const totalW = columns.length * COL_W + (columns.length - 1) * COL_GAP + 80
  const svgH = TOP + colH + 40

  return (
    <figure ref={ref} className={`dg-diagram${inView ? ' in' : ''}`}>
      <svg viewBox={`0 0 ${totalW} ${svgH}`} role="img" aria-labelledby="dg-sbs-title" className="dg-svg">
        <title id="dg-sbs-title">
          {columns.map((c, i) => (i === 0 ? c.title : ` ${labels[i - 1]} ${c.title}`)).join('')}
        </title>

        {columns.map((col, ci) => {
          const x = 40 + ci * (COL_W + COL_GAP)
          const iconBoxY = TOP + HEAD_H / 2 - 22
          return (
            <g key={ci} style={{ '--i': ci }} className="dg-node">
            {/* dg-node-hover: el hover (scale + sombra) vive en un grupo interno
                separado de la animación de entrada. Una animación "both" deja su
                valor final fijo en cascada para siempre — si el hover tocara la
                misma transform del dg-node exterior, la entrada le ganaría y el
                agrandado nunca se vería. */}
            <g className="dg-node-hover">
              <rect x={x} y={TOP} width={COL_W} height={colH} rx="10" className={col.focal ? 'dg-box-focal' : 'dg-box'} />
              {/* Cabecera: la columna focal ("el resultado") lleva una barra
                  sólida en acento — mismo lenguaje que dg-panel-head en el
                  resto del sistema de diagramas, no un borde lateral suelto.
                  clipPath recorta la barra a las esquinas redondeadas del
                  card, sin el desajuste visual de dos rects con su propio rx. */}
              {col.focal && (
                <clipPath id={`${uid}-col-${ci}`}>
                  <rect x={x} y={TOP} width={COL_W} height={colH} rx="10" />
                </clipPath>
              )}
              <rect
                x={x} y={TOP} width={COL_W} height={HEAD_H}
                className={col.focal ? 'dg-head-focal' : 'dg-box'}
                rx={col.focal ? undefined : '10'}
                clipPath={col.focal ? `url(#${uid}-col-${ci})` : undefined}
              />
              <line x1={x} y1={TOP + HEAD_H} x2={x + COL_W} y2={TOP + HEAD_H} className="dg-row-sep" />
              {col.icon && (
                <g>
                  <rect x={x + 16} y={iconBoxY} width="44" height="44" rx="12" className={col.focal ? 'dg-icon-chip-focal' : 'dg-icon-chip'} />
                  <Icon name={col.icon} x={x + 26} y={iconBoxY + 10} size={24} className={col.focal ? 'dg-icon-on-accent' : 'dg-icon'} />
                </g>
              )}
              <text x={x + (col.icon ? 74 : 22)} y={TOP + HEAD_H / 2 + 7} className={col.focal ? 'dg-name-on-accent' : 'dg-name'}>
                {col.title}
              </text>
              {wrapped[ci].map((lines, ri) => (
                <text key={ri} x={x + 34} y={TOP + HEAD_H + 32 + rowYOffsets[ri]} className="dg-row-text">
                  {lines.map((line, li) => (
                    <tspan key={li} x={x + 34} dy={li === 0 ? 0 : LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
              ))}
              {wrapped[ci].map((lines, ri) => (
                <circle
                  key={`dot-${ri}`}
                  cx={x + 24}
                  cy={TOP + HEAD_H + 32 + rowYOffsets[ri] - 5}
                  r="3"
                  className={col.focal ? 'dg-accent-fill' : 'dg-muted-fill'}
                />
              ))}
            </g>
            </g>
          )
        })}

        {/* VS badges entre columnas consecutivas: una línea continua atraviesa
            todo el hueco (el badge la tapa al centro), así el trazo animado
            recorre el ancho completo en vez de dos tramos de pocos px. */}
        {columns.slice(0, -1).map((_, i) => {
          const x1 = 40 + i * (COL_W + COL_GAP) + COL_W
          const x2 = x1 + COL_GAP
          const cx = x1 + COL_GAP / 2
          const cy = TOP + colH / 2
          return (
            <g key={i} className="dg-edge" style={{ '--i': columns.length + i }}>
              <line
                x1={x1} y1={cy} x2={x2} y2={cy}
                className="dg-line-muted dg-connector"
                style={{ strokeDasharray: COL_GAP, strokeDashoffset: COL_GAP }}
              />
              {/* Corriente: una vez trazada la línea base, un patrón de guiones
                  en acento corre por encima en bucle infinito — el cable queda
                  "con energía", no una línea plana y quieta. */}
              <line
                x1={x1} y1={cy} x2={x2} y2={cy}
                className="dg-connector-flow"
                style={{ '--flow-delay': `calc(80ms + ${i} * 60ms + 140ms + 420ms)` }}
              />
              <g className="dg-badge-pop">
                <circle cx={cx} cy={cy} r={badgeR + 4} className="dg-vs-ring" />
                <circle cx={cx} cy={cy} r={badgeR} className="dg-vs-box" />
                <text x={cx} y={cy + 4} textAnchor="middle" className="dg-vs-text">
                  {labels[i]}
                </text>
              </g>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
