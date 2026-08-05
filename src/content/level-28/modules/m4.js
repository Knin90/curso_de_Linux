const content = `
## Módulo 4 — docker run: contenedores, volúmenes y puertos

### 🎯 Objetivos de aprendizaje

* Dominar los flags más usados de \`docker run\` con criterio de producción.
* Entender la diferencia entre bind mounts, named volumes y tmpfs.
* Gestionar logs, entorno y políticas de restart de contenedores.
* Usar \`docker exec\`, \`docker cp\` y \`docker logs\` para operar contenedores en ejecución.

### ❓ El problema real

Arrancas un contenedor con \`docker run nginx\`. El proceso bloquea tu terminal, los datos que escribe en \`/var/log\` desaparecen cuando el contenedor se borra, y si el servidor se reinicia el contenedor no vuelve a arrancar solo. En producción necesitas contenedores que corran en background, que persistan datos críticos, que expongan puertos de forma controlada y que se recuperen solos de fallos.

### 📖 docker run: el comando completo

La anatomía de \`docker run\`:

\`\`\`bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
\`\`\`

Flags esenciales explicados:

\`\`\`bash
# -d: detached mode (background). Sin este flag, el proceso bloquea la terminal.
# --name: nombre legible para el contenedor. Sin él, Docker asigna nombres aleatorios.
docker run -d --name web nginx:1.25-alpine

# -p: publicar puerto. Formato: host_port:container_port
# 0.0.0.0:80 (todas las IPs del host) → 80 del contenedor
docker run -d --name web -p 80:80 nginx:1.25-alpine

# Publicar en una IP específica del host (más seguro)
docker run -d --name api -p 127.0.0.1:3000:3000 mi-api:latest

# -p sin puerto de host: Docker elige un puerto libre del host
docker run -d --name web -p 80 nginx:1.25-alpine
docker port web  # ver qué puerto se asignó

# --rm: eliminar el contenedor automáticamente al detenerse. Útil para debugging.
docker run --rm -it alpine sh

# -it: interactive + pseudo-TTY. Para sesiones interactivas.
docker run -it ubuntu:22.04 bash
\`\`\`

### 📖 Variables de entorno

\`\`\`bash
# -e / --env: pasar una variable de entorno
docker run -d \
  --name db \
  -e POSTGRES_PASSWORD=secreto \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_DB=produccion \
  postgres:16-alpine

# --env-file: pasar un archivo completo de variables (NO commitear el archivo)
# Contenido de app.env:
# DATABASE_URL=postgres://user:pass@db:5432/app
# REDIS_URL=redis://cache:6379
# SECRET_KEY=abc123def456
docker run -d \
  --name api \
  --env-file ./app.env \
  mi-api:latest

# Ver variables de entorno de un contenedor en ejecución
docker exec mi-contenedor env | sort
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' mi-contenedor
\`\`\`

### 📖 Volúmenes: persistencia de datos

Los datos escritos en la capa de escritura del contenedor se pierden cuando el contenedor se elimina. Para datos que necesitas persistir, tienes tres opciones:

\`\`\`text
Tipo              Almacenado en          Caso de uso
──────────────    ─────────────────────  ──────────────────────────────────────
Bind mount        Filesystem del host    Desarrollo local (hot reload), config
Named volume      /var/lib/docker/       Bases de datos, datos de app, producción
                  volumes/
tmpfs             Memoria RAM del host   Datos temporales sensibles, alto I/O
\`\`\`

**Named volumes** (recomendados para producción):

\`\`\`bash
# Crear un named volume explícitamente
docker volume create datos-postgres

# O Docker lo crea automáticamente en docker run
docker run -d \
  --name postgres \
  -v datos-postgres:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secreto \
  postgres:16-alpine

# Listar volúmenes
docker volume ls
# DRIVER    VOLUME NAME
# local     datos-postgres
# local     redis-data

# Inspeccionar dónde está el volumen en el host
docker volume inspect datos-postgres
# [
#   {
#     "Name": "datos-postgres",
#     "Driver": "local",
#     "Mountpoint": "/var/lib/docker/volumes/datos-postgres/_data",
#     "Labels": {},
#     "Scope": "local"
#   }
# ]

# Ver datos del volumen directamente en el host
sudo ls /var/lib/docker/volumes/datos-postgres/_data
\`\`\`

**Bind mounts** (para desarrollo):

\`\`\`bash
# Montar directorio del host en el contenedor
# Cambios en /home/denis/app/ se reflejan inmediatamente en el contenedor
docker run -d \
  --name dev-api \
  -p 3000:3000 \
  -v /home/denis/app/src:/app/src \
  -v /home/denis/app/config:/app/config:ro \
  mi-api:dev

# :ro = read-only. El contenedor no puede modificar el archivo del host.
# Útil para archivos de configuración que el contenedor solo debe leer.

# Montar un archivo específico (no un directorio)
docker run -d \
  --name nginx \
  -p 80:80 \
  -v /home/denis/nginx.conf:/etc/nginx/nginx.conf:ro \
  nginx:1.25-alpine
\`\`\`

**tmpfs** (datos temporales en RAM):

\`\`\`bash
# tmpfs: datos en memoria, nunca tocan el disco, desaparecen al parar el contenedor
# Útil para: sesiones, tokens temporales, datos sensibles que no deben persistir
docker run -d \
  --name api-segura \
  --tmpfs /tmp:rw,size=100m,mode=1777 \
  --tmpfs /app/sessions:rw,size=50m \
  mi-api:latest
\`\`\`

### 📖 Políticas de restart

\`\`\`bash
# --restart define qué hace Docker si el contenedor se detiene

# no (default): no reinicias automáticamente
docker run -d --restart no mi-app

# always: siempre reiniciar. También arranca con el daemon de Docker.
# Útil para servicios críticos de producción.
docker run -d --restart always --name nginx nginx:alpine

# unless-stopped: como always, EXCEPTO si tú lo detuviste manualmente.
# El más práctico: se recupera de fallos y reinicios del host, pero respeta
# tu docker stop deliberado.
docker run -d --restart unless-stopped --name api mi-api:latest

# on-failure[:max-retries]: reiniciar solo si el contenedor sale con error (exit code != 0)
# Útil para jobs/workers que deben terminar limpiamente
docker run -d --restart on-failure:3 --name worker mi-worker:latest

# Ver la política de restart de un contenedor
docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' mi-contenedor
\`\`\`

### 📖 Operar contenedores en ejecución

\`\`\`bash
# ── docker exec: ejecutar comandos dentro del contenedor ──────────

# Abrir una shell interactiva
docker exec -it mi-contenedor bash
docker exec -it mi-contenedor sh  # para Alpine (no tiene bash por defecto)

# Ejecutar un comando no interactivo
docker exec mi-contenedor ps aux
docker exec mi-contenedor cat /etc/nginx/nginx.conf

# Ejecutar como usuario específico
docker exec -u root mi-contenedor chown -R node:node /app

# ── docker logs: ver la salida del contenedor ─────────────────────

# Ver todos los logs
docker logs mi-contenedor

# Seguir los logs en tiempo real
docker logs -f mi-contenedor

# Últimas 50 líneas
docker logs --tail 50 mi-contenedor

# Con timestamps
docker logs --timestamps mi-contenedor

# Desde hace 1 hora
docker logs --since 1h mi-contenedor

# ── docker cp: copiar archivos hacia/desde el contenedor ──────────

# Del contenedor al host
docker cp mi-contenedor:/app/logs/error.log /tmp/error.log

# Del host al contenedor
docker cp /tmp/config-nueva.json mi-contenedor:/app/config/config.json

# ── Ciclo de vida ─────────────────────────────────────────────────

# Detener limpiamente (envía SIGTERM, espera 10s, luego SIGKILL)
docker stop mi-contenedor

# Detener inmediatamente (SIGKILL)
docker kill mi-contenedor

# Forzar tiempo de espera (por defecto 10 segundos)
docker stop --time 30 mi-contenedor

# Iniciar un contenedor detenido (mantiene su configuración)
docker start mi-contenedor

# Reiniciar
docker restart mi-contenedor

# Ver estadísticas en tiempo real (CPU, RAM, red, I/O)
docker stats
docker stats mi-contenedor
docker stats --no-stream  # una sola lectura, no continuo

# ── Inspeccionar estado completo ──────────────────────────────────

# JSON completo con toda la configuración y estado
docker inspect mi-contenedor

# Campos específicos con format
docker inspect --format '{{.State.Status}}' mi-contenedor
docker inspect --format '{{.NetworkSettings.IPAddress}}' mi-contenedor
docker inspect --format '{{.Mounts}}' mi-contenedor
\`\`\`

### 📖 Límites de recursos en docker run

\`\`\`bash
# Límite de memoria: el contenedor muere con OOM si supera el límite
# --memory-swap igual a --memory significa sin swap para el contenedor
docker run -d \
  --name api \
  --memory="512m" \
  --memory-swap="512m" \
  --cpus="1.5" \
  --pids-limit=200 \
  mi-api:latest

# Soft limit: el contenedor puede superar hasta que el host necesite memoria
docker run -d \
  --memory-reservation="256m" \
  --memory="512m" \
  mi-api:latest

# Verificar que los límites se aplicaron
docker stats --no-stream mi-api
# CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %   NET I/O
# a3f1b2c3d4e5   api    0.8%    128MiB / 512MiB     25.0%   1.2kB / 980B
\`\`\`

### 📋 Lo que debes recordar

* \`-d\` para background; \`--name\` para nombres legibles; \`--rm\` para contenedores de un solo uso.
* \`-p host:container\` publica puertos; usa \`127.0.0.1:puerto:puerto\` para no exponer al exterior.
* Named volumes son la opción correcta para datos de producción; bind mounts para desarrollo.
* \`unless-stopped\` es la política de restart más práctica: se recupera de fallos pero respeta \`docker stop\`.
* \`docker exec -it contenedor sh\` para acceder al contenedor; \`docker logs -f\` para seguir logs.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`docker stop\` y \`docker kill\`? ¿Cuándo usarías cada uno?
2. Tienes PostgreSQL corriendo con \`-v datos-pg:/var/lib/postgresql/data\`. Ejecutas \`docker rm -f postgres\`. ¿Se pierden los datos? ¿Por qué?
3. ¿Cuándo preferirías \`--restart unless-stopped\` sobre \`--restart always\`?

---

1. \`docker stop\` envía **SIGTERM** al proceso principal, espera el tiempo de gracia (10s por defecto) para que cierre limpiamente, y si no terminó envía **SIGKILL**. \`docker kill\` envía **SIGKILL** inmediatamente, sin gracia. Usa \`stop\` en operación normal para dar tiempo a la aplicación de cerrar conexiones y escribir datos. Usa \`kill\` solo cuando el contenedor no responde a \`stop\`.
2. **No se pierden**. Los named volumes son independientes del ciclo de vida del contenedor. \`docker rm\` elimina el contenedor (el proceso y su capa de escritura), pero el volume \`datos-pg\` permanece en \`/var/lib/docker/volumes/datos-pg/\`. Para eliminar el volumen también necesitarías \`docker rm -fv postgres\` o \`docker volume rm datos-pg\`.
3. \`unless-stopped\` es preferible en la mayoría de casos: se reinicia automáticamente si el contenedor falla o si el host se reinicia, **pero** si tú detuviste el contenedor manualmente con \`docker stop\`, no lo vuelve a arrancar. Con \`always\`, aunque hagas \`docker stop\` deliberadamente, el contenedor vuelve a arrancar la próxima vez que dockerd arranca. \`unless-stopped\` respeta la intención del operador.
`

export default content
