const content = `
## Módulo 6 — Health checks y dependencias entre servicios

### 🎯 Objetivos de aprendizaje

* Definir health checks para que Compose sepa cuándo un servicio está realmente listo.
* Usar \`depends_on\` con condiciones para controlar el orden de arranque.
* Entender la diferencia entre "contenedor arrancado" y "servicio listo".
* Diagnosticar servicios en estado unhealthy.

### ❓ El problema real

Tu API arranca antes de que PostgreSQL esté listo para aceptar conexiones. La API intenta conectarse, falla, y muere. Reinicia, vuelve a intentarlo, falla de nuevo — crash loop. La solución ingenua es agregar un \`sleep 10\` en el script de arranque. La solución correcta es usar health checks y dependencias condicionales de Compose.

### ❓ El problema con depends_on simple

\`\`\`yaml
# INCORRECTO: depends_on sin condición solo espera que el contenedor arranque
# No espera a que el servicio esté listo para recibir conexiones
services:
  api:
    depends_on:
      - db      # solo garantiza que el contenedor db ARRANCÓ, no que está listo
  db:
    image: postgres:16-alpine
\`\`\`

PostgreSQL puede tardar 2-3 segundos en inicializar su directorio de datos, crear el usuario y estar listo para conexiones. El contenedor arranca, pero el servicio no está disponible todavía.

### 📖 Definir un health check

\`\`\`yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_DB: appdb
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s        # frecuencia de la comprobación
      timeout: 5s         # tiempo máximo de espera por respuesta
      retries: 5          # intentos antes de marcar como unhealthy
      start_period: 10s   # tiempo de gracia al inicio (no cuenta como fallo)
\`\`\`

\`\`\`yaml
# Health check para Redis
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3

# Health check para una API HTTP
  api:
    image: mi-app:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s   # dar tiempo al proceso de arranque
\`\`\`

### 📖 depends_on con condiciones

Con health checks definidos, se puede usar \`depends_on\` con condición \`service_healthy\`:

\`\`\`yaml
services:
  api:
    build: ./api
    depends_on:
      db:
        condition: service_healthy    # espera health check verde
      redis:
        condition: service_healthy
      migrations:
        condition: service_completed_successfully  # espera que termine

  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3

  migrations:
    image: mi-app:latest
    command: npm run migrate
    depends_on:
      db:
        condition: service_healthy
    restart: "no"         # no reiniciar — es una tarea de un solo uso
\`\`\`

### 📖 Condiciones disponibles en depends_on

\`\`\`text
CONDICIÓN                         SIGNIFICADO
─────────────────────────────────────────────────────────────
service_started                   el contenedor arrancó (default)
service_healthy                   el health check está en verde
service_completed_successfully    el proceso terminó con código 0
\`\`\`

### 📖 Monitorear el estado de salud

\`\`\`bash
# Ver el estado de health de los contenedores
docker compose ps
# NAME          IMAGE         COMMAND    STATUS                    PORTS
# app-db-1      postgres:16   ...        Up 30s (healthy)          5432/tcp
# app-api-1     mi-app        ...        Up 5s (health: starting)  3000/tcp

# Inspeccionar el historial de health checks
docker inspect --format='{{json .State.Health}}' app-db-1 | python3 -m json.tool

# Ver los últimos resultados del health check
docker inspect app-db-1 | python3 -c "
import sys, json
data = json.load(sys.stdin)[0]
for check in data['State']['Health']['Log']:
    print(check['Start'], check['ExitCode'], check['Output'][:100])
"
\`\`\`

### 📖 Health check en el Dockerfile

El health check también se puede definir directamente en el Dockerfile de la imagen:

\`\`\`dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm install

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
\`\`\`

El health check en \`docker-compose.yml\` sobreescribe el del Dockerfile si ambos están definidos.

### 📋 Lo que debes recordar

* \`depends_on\` sin condición solo espera que el contenedor inicie, no que el servicio esté listo.
* \`service_healthy\` requiere que el servicio tenga un health check definido y esté en verde.
* \`start_period\` es crucial para servicios lentos al arrancar — no cuenta los fallos durante ese tiempo.
* Usar \`restart: "no"\` para contenedores de migración o inicialización de una sola ejecución.

### 🧪 Autoevaluación

1. ¿Por qué \`depends_on: - db\` no garantiza que la API pueda conectarse a la base de datos al arrancar?
2. Un servicio está en estado \`unhealthy\`. ¿Qué comando usarías para ver los detalles del fallo?
3. ¿Cuándo usarías \`service_completed_successfully\` en lugar de \`service_healthy\`?

---

1. Porque \`depends_on\` sin condición solo garantiza que el proceso del contenedor de la DB ha sido lanzado por Docker, no que PostgreSQL haya terminado de inicializarse y esté aceptando conexiones TCP. Entre el momento en que Docker lanza el contenedor y el momento en que PostgreSQL está listo puede haber varios segundos.
2. Con \`docker inspect --format='{{json .State.Health}}' <nombre-del-contenedor>\` para ver el JSON completo del historial de health checks, incluyendo el exit code y el output de cada intento fallido.
3. Cuando el servicio dependiente es una tarea que corre y termina, no un servicio persistente. El caso más común es un contenedor de migraciones de base de datos — corre \`npm run migrate\`, termina con éxito, y los servicios que dependen de él pueden arrancar con seguridad de que las migraciones están aplicadas.
`

export default content
