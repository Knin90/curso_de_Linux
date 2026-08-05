const content = `
## Módulo 5 — El sistema de archivos /proc y /sys

### 🎯 Objetivos de aprendizaje

* Entender qué son /proc y /sys y por qué no son archivos reales.
* Leer información del kernel directamente desde /proc.
* Modificar parámetros del kernel en tiempo real con /proc/sys y sysctl.
* Persistir cambios de parámetros del kernel entre reinicios.

### ❓ El problema real

Necesitas aumentar el número máximo de conexiones abiertas en un servidor de alta concurrencia. Buscas en Google y encuentras: "escribe X en /proc/sys/net/core/somaxconn". Pero ¿qué es ese archivo? ¿Por qué escribir en un "archivo" cambia el comportamiento del kernel? ¿Cómo saber si el cambio sobrevivió al reinicio? /proc y /sys son la interfaz directa entre el espacio de usuario y el kernel — entenderlos te da control real sobre el sistema.

### 📖 ¿Qué son /proc y /sys?

No son directorios en tu disco duro. Son **sistemas de archivos virtuales** generados por el kernel en tiempo real:

\`\`\`text
┌─────────────────────────────────────────────────────────────┐
│                        KERNEL                               │
│  estructuras de datos internas: procesos, red, memoria...   │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               ▼                          ▼
    ┌──────────────────┐      ┌──────────────────────┐
    │   /proc          │      │   /sys               │
    │                  │      │                      │
    │  Vista de        │      │  Vista del           │
    │  procesos y      │      │  hardware y          │
    │  estado general  │      │  parámetros del      │
    │  del kernel      │      │  kernel              │
    └──────────────────┘      └──────────────────────┘
         procfs                      sysfs
\`\`\`

Leer \`/proc/meminfo\` no lee un archivo en disco — el kernel genera esos bytes al momento de la lectura.

### 📖 /proc: información de procesos y sistema

\`\`\`bash
# Información de cada proceso (directorio por PID)
ls /proc/1/           # PID 1 = systemd o init
cat /proc/1/cmdline   # comando completo (separado por null bytes)
cat /proc/1/status    # estado: memoria, UID, PID, etc.
cat /proc/1/maps      # mapa de memoria virtual del proceso
ls /proc/1/fd/        # file descriptors abiertos

# Tu propio proceso (shell actual)
cat /proc/self/status
\`\`\`

**Archivos de información global:**

\`\`\`bash
# Información de CPU
cat /proc/cpuinfo

# Información de memoria
cat /proc/meminfo

# Uptime del sistema (segundos)
cat /proc/uptime

# Versión del kernel
cat /proc/version

# Módulos cargados
cat /proc/modules     # equivale a lsmod

# Particiones y sistemas de archivos
cat /proc/mounts      # filesystems montados
cat /proc/partitions  # particiones conocidas

# Estadísticas de red
cat /proc/net/dev     # tráfico por interfaz
cat /proc/net/tcp     # conexiones TCP activas

# Estadísticas de I/O de disco
cat /proc/diskstats
\`\`\`

### 📖 /proc/sys: parámetros del kernel

\`\`\`bash
# Ver el valor máximo de file descriptors abiertos
cat /proc/sys/fs/file-max

# Modificarlo (como root)
echo 1000000 > /proc/sys/fs/file-max

# Número máximo de conexiones en cola de escucha (listen backlog)
cat /proc/sys/net/core/somaxconn

# Habilitar IP forwarding (necesario para router/firewall)
cat /proc/sys/net/ipv4/ip_forward
echo 1 > /proc/sys/net/ipv4/ip_forward
\`\`\`

**Importante:** cambios en /proc/sys son **inmediatos pero volátiles** — se pierden al reiniciar.

### 📖 sysctl: la forma correcta de gestionar parámetros

\`\`\`bash
# Leer un parámetro (nombre con puntos, no con slashes)
sysctl net.ipv4.ip_forward
sysctl vm.swappiness
sysctl fs.file-max

# Modificar en tiempo real
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w vm.swappiness=10

# Ver todos los parámetros disponibles
sysctl -a

# Buscar parámetros relacionados con swap
sysctl -a | grep swap
\`\`\`

**Persistencia entre reinicios:**

\`\`\`bash
# Editar el archivo de configuración permanente
sudo nano /etc/sysctl.conf
# O mejor: crear un archivo en sysctl.d/
sudo nano /etc/sysctl.d/99-custom.conf
\`\`\`

\`\`\`ini
# /etc/sysctl.d/99-custom.conf

# Reducir swap para sistemas con suficiente RAM
vm.swappiness = 10

# Aumentar file descriptors para servidores de alta concurrencia
fs.file-max = 1000000

# Habilitar IP forwarding (para firewall/router)
net.ipv4.ip_forward = 1

# Aumentar buffer TCP para conexiones de alta velocidad
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216

# Protección básica de red
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
\`\`\`

Aplicar sin reiniciar:

\`\`\`bash
sudo sysctl -p /etc/sysctl.d/99-custom.conf
# O recargar todos los archivos:
sudo sysctl --system
\`\`\`

### 📖 /sys: hardware y drivers

\`\`\`bash
# Discos disponibles
ls /sys/block/

# Información del disco sda
cat /sys/block/sda/size          # tamaño en sectores de 512 bytes
cat /sys/block/sda/queue/rotational  # 0 = SSD, 1 = HDD

# Optimización de scheduler para SSD
cat /sys/block/sda/queue/scheduler
# [mq-deadline] kyber bfq none  ← el activo entre corchetes

# Cambiar scheduler para mejor rendimiento SSD
echo mq-deadline > /sys/block/sda/queue/scheduler

# CPUs online
ls /sys/devices/system/cpu/
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Temperatura de la CPU (si hwmon está disponible)
cat /sys/class/thermal/thermal_zone0/temp   # en miliCelsius
\`\`\`

### 📖 Parámetros útiles de producción

\`\`\`text
PARÁMETRO                          DESCRIPCIÓN / VALOR TÍPICO
─────────────────────────────────────────────────────────────────
vm.swappiness = 10                 Prefiere RAM sobre swap (0-100, default: 60)
vm.dirty_ratio = 10                % RAM con páginas sucias antes de sync a disco
fs.file-max = 1000000              Máximo de file descriptors del sistema
net.core.somaxconn = 65535         Máximo de conexiones en cola de escucha
net.ipv4.tcp_syncookies = 1        Protección contra SYN flood
net.ipv4.ip_local_port_range = 1024 65535   Rango de puertos efímeros
\`\`\`

### 📋 Lo que debes recordar

* /proc y /sys son filesystems virtuales — no tienen datos en disco, el kernel los genera dinámicamente.
* Escribir en /proc/sys cambia el kernel en tiempo real pero se pierde al reiniciar.
* Usa \`sysctl -w\` + \`/etc/sysctl.d/\` para cambios persistentes.
* \`/sys/block/<disco>/queue/rotational\` es la forma confiable de detectar si un disco es SSD (0) o HDD (1).

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`echo 1 > /proc/sys/net/ipv4/ip_forward\` y \`sysctl -w net.ipv4.ip_forward=1\`?
2. ¿Cómo harías permanente el cambio de ip_forward entre reinicios?
3. Un proceso nginx abre miles de conexiones pero falla con "too many open files". ¿Qué parámetro del kernel revisarías?

---

1. **Son equivalentes** — ambos modifican el mismo parámetro en tiempo real. La diferencia es solo sintáctica: el path de /proc usa slashes, sysctl usa puntos. Ninguno de los dos persiste el cambio entre reinicios.
2. Agregar \`net.ipv4.ip_forward = 1\` a \`/etc/sysctl.d/99-custom.conf\` y ejecutar \`sudo sysctl --system\` para aplicar sin reiniciar. Al próximo arranque se aplica automáticamente.
3. Revisar \`fs.file-max\` (máximo global del sistema) con \`sysctl fs.file-max\`, y también los límites por proceso con \`ulimit -n\` o revisando \`/etc/security/limits.conf\` — el problema puede estar en el límite del sistema operativo o en el límite por proceso del usuario nginx.
`

export default content
