const content = `
## Módulo 2 — Control de flujo: condicionales y bucles

### 🎯 Objetivos de aprendizaje

* Dominar la sintaxis de \`if\`, \`case\` y los operadores de comparación.
* Entender la diferencia entre \`[ ]\`, \`[[ ]]\` y \`(( ))\`.
* Escribir bucles \`for\`, \`while\` y \`until\` correctamente.
* Usar \`break\`, \`continue\` y bucles sobre archivos y arrays.

### ❓ El problema real

Tu script necesita comportarse diferente según si un servicio está corriendo, si un archivo existe o si un número supera un umbral. Sin control de flujo, un script es una secuencia lineal frágil. Con control de flujo bien escrito, se adapta a cualquier estado del sistema — eso es lo que distingue un script de juguete de uno de producción.

### 📖 Condicionales: if/elif/else

\`\`\`bash
# Forma básica
if [ condición ]; then
    # comandos
elif [ otra_condición ]; then
    # comandos
else
    # comandos
fi

# Ejemplo real
if [ -f "/etc/nginx/nginx.conf" ]; then
    echo "nginx está instalado"
else
    echo "nginx no encontrado"
fi
\`\`\`

### 📖 Tipos de brackets: [ ], [[ ]] y (( ))

\`\`\`text
[ ]      test POSIX. Compatible con sh. Más limitado.
[[ ]]    test extendido de Bash. Más potente y seguro.
(( ))    aritmética entera. Solo para números.
\`\`\`

**Diferencias clave:**

\`\`\`bash
# [[ ]] no necesita comillas para variables (más seguro)
var=""
if [ $var = "hola" ]; then   # ERROR si var está vacía: [ = "hola" ]
if [[ $var = "hola" ]]; then # OK: Bash lo maneja correctamente

# [[ ]] soporta regex con =~
if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$ ]]; then
    echo "Email válido"
fi

# [[ ]] soporta && y || dentro del test
if [[ -f "$archivo" && -r "$archivo" ]]; then
    echo "archivo existe y es legible"
fi

# (( )) para aritmética
x=10
if (( x > 5 )); then
    echo "x es mayor que 5"
fi
if (( x % 2 == 0 )); then
    echo "x es par"
fi
\`\`\`

### 📖 Operadores de comparación

\`\`\`text
STRINGS (en [ ] o [[ ]])
────────────────────────────────────────────────────
=  o  ==    igual
!=          distinto
-z          cadena vacía (zero length)
-n          cadena no vacía (non-zero)
<           menor alfabéticamente (en [[ ]] sin escape)
>           mayor alfabéticamente

NÚMEROS (en [ ] o [[ ]])
────────────────────────────────────────────────────
-eq         igual (equal)
-ne         distinto (not equal)
-lt         menor que (less than)
-le         menor o igual (less or equal)
-gt         mayor que (greater than)
-ge         mayor o igual (greater or equal)

ARCHIVOS
────────────────────────────────────────────────────
-f archivo  existe y es fichero regular
-d archivo  existe y es directorio
-e archivo  existe (cualquier tipo)
-r archivo  existe y es legible (readable)
-w archivo  existe y es escribible (writable)
-x archivo  existe y es ejecutable
-s archivo  existe y tiene tamaño > 0
-L archivo  es un enlace simbólico (symlink)
f1 -nt f2   f1 es más nuevo que f2 (newer than)
f1 -ot f2   f1 es más antiguo que f2 (older than)
\`\`\`

### 📖 case: alternativa limpia al if-elif-elif

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

action="\${1:-}"

case "$action" in
    start)
        echo "Iniciando servicio..."
        systemctl start nginx
        ;;
    stop)
        echo "Deteniendo servicio..."
        systemctl stop nginx
        ;;
    restart|reload)
        echo "Reiniciando servicio..."
        systemctl restart nginx
        ;;
    status)
        systemctl status nginx
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|reload|status}" >&2
        exit 1
        ;;
esac
\`\`\`

### 📖 Bucle for

\`\`\`bash
# Iterar sobre una lista
for fruta in manzana banana naranja; do
    echo "Fruta: $fruta"
done

# Iterar sobre archivos
for archivo in /var/log/*.log; do
    echo "Procesando: $archivo"
    wc -l "$archivo"
done

# Rango numérico
for i in $(seq 1 10); do
    echo "Iteración $i"
done

# Sintaxis de C (Bash 4+)
for (( i=0; i<10; i++ )); do
    echo "i = $i"
done

# Iterar sobre un array
servidores=("web01" "web02" "db01" "cache01")
for servidor in "\${servidores[@]}"; do
    echo "Conectando a $servidor..."
    ssh "$servidor" uptime
done
\`\`\`

### 📖 Bucles while y until

\`\`\`bash
# while: ejecutar mientras la condición sea verdadera
contador=0
while (( contador < 5 )); do
    echo "Contador: $contador"
    (( contador++ ))
done

# Leer líneas de un archivo (patrón fundamental)
while IFS= read -r linea; do
    echo "Línea: $linea"
done < /etc/hosts

# until: ejecutar mientras la condición sea falsa
# Esperar hasta que un servicio esté disponible
until nc -z localhost 5432 2>/dev/null; do
    echo "Esperando PostgreSQL..."
    sleep 2
done
echo "PostgreSQL disponible"

# while true con break
while true; do
    if [ -f "/tmp/stop" ]; then
        echo "Señal de parada recibida"
        break
    fi
    echo "Trabajando..."
    sleep 5
done
\`\`\`

### 📖 Operadores cortos: && y ||

\`\`\`bash
# && = ejecutar segundo comando solo si el primero tuvo éxito
mkdir -p /tmp/backups && echo "Directorio creado"
systemctl start nginx && echo "nginx iniciado"

# || = ejecutar segundo comando solo si el primero falló
systemctl start nginx || echo "Error: nginx no pudo iniciar" >&2

# Patrón común: exit con mensaje de error
[ -f "$config" ] || { echo "Config no encontrada: $config" >&2; exit 1; }

# Combinar
mkdir -p /tmp/trabajo && cd /tmp/trabajo || exit 1
\`\`\`

### 📋 Lo que debes recordar

* Usar \`[[ ]]\` en lugar de \`[ ]\` en scripts Bash — es más seguro y potente.
* \`(( ))\` para aritmética: \`(( x > 5 ))\` es más legible que \`[ "$x" -gt 5 ]\`.
* \`while IFS= read -r linea\` es el patrón correcto para leer un archivo línea a línea.
* \`|| { echo "error" >&2; exit 1; }\` es el patrón para abortar con mensaje de error en una línea.

### 🧪 Autoevaluación

1. ¿Por qué \`[[ $var = "hola" ]]\` es más seguro que \`[ $var = "hola" ]\` cuando \`var\` puede estar vacía?
2. Escribe un bucle que imprima solo los archivos .conf en /etc que sean legibles.
3. ¿Qué hace \`nc -z localhost 5432\` en el bucle \`until\` del ejemplo?

---

1. Con \`[ ]\`, si \`var\` está vacía, el test se convierte en \`[ = "hola" ]\` que es un error de sintaxis. Con \`[[ ]]\`, Bash trata la variable vacía correctamente como cadena vacía y evalúa \`[[ "" = "hola" ]]\` → false, sin error.
2. \`for f in /etc/*.conf; do [[ -r "$f" ]] && echo "$f"; done\`
3. \`nc -z\` (netcat zero-I/O mode) intenta conectar al puerto sin enviar datos — solo verifica si el puerto está abierto. Devuelve 0 (éxito) si hay algo escuchando en localhost:5432, que es la condición de salida del bucle \`until\`.
`

export default content
