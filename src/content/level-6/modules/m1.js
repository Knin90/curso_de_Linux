const content = `
## Módulo 1 — Arquitectura de systemd: el PID 1 y su rol

### 🎯 Objetivos de aprendizaje

* Entender por qué existe systemd y qué problema resuelve respecto a SysVinit.
* Comprender la arquitectura del sistema de init y el rol del PID 1.
* Conocer los tipos de unidades que gestiona systemd.

### ❓ El problema que resuelve

Antes de systemd, los sistemas Linux usaban **SysVinit**: una serie de scripts shell que se ejecutaban uno tras otro, en orden estricto, sin paralelismo. El sistema tardaba minutos en arrancar y cualquier script roto bloqueaba el inicio completo. Además, cada distribución tenía sus propios scripts incompatibles entre sí.

**systemd** resuelve tres problemas fundamentales:

\`\`\`text
  Problema 1: Arranque lento (secuencial)
  SysVinit: A → B → C → D → E  (cada uno espera al anterior)
  systemd:   A ──┬── C ──┬── E  (paralelo cuando es posible)
                 └── B ──┘
                 └── D ──┘

  Problema 2: Logs dispersos
  Antes: /var/log/nginx/error.log, /var/log/syslog, /var/log/messages...
  systemd: un único journal centralizado consultable con journalctl

  Problema 3: Sin gestión real de dependencias
  Antes: scripts con sleep 2 para "esperar" a que otro servicio arrancase
  systemd: dependencias declarativas (After=, Requires=, Wants=)
\`\`\`

### 📖 El PID 1: el primer proceso en espacio de usuario

\`\`\`text
  Hardware encendido
       │
       ▼
  BIOS / UEFI
       │
       ▼
  Bootloader (GRUB2)
       │
       ▼
  Kernel Linux
       │
       ▼ descomprime initramfs, monta sistema de archivos raíz
       │
       ▼
  /usr/lib/systemd/systemd  ←── PID 1 (nunca muere mientras el sistema esté encendido)
       │
       ▼
  Lee unidades → resuelve dependencias → arranca servicios en paralelo
       │
       ▼
  Login prompt
\`\`\`

> PID 1 es especial en Unix: si muere, el kernel entra en pánico (kernel panic). systemd está diseñado para ser el proceso más robusto del sistema.

### 📖 Tipos de unidades de systemd

systemd no gestiona solo servicios — gestiona cualquier "recurso" del sistema mediante archivos de unidad:

| Tipo | Extensión | Para qué sirve |
| --- | --- | --- |
| Service | \`.service\` | Demonios y procesos (nginx, sshd, mysql) |
| Target | \`.target\` | Grupos de unidades (equivalente a runlevels) |
| Socket | \`.socket\` | Activación bajo demanda por socket de red o Unix |
| Timer | \`.timer\` | Tareas programadas (alternativa moderna a cron) |
| Mount | \`.mount\` | Puntos de montaje gestionados por systemd |
| Path | \`.path\` | Activación cuando cambia un archivo o directorio |
| Slice | \`.slice\` | Jerarquía de cgroups para limitar recursos |

### 💻 Explorar la arquitectura de systemd

\`\`\`bash
# Confirmar que systemd es el PID 1
ps -p 1
# PID TTY    TIME CMD
#   1 ?   00:00:05 systemd

# Ver cuánto tardó el sistema en arrancar
systemd-analyze

# Ver qué servicios tardaron más (los primeros son el cuello de botella)
systemd-analyze blame | head -10

# Ver el árbol de dependencias de arranque (requiere graphviz)
systemd-analyze dot | dot -Tsvg > /tmp/boot.svg

# Listar todas las unidades activas de tipo service
systemctl list-units --type=service --state=running

# Listar todas las unidades (incluidas las fallidas e inactivas)
systemctl list-units --type=service --all
\`\`\`

### 📖 Ubicación de los archivos de unidad

\`\`\`text
  /usr/lib/systemd/system/    ← instalados por el gestor de paquetes (no editar)
  /etc/systemd/system/        ← configuración local del admin (prioridad sobre /usr/lib)
  /run/systemd/system/        ← unidades temporales generadas en tiempo de ejecución
  ~/.config/systemd/user/     ← unidades de usuario (sin root)

  Prioridad: /etc/ > /run/ > /usr/lib/
\`\`\`

### 📋 Lo que debes recordar

* systemd es el PID 1 — el primer proceso en espacio de usuario, el padre de todos los demás.
* Resuelve dependencias, arranca servicios en paralelo y centraliza los logs.
* Gestiona múltiples tipos de unidades (service, target, socket, timer...).
* Los archivos de unidad del admin van en \`/etc/systemd/system/\` — tienen prioridad sobre los del sistema.

### 🧪 Autoevaluación rápida

1. ¿Qué ventaja tiene systemd sobre SysVinit en cuanto al tiempo de arranque?
2. ¿Por qué el PID 1 nunca puede morir mientras el sistema está encendido?
3. Si un paquete instala una unidad en \`/usr/lib/systemd/system/nginx.service\` y tú creas \`/etc/systemd/system/nginx.service\`, ¿cuál tiene prioridad?

---

1. systemd **arranca servicios en paralelo** cuando sus dependencias lo permiten. SysVinit los arrancaba de forma estrictamente secuencial.
2. Si el PID 1 muere, el kernel no tiene padre para los procesos huérfanos y entra en pánico (kernel panic). Es una característica fundamental de Unix.
3. La de \`/etc/systemd/system/\` — tiene prioridad sobre \`/usr/lib/systemd/system/\`.
`
export default content
