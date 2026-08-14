import { useEffect, useState } from 'react'
import { metaRegistry } from '../content/metaRegistry'
import { readStore } from './progressStorage'

function computeProgress() {
  const store = readStore()
  const byLevel = {}
  let done = 0
  let total = 0
  Object.entries(metaRegistry).forEach(([levelId, reg]) => {
    const moduleIds = (reg.modules || []).map(m => m.id)
    const entryDone = new Set(Array.isArray(store[levelId]?.done) ? store[levelId].done : [])
    const doneIds = moduleIds.filter(id => entryDone.has(id))
    byLevel[levelId] = { done: doneIds.length, total: moduleIds.length, doneIds }
    total += moduleIds.length
    done += doneIds.length
  })
  return { done, total, byLevel }
}

/**
 * Progreso global del curso para la landing: suma los módulos "leídos" de
 * todos los niveles (od-progress) sobre el total de módulos del metaRegistry.
 * También expone `byLevel` ({ [levelId]: { done, total } }) para marcar
 * cada nivel del índice con su estado.
 * Se re-lee al montar (volver desde un nivel) y ante el evento `storage`
 * (cambios en otra pestaña).
 */
export default function useCourseProgress() {
  const [progress, setProgress] = useState(computeProgress)

  useEffect(() => {
    const refresh = () => setProgress(computeProgress())
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return { ...progress, pct }
}
