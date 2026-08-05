const content = `
## Módulo 6 — Multi-stage builds y optimización de imágenes

### 🎯 Objetivos de aprendizaje

* Entender por qué el tamaño de una imagen importa y qué lo infla.
* Construir imágenes multi-stage que separan build de runtime.
* Aplicar el orden correcto de instrucciones para maximizar el uso del caché de capas.
* Usar \`.dockerignore\` para excluir archivos innecesarios y sensibles.
* Aprovechar BuildKit para builds paralelos, caché de montaje y compilación cruzada.

### ❓ El problema real

Tu aplicación Go pesa 800 MB en Docker. El binario compilado ocupa 8 MB. El resto es
el compilador, las cabeceras del sistema, el historial de apt y capas que nadie necesita
en producción. Cada despliegue transfiere 800 MB. Los atacantes tienen acceso a bash,
curl, wget y gcc dentro del contenedor comprometido. ¿Cómo reducir a 10 MB sin perder
funcionalidad?

### 📖 Por qué el tamaño de imagen importa

Una imagen grande tiene consecuencias reales:

- **Tiempo de pull:** 800 MB × 10 nodos = 8 GB transferidos en cada despliegue.
- **Superficie de ataque:** cada binario extra (\`curl\`, \`gcc\`, \`bash\`) es un vector potencial.
- **Costos de storage:** registros privados cobran por almacenamiento y transferencia.
- **Arranque lento:** más capas = más tiempo en descomprimir al iniciar el contenedor.

### 📖 El patrón multi-stage

Un Dockerfile puede tener múltiples bloques \`FROM\`. Cada uno es una etapa independiente.
Solo la última etapa forma la imagen final — las anteriores son descartadas.

**Sintaxis básica:**
\`\`\`dockerfile
FROM imagen-pesada AS nombre-etapa
# construir artefacto...

FROM imagen-ligera
COPY --from=nombre-etapa /ruta/artefacto /destino
\`\`\`

### 📖 Ejemplo 1 — Binario Go

\`\`\`dockerfile
# Etapa 1: compilación (imagen pesada, ~800 MB)
FROM golang:1.21 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o myapp .

# Etapa 2: runtime (imagen vacía, 0 MB)
FROM scratch
COPY --from=builder /app/myapp /myapp
ENTRYPOINT ["/myapp"]
\`\`\`

\`\`\`bash
docker build -t myapp:optimized .
docker image ls myapp:optimized
# REPOSITORY   TAG         SIZE
# myapp        optimized   8.2MB
\`\`\`

\`FROM scratch\` es una imagen vacía — sin shell, sin libc, sin nada. Solo tu binario.
Requiere que el binario sea estáticamente enlazado (\`CGO_ENABLED=0\`).

### 📖 Ejemplo 2 — Node.js con dependencias de producción

\`\`\`dockerfile
# Etapa 1: instalar dependencias de producción
FROM node:20 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Etapa 2: imagen final ligera
FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json .
EXPOSE 3000
USER node
CMD ["node", "src/index.js"]
\`\`\`

\`\`\`bash
# Imagen single-stage con node:20: ~950 MB
# Imagen multi-stage con node:20-alpine: ~120 MB
docker image ls
\`\`\`

\`node:20-alpine\` usa Alpine Linux (~5 MB de base) en lugar de Debian (~80 MB).

### 📖 Optimización del caché de capas

Cada instrucción \`RUN\`, \`COPY\`, \`ADD\` crea una capa. Docker cachea capas y las reutiliza
si sus entradas no cambian. La regla de oro: **de lo que menos cambia a lo que más cambia**.

**Incorrecto — invalida el caché con cada cambio de código:**
\`\`\`dockerfile
COPY . .                    # copia TODO: código + package.json
RUN npm install             # se ejecuta siempre que cualquier archivo cambia
\`\`\`

**Correcto — el caché de dependencias sobrevive cambios de código:**
\`\`\`dockerfile
COPY package*.json ./       # solo cambia cuando cambias dependencias
RUN npm install             # cacheado mientras package.json no cambie
COPY . .                    # código fuente (cambia frecuentemente)
\`\`\`

**Regla general de ordenamiento:**
1. FROM (base estable)
2. ARG / ENV de configuración estática
3. Instalación de sistema (apt, apk) — cambia raramente
4. Dependencias de la aplicación (package.json, go.mod, requirements.txt)
5. Código fuente — cambia con cada commit

### 📖 .dockerignore

Equivalente al \`.gitignore\` para Docker. Excluye archivos del contexto de build antes
de enviarlo al daemon. Sin él, \`node_modules\` (cientos de MB) viajan al daemon en cada build.

\`\`\`bash
# .dockerignore
node_modules/
.git/
.gitignore
*.log
dist/
build/
.env
.env.*
*.test.js
coverage/
README.md
\`\`\`

\`\`\`bash
# Ver el tamaño del contexto que se envía al daemon
docker build . 2>&1 | head -2
# Sending build context to Docker daemon  1.234MB  ← con .dockerignore
# Sending build context to Docker daemon  845.7MB  ← sin .dockerignore
\`\`\`

**Crítico para seguridad:** sin \`.dockerignore\`, archivos \`.env\` con credenciales pueden
terminar en la imagen si un \`COPY . .\` los incluye.

### 📖 BuildKit: builds modernos

BuildKit es el motor de build moderno de Docker (predeterminado desde Docker 23).

\`\`\`bash
# Habilitar explícitamente en versiones antiguas
DOCKER_BUILDKIT=1 docker build .

# O usar buildx (siempre usa BuildKit)
docker buildx build .
\`\`\`

**Ventajas de BuildKit:**
- **Paralelismo:** las etapas independientes se construyen en paralelo.
- **Caché de montaje:** el caché de apt, pip, npm persiste entre builds sin quedar en la imagen.
- **Builds secretos:** inyecta secretos sin grabarlos en capas.

### 📖 Caché de montaje (RUN --mount=type=cache)

\`\`\`dockerfile
# El directorio de caché de apt persiste entre builds, no va a la imagen
RUN --mount=type=cache,target=/var/cache/apt \\
    apt-get update && apt-get install -y curl

# Caché de npm entre builds (no instala desde cero cada vez)
RUN --mount=type=cache,target=/root/.npm \\
    npm ci --prefer-offline

# Caché de pip
RUN --mount=type=cache,target=/root/.cache/pip \\
    pip install -r requirements.txt
\`\`\`

La segunda ejecución de \`docker build\` reutiliza el caché aunque la capa haya cambiado.
Reduce builds de minutos a segundos en CI.

### 📖 Ver el tamaño de capas

\`\`\`bash
# Historial de capas con tamaños
docker image history myimage

# Ejemplo de salida:
# IMAGE          CREATED        SIZE      COMMENT
# a1b2c3d4e5f6   2 minutes ago  45.2MB    COPY node_modules
# 7890abcdef12   3 minutes ago  0B        EXPOSE 3000
# ...

# Análisis detallado con dive (herramienta externa)
dive myimage
\`\`\`

### 📖 Builds multi-plataforma

\`\`\`bash
# Construir para AMD64 y ARM64 simultáneamente
docker buildx build \\
  --platform linux/amd64,linux/arm64 \\
  -t mi-usuario/myapp:latest \\
  --push .

# Necesitas un builder con soporte multi-plataforma
docker buildx create --use --name multiarch
\`\`\`

Útil para imágenes que se ejecutan en servidores x86 y en máquinas Apple Silicon.

### 📖 Imágenes distroless

Las imágenes distroless de Google incluyen solo las dependencias de runtime, sin shell,
sin gestor de paquetes, sin utilidades del sistema.

\`\`\`dockerfile
# Para aplicaciones Java
FROM gcr.io/distroless/java17-debian12

# Para binarios Go/C estáticos
FROM gcr.io/distroless/static-debian12

# Para Python
FROM gcr.io/distroless/python3-debian12
\`\`\`

\`\`\`bash
# No puedes hacer docker exec mi-contenedor bash ← no hay bash
# Para depurar, usa la variante :debug que incluye busybox
docker run gcr.io/distroless/static-debian12:debug
\`\`\`

Distroless reduce la superficie de ataque al mínimo absoluto: sin CVEs de apt,
sin binarios de sistema que explotar.

### 📋 Lo que debes recordar

* Multi-stage build separa compilación de runtime; solo la última etapa forma la imagen final.
* \`FROM scratch\` para binarios estáticos; \`alpine\` o \`distroless\` para imágenes con runtime.
* Ordena instrucciones de menos cambiante a más cambiante: dependencias antes que código fuente.
* Cualquier cambio en una capa invalida todas las capas siguientes — el orden importa.
* \`.dockerignore\` es obligatorio: excluye \`node_modules\`, \`.git\`, \`.env\` y \`dist/\`.
* \`RUN --mount=type=cache\` mantiene caché de gestores de paquetes entre builds sin inflarte la imagen.
* \`docker buildx build --platform linux/amd64,linux/arm64\` construye imágenes multi-arquitectura.
* \`docker image history myimage\` muestra el tamaño de cada capa.

### 🧪 Autoevaluación

1. Tienes este Dockerfile: \`COPY . . \` seguido de \`RUN npm install\`. ¿Qué problema tiene y cómo lo corriges?

2. ¿Qué diferencia hay entre una imagen Alpine y una imagen Distroless en términos de superficie de ataque?

3. ¿Para qué sirve \`RUN --mount=type=cache,target=/root/.npm\` y qué ventaja tiene sobre un \`RUN npm install\` normal?

---

1. El problema es que \`COPY . .\` copia todo el código fuente antes de instalar dependencias. Cualquier cambio en el código invalida el caché de \`npm install\`. La corrección: primero \`COPY package*.json ./\`, luego \`RUN npm install\`, y finalmente \`COPY . .\`.

2. Alpine incluye shell (\`ash\`), gestor de paquetes (\`apk\`) y utilidades básicas del sistema — útil para depuración pero aumenta la superficie de ataque. Distroless no tiene shell ni gestor de paquetes; solo las librerías de runtime necesarias. Imposible abrir una shell interactiva en un contenedor comprometido.

3. Monta un directorio de caché persistente fuera de la imagen. En el siguiente build, npm encuentra los paquetes ya descargados en caché y no los descarga de nuevo, aunque la capa haya cambiado (por ejemplo, al actualizar \`package.json\`). Reduce el tiempo de build sin añadir el caché a la imagen final.
`

export default content
