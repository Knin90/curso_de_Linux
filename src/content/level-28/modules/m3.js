const content = `
## Módulo 3 — Dockerfile: construir imágenes eficientes

### 🎯 Objetivos de aprendizaje

* Conocer cada instrucción del Dockerfile y cuándo usarla correctamente.
* Entender cómo funciona el cache de capas y cómo ordenar instrucciones para aprovecharlo.
* Distinguir CMD vs ENTRYPOINT y exec form vs shell form.
* Escribir un \`.dockerignore\` efectivo.
* Construir Dockerfiles reales para aplicaciones Node.js, Python y Go.

### ❓ El problema real

Tu Dockerfile de desarrollo tiene 800MB. Cada \`docker build\` tarda 4 minutos porque reinstala todas las dependencias aunque solo cambiaste una línea de código. Y cuando llegas a producción, el contenedor corre como root, lo que viola la política de seguridad del equipo. Estos son problemas de diseño del Dockerfile, no de Docker.

### 📖 Las instrucciones esenciales

\`\`\`dockerfile
# FROM: imagen base. Siempre la primera instrucción.
# Usa tags explícitos, nunca 'latest' en producción.
FROM node:18.20-alpine3.19

# ARG: variable disponible SOLO durante el build
ARG NODE_ENV=production
ARG APP_VERSION=1.0.0

# ENV: variable de entorno disponible en el contenedor en ejecución
ENV NODE_ENV=\${NODE_ENV}
ENV APP_VERSION=\${APP_VERSION}
ENV PORT=3000

# LABEL: metadatos de la imagen (buena práctica)
LABEL maintainer="equipo@empresa.com"
LABEL version="\${APP_VERSION}"
LABEL description="API de la aplicación"

# WORKDIR: directorio de trabajo. Crea el dir si no existe.
# Mejor que RUN mkdir && cd: afecta a CMD, ENTRYPOINT, COPY, ADD siguientes.
WORKDIR /app

# COPY: copiar archivos del contexto de build al contenedor.
# Sintaxis: COPY <src-en-contexto> <dest-en-contenedor>
# COPY <src>... <dest>
# COPY --chown=user:group <src> <dest>
COPY --chown=node:node package*.json ./

# RUN: ejecuta un comando durante el build. Crea una nueva capa.
# Combinar comandos con && para reducir capas. Limpiar cache en la misma capa.
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar el código DESPUÉS de instalar dependencias (aprovecha cache)
COPY --chown=node:node src/ ./src/
COPY --chown=node:node config/ ./config/

# EXPOSE: documenta qué puerto usa el contenedor.
# NO abre el puerto en el host. Solo es documentación + señal para -P.
EXPOSE 3000

# HEALTHCHECK: Docker verifica si el contenedor está sano
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# USER: cambiar al usuario no-root antes de CMD/ENTRYPOINT
# Alpine ya tiene el usuario 'node' con UID 1000
USER node

# CMD vs ENTRYPOINT (ver sección siguiente)
CMD ["node", "src/server.js"]
\`\`\`

### 📖 COPY vs ADD

Usa **COPY** por defecto. **ADD** tiene comportamientos adicionales que raramente necesitas:

\`\`\`dockerfile
# COPY: copia archivos y directorios. Simple y predecible.
COPY package.json ./
COPY src/ ./src/

# ADD: igual que COPY, más:
#   - Si <src> es una URL, descarga el archivo
#   - Si <src> es un .tar.gz local, lo extrae automáticamente
ADD https://ejemplo.com/archivo.tar.gz /tmp/    # descarga
ADD archivo.tar.gz /opt/app/                    # extrae en /opt/app/

# Regla práctica:
# ¿Necesitas descargar de URL o extraer tar? → ADD
# Todo lo demás → COPY (más explícito, más seguro)
\`\`\`

### 📖 CMD vs ENTRYPOINT: la diferencia que importa

Esta es una de las confusiones más comunes en Docker.

**Shell form vs exec form**:
\`\`\`dockerfile
# Shell form: se ejecuta como /bin/sh -c "comando"
# El proceso principal es sh, no tu app. Las señales (SIGTERM) no llegan bien.
CMD node server.js
ENTRYPOINT node server.js

# Exec form: se ejecuta directamente, sin shell. PREFERIDA.
# El proceso principal es tu app. Las señales llegan correctamente.
CMD ["node", "server.js"]
ENTRYPOINT ["node", "server.js"]
\`\`\`

**CMD**: comando por defecto que puede ser sobreescrito al hacer \`docker run\`:
\`\`\`dockerfile
CMD ["node", "server.js"]
# docker run mi-imagen              → ejecuta: node server.js
# docker run mi-imagen bash         → ejecuta: bash  (sobreescribe CMD)
# docker run mi-imagen npm test     → ejecuta: npm test
\`\`\`

**ENTRYPOINT**: el ejecutable fijo del contenedor. Los argumentos de \`docker run\` se añaden como parámetros, no sobreescriben:
\`\`\`dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]
# docker run mi-imagen               → ejecuta: node server.js
# docker run mi-imagen worker.js     → ejecuta: node worker.js
# docker run mi-imagen --inspect     → ejecuta: node --inspect
# Para sobreescribir ENTRYPOINT necesitas: docker run --entrypoint bash mi-imagen
\`\`\`

**El patrón más común en producción**: ENTRYPOINT como ejecutable + CMD como parámetros por defecto:
\`\`\`dockerfile
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
\`\`\`

### 📖 Cache de capas: el orden importa

Docker reutiliza capas del build anterior si la instrucción y su contexto no cambiaron. Cuando una capa cambia, **todas las capas posteriores se invalidan**:

\`\`\`dockerfile
# ❌ INCORRECTO: copia todo primero, luego instala dependencias
# Un cambio en cualquier archivo del código (src/) invalida el npm install
FROM node:18-alpine
WORKDIR /app
COPY . .                    # ← si cambias src/index.js, ESTO se invalida
RUN npm ci                  # ← se ejecuta de nuevo aunque package.json no cambió
CMD ["node", "src/index.js"]

# ✅ CORRECTO: copia package.json primero, instala, luego copia el código
# npm install solo se re-ejecuta si package.json o package-lock.json cambian
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./       # ← solo invalida si package.json cambia
RUN npm ci                  # ← usa cache en la mayoría de los builds
COPY src/ ./src/            # ← cambios en el código llegan aquí
CMD ["node", "src/index.js"]
\`\`\`

El mismo principio aplica a Python y Go:

\`\`\`dockerfile
# Python: copia requirements primero
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
CMD ["python", "src/main.py"]

# Go: copia go.mod y go.sum primero
FROM golang:1.22-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /app/servidor .
CMD ["/app/servidor"]
\`\`\`

### 📖 .dockerignore: reducir el contexto de build

Cuando ejecutas \`docker build\`, Docker envía todo el directorio actual al daemon (el "contexto de build"). Un \`.dockerignore\` evita enviar archivos innecesarios, lo que acelera el build y evita incluir secretos accidentalmente:

\`\`\`text
# .dockerignore
# Control de versiones
.git/
.gitignore

# Dependencias (se instalan en el contenedor)
node_modules/
vendor/
__pycache__/
*.pyc
.venv/

# Archivos de build y test locales
dist/
build/
coverage/
.nyc_output/
*.test.js

# Configuración de entorno (¡NUNCA en la imagen!)
.env
.env.local
.env.*.local
*.key
*.pem

# Documentación y herramientas de desarrollo
README.md
docs/
.vscode/
.idea/
Makefile

# Docker files (no necesitas el Dockerfile dentro del contenedor)
Dockerfile*
docker-compose*.yml
.dockerignore
\`\`\`

### 📖 HEALTHCHECK: contenedores que saben si están sanos

\`\`\`dockerfile
# Verificar que el servidor responde HTTP 200
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=20s \
            --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Para una app Node.js, un script dedicado
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
\`\`\`

El estado del healthcheck se ve en \`docker ps\` (columna STATUS):
\`\`\`bash
docker ps
# CONTAINER ID  IMAGE    STATUS
# a3f1b2c3d4e5  mi-app   Up 2 hours (healthy)
# b4f2c3d4e5f6  mi-app   Up 10 seconds (health: starting)
# c5f3d4e5f6a7  mi-app   Up 30 minutes (unhealthy)
\`\`\`

### 📖 Dockerfile completo para producción: Node.js

\`\`\`dockerfile
# Dockerfile para una API Node.js lista para producción
FROM node:18.20-alpine3.19

# Metadata
LABEL maintainer="ops@empresa.com"
LABEL version="1.0"

# Instalar dumb-init para manejo correcto de señales PID 1
RUN apk add --no-cache dumb-init

# Usuario no-root (alpine ya incluye usuario 'node' con uid=1000)
WORKDIR /app
RUN chown node:node /app

USER node

# Instalar dependencias con cache eficiente
COPY --chown=node:node package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY --chown=node:node src/ ./src/

# Variables de entorno por defecto (pueden sobreescribirse)
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# dumb-init como PID 1 maneja señales correctamente y recoge procesos zombie
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
\`\`\`

### 📋 Lo que debes recordar

* Ordena las instrucciones de menos a más cambiante para maximizar el uso del cache.
* Combina comandos RUN con \`&&\` y limpia el cache dentro de la misma capa (\`apt-get clean\`, \`npm cache clean\`).
* Usa **exec form** \`["comando", "arg"]\` en CMD y ENTRYPOINT para que las señales lleguen correctamente.
* ENTRYPOINT = ejecutable fijo; CMD = parámetros por defecto sobreescribibles.
* El \`.dockerignore\` es tan importante como el \`.gitignore\`: sin él envías \`node_modules\` y \`.env\` al daemon.

### 🧪 Autoevaluación

1. Tienes un Dockerfile con \`COPY . .\` como segunda instrucción, seguido de \`RUN pip install -r requirements.txt\`. ¿Qué problema tiene y cómo lo corriges?
2. ¿Cuál es la diferencia entre \`CMD ["python", "app.py"]\` y \`CMD python app.py\`? ¿Cuál prefieres en producción y por qué?
3. Si añades una instrucción \`RUN apt-get update\` en una capa, pero limpias la cache con \`apt-get clean\` en la siguiente instrucción RUN separada, ¿se reduce el tamaño de la imagen?

---

1. El problema es el **orden del cache**: \`COPY . .\` incluye todos los archivos, incluido el código fuente. Cualquier cambio en el código invalida esa capa y fuerza \`pip install\` de nuevo. La corrección: primero \`COPY requirements.txt ./\`, luego \`RUN pip install\`, luego \`COPY src/ ./src/\`.
2. \`CMD ["python", "app.py"]\` es **exec form**: Python corre como PID 1 y recibe señales SIGTERM directamente. \`CMD python app.py\` es **shell form**: se ejecuta como \`/bin/sh -c "python app.py"\`, así que sh es PID 1, Python es un hijo, y las señales del runtime (para parar el contenedor limpiamente) no le llegan a Python. En producción siempre se prefiere exec form.
3. **No**. La cache de apt está dentro de la capa creada por \`RUN apt-get update\`. Si limpias en una instrucción RUN separada, creas una nueva capa vacía, pero la capa anterior (con la cache) ya fue creada y sigue ocupando espacio. La limpieza debe hacerse **en la misma instrucción RUN**: \`RUN apt-get update && apt-get install -y pkg && apt-get clean && rm -rf /var/lib/apt/lists/*\`.
`

export default content
