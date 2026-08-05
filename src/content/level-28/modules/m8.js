const content = `
## Módulo 8 — Laboratorio: containerizar una aplicación real

### 🎯 Objetivos de aprendizaje

* Aplicar el ciclo completo de containerización: desde una aplicación local hasta un contenedor seguro y optimizado.
* Progresar iterativamente: imagen ingenua → multi-stage → red personalizada → hardening de seguridad.
* Combinar los conocimientos de los módulos anteriores en un flujo de trabajo real.
* Verificar cada fase con comandos de diagnóstico y validación.

### ❓ El problema real

Tienes una API REST en Node.js que se conecta a PostgreSQL. Actualmente solo corre en tu
máquina con \`node index.js\` y \`psql\` instalados localmente. El equipo necesita que sea
reproducible en cualquier entorno, que la imagen pese menos de 150 MB, que no corra como
root, y que la base de datos sea accesible solo desde la API — no desde el exterior.

### 📖 Estructura de la aplicación

\`\`\`
my-api/
├── package.json
├── package-lock.json
├── src/
│   └── index.js      ← Express API, puerto 3000
└── .env              ← DATABASE_URL (solo desarrollo local)
\`\`\`

\`\`\`js
// src/index.js — Express API mínima
const express = require('express')
const { Pool } = require('pg')

const app = express()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    res.status(503).json({ status: 'error', db: err.message })
  }
})

app.listen(3000, () => console.log('API listening on :3000'))
\`\`\`

---

### 📖 FASE 1 — Containerización básica (imagen ingenua)

\`\`\`dockerfile
# Dockerfile.v1 — punto de partida: simple pero problemático
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "src/index.js"]
\`\`\`

\`\`\`bash
docker build -t myapi:v1 -f Dockerfile.v1 .
docker image ls myapi:v1
# REPOSITORY   TAG   SIZE
# myapi        v1    950MB   ← imagen enorme

docker run myapi:v1 id
# uid=0(root) gid=0(root)   ← corre como root
\`\`\`

**Problemas identificados:**
- Imagen de 950 MB (incluye Debian completo + devDependencies).
- Corre como root dentro del contenedor.
- Sin \`.dockerignore\`: \`node_modules\` local, \`.git\`, \`.env\` viajan al daemon.
- \`npm install\` reinstala todo en cada build aunque \`package.json\` no haya cambiado.

---

### 📖 FASE 2 — Imagen optimizada con multi-stage

**Paso 1: crear \`.dockerignore\`**

\`\`\`bash
# .dockerignore
node_modules/
.git/
.gitignore
.env
.env.*
*.log
dist/
coverage/
README.md
\`\`\`

**Paso 2: Dockerfile optimizado**

\`\`\`dockerfile
# Dockerfile — versión optimizada
# Etapa 1: instalar dependencias de producción
FROM node:20 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Etapa 2: imagen final ligera
FROM node:20-alpine AS runtime
WORKDIR /app

# Copiar solo dependencias de producción desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY src/ ./src/
COPY package.json .

# Healthcheck integrado en la imagen
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget -qO- http://localhost:3000/health || exit 1

# Cambiar a usuario no-root (incluido en node:alpine)
USER node

EXPOSE 3000
CMD ["node", "src/index.js"]
\`\`\`

\`\`\`bash
docker build -t myapi:v2 .
docker image ls myapi:v2
# REPOSITORY   TAG   SIZE
# myapi        v2    118MB   ← 8× más pequeña

docker run myapi:v2 id
# uid=1000(node) gid=1000(node)   ← corre como usuario no-root

# Verificar capas y sus tamaños
docker image history myapi:v2
\`\`\`

---

### 📖 FASE 3 — Red personalizada y PostgreSQL

Conectar la API a PostgreSQL mediante una red bridge personalizada con resolución DNS.

\`\`\`bash
# Crear la red aislada
docker network create \\
  --driver bridge \\
  --subnet 172.25.0.0/24 \\
  --gateway 172.25.0.1 \\
  api-net

# Crear volumen persistente para datos de PostgreSQL
docker volume create pgdata

# Iniciar PostgreSQL en la red (solo accesible desde api-net, sin puerto publicado)
docker run -d \\
  --name postgres \\
  --network api-net \\
  --env POSTGRES_USER=apiuser \\
  --env POSTGRES_PASSWORD=supersecret \\
  --env POSTGRES_DB=apidb \\
  --volume pgdata:/var/lib/postgresql/data \\
  --restart unless-stopped \\
  postgres:15-alpine

# Esperar a que PostgreSQL esté listo
docker exec postgres pg_isready -U apiuser -d apidb
# localhost:5432 - accepting connections

# Iniciar la API con la URL de conexión via nombre DNS "postgres"
docker run -d \\
  --name api \\
  --network api-net \\
  --env DATABASE_URL=postgresql://apiuser:supersecret@postgres:5432/apidb \\
  --publish 3000:3000 \\
  --restart unless-stopped \\
  myapi:v2

# Verificar que la API puede resolver "postgres" por nombre
docker exec api ping -c2 postgres
# 64 bytes from 172.25.0.2 (postgres): icmp_seq=0 ttl=64 time=0.1ms

# Probar el endpoint de salud
curl http://localhost:3000/health
# {"status":"ok","db":"connected"}
\`\`\`

**Comprobación de aislamiento:**
\`\`\`bash
# PostgreSQL NO está accesible desde el host (sin -p publicado)
psql -h localhost -U apiuser apidb
# Connection refused  ← correcto, está aislado

# Solo la API puede acceder a PostgreSQL
docker exec api psql postgresql://apiuser:supersecret@postgres:5432/apidb -c "SELECT version();"
# PostgreSQL 15.x on x86_64-pc-linux-musl
\`\`\`

---

### 📖 FASE 4 — Hardening de seguridad

Aplicar el principio de mínimo privilegio al contenedor de la API.

\`\`\`bash
# Detener el contenedor actual
docker stop api && docker rm api

# Relanzar con hardening completo
docker run -d \\
  --name api \\
  --network api-net \\
  --env DATABASE_URL=postgresql://apiuser:supersecret@postgres:5432/apidb \\
  --publish 127.0.0.1:3000:3000 \\
  --cap-drop=ALL \\
  --security-opt no-new-privileges:true \\
  --read-only \\
  --tmpfs /tmp:rw,noexec,nosuid,size=32m \\
  --restart unless-stopped \\
  myapi:v2
\`\`\`

**Notas sobre los flags aplicados:**
- \`--cap-drop=ALL\`: sin capabilities (puerto 3000 no necesita \`NET_BIND_SERVICE\`).
- \`--security-opt no-new-privileges:true\`: ningún binario setuid puede elevar privilegios.
- \`--read-only\`: el rootfs es inmutable, malware no puede persistir.
- \`--tmpfs /tmp\`: \`/tmp\` en memoria, writable pero sin ejecución.
- \`--publish 127.0.0.1:3000:3000\`: solo accesible desde localhost, no desde la red.

\`\`\`bash
# Verificar hardening aplicado
docker inspect api --format '{{.HostConfig.CapAdd}}'
# []  ← ninguna capability agregada

docker inspect api --format '{{.HostConfig.CapDrop}}'
# [ALL]

docker inspect api --format '{{.HostConfig.Privileged}}'
# false

docker inspect api --format '{{.HostConfig.SecurityOpt}}'
# [no-new-privileges:true]

docker inspect api --format '{{.HostConfig.ReadonlyRootfs}}'
# true

# Intentar escribir en el rootfs (debe fallar)
docker exec api touch /app/evil.sh
# touch: /app/evil.sh: Read-only file system  ← correcto

# /tmp sí debe ser escribible
docker exec api touch /tmp/test.txt
# sin error  ← correcto
\`\`\`

---

### 📖 FASE 5 — Verificación y diagnóstico

\`\`\`bash
# Estado general de los contenedores
docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
# NAMES      STATUS                    PORTS
# api        Up 5 minutes (healthy)    127.0.0.1:3000->3000/tcp
# postgres   Up 6 minutes              5432/tcp

# Uso de recursos en tiempo real
docker stats api postgres --no-stream
# CONTAINER   CPU %   MEM USAGE / LIMIT   MEM %
# api         0.1%    32.5MiB / 7.67GiB   0.4%
# postgres    0.2%    45.2MiB / 7.67GiB   0.6%

# Logs de la API
docker logs api --tail 20 --follow

# Healthcheck status
docker inspect api --format '{{.State.Health.Status}}'
# healthy

# Verificar usuario del proceso
docker exec api id
# uid=1000(node) gid=1000(node) groups=1000(node)

# Endpoint de salud
curl -s http://localhost:3000/health | python3 -m json.tool
# {
#     "status": "ok",
#     "db": "connected"
# }

# Comparación de tamaños final
docker image ls --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}" | grep myapi
# myapi   v1   950MB
# myapi   v2   118MB
\`\`\`

### 📖 Escaneo de vulnerabilidades

\`\`\`bash
# Escanear la imagen final con trivy
trivy image myapi:v2

# Ejemplo de salida (node:20-alpine tiene menos CVEs que node:20 Debian)
# Total: 3 (HIGH: 0, MEDIUM: 1, LOW: 2)
# Mucho mejor que v1 con Debian base

# Escanear también la imagen de PostgreSQL
trivy image postgres:15-alpine

# Si trivy no está instalado:
# Fedora/RHEL: sudo dnf install trivy
# Debian/Ubuntu: sudo apt install trivy
# macOS: brew install trivy
\`\`\`

### 📖 Dockerfile final completo

\`\`\`dockerfile
# ============================================================
# Dockerfile — myapi v2 (optimizado + seguro)
# ============================================================

# ---- Etapa 1: dependencias de producción ----
FROM node:20 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ---- Etapa 2: runtime final ----
FROM node:20-alpine AS runtime

# Metadatos de la imagen
LABEL maintainer="equipo@empresa.com"
LABEL version="2.0"
LABEL description="API REST con PostgreSQL — imagen optimizada"

WORKDIR /app

# Copiar dependencias desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente (cambia frecuentemente — al final del Dockerfile)
COPY src/ ./src/
COPY package.json .

# Healthcheck: verifica que la API responde y la BD conecta
HEALTHCHECK \\
  --interval=30s \\
  --timeout=5s \\
  --start-period=15s \\
  --retries=3 \\
  CMD wget -qO- http://localhost:3000/health || exit 1

# Usar usuario no-root incluido en node:alpine
USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
\`\`\`

### 📖 Script de despliegue completo

\`\`\`bash
#!/bin/bash
# deploy.sh — levanta la aplicación completa desde cero
set -euo pipefail

echo "=== Construyendo imagen ==="
docker build -t myapi:v2 .

echo "=== Creando infraestructura de red ==="
docker network create api-net 2>/dev/null || echo "Red api-net ya existe"
docker volume create pgdata 2>/dev/null || echo "Volumen pgdata ya existe"

echo "=== Iniciando PostgreSQL ==="
docker run -d \\
  --name postgres \\
  --network api-net \\
  --env POSTGRES_USER=apiuser \\
  --env POSTGRES_PASSWORD=supersecret \\
  --env POSTGRES_DB=apidb \\
  --volume pgdata:/var/lib/postgresql/data \\
  --restart unless-stopped \\
  postgres:15-alpine

echo "=== Esperando a que PostgreSQL esté listo ==="
until docker exec postgres pg_isready -U apiuser -d apidb -q; do
  sleep 1
done

echo "=== Iniciando API ==="
docker run -d \\
  --name api \\
  --network api-net \\
  --env DATABASE_URL=postgresql://apiuser:supersecret@postgres:5432/apidb \\
  --publish 127.0.0.1:3000:3000 \\
  --cap-drop=ALL \\
  --security-opt no-new-privileges:true \\
  --read-only \\
  --tmpfs /tmp:rw,noexec,nosuid,size=32m \\
  --restart unless-stopped \\
  myapi:v2

echo "=== Verificando ==="
sleep 3
curl -sf http://localhost:3000/health && echo ""
echo "✓ Despliegue completado"
\`\`\`

\`\`\`bash
# Limpiar todo para empezar de cero
docker stop api postgres 2>/dev/null; docker rm api postgres 2>/dev/null
docker network rm api-net 2>/dev/null; docker volume rm pgdata 2>/dev/null
docker image rm myapi:v1 myapi:v2 2>/dev/null
\`\`\`

### 📋 Lo que debes recordar

* Containerizar es iterativo: primero funcional, luego optimizado, luego seguro.
* Multi-stage separa la etapa de build de la de runtime; la imagen final no incluye devDependencies ni compiladores.
* \`.dockerignore\` va siempre junto al Dockerfile; sin él, \`.env\` puede quedar en la imagen.
* Las redes personalizadas dan DNS automático: \`postgres\` es resolvible desde \`api\` por nombre.
* PostgreSQL sin \`-p\` publicado queda aislado: solo los contenedores en la misma red lo ven.
* \`--cap-drop=ALL\`, \`--read-only\`, y \`--security-opt no-new-privileges:true\` son el estándar mínimo para producción.
* \`docker stats\`, \`docker logs\`, y \`docker inspect\` son tus herramientas de diagnóstico principales.
* Escanea imágenes con \`trivy\` antes de desplegar; las imágenes alpine tienen menos CVEs que Debian.

### 🧪 Autoevaluación

1. La API no puede conectarse a PostgreSQL y obtienes \`ECONNREFUSED\`. ¿Cuál es el primer comando de diagnóstico que ejecutas y qué esperas ver?

2. Después de aplicar \`--read-only\`, la aplicación falla porque intenta escribir en \`/tmp\`. ¿Cómo lo corriges sin quitar el flag \`--read-only\`?

3. Quieres que la base de datos PostgreSQL sea accesible desde herramientas externas en tu máquina (como DBeaver) para desarrollo, pero no desde la red. ¿Qué flag agregas al comando \`docker run\` de PostgreSQL?

---

1. \`docker exec api ping -c2 postgres\`. Si falla, los contenedores no comparten la misma red. Verificar con \`docker network inspect api-net\` que ambos contenedores aparecen conectados. Si el ping funciona, el problema es la autenticación o la BD no está lista: \`docker exec postgres pg_isready\` y \`docker logs postgres\`.

2. Agregar \`--tmpfs /tmp:rw,noexec,nosuid\` al comando \`docker run\`. Esto monta \`/tmp\` como un tmpfs en memoria, que sí es escribible, sin necesidad de quitar \`--read-only\` del rootfs principal.

3. Agregar \`--publish 127.0.0.1:5432:5432\` al \`docker run\` de PostgreSQL. Esto expone el puerto 5432 solo en la interfaz loopback del host. Herramientas locales conectan a \`localhost:5432\`, pero la base de datos no es accesible desde otras máquinas en la red.
`

export default content
