const content = `
## Módulo 1 — Fundamentos de Bash: variables, expansión y tipos de datos

### 🎯 Objetivos de aprendizaje

* Entender cómo Bash maneja variables y por qué las comillas importan.
* Dominar los tipos de expansión: variable, aritmética, de comandos y de parámetros.
* Conocer las variables especiales del shell.
* Escribir la primera línea de todo script de producción correctamente.

### ❓ El problema real

Escribes un script que funciona en tu máquina pero rompe en producción porque un nombre de archivo tiene un espacio. O tu script borra archivos incorrectos porque una variable vacía se expande a nada y el comando se ejecuta sin el argumento esperado. Bash tiene reglas de expansión específicas — entenderlas es la diferencia entre un script confiable y uno que hace daño silencioso.

### 📖 El shebang y opciones de seguridad

Todo script de producción comienza igual:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail
\`\`\`

\`\`\`text
#!/usr/bin/env bash
  → Usa el bash del PATH (portable entre sistemas)
  → No hardcodear #!/bin/bash que puede no existir

set -e   (errexit)   → Abortar si cualquier comando falla (exit code != 0)
set -u   (nounset)   → Error si se usa variable no definida
set -o pipefail      → Fallo de pipe = fallo del comando completo
                       (sin esto: false | true → exit 0, el error se oculta)
\`\`\`

Ejemplo de por qué importa \`pipefail\`:

\`\`\`bash
# Sin pipefail: este comando "tiene éxito" aunque grep falle
grep "usuario" /etc/nonexistent | wc -l
echo $?   # 0 — el error se perdió

# Con set -o pipefail:
set -o pipefail
grep "usuario" /etc/nonexistent | wc -l
echo $?   # 2 — el error del grep se propaga
\`\`\`

### 📖 Variables: declaración y reglas de comillas

\`\`\`bash
# Declarar (sin espacios alrededor del =)
nombre="Juan García"
edad=30
ruta="/var/log/app"

# MAL: Bash interpreta esto como comando "nombre" con argumento "=Juan"
nombre = "Juan"   # ERROR

# Acceder
echo $nombre
echo "$nombre"     # SIEMPRE usar comillas dobles
echo "\${nombre}"   # forma explícita, necesaria en algunos contextos
\`\`\`

**La regla de oro:** siempre entrecomillar las variables con \`"$var"\`.

\`\`\`bash
archivo="mi archivo con espacios.txt"

# MAL: Bash divide en palabras → trata como 4 argumentos
rm $archivo        # → rm: cannot remove 'mi': No such file...

# BIEN: las comillas preservan el valor como una unidad
rm "$archivo"
\`\`\`

### 📖 Tipos de expansión

**1. Expansión de variables:**

\`\`\`bash
nombre="mundo"
echo "Hola $nombre"         # Hola mundo
echo "Hola \${nombre}!"     # Hola mundo! (delimita el nombre de la var)
\`\`\`

**2. Expansión aritmética:**

\`\`\`bash
a=5
b=3
echo $(( a + b ))          # 8
echo $(( a * b ))          # 15
echo $(( a % b ))          # 2 (módulo)
echo $(( a ** 2 ))         # 25 (potencia)

# Asignar resultado
resultado=$(( a + b ))
\`\`\`

**3. Sustitución de comandos:**

\`\`\`bash
# Capturar salida de un comando
fecha=$(date +%Y-%m-%d)
usuario=$(whoami)
lineas=$(wc -l < /etc/passwd)

echo "Fecha: $fecha, Usuario: $usuario, Líneas: $lineas"
\`\`\`

**4. Expansión de parámetros (las más útiles):**

\`\`\`bash
var="hola mundo"

# Valor por defecto si var está vacía o no definida
echo "\${var:-valor_default}"     # "hola mundo" (var tiene valor)
var=""
echo "\${var:-valor_default}"     # "valor_default"

# Longitud de la cadena
echo "\${#var}"                   # 10

# Subcadena: \${var:posición:longitud}
echo "\${var:0:4}"                # "hola"
echo "\${var:5}"                  # "mundo"

# Eliminar prefijo
ruta="/var/log/nginx/access.log"
echo "\${ruta##*/}"               # "access.log" (elimina hasta el último /)
echo "\${ruta%/*}"                # "/var/log/nginx" (elimina desde el último /)

# Reemplazar
echo "\${var/hola/buenos días}"   # "buenos días mundo"
echo "\${var//o/0}"               # "h0la mund0" (todas las ocurrencias)

# Mayúsculas/minúsculas (Bash 4+)
echo "\${var^^}"                  # "HOLA MUNDO"
echo "\${var,,}"                  # "hola mundo"
\`\`\`

### 📖 Variables especiales

\`\`\`bash
$0    # nombre del script
$1    # primer argumento
$2    # segundo argumento
$@    # todos los argumentos (lista, respeta comillas)
$*    # todos los argumentos (string único)
$#    # número de argumentos
$?    # exit code del último comando
$$    # PID del proceso actual (útil para archivos temporales)
$!    # PID del último proceso en background

# Ejemplo de uso
echo "Script: $0"
echo "Args: $#"
echo "Primer arg: $1"
echo "Todos: $@"
echo "Mi PID: $$"

# Archivo temporal seguro
tmp="/tmp/mi-script-$$"
\`\`\`

### 📖 Variables de entorno vs variables de shell

\`\`\`bash
# Variable de shell (solo disponible en este proceso)
mi_var="local"

# Variable de entorno (heredada por procesos hijos)
export MI_VAR="global"
export PATH="$PATH:/usr/local/mi-app/bin"

# Ver todas las variables de entorno
env
printenv

# Variable de solo lectura
readonly CONSTANTE="no se puede cambiar"

# Eliminar una variable
unset mi_var
\`\`\`

### 📋 Lo que debes recordar

* Siempre \`set -euo pipefail\` al inicio de scripts de producción.
* Siempre entrecomillar variables: \`"$var"\` nunca \`$var\` en contextos de filesystem.
* \`\${var:-default}\` es el patrón para valores por defecto — muy usado en scripts reales.
* \`$?\` vale 0 si el último comando tuvo éxito, cualquier otro número si falló.

### 🧪 Autoevaluación

1. ¿Por qué \`set -o pipefail\` es importante? Da un ejemplo donde sin él se oculta un error.
2. Tienes \`archivo="reporte mensual.pdf"\`. ¿Qué pasa si haces \`cp $archivo /backup/\` sin comillas?
3. ¿Qué devuelve \`\${ruta##*/}\` si \`ruta="/etc/nginx/nginx.conf"\`?

---

1. Sin \`pipefail\`, el exit code de un pipe es el del último comando. \`comando_que_falla | grep algo\` retorna 0 si grep tiene éxito, ocultando que el primer comando falló. Con \`set -euo pipefail\`, si cualquier comando del pipe falla, el pipe entero falla y (con \`-e\`) el script aborta.
2. Bash divide por espacios: \`cp reporte mensual.pdf /backup/\` — tres argumentos. cp intenta copiar "reporte" y "mensual.pdf" a "/backup/", falla porque "reporte" no existe como archivo.
3. \`nginx.conf\` — \`##*/\` elimina el prefijo más largo que termina en \`/\`, dejando solo el nombre del archivo.
`

export default content
