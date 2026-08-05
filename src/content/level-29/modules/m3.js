const content = `
## Módulo 3 — Variables de entorno y archivos .env en Compose

### 🎯 Objetivos de aprendizaje

* Inyectar variables de entorno en servicios de tres formas distintas.
* Usar archivos \`.env\` para centralizar configuración sensible fuera del YAML.
* Entender cómo Compose interpola variables en el propio archivo YAML.
* Proteger credenciales evitando que lleguen al repositorio.

### ❓ El problema real

Tienes un \`docker-compose.yml\` con la contraseña de la base de datos escrita directamente en el YAML. Haces \`git add .\` y \`git commit\` sin pensar — la contraseña ahora está en el historial de Git para siempre. Este módulo enseña el patrón correcto: separar configuración de código usando archivos \`.env\` que nunca entran en el repositorio.

### 📖 Tres formas de definir variables de entorno

**Forma 1: inline en el YAML (solo para valores no sensibles)**

\`\`\`yaml
services:
  api:
    image: node:20-alpine
    environment:
      NODE_ENV: production
      PORT: "3000"
      LOG_LEVEL: info
\`\`\`

**Forma 2: heredar del shell del host**

\`\`\`yaml
services:
  api:
    environment:
      - NODE_ENV           # hereda el valor de NODE_ENV en el shell
      - API_KEY            # si no existe en el shell, la variable no se define
\`\`\`

\`\`\`bash
export NODE_ENV=staging
export API_KEY=abc123
docker compose up -d
# El contenedor recibe NODE_ENV=staging y API_KEY=abc123
\`\`\`

**Forma 3: archivo de variables (env_file)**

\`\`\`yaml
services:
  api:
    env_file:
      - .env              # cargado primero
      - .env.local        # sobreescribe los valores anteriores
\`\`\`

### 📖 El archivo .env y la interpolación en YAML

Compose busca automáticamente un archivo \`.env\` en el mismo directorio que el \`docker-compose.yml\` para interpolación de variables dentro del YAML:

\`\`\`bash
# .env
POSTGRES_VERSION=16-alpine
APP_PORT=8080
DB_PASSWORD=supersecret
COMPOSE_PROJECT_NAME=mi-app
\`\`\`

\`\`\`yaml
# docker-compose.yml — usa las variables de .env para configurarse a sí mismo
services:
  db:
    image: postgres:\${POSTGRES_VERSION}   # → postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}   # → supersecret

  web:
    image: nginx:alpine
    ports:
      - "\${APP_PORT}:80"                  # → 8080:80
\`\`\`

\`\`\`bash
# Ver qué valores resultarían de la interpolación
docker compose config
\`\`\`

### 📖 Sintaxis de interpolación y valores por defecto

\`\`\`yaml
services:
  app:
    environment:
      # Valor por defecto si la variable no está definida
      - LOG_LEVEL=\${LOG_LEVEL:-info}

      # Error si la variable no está definida (build falla)
      - DB_URL=\${DB_URL:?La variable DB_URL es obligatoria}

      # Usar un valor alternativo solo si la variable ESTÁ definida
      - DEBUG=\${DEBUG:+true}
\`\`\`

### 📖 Gestión segura de credenciales

\`\`\`bash
# .gitignore — SIEMPRE incluir estos archivos
.env
.env.local
.env.*.local
*.secret
\`\`\`

\`\`\`bash
# .env.example — versión sin valores reales, SÍ va al repositorio
# Sirve como documentación de qué variables se necesitan
POSTGRES_VERSION=16-alpine
APP_PORT=8080
DB_PASSWORD=           # requerido — genera uno con: openssl rand -hex 32
JWT_SECRET=            # requerido — genera uno con: openssl rand -base64 48
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
\`\`\`

\`\`\`bash
# Flujo de trabajo inicial en un nuevo entorno
cp .env.example .env
# Editar .env con los valores reales del entorno
nano .env
docker compose up -d
\`\`\`

### 📖 Variables en tiempo de build vs tiempo de ejecución

\`\`\`yaml
services:
  frontend:
    build:
      context: ./frontend
      args:
        # ARG en Dockerfile: disponible durante el build, no en el contenedor
        VITE_API_URL: \${VITE_API_URL}
        NODE_VERSION: "20"

    environment:
      # ENV en contenedor: disponible en tiempo de ejecución
      NODE_ENV: production
      API_URL: \${API_URL}
\`\`\`

\`\`\`dockerfile
# Dockerfile — diferencia entre ARG y ENV
ARG VITE_API_URL
ENV NODE_ENV=production

# ARG solo existe durante el build
RUN echo "Building para: \$VITE_API_URL"

# ENV persiste en la imagen final
CMD ["node", "server.js"]
\`\`\`

### 📋 Lo que debes recordar

* \`.env\` es para interpolación de variables en el YAML de Compose; \`env_file:\` es para inyectar variables en el contenedor.
* Siempre agregar \`.env\` a \`.gitignore\` y proveer un \`.env.example\` con el repositorio.
* \`docker compose config\` muestra el YAML resultante después de la interpolación — útil para depurar.
* \`\${VAR:?mensaje}\` hace que Compose falle con un error claro si la variable no está definida.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre \`environment:\` con \`env_file:\` en un servicio de Compose?
2. Un compañero clona tu repo y ejecuta \`docker compose up\` pero falla porque falta una variable. ¿Cómo deberías haber documentado las variables necesarias?
3. ¿Cómo verificas que la interpolación de variables en tu \`docker-compose.yml\` produce los valores correctos?

---

1. \`environment:\` define variables directamente en el YAML de Compose o las hereda del shell. \`env_file:\` lee un archivo de texto con formato \`CLAVE=VALOR\` e inyecta todas sus variables en el contenedor. La diferencia clave es que \`env_file:\` permite centralizar muchas variables sin saturar el YAML.
2. Incluyendo un archivo \`.env.example\` en el repositorio con todas las variables necesarias, sin sus valores reales. El \`.env\` real va en \`.gitignore\`. El README debería indicar hacer \`cp .env.example .env\` y rellenar los valores como primer paso.
3. Con \`docker compose config\` — este comando muestra el YAML completo y resuelto después de aplicar todas las sustituciones de variables, sin arrancar ningún contenedor.
`

export default content
