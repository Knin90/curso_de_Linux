/* Acceso compartido al progreso del alumno en localStorage.
   - `od-progress`  : módulos leídos/locked por nivel (useLevelProgress y landing).
   - `od-reading`   : porcentaje de lectura alcanzado por módulo
     (clave propia para no chocar con la estructura { done, locked }). */

const PROGRESS_KEY = 'od-progress'
const READING_KEY = 'od-reading'

export function readStore() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
  } catch {
    return {}
  }
}

export function writeStore(store) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store))
  } catch {
    /* noop */
  }
}

export function readLevelEntry(levelId) {
  const entry = readStore()[levelId] || {}
  return {
    done: new Set(Array.isArray(entry.done) ? entry.done : []),
    locked: new Set(Array.isArray(entry.locked) ? entry.locked : []),
  }
}

/* ---------- Porcentaje de lectura por módulo (od-reading) ---------- */

// Forma: { [levelId]: { [moduleId]: 0..100 } } — el máximo alcanzado.
export function readReadingStore() {
  try {
    return JSON.parse(localStorage.getItem(READING_KEY) || '{}')
  } catch {
    return {}
  }
}

// Devuelve { [moduleId]: pct } para un nivel (0..100).
export function readLevelReading(levelId) {
  const entry = readReadingStore()[levelId] || {}
  return Object.fromEntries(
    Object.entries(entry).filter(([, v]) => typeof v === 'number')
  )
}

// Guarda el % alcanzado en un módulo SOLO si supera el máximo previo
// (el avance de lectura nunca retrocede) y devuelve el valor persistido.
export function saveReadingPct(levelId, moduleId, pct) {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  const store = readReadingStore()
  const levelEntry = store[levelId] || {}
  const prev = typeof levelEntry[moduleId] === 'number' ? levelEntry[moduleId] : 0
  if (p <= prev) return prev
  levelEntry[moduleId] = p
  store[levelId] = levelEntry
  try {
    localStorage.setItem(READING_KEY, JSON.stringify(store))
  } catch {
    /* noop */
  }
  return p
}
