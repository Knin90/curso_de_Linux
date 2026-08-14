#!/usr/bin/env node
/**
 * Auditoría de exports sin uso en src/.
 *
 * Parsea cada archivo .js/.jsx con @babel/parser (AST real, no regex),
 * extrae exports e imports (estáticos, namespace, star y dinámicos
 * import('...')), resuelve los imports relativos a rutas absolutas y
 * reporta los exports que ningún otro archivo consume.
 *
 * Uso:   node scripts/audit-exports.mjs
 *        pnpm audit:exports
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from '@babel/parser'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const srcDir = path.join(root, 'src')

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function walk(dir) {
  let out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out = out.concat(walk(p))
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p)
  }
  return out
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null // librería externa / alias
  let p = path.resolve(path.dirname(fromFile), spec)
  if (byAbs.has(p)) return p
  for (const ext of ['.js', '.jsx']) if (byAbs.has(p + ext)) return p + ext
  for (const idx of ['index.js', 'index.jsx']) if (byAbs.has(path.join(p, idx))) return path.join(p, idx)
  return null
}

function parseAst(file) {
  const src = fs.readFileSync(file, 'utf8')
  try {
    return parse(src, { sourceType: 'module', plugins: ['jsx', 'classProperties'] })
  } catch (e) {
    console.error(`  [PARSE ERROR] ${path.relative(srcDir, file)}: ${e.message.split('\n')[0]}`)
    return null
  }
}

/**
 * Recorre el AST buscando imports dinámicos import('...').
 * Babel los parsa como CallExpression con callee de tipo 'Import'
 * (o ImportExpression según la versión).
 */
function walkDynamicImports(node, out) {
  if (!node || typeof node !== 'object') return
  if (node.type === 'ImportExpression' && node.source && node.source.value) {
    out.push(node.source.value)
  } else if (
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Import' &&
    node.arguments[0] &&
    node.arguments[0].type === 'StringLiteral'
  ) {
    out.push(node.arguments[0].value)
  }
  for (const key of Object.keys(node)) {
    const v = node[key]
    if (Array.isArray(v)) for (const c of v) walkDynamicImports(c, out)
    else if (v && typeof v === 'object') walkDynamicImports(v, out)
  }
}

// ---------------------------------------------------------------------------
// 1) Recopilar exports e imports por archivo
// ---------------------------------------------------------------------------

const files = walk(srcDir)
const byAbs = new Set(files)
const info = new Map() // absPath -> { file, exports:Set, hasDefault:bool, imports:[] }

for (const f of files) {
  const ast = parseAst(f)
  if (!ast) continue
  const named = new Set()
  let hasDefault = false
  const imports = []

  for (const node of ast.program.body) {
    // --- Exports ---
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        const d = node.declaration
        if (d.type === 'VariableDeclaration') {
          for (const decl of d.declarations) {
            if (decl.id.type === 'Identifier') named.add(decl.id.name)
            else if (decl.id.type === 'ObjectPattern') for (const prop of decl.id.properties) named.add(prop.value.name)
          }
        } else if (d.id) named.add(d.id.name)
      }
      if (node.specifiers) {
        for (const s of node.specifiers) {
          const exported = s.exported.type === 'Identifier' ? s.exported.name : s.exported.value
          named.add(exported)
        }
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      hasDefault = true
    } else if (node.type === 'ExportAllDeclaration') {
      const target = resolveImport(f, node.source.value)
      if (target) imports.push({ target, kind: 'star' })
    }

    // --- Imports estáticos ---
    if (node.type === 'ImportDeclaration') {
      const target = resolveImport(f, node.source.value)
      if (!target) continue
      const names = { defaults: new Set(), named: new Map(), ns: new Set() }
      for (const s of node.specifiers) {
        if (s.type === 'ImportDefaultSpecifier') names.defaults.add(s.local.name)
        else if (s.type === 'ImportNamespaceSpecifier') names.ns.add(s.local.name)
        else if (s.type === 'ImportSpecifier') {
          const imported = s.imported.type === 'Identifier' ? s.imported.name : s.imported.value
          names.named.set(s.local.name, imported)
        }
      }
      imports.push({ target, kind: 'named', names })
    }
  }

  // --- Imports dinámicos: import('...') (p. ej. lazy(() => import(...))) ---
  const dyn = []
  walkDynamicImports(ast.program, dyn)
  for (const spec of dyn) {
    const target = resolveImport(f, spec)
    if (target) imports.push({ target, kind: 'dynamic' })
  }

  info.set(f, { file: f, exports: named, hasDefault, imports })
}

// ---------------------------------------------------------------------------
// 2) Mapa inverso: archivo exportado -> lista de importadores
// ---------------------------------------------------------------------------

const importersOf = new Map()
for (const fi of info.values()) {
  for (const imp of fi.imports) {
    if (!importersOf.has(imp.target)) importersOf.set(imp.target, [])
    importersOf.get(imp.target).push({ importerFile: fi.file, src: fs.readFileSync(fi.file, 'utf8'), imp })
  }
}

// ---------------------------------------------------------------------------
// 3) Detección de uso
// ---------------------------------------------------------------------------

function namedIsUsed(fi, name) {
  const importers = importersOf.get(fi.file) || []
  for (const { src, imp } of importers) {
    if (imp.kind === 'star' || imp.kind === 'dynamic') return true
    if (imp.names.named.has(name)) return true
    // uso vía namespace: import * as alias ... -> alias.name
    for (const alias of imp.names.ns) {
      if (new RegExp(`\\b${alias}\\.${name}\\b`).test(src)) return true
    }
  }
  return false
}

function defaultIsUsed(fi) {
  const importers = importersOf.get(fi.file) || []
  for (const { imp } of importers) {
    if (imp.kind === 'star' || imp.kind === 'dynamic') return true
    if (imp.names.defaults.size > 0) return true
  }
  return false
}

const unused = []
for (const fi of info.values()) {
  for (const name of fi.exports) {
    if (!namedIsUsed(fi, name)) unused.push({ file: fi.file, kind: 'named', name })
  }
  if (fi.hasDefault && !defaultIsUsed(fi)) unused.push({ file: fi.file, kind: 'default', name: 'default' })
}

// ---------------------------------------------------------------------------
// 4) Reporte
// ---------------------------------------------------------------------------

console.log('=== EXPORTS SIN USO DETECTADOS ===')
if (!unused.length) {
  console.log('(ninguno)')
} else {
  const byFile = {}
  for (const u of unused) (byFile[u.file] = byFile[u.file] || []).push(u)
  for (const [f, list] of Object.entries(byFile).sort()) {
    console.log(`\n${path.relative(srcDir, f)}`)
    for (const u of list) console.log(`  ${u.kind === 'default' ? 'default export' : `export ${u.name}`}`)
  }
  console.log(`\nTotal: ${unused.length}`)
}
console.log('\n=== RESUMEN ===')
console.log(`Archivos auditados: ${files.length}`)
console.log(`Named exports totales: ${[...info.values()].reduce((s, f) => s + f.exports.size, 0)}`)
console.log(`Default exports: ${[...info.values()].filter(f => f.hasDefault).length}`)
