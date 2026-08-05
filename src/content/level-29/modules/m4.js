const content = `
## Módulo 4 — Gestión del ciclo de vida: up, down, scale, restart

### 🎯 Objetivos de aprendizaje

* Dominar los comandos principales de \`docker compose\` para gestionar el ciclo de vida completo.
* Arrancar, detener, reiniciar y escalar servicios de forma precisa.
* Diferenciar entre \`stop\`, \`down\` y \`rm\` y cuándo usar cada uno.
* Monitorear logs y el estado de servicios en un stack activo.

### ❓ El problema real

Haces un cambio en el código del backend. ¿Qué comando usas? ¿\`docker compose restart\`? ¿\`docker compose up\`? ¿\`docker compose up --build\`? Cada uno hace algo diferente, y elegir el incorrecto significa que tus cambios no se aplican, o que bajas un servicio que no debería bajar. Entender el ciclo de vida evita estos errores.

### 📖 Arrancar servicios: up

\`\`\`bash
# Arrancar todos los servicios en primer plano (ver logs en tiempo real)
docker compose up

# Arrancar en segundo plano (detached mode — uso normal)
docker compose up -d

# Reconstruir imágenes antes de arrancar (tras cambios en Dockerfile)
docker compose up -d --build

# Arrancar solo un servicio específico (y sus dependencias)
docker compose up -d api

# Forzar recrear contenedores aunque no hayan cambiado
docker compose up -d --force-recreate

# No iniciar dependencias (solo el servicio especificado)
docker compose up -d --no-deps worker
\`\`\`

### 📖 Detener servicios: stop, down y rm

\`\`\`bash
# STOP: detiene contenedores pero los preserva (como "pausar")
docker compose stop

# Detener un servicio específico
docker compose stop api

# START: reanudar contenedores detenidos
docker compose start

# DOWN: detiene Y elimina contenedores, redes creadas por Compose
docker compose down

# DOWN con eliminación de volúmenes (destructivo — borra datos)
docker compose down -v

# DOWN con eliminación de imágenes construidas localmente
docker compose down --rmi local

# RM: eliminar contenedores detenidos (requiere stop primero)
docker compose rm -f
\`\`\`

\`\`\`text
COMANDO         CONTENEDOR    RED       VOLUMEN    IMAGEN
───────────────────────────────────────────────────────────
stop            detenido      intacta   intacto    intacta
down            eliminado     eliminada intacto    intacta
down -v         eliminado     eliminada eliminado  intacta
down --rmi all  eliminado     eliminada intacto    eliminada
\`\`\`

### 📖 Escalar servicios

\`\`\`bash
# Escalar un servicio a N réplicas
docker compose up -d --scale worker=3
docker compose up -d --scale api=2 --scale worker=5

# Ver cuántas réplicas están corriendo
docker compose ps
\`\`\`

\`\`\`yaml
# Para escalar, el servicio NO debe tener container_name ni puerto fijo en el host
# INCORRECTO para escalar:
services:
  api:
    container_name: mi-api    # conflicto de nombres con 2+ réplicas
    ports:
      - "3000:3000"           # conflicto de puerto con 2+ réplicas

# CORRECTO para escalar:
services:
  api:
    image: node:20-alpine
    expose:
      - "3000"                # expone el puerto internamente, no al host
    # Un nginx o load balancer delante maneja la distribución
\`\`\`

### 📖 Reiniciar y actualizar servicios

\`\`\`bash
# Reiniciar todos los servicios (útil para recargar configuración)
docker compose restart

# Reiniciar un servicio específico
docker compose restart api

# Flujo para actualizar una imagen publicada
docker compose pull                      # descargar últimas imágenes
docker compose up -d                     # recrear contenedores con nuevas imágenes

# Flujo para actualizar código con rebuild
docker compose up -d --build api         # reconstruir y recrear solo "api"

# Aplicar cambios del YAML sin reiniciar servicios no afectados
docker compose up -d                     # Compose detecta qué cambió
\`\`\`

### 📖 Monitoreo y diagnóstico

\`\`\`bash
# Ver el estado de todos los servicios
docker compose ps

# Ver logs de todos los servicios
docker compose logs

# Logs en tiempo real (follow)
docker compose logs -f

# Logs de un servicio específico, últimas 50 líneas
docker compose logs -f --tail=50 api

# Ver uso de recursos (CPU, memoria, red, disco)
docker compose stats

# Ejecutar un comando en un contenedor en ejecución
docker compose exec api sh
docker compose exec db psql -U postgres

# Ejecutar un comando en un contenedor nuevo (sin entrar al running)
docker compose run --rm api node --version
\`\`\`

### 📋 Lo que debes recordar

* \`up --build\` reconstruye imágenes; \`up -d\` solo recrea si el YAML cambió — no rebuilds automáticos.
* \`stop\` preserva contenedores; \`down\` los elimina; \`down -v\` también borra datos de volúmenes.
* Para escalar un servicio, no puede tener \`container_name\` ni puertos mapeados directamente al host.
* \`docker compose exec\` actúa en un contenedor ya corriendo; \`docker compose run\` crea uno nuevo.

### 🧪 Autoevaluación

1. Cambias el código de tu API y quieres que el contenedor lo refleje. ¿Qué comando usas y por qué?
2. ¿Cuándo usarías \`docker compose stop\` en lugar de \`docker compose down\`?
3. Quieres correr 4 réplicas del servicio \`worker\`. ¿Qué tendrías que cambiar en el YAML para que sea posible?

---

1. Depende de la configuración. Si el código está en un bind mount (\`./src:/app/src\`), el contenedor ya lo tiene en vivo y no hace falta reconstruir — un \`docker compose restart api\` o simplemente el proceso dentro del contenedor (nodemon, etc.) detecta los cambios. Si la imagen se construye con el código copiado en el Dockerfile (\`COPY\`), hay que usar \`docker compose up -d --build api\` para reconstruir la imagen con los nuevos archivos.
2. Cuando quieres pausar temporalmente el stack pero necesitas que vuelva exactamente igual — preservando el estado de los contenedores. Por ejemplo, liberar recursos durante la noche sin perder la configuración de red ni los contenedores. \`down\` es más limpio para reinicios completos.
3. Eliminar la clave \`container_name:\` (si existe) y cambiar los puertos de \`"HOST:3000"\` a solo \`expose: ["3000"]\`. Con puertos directos al host, dos réplicas intentarían usar el mismo puerto del host y fallarían.
`

export default content
