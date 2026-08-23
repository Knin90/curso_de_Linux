#!/usr/bin/env node
/**
 * Validador estructural de exámenes finales por nivel.
 *
 * Recorre `src/content/level-N/exam.js` para cada N con carpeta existente,
 * y si el archivo existe lo importa dinámicamente (ESM) verificando que:
 *   - exporta (default) un array de exactamente 50 objetos
 *   - cada objeto tiene `q` (string no vacío), `options` (array de
 *     exactamente 4 strings no vacíos) y `correct` (entero 0..3)
 *   - no hay preguntas `q` duplicadas dentro del mismo nivel
 *
 * Uso:   node scripts/validate-exams.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const contentDir = path.join(root, 'src', 'content')

function findLevelDirs() {
  return fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^level-\d+$/.test(e.name))
    .map(e => ({ name: e.name, id: Number(e.name.slice('level-'.length)) }))
    .sort((a, b) => a.id - b.id)
}

function validateExam(levelId, questions, errors) {
  const prefix = `level ${levelId}`
  if (!Array.isArray(questions)) {
    errors.push(`${prefix}: default export no es un array`)
    return
  }
  if (questions.length !== 50) {
    errors.push(`${prefix}: se esperaban 50 preguntas, se encontraron ${questions.length}`)
  }

  const seenQuestions = new Set()
  questions.forEach((item, i) => {
    const where = `${prefix} / question ${i}`
    if (!item || typeof item !== 'object') {
      errors.push(`${where}: no es un objeto`)
      return
    }
    const { q, options, correct } = item

    if (typeof q !== 'string' || q.trim().length === 0) {
      errors.push(`${where}: 'q' debe ser un string no vacío`)
    } else {
      if (seenQuestions.has(q)) errors.push(`${where}: pregunta duplicada ('q' repetida en el nivel)`)
      seenQuestions.add(q)
    }

    if (!Array.isArray(options) || options.length !== 4) {
      errors.push(`${where}: 'options' debe ser un array de exactamente 4 elementos`)
    } else {
      options.forEach((opt, oi) => {
        if (typeof opt !== 'string' || opt.trim().length === 0) {
          errors.push(`${where}: 'options[${oi}]' debe ser un string no vacío`)
        }
      })
    }

    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      errors.push(`${where}: 'correct' debe ser un entero entre 0 y 3 (recibido: ${JSON.stringify(correct)})`)
    }
  })
}

async function main() {
  const levelDirs = findLevelDirs()
  const errors = []
  let checked = 0
  let skipped = 0

  for (const { name, id } of levelDirs) {
    const examPath = path.join(contentDir, name, 'exam.js')
    if (!fs.existsSync(examPath)) {
      skipped++
      continue
    }
    try {
      const mod = await import(pathToFileURL(examPath).href)
      validateExam(id, mod.default, errors)
      checked++
    } catch (e) {
      errors.push(`level ${id}: error al importar exam.js — ${e.message.split('\n')[0]}`)
    }
  }

  if (errors.length) {
    console.error('=== ERRORES DE VALIDACIÓN DE EXÁMENES ===')
    for (const err of errors) console.error(`  ${err}`)
    console.error(`\nTotal errores: ${errors.length} (niveles con exam.js: ${checked}, sin exam.js: ${skipped})`)
    process.exit(1)
  }

  console.log('=== VALIDACIÓN DE EXÁMENES OK ===')
  console.log(`Niveles con exam.js validados: ${checked}`)
  console.log(`Niveles sin exam.js (pendientes): ${skipped}`)
  process.exit(0)
}

main()
