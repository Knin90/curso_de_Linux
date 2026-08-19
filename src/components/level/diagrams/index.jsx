import FlowStackDiagram from './FlowStackDiagram'
import TreeDiagram from './TreeDiagram'
import SideBySideDiagram from './SideBySideDiagram'
import NestedDiagram from './NestedDiagram'
import TableLikeDiagram from './TableLikeDiagram'

/* ============================================================
   Despachador de diagramas. Un bloque ```diagram del contenido
   trae un JSON con { type, ...props }; esto elige el componente.
   ============================================================ */

const REGISTRY = {
  'flow-stack': FlowStackDiagram,
  tree: TreeDiagram,
  'side-by-side': SideBySideDiagram,
  nested: NestedDiagram,
  'table-like': TableLikeDiagram,
}

export function isDiagramBlock(lang) {
  return lang === 'diagram'
}

export default function DiagramRenderer({ code }) {
  let spec
  try {
    spec = JSON.parse(code)
  } catch {
    return null
  }
  const { type, ...props } = spec
  const Component = REGISTRY[type]
  if (!Component) return null
  return <Component {...props} />
}
