/* Acceso a localStorage para el mejor puntaje del examen final de nivel.
   - `od-exam` : { [levelId]: { best: 0..50, attempts: n } } — clave propia,
     sin chocar con `od-progress` (módulos) ni `od-reading` (% de lectura). */

const EXAM_KEY = 'od-exam'

export function readExamStore() {
  try {
    return JSON.parse(localStorage.getItem(EXAM_KEY) || '{}')
  } catch {
    return {}
  }
}

export function writeExamStore(store) {
  try {
    localStorage.setItem(EXAM_KEY, JSON.stringify(store))
  } catch {
    /* noop */
  }
}

// Devuelve { best, attempts } para un nivel (0 / 0 si no hay intentos previos).
export function readExamEntry(levelId) {
  const entry = readExamStore()[levelId] || {}
  return {
    best: typeof entry.best === 'number' ? entry.best : 0,
    attempts: typeof entry.attempts === 'number' ? entry.attempts : 0,
  }
}

// Guarda el puntaje de un intento: `best` nunca retrocede (monótono),
// `attempts` siempre se incrementa. Devuelve la entrada persistida.
export function saveExamScore(levelId, score) {
  const store = readExamStore()
  const prev = store[levelId] || { best: 0, attempts: 0 }
  const next = {
    best: Math.max(prev.best || 0, score),
    attempts: (prev.attempts || 0) + 1,
  }
  store[levelId] = next
  writeExamStore(store)
  return next
}
