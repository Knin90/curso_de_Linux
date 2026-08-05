const content = `
## Módulo 1 — Internals de Git: objetos, refs, index y pack files

### 🎯 Objetivos de aprendizaje
* Comprender la estructura interna del directorio \`.git/\`
* Identificar los cuatro tipos de objetos Git: blob, tree, commit y tag
* Inspeccionar objetos con \`git cat-file\`
* Entender cómo funcionan las refs, el index y los pack files
* Saber qué hacen \`ORIG_HEAD\`, \`MERGE_HEAD\` y \`FETCH_HEAD\`

### ❓ El problema real
Has hecho un \`git reset --hard\` y "perdiste" commits. Un compañero dice que los objetos siguen en el repositorio. ¿Cómo funciona Git internamente y cómo puedes recuperar trabajo que parece desaparecido?

### 📖 La estructura de \`.git/\`

Cuando ejecutas \`git init\`, Git crea el directorio \`.git/\` con esta estructura:

\`\`\`
.git/
├── HEAD              # ref al branch actual (ej: ref: refs/heads/main)
├── config            # configuración del repositorio
├── description       # descripción (usado por GitWeb)
├── index             # staging area (binario)
├── COMMIT_EDITMSG    # mensaje del último commit
├── ORIG_HEAD         # SHA del HEAD antes de operaciones destructivas
├── MERGE_HEAD        # SHA del branch que estás mergeando
├── FETCH_HEAD        # SHA de lo último que fetcheaste
├── hooks/            # scripts de automatización
├── info/
│   └── exclude       # gitignore local (no versionado)
├── logs/
│   ├── HEAD          # historial de movimientos de HEAD
│   └── refs/         # historial de cambios por ref
├── objects/
│   ├── 2b/           # primeros 2 chars del SHA como directorio
│   │   └── 4f3...    # resto del SHA como filename
│   ├── info/
│   └── pack/         # pack files comprimidos
└── refs/
    ├── heads/        # branches locales
    ├── remotes/      # branches remotos
    └── tags/         # tags
\`\`\`

### 📖 Los cuatro tipos de objetos

Git almacena todo como objetos inmutables identificados por su SHA-1 (40 caracteres hex). Hay cuatro tipos:

**Blob**: contenido de un archivo (sin nombre, sin permisos).
\`\`\`bash
# Crear un blob manualmente
echo "Hola mundo" | git hash-object --stdin
# => 8ab686eafeb1f44702738c8b0f24f2567c36da6d

# Guardarlo en el object store
echo "Hola mundo" | git hash-object -w --stdin
# => 8ab686eafeb1f44702738c8b0f24f2567c36da6d

# Verificar que existe
ls .git/objects/8a/

# Leer su contenido
git cat-file -p 8ab686eafeb1f44702738c8b0f24f2567c36da6d
# => Hola mundo

# Ver su tipo
git cat-file -t 8ab686eafeb1f44702738c8b0f24f2567c36da6d
# => blob
\`\`\`

**Tree**: directorio. Contiene referencias a blobs y otros trees con nombre y permisos.
\`\`\`bash
# Ver el tree del último commit
git cat-file -p HEAD^{tree}
# => 100644 blob a1b2c3... README.md
# => 100644 blob d4e5f6... main.py
# => 040000 tree 7g8h9i... src/

# 100644 = archivo normal, 100755 = ejecutable, 120000 = symlink, 040000 = directorio
\`\`\`

**Commit**: snapshot del proyecto en un momento dado. Apunta a un tree y a sus commits padre.
\`\`\`bash
git cat-file -p HEAD
# => tree 7f4a2b8c...
# => parent 3d1e9f2a...
# => author Denis García <d@example.com> 1722700000 +0000
# => committer Denis García <d@example.com> 1722700000 +0000
# =>
# => feat: agregar endpoint de autenticación
\`\`\`

**Tag**: etiqueta anotada. Apunta a cualquier objeto (normalmente un commit).
\`\`\`bash
git cat-file -p v1.0.0
# => object 3d1e9f2a...
# => type commit
# => tag v1.0.0
# => tagger Denis García <d@example.com> 1722700000 +0000
# =>
# => Release 1.0.0 — primera versión estable
\`\`\`

### 📖 El index (staging area)

El index (\`.git/index\`) es un archivo binario que actúa como área intermedia entre el working tree y el próximo commit. Puedes inspeccionarlo con:

\`\`\`bash
# Ver qué hay en el index
git ls-files --stage
# => 100644 a1b2c3... 0       README.md
# => 100644 d4e5f6... 0       main.py

# El 0 es el "stage number":
# 0 = normal, 1 = common ancestor, 2 = ours, 3 = theirs (durante merge conflict)

# Ver diferencia entre index y working tree
git diff

# Ver diferencia entre HEAD y index (lo que se va a commitear)
git diff --cached
\`\`\`

### 📖 Referencias (refs)

Las refs son punteros con nombre a objetos SHA. Están almacenadas como archivos de texto plano:

\`\`\`bash
cat .git/refs/heads/main
# => 3d1e9f2a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e

cat .git/HEAD
# => ref: refs/heads/main

# Cuando HEAD apunta directamente a un SHA (detached HEAD):
# => 3d1e9f2a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e
\`\`\`

**packed-refs**: cuando hay muchas refs, Git las consolida en un solo archivo:
\`\`\`bash
cat .git/packed-refs
# => # pack-refs with: peeled fully-peeled sorted
# => 3d1e9f2a... refs/heads/main
# => a1b2c3d4... refs/remotes/origin/main
# => ^7f4a2b8c... # <- SHA del objeto al que apunta un tag anotado (peeled)
\`\`\`

### 📖 Referencias especiales

| Ref | Qué contiene |
|-----|-------------|
| \`ORIG_HEAD\` | SHA del HEAD antes de \`merge\`, \`rebase\`, \`reset\` |
| \`MERGE_HEAD\` | SHA del branch que se está mergeando |
| \`CHERRY_PICK_HEAD\` | SHA del commit en cherry-pick |
| \`FETCH_HEAD\` | SHA de la última rama fetcheada |

\`\`\`bash
# Deshacer el último merge
git reset --hard ORIG_HEAD

# Ver a qué apunta FETCH_HEAD después de un fetch
cat .git/FETCH_HEAD
\`\`\`

### 📖 Pack files y garbage collection

Git empieza guardando objetos sueltos (\`loose objects\`). Con el tiempo, los consolida en pack files para ahorrar espacio usando delta compression:

\`\`\`bash
# Ver estadísticas de objetos
git count-objects -v
# => count: 42       (objetos sueltos)
# => size: 180       (KB ocupados por objetos sueltos)
# => in-pack: 1837   (objetos en pack files)
# => packs: 2
# => size-pack: 2048 (KB de pack files)
# => prune-packable: 0
# => garbage: 0

# Ejecutar garbage collection manualmente
git gc

# GC agresivo (más lento, mejor compresión)
git gc --aggressive

# Ver pack files
ls .git/objects/pack/
# => pack-a1b2c3...idx   (índice para búsqueda rápida)
# => pack-a1b2c3...pack  (datos comprimidos)

# Verificar integridad del repositorio
git fsck
\`\`\`

La delta compression almacena objetos similares como un objeto base más un conjunto de deltas. Un archivo modificado 100 veces no ocupa 100 veces el espacio.

### 📖 Crear un commit desde cero (plumbing)

\`\`\`bash
# 1. Crear blobs
echo "# Mi Proyecto" | git hash-object -w --stdin
# => abc123...

# 2. Crear un tree manualmente
git update-index --add --cacheinfo 100644,abc123...,README.md
git write-tree
# => def456...

# 3. Crear un commit
echo "Primer commit" | git commit-tree def456... -p HEAD
# => ghi789...

# 4. Mover la rama al nuevo commit
git update-ref refs/heads/main ghi789...
\`\`\`

Esto es lo que hacen los comandos porcelain (\`git add\`, \`git commit\`) internamente.

### 📋 Lo que debes recordar
* Git almacena todo como objetos inmutables identificados por SHA-1
* Los cuatro tipos de objetos son: blob, tree, commit y tag
* \`git cat-file -t SHA\` muestra el tipo, \`git cat-file -p SHA\` el contenido
* El index (\`.git/index\`) es la staging area; los refs son punteros con nombre
* \`packed-refs\` consolida múltiples refs en un archivo; \`git gc\` crea pack files
* \`ORIG_HEAD\` guarda el SHA anterior a operaciones destructivas

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre un blob y un tree en Git?
2. ¿Qué comando usarías para ver el contenido de un objeto dado su SHA?
3. ¿Para qué sirve \`ORIG_HEAD\` y cómo lo usarías para deshacer un merge?

---

1. Un blob almacena únicamente el contenido de un archivo (sin nombre ni permisos). Un tree almacena referencias a blobs y otros trees con nombre y permisos, representando la estructura de un directorio.
2. \`git cat-file -p <SHA>\` muestra el contenido del objeto. \`git cat-file -t <SHA>\` muestra su tipo.
3. \`ORIG_HEAD\` almacena el SHA al que apuntaba HEAD antes de operaciones como \`merge\`, \`rebase\` o \`reset\`. Para deshacer un merge: \`git reset --hard ORIG_HEAD\`.
`

export default content
