const content = `
## Módulo 7 — Troubleshooting de aplicaciones multi-contenedor

### 🎯 Objetivos de aprendizaje

* Diagnosticar los problemas más comunes en stacks de Docker Compose.
* Usar logs, exec e inspect para investigar contenedores en mal estado.
* Resolver problemas de red, volúmenes y variables de entorno.
* Aplicar un flujo de diagnóstico sistemático.

### ❓ El problema real

Tu stack de cuatro contenedores arranca pero la aplicación no responde. ¿Cuál de los cuatro tiene el problema? ¿Es la red, un volumen mal montado, una variable de entorno incorrecta, o el código? Sin un método de diagnóstico, pasarás horas rebuscando en logs sin encontrar la causa. Este módulo da las herramientas y el proceso.

### 📖 Flujo de diagnóstico sistemático

\`\`\`text
1. Ver el estado de todos los contenedores
   → ¿Están todos Up? ¿Alguno en Restarting o Exit?

2. Revisar logs del servicio con problemas
   → ¿Hay errores de conexión? ¿Excepciones? ¿Mensajes de configuración?

3. Verificar conectividad de red entre servicios
   → ¿Puede el servicio A alcanzar al servicio B?

4. Verificar variables de entorno y volúmenes
   → ¿Tienen los valores correctos? ¿Están montados?

5. Ejecutar el proceso manualmente
   → Entrar al contenedor y ejecutar el comando a mano
\`\`\`

### 📖 Paso 1: estado de contenedores

\`\`\`bash
# Vista general del stack
docker compose ps

# Ver incluso contenedores detenidos
docker compose ps -a

# Señales de problemas:
# "Restarting" → crash loop (ver logs)
# "Exit 1"     → terminó con error
# "Exit 137"   → OOM killer (sin memoria)
# "Exit 143"   → SIGTERM (detenido externamente)

# Cuántas veces ha reiniciado un contenedor
docker inspect --format='{{.RestartCount}}' mi-app-api-1
\`\`\`

### 📖 Paso 2: logs

\`\`\`bash
# Logs de un servicio específico
docker compose logs api

# Logs en tiempo real con timestamps
docker compose logs -f --timestamps api

# Logs de múltiples servicios a la vez
docker compose logs -f api nginx

# Últimas N líneas
docker compose logs --tail=100 api

# Ver logs de un contenedor detenido (docker inspect da el log path)
docker logs mi-app-api-1

# Si el contenedor muere inmediatamente, capturar el error
docker compose up api   # sin -d para ver el output directo
\`\`\`

### 📖 Paso 3: diagnóstico de red

\`\`\`bash
# Entrar al contenedor del servicio con problemas
docker compose exec api sh

# Dentro del contenedor: probar conectividad
ping db              # ¿resuelve el nombre?
nslookup db          # ¿qué IP tiene?
wget -qO- http://db:5432   # ¿responde el puerto?

# Si el contenedor no tiene ping/curl, usar un contenedor temporal
docker run --rm --network mi-app_app_net alpine ping db

# Ver las redes a las que pertenece un contenedor
docker inspect mi-app-api-1 --format='{{json .NetworkSettings.Networks}}' | python3 -m json.tool

# Listar contenedores en una red específica
docker network inspect mi-app_app_net
\`\`\`

### 📖 Paso 4: variables de entorno y volúmenes

\`\`\`bash
# Ver las variables de entorno del contenedor
docker compose exec api env
docker compose exec api env | grep DB

# Ver el valor resuelto de las variables en el YAML
docker compose config

# Ver los volúmenes montados
docker inspect mi-app-api-1 --format='{{json .Mounts}}' | python3 -m json.tool

# Verificar que el archivo existe en el bind mount
docker compose exec api ls -la /app/src

# Ver si un volumen nombrado tiene datos
docker run --rm -v mi-app_db_data:/data alpine ls -la /data
\`\`\`

### 📖 Problemas comunes y soluciones

\`\`\`text
SÍNTOMA                           CAUSA PROBABLE              SOLUCIÓN
──────────────────────────────────────────────────────────────────────────────
"connection refused"              servicio no listo           health checks + depends_on
"unknown host db"                 red incorrecta              verificar networks en el YAML
"permission denied" en volumen    permisos del host           chown en Dockerfile o :z en SELinux
imagen desactualizada             no se hizo pull/build       docker compose pull; --build
puerto ya en uso                  conflicto en el host        cambiar el puerto del host
variables undefined               .env no existe              cp .env.example .env
OOM (Exit 137)                    sin memoria suficiente      agregar limits.memory
\`\`\`

\`\`\`bash
# Puerto ocupado: ver qué proceso lo usa
ss -tlnp | grep :80
lsof -i :80

# Reconstruir desde cero (resolver problemas de caché)
docker compose down -v
docker compose build --no-cache
docker compose up -d

# Problema de SELinux con bind mounts (Fedora/RHEL)
volumes:
  - ./data:/app/data:z    # :z relabela para SELinux
  - ./data:/app/data:Z    # :Z relabela como privado
\`\`\`

### 📋 Lo que debes recordar

* "Restarting" siempre significa crash loop — los logs del servicio revelarán el error exacto.
* Los servicios se resuelven por nombre en la red; si el nombre no resuelve, el contenedor no está en la misma red.
* \`docker compose config\` es la primera herramienta para problemas de variables o YAML inesperado.
* En SELinux (Fedora, RHEL), los bind mounts necesitan el sufijo \`:z\` para que el contenedor pueda leer los archivos.

### 🧪 Autoevaluación

1. Un contenedor está en estado "Restarting". ¿Cuál es el siguiente paso de diagnóstico y qué comando usas?
2. Tu servicio \`api\` no puede conectarse a \`db\` aunque ambos están en \`Up\`. ¿Cuál es la causa más probable y cómo la verificas?
3. ¿Cuándo usarías \`docker compose run --rm api sh\` en lugar de \`docker compose exec api sh\`?

---

1. Ver los logs del contenedor con \`docker compose logs api\` (o el nombre del servicio en cuestión). El contenedor está muriendo inmediatamente, y los logs muestran el error justo antes del crash — normalmente un error de configuración, conexión fallida o excepción no capturada. También se puede correr \`docker compose up api\` sin \`-d\` para ver el output en tiempo real.
2. La causa más probable es que no comparten la misma red. Se verifica con \`docker inspect mi-app-api-1\` buscando el campo \`NetworkSettings.Networks\` y comprobando que ambos contenedores están en la misma red, o ejecutando \`docker compose exec api ping db\` para ver si hay resolución DNS.
3. Cuando el contenedor está detenido o en crash loop y no se puede hacer \`exec\`. \`docker compose run\` crea un contenedor nuevo de la misma imagen, lo que permite inspeccionar el entorno, verificar archivos o ejecutar comandos de diagnóstico sin necesidad de que el servicio esté corriendo.
`

export default content
