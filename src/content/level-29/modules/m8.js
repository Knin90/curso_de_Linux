const content = `
## Módulo 8 — Proyecto real: stack completo LEMP con Docker Compose

### 🎯 Objetivos de aprendizaje

* Construir un stack LEMP (Linux, Nginx, MySQL, PHP) completo con Docker Compose.
* Aplicar todos los conceptos del nivel: redes, volúmenes, variables, health checks y dependencias.
* Configurar Nginx como proxy reverso hacia PHP-FPM.
* Verificar que el stack funciona end-to-end con una aplicación PHP real.

### ❓ El problema real

Este laboratorio integra todo lo visto en el nivel. Partirás de cero y construirás un stack de producción completamente funcional: Nginx recibe las peticiones, las pasa a PHP-FPM que procesa el código, PHP consulta MySQL para los datos, y Redis sirve como caché de sesiones. Al final, tienes un entorno reproducible que cualquier miembro del equipo puede levantar con \`docker compose up -d\`.

### 📖 Estructura del proyecto

\`\`\`text
lemp-stack/
├── docker-compose.yml
├── docker-compose.override.yml
├── .env
├── .env.example
├── nginx/
│   ├── nginx.conf
│   └── default.conf
├── php/
│   └── Dockerfile
└── app/
    ├── index.php
    └── config.php
\`\`\`

### 📖 Archivo .env

\`\`\`bash
# .env
MYSQL_ROOT_PASSWORD=rootpassword123
MYSQL_DATABASE=appdb
MYSQL_USER=appuser
MYSQL_PASSWORD=userpassword456

PHP_VERSION=8.3-fpm-alpine
NGINX_VERSION=1.25-alpine

APP_PORT=8080
\`\`\`

### 📖 docker-compose.yml

\`\`\`yaml
name: lemp

services:
  nginx:
    image: nginx:\${NGINX_VERSION:-1.25-alpine}
    ports:
      - "\${APP_PORT:-8080}:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./app:/var/www/html:ro
    networks:
      - frontend
    depends_on:
      php:
        condition: service_healthy
    restart: unless-stopped

  php:
    build:
      context: ./php
      args:
        PHP_VERSION: \${PHP_VERSION:-8.3-fpm-alpine}
    volumes:
      - ./app:/var/www/html
    networks:
      - frontend
      - backend
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "php-fpm -t 2>&1 | grep -q 'test is successful'"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: \${MYSQL_DATABASE}
      MYSQL_USER: \${MYSQL_USER}
      MYSQL_PASSWORD: \${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - backend
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost",
             "-u", "root", "--password=\${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3
    restart: unless-stopped

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true

volumes:
  mysql_data:
    driver: local
\`\`\`

### 📖 php/Dockerfile

\`\`\`dockerfile
ARG PHP_VERSION=8.3-fpm-alpine
FROM php:\${PHP_VERSION}

RUN apk add --no-cache \
    libpng-dev \
    libzip-dev \
    && docker-php-ext-install \
       pdo_mysql \
       zip \
       gd

# Instalar extensión Redis
RUN apk add --no-cache pcre-dev \
    && pecl install redis \
    && docker-php-ext-enable redis

WORKDIR /var/www/html
\`\`\`

### 📖 nginx/default.conf

\`\`\`nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html;
    index index.php index.html;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \\.php$ {
        fastcgi_pass php:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }
}
\`\`\`

### 📖 Estado del stack en marcha

\`\`\`bash
# Construir y arrancar
docker compose up -d --build

# Verificar que todos los servicios están healthy
docker compose ps

# Ver los logs de arranque
docker compose logs -f

# Probar la aplicación
curl http://localhost:8080

# Verificar conectividad PHP → MySQL
docker compose exec php php -r "
\\\$pdo = new PDO(
    'mysql:host=mysql;dbname=appdb',
    'appuser',
    'userpassword456'
);
echo 'Conexión OK: ' . \\\$pdo->query('SELECT VERSION()')->fetchColumn() . PHP_EOL;
"

# Verificar conectividad PHP → Redis
docker compose exec php php -r "
\\\$redis = new Redis();
\\\$redis->connect('redis', 6379);
echo 'Redis OK: ' . \\\$redis->ping() . PHP_EOL;
"
\`\`\`

### 📖 Override de desarrollo

\`\`\`yaml
# docker-compose.override.yml — solo en desarrollo
services:
  mysql:
    ports:
      - "3306:3306"    # acceso directo para clientes SQL

  redis:
    ports:
      - "6379:6379"    # acceso directo para redis-cli local

  php:
    volumes:
      - ./app:/var/www/html    # cambios en vivo sin rebuild
\`\`\`

### 📋 Lo que debes recordar

* La red \`backend\` con \`internal: true\` aisla MySQL y Redis del acceso externo.
* El orden de arranque: MySQL y Redis primero (health checks), luego PHP (depends on ambos), luego Nginx (depends on PHP).
* El override de desarrollo expone los puertos de DB al host para herramientas de desarrollo.
* \`docker compose up -d --build\` en el primer arranque; \`docker compose up -d\` en actualizaciones sin cambios de imagen.

### 🧪 Autoevaluación

1. ¿Por qué Nginx no se conecta directamente a MySQL en este stack?
2. Si MySQL tarda 40 segundos en inicializarse, ¿cómo evitamos que PHP falle al arrancar?
3. ¿Qué comandos usarías para destruir completamente el stack y empezar desde cero, incluyendo los datos?

---

1. Porque Nginx está en la red \`frontend\` y MySQL está en la red \`backend\`. Solo PHP está en ambas redes, actuando como intermediario. Esto implementa el principio de mínimo privilegio: Nginx solo necesita hablar con PHP, no con la base de datos directamente.
2. Con \`start_period: 30s\` o más en el health check de MySQL, y usando la condición \`service_healthy\` en el \`depends_on\` de PHP. El \`start_period\` indica a Docker que no cuente los fallos durante los primeros N segundos, dando tiempo a MySQL para inicializarse sin que el health check lo marque como unhealthy prematuramente.
3. \`docker compose down -v\` elimina los contenedores, redes y volúmenes (incluyendo los datos de MySQL). Luego \`docker compose up -d --build\` reconstruye las imágenes y arranca el stack desde cero limpio.
`

export default content
