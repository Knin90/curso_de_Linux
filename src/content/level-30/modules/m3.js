const content = `
## Módulo 3 — Git hooks: automatización en el cliente y servidor

### 🎯 Objetivos de aprendizaje
* Conocer los tipos de hooks disponibles en Git y cuándo se ejecutan
* Implementar hooks de cliente: pre-commit, commit-msg, pre-push
* Implementar hooks de servidor: post-receive y update
* Compartir hooks con el equipo usando \`core.hooksPath\`
* Crear un hook de auto-deploy en el servidor

### ❓ El problema real
El equipo sube código con errores de linting, mensajes de commit inconsistentes y sin pasar los tests. En el servidor, cada deploy requiere entrar por SSH manualmente. Los hooks de Git pueden automatizar todo esto.

### 📖 El directorio \`.git/hooks/\`

Git incluye hooks de ejemplo (con extensión \`.sample\`) que están deshabilitados por defecto:

\`\`\`bash
ls .git/hooks/
# => applypatch-msg.sample   pre-applypatch.sample
# => commit-msg.sample       pre-commit.sample
# => fsmonitor-watchman.sample pre-merge-commit.sample
# => post-update.sample      pre-push.sample
# => pre-rebase.sample       prepare-commit-msg.sample
# => push-to-checkout.sample update.sample

# Para activar un hook, copia el sample y hazlo ejecutable:
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
\`\`\`

Los hooks deben ser ejecutables (\`chmod +x\`) y pueden estar escritos en cualquier lenguaje disponible en el sistema (bash, python, node, ruby...).

### 📖 Hooks del lado del cliente

**pre-commit**: se ejecuta antes de crear el commit. Si retorna distinto de 0, el commit se cancela.

\`\`\`bash
#!/bin/bash
# .git/hooks/pre-commit
set -e

echo "→ Ejecutando linting..."

# Verificar archivos Python modificados
PYTHON_FILES=\$(git diff --cached --name-only --diff-filter=ACM | grep '\.py\$' || true)
if [ -n "\$PYTHON_FILES" ]; then
  python3 -m flake8 \$PYTHON_FILES
  echo "✓ Flake8 OK"
fi

# Verificar archivos Shell modificados
SH_FILES=\$(git diff --cached --name-only --diff-filter=ACM | grep '\.sh\$' || true)
if [ -n "\$SH_FILES" ]; then
  shellcheck \$SH_FILES
  echo "✓ ShellCheck OK"
fi

# Verificar que no haya archivos de debug/secretos accidentales
FORBIDDEN=\$(git diff --cached --name-only | grep -E '\.(env|pem|key|secret)\$' || true)
if [ -n "\$FORBIDDEN" ]; then
  echo "✗ ERROR: Intentando commitear archivos sensibles: \$FORBIDDEN"
  exit 1
fi

echo "✓ Pre-commit checks pasaron"
\`\`\`

**commit-msg**: recibe el archivo con el mensaje del commit como argumento. Ideal para validar Conventional Commits:

\`\`\`bash
#!/bin/bash
# .git/hooks/commit-msg
COMMIT_MSG_FILE=\$1
COMMIT_MSG=\$(cat "\$COMMIT_MSG_FILE")

# Patrón Conventional Commits
PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,72}"

if ! echo "\$COMMIT_MSG" | grep -qE "\$PATTERN"; then
  echo "✗ ERROR: El mensaje del commit no sigue Conventional Commits."
  echo "  Formato esperado: type(scope): descripción"
  echo "  Tipos válidos: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert"
  echo "  Ejemplo: feat(auth): agregar login con OAuth2"
  echo ""
  echo "  Mensaje recibido: \$COMMIT_MSG"
  exit 1
fi

echo "✓ Mensaje de commit válido"
\`\`\`

**prepare-commit-msg**: modifica el mensaje de commit antes de que lo vea el usuario (útil para agregar el número del ticket de Jira):

\`\`\`bash
#!/bin/bash
# .git/hooks/prepare-commit-msg
COMMIT_MSG_FILE=\$1
COMMIT_SOURCE=\$2

# Solo agregar el ticket si no es un merge/squash/amend
if [ -z "\$COMMIT_SOURCE" ]; then
  BRANCH=\$(git symbolic-ref --short HEAD 2>/dev/null || true)
  TICKET=\$(echo "\$BRANCH" | grep -oE '[A-Z]+-[0-9]+' || true)

  if [ -n "\$TICKET" ]; then
    # Agregar el ticket al inicio del mensaje
    sed -i "1s/^/[\$TICKET] /" "\$COMMIT_MSG_FILE"
  fi
fi
\`\`\`

**pre-push**: se ejecuta antes de hacer push. Puede correr los tests completos:

\`\`\`bash
#!/bin/bash
# .git/hooks/pre-push
set -e

REMOTE=\$1
URL=\$2

# Solo ejecutar tests cuando se hace push a main o develop
if [[ "\$REMOTE" == "origin" ]]; then
  echo "→ Ejecutando tests antes del push a \$URL..."
  npm test -- --passWithNoTests
  echo "✓ Tests pasaron — push autorizado"
fi
\`\`\`

### 📖 Hooks del lado del servidor

Los hooks de servidor van en el directorio \`hooks/\` del repositorio bare (sin \`.git/\`):

**post-receive**: se ejecuta después de recibir un push. Ideal para auto-deploy:

\`\`\`bash
#!/bin/bash
# /srv/repos/myapp.git/hooks/post-receive

APP_DIR="/var/www/myapp"
LOG_FILE="/var/log/myapp-deploy.log"

while read OLDREV NEWREV REFNAME; do
  BRANCH=\$(echo "\$REFNAME" | sed 's|refs/heads/||')

  if [ "\$BRANCH" == "main" ]; then
    echo "→ Push a main detectado — iniciando deploy..."
    echo "\$(date) — Deploy iniciado por push a main (Rev: \$NEWREV)" >> "\$LOG_FILE"

    cd "\$APP_DIR" || exit 1
    git pull origin main

    # Instalar dependencias y reiniciar servicio
    npm install --production
    systemctl restart myapp

    echo "✓ Deploy completado exitosamente"
    echo "\$(date) — Deploy completado" >> "\$LOG_FILE"
  fi
done
\`\`\`

**update**: similar a post-receive pero se ejecuta una vez por ref (branch/tag). Puede bloquear pushes que no cumplan políticas:

\`\`\`bash
#!/bin/bash
# /srv/repos/myapp.git/hooks/update
REFNAME=\$1
OLDREV=\$2
NEWREV=\$3

# Bloquear force-push a main
if [ "\$REFNAME" == "refs/heads/main" ]; then
  if git merge-base --is-ancestor "\$OLDREV" "\$NEWREV" 2>/dev/null; then
    echo "✓ Push normal a main — aceptado"
  else
    echo "✗ ERROR: Force-push a main no está permitido"
    exit 1
  fi
fi
\`\`\`

### 📖 Compartir hooks con el equipo

Por defecto, \`.git/hooks/\` no se versiona. Para compartir hooks:

\`\`\`bash
# 1. Crear directorio versionado para los hooks
mkdir -p .githooks

# 2. Mover o crear los hooks ahí
mv .git/hooks/pre-commit .githooks/pre-commit
chmod +x .githooks/pre-commit

# 3. Configurar Git para usar ese directorio
git config core.hooksPath .githooks

# Para que aplique a todos los que clonan el repo:
# Documentarlo en el README o usar un Makefile:
# make setup -> git config core.hooksPath .githooks

# Configuración global (para todos los repos del sistema):
git config --global core.hooksPath ~/.githooks
\`\`\`

Alternativa con herramientas: **Husky** (Node.js), **pre-commit** (Python), **lefthook** (Go, multi-lenguaje).

\`\`\`bash
# Ejemplo con pre-commit (Python)
pip install pre-commit

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: detect-private-key
  - repo: https://github.com/shellcheck-py/shellcheck-py
    rev: v0.9.0.6
    hooks:
      - id: shellcheck

# Instalar
pre-commit install
\`\`\`

### 📖 Tabla resumen de hooks

| Hook | Cuándo se ejecuta | Argumento | Uso típico |
|------|------------------|-----------|------------|
| \`pre-commit\` | Antes de crear el commit | — | Linting, tests rápidos |
| \`prepare-commit-msg\` | Antes de mostrar el editor | msg file | Agregar ticket ID |
| \`commit-msg\` | Después de escribir el mensaje | msg file | Validar formato |
| \`post-commit\` | Después de hacer el commit | — | Notificaciones |
| \`pre-push\` | Antes de hacer push | remote, url | Tests completos |
| \`pre-rebase\` | Antes de rebase | branch | Bloquear rebase peligroso |
| \`post-checkout\` | Después de checkout | old, new, flag | Instalar deps |
| \`post-merge\` | Después de merge | squash flag | Instalar nuevas deps |
| \`pre-receive\` | Antes de recibir push | — | Validación global |
| \`update\` | Por cada ref en el push | ref, old, new | Políticas por branch |
| \`post-receive\` | Después de recibir push | — | Auto-deploy |

### 📋 Lo que debes recordar
* Los hooks viven en \`.git/hooks/\` y deben ser ejecutables (\`chmod +x\`)
* \`pre-commit\` cancela el commit si retorna != 0; ideal para linting
* \`commit-msg\` valida el formato del mensaje; recibe el path del archivo como \$1
* \`post-receive\` en el servidor es el mecanismo estándar para auto-deploy
* \`core.hooksPath\` permite versionar los hooks en el repositorio

### 🧪 Autoevaluación
1. ¿Por qué \`.git/hooks/\` no se comparte automáticamente con el equipo al hacer clone?
2. ¿Cuál es la diferencia entre el hook \`update\` y \`post-receive\` en el servidor?
3. ¿Cómo harías para que un hook \`pre-commit\` no bloquee un \`git commit --no-verify\`?

---

1. El directorio \`.git/\` no es parte del árbol de trabajo versionado — es la metadata local del repositorio. Al clonar, Git crea un nuevo \`.git/\` vacío (con solo los hooks de ejemplo). Por eso se usa \`core.hooksPath\` apuntando a un directorio versionado.
2. \`update\` se ejecuta una vez por cada ref (branch o tag) que se intenta actualizar y puede bloquear refs individuales (retornando != 0). \`post-receive\` se ejecuta una sola vez al final de todo el push y no puede cancelar la operación (se usa para acciones secundarias como deploys).
3. \`git commit --no-verify\` (flag \`-n\`) salta todos los hooks de cliente. No hay forma de impedirlo desde el hook mismo; la única protección real está en los hooks de servidor (\`pre-receive\`/\`update\`), que no pueden ser saltados por el cliente.
`

export default content
