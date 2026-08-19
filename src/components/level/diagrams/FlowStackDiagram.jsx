import useReveal from '../../../hooks/useReveal'
import { Icon } from './icons'

/* ============================================================
   Pila de nodos verticales conectados por flechas de flujo.
   Cubre dos formas del inventario de contenido: LAYER_STACK
   (capas de abstracción) y LINEAR_FLOW (pasos de un proceso) —
   visualmente son la misma estructura: secuencia + flechas.

   Props:
   - layers: [{ tag, icon?, name, meta?, focal?, chip? }]
   - edges:  [{ label, accent? }]   (largo = layers.length - 1)
   - sidePanel?: { title, lines: [string, string], code? }
     conectado con una flecha desde el edge acentuado (si hay uno)
   ============================================================ */

const X = 40
const W_BASE = 460
const W_MAX = 640
const H = 88
const GAP = 56
const TOP = 40
const PANEL_MIN_W = 280
const PANEL_MAX_W = 460
const PANEL_LINE_H = 20
const PANEL_CHAR_W = 7.2

// Word-wrap simple para las líneas de la nota lateral — sin esto, una
// línea larga se desborda de su caja en vez de partirse.
function wrapPanelLine(text, maxChars) {
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

export default function FlowStackDiagram({ layers, edges = [], sidePanel }) {
  const { ref, inView } = useReveal(0.2)
  const rowY = i => TOP + i * (H + GAP)
  const accentIdx = edges.findIndex(e => e?.accent)

  // Ancho de la pila: se ensancha si algún nombre o meta lo necesita, para
  // que el texto nunca se desborde de su caja (todas comparten el mismo W,
  // como corresponde a una pila prolija).
  const W = Math.min(
    W_MAX,
    Math.max(
      W_BASE,
      ...layers.map(l => {
        const nameW = (l.name?.length || 0) * 7.6 + 88 + (l.chip ? 90 : 16)
        const metaW = (l.meta?.length || 0) * 6.1 + 88 + 16
        return Math.max(nameW, metaW)
      })
    )
  )

  let panelW = PANEL_MIN_W
  let panelLines = []
  if (sidePanel) {
    const longest = Math.max(sidePanel.title.length * 1.1, ...sidePanel.lines.map(l => l.length * 0.55))
    panelW = Math.min(PANEL_MAX_W, Math.max(PANEL_MIN_W, longest * PANEL_CHAR_W * 0.5 + 64))
    const maxChars = Math.floor((panelW - 32) / PANEL_CHAR_W)
    panelLines = sidePanel.lines.map(l => wrapPanelLine(l, maxChars))
  }
  const panelLineCount = panelLines.reduce((a, l) => a + l.length, 0)
  const panelBodyH = panelLineCount * PANEL_LINE_H + (sidePanel?.code ? 40 : 16)
  const panelH = 44 + panelBodyH
  const panelBottom = sidePanel
    ? rowY(accentIdx >= 0 ? accentIdx : 0) + H + GAP / 2 + panelH / 2
    : 0
  const svgHeight = Math.max(
    TOP + layers.length * (H + GAP) - GAP + 120,
    panelBottom + 60
  )

  return (
    <figure ref={ref} className={`dg-diagram${inView ? ' in' : ''}`}>
      <svg
        viewBox={`0 0 ${Math.max(940, X + W + (sidePanel ? 80 + panelW + 40 : 40))} ${svgHeight}`}
        role="img"
        aria-labelledby="dg-fs-title"
        className="dg-svg"
      >
        <title id="dg-fs-title">{layers.map(l => l.name).join(' → ')}</title>

        <defs>
          <marker id="dg-arrow-muted" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="dg-muted-fill" />
          </marker>
          <marker id="dg-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="dg-accent-fill" />
          </marker>
        </defs>

        {/* connectors */}
        {layers.slice(0, -1).map((_, i) => {
          const y1 = rowY(i) + H
          const y2 = rowY(i + 1)
          const edge = edges[i]
          const isAccent = Boolean(edge?.accent)
          const label = edge?.label
          return (
            <g key={i} style={{ '--i': i }} className="dg-edge">
              <line
                x1={X + 60}
                y1={y1}
                x2={X + 60}
                y2={y2}
                className={isAccent ? 'dg-line-accent' : 'dg-line-muted'}
                markerEnd={isAccent ? 'url(#dg-arrow-accent)' : 'url(#dg-arrow-muted)'}
              />
              {label && (
                <>
                  <rect
                    x={X + 76}
                    y={(y1 + y2) / 2 - 7}
                    width={Math.max(48, label.length * 6.4 + 16)}
                    height="14"
                    rx="7"
                    className={isAccent ? 'dg-tag-accent' : 'dg-tag-muted'}
                  />
                  <text
                    x={X + 76 + Math.max(48, label.length * 6.4 + 16) / 2}
                    y={(y1 + y2) / 2 + 3}
                    textAnchor="middle"
                    className={isAccent ? 'dg-label-accent' : 'dg-label-muted'}
                  >
                    {label}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* elbow to side panel, from the accented edge (or the last edge) */}
        {sidePanel && (
          <path
            d={`M ${X + W} ${rowY(accentIdx >= 0 ? accentIdx : 0) + H + GAP / 2} L ${X + W + 80} ${rowY(accentIdx >= 0 ? accentIdx : 0) + H + GAP / 2}`}
            className="dg-line-accent"
            markerEnd="url(#dg-arrow-accent)"
          />
        )}

        {/* nodes */}
        {layers.map((l, i) => {
          const y = rowY(i)
          return (
            <g key={i} style={{ '--i': i }} className="dg-node">
              <rect x={X} y={y} width={W} height={H} rx="10" className={l.focal ? 'dg-box-focal' : 'dg-box'} />
              {l.icon && (
                <>
                  <circle cx={X + 48} cy={y + H / 2} r="24" className={l.focal ? 'dg-badge-focal' : 'dg-badge'} />
                  <Icon
                    name={l.icon}
                    x={X + 36}
                    y={y + H / 2 - 12}
                    className={l.focal ? 'dg-icon-focal' : 'dg-icon'}
                  />
                </>
              )}
              {l.tag && (
                <>
                  <rect x={X + 88} y={y + 16} width="24" height="14" rx="2" className="dg-tagbox" />
                  <text x={X + 100} y={y + 26} textAnchor="middle" className="dg-tagtext">
                    {l.tag}
                  </text>
                </>
              )}
              <text x={X + 88} y={y + 52} className={l.focal ? 'dg-name-focal' : 'dg-name'}>
                {l.name}
              </text>
              {l.meta && (
                <text x={X + 88} y={y + 70} className="dg-meta">
                  {l.meta}
                </text>
              )}
              {l.chip && (
                <>
                  <rect x={X + W - 88} y={y + 16} width="72" height="16" rx="8" className="dg-chip-box" />
                  <text x={X + W - 52} y={y + 28} textAnchor="middle" className="dg-chip-text">
                    {l.chip}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* side panel — centrado en el mismo punto donde llega el codo */}
        {sidePanel && (() => {
          const midY = rowY(accentIdx >= 0 ? accentIdx : 0) + H + GAP / 2
          const py = midY - panelH / 2
          let cursorY = py + 58
          const lineYs = []
          for (const lines of panelLines) {
            lineYs.push(cursorY)
            cursorY += lines.length * PANEL_LINE_H
          }
          return (
            <g className="dg-panel" style={{ '--i': layers.length }}>
              <rect x={X + W + 80} y={py} width={panelW} height={panelH} rx="10" className="dg-panel-box" />
              <rect x={X + W + 80} y={py} width={panelW} height="30" rx="10" className="dg-panel-head" />
              <rect x={X + W + 80} y={py + 14} width={panelW} height="16" className="dg-panel-head" />
              <text x={X + W + 96} y={py + 20} className="dg-panel-title">
                {sidePanel.title}
              </text>
              {panelLines.map((lines, i) => (
                <text key={i} x={X + W + 96} y={lineYs[i]} className="dg-panel-quote">
                  {lines.map((line, li) => (
                    <tspan key={li} x={X + W + 96} dy={li === 0 ? 0 : PANEL_LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
              ))}
              {sidePanel.code && (
                <>
                  <rect x={X + W + 96} y={py + panelH - 44} width={panelW - 32} height="24" rx="4" className="dg-panel-code-box" />
                  <text x={X + W + 108} y={py + panelH - 28} className="dg-panel-code">
                    {sidePanel.code}
                  </text>
                </>
              )}
            </g>
          )
        })()}
      </svg>
    </figure>
  )
}
