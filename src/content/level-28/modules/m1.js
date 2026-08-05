const content = `
## Módulo 1 — Fundamentos: namespaces, cgroups y qué es un contenedor

### 🎯 Objetivos de aprendizaje

* Entender qué es un contenedor a nivel del kernel Linux, sin abstracciones de marketing.
* Conocer los 6 namespaces de Linux y qué aíslan exactamente.
* Comprender cgroups v2 y cómo imponen límites de recursos.
* Distinguir con precisión la diferencia entre un contenedor y una VM.
* Saber qué garantías de aislamiento ofrece un contenedor y cuáles no ofrece.

### ❓ El problema real

Tienes una aplicación Node.js que requiere Node 18 y otra que requiere Node 16. En el mismo servidor, ambas versiones coexisten mal. Además, la primera consume toda la RAM cuando está bajo carga y tumba la segunda. Y cuando el desarrollador dice "funciona en mi máquina", nadie sabe exactamente qué versión de librería tenía instalada. Los contenedores resuelven los tres problemas: aislamiento de entorno, límites de recursos y empaquetado reproducible. Pero para administrarlos bien, necesitas entender lo que son realmente: procesos de Linux con namespaces y cgroups.

### 📖 Qué es realmente un contenedor

Un contenedor **no es una VM**. No tiene un kernel propio. No bootea. Es simplemente un proceso (o árbol de procesos) del kernel Linux al que se le aplican dos tecnologías:

\`\`\`text
CONTENEDOR = proceso Linux + namespaces + cgroups
\`\`\`

Los **namespaces** le dan al proceso una vista aislada del sistema: cree que tiene su propio árbol de procesos, su propia red, su propio filesystem. Los **cgroups** limitan cuántos recursos puede consumir: cuánta CPU, cuánta RAM, cuánto I/O de disco.

El kernel es compartido. Si hay una vulnerabilidad crítica en el kernel, un contenedor puede verse afectado igual que el host.

### 📖 Linux namespaces: los 6 tipos

Los namespaces son la primitiva de aislamiento. Cada proceso puede pertenecer a distintos namespaces para cada recurso:

\`\`\`text
Namespace   Flag          Aisla
──────────  ────────────  ─────────────────────────────────────────────────────
pid         CLONE_NEWPID  Árbol de procesos. El PID 1 del contenedor es PID
                          diferente para el host. Dentro, solo ves tus propios
                          procesos.
net         CLONE_NEWNET  Interfaces de red, tablas de rutas, iptables. El
                          contenedor tiene su propia eth0, su propia loopback,
                          su propia tabla de rutas.
mnt         CLONE_NEWNS   Puntos de montaje. El contenedor ve su propio
                          filesystem raíz, independiente del host.
uts         CLONE_NEWUTS  Hostname y domainname. El contenedor puede tener un
                          nombre de host distinto del host.
ipc         CLONE_NEWIPC  Colas de mensajes SysV, semáforos, shared memory.
                          Procesos de distintos contenedores no se comunican
                          por IPC.
user        CLONE_NEWUSER Mapeo de UIDs/GIDs. El UID 0 dentro del contenedor
                          puede mapearse a un UID no-root en el host.
\`\`\`

Puedes crear un namespace manualmente con \`unshare\`:

\`\`\`bash
# Crear un nuevo namespace PID y ejecutar bash dentro
sudo unshare --pid --fork --mount-proc bash

# Dentro del nuevo namespace, solo vemos nuestros propios procesos
ps aux
# USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
# root         1  0.0  0.0   4236  3456 pts/0    S    10:00   0:00 bash
# root         8  0.0  0.0   8076  1984 pts/0    R+   10:00   0:00 ps aux

# Desde el host, el proceso bash tiene un PID diferente
# (en otra terminal)
ps aux | grep bash
# root      4821  0.0  0.0   4236  3456 pts/1    S+   10:00   0:00 bash
\`\`\`

Los archivos \`/proc/PID/ns/\` muestran a qué namespace pertenece cada proceso:

\`\`\`bash
# Ver los namespaces de un contenedor Docker en ejecución
CONTAINER_PID=\$(docker inspect --format '{{.State.Pid}}' mi-contenedor)
ls -la /proc/\${CONTAINER_PID}/ns/

# lrwxrwxrwx 1 root root 0 /proc/4821/ns/pid -> 'pid:[4026532456]'
# lrwxrwxrwx 1 root root 0 /proc/4821/ns/net -> 'net:[4026532398]'
# lrwxrwxrwx 1 root root 0 /proc/4821/ns/mnt -> 'mnt:[4026532401]'

# Los números diferentes al host confirman que está en un namespace distinto
ls -la /proc/1/ns/
# lrwxrwxrwx 1 root root 0 /proc/1/ns/pid -> 'pid:[4026531836]'
\`\`\`

### 📖 cgroups v2: límites de recursos

Los **control groups** (cgroups) controlan cuántos recursos puede consumir un proceso o grupo de procesos. cgroups v2 es la versión moderna, unificada, disponible desde kernel 4.5 y por defecto en distribuciones modernas.

La jerarquía de cgroups se gestiona a través del filesystem virtual \`/sys/fs/cgroup/\`:

\`\`\`bash
# Ver la jerarquía de cgroups
ls /sys/fs/cgroup/
# cgroup.controllers  cgroup.max.depth  cpu.pressure  memory.pressure
# cgroup.events       cgroup.procs      io.pressure   system.slice
# ...

# Ver los cgroups de Docker
ls /sys/fs/cgroup/system.slice/docker-*.scope 2>/dev/null | head -5
# /sys/fs/cgroup/system.slice/docker-a3f1b2c3d4e5.scope

# Ver límites de memoria de un contenedor
cat /sys/fs/cgroup/system.slice/docker-a3f1b2c3d4e5.scope/memory.max
# 536870912   (512MB en bytes)
\`\`\`

Docker establece cgroups automáticamente. Tú controlas los límites con flags en \`docker run\`:

\`\`\`bash
# Limitar memoria a 512MB y CPU a 0.5 cores
docker run -d \
  --memory="512m" \
  --memory-swap="512m" \
  --cpus="0.5" \
  --name app-limitada \
  nginx

# Verificar que los cgroups se crearon
docker inspect app-limitada | grep -A5 '"Memory"'
# "Memory": 536870912,
# "NanoCpus": 500000000,

# Límite de I/O de disco: máximo 10MB/s lectura en /dev/sda
docker run -d \
  --device-read-bps /dev/sda:10mb \
  --name io-limitada \
  nginx
\`\`\`

### 📖 Contenedor vs VM: la comparación honesta

\`\`\`text
                    CONTENEDOR              MÁQUINA VIRTUAL
                    ───────────             ───────────────
Kernel              Compartido con host     Propio (guest kernel)
Boot time           Milisegundos            Segundos a minutos
Overhead            ~1-3% (namespaces)      5-15% (hypervisor)
Aislamiento         Namespaces (kernel      Hardware virtualizado
                    compartido)             (kernel separado)
Tamaño imagen       MB (solo filesystem)    GB (OS completo)
Portabilidad        Muy alta (OCI estándar) Alta (vmdk, qcow2)
Seguridad           Kernel compartido       Kernel separado
                    (mayor superficie)      (menor superficie)
Uso de RAM          Solo el proceso         OS completo + proceso
\`\`\`

El resumen práctico: **usa contenedores para aplicaciones; usa VMs cuando necesitas aislamiento de kernel** (distintos OS, requisitos de seguridad estrictos, kernels distintos).

### 📖 runc y OCI: el runtime de bajo nivel

Docker no ejecuta contenedores directamente. La cadena real es:

\`\`\`text
docker run
    │
    ▼
dockerd (Docker daemon)
    │
    ▼
containerd (gestión de ciclo de vida)
    │
    ▼
runc (OCI runtime: crea namespaces, cgroups, exec)
    │
    ▼
proceso contenedor (tu aplicación)
\`\`\`

**runc** es la implementación de referencia del estándar OCI (Open Container Initiative). Es lo que realmente llama a \`clone()\`, \`unshare()\` y escribe en \`/sys/fs/cgroup/\`. Puedes usar runc directamente sin Docker:

\`\`\`bash
# Instalar y usar runc directamente (uso avanzado)
# runc spec  # genera config.json (OCI bundle spec)
# runc run mi-contenedor

# Ver el OCI spec que Docker genera
docker inspect --format '{{json .HostConfig}}' mi-contenedor | python3 -m json.tool
\`\`\`

### 📖 /var/lib/docker: dónde vive todo

\`\`\`bash
# Estructura de /var/lib/docker en producción
sudo ls /var/lib/docker/
# buildkit/    containers/   image/   network/
# overlay2/    plugins/      tmp/     trust/   volumes/

# overlay2: donde viven las capas de las imágenes
sudo ls /var/lib/docker/overlay2/ | head -5
# a1b2c3d4e5f6...  (ID de capa)
# b2c3d4e5f6a7...

# containers: estado de cada contenedor
sudo ls /var/lib/docker/containers/
# a3f1b2c3d4e5...  (container ID)

# Config y logs de un contenedor específico
sudo ls /var/lib/docker/containers/a3f1b2c3d4e5.../
# a3f1...json  config.v2.json  hostconfig.json  hostname
# hosts        mounts/         resolv.conf       shm/
\`\`\`

### 📖 Garantías de aislamiento: qué protege y qué no

Lo que los namespaces **sí** aíslan:
- Árbol de procesos (pid namespace)
- Interfaces y rutas de red (net namespace)
- Sistema de archivos (mnt namespace)
- Hostname (uts namespace)
- Memoria IPC (ipc namespace)

Lo que **no** está aislado sin configuración adicional:
- El kernel y sus llamadas al sistema (syscalls)
- El tiempo del sistema (\`/proc/sys/kernel/\` compartido)
- Algunos recursos \`/proc\` sin protección adicional
- Dispositivos del host (sin restricciones explícitas)

Por eso existen herramientas adicionales: seccomp (filtrar syscalls), AppArmor/SELinux (MAC), capabilities (reducir privilegios root). Las veremos en el Módulo 7.

### 📋 Lo que debes recordar

* Un contenedor es un proceso Linux con namespaces (aislamiento de vista) y cgroups (límites de recursos).
* Los 6 namespaces: pid, net, mnt, uts, ipc, user. Cada uno aísla un recurso distinto.
* cgroups v2 se gestiona en \`/sys/fs/cgroup/\` y permite limitar memoria, CPU e I/O.
* El kernel es compartido: un contenedor no es una VM y no tiene el mismo nivel de aislamiento de kernel.
* runc es el runtime OCI de bajo nivel; Docker lo usa a través de containerd.

### 🧪 Autoevaluación

1. ¿Qué namespace de Linux es responsable de que un contenedor tenga su propia dirección IP y tabla de rutas?
2. Un proceso dentro de un contenedor consume RAM sin límite y provoca OOM en el host. ¿Qué configuración faltó y en qué flag de \`docker run\` se establece?
3. ¿Por qué un exploit de vulnerabilidad en el kernel Linux puede afectar a un contenedor igual que al proceso host?

---

1. El namespace **net** (\`CLONE_NEWNET\`) aísla las interfaces de red, tablas de rutas y reglas iptables. Cada contenedor tiene su propia interfaz virtual conectada al bridge de Docker.
2. Faltó un límite de memoria via cgroups. Se establece con \`--memory="512m"\` en \`docker run\`. Sin ese flag, el contenedor comparte el pool de memoria del host sin restricciones.
3. Porque el kernel es **compartido** entre el host y todos los contenedores. Los namespaces aíslan la vista de los recursos, pero las syscalls llegan al mismo kernel. Una vulnerabilidad de escape de contenedor (container breakout) puede explotar el kernel directamente y comprometer el host completo.
`

export default content
