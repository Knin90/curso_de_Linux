const exam = [
  // Módulo 1 — Fundamentos: namespaces, cgroups y qué es un contenedor
  {
    q: '¿Qué es realmente un contenedor a nivel del kernel Linux?',
    options: [
      'Un proceso Linux con namespaces y cgroups aplicados',
      'Una máquina virtual ligera con su propio kernel',
      'Un chroot con un firewall dedicado',
      'Un hypervisor tipo 2 ejecutado en espacio de usuario',
    ],
    correct: 0,
  },
  {
    q: '¿Qué namespace de Linux aísla el árbol de procesos de un contenedor?',
    options: ['net', 'pid', 'mnt', 'uts'],
    correct: 1,
  },
  {
    q: '¿Qué tecnología del kernel limita cuánta CPU, RAM o I/O puede consumir un contenedor?',
    options: ['seccomp', 'AppArmor', 'cgroups', 'iptables'],
    correct: 2,
  },
  {
    q: '¿En qué filesystem virtual se gestiona la jerarquía de cgroups v2?',
    options: ['/proc/sys/kernel/', '/var/lib/docker/', '/etc/cgroups/', '/sys/fs/cgroup/'],
    correct: 3,
  },
  {
    q: '¿Cuál es la principal diferencia de aislamiento entre un contenedor y una máquina virtual?',
    options: [
      'El contenedor comparte el kernel del host; la VM tiene su propio kernel',
      'El contenedor arranca más lento que una VM',
      'La VM no puede limitar recursos con cgroups',
      'El contenedor siempre pesa más que la imagen de una VM',
    ],
    correct: 0,
  },
  {
    q: 'En la cadena de ejecución de Docker, ¿qué componente es el runtime OCI de bajo nivel que realmente crea namespaces y cgroups?',
    options: ['dockerd', 'runc', 'containerd', 'buildkitd'],
    correct: 1,
  },

  // Módulo 2 — Arquitectura Docker: daemon, cliente, imágenes y registry
  {
    q: '¿A través de qué mecanismo se comunica normalmente el cliente docker con el daemon?',
    options: [
      'Un puerto TCP abierto por defecto en el host',
      'Un archivo compartido en /tmp/docker.pid',
      'Un socket Unix en /var/run/docker.sock',
      'Una llamada directa a runc',
    ],
    correct: 2,
  },
  {
    q: '¿Por qué montar /var/run/docker.sock dentro de un contenedor es un riesgo de seguridad grave?',
    options: [
      'Porque ralentiza el arranque del contenedor',
      'Porque desactiva el healthcheck del contenedor',
      'Porque impide usar volúmenes named',
      'Porque da acceso completo a la API del daemon, equivalente a root en el host',
    ],
    correct: 3,
  },
  {
    q: 'En el nombre de imagen "ghcr.io/org/app:sha-abc123", ¿qué representa "ghcr.io"?',
    options: ['El servidor del registry', 'El tag de la imagen', 'El namespace del usuario', 'El nombre del repositorio'],
    correct: 0,
  },
  {
    q: '¿Qué tecnología del kernel usa Docker para presentar las capas de una imagen como un único filesystem coherente?',
    options: ['ext4 con snapshots', 'OverlayFS (overlay2)', 'btrfs raid1', 'tmpfs unificado'],
    correct: 1,
  },
  {
    q: 'Si tienes 10 contenedores basados en la misma imagen nginx:alpine, ¿cuántas veces se almacenan en disco las capas de solo lectura compartidas?',
    options: ['Diez veces, una por contenedor', 'Cinco veces, la mitad del total', 'Una sola vez, gracias al copy-on-write', 'Depende del driver de red usado'],
    correct: 2,
  },
  {
    q: '¿Cuál es la diferencia entre "docker image prune" y "docker image prune -a"?',
    options: [
      'El primero elimina contenedores; el segundo elimina imágenes',
      'El primero solo funciona con Docker Hub; el segundo con registries privados',
      'No hay diferencia funcional entre ambos',
      'El primero solo elimina imágenes dangling; el segundo elimina todas las imágenes sin uso',
    ],
    correct: 3,
  },

  // Módulo 3 — Dockerfile: construir imágenes eficientes
  {
    q: '¿Qué instrucción del Dockerfile define el directorio de trabajo para las instrucciones siguientes como COPY, RUN y CMD?',
    options: ['WORKDIR', 'ENV', 'LABEL', 'VOLUME'],
    correct: 0,
  },
  {
    q: '¿Cuál es la principal ventaja de usar exec form (["cmd","arg"]) en lugar de shell form en CMD/ENTRYPOINT?',
    options: [
      'Reduce el tamaño de la imagen',
      'Las señales como SIGTERM llegan directamente al proceso principal',
      'Permite usar variables de entorno',
      'Es obligatorio para poder usar HEALTHCHECK',
    ],
    correct: 1,
  },
  {
    q: 'En el patrón ENTRYPOINT ["nginx"] + CMD ["-g", "daemon off;"], ¿qué ocurre si ejecutas "docker run mi-imagen -c /otro.conf"?',
    options: [
      'Se ignora el argumento porque ENTRYPOINT es fijo',
      'Sobrescribe completamente el ENTRYPOINT',
      'El argumento se añade como parámetro adicional a nginx, reemplazando el CMD por defecto',
      'Docker lanza un error de sintaxis',
    ],
    correct: 2,
  },
  {
    q: '¿Por qué es recomendable copiar package.json e instalar dependencias antes de copiar el resto del código fuente en un Dockerfile?',
    options: [
      'Para reducir el número total de capas a una sola',
      'Es obligatorio por la especificación OCI',
      'Para que el HEALTHCHECK funcione correctamente',
      'Para aprovechar el cache de capas: el código cambia más que las dependencias',
    ],
    correct: 3,
  },
  {
    q: '¿Qué instrucción de Dockerfile puede descargar un archivo desde una URL o extraer automáticamente un .tar.gz local, a diferencia de COPY?',
    options: ['ADD', 'FETCH', 'IMPORT', 'ONBUILD'],
    correct: 0,
  },
  {
    q: '¿Para qué sirve principalmente el archivo .dockerignore?',
    options: [
      'Para definir qué imágenes base están permitidas',
      'Para excluir archivos innecesarios o sensibles del contexto de build',
      'Para configurar las políticas de restart del contenedor',
      'Para declarar las capabilities que tendrá el contenedor',
    ],
    correct: 1,
  },
  {
    q: 'Si ejecutas RUN apt-get update en una instrucción y luego RUN apt-get clean en una instrucción RUN separada, ¿se reduce el tamaño final de la imagen?',
    options: [
      'Sí, porque Docker siempre fusiona instrucciones RUN consecutivas',
      'Sí, pero solo si además se usa multi-stage build',
      'No, la cache de apt ya quedó grabada en la capa anterior y persiste',
      'No tiene efecto sobre el tamaño en ningún caso, ni junto ni separado',
    ],
    correct: 2,
  },

  // Módulo 4 — docker run: contenedores, volúmenes y puertos
  {
    q: '¿Cuál es la diferencia entre docker stop y docker kill?',
    options: [
      'docker stop envía SIGTERM con tiempo de gracia; docker kill envía SIGKILL inmediato',
      'docker stop elimina el contenedor; docker kill solo lo pausa',
      'docker kill respeta la política --restart; docker stop no',
      'No hay diferencia, son alias del mismo comando',
    ],
    correct: 0,
  },
  {
    q: 'Tienes PostgreSQL corriendo con -v datos-pg:/var/lib/postgresql/data y ejecutas docker rm -f postgres. ¿Qué ocurre con los datos?',
    options: [
      'Se pierden porque el volumen se elimina junto al contenedor',
      'No se pierden: el named volume es independiente del ciclo de vida del contenedor',
      'Se pierden solo si el volumen no tenía la opción :ro',
      'Se pierden a menos que se use --restart always',
    ],
    correct: 1,
  },
  {
    q: '¿Cuál es la ventaja principal de --restart unless-stopped frente a --restart always?',
    options: [
      'unless-stopped nunca reinicia el contenedor tras un fallo',
      'always no funciona si se reinicia el host',
      'unless-stopped respeta un docker stop manual; always lo reinicia igualmente al arrancar el daemon',
      'unless-stopped requiere Docker Swarm activado',
    ],
    correct: 2,
  },
  {
    q: '¿Qué tipo de almacenamiento en docker run vive únicamente en memoria RAM y desaparece al detener el contenedor?',
    options: ['Bind mount', 'Named volume', 'overlay2', 'tmpfs'],
    correct: 3,
  },
  {
    q: '¿Qué comando usarías para seguir en tiempo real los logs de un contenedor en ejecución?',
    options: ['docker logs -f mi-contenedor', 'docker exec -it mi-contenedor tail', 'docker inspect mi-contenedor --logs', 'docker stats mi-contenedor'],
    correct: 0,
  },
  {
    q: '¿Qué flag de docker run ejecuta el contenedor en segundo plano (background)?',
    options: ['-it', '--rm', '-p', '-d'],
    correct: 3,
  },

  // Módulo 5 — Redes Docker: bridge, host, overlay y custom networks
  {
    q: '¿Por qué dos contenedores en la red bridge predeterminada (docker0) no pueden resolverse entre sí por nombre?',
    options: [
      'Porque Docker bloquea el tráfico ICMP por defecto',
      'Porque el bridge predeterminado no tiene DNS interno, solo funciona por IP',
      'Porque cada contenedor necesita su propia red macvlan',
      'Porque el DNS solo funciona en modo host',
    ],
    correct: 1,
  },
  {
    q: '¿Qué ventaja aporta crear una red bridge personalizada con docker network create frente al bridge predeterminado?',
    options: [
      'Elimina la necesidad de publicar puertos',
      'Permite ejecutar contenedores sin namespaces de red',
      'Resolución DNS automática por nombre de contenedor y aislamiento entre redes',
      'Aumenta automáticamente los límites de cgroups',
    ],
    correct: 2,
  },
  {
    q: 'Al usar --network host en docker run, ¿qué ocurre con la publicación de puertos?',
    options: [
      'Se requiere -p obligatoriamente para cada puerto',
      'Los puertos se publican automáticamente en un rango aleatorio',
      'La red host bloquea todos los puertos por seguridad',
      'No se necesita -p porque el contenedor comparte el stack de red del host directamente',
    ],
    correct: 3,
  },
  {
    q: '¿Qué diferencia de seguridad hay entre "-p 8080:80" y "-p 127.0.0.1:8080:80"?',
    options: [
      'La segunda expone el puerto solo en localhost, mientras la primera escucha en todas las interfaces del host',
      'Ambas son idénticas en comportamiento',
      'La primera cifra el tráfico y la segunda no',
      'La segunda requiere modo Swarm activo',
    ],
    correct: 0,
  },
  {
    q: '¿Qué driver de red asigna al contenedor una MAC e IP propias en la LAN física, sin NAT?',
    options: ['bridge', 'macvlan', 'none', 'overlay'],
    correct: 1,
  },
  {
    q: '¿En qué modo de Docker está disponible el driver de red overlay para comunicación multi-host?',
    options: ['Modo host estándar', 'Modo rootless', 'Modo Swarm', 'Modo bridge personalizado'],
    correct: 2,
  },

  // Módulo 6 — Multi-stage builds y optimización de imágenes
  {
    q: '¿Qué imagen final se usa cuando ejecutas un Dockerfile con varios bloques FROM en un multi-stage build?',
    options: ['La suma de todas las etapas combinadas', 'Solo la primera etapa, usada como base', 'Cada etapa genera una imagen separada obligatoriamente', 'Solo la última etapa; las anteriores se descartan'],
    correct: 3,
  },
  {
    q: '¿Qué requisito debe cumplir un binario Go para poder copiarse en una imagen FROM scratch?',
    options: [
      'Debe compilarse con CGO_ENABLED=0 para ser estáticamente enlazado',
      'Debe incluir una shell embebida',
      'Debe usar como base Alpine explícitamente',
      'Debe declarar HEALTHCHECK obligatoriamente',
    ],
    correct: 0,
  },
  {
    q: '¿Qué ventaja aporta RUN --mount=type=cache,target=/root/.npm en BuildKit?',
    options: [
      'Copia el caché de npm dentro de la imagen final',
      'Persiste el caché de npm entre builds sin incluirlo en la imagen final',
      'Elimina la necesidad de package-lock.json',
      'Convierte automáticamente el build en multi-stage',
    ],
    correct: 1,
  },
  {
    q: '¿Cuál es la regla general de ordenamiento recomendada en un Dockerfile para maximizar el uso del caché?',
    options: [
      'Código fuente primero, dependencias al final',
      'Orden alfabético de instrucciones',
      'De lo que menos cambia (base, dependencias) a lo que más cambia (código fuente)',
      'HEALTHCHECK siempre debe ir primero',
    ],
    correct: 2,
  },
  {
    q: '¿Qué característica distingue a una imagen distroless de una imagen Alpine estándar?',
    options: [
      'Distroless siempre pesa más que Alpine',
      'Alpine no soporta multi-stage builds',
      'Distroless requiere modo rootless obligatoriamente',
      'Distroless no incluye shell ni gestor de paquetes, reduciendo la superficie de ataque',
    ],
    correct: 3,
  },
  {
    q: '¿Qué comando de Docker permite construir imágenes para múltiples arquitecturas (por ejemplo linux/amd64 y linux/arm64) en una sola invocación?',
    options: ['docker buildx build --platform', 'docker image history', 'docker system df', 'docker network create --driver overlay'],
    correct: 0,
  },

  // Módulo 7 — Seguridad de contenedores: capabilities, seccomp y rootless
  {
    q: '¿Por qué --cap-drop=ALL por sí solo no es suficiente para un contenedor que debe escuchar en el puerto 80?',
    options: [
      'Porque desactiva la red por completo',
      'Porque el puerto 80 requiere la capability CAP_NET_BIND_SERVICE, que hay que volver a agregar',
      'Porque el puerto 80 solo funciona en modo rootless',
      'Porque requiere --privileged obligatoriamente',
    ],
    correct: 1,
  },
  {
    q: '¿Qué hace el perfil seccomp predeterminado de Docker?',
    options: [
      'Cifra el tráfico de red del contenedor',
      'Aísla el filesystem mediante namespaces mnt',
      'Bloquea alrededor de 44 syscalls consideradas peligrosas, como mount o reboot',
      'Limita el uso de CPU y memoria del contenedor',
    ],
    correct: 2,
  },
  {
    q: '¿Qué combinación de flags permite que un contenedor tenga el rootfs de solo lectura pero aún así pueda escribir en /tmp?',
    options: [
      '--privileged junto con --network none',
      '--cap-add=ALL sin --read-only',
      '--security-opt seccomp=unconfined',
      '--read-only junto con --tmpfs /tmp:rw,noexec,nosuid',
    ],
    correct: 3,
  },
  {
    q: '¿Qué previene específicamente la opción --security-opt no-new-privileges:true?',
    options: [
      'Que un binario setuid dentro del contenedor eleve privilegios',
      'Que el contenedor use más de un núcleo de CPU',
      'Que el contenedor se conecte a redes externas',
      'Que se pueda hacer docker exec dentro del contenedor',
    ],
    correct: 0,
  },
  {
    q: '¿Cuál es la diferencia principal entre seccomp y AppArmor?',
    options: [
      'AppArmor filtra syscalls; seccomp controla el acceso a archivos',
      'Seccomp filtra syscalls; AppArmor controla acceso a archivos y recursos según perfiles',
      'Ambos hacen exactamente lo mismo y son intercambiables',
      'Seccomp solo aplica en modo rootless',
    ],
    correct: 1,
  },
  {
    q: 'En Docker rootless, ¿bajo qué identidad corre el daemon y los contenedores?',
    options: [
      'Siempre como uid 0 real del host',
      'Bajo un usuario de servicio dedicado llamado "docker"',
      'Bajo el uid del usuario normal que lo ejecuta, sin proceso privilegiado del sistema',
      'No es posible ejecutar Docker sin privilegios de root',
    ],
    correct: 2,
  },
  {
    q: '¿Cuál es la forma recomendada de pasar un secreto (como una contraseña) durante un build sin que quede grabado en las capas de la imagen?',
    options: [
      'Usando una instrucción ENV con el valor del secreto',
      'Usando un ARG que se imprime con echo dentro del build',
      'Incluyendo el secreto directamente en el .dockerignore',
      'Usando RUN --mount=type=secret de BuildKit',
    ],
    correct: 3,
  },

  // Módulo 8 — Proyecto real: containerizar una aplicación real
  {
    q: 'En la Fase 1 (imagen ingenua) del proyecto, ¿cuáles son los principales problemas identificados?',
    options: [
      'Imagen de 950MB, ejecuta como root y sin .dockerignore',
      'La imagen es demasiado pequeña para producción',
      'No incluye HEALTHCHECK ni EXPOSE',
      'Usa multi-stage pero de forma incorrecta',
    ],
    correct: 0,
  },
  {
    q: 'Después de aplicar multi-stage con node:20-alpine en el proyecto, ¿qué reducción de tamaño se obtiene aproximadamente?',
    options: [
      'De 118MB a 950MB',
      'De 950MB a unos 118MB',
      'Ningún cambio relevante en el tamaño',
      'Se duplica el tamaño por las dos etapas',
    ],
    correct: 1,
  },
  {
    q: 'En la Fase 3 del proyecto, ¿por qué PostgreSQL no se publica con -p hacia el host?',
    options: [
      'Porque PostgreSQL no soporta redes personalizadas',
      'Porque los named volumes lo impiden',
      'Para que quede aislado y solo accesible desde los contenedores de la misma red',
      'Porque el puerto 5432 está reservado por el sistema',
    ],
    correct: 2,
  },
  {
    q: 'En la Fase 4 de hardening, ¿por qué no se agrega ninguna capability con --cap-add en el contenedor de la API?',
    options: [
      'Porque siempre se necesita CAP_NET_ADMIN para APIs REST',
      'Porque las capabilities están deshabilitadas en modo rootless',
      'Porque el contenedor corre como root de todas formas',
      'Porque el puerto 3000 no requiere ninguna capability especial',
    ],
    correct: 3,
  },
  {
    q: 'Si la aplicación falla al escribir en /tmp tras aplicar --read-only, ¿cuál es la solución sin quitar --read-only?',
    options: [
      'Agregar --tmpfs /tmp:rw,noexec,nosuid al docker run',
      'Agregar --privileged al comando',
      'Cambiar la imagen base a distroless',
      'Eliminar el HEALTHCHECK del Dockerfile',
    ],
    correct: 0,
  },
  {
    q: 'Para que PostgreSQL sea accesible desde herramientas externas como DBeaver solo en tu máquina, pero no desde la red, ¿qué flag agregas?',
    options: [
      '--network none',
      '--publish 127.0.0.1:5432:5432',
      '--cap-add=NET_ADMIN',
      '--restart always',
    ],
    correct: 1,
  },
]

export default exam
