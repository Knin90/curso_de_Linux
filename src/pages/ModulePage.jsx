import { Navigate, useParams } from 'react-router-dom'

// Los módulos ahora se renderizan en una sola página por nivel,
// así que /nivel/X/modulo/Y redirige al ancla del módulo en la página del nivel.
export default function ModulePage() {
  const { levelId, moduleId } = useParams()
  return <Navigate to={`/nivel/${levelId}#m${moduleId}`} replace />
}
