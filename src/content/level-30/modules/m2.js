const content = `
## Módulo 2 — Operaciones avanzadas: rebase, cherry-pick, bisect y reflog

### 🎯 Objetivos de aprendizaje
* Reescribir el historial de forma controlada con \`git rebase -i\`
* Mover commits entre branches con \`git cherry-pick\`
* Localizar el commit que introdujo un bug con \`git bisect\`
* Recuperar commits "perdidos" con \`git reflog\`
* Gestionar trabajo en progreso con \`git stash\` y \`git worktree\`

### ❓ El problema real
Tienes diez commits de una feature llenos de "fix typo", "wip", "debug". Necesitas presentar un historial limpio para el PR. Además, el build de producción está roto y no sabes cuál de los 50 commits del último sprint es el culpable.

### 📖 Rebase interactivo

\`git rebase -i\` te permite reescribir el historial de commits antes de compartirlo:

\`\`\`bash
# Editar los últimos 5 commits
git rebase -i HEAD~5

# Editar desde el commit raíz
git rebase -i --root
\`\`\`

Se abre el editor con una lista de commits en orden cronológico (más antiguo arriba):

\`\`\`
pick a1b2c3 feat: agregar modelo de usuario
pick d4e5f6 wip: endpoint de login
pick g7h8i9 fix typo
pick j0k1l2 fix typo again
pick m3n4o5 feat: completar endpoint de login

# Comandos disponibles:
# p, pick   = usar el commit tal cual
# r, reword = cambiar el mensaje
# e, edit   = parar para editar el commit
# s, squash = fusionar con el commit anterior (conserva ambos mensajes)
# f, fixup  = fusionar con el anterior (descarta este mensaje)
# d, drop   = eliminar el commit
# x, exec   = ejecutar un comando shell
\`\`\`

Ejemplo: consolidar los commits de "wip" y "fix typo":
\`\`\`
pick a1b2c3 feat: agregar modelo de usuario
pick d4e5f6 wip: endpoint de login
f    g7h8i9 fix typo
f    j0k1l2 fix typo again
r    m3n4o5 feat: completar endpoint de login
\`\`\`

Resultado: el historial queda con dos commits limpios.

**Rebase onto**: mover una rama a otra base sin incluir commits intermedios.
\`\`\`bash
# Situación:
#   main --- A --- B --- C
#                   \\
#                    feature --- D --- E

# Queremos mover D y E sobre C (no sobre B):
git rebase --onto main feature~2 feature

# Resultado:
#   main --- A --- B --- C --- D' --- E'
\`\`\`

### 📖 Cherry-pick

Aplica commits específicos de cualquier branch al branch actual:

\`\`\`bash
# Aplicar un commit específico
git cherry-pick a1b2c3d4

# Aplicar un rango de commits (inclusive)
git cherry-pick a1b2c3d4..g7h8i9j0

# Cherry-pick sin crear commit (staged solamente)
git cherry-pick -n a1b2c3d4

# Cherry-pick con mensaje editado
git cherry-pick -e a1b2c3d4

# Si hay conflicto:
# 1. Resolver conflictos
# 2. git add .
# 3. git cherry-pick --continue
# O para abortar:
git cherry-pick --abort
\`\`\`

Caso de uso típico: tienes un hotfix en \`main\` y necesitas aplicarlo también a \`release/2.1\`:
\`\`\`bash
git checkout release/2.1
git cherry-pick abc123  # SHA del hotfix en main
git push origin release/2.1
\`\`\`

### 📖 Bisect: localizar el commit culpable

\`git bisect\` usa búsqueda binaria para encontrar el commit que introdujo un bug:

\`\`\`bash
# 1. Iniciar bisect
git bisect start

# 2. Marcar el estado actual como malo
git bisect bad

# 3. Marcar el último commit conocido bueno
git bisect good v1.2.0

# Git hace checkout al commit intermedio
# 4. Probar y marcar
git bisect good   # o
git bisect bad

# Git sigue haciendo checkout y tú marcando hasta que encuentra el culpable
# => "b7c8d9e0 is the first bad commit"

# 5. Terminar
git bisect reset
\`\`\`

**Bisect automatizado**: si tienes un script que retorna 0 para bueno y 1+ para malo:
\`\`\`bash
git bisect start HEAD v1.2.0
git bisect run ./test_regression.sh

# Ejemplo de script de prueba:
#!/bin/bash
make build 2>/dev/null
./myapp --check-feature
# Retorna 0 si funciona, 1 si está roto
\`\`\`

Git ejecutará el script automáticamente en cada paso hasta encontrar el commit culpable.

### 📖 Reflog: historial de movimientos de HEAD

El reflog registra cada movimiento de HEAD, incluso los que no aparecen en el historial del repositorio:

\`\`\`bash
# Ver el reflog de HEAD
git reflog
# => a1b2c3d HEAD@{0}: commit: feat: nueva feature
# => e5f6g7h HEAD@{1}: reset: moving to HEAD~3
# => i9j0k1l HEAD@{2}: commit: feat: algo que "perdiste"
# => m2n3o4p HEAD@{3}: checkout: moving from feature to main

# Ver reflog de un branch específico
git reflog show feature

# Recuperar un commit "perdido"
git checkout i9j0k1l          # ir al commit perdido
git checkout -b recuperado    # crear rama desde ahí

# O directamente resetear al estado anterior
git reset --hard HEAD@{2}

# El reflog tiene expiración (90 días por defecto para commits unreachable)
git config gc.reflogExpireUnreachable "90 days"
\`\`\`

### 📖 Git stash

Guarda el trabajo en progreso sin hacer commit:

\`\`\`bash
# Guardar cambios (tracked files)
git stash push -m "WIP: implementando autenticación JWT"

# Incluir archivos untracked
git stash push -u -m "WIP: incluye nuevos archivos"

# Incluir archivos ignorados también
git stash push -a

# Listar stashes
git stash list
# => stash@{0}: On feature: WIP: implementando autenticación JWT
# => stash@{1}: On main: WIP: fix temporal

# Aplicar el stash más reciente (lo mantiene en la lista)
git stash apply

# Aplicar y eliminar el stash más reciente
git stash pop

# Aplicar un stash específico
git stash apply stash@{1}

# Ver qué contiene un stash sin aplicarlo
git stash show -p stash@{0}

# Crear una rama desde un stash
git stash branch nueva-feature stash@{0}

# Eliminar un stash
git stash drop stash@{1}

# Eliminar todos los stashes
git stash clear
\`\`\`

### 📖 Git worktree

Permite tener múltiples working trees del mismo repositorio al mismo tiempo:

\`\`\`bash
# Crear un worktree en otra carpeta para trabajar en hotfix
git worktree add ../myapp-hotfix hotfix/v1.2.1

# Listar worktrees activos
git worktree list
# => /home/denis/myapp         a1b2c3d [main]
# => /home/denis/myapp-hotfix  e5f6g7h [hotfix/v1.2.1]

# Puedes trabajar en ambas carpetas simultáneamente
# sin hacer stash ni cambiar de branch

# Eliminar el worktree cuando termines
git worktree remove ../myapp-hotfix

# Si el directorio ya fue eliminado manualmente:
git worktree prune
\`\`\`

### 📋 Lo que debes recordar
* \`git rebase -i HEAD~N\` permite reescribir los últimos N commits (squash, fixup, drop, reword)
* \`git rebase --onto\` mueve un rango de commits a una nueva base
* \`git cherry-pick SHA\` aplica un commit específico al branch actual; \`-n\` no crea commit
* \`git bisect\` usa búsqueda binaria para localizar bugs; \`bisect run\` lo automatiza
* \`git reflog\` muestra el historial completo de HEAD, incluyendo commits "perdidos"
* \`git stash push -m "mensaje"\` guarda trabajo en progreso; \`pop\` lo restaura y elimina
* \`git worktree add\` permite múltiples working trees simultáneos del mismo repo

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia entre \`squash\` y \`fixup\` en un rebase interactivo?
2. ¿Cómo usarías \`git bisect run\` para automatizar la búsqueda de un bug?
3. Hiciste \`git reset --hard HEAD~3\` por accidente. ¿Cómo recuperarías los commits?

---

1. \`squash\` fusiona el commit con el anterior y abre el editor para combinar ambos mensajes. \`fixup\` también fusiona, pero descarta el mensaje del commit actual, conservando solo el del commit anterior.
2. \`git bisect start HEAD <último-bueno>\` y luego \`git bisect run ./mi-script.sh\`. El script debe retornar 0 si el estado es bueno y un valor distinto si es malo. Git ejecutará el script automáticamente en cada paso de la búsqueda binaria.
3. Con \`git reflog\` encuentras el SHA de los commits perdidos (aparecen como \`HEAD@{N}\`). Luego \`git reset --hard HEAD@{N}\` o \`git checkout -b recuperado <SHA>\` para restaurarlos.
`

export default content
