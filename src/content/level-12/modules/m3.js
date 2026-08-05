const content = `
## Módulo 3 — Funciones, argumentos y scope

### 🎯 Objetivos de aprendizaje

* Definir funciones reutilizables con parámetros y valores de retorno.
* Entender el scope de variables en Bash: \`local\` vs global.
* Validar argumentos del script correctamente.
* Usar arrays en Bash para pasar múltiples valores.

### ❓ El problema real

Tu script de 200 líneas repite la misma lógica de logging en 15 lugares. Cuando necesitas cambiar el formato del log, cambias 15 líneas — y probablemente te olvidas de alguna. Las funciones eliminan la duplicación, pero Bash tiene un scope de variables diferente a otros lenguajes. Entender este scope evita bugs sutiles donde una variable "global" se modifica accidentalmente dentro de una función.

### 📖 Definir funciones

\`\`\`bash
# Sintaxis 1 (POSIX-compatible)
mi_funcion() {
    echo "Hola desde la función"
}

# Sintaxis 2 (Bash keyword)
function mi_funcion {
    echo "Hola desde la función"
}

# Llamar a la función
mi_funcion

# Las funciones deben definirse ANTES de llamarlas
# (o definir todas al inicio del script)
\`\`\`

### 📖 Parámetros de función

Las funciones reciben argumentos igual que el script principal — con \`$1\`, \`$2\`, etc. Dentro de la función, estos son locales a la llamada:

\`\`\`bash
saludar() {
    local nombre="$1"
    local saludo="\${2:-Hola}"    # segundo arg, con default
    echo "$saludo, $nombre!"
}

saludar "María"                    # Hola, María!
saludar "Carlos" "Buenos días"     # Buenos días, Carlos!
\`\`\`

### 📖 Scope con local

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

resultado="global"

procesar() {
    local resultado="local"     # no afecta la variable global
    echo "Dentro: $resultado"   # "local"
}

echo "Antes: $resultado"        # "global"
procesar
echo "Después: $resultado"      # "global" — sin cambios
\`\`\`

Sin \`local\`, las variables de función son globales y pueden causar colisiones:

\`\`\`bash
# PELIGROSO: sin local
buggy() {
    i=100    # sobreescribe la variable del bucle externo
}

for i in 1 2 3; do
    buggy
    echo $i    # siempre imprime 100 — bug silencioso
done
\`\`\`

**Regla:** siempre usar \`local\` para variables dentro de funciones.

### 📖 Valores de retorno

Bash no retorna valores como otros lenguajes — retorna **exit codes** (0-255). Para retornar datos, usa \`echo\` + sustitución de comandos:

\`\`\`bash
# Retornar exit code (0 = éxito, != 0 = error)
es_par() {
    local num="$1"
    (( num % 2 == 0 ))    # exit code 0 si es par, 1 si no
}

if es_par 4; then echo "par"; fi

# Retornar un valor: echo + sustitución de comandos
obtener_fecha() {
    echo "$(date +%Y-%m-%d)"
}

hoy=$(obtener_fecha)
echo "Hoy es: $hoy"

# Retornar múltiples valores con variables globales (o nameref en Bash 4.3+)
obtener_stats() {
    local archivo="$1"
    # Modificar variables del caller (convención: prefijo con nombre de función)
    stats_lineas=$(wc -l < "$archivo")
    stats_bytes=$(stat -c%s "$archivo")
}

obtener_stats "/etc/passwd"
echo "Líneas: $stats_lineas, Bytes: $stats_bytes"
\`\`\`

### 📖 Validación de argumentos

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

# Patrón de validación estándar
usage() {
    echo "Uso: $0 [-v] [-o archivo_salida] archivo_entrada" >&2
    echo "  -v  modo verbose" >&2
    echo "  -o  archivo de salida (default: stdout)" >&2
    exit 1
}

# Verificar número mínimo de argumentos
if [[ $# -lt 1 ]]; then
    echo "Error: se requiere al menos 1 argumento" >&2
    usage
fi

# Procesar flags con getopts
VERBOSE=false
SALIDA=""

while getopts "vo:" opt; do
    case "$opt" in
        v) VERBOSE=true ;;
        o) SALIDA="$OPTARG" ;;
        ?) usage ;;
    esac
done
shift $(( OPTIND - 1 ))    # eliminar las opciones procesadas

# Ahora $1, $2... son los argumentos posicionales restantes
ENTRADA="$1"

[[ -f "$ENTRADA" ]] || { echo "Error: archivo no encontrado: $ENTRADA" >&2; exit 1; }

"$VERBOSE" && echo "Procesando: $ENTRADA"
\`\`\`

### 📖 Arrays en Bash

\`\`\`bash
# Declarar
frutas=("manzana" "banana" "naranja")
declare -a numeros=(1 2 3 4 5)

# Acceder
echo "\${frutas[0]}"          # manzana
echo "\${frutas[-1]}"         # naranja (último, Bash 4.3+)
echo "\${frutas[@]}"          # todos los elementos
echo "\${#frutas[@]}"         # número de elementos

# Agregar
frutas+=("uva")
frutas[4]="pera"

# Iterar (SIEMPRE con "@" entre comillas)
for fruta in "\${frutas[@]}"; do
    echo "  $fruta"
done

# Slice: \${array[@]:inicio:cantidad}
echo "\${frutas[@]:1:2}"      # banana naranja

# Arrays asociativos (diccionarios)
declare -A puertos
puertos["http"]=80
puertos["https"]=443
puertos["ssh"]=22

for servicio in "\${!puertos[@]}"; do
    echo "$servicio → \${puertos[$servicio]}"
done
\`\`\`

### 📖 Patrón de librería: funciones de utilidad reutilizables

\`\`\`bash
#!/usr/bin/env bash
# lib.sh — funciones de utilidad

LOG_LEVEL="\${LOG_LEVEL:-INFO}"

log() {
    local level="$1"
    local msg="$2"
    local ts
    ts=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$ts] [$level] $msg" >&2
}

log_info()  { log "INFO " "$1"; }
log_warn()  { log "WARN " "$1"; }
log_error() { log "ERROR" "$1"; }

die() {
    log_error "$1"
    exit "\${2:-1}"
}

require_command() {
    command -v "$1" &>/dev/null || die "Comando requerido no encontrado: $1"
}

# Uso:
# source ./lib.sh
# require_command jq
# log_info "Iniciando proceso"
\`\`\`

### 📋 Lo que debes recordar

* Siempre \`local\` para variables dentro de funciones — las variables globales accidentales son bugs difíciles de encontrar.
* Retornar datos con \`echo\` + \`$(función)\`, no con \`return\` (que solo maneja exit codes 0-255).
* \`"\${array[@]}"\` (con comillas) es obligatorio para iterar arrays con elementos que contienen espacios.
* Patrón de librería (\`source ./lib.sh\`) permite reutilizar funciones entre scripts sin duplicar código.

### 🧪 Autoevaluación

1. ¿Por qué usar \`local\` dentro de funciones? ¿Qué problema previene?
2. Una función necesita retornar un string. ¿Cómo lo haces en Bash?
3. ¿Cuál es la diferencia entre \`"\${array[@]}"\` y \`"\${array[*]}"\`?

---

1. Sin \`local\`, las variables de la función modifican el scope global del script. Si dos funciones usan una variable con el mismo nombre, o si una función usa el mismo nombre que un bucle en el caller, habrá colisiones silenciosas. \`local\` confina la variable al scope de la función.
2. Con \`echo\` dentro de la función y sustitución de comandos en el caller: \`resultado=$(mi_funcion)\`. Bash no tiene tipos de retorno como otros lenguajes — \`return\` solo puede retornar números 0-255 (exit codes).
3. \`"\${array[@]}"\` expande cada elemento como una palabra separada (preserva espacios dentro de elementos). \`"\${array[*]}"\` une todos los elementos en un único string separado por el primer carácter de \`$IFS\` (normalmente espacio). Para iterar, siempre usar \`[@]\`.
`

export default content
