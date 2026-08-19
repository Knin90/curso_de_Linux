import useReveal from '../../../hooks/useReveal'
import { Icon } from './icons'

/* ============================================================
   Caja contenedora (kernel, servicio, host) con sub-componentes
   adentro conectados en secuencia, y opcionalmente nodos externos
   que entregan o reciben del contenedor. Cubre la forma NESTED
   del inventario (subsistemas del kernel, HAProxy front/back,
   Prometheus scrape→tsdb→query…).

   Props:
   - container: { title, meta? }
   - items: [{ name, meta?, icon?, focal? }]   (secuenciales, adentro)
   - external?: [{ name, meta?, icon?, side: 'left' | 'right' }]
   ============================================================ */

const ITEM_H = 64
const ITEM_GAP = 40
const PAD = 28
const CHAR_W = 6.3
const MAX_BOX_W = 420

// Ancho por caja: se adapta al texto más largo que tenga adentro (nombre o
// meta), con un mínimo y un máximo, para que nada se desborde ni crezca sin
// límite con una descripción muy larga.
function boxWidth(node) {
  const longest = Math.max(node.name?.length || 0, (node.meta?.length || 0) * 0.82)
  const textW = longest * CHAR_W + (node.icon ? 44 : 14) + 14
  return Math.min(MAX_BOX_W, Math.max(150, Math.ceil(textW / 4) * 4))
}

