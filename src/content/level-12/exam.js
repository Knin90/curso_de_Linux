const exam = [
  // Módulo 1 — Fundamentos de Bash: variables, expansión y tipos de datos
  {
    q: '¿Qué hace `set -o pipefail` en un script Bash?',
    options: [
      'Hace que el exit code de un pipe sea distinto de 0 si cualquier comando del pipe falla',
      'Detiene el script si se usa una variable no definida',
      'Aborta el script si cualquier comando individual falla',
      'Activa el modo de depuración mostrando cada comando ejecutado',
    ],
    correct: 0,
  },
  {
    q: '¿Por qué se recomienda `#!/usr/bin/env bash` en vez de `#!/bin/bash` como shebang?',
    options: [
      'Porque activa automáticamente `set -euo pipefail`',
      'Porque usa el bash disponible en el PATH, siendo más portable entre sistemas',
      'Porque ejecuta el script con permisos de administrador',
      'Porque es obligatorio en Bash 5 o superior',
    ],
    correct: 1,
  },
  {
    q: 'Si `var=""`, ¿qué imprime `echo "${var:-valor_default}"`?',
    options: [
      'Una cadena vacía',
      'Un error de sintaxis',
      '"valor_default"',
      'El contenido de la variable `default`',
    ],
    correct: 2,
  },
  {
    q: 'Si `ruta="/var/log/nginx/access.log"`, ¿qué devuelve `${ruta##*/}`?',
    options: [
      '"/var/log/nginx"',
      '"/var/log/nginx/access.log"',
      '"nginx/access.log"',
      '"access.log"',
    ],
    correct: 3,
  },
  {
    q: 'Tienes `archivo="reporte mensual.pdf"`. ¿Cuál es la forma correcta de borrarlo?',
    options: [
      'rm "$archivo"',
      'rm $archivo',
      'rm archivo',
      'rm ${archivo%.pdf}',
    ],
    correct: 0,
  },
  {
    q: '¿Qué representa la variable especial `$?` inmediatamente después de ejecutar un comando?',
    options: [
      'El PID del proceso que se acaba de ejecutar',
      'El exit code del último comando ejecutado',
      'El número total de argumentos recibidos por el script',
      'El nombre del script en ejecución',
    ],
    correct: 1,
  },
  {
    q: '¿Cuál es la diferencia principal entre una variable de shell y una variable de entorno?',
    options: [
      'No hay diferencia, son sinónimos en Bash',
      'Las variables de entorno solo pueden ser numéricas',
      'La variable de entorno (exportada con `export`) es heredada por procesos hijos; la de shell no',
      'Las variables de shell persisten entre sesiones y las de entorno no',
    ],
    correct: 2,
  },

  // Módulo 2 — Control de flujo: condicionales y bucles
  {
    q: '¿Por qué `[[ ]]` es preferible a `[ ]` en scripts Bash modernos?',
    options: [
      '`[ ]` no existe en Bash, solo en sh',
      '`[[ ]]` es más rápido en todos los casos',
      '`[[ ]]` solo funciona con números',
      'Es más seguro (maneja variables vacías sin comillas) y soporta regex con `=~`',
    ],
    correct: 3,
  },
  {
    q: '¿Qué hace la expresión `(( x > 5 ))` en Bash?',
    options: [
      'Evalúa una comparación aritmética entre paréntesis dobles, retornando exit code 0 si es verdadera',
      'Declara una variable numérica llamada x',
      'Ejecuta un subshell con la variable x',
      'Compara cadenas de texto alfabéticamente',
    ],
    correct: 0,
  },
  {
    q: '¿Cuál es el patrón correcto para leer un archivo línea por línea en Bash?',
    options: [
      'for linea in $(cat archivo); do ...; done',
      'while IFS= read -r linea; do ...; done < archivo',
      'while [ archivo ]; do read linea; done',
      'foreach linea in archivo do ... done',
    ],
    correct: 1,
  },
  {
    q: 'En el bucle `until nc -z localhost 5432 2>/dev/null; do sleep 2; done`, ¿qué hace `nc -z`?',
    options: [
      'Envía datos al puerto 5432 en modo texto',
      'Reinicia el servicio que escucha en el puerto 5432',
      'Verifica si el puerto está abierto sin enviar datos (zero-I/O mode)',
      'Cierra cualquier conexión activa en ese puerto',
    ],
    correct: 2,
  },
  {
    q: '¿Qué hace `mkdir -p /tmp/trabajo && cd /tmp/trabajo || exit 1`?',
    options: [
      'Crea el directorio, siempre entra en él y luego siempre sale del script',
      'Ejecuta cd solo si mkdir falla',
      'Ignora errores de mkdir y cd, y continúa el script normalmente',
      'Crea el directorio; si eso y el cd tienen éxito continúa, si algo falla sale con código 1',
    ],
    correct: 3,
  },
  {
    q: '¿Qué construcción de Bash es más adecuada para manejar acciones discretas como `start`, `stop` y `restart`?',
    options: [
      'case "$action" in start) ...;; stop) ...;; esac',
      'Una cadena de comparaciones con `(( ))`',
      'Un bucle `for` sobre las opciones posibles',
      'Un array asociativo con `declare -A`',
    ],
    correct: 0,
  },

  // Módulo 3 — Funciones, argumentos y scope
  {
    q: '¿Por qué se debe usar `local` para las variables dentro de una función Bash?',
    options: [
      'Es obligatorio por sintaxis, sin él la función no compila',
      'Para evitar que la variable modifique accidentalmente el scope global del script',
      'Para que la variable persista después de que la función termine',
      'Para que la variable se exporte automáticamente a procesos hijos',
    ],
    correct: 1,
  },
  {
    q: '¿Cómo se retorna un valor (no solo un exit code) desde una función en Bash?',
    options: [
      'Con la palabra clave `return valor`',
      'Con `yield valor` dentro de la función',
      'Con `echo` dentro de la función y sustitución de comandos al llamarla: `resultado=$(mi_funcion)`',
      'Bash no permite retornar valores de ningún tipo desde funciones',
    ],
    correct: 2,
  },
  {
    q: '¿Qué hace `getopts "vo:" opt` dentro de un bucle `while`?',
    options: [
      'Define dos variables globales llamadas v y o',
      'Procesa las opciones de línea de comandos del script, aquí `-v` (flag) y `-o` (requiere argumento)',
      'Valida que existan exactamente 2 argumentos posicionales',
      'Ejecuta el script en modo verbose automáticamente',
    ],
    correct: 1,
  },
  {
    q: '¿Cuál es la diferencia entre `"${array[@]}"` y `"${array[*]}"` al iterar un array?',
    options: [
      '`[@]` expande cada elemento como palabra separada (preserva espacios); `[*]` los une en un solo string con $IFS',
      'No hay diferencia práctica entre ambas formas',
      '`[*]` es más rápido y siempre se prefiere para iterar',
      '`[@]` solo funciona con arrays asociativos',
    ],
    correct: 0,
  },
  {
    q: 'Si una función `es_par` usa solo `(( num % 2 == 0 ))` sin ningún `echo`, ¿qué produce `es_par 4` si se llama directamente (sin capturar salida)?',
    options: [
      'Imprime "4" en pantalla',
      'No imprime nada, pero retorna el exit code 0 (éxito) usable en un `if`',
      'Genera un error porque falta el `echo`',
      'Imprime "true" en pantalla',
    ],
    correct: 1,
  },
  {
    q: '¿Para qué sirve `shift $(( OPTIND - 1 ))` después de procesar opciones con `getopts`?',
    options: [
      'Reinicia el contador de argumentos a cero',
      'Elimina el primer argumento del array de opciones ya procesado',
      'Descarta las opciones ya procesadas para que $1, $2... sean los argumentos posicionales restantes',
      'Cambia el orden de los argumentos posicionales',
    ],
    correct: 2,
  },

  // Módulo 4 — Manejo de errores y scripts robustos
  {
    q: '¿Qué garantiza `trap cleanup EXIT` en un script que crea archivos temporales?',
    options: [
      'Que cleanup se ejecute únicamente si el script termina con error',
      'Que cleanup se ejecute solo si se recibe Ctrl+C',
      'Que los archivos temporales se creen automáticamente en /tmp',
      'Que cleanup() se ejecute sin importar cómo termine el script (éxito, error o señal)',
    ],
    correct: 3,
  },
  {
    q: 'Por convención en exit codes de Unix, ¿qué código suele indicar "comando no encontrado"?',
    options: [
      '127',
      '0',
      '1',
      '2',
    ],
    correct: 0,
  },
  {
    q: '¿Qué logra el patrón `comando || die "mensaje descriptivo"`?',
    options: [
      'Ejecuta die siempre, sin importar si comando tuvo éxito',
      'Si comando falla, ejecuta die con un mensaje claro en lugar de que set -e aborte sin contexto',
      'Ignora cualquier error de comando y continúa silenciosamente',
      'Reintenta comando hasta que tenga éxito',
    ],
    correct: 1,
  },
  {
    q: '¿Cómo se hace idempotente la creación de un usuario del sistema en un script?',
    options: [
      'Ejecutando siempre `useradd` sin verificar nada antes',
      'Usando `rm -rf` sobre el home antes de crear el usuario',
      'Comprobando primero con `id "$USUARIO" &>/dev/null` si ya existe antes de crearlo',
      'Creando el usuario dentro de un bucle `while true`',
    ],
    correct: 2,
  },
  {
    q: '¿Para qué sirve ejecutar `bash -x script.sh`?',
    options: [
      'Para ejecutar el script en segundo plano',
      'Para validar la sintaxis sin ejecutar comandos',
      'Para forzar que el script se ejecute como root',
      'Para mostrar cada comando (con expansiones) antes de ejecutarlo, útil para depurar',
    ],
    correct: 3,
  },
  {
    q: '¿Cuál es la diferencia entre `trap cleanup EXIT` y `trap cleanup ERR`?',
    options: [
      'EXIT se dispara siempre que el script termina (éxito, error o señal); ERR solo cuando un comando falla',
      'ERR se dispara siempre y EXIT solo en caso de error',
      'Son exactamente equivalentes en Bash',
      'EXIT solo funciona dentro de funciones, ERR solo en el script principal',
    ],
    correct: 0,
  },

  // Módulo 5 — Pipes, redirección y procesamiento de streams
  {
    q: '¿Qué hace `comando > salida.txt 2>&1`?',
    options: [
      'Envía stderr a la terminal y stdout al archivo',
      'Redirige stdout al archivo, y luego stderr al mismo destino que stdout (el archivo)',
      'Duplica la salida en dos archivos distintos',
      'Descarta tanto stdout como stderr',
    ],
    correct: 1,
  },
  {
    q: '¿Para qué sirve el comando `tee` en un pipeline?',
    options: [
      'Para eliminar líneas duplicadas de la salida',
      'Para ordenar el contenido antes de pasarlo al siguiente comando',
      'Para bifurcar el stream: mostrarlo en pantalla y guardarlo en un archivo simultáneamente',
      'Para convertir stdout en stdin de otro proceso',
    ],
    correct: 2,
  },
  {
    q: '¿Qué logra `find /tmp -name "*.tmp" -print0 | xargs -0 rm`?',
    options: [
      'Cuenta cuántos archivos .tmp existen sin borrarlos',
      'Borra solo el primer archivo .tmp encontrado',
      'Falla si hay más de un archivo .tmp',
      'Borra archivos .tmp incluyendo aquellos cuyos nombres contienen espacios, usando delimitador nulo',
    ],
    correct: 3,
  },
  {
    q: '¿Qué permite `diff <(ls dir1) <(ls dir2)`?',
    options: [
      'Comparar la salida de dos comandos como si fueran archivos, sin crear archivos temporales',
      'Combinar el contenido de dir1 y dir2 en un solo directorio',
      'Listar solo los archivos que están en ambos directorios',
      'Eliminar los archivos que difieren entre los dos directorios',
    ],
    correct: 0,
  },
  {
    q: '¿Qué hace el flag `-P4` en `cat urls.txt | xargs -P4 -I{} curl -O {}`?',
    options: [
      'Limita la descarga a los primeros 4 archivos de la lista',
      'Ejecuta hasta 4 procesos curl en paralelo',
      'Reintenta cada descarga 4 veces si falla',
      'Establece un timeout de 4 segundos por descarga',
    ],
    correct: 1,
  },
  {
    q: '¿Para qué sirve un here-doc con delimitador entrecomillado, como `<< \'EOF\'`?',
    options: [
      'Para que el here-doc se ejecute como un script separado',
      'Para forzar que todo el contenido se convierta a mayúsculas',
      'Para que Bash NO expanda variables ni sustituciones de comando dentro del bloque',
      'Para leer el here-doc desde un archivo externo',
    ],
    correct: 2,
  },

  // Módulo 6 — sed: edición de streams de texto
  {
    q: '¿Qué hace `sed -i.bak \'s/foo/bar/\' archivo`?',
    options: [
      'Muestra el resultado en pantalla sin modificar el archivo',
      'Falla porque `.bak` no es una opción válida',
      'Elimina el archivo original después de la sustitución',
      'Modifica el archivo in-place y guarda una copia de seguridad con extensión .bak',
    ],
    correct: 3,
  },
  {
    q: '¿Qué hace `sed \'/^#/d\' archivo`?',
    options: [
      'Cuenta cuántas líneas comienzan con #',
      'Elimina todas las líneas que NO comienzan con #',
      'Reemplaza # por un espacio en cada línea',
      'Elimina todas las líneas que comienzan con #',
    ],
    correct: 3,
  },
  {
    q: '¿Qué hace el flag `g` en `sed \'s/a/b/g\' archivo`?',
    options: [
      'Aplica la sustitución solo en la primera línea del archivo',
      'Reemplaza todas las ocurrencias de "a" por "b" en cada línea, no solo la primera',
      'Hace la búsqueda case-insensitive',
      'Genera un archivo de backup automáticamente',
    ],
    correct: 1,
  },
  {
    q: '¿A qué líneas afecta `sed \'2,5s/foo/bar/\' archivo`?',
    options: [
      'Solo a la línea 2',
      'A todas las líneas excepto la 2 y la 5',
      'A las líneas de la 2 a la 5 inclusive',
      'A todas las líneas del archivo',
    ],
    correct: 2,
  },
  {
    q: '¿Qué separador alternativo conviene usar en sed al trabajar con rutas de archivos como `/var/log`?',
    options: [
      'Un espacio como separador',
      'Un punto y coma como separador',
      'Una coma sin escapar los slashes',
      'Un carácter como `|`, por ejemplo `sed \'s|/var/log|/data/logs|g\'`, para no escapar las barras',
    ],
    correct: 3,
  },
  {
    q: '¿Qué logra `sed -i \'s/^#\\(ServerName\\)/\\1/\' archivo`?',
    options: [
      'Descomenta (activa) una directiva ServerName que estaba comentada con #',
      'Comenta la línea que contiene ServerName',
      'Elimina completamente la línea ServerName',
      'Duplica la línea ServerName sin el símbolo #',
    ],
    correct: 0,
  },

  // Módulo 7 — awk: procesamiento de datos estructurados
  {
    q: '¿Qué hace `awk -F: \'{print $1}\' /etc/passwd`?',
    options: [
      'Cuenta el número total de usuarios',
      'Imprime el primer campo (nombre de usuario) de cada línea, usando : como separador',
      'Imprime el archivo completo sin modificar',
      'Ordena las líneas alfabéticamente',
    ],
    correct: 1,
  },
  {
    q: '¿Qué representa la variable `NR` en awk?',
    options: [
      'El número de campos de la línea actual',
      'El nombre del archivo que se está procesando',
      'El número de registro (línea) que se está procesando actualmente',
      'El separador de campos configurado',
    ],
    correct: 2,
  },
  {
    q: '¿Qué hace `awk \'{sum += $1} END {print sum}\' archivo`?',
    options: [
      'Imprime el primer campo de la primera línea',
      'Cuenta el número de líneas del archivo',
      'Imprime cada valor del primer campo por separado',
      'Acumula los valores del primer campo de todas las líneas y muestra la suma total al final',
    ],
    correct: 3,
  },
  {
    q: '¿Qué hace `awk -F: \'$3 > 1000 {print $1}\' /etc/passwd`?',
    options: [
      'Imprime el nombre de usuario de las cuentas cuyo UID (tercer campo) supera 1000',
      'Imprime todas las líneas del archivo sin filtrar',
      'Cuenta cuántos campos tiene cada línea',
      'Ordena los usuarios por UID descendente',
    ],
    correct: 0,
  },
  {
    q: '¿Cuál es la forma idiomática en awk para contar ocurrencias agrupadas por una clave (por ejemplo, IP)?',
    options: [
      'Usar un array asociativo como `count[$1]++` y luego iterarlo en `END`',
      'Usar `sort` dentro del bloque BEGIN',
      'Declarar una variable numérica separada por cada clave posible manualmente',
      'No es posible contar agrupado en awk, se necesita `uniq -c`',
    ],
    correct: 0,
  },
  {
    q: '¿Cuál es la diferencia entre los bloques `BEGIN{}` y `END{}` en un programa awk?',
    options: [
      'Ambos se ejecutan una vez por cada línea procesada',
      'BEGIN solo funciona con archivos CSV y END con logs',
      'BEGIN se ejecuta antes de leer cualquier línea (para inicializar); END se ejecuta después de procesar todas las líneas',
      'END se ejecuta antes que BEGIN siempre',
    ],
    correct: 2,
  },

  // Módulo 8 — Proyecto real: kit de scripts de producción
  {
    q: 'En `deploy.sh`, ¿qué mecanismo garantiza que un healthcheck fallido revierta automáticamente al release anterior?',
    options: [
      'Un bucle `while true` que reintenta el healthcheck indefinidamente',
      'La variable `DRY_RUN=true` activada por defecto',
      'Un `case` que evalúa manualmente cada posible error',
      'La combinación de `set -euo pipefail` con `trap \'rollback\' ERR`, que se dispara si el healthcheck falla',
    ],
    correct: 3,
  },
  {
    q: '¿Qué ventaja tiene `backup.sh` al usar `trap cleanup EXIT` en lugar de llamar a `cleanup` al final del script?',
    options: [
      'El directorio temporal se borra siempre, incluso si `pg_dump` falla a mitad de la ejecución',
      'Permite que el script se ejecute más rápido',
      'Evita tener que declarar la variable TMP_DIR',
      'Hace que el script se ejecute en segundo plano automáticamente',
    ],
    correct: 0,
  },
  {
    q: '¿Por qué `analyze-logs.sh` usa `awk \'{print $9}\'` en vez de `grep` para extraer el código HTTP del log de nginx?',
    options: [
      'Porque grep no puede procesar archivos grandes',
      'Porque el código HTTP ocupa una posición de campo fija en el log combinado, y awk lo extrae de forma exacta y rápida',
      'Porque awk es más rápido que grep en todos los casos sin excepción',
      'Porque grep solo funciona con archivos comprimidos',
    ],
    correct: 1,
  },
  {
    q: 'Según el CHECKLIST.md del módulo, ¿qué se debe verificar antes de poner un script en producción?',
    options: [
      'Que el script tenga al menos 100 líneas de código',
      'Que use exclusivamente variables globales sin `local`',
      'Que use `set -euo pipefail`, valide argumentos, entrecomille variables y sea probado en su caso de fallo',
      'Que no tenga ningún comentario para reducir el tamaño del archivo',
    ],
    correct: 2,
  },
  {
    q: '¿Qué logra la línea `find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +"$RETENTION_DAYS" -delete` en `backup.sh`?',
    options: [
      'Comprime todos los backups en uno solo',
      'Crea una copia de cada backup antiguo antes de continuar',
      'Cuenta cuántos backups existen en total',
      'Elimina automáticamente los backups más antiguos que RETENTION_DAYS días (rotación)',
    ],
    correct: 3,
  },
  {
    q: '¿Qué logra el "atomic swap" con `ln -sfn "$RELEASE_DIR" "$DEPLOY_DIR"` en `deploy.sh`?',
    options: [
      'Cambia el symlink de producción al nuevo release de forma instantánea, minimizando el tiempo de corte de servicio',
      'Copia físicamente todos los archivos del release al directorio de producción',
      'Elimina el release anterior antes de activar el nuevo',
      'Reinicia la base de datos junto con la aplicación',
    ],
    correct: 0,
  },
  {
    q: 'En `analyze-logs.sh`, ¿qué mide la expresión `awk \'$9 ~ /^5/ {count++} END {print count+0}\'`?',
    options: [
      'El total de requests procesados en el log',
      'El número de líneas donde el código HTTP (campo 9) comienza con 5, es decir, errores 5xx',
      'El número de IPs distintas que hicieron peticiones',
      'El tamaño total en bytes transferidos',
    ],
    correct: 1,
  },
]

export default exam
