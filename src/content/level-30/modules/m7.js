const content = `
## Módulo 7 — Versionado semántico, tags y gestión de releases

### 🎯 Objetivos de aprendizaje
* Comprender y aplicar el estándar Semantic Versioning (SemVer)
* Relacionar los tipos de commit con los incrementos de versión
* Crear y gestionar tags de Git localmente y en remoto
* Publicar releases en GitHub con el CLI \`gh\`
* Automatizar el changelog y la creación de releases en CI/CD

### ❓ El problema real

Tu equipo lanza una nueva versión cada semana. ¿Es \`v2.3.1\` compatible con \`v2.2.0\`? ¿Cambió la API pública? ¿Cuándo se introdujo ese bug? Sin un estándar claro, responder estas preguntas requiere leer commits o preguntarle a quien lo hizo. SemVer y los Conventional Commits eliminan esa ambigüedad.

### 📖 Semantic Versioning

El estándar SemVer define versiones con el formato \`MAJOR.MINOR.PATCH\`:

\`\`\`
  1   .   4   .   2
  │       │       └── PATCH: corrección de bug, compatible hacia atrás
  │       └────────── MINOR: nueva funcionalidad, compatible hacia atrás
  └────────────────── MAJOR: cambio incompatible con versiones anteriores
\`\`\`

**Reglas fundamentales:**
* Incrementar MAJOR resetea MINOR y PATCH a 0: \`1.4.2\` → \`2.0.0\`
* Incrementar MINOR resetea PATCH a 0: \`1.4.2\` → \`1.5.0\`
* PATCH solo sube el último número: \`1.4.2\` → \`1.4.3\`
* La versión \`0.y.z\` es desarrollo inicial; la API puede cambiar sin incrementar MAJOR

**Pre-releases:** se añaden después de un guion
\`\`\`
1.0.0-alpha.1     # primera alpha
1.0.0-beta.3      # tercera beta
1.0.0-rc.1        # release candidate 1
\`\`\`

**Build metadata:** se añade después de \`+\` (no afecta precedencia)
\`\`\`
1.0.0+20240115.sha.abc1234
\`\`\`

### 📖 Conventional Commits y el impacto en la versión

Los Conventional Commits definen un formato de mensaje que herramientas de automatización pueden parsear para determinar el incremento de versión:

\`\`\`
<tipo>[scope opcional]: <descripción corta>

[cuerpo opcional]

[footers opcionales]
\`\`\`

**Mapeo de tipo → incremento:**

| Tipo de commit | Incremento | Ejemplo |
|---|---|---|
| \`feat:\` | MINOR | \`feat: añadir autenticación OAuth\` |
| \`fix:\` | PATCH | \`fix: corregir validación de email\` |
| \`feat!:\` o \`BREAKING CHANGE:\` | MAJOR | \`feat!: eliminar endpoint /api/v1\` |
| \`chore:\` | ninguno | \`chore: actualizar dependencias\` |
| \`docs:\` | ninguno | \`docs: mejorar guía de instalación\` |
| \`style:\` | ninguno | \`style: formatear con prettier\` |
| \`refactor:\` | ninguno | \`refactor: extraer lógica de pagos\` |
| \`test:\` | ninguno | \`test: añadir tests de integración\` |

**Breaking change en el footer (alternativa al \`!\`):**
\`\`\`
feat: cambiar formato de respuesta de la API

BREAKING CHANGE: el campo "user_id" ahora se llama "userId"
\`\`\`

### 📖 Gestión de tags en Git

Un tag es un puntero nombrado a un commit específico. Existen dos tipos:

**Tag ligero (sin anotación):** solo un puntero, sin metadata
\`\`\`bash
git tag v1.2.3
\`\`\`

**Tag anotado (recomendado para releases):** incluye autor, fecha y mensaje
\`\`\`bash
git tag -a v1.2.3 -m "Release 1.2.3: correcciones críticas de seguridad"
\`\`\`

**Operaciones con tags:**
\`\`\`bash
# Listar todos los tags
git tag -l

# Listar tags que coinciden con un patrón
git tag -l "v1.*"

# Ver información de un tag anotado
git show v1.2.3

# Publicar un tag específico al remoto
git push origin v1.2.3

# Publicar todos los tags locales al remoto
git push --tags

# Eliminar un tag local
git tag -d v1.2.3

# Eliminar un tag del remoto
git push origin --delete v1.2.3

# Crear tag en un commit específico (no en HEAD)
git tag -a v1.2.3 abc1234 -m "Tag retroactivo"
\`\`\`

### 📖 git describe: entender la posición relativa

\`git describe\` muestra la versión más cercana y cuántos commits llevamos desde ella:

\`\`\`bash
git describe --tags
# Salida: v1.2.3-14-gabcdef7
#          │      │   └── hash corto del commit actual (g = git)
#          │      └────── 14 commits desde el tag v1.2.3
#          └───────────── el tag más cercano hacia atrás
\`\`\`

Si estás exactamente en el tag, la salida es solo \`v1.2.3\`. Muy útil para generar versiones de desarrollo automáticas en builds de CI.

### 📖 GitHub Releases con gh CLI

Las releases de GitHub son páginas publicadas asociadas a un tag, con notas y archivos adjuntos:

\`\`\`bash
# Crear release desde la línea de comandos
gh release create v1.2.3 \
  --title "Release 1.2.3" \
  --notes "## Cambios\n- fix: corregir crash al cerrar sesión\n- feat: soporte para temas oscuros" \
  --target main

# Adjuntar archivos binarios a la release
gh release create v1.2.3 \
  --title "v1.2.3" \
  --notes-file CHANGELOG.md \
  ./dist/app-linux-amd64 \
  ./dist/app-darwin-arm64

# Crear release como borrador (para revisar antes de publicar)
gh release create v1.2.3 --draft --title "Release 1.2.3"

# Pre-release (alpha, beta, rc)
gh release create v1.3.0-rc.1 --prerelease --title "RC 1 para v1.3.0"

# Listar releases
gh release list

# Ver detalles de una release
gh release view v1.2.3
\`\`\`

### 📖 Changelog automatizado

**git-cliff** lee los Conventional Commits y genera \`CHANGELOG.md\` automáticamente:

\`\`\`bash
# Instalar
cargo install git-cliff
# o con brew:
brew install git-cliff

# Generar changelog desde todos los tags
git cliff -o CHANGELOG.md

# Solo cambios desde el último tag
git cliff --latest -o CHANGELOG.md

# Para una versión específica
git cliff --tag v1.3.0 -o CHANGELOG.md
\`\`\`

**conventional-changelog-cli** (alternativa para proyectos Node.js):
\`\`\`bash
npm install -g conventional-changelog-cli
conventional-changelog -p angular -i CHANGELOG.md -s
\`\`\`

### 📖 Automatización de releases en GitHub Actions

El workflow se dispara cuando se hace push de un tag con formato \`v*.*.*\`:

\`\`\`yaml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write       # necesario para crear la release
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0    # necesario para que git-cliff vea todo el historial

      - name: Generar changelog
        run: |
          curl -sSf https://github.com/orhun/git-cliff/releases/latest/download/git-cliff-x86_64-unknown-linux-gnu.tar.gz | tar xz
          ./git-cliff --latest -o RELEASE_NOTES.md

      - name: Crear GitHub Release
        run: |
          gh release create \${{ github.ref_name }} \
            --title "Release \${{ github.ref_name }}" \
            --notes-file RELEASE_NOTES.md
        env:
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

### 📖 Versionado automático de archivos

**npm version** (para proyectos Node.js): actualiza \`package.json\` y crea el tag automáticamente:
\`\`\`bash
npm version patch    # 1.4.2 → 1.4.3
npm version minor    # 1.4.2 → 1.5.0
npm version major    # 1.4.2 → 2.0.0
npm version 1.4.2    # versión exacta

# Luego publicar el tag creado:
git push origin v1.4.3
\`\`\`

**Patrón VERSION file** (lenguaje-agnóstico):
\`\`\`bash
echo "1.4.3" > VERSION
git add VERSION
git commit -m "chore: bump version to 1.4.3"
git tag -a v1.4.3 -m "Release 1.4.3"
git push && git push --tags
\`\`\`

**Go — incrustar versión en el binario vía ldflags:**
\`\`\`bash
VERSION=\$(git describe --tags)
go build -ldflags "-X main.Version=\$VERSION" -o myapp .
\`\`\`

### 📋 Lo que debes recordar
* SemVer: MAJOR para breaking changes, MINOR para nuevas features, PATCH para bug fixes
* Los tags anotados (\`git tag -a\`) son preferibles a los ligeros para releases formales
* \`git push --tags\` publica todos los tags locales; \`git push origin v1.2.3\` publica uno específico
* \`git describe --tags\` muestra la distancia al tag más cercano, útil en CI
* \`gh release create\` crea la release en GitHub asociada al tag, con notas y archivos adjuntos
* Automatiza el changelog con git-cliff para no escribirlo manualmente

### 🧪 Autoevaluación
1. Tu app está en \`v2.3.1\`. Corregiste un bug que no rompe compatibilidad. ¿Cuál es el siguiente número de versión?
2. ¿Qué tipo de commit de Conventional Commits provoca un incremento de versión MAJOR?
3. ¿Qué muestra \`git describe --tags\` cuando hay 5 commits desde el último tag \`v1.0.0\`?

---

1. \`v2.3.2\` — es un PATCH (corrección de bug, compatible hacia atrás)
2. Un commit con \`!\` en el tipo (ej. \`feat!:\`) o que incluya \`BREAKING CHANGE:\` en el footer
3. Algo como \`v1.0.0-5-gabcdef7\` (5 commits desde v1.0.0, hash del commit actual)
`

export default content
