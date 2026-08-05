const content = `
## Módulo 2 — Services, networks y volumes en Compose

### 🎯 Objetivos de aprendizaje

* Configurar redes personalizadas para aislar comunicación entre servicios.
* Crear y gestionar volúmenes nombrados y bind mounts en Compose.
* Entender la red por defecto que Compose crea automáticamente.
* Conectar un servicio a múltiples redes para segmentar el tráfico.

### ❓ El problema real

Tienes una aplicación con tres capas: frontend, backend y base de datos. No quieres que el frontend pueda hablar directamente con la base de datos — eso es una vulnerabilidad. Docker Compose te permite crear redes separadas y controlar exactamente qué servicios se pueden comunicar entre sí. Sin esta segmentación, todos los contenedores del stack pueden alcanzarse mutuamente.

### 📖 La red por defecto de Compose

Cuando arrancas un stack sin definir redes explícitas, Compose crea automáticamente una red tipo bridge:

\`\`\`yaml
# Este archivo crea automáticamente una red llamada "mi-app_default"
services:
  web:
    image: nginx:alpine
  api:
    image: node:20-alpine
  db:
    image: postgres:16
\`\`\`

\`\`\`bash
# Verificar la red creada
docker network ls
# NETWORK ID     NAME              DRIVER    SCOPE
# a1b2c3d4e5f6   mi-app_default    bridge    local

# Todos los servicios pueden alcanzarse por nombre de servicio
# Desde el contenedor "api", se puede hacer: ping db, ping web
\`\`\`

La resolución DNS entre servicios usa el nombre del servicio como hostname. \`api\` puede conectarse a la base de datos con el host \`db\`, no con una IP.

### 📖 Redes personalizadas

\`\`\`yaml
services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend      # solo ve al frontend

  api:
    image: node:20-alpine
    networks:
      - frontend      # recibe peticiones del nginx
      - backend       # se comunica con la DB

  db:
    image: postgres:16
    networks:
      - backend       # solo visible desde el backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true    # sin acceso a internet desde esta red
\`\`\`

Con esta configuración, \`nginx\` no puede alcanzar \`db\` directamente — solo a través de \`api\`.

### 📖 Opciones avanzadas de red

\`\`\`yaml
networks:
  # Red con subred personalizada
  app_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

  # Reutilizar una red externa (creada fuera de este Compose)
  shared_network:
    external: true
    name: mi-red-compartida

services:
  api:
    networks:
      app_net:
        ipv4_address: 172.20.0.10   # IP fija dentro de la red
\`\`\`

\`\`\`bash
# Crear una red externa compartida entre stacks
docker network create mi-red-compartida

# Luego dos stacks diferentes pueden unirse a ella con external: true
\`\`\`

### 📖 Volúmenes nombrados

Los volúmenes nombrados persisten fuera del ciclo de vida del contenedor:

\`\`\`yaml
services:
  db:
    image: postgres:16-alpine
    volumes:
      - db_data:/var/lib/postgresql/data    # volumen nombrado
      - ./init-scripts:/docker-entrypoint-initdb.d  # bind mount

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  db_data:              # Compose gestiona la creación
    driver: local
  redis_data:
    driver: local
    driver_opts:
      type: tmpfs       # en memoria (útil para testing)
      device: tmpfs
\`\`\`

\`\`\`bash
# Los volúmenes nombrados persisten después de "docker compose down"
docker compose down          # para contenedores y elimina redes, pero NO volúmenes
docker compose down -v       # también elimina los volúmenes (¡destructivo!)

# Inspeccionar un volumen
docker volume ls
docker volume inspect mi-app_db_data
\`\`\`

### 📖 Bind mounts vs volúmenes nombrados

\`\`\`yaml
services:
  app:
    volumes:
      # Bind mount: monta directorio del host en el contenedor
      - ./src:/app/src              # desarrollo: editar código en vivo
      - /etc/ssl/certs:/certs:ro    # solo lectura (:ro)

      # Volumen nombrado: Docker gestiona el almacenamiento
      - app_uploads:/app/uploads    # datos que deben persistir

      # Volumen anónimo: descartado al eliminar el contenedor
      - /app/node_modules           # no montar node_modules del host
\`\`\`

Diferencias clave:

\`\`\`text
TIPO              PERSISTENCIA    PORTABILIDAD    USO TÍPICO
────────────────────────────────────────────────────────────
Bind mount        host define     baja            código en dev
Volumen nombrado  Docker gestiona alta            datos de DB
Volumen anónimo   con contenedor  nula            caché temporal
\`\`\`

### 📋 Lo que debes recordar

* Por defecto Compose crea una red bridge y todos los servicios la comparten — usar redes separadas para aislar capas.
* Los servicios se resuelven por nombre de servicio, no por IP — usar \`db\` como host, no \`localhost\`.
* \`docker compose down\` no elimina volúmenes nombrados — necesita el flag \`-v\` para eso.
* \`internal: true\` en una red bloquea el acceso a internet desde esa red — útil para la capa de datos.

### 🧪 Autoevaluación

1. ¿Cómo se llama el host de la base de datos desde el servicio \`api\` si el servicio de DB se llama \`postgres\`?
2. ¿Qué diferencia hay entre \`docker compose down\` y \`docker compose down -v\`?
3. Tienes un volumen para uploads de usuarios. ¿Deberías usar bind mount o volumen nombrado? ¿Por qué?

---

1. \`postgres\` — Docker Compose registra cada servicio en el DNS interno de la red con su nombre de servicio como hostname. La conexión desde \`api\` usa \`postgres\` como hostname, no \`localhost\` ni una IP.
2. \`docker compose down\` detiene y elimina los contenedores y las redes creadas por Compose, pero preserva los volúmenes nombrados. \`docker compose down -v\` también elimina los volúmenes nombrados, borrando todos los datos persistidos. Es una operación destructiva que no se puede deshacer.
3. Volumen nombrado. Los bind mounts dependen de la estructura de directorios del host y son difíciles de respaldar, migrar y manejar en producción. Los volúmenes nombrados son gestionados por Docker, son independientes del path del host y se pueden respaldar, migrar e inspeccionar con herramientas estándar de Docker.
`

export default content
