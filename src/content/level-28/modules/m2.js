const content = `
## Módulo 2 — Arquitectura Docker: daemon, cliente, imágenes y registry

### 🎯 Objetivos de aprendizaje

* Entender el stack completo de Docker: cliente, daemon, containerd, runc.
* Saber qué es \`/var/run/docker.sock\` y por qué es un vector de seguridad crítico.
* Comprender cómo funcionan las capas de imagen con overlay2.
* Usar \`docker images\`, \`docker ps\`, \`docker pull\`, \`docker image inspect\` e \`history\` con criterio.
* Saber qué es Docker Hub, cómo usar un registry privado y cuándo usar uno.

### ❓ El problema real

Tu equipo tiene 5 desarrolladores, un servidor de staging y un servidor de producción. Cada vez que alguien hace un cambio, tiene que copiar archivos manualmente, instalar dependencias de nuevo y rezar para que las versiones coincidan. Necesitas un mecanismo que empaquete exactamente el entorno (OS base, dependencias, configuración) en un artefacto versionado que se ejecute igual en todas partes. Eso son las imágenes Docker y el flujo cliente-daemon-registry.

### 📖 La arquitectura en capas de Docker

\`\`\`diagram
{"type":"flow-stack","layers":[{"tag":"L1","icon":"desktop","name":"Cliente Docker","meta":"docker build / run / pull / push · CLI o Docker Desktop"},{"tag":"L2","icon":"server","name":"Docker Daemon (dockerd)","meta":"Gestiona imágenes, contenedores, volúmenes, redes","focal":true},{"tag":"L3","icon":"sync","name":"containerd","meta":"Ciclo de vida de contenedores e imágenes"},{"tag":"L4","icon":"cloud","name":"Docker Registry","meta":"Docker Hub (público), Harbor, ECR, GCR (privados)"},{"tag":"L5","icon":"chip","name":"runc","meta":"Crea namespaces, cgroups, exec()"}],"edges":[{"label":"HTTP REST API / var/run/docker.sock","accent":true},{"label":"delega ejecución"},{"label":"push / pull de imágenes"},{"label":"runtime"}],"sidePanel":{"title":"docker.sock","lines":["Es la API completa del daemon","Montarlo en un contenedor equivale a dar acceso root al host"]}}
\`\`\`

### 📖 /var/run/docker.sock: el socket de la API

El daemon Docker expone una API REST a través de un socket Unix. El cliente \`docker\` habla con él en cada comando:

\`\`\`bash
# Verificar que el socket existe y sus permisos
ls -la /var/run/docker.sock
# srw-rw---- 1 root docker 0 Aug  4 10:00 /var/run/docker.sock

# Puedes hablar con la API directamente con curl
curl --unix-socket /var/run/docker.sock http://localhost/version
# {"Platform":{"Name":"Docker Engine - Community"},"Version":"26.1.4",...}

# Listar contenedores via API
curl --unix-socket /var/run/docker.sock http://localhost/containers/json | python3 -m json.tool
\`\`\`

**Advertencia crítica**: montar \`/var/run/docker.sock\` dentro de un contenedor le da acceso completo al daemon del host. Es equivalente a dar acceso root al host:

\`\`\`bash
# PELIGROSO - nunca hacer en producción sin entender las consecuencias
docker run -v /var/run/docker.sock:/var/run/docker.sock alpine sh
# Dentro de ese contenedor puedes crear contenedores con --privileged,
# montar el filesystem del host, escapar al sistema operativo subyacente
\`\`\`

### 📖 Docker Hub y registries

Un **registry** es un servidor que almacena y distribuye imágenes Docker. La estructura completa de un nombre de imagen es:

\`\`\`text
registry/namespace/repository:tag
│          │          │         │
│          │          │         └── versión (default: latest)
│          │          └──────────── nombre de la imagen
│          └─────────────────────── usuario u organización
└────────────────────────────────── servidor del registry
                                    (default: docker.io)

Ejemplos:
  nginx:1.25-alpine          → docker.io/library/nginx:1.25-alpine
  myuser/myapp:v2.1          → docker.io/myuser/myapp:v2.1
  ghcr.io/org/app:sha-abc123 → GitHub Container Registry
  192.168.1.10:5000/app:prod → registry privado local
\`\`\`

Operaciones básicas con registries:

\`\`\`bash
# Autenticarse en Docker Hub
docker login
# Username: myuser
# Password:
# Login Succeeded

# Autenticarse en un registry privado
docker login registry.empresa.com

# Descargar una imagen
docker pull nginx:1.25-alpine

# Etiquetar y subir al registry
docker tag mi-app:latest myuser/mi-app:v1.0
docker push myuser/mi-app:v1.0

# Levantar un registry privado local (para testing)
docker run -d \
  -p 5000:5000 \
  --name registry \
  --restart always \
  -v /opt/registry-data:/var/lib/registry \
  registry:2

# Subir al registry local
docker tag nginx:alpine localhost:5000/nginx:alpine
docker push localhost:5000/nginx:alpine

# Listar imágenes en el registry local
curl http://localhost:5000/v2/_catalog
# {"repositories":["nginx"]}
\`\`\`

### 📖 Capas de imagen y overlay2

Una imagen Docker no es un bloque monolítico. Es una **pila de capas**, donde cada instrucción del Dockerfile que modifica el filesystem crea una nueva capa de solo lectura. El contenedor añade una capa de escritura encima:

\`\`\`diagram
{"type":"flow-stack","layers":[{"name":"Capa de escritura (rw)","meta":"/var/lib/docker/overlay2/<id>/diff/ · solo del contenedor","focal":true,"chip":"RW"},{"name":"Capa 4: COPY app/ /app","meta":"solo lectura"},{"name":"Capa 3: RUN npm install","meta":"solo lectura"},{"name":"Capa 2: RUN apt-get update","meta":"solo lectura"},{"name":"Capa 1: FROM node:18-alpine","meta":"solo lectura (imagen base)"}],"edges":[{"label":"copy-on-write","accent":true},{"label":"apila sobre"},{"label":"apila sobre"},{"label":"apila sobre"}],"sidePanel":{"title":"overlay2","lines":["Filesystem unificado del kernel","Modificar una capa inferior copia el archivo a la capa de escritura"]}}
\`\`\`

overlay2 usa el filesystem OverlayFS del kernel para presentar estas capas como un filesystem unificado y coherente. Cuando un proceso modifica un archivo de una capa inferior, overlay2 lo copia a la capa de escritura (copy-on-write):

\`\`\`bash
# Ver las capas de una imagen
docker image history nginx:1.25-alpine
# IMAGE          CREATED       CREATED BY                                SIZE
# 3f8a00f137a0   2 weeks ago   CMD ["nginx" "-g" "daemon off;"]          0B
# <missing>      2 weeks ago   STOPSIGNAL SIGQUIT                        0B
# <missing>      2 weeks ago   EXPOSE 80                                 0B
# <missing>      2 weeks ago   COPY /etc/nginx/conf.d/default.conf ...   1.09kB
# <missing>      2 weeks ago   RUN /bin/sh -c set -x && addgroup ...     36.4MB
# <missing>      2 weeks ago   ENV NGINX_VERSION=1.25.5 ...              0B
# <missing>      2 weeks ago   FROM alpine:3.19                          7.67MB

# Inspeccionar capas de una imagen (IDs de las capas)
docker image inspect nginx:1.25-alpine | python3 -m json.tool | grep -A20 '"RootFS"'
# "RootFS": {
#     "Type": "layers",
#     "Layers": [
#         "sha256:78a822fe2a2d...",
#         "sha256:9c1b6dd6c1e7...",
#         ...
#     ]
# }
\`\`\`

Las capas se comparten entre imágenes. Si descargaste \`node:18-alpine\` y luego descargas \`node:20-alpine\`, las capas de Alpine que comparten se descargan una sola vez:

\`\`\`bash
# Ver uso de disco de Docker (capas compartidas no se cuentan dos veces)
docker system df
# TYPE            TOTAL   ACTIVE   SIZE      RECLAIMABLE
# Images          12      5        2.34GB    1.1GB (47%)
# Containers      8       3        124MB     89MB (71%)
# Local Volumes   4       2        2.1GB     890MB (42%)
# Build Cache     23      0        456MB     456MB

# Detalle verbose
docker system df -v
\`\`\`

### 📖 Comandos esenciales de gestión

\`\`\`bash
# ── IMÁGENES ──────────────────────────────────────────────────────

# Listar imágenes locales
docker images
# REPOSITORY    TAG           IMAGE ID       CREATED        SIZE
# nginx         1.25-alpine   3f8a00f137a0   2 weeks ago    43.2MB
# node          18-alpine     abc123def456   3 weeks ago    175MB
# postgres      16-alpine     def456abc789   4 weeks ago    243MB

# Buscar en Docker Hub
docker search nginx --limit 5

# Eliminar imagen
docker rmi nginx:1.24-alpine

# Eliminar imágenes sin usar (dangling)
docker image prune

# Eliminar TODAS las imágenes no usadas por ningún contenedor
docker image prune -a

# ── CONTENEDORES ──────────────────────────────────────────────────

# Listar contenedores en ejecución
docker ps
# CONTAINER ID   IMAGE           COMMAND                  STATUS          PORTS
# a3f1b2c3d4e5   nginx:alpine    "/docker-entrypoint.…"   Up 2 hours      0.0.0.0:80->80/tcp

# Listar todos (incluyendo detenidos)
docker ps -a

# Solo IDs (útil para scripts)
docker ps -q
docker ps -aq  # todos, incluyendo detenidos

# Detener y eliminar todos los contenedores detenidos
docker container prune

# ── LIMPIEZA GENERAL ──────────────────────────────────────────────

# Limpiar TODO lo no utilizado (contenedores detenidos, redes, imágenes dangling, cache)
docker system prune

# Limpiar TODO incluyendo volúmenes y todas las imágenes sin contenedor activo
docker system prune -af --volumes
\`\`\`

### 📋 Lo que debes recordar

* La arquitectura: docker CLI → \`/var/run/docker.sock\` → dockerd → containerd → runc.
* El socket de Docker (\`docker.sock\`) montado en un contenedor es acceso root al host.
* Una imagen es una pila de capas inmutables; el contenedor añade una capa de escritura encima.
* overlay2 usa copy-on-write: las capas inferiores se comparten entre imágenes y contenedores.
* \`docker system df\` muestra el espacio real usado teniendo en cuenta las capas compartidas.

### 🧪 Autoevaluación

1. ¿Por qué montar \`/var/run/docker.sock\` en un contenedor es un problema de seguridad grave?
2. Si tienes 10 contenedores basados en la misma imagen \`nginx:alpine\`, ¿cuántas veces se almacenan las capas de esa imagen en disco?
3. ¿Cuál es la diferencia entre \`docker image prune\` y \`docker image prune -a\`?

---

1. Porque el socket es la API del daemon Docker. Cualquier proceso con acceso al socket puede crear contenedores con \`--privileged\`, montar el filesystem del host completo o ejecutar comandos como root en el sistema subyacente. Es un **escape de contenedor** trivial.
2. **Una sola vez**. Las capas de imagen son inmutables y se comparten. Los 10 contenedores tienen cada uno su propia capa de escritura (thin layer), pero comparten todas las capas de solo lectura de la imagen base.
3. \`docker image prune\` solo elimina imágenes **dangling** (sin tag, sin nombre, resultado de builds anteriores). \`docker image prune -a\` elimina **todas** las imágenes que no están siendo usadas por algún contenedor en ejecución o detenido.
`

export default content
