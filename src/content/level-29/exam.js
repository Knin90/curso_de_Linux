const exam = [
  // Módulo 1 — docker-compose.yml: estructura, versiones y sintaxis
  {
    q: '¿Cuál es la única sección de nivel superior obligatoria en un archivo docker-compose.yml?',
    options: ['services', 'networks', 'volumes', 'configs'],
    correct: 0,
  },
  {
    q: '¿Qué comando se recomienda usar hoy en día en lugar del binario "docker-compose" (con guion)?',
    options: ['docker-cli compose', 'docker compose', 'docker run compose', 'compose docker'],
    correct: 1,
  },
  {
    q: '¿Cómo se llama el estándar actual que reemplaza al campo "version" en el YAML de Compose?',
    options: ['Compose Legacy Format', 'Container Spec', 'Compose Specification', 'Docker Manifest v3'],
    correct: 2,
  },
  {
    q: 'Si el proyecto se llama "tienda" y hay un servicio "web", ¿qué nombre tendrá el contenedor por defecto?',
    options: ['web-tienda-1', 'tienda_web', 'web_1_tienda', 'tienda-web-1'],
    correct: 3,
  },
  {
    q: '¿Qué clave se usa para construir una imagen localmente desde un Dockerfile en lugar de usar una imagen publicada?',
    options: ['build', 'image', 'dockerfile', 'context'],
    correct: 0,
  },
  {
    q: 'Dentro de la clave "build" con opciones detalladas, ¿qué campo especifica el directorio que contiene el Dockerfile?',
    options: ['path', 'context', 'dockerfile', 'target'],
    correct: 1,
  },

  // Módulo 2 — Services, networks y volumes en Compose
  {
    q: 'Si no se define ninguna red explícita, ¿qué tipo de red crea Compose automáticamente para el stack?',
    options: ['host', 'overlay', 'bridge', 'macvlan'],
    correct: 2,
  },
  {
    q: '¿Cómo resuelve un servicio la dirección de otro servicio dentro de la misma red de Compose?',
    options: ['Por localhost', 'Por IP fija asignada manualmente', 'Por el ID del contenedor', 'Por el nombre del servicio (DNS interno)'],
    correct: 3,
  },
  {
    q: '¿Qué propiedad de una red personalizada impide el acceso a internet desde los contenedores conectados a ella?',
    options: ['internal: true', 'isolated: true', 'private: true', 'no_egress: true'],
    correct: 0,
  },
  {
    q: '¿Qué comando elimina los volúmenes nombrados además de contenedores y redes?',
    options: ['docker compose stop -v', 'docker compose down -v', 'docker compose rm -v', 'docker compose down --purge'],
    correct: 1,
  },
  {
    q: '¿Qué tipo de volumen se descarta automáticamente cuando se elimina el contenedor que lo usa?',
    options: ['Volumen nombrado', 'Bind mount', 'Volumen anónimo', 'Volumen externo'],
    correct: 2,
  },
  {
    q: '¿Qué sufijo se agrega a un bind mount para montarlo en modo solo lectura?',
    options: [':rw', ':z', ':cached', ':ro'],
    correct: 3,
  },

  // Módulo 3 — Variables de entorno y archivos .env en Compose
  {
    q: '¿Qué archivo busca Compose automáticamente en el mismo directorio para interpolar variables en el YAML?',
    options: ['.env', '.env.local', 'variables.env', 'compose.env'],
    correct: 0,
  },
  {
    q: '¿Qué clave se usa para cargar un archivo de variables que se inyectan directamente dentro del contenedor?',
    options: ['vars_file', 'env_file', 'load_env', 'environment_source'],
    correct: 1,
  },
  {
    q: '¿Qué sintaxis de interpolación asigna un valor por defecto si la variable no está definida?',
    options: ['${VAR:?msg}', '${VAR:+valor}', '${VAR:-default}', '${VAR=default}'],
    correct: 2,
  },
  {
    q: '¿Qué sintaxis hace que Compose falle con un mensaje de error si una variable requerida no está definida?',
    options: ['${VAR:-mensaje}', '${VAR:+mensaje}', '${VAR!mensaje}', '${VAR:?mensaje}'],
    correct: 3,
  },
  {
    q: '¿Qué archivo SÍ debería incluirse en el repositorio como documentación de variables necesarias?',
    options: ['.env.example', '.env', '.env.local', '.env.secret'],
    correct: 0,
  },
  {
    q: '¿Qué comando muestra el YAML de Compose ya resuelto tras aplicar la interpolación de variables?',
    options: ['docker compose validate', 'docker compose config', 'docker compose resolve', 'docker compose show'],
    correct: 1,
  },

  // Módulo 4 — Gestión del ciclo de vida: up, down, scale, restart
  {
    q: '¿Qué comando detiene los contenedores pero los preserva, sin eliminar redes ni contenedores?',
    options: ['docker compose down', 'docker compose rm', 'docker compose stop', 'docker compose pause'],
    correct: 2,
  },
  {
    q: '¿Qué comando elimina contenedores y redes creados por Compose, pero conserva los volúmenes nombrados?',
    options: ['docker compose stop', 'docker compose rm -f', 'docker compose prune', 'docker compose down'],
    correct: 3,
  },
  {
    q: '¿Qué flag de "docker compose up" reconstruye las imágenes antes de arrancar?',
    options: ['--build', '--rebuild', '--force-image', '--fresh'],
    correct: 0,
  },
  {
    q: 'Para escalar un servicio a varias réplicas, ¿qué configuración de puertos debe evitarse en el YAML?',
    options: [
      'Usar "expose" en lugar de "ports"',
      'Mapear un puerto fijo del host, como "3000:3000"',
      'No declarar puertos en absoluto',
      'Usar variables de entorno para el puerto',
    ],
    correct: 1,
  },
  {
    q: '¿Qué comando arranca 3 réplicas del servicio "worker" en una sola invocación?',
    options: [
      'docker compose scale worker=3',
      'docker compose replicate worker 3',
      'docker compose up -d --scale worker=3',
      'docker compose worker --count=3',
    ],
    correct: 2,
  },
  {
    q: '¿Qué diferencia existe entre "docker compose exec" y "docker compose run"?',
    options: [
      'exec crea un contenedor nuevo; run actúa sobre uno existente',
      'Son exactamente equivalentes',
      'exec solo funciona con volúmenes; run solo con redes',
      'exec actúa sobre un contenedor ya en ejecución; run crea uno nuevo',
    ],
    correct: 3,
  },
  {
    q: '¿Qué código de salida suele indicar que un contenedor fue terminado por el OOM killer por falta de memoria?',
    options: ['Exit 137', 'Exit 1', 'Exit 143', 'Exit 0'],
    correct: 0,
  },

  // Módulo 5 — Override files: compose.override.yml para dev/prod
  {
    q: '¿Qué archivo carga Compose automáticamente además de docker-compose.yml si existe en el mismo directorio?',
    options: ['docker-compose.prod.yml', 'docker-compose.override.yml', 'docker-compose.local.yml', 'docker-compose.dev.yml'],
    correct: 1,
  },
  {
    q: '¿Qué flag permite componer un stack a partir de múltiples archivos Compose explícitos?',
    options: ['--compose', '--merge', '-f', '--files'],
    correct: 2,
  },
  {
    q: 'En el merge de archivos Compose, ¿cómo se combinan las listas como "ports" entre base y override?',
    options: ['Se sobreescriben completamente', 'Se ignoran las del override', 'Provocan un error de validación', 'Se concatenan'],
    correct: 3,
  },
  {
    q: 'En el merge de archivos Compose, ¿qué ocurre con un valor escalar como "image" o "command"?',
    options: ['El override lo sobreescribe', 'Se concatena con el valor base', 'Se ignora si el base ya lo define', 'Genera un conflicto y detiene el merge'],
    correct: 0,
  },
  {
    q: '¿Por qué normalmente NO conviene tener docker-compose.override.yml en un servidor de producción?',
    options: [
      'Porque Compose lo prohíbe explícitamente',
      'Porque contiene configuración de desarrollo que se aplicaría automáticamente sin querer',
      'Porque ralentiza el arranque de los contenedores',
      'Porque no es compatible con la Compose Specification',
    ],
    correct: 1,
  },
  {
    q: '¿Qué variable de entorno permite definir qué archivos Compose combinar sin pasar "-f" cada vez?',
    options: ['COMPOSE_STACK', 'DOCKER_COMPOSE_FILES', 'COMPOSE_FILE', 'COMPOSE_OVERRIDE'],
    correct: 2,
  },

  // Módulo 6 — Health checks y dependencias entre servicios
  {
    q: '¿Qué garantiza "depends_on" sin ninguna condición especificada?',
    options: [
      'Que el servicio dependiente está listo para recibir conexiones',
      'Que el health check del servicio pasó',
      'Que las migraciones ya se ejecutaron',
      'Solamente que el contenedor del que se depende ya arrancó',
    ],
    correct: 3,
  },
  {
    q: '¿Qué campo de un healthcheck evita que los fallos iniciales cuenten como intentos fallidos mientras el servicio arranca?',
    options: ['start_period', 'interval', 'retries', 'timeout'],
    correct: 0,
  },
  {
    q: '¿Qué condición de "depends_on" espera a que el health check de un servicio esté en verde?',
    options: ['service_started', 'service_healthy', 'service_ready', 'service_completed_successfully'],
    correct: 1,
  },
  {
    q: '¿Qué condición de "depends_on" es adecuada para un contenedor de migraciones que corre una vez y termina?',
    options: ['service_healthy', 'service_started', 'service_completed_successfully', 'service_finished'],
    correct: 2,
  },
  {
    q: '¿Qué comando muestra el historial en JSON de los resultados de un health check?',
    options: [
      'docker compose healthcheck --history',
      'docker compose logs --health',
      'docker health show <contenedor>',
      "docker inspect --format='{{json .State.Health}}' <contenedor>",
    ],
    correct: 3,
  },
  {
    q: '¿Qué política de reinicio conviene usar en un contenedor de migración de una sola ejecución?',
    options: ['no', 'always', 'unless-stopped', 'on-failure'],
    correct: 0,
  },
  {
    q: 'Si tanto el Dockerfile como docker-compose.yml definen un healthcheck para el mismo servicio, ¿cuál prevalece?',
    options: ['El del Dockerfile siempre', 'El de docker-compose.yml sobreescribe al del Dockerfile', 'Se combinan ambos', 'Compose genera un error de conflicto'],
    correct: 1,
  },

  // Módulo 7 — Troubleshooting de aplicaciones multi-contenedor
  {
    q: '¿Qué estado en "docker compose ps" indica típicamente un crash loop?',
    options: ['Up', 'Exit 0', 'Restarting', 'Paused'],
    correct: 2,
  },
  {
    q: '¿Cuál es el primer paso recomendado al investigar un contenedor en estado "Restarting"?',
    options: [
      'Eliminar el volumen del servicio',
      'Reconstruir la imagen sin caché de inmediato',
      'Reiniciar todo el stack con "docker compose down -v"',
      'Revisar los logs del servicio con "docker compose logs"',
    ],
    correct: 3,
  },
  {
    q: 'El servicio "api" no puede resolver el nombre "db" por DNS interno. ¿Cuál es la causa más probable?',
    options: ['Los servicios no comparten la misma red', 'La imagen de "db" está corrupta', 'Falta un volumen nombrado', 'El archivo .env no existe'],
    correct: 0,
  },
  {
    q: 'En sistemas con SELinux (como Fedora), ¿qué sufijo se agrega a un bind mount para que el contenedor pueda leer los archivos?',
    options: [':ro', ':z', ':rw', ':cached'],
    correct: 1,
  },
  {
    q: '¿Qué comando permite ejecutar un shell de diagnóstico en una imagen aunque el contenedor original esté detenido o en crash loop?',
    options: ['docker compose exec api sh', 'docker compose attach api', 'docker compose run --rm api sh', 'docker compose debug api'],
    correct: 2,
  },
  {
    q: '¿Qué herramienta ayuda a identificar qué proceso del host está usando un puerto que Compose necesita mapear?',
    options: ['docker compose ports', 'docker network ls', 'docker compose config', 'ss -tlnp'],
    correct: 3,
  },

  // Módulo 8 — Proyecto real: stack completo LEMP con Docker Compose
  {
    q: 'En el stack LEMP del laboratorio, ¿por qué Nginx no se conecta directamente a MySQL?',
    options: [
      'Porque Nginx está en la red frontend y MySQL en la red backend; PHP hace de intermediario',
      'Porque MySQL no soporta conexiones de Nginx',
      'Porque MySQL requiere TLS que Nginx no soporta',
      'Porque Nginx no puede resolver nombres DNS',
    ],
    correct: 0,
  },
  {
    q: '¿Qué propiedad de red aísla a MySQL y Redis del acceso externo en el stack LEMP?',
    options: ['driver: overlay', 'internal: true en la red backend', 'expose: none', 'isolated_network: true'],
    correct: 1,
  },
  {
    q: 'Para evitar que PHP falle si MySQL tarda 40 segundos en inicializar, ¿qué se usa junto a "service_healthy"?',
    options: [
      'restart: always en MySQL',
      'aumentar los "retries" del depends_on',
      'un start_period suficientemente largo en el healthcheck de MySQL',
      'quitar el healthcheck de MySQL',
    ],
    correct: 2,
  },
  {
    q: '¿Qué puerto expone PHP-FPM hacia Nginx mediante fastcgi_pass en el stack LEMP?',
    options: ['80', '3306', '6379', '9000'],
    correct: 3,
  },
  {
    q: '¿Qué servicio actúa como caché de sesiones en el stack LEMP descrito?',
    options: ['Redis', 'MySQL', 'Nginx', 'PHP-FPM'],
    correct: 0,
  },
  {
    q: 'En el override de desarrollo del stack LEMP, ¿qué se expone al host que no debería exponerse en producción?',
    options: ['El puerto 80 de Nginx', 'Los puertos de MySQL y Redis', 'El volumen del código PHP', 'La red frontend'],
    correct: 1,
  },
]

export default exam
