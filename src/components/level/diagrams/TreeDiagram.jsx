import useReveal from '../../../hooks/useReveal'
import { Icon } from './icons'

/* ============================================================
   Árbol de decisión / jerarquía. Un nodo raíz se ramifica en
   hijos (y estos, opcionalmente, en más hijos) con conectores
   ortogonales. Cubre la forma TREE del inventario de contenido
   (verificaciones de permisos, jerarquía DNS, procesos padre-hijo…).

   Props:
   - root: { name, meta?, icon? }
   - children: [{ name, meta?, icon?, focal?, edgeLabel?, children?: [...] }]
     (recursivo; profundidad recomendada ≤ 3 por presupuesto de complejidad)
   ============================================================ */

const NODE_H = 60
const H_GAP = 24
const ROW_H = 96
const CHAR_W = 6.3

// Ancho del nodo según su propio texto (nombre o meta, el que sea más
// largo), para que ningún label se desborde de su caja.
function nodeWidth(node) {
  const longest = Math.max(node.name?.length || 0, (node.meta?.length || 0) * 0.82)
  const textW = longest * CHAR_W + (node.icon ? 44 : 16) + 16
  return Math.max(140, Math.ceil(textW / 4) * 4)
}

// Ancho mínimo que necesita el pill de la etiqueta de una rama, para que
// dos ramas vecinas con labels largos ("no, ¿GID = dueño?") no se pisen.
function labelMinWidth(label) {
  return label ? Math.max(56, label.length * 7.2 + 32) : 0
}

// El "slot" horizontal que ocupa un hijo bajo su padre: el mayor entre su
// propio subárbol y lo que necesita su label de rama para no colisionar
// con el label del hermano de al lado.
function slotWidth(node) {
  return Math.max(subtreeWidth(node), labelMinWidth(node.edgeLabel))
}

// Calcula el ancho del subárbol (para centrar padres sobre sus hijos)
function subtreeWidth(node) {
  if (!node.children?.length) return nodeWidth(node)
  const widths = node.children.map(slotWidth)
  const childrenW = widths.reduce((a, b) => a + b, 0) + H_GAP * (node.children.length - 1)
  return Math.max(childrenW, nodeWidth(node))
}

// Asigna x/y a cada nodo, retorna { positioned, edges }
function layout(node, x, y, depth, edges, positioned) {
  const w = subtreeWidth(node)
  const nw = nodeWidth(node)
  const cx = x + w / 2
  positioned.push({ ...node, x: cx - nw / 2, w: nw, y, depth })
  if (node.children?.length) {
    let cursor = x
    for (const child of node.children) {
      const slot = slotWidth(child)
      const childW = subtreeWidth(child)
      const childX = cursor + (slot - childW) / 2
      const childCx = childX + childW / 2
      edges.push({ x1: cx, y1: y + NODE_H, x2: childCx, y2: y + ROW_H, label: child.edgeLabel, accent: child.accent })
      layout(child, childX, y + ROW_H, depth + 1, edges, positioned)
      cursor += slot + H_GAP
    }
  }
  return { positioned, edges }
}

export default function TreeDiagram({ root, children = [] }) {
  const { ref, inView } = useReveal(0.2)
  const tree = { ...root, children }
  const totalW = subtreeWidth(tree)
  const edges = []
  const positioned = []
  layout(tree, 0, 40, 0, edges, positioned)
  const maxDepth = Math.max(...positioned.map(n => n.depth))
  const svgW = totalW + 40
  const svgH = 40 + (maxDepth + 1) * ROW_H + 20

  return (
    <figure ref={ref} className={`dg-diagram${inView ? ' in' : ''}`}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-labelledby="dg-tree-title" className="dg-svg">
        <title id="dg-tree-title">Árbol: {root.name} y sus ramas</title>

        <defs>
          <marker id="dg-tree-arrow-muted" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="dg-muted-fill" />
          </marker>
          <marker id="dg-tree-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" className="dg-accent-fill" />
          </marker>
        </defs>

        {/* connectors: elbow ortogonal (bajan y luego se abren en horizontal) */}
        {edges.map((e, i) => {
          const midY = e.y1 + (e.y2 - e.y1) / 2
          const path = `M ${e.x1} ${e.y1} L ${e.x1} ${midY} L ${e.x2} ${midY} L ${e.x2} ${e.y2 - 6}`
          return (
            <g key={i} style={{ '--i': i }} className="dg-edge">
              <path
                d={path}
                fill="none"
                className={e.accent ? 'dg-line-accent' : 'dg-line-muted'}
                markerEnd={e.accent ? 'url(#dg-tree-arrow-accent)' : 'url(#dg-tree-arrow-muted)'}
              />
              {e.label && (
                <>
                  {/* Sobre el tramo vertical que baja al hijo (x2), no en el
                      punto medio con x1 — con 3+ ramas asimétricas eso
                      apelotona las etiquetas cerca del padre. */}
                  <rect
                    x={e.x2 - Math.max(24, e.label.length * 3.6)}
                    y={midY - 17}
                    width={Math.max(48, e.label.length * 7.2)}
                    height="14"
                    rx="7"
                    className={e.accent ? 'dg-tag-accent' : 'dg-tag-muted'}
                  />
                  <text
                    x={e.x2}
                    y={midY - 7}
                    textAnchor="middle"
                    className={e.accent ? 'dg-label-accent' : 'dg-label-muted'}
                  >
                    {e.label}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* nodes */}
        {positioned.map((n, i) => (
          <g key={i} style={{ '--i': i }} className="dg-node">
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={NODE_H}
              rx="8"
              className={`${n.focal ? 'dg-box-focal' : 'dg-box'}${n.standby ? ' dg-box-standby' : ''}`}
            />
            {n.icon ? (
              <>
                <Icon name={n.icon} x={n.x + 12} y={n.y + NODE_H / 2 - 11} size={22} className={n.focal ? 'dg-icon-focal' : 'dg-icon'} />
                <text x={n.x + 44} y={n.y + NODE_H / 2 - 3} className={n.focal ? 'dg-name-focal' : 'dg-name'} style={{ fontSize: 12.5 }}>
                  {n.name}
                </text>
                {n.meta && (
                  <text x={n.x + 44} y={n.y + NODE_H / 2 + 14} className="dg-meta" style={{ fontSize: 9 }}>
                    {n.meta}
                  </text>
                )}
              </>
            ) : (
              <>
                <text x={n.x + n.w / 2} y={n.y + (n.meta ? NODE_H / 2 - 3 : NODE_H / 2 + 4)} textAnchor="middle" className={n.focal ? 'dg-name-focal' : 'dg-name'} style={{ fontSize: 12.5 }}>
                  {n.name}
                </text>
                {n.meta && (
                  <text x={n.x + n.w / 2} y={n.y + NODE_H / 2 + 14} textAnchor="middle" className="dg-meta" style={{ fontSize: 9 }}>
                    {n.meta}
                  </text>
                )}
              </>
            )}
          </g>
        ))}
      </svg>
    </figure>
  )
}