export default function NestedDiagram({ container, items, external = [] }) {
  const { ref, inView } = useReveal(0.2)
  const widths = items.map(boxWidth)
  const innerW = widths.reduce((a, b) => a + b, 0) + ITEM_GAP * (items.length - 1)
  const headerTextW = Math.max(container.title.length, container.meta?.length || 0) * CHAR_W + 32
  const contW = Math.max(innerW + PAD * 2, headerTextW, 280)
  const HEADER_H = container.meta ? 44 : 28
  const contH = HEADER_H + ITEM_H + PAD
  const left = external.filter(e => e.side === 'left')
  const right = external.filter(e => e.side === 'right')
  const leftW = left.length ? Math.max(...left.map(boxWidth)) : 0
  const rightW = right.length ? Math.max(...right.map(boxWidth)) : 0
  const extLeftW = left.length ? leftW + 60 : 0
  const extRightW = right.length ? rightW + 60 : 0
  const svgW = extLeftW + contW + extRightW + 40

  // Cuando hay 3+ nodos externos apilados de un lado, esa columna es más
  // alta que el contenedor — el lienzo tiene que crecer con ella, si no
  // los últimos nodos quedan recortados por debajo del viewBox.
  const extGroupH = n => (n > 0 ? n * ITEM_H + (n - 1) * 12 : 0)
  const maxExtH = Math.max(extGroupH(left.length), extGroupH(right.length))
  const contX = 20 + extLeftW
  const contY = 60 + Math.max(0, (maxExtH - contH) / 2)
  const svgH = Math.max(contY + contH, contY + contH / 2 + maxExtH / 2) + 60

  return (
    <figure ref={ref} className={`dg-diagram${inView ? ' in' : ''}`}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-labelledby="dg-nested-title" className="dg-svg">
        <title id="dg-nested-title">{container.title}: {items.map(i => i.name).join(' → ')}</title>

        <defs>
          <marker id="dg-nested-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="dg-muted-fill" />
          </marker>
        </defs>

        {/* contenedor */}
        <rect x={contX} y={contY} width={contW} height={contH} rx="12" className="dg-container-box" style={{ '--i': 0 }} />
        <text x={contX + 16} y={contY + 20} className="dg-container-title">
          {container.title.toUpperCase()}
        </text>
        {container.meta && (
          <text x={contX + 16} y={contY + 38} className="dg-meta">
            {container.meta}
          </text>
        )}

        {/* items internos + flechas entre ellos */}
        {items.map((it, i) => {
          const w = widths[i]
          const x = contX + PAD + widths.slice(0, i).reduce((a, b) => a + b + ITEM_GAP, 0)
          const y = contY + HEADER_H
          return (
            <g key={i} style={{ '--i': i + 1 }}>
              {i > 0 && (
                <line
                  x1={x - ITEM_GAP}
                  y1={y + ITEM_H / 2}
                  x2={x}
                  y2={y + ITEM_H / 2}
                  className="dg-line-muted dg-edge"
                  markerEnd="url(#dg-nested-arrow)"
                />
              )}
              <g className="dg-node">
                <rect x={x} y={y} width={w} height={ITEM_H} rx="8" className={it.focal ? 'dg-box-focal' : 'dg-box'} />
                {it.icon && <Icon name={it.icon} x={x + 12} y={y + ITEM_H / 2 - 11} size={22} className={it.focal ? 'dg-icon-focal' : 'dg-icon'} />}
                <text x={x + (it.icon ? 44 : 14)} y={y + ITEM_H / 2 - 3} className={it.focal ? 'dg-name-focal' : 'dg-name'} style={{ fontSize: 12.5 }}>
                  {it.name}
                </text>
                {it.meta && (
                  <text x={x + (it.icon ? 44 : 14)} y={y + ITEM_H / 2 + 14} className="dg-meta" style={{ fontSize: 9 }}>
                    {it.meta}
                  </text>
                )}
              </g>
            </g>
          )
        })}

        {/* nodos externos a la izquierda */}
        {left.map((e, i) => {
          const y = contY + contH / 2 - ITEM_H / 2 + (i - (left.length - 1) / 2) * (ITEM_H + 12)
          return (
            <g key={`l${i}`} style={{ '--i': items.length + 1 + i }}>
              <g className="dg-node">
                <rect x={20} y={y} width={leftW} height={ITEM_H} rx="8" className="dg-box" />
                {e.icon && <Icon name={e.icon} x={32} y={y + ITEM_H / 2 - 11} size={22} className="dg-icon" />}
                <text x={20 + (e.icon ? 44 : 14)} y={y + ITEM_H / 2 - (e.meta ? 3 : -4)} className="dg-name" style={{ fontSize: 12.5 }}>
                  {e.name}
                </text>
                {e.meta && (
                  <text x={20 + (e.icon ? 44 : 14)} y={y + ITEM_H / 2 + 14} className="dg-meta" style={{ fontSize: 9 }}>
                    {e.meta}
                  </text>
                )}
              </g>
              <line
                x1={20 + leftW}
                y1={y + ITEM_H / 2}
                x2={contX}
                y2={y + ITEM_H / 2}
                className="dg-line-muted dg-edge"
                markerEnd="url(#dg-nested-arrow)"
              />
            </g>
          )
        })}

        {/* nodos externos a la derecha */}
        {right.map((e, i) => {
          const y = contY + contH / 2 - ITEM_H / 2 + (i - (right.length - 1) / 2) * (ITEM_H + 12)
          const x = contX + contW + 60
          return (
            <g key={`r${i}`} style={{ '--i': items.length + 1 + left.length + i }}>
              <line
                x1={contX + contW}
                y1={y + ITEM_H / 2}
                x2={x}
                y2={y + ITEM_H / 2}
                className="dg-line-muted dg-edge"
                markerEnd="url(#dg-nested-arrow)"
              />
              <g className="dg-node">
                <rect x={x} y={y} width={rightW} height={ITEM_H} rx="8" className="dg-box" />
                {e.icon && <Icon name={e.icon} x={x + 12} y={y + ITEM_H / 2 - 11} size={22} className="dg-icon" />}
                <text x={x + (e.icon ? 44 : 14)} y={y + ITEM_H / 2 - (e.meta ? 3 : -4)} className="dg-name" style={{ fontSize: 12.5 }}>
                  {e.name}
                </text>
                {e.meta && (
                  <text x={x + (e.icon ? 44 : 14)} y={y + ITEM_H / 2 + 14} className="dg-meta" style={{ fontSize: 9 }}>
                    {e.meta}
                  </text>
                )}
              </g>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
