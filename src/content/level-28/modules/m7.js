const content = `
## Módulo 7 — Seguridad de contenedores: capabilities, seccomp y rootless

### 🎯 Objetivos de aprendizaje

* Entender por qué root dentro de un contenedor es un riesgo real para el host.
* Conocer el sistema de Linux capabilities y qué otorga Docker por defecto.
* Aplicar el principio de mínimo privilegio: \`--cap-drop=ALL\` y \`--cap-add\` selectivo.
* Usar perfiles seccomp para restringir llamadas al sistema disponibles en el contenedor.
* Configurar contenedores con sistema de archivos de solo lectura y sin escalada de privilegios.
* Implementar Docker rootless para eliminar el daemon root del sistema.

### ❓ El problema real

Tu contenedor ejecuta un proceso como root. Un atacante explota una vulnerabilidad en tu
aplicación y obtiene una shell. Desde esa shell, el proceso tiene uid 0 en el kernel del
host (si no hay user namespaces). Puede montar el sistema de archivos del host, leer
\`/etc/shadow\`, instalar rootkits, o escapar al host mediante vulnerabilidades del kernel.
¿Cómo minimizas el daño si un contenedor es comprometido?

### 📖 El problema de root en contenedores

\`\`\`bash
# Por defecto, los contenedores corren como root
docker run alpine id
# uid=0(root) gid=0(root) groups=0(root)

# Si montas el socket de Docker, tienes control total del host
docker run -v /var/run/docker.sock:/var/run/docker.sock alpine
# Desde aquí puedes lanzar contenedores privilegiados y escapar al host

# Sin user namespaces, root en el contenedor = root en el kernel del host
# (aunque el nombre del proceso sea distinto)
\`\`\`

La defensa en profundidad requiere múltiples capas: capabilities, seccomp, AppArmor,
usuarios no root, sistema de archivos de solo lectura.

### 📖 Linux capabilities

Los privilegios de root en Linux no son una sola cosa — están divididos en 64 capabilities
independientes. Docker no otorga todas al iniciar un contenedor; solo un subconjunto.

**Capabilities que Docker otorga por defecto:**

| Capability | Qué permite |
|---|---|
| \`CAP_CHOWN\` | Cambiar propietario de archivos |
| \`CAP_DAC_OVERRIDE\` | Ignorar permisos de archivos (lectura/escritura) |
| \`CAP_FOWNER\` | Operaciones que requieren uid igual al del archivo |
| \`CAP_FSETID\` | Mantener setuid/setgid en archivos |
| \`CAP_KILL\` | Enviar señales a cualquier proceso |
| \`CAP_NET_BIND_SERVICE\` | Escuchar en puertos menores de 1024 |
| \`CAP_SETGID\` | Cambiar GID del proceso |
| \`CAP_SETUID\` | Cambiar UID del proceso |
| \`CAP_SETPCAP\` | Modificar capabilities de otros procesos |
| \`CAP_MKNOD\` | Crear archivos de dispositivo |
| \`CAP_AUDIT_WRITE\` | Escribir en el log de auditoría del kernel |
| \`CAP_SYS_CHROOT\` | Llamar a \`chroot()\` |

**Capabilities peligrosas que Docker NO otorga (pero puedes agregar accidentalmente):**

- \`CAP_SYS_ADMIN\`: el "cajón de sastre" — permite montar filesystems, manipular namespaces, etc.
- \`CAP_NET_ADMIN\`: modificar interfaces de red, rutas, iptables.
- \`CAP_SYS_PTRACE\`: trazar procesos — permite leer memoria de otros procesos.

### 📖 Principio de mínimo privilegio con capabilities

\`\`\`bash
# Eliminar TODAS las capabilities y agregar solo las necesarias
docker run \\
  --cap-drop=ALL \\
  --cap-add=NET_BIND_SERVICE \\
  nginx

# Verificar capabilities efectivas dentro del contenedor
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE alpine \\
  cat /proc/1/status | grep ^Cap
# CapEff: 0000000000000400  ← solo NET_BIND_SERVICE (bit 10)

# Ver capabilities como texto legible
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE alpine \\
  apk add -q libcap && capsh --decode=0000000000000400
\`\`\`

**Regla práctica:** la mayoría de aplicaciones web en puertos > 1024 no necesitan
ninguna capability. \`--cap-drop=ALL\` sin \`--cap-add\` es el punto de partida ideal.

\`\`\`bash
# Para aplicaciones que escuchan en puerto 3000: ninguna capability necesaria
docker run --cap-drop=ALL my-api-image

# Para nginx en puerto 80: necesita NET_BIND_SERVICE
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE nginx
\`\`\`

### 📖 Perfiles seccomp

Seccomp (Secure Computing Mode) filtra las llamadas al sistema que un proceso puede hacer.
Docker aplica un perfil seccomp predeterminado que bloquea ~44 syscalls consideradas peligrosas.

**Syscalls bloqueadas por el perfil predeterminado de Docker:**
- \`reboot\` — reiniciar el host
- \`mount\` — montar sistemas de archivos
- \`kexec_load\` — cargar un kernel diferente
- \`ptrace\` — trazar otros procesos
- \`clone\` con flags de namespace — crear nuevos namespaces
- \`unshare\` — desunir namespaces

\`\`\`bash
# El perfil predeterminado se aplica automáticamente
docker run alpine reboot
# Operation not permitted (bloqueado por seccomp)

# Deshabilitar seccomp (NO recomendado, solo para depuración)
docker run --security-opt seccomp=unconfined alpine reboot

# Aplicar un perfil personalizado
docker run --security-opt seccomp=/path/to/mi-perfil.json alpine
\`\`\`

**Estructura básica de un perfil seccomp personalizado:**
\`\`\`json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "syscalls": [
    {
      "names": ["read", "write", "open", "close", "stat", "exit_group",
                "futex", "mmap", "brk", "rt_sigaction"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
\`\`\`

Un perfil de allowlist (todo bloqueado por defecto, solo lo listado permitido)
es más seguro que el perfil predeterminado de Docker para aplicaciones conocidas.

### 📖 AppArmor

AppArmor restringe qué archivos puede acceder un proceso y qué operaciones puede realizar,
basándose en perfiles cargados en el kernel.

\`\`\`bash
# Docker aplica docker-default cuando AppArmor está habilitado en el host
docker run --security-opt apparmor=docker-default nginx

# Verificar perfil activo
docker inspect mi-contenedor --format '{{.HostConfig.SecurityOpt}}'

# Deshabilitar AppArmor (solo para depuración)
docker run --security-opt apparmor=unconfined nginx
\`\`\`

### 📖 Sistema de archivos de solo lectura

\`\`\`bash
# Montar el rootfs como solo lectura
docker run --read-only nginx
# nginx falla porque necesita escribir en /tmp y /var/run

# Solución: combinar --read-only con --tmpfs para directorios que sí necesitan escritura
docker run \\
  --read-only \\
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \\
  --tmpfs /var/run:rw,noexec,nosuid,size=10m \\
  nginx

# Verificar
docker exec mi-contenedor touch /etc/hosts
# Read-only file system
\`\`\`

El rootfs de solo lectura impide que malware modifique binarios del sistema,
instale backdoors o persista entre reinicios del contenedor.

### 📖 No-new-privileges

Previene que procesos dentro del contenedor ganen privileges adicionales mediante
setuid binaries o cambios en capabilities.

\`\`\`bash
docker run \\
  --security-opt no-new-privileges:true \\
  mi-contenedor

# Sin este flag, un binario setuid dentro del contenedor podría elevar privilegios
# Con el flag, el bit setuid es ignorado
\`\`\`

### 📖 Usuario no root en Dockerfile

\`\`\`dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/

# Cambiar al usuario no-root antes de CMD
# node:alpine ya incluye el usuario "node" con uid 1000
USER node

EXPOSE 3000
CMD ["node", "src/index.js"]
\`\`\`

\`\`\`bash
# Verificar que el contenedor corre como no-root
docker run mi-contenedor id
# uid=1000(node) gid=1000(node) groups=1000(node)

# Si la imagen base no tiene usuario, crearlo explícitamente
# En el Dockerfile:
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# USER appuser
\`\`\`

### 📖 Docker rootless

En modo rootless, el daemon de Docker y todos los contenedores corren bajo el uid del
usuario actual, sin ningún proceso privilegiado del sistema.

\`\`\`bash
# Instalar Docker rootless (como usuario normal, no root)
dockerd-rootless-setuptool.sh install

# Activar el contexto rootless
docker context use rootless

# Verificar
docker context ls
# NAME       DESCRIPTION
# rootless * Docker rootless context

# Los contenedores ahora usan user namespaces
docker run alpine id
# uid=0(root) gid=0(root) — pero mapeado a tu uid en el host
ps aux | grep dockerd
# tu_usuario  ... dockerd  ← el daemon corre con tu uid
\`\`\`

Limitaciones de rootless: no puedes publicar puertos < 1024 sin configuración adicional,
algunas opciones de red (macvlan) no están disponibles.

### 📖 Escaneo de vulnerabilidades

\`\`\`bash
# Trivy: escáner de CVEs para imágenes (instalar con brew o apt)
trivy image mi-imagen:latest

# Salida típica:
# Total: 23 (HIGH: 5, MEDIUM: 12, LOW: 6)
# ┌────────────────┬───────────────┬──────────┬──────────────────────────┐
# │    Library     │ Vulnerability │ Severity │         Fix Version      │
# ├────────────────┼───────────────┼──────────┼──────────────────────────┤
# │ libssl1.1      │ CVE-2023-1234 │ HIGH     │ 1.1.1t-r0                │

# Docker Scout (integrado en Docker Desktop)
docker scout cves mi-imagen:latest
docker scout recommendations mi-imagen:latest
\`\`\`

### 📖 Secretos: lo que NO debes hacer

\`\`\`dockerfile
# MAL: las variables de entorno son visibles en docker inspect y en el historial
ENV DB_PASSWORD=mi_password_secreto

# MAL: los ARG quedan en el historial de capas
ARG DB_PASSWORD
RUN echo \$DB_PASSWORD > /config

# BIEN: BuildKit secrets (el secreto nunca queda en la imagen)
RUN --mount=type=secret,id=db_password \\
    cat /run/secrets/db_password > /config
# docker build --secret id=db_password,src=./secrets/db_password .
\`\`\`

\`\`\`bash
# Verificar que ningún secreto quedó en variables de entorno
docker inspect mi-contenedor --format '{{.Config.Env}}'

# Verificar que el contenedor no está en modo privilegiado
docker inspect mi-contenedor --format '{{.HostConfig.Privileged}}'
# false ← correcto

# Ver todas las opciones de seguridad activas
docker inspect mi-contenedor --format '{{.HostConfig.SecurityOpt}}'
\`\`\`

### 📋 Lo que debes recordar

* Root dentro del contenedor es uid 0 en el kernel del host sin user namespaces — no es "seguro".
* \`--cap-drop=ALL\` elimina todos los privilegios; agrega solo lo necesario con \`--cap-add\`.
* El perfil seccomp predeterminado de Docker bloquea ~44 syscalls peligrosas automáticamente.
* \`--security-opt no-new-privileges:true\` impide la escalada mediante binarios setuid.
* \`--read-only\` con \`--tmpfs\` para directorios de escritura es la combinación correcta.
* Usa la instrucción \`USER\` en el Dockerfile; nunca dejes el proceso corriendo como uid 0.
* Docker rootless elimina el daemon root del sistema — mayor aislamiento, menor riesgo sistémico.
* Nunca uses \`ENV\` para contraseñas; usa BuildKit secrets o un gestor externo.
* Escanea imágenes con \`trivy\` o \`docker scout\` antes de desplegar.

### 🧪 Autoevaluación

1. ¿Por qué \`--cap-drop=ALL\` no es suficiente por sí solo para asegurar un contenedor que escucha en el puerto 80?

2. Un contenedor necesita poder crear archivos en \`/tmp\` pero no debe poder modificar ningún otro archivo del sistema. ¿Qué combinación de flags usas?

3. ¿Cuál es la diferencia entre seccomp y AppArmor en términos de qué controla cada uno?

---

1. Puerto 80 es menor que 1024. Para que un proceso escuche en él necesita \`CAP_NET_BIND_SERVICE\`. Con \`--cap-drop=ALL\` solo, el proceso falla al intentar hacer \`bind()\`. Debes agregar \`--cap-add=NET_BIND_SERVICE\`. Si en cambio usas el puerto 3000, no necesitas ninguna capability.

2. \`docker run --read-only --tmpfs /tmp:rw,noexec,nosuid mi-imagen\`. El rootfs queda de solo lectura; Docker monta \`/tmp\` como tmpfs en memoria con escritura permitida pero sin ejecución de binarios ni setuid.

3. Seccomp opera al nivel de syscalls: controla qué llamadas al sistema puede hacer el proceso (ej: bloquea \`mount\`, \`reboot\`, \`ptrace\`). AppArmor opera al nivel de recursos del sistema de archivos y redes: controla a qué archivos puede acceder el proceso y qué operaciones puede realizar sobre ellos (ej: solo lectura de \`/etc/\`, escritura prohibida en \`/usr/\`). Son complementarios, no excluyentes.
`

export default content
