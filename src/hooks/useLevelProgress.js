import { useCallback, useState } from 'react'
import { readLevelEntry, readStore, writeStore } from './progressStorage'

function persist(levelId, done, locked) {
  const store = readStore()
  store[levelId] = { done: [...done], locked: [...locked] }
  writeStore(store)
}

/**
 * Progreso del alumno por nivel, persistido en localStorage (od-progress).
 *
 * - Auto-marcado: markMany / markAll añaden módulos como "leídos" al pasar.
 * - Manual: toggle marca/desmarca; al desmarcar a mano el módulo queda
 *   "locked", de modo que el auto-marcado posterior no lo vuelva a marcar.
 * - completeAll fuerza el nivel completo (ignora locked) — usado por el
 *   botón «Marcar nivel como completado» que encadena al siguiente nivel.
 * - La persistencia es SÍNCRONA en cada mutación: si el componente se
 *   desmonta justo después (navegación), el avance ya quedó guardado.
 * - Resetea limpiamente al cambiar de nivel (misma instancia de ruta).
 */
export default function useLevelProgress(levelId, moduleIds = []) {
  const [state, setState] = useState(() => ({ levelId, ...readLevelEntry(levelId) }))

  // Ajuste de estado durante el render (patrón oficial de React): si cambia el
  // nivel, releer su progreso antes del commit, evitando marcas del nivel anterior.
  if (state.levelId !== levelId) {
    setState({ levelId, ...readLevelEntry(levelId) })
  }

  const toggle = useCallback(id => {
    setState(prev => {
      const done = new Set(prev.done)
      const locked = new Set(prev.locked)
      if (done.has(id)) {
        done.delete(id)
        locked.add(id) // desmarcado a mano: el auto-marcado no debe re-marcarlo
      } else {
        done.add(id)
        locked.delete(id)
      }
      persist(prev.levelId, done, locked)
      return { levelId: prev.levelId, done, locked }
    })
  }, [])

  const markMany = useCallback(ids => {
    setState(prev => {
      const next = new Set(prev.done)
      let changed = false
      ids.forEach(id => {
        if (!next.has(id) && !prev.locked.has(id)) {
          next.add(id)
          changed = true
        }
      })
      if (!changed) return prev
      persist(prev.levelId, next, prev.locked)
      return { levelId: prev.levelId, done: next, locked: prev.locked }
    })
  }, [])

  const markAll = useCallback(() => {
    setState(prev => {
      const next = new Set(prev.done)
      let changed = false
      moduleIds.forEach(id => {
        if (!next.has(id) && !prev.locked.has(id)) {
          next.add(id)
          changed = true
        }
      })
      if (!changed) return prev
      persist(prev.levelId, next, prev.locked)
      return { levelId: prev.levelId, done: next, locked: prev.locked }
    })
  }, [moduleIds])

  // Botón «Marcar nivel como completado»: fuerza el nivel completo
  // (ignora locked — el alumno decide cerrar el nivel aunque haya
  // desmarcado algún módulo a mano) y limpia locked.
  // Se persiste en el call-site (fuera del updater): el resultado es
  // conocido de antemano y queda garantizado aunque el componente se
  // desmonte en el mismo batch al navegar al siguiente nivel.
  const completeAll = useCallback(() => {
    const next = new Set(moduleIds)
    const locked = new Set()
    persist(levelId, next, locked)
    setState(prev => {
      if (prev.done.size === next.size && prev.locked.size === 0) return prev
      return { levelId: prev.levelId, done: next, locked }
    })
  }, [levelId, moduleIds])

  const isDone = useCallback(id => state.done.has(id), [state.done])

  return {
    count: state.done.size,
    total: moduleIds.length,
    isDone,
    toggle,
    markMany,
    markAll,
    completeAll,
  }
}
