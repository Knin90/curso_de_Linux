const content = `
## Módulo 1 — docker-compose.yml: estructura, versiones y sintaxis

### 🎯 Objetivos de aprendizaje

* Entender la estructura jerárquica de un archivo docker-compose.yml.
* Conocer las diferencias entre las versiones del formato Compose.
* Escribir un archivo Compose mínimo y funcional desde cero.
* Distinguir entre las claves de nivel superior: services, networks, volumes y configs.

### ❓ El problema real

Tienes una aplicación que necesita tres contenedores: una base de datos, un backend y un proxy. Arrancarlos manualmente con \`docker run\` requiere 15 flags por contenedor, en el orden correcto, con las redes y volúmenes creados de antemano. Si un colega intenta replicar el entorno, tiene que adivinar los parámetros exactos. Docker Compose soluciona esto: un solo archivo YAML describe todo el stack, y cualquiera puede levantarlo con un comando.

### 📖 Anatomía de docker-compose.yml

Un archivo Compose tiene cuatro secciones de nivel superior:

\`\`\`yaml
# docker-compose.yml
services:      # contenedores que forman el stack
  web:
    image: nginx:alpine

networks:      # redes virtuales para comunicación entre servicios
  frontend: {}

volumes:       # almacenamiento persistente
  db_data: {}

configs:       # configuración inyectable (Swarm y Compose v3+)
  nginx_conf:
    file: ./nginx.conf
\`\`\`

La única sección obligatoria es \`services\`. Las demás son opcionales.

### 📖 Versiones del formato Compose

El campo \`version\` estaba presente en versiones antiguas de Compose:

\`\`\`yaml
# Formato antiguo (Compose v1/v2 — aún válido pero en desuso)
version: "3.9"
services:
  web:
    image: nginx
\`\`\`

Desde Docker Compose v2 (el plugin integrado en Docker), el campo \`version\` es opcional y está en proceso de deprecación. El formato actual se llama "Compose Specification":

\`\`\`yaml
# Formato actual — sin campo version
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
\`\`\`

\`\`\`bash
# Verificar la versión del plugin Compose
docker compose version
# Docker Compose version v2.24.0

# El binario antiguo (docker-compose) vs el plugin nuevo (docker compose)
docker-compose version   # binario independiente — en desuso
docker compose version   # plugin integrado — usar este
\`\`\`

### 📖 Estructura completa de un servicio

\`\`\`yaml
services:
  api:
    # Imagen base o build context
    image: node:20-alpine           # usar imagen publicada
    # build: ./api                  # o construir desde Dockerfile

    # Nombre del contenedor (opcional; por defecto: directorio_servicio_N)
    container_name: mi-api

    # Puertos: HOST:CONTENEDOR
    ports:
      - "3000:3000"
      - "9229:9229"     # puerto de debug

    # Variables de entorno
    environment:
      NODE_ENV: production
      PORT: 3000

    # Volúmenes montados
    volumes:
      - ./api:/app          # bind mount
      - node_modules:/app/node_modules   # volumen nombrado

    # Red a la que pertenece
    networks:
      - backend

    # Política de reinicio
    restart: unless-stopped

    # Comando que sobreescribe el CMD del Dockerfile
    command: node src/index.js

    # Dependencias de otros servicios
    depends_on:
      - db
\`\`\`

### 📖 Claves de imagen vs build

\`\`\`yaml
services:
  # Opción 1: imagen preconstruida
  db:
    image: postgres:16-alpine

  # Opción 2: build desde Dockerfile en el directorio actual
  api:
    build: .

  # Opción 3: build con opciones detalladas
  frontend:
    build:
      context: ./frontend           # directorio con el Dockerfile
      dockerfile: Dockerfile.prod   # nombre alternativo del Dockerfile
      args:
        NODE_VERSION: "20"
        BUILD_ENV: production
      target: production            # etapa en multi-stage build
\`\`\`

### 📖 Nombrado de recursos y proyecto

Docker Compose prefija todos los recursos con el nombre del proyecto:

\`\`\`bash
# Por defecto, el nombre del proyecto es el directorio padre
# En /home/user/mi-app/ → proyecto: mi-app
# Crea: mi-app-web-1, mi-app_db_data, mi-app_default

# Especificar nombre de proyecto explícitamente
docker compose -p produccion up -d

# O con variable de entorno
COMPOSE_PROJECT_NAME=produccion docker compose up -d

# O en el propio archivo Compose
name: mi-aplicacion
services:
  web:
    image: nginx
\`\`\`

### 📋 Lo que debes recordar

* La sección \`services\` es obligatoria; \`networks\`, \`volumes\` y \`configs\` son opcionales.
* El campo \`version\` está en desuso — el formato actual es Compose Specification sin ese campo.
* Usar \`docker compose\` (con espacio, plugin) en lugar de \`docker-compose\` (binario en desuso).
* El nombre del proyecto define el prefijo de todos los recursos creados por Compose.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre usar \`image:\` y \`build:\` en un servicio de Compose?
2. ¿Por qué el campo \`version\` ya no es necesario en docker-compose.yml?
3. Si tu proyecto se llama \`tienda\` y tienes un servicio \`web\`, ¿cómo se llamará el contenedor por defecto?

---

1. \`image:\` usa una imagen ya existente (local o de un registro como Docker Hub). \`build:\` construye la imagen desde un Dockerfile en el directorio especificado, generando una imagen local con nombre derivado del proyecto y servicio.
2. Porque Docker introdujo la "Compose Specification", un estándar que unifica los formatos anteriores (v2, v3) en uno solo sin necesidad de declarar versión. El campo sigue siendo aceptado por compatibilidad, pero Docker lo ignora o advierte que está en desuso.
3. \`tienda-web-1\` — Compose combina el nombre del proyecto, el nombre del servicio y un índice secuencial. Si se especifica \`container_name:\` en el YAML, ese nombre tiene prioridad.
`

export default content
