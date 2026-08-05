const content = `
## Módulo 5 — Override files: compose.override.yml para dev/prod

### 🎯 Objetivos de aprendizaje

* Entender el mecanismo de merge de archivos Compose.
* Crear un archivo base y archivos de override para distintos entornos.
* Separar configuración de desarrollo y producción sin duplicar el YAML.
* Usar el flag \`-f\` para componer stacks desde múltiples archivos.

### ❓ El problema real

En desarrollo, quieres montar el código fuente como bind mount para ver cambios en vivo. En producción, quieres que el código esté dentro de la imagen. Tener dos archivos \`docker-compose.yml\` separados significa duplicar cientos de líneas y mantener dos fuentes de verdad que se dessincronizan. Los override files resuelven esto con un archivo base + overrides específicos por entorno.

### 📖 Cómo funciona el merge automático

Compose carga automáticamente dos archivos si existen en el mismo directorio:

\`\`\`text
1. docker-compose.yml          ← siempre cargado
2. docker-compose.override.yml ← cargado automáticamente si existe
\`\`\`

El segundo archivo sobreescribe y extiende el primero. Las claves que no están en el override se heredan del base.

\`\`\`bash
# Estos dos comandos son equivalentes:
docker compose up -d
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
\`\`\`

### 📖 Archivo base: docker-compose.yml

\`\`\`yaml
# docker-compose.yml — configuración común a todos los entornos
services:
  api:
    image: mi-empresa/api:latest
    environment:
      NODE_ENV: production
      DB_HOST: db
    networks:
      - app_net
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - app_net

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - app_net

networks:
  app_net: {}

volumes:
  db_data: {}
\`\`\`

### 📖 Override de desarrollo: docker-compose.override.yml

\`\`\`yaml
# docker-compose.override.yml — extensiones para desarrollo local
# Este archivo se carga automáticamente en desarrollo

services:
  api:
    build:
      context: ./api           # sobreescribe "image:" — construye localmente
      target: development
    volumes:
      - ./api/src:/app/src     # código en vivo sin rebuild
      - /app/node_modules      # preservar node_modules del contenedor
    environment:
      NODE_ENV: development
      DEBUG: "app:*"
    command: npm run dev       # nodemon en lugar de node
    ports:
      - "9229:9229"            # puerto de debug Node.js

  db:
    ports:
      - "5432:5432"            # exponer DB al host para usar DBeaver/psql

  nginx:
    volumes:
      - ./nginx/dev.conf:/etc/nginx/conf.d/default.conf:ro
\`\`\`

\`\`\`bash
# En desarrollo: solo ejecutar
docker compose up -d    # carga base + override automáticamente
\`\`\`

### 📖 Override de producción con -f explícito

\`\`\`yaml
# docker-compose.prod.yml — extensiones para producción
services:
  api:
    image: mi-empresa/api:\${IMAGE_TAG:-latest}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    ports:
      - "443:443"
    volumes:
      - ./nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
\`\`\`

\`\`\`bash
# En producción: especificar explícitamente los archivos
# El override.yml NO se carga automáticamente porque no existe en el servidor
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# O definir variable de entorno para los archivos
export COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
docker compose up -d
\`\`\`

### 📖 Reglas de merge entre archivos

\`\`\`text
TIPO DE CLAVE    COMPORTAMIENTO EN EL MERGE
────────────────────────────────────────────────────────────
Scalar (string)  El override sobreescribe: image, command
List (ports)     Se concatenan: ambos archivos contribuyen entradas
Map (environment)Se hace merge: override añade/sobreescribe claves
\`\`\`

\`\`\`yaml
# Base:                          # Override:                # Resultado:
ports:                           ports:                     ports:
  - "80:80"                        - "443:443"                - "80:80"
                                                              - "443:443"

environment:                     environment:               environment:
  NODE_ENV: production             NODE_ENV: development      NODE_ENV: development
  DB_HOST: db                                                 DB_HOST: db
\`\`\`

\`\`\`bash
# Verificar el YAML resultante del merge
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
\`\`\`

### 📋 Lo que debes recordar

* \`docker-compose.override.yml\` se carga automáticamente si existe — ideal para sobrerides de desarrollo.
* El flag \`-f\` permite componer cualquier combinación de archivos en cualquier orden.
* Las listas (ports, volumes) se concatenan en el merge; los scalars se sobreescriben; los maps se combinan.
* En producción, el \`override.yml\` normalmente no existe — el servidor solo tiene el base y el prod override.

### 🧪 Autoevaluación

1. ¿Por qué es mejor práctica no tener un \`docker-compose.override.yml\` en el servidor de producción?
2. Si el archivo base define \`ports: ["80:80"]\` y el override define \`ports: ["443:443"]\`, ¿qué puertos tendrá el contenedor final?
3. ¿Cómo verificas el YAML resultante después de combinar múltiples archivos Compose?

---

1. Porque el \`override.yml\` es de desarrollo — tiene bind mounts de código fuente, puertos de debug expuestos y configuración insegura pensada para uso local. Si existiera en producción y alguien corriera \`docker compose up\` sin especificar archivos, aplicaría automáticamente la configuración de desarrollo en producción. La separación explícita con \`-f\` en producción es más segura e intencional.
2. Ambos — \`["80:80", "443:443"]\`. Las listas de ports se concatenan en el merge, no se sobreescriben. Si se quisiese reemplazar la lista completa, habría que usar \`!reset\` o gestionar la configuración de otra forma.
3. Con \`docker compose -f docker-compose.yml -f docker-compose.prod.yml config\` — muestra el YAML completamente resuelto después del merge y la interpolación de variables, sin arrancar ningún contenedor.
`

export default content
