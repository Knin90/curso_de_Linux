const content = `
## Módulo 4 — Estrategias de branching: GitFlow, trunk-based y GitHub Flow

### 🎯 Objetivos de aprendizaje
* Comprender las tres estrategias de branching más usadas en equipos profesionales
* Saber cuándo aplicar GitFlow, trunk-based development o GitHub Flow
* Configurar branch protection rules en GitHub/GitLab
* Elegir la estrategia de merge correcta: squash, merge commit o rebase

### ❓ El problema real
El equipo tiene ramas que llevan tres meses sin mergearse, conflictos constantemente y nadie sabe cuál rama va a producción. Necesitan un modelo claro y consistente.

### 📖 GitFlow

Diseñado por Vincent Driessen (2010). Funciona bien para proyectos con releases programados y múltiples versiones en producción simultáneamente.

**Ramas permanentes:**
- \`main\` (o \`master\`): siempre refleja producción. Solo recibe merges desde \`release/*\` y \`hotfix/*\`
- \`develop\`: rama de integración. Las features se mergean aquí primero

**Ramas temporales:**
- \`feature/nombre\`: sale de \`develop\`, se mergea a \`develop\`
- \`release/X.Y.Z\`: sale de \`develop\`, se mergea a \`main\` Y \`develop\`
- \`hotfix/nombre\`: sale de \`main\`, se mergea a \`main\` Y \`develop\`

\`\`\`bash
# Instalar git-flow
apt install git-flow   # Debian/Ubuntu
brew install git-flow  # macOS

# Inicializar en el repo
git flow init

# Ciclo de trabajo con git-flow:

# 1. Nueva feature
git flow feature start autenticacion-oauth
# Equivale a: git checkout -b feature/autenticacion-oauth develop

git flow feature finish autenticacion-oauth
# Equivale a:
#   git checkout develop
#   git merge --no-ff feature/autenticacion-oauth
#   git branch -d feature/autenticacion-oauth

# 2. Preparar release
git flow release start 2.1.0
# => rama release/2.1.0 desde develop
# Aquí solo se hacen bugfixes menores y se actualiza CHANGELOG

git flow release finish 2.1.0
# => merge a main (con tag v2.1.0) y merge a develop

# 3. Hotfix en producción
git flow hotfix start fix-auth-bypass
git flow hotfix finish fix-auth-bypass
# => merge a main (con tag) y merge a develop
\`\`\`

**Cuándo usar GitFlow:**
- Productos con versiones numeradas (software de escritorio, librerías)
- Equipos medianos/grandes con ciclos de release definidos
- Cuando necesitas mantener múltiples versiones en producción

**Cuándo NO usar GitFlow:**
- Aplicaciones web que hacen deploy continuo
- Equipos pequeños (< 5 personas)
- Proyectos que no tienen ciclos de release formales

### 📖 GitHub Flow

Modelo minimalista creado por GitHub. Una sola rama principal (\`main\`), todo lo demás es una rama de corta duración con PR.

\`\`\`bash
# 1. Crear rama desde main
git checkout main && git pull
git checkout -b feature/agregar-cache-redis

# 2. Trabajar y commitear
git add .
git commit -m "feat(cache): agregar Redis como backend de caché"

# 3. Push y abrir PR
git push -u origin feature/agregar-cache-redis
gh pr create --title "feat(cache): Redis backend" --base main

# 4. Review → Merge → Deploy automático
# La rama se elimina después del merge

# 5. Eliminar rama local
git branch -d feature/agregar-cache-redis
git remote prune origin
\`\`\`

**Reglas de GitHub Flow:**
1. Cualquier cosa en \`main\` está lista para deploy
2. Crear ramas descriptivas para cualquier trabajo nuevo
3. Pushear regularmente y abrir PRs pronto (draft PRs para feedback temprano)
4. Mergear solo después de review y CI verde
5. Deploy inmediato después de merge a \`main\`

**Cuándo usar GitHub Flow:**
- Aplicaciones web con CD (continuous deployment)
- Startups y equipos que iteran rápido
- Proyectos open source

### 📖 Trunk-Based Development (TBD)

El modelo más simple: todos los desarrolladores trabajan directamente sobre \`main\` (trunk) o con ramas de vida muy corta (máximo 1-2 días).

\`\`\`bash
# Ramas de muy corta duración
git checkout -b fix/typo-en-readme
# trabajo de menos de 2 horas
git push origin fix/typo-en-readme
gh pr create --base main
# merge y eliminar inmediatamente

# O directo a trunk para equipos muy maduros:
git commit -m "fix: corregir typo en README"
git push origin main
\`\`\`

**Feature flags para código incompleto:**
\`\`\`python
# En lugar de mantener una rama feature larga,
# el código llega a main detrás de un flag:

import os

ENABLE_NEW_CHECKOUT = os.getenv("FEATURE_NEW_CHECKOUT", "false") == "true"

def process_order(cart):
    if ENABLE_NEW_CHECKOUT:
        return new_checkout_flow(cart)
    return legacy_checkout_flow(cart)
\`\`\`

**Cuándo usar TBD:**
- Equipos de alto rendimiento con CI/CD maduro
- Cuando tienes feature flags implementados
- Google, Facebook, Netflix usan variantes de TBD

### 📖 Comparativa

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"GitFlow","rows":["Complejidad: alta","Deploy frequency: baja (por releases)","Historial: complejo","Conflictos: frecuentes (ramas largas)","Ideal para: software versionado"]},{"title":"GitHub Flow","rows":["Complejidad: baja","Deploy frequency: alta","Historial: limpio","Conflictos: poco frecuentes","Ideal para: web apps"]},{"title":"Trunk-Based","focal":true,"rows":["Complejidad: muy baja","Deploy frequency: muy alta","Historial: muy limpio","Conflictos: mínimos","Ideal para: CI/CD maduro"]}]}
\`\`\`

### 📖 Branch protection rules

En GitHub (Settings → Branches → Add rule):

\`\`\`yaml
# Configuración típica para main:
Branch name pattern: main

Protect matching branches:
  ✓ Require a pull request before merging
    Required approving reviews: 2
    ✓ Dismiss stale pull request approvals when new commits are pushed
    ✓ Require review from Code Owners (CODEOWNERS file)

  ✓ Require status checks to pass before merging
    Required status checks:
      - ci/tests
      - ci/linting
      - security-scan

  ✓ Require branches to be up to date before merging
  ✓ Require conversation resolution before merging
  ✓ Require signed commits
  ✓ Include administrators
  ✗ Allow force pushes  (DESHABILITADO)
  ✗ Allow deletions    (DESHABILITADO)
\`\`\`

Archivo CODEOWNERS:
\`\`\`
# .github/CODEOWNERS
# Dueños globales
*                    @equipo/senior-devs

# Backend: requerir review del equipo backend
/src/api/            @equipo/backend
/src/models/         @equipo/backend

# Frontend
/src/components/     @equipo/frontend

# Infraestructura: requerir DevOps
/infrastructure/     @equipo/devops
/.github/workflows/  @equipo/devops
\`\`\`

### 📖 Estrategias de merge en PRs

**Merge commit** (--no-ff): preserva el contexto del branch con un commit de merge. El historial muestra cuándo se integró cada feature.
\`\`\`bash
git merge --no-ff feature/autenticacion
# => Merge branch 'feature/autenticacion' into main
\`\`\`

**Squash merge**: todos los commits del PR se consolidan en uno. Historial de main queda limpio pero se pierde el detalle del PR.
\`\`\`bash
git merge --squash feature/autenticacion
git commit -m "feat(auth): agregar autenticación OAuth2 (#123)"
\`\`\`

**Rebase merge**: los commits del PR se reaplican sobre main sin commit de merge. Historial lineal perfecto.
\`\`\`bash
git rebase main feature/autenticacion
git checkout main
git merge --ff-only feature/autenticacion
\`\`\`

**Recomendación por estrategia:**
- GitFlow → merge commit (preserva contexto de features)
- GitHub Flow → squash (historial de main siempre limpio)
- Trunk-Based → rebase (historial lineal)

### 📋 Lo que debes recordar
* GitFlow usa \`main\`, \`develop\`, \`feature/*\`, \`release/*\` y \`hotfix/*\`; ideal para releases versionados
* GitHub Flow usa solo \`main\` + ramas de corta duración + PRs; ideal para deploy continuo
* Trunk-Based Development trabaja directamente en \`main\` con feature flags para código incompleto
* Branch protection rules en GitHub bloquean merges sin review ni CI verde
* CODEOWNERS asigna revisores automáticos según el path del archivo modificado

### 🧪 Autoevaluación
1. ¿Por qué GitFlow no es ideal para una aplicación web que hace deploy 10 veces al día?
2. ¿Qué problema resuelven los feature flags en trunk-based development?
3. ¿Cuál es la diferencia entre squash merge y rebase merge?

---

1. GitFlow agrega ramas de larga duración (\`develop\`, \`release/*\`) que acumulan divergencia y generan conflictos frecuentes. Además, el modelo de releases programados entra en conflicto con el deploy continuo donde cada merge a \`main\` debería ser deployable inmediatamente.
2. Los feature flags permiten integrar código incompleto a \`main\` sin que los usuarios lo vean. El código existe en producción pero deshabilitado, evitando ramas de larga duración que causan conflictos de integración.
3. Squash merge convierte todos los commits del PR en uno solo antes de integrar. Rebase merge reaplica cada commit del PR sobre \`main\` individualmente, preservando la granularidad pero con un historial lineal. Squash pierde el detalle del PR; rebase lo preserva.
`

export default content
