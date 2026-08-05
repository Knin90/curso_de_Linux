const content = `
## Módulo 5 — Pipes, redirección y procesamiento de streams

### 🎯 Objetivos de aprendizaje

* Dominar la redirección de stdin, stdout y stderr.
* Entender cómo funcionan los pipes y por qué son poderosos.
* Usar here-docs y here-strings para entrada inline.
* Aplicar \`tee\`, \`xargs\` y procesamiento paralelo básico.

### ❓ El problema real

Necesitas procesar 10.000 archivos de log, filtrar las líneas con errores, transformar el formato y guardarlo en un archivo nuevo mientras ves el progreso en pantalla. La solución naive es escribir cada paso a un archivo temporal. La solución Unix es un pipe: cada herramienta hace una cosa bien y pasa el resultado a la siguiente, sin archivos temporales, procesando el stream en tiempo real.

### 📖 File descriptors: los tres canales

\`\`\`text
0  stdin   ← entrada estándar (teclado por defecto)
1  stdout  → salida estándar  (terminal por defecto)
2  stderr  → salida de error  (terminal por defecto)
\`\`\`

### 📖 Redirección de salida

\`\`\`bash
# Redirigir stdout a archivo (sobreescribe)
ls -la > listado.txt

# Redirigir stdout a archivo (añadir)
echo "nueva línea" >> log.txt

# Redirigir stderr a archivo
gcc programa.c 2> errores.txt

# Redirigir stdout y stderr al mismo archivo
comando > salida.txt 2>&1
comando &> salida.txt        # forma corta (Bash)

# Descartar salida (blackhole)
comando > /dev/null          # descartar stdout
comando 2> /dev/null         # descartar stderr
comando &> /dev/null         # descartar todo

# Ver stdout Y guardar en archivo simultáneamente
comando | tee salida.txt
comando | tee -a salida.txt  # añadir en lugar de sobreescribir
\`\`\`

### 📖 Redirección de entrada

\`\`\`bash
# Leer stdin desde archivo
sort < nombres.txt

# Here-document: entrada inline multilínea
cat << EOF
Primera línea
Segunda línea
Tercera línea
EOF

# Here-doc con variables expandidas
nombre="Carlos"
cat << EOF
Hola $nombre,
Tu cuenta fue creada el $(date +%Y-%m-%d).
EOF

# Here-doc sin expansión (single quotes en el delimitador)
cat << 'EOF'
Esto no se expande: $HOME \${variable}
EOF

# Here-string: string corto como stdin
grep "patrón" <<< "texto a buscar"
base64 -d <<< "SGVsbG8gV29ybGQ="
\`\`\`

### 📖 Pipes: encadenar comandos

\`\`\`bash
# Pipe básico: stdout de A → stdin de B
cat /etc/passwd | grep "bash"

# Cadena de pipes
cat /var/log/auth.log | grep "Failed" | awk '{print $11}' | sort | uniq -c | sort -rn | head -20

# El mismo comando de forma legible
cat /var/log/auth.log \
    | grep "Failed" \
    | awk '{print $11}' \
    | sort \
    | uniq -c \
    | sort -rn \
    | head -20
\`\`\`

**Pipe nombrado (FIFO):** permite comunicación entre procesos no relacionados:

\`\`\`bash
mkfifo /tmp/mi-pipe
productor > /tmp/mi-pipe &
consumidor < /tmp/mi-pipe
rm /tmp/mi-pipe
\`\`\`

### 📖 Process substitution

Permite usar la salida de un comando como si fuera un archivo:

\`\`\`bash
# diff entre dos comandos (sin archivos temporales)
diff <(ls dir1) <(ls dir2)

# Comparar configuraciones
diff <(ssh servidor1 cat /etc/nginx/nginx.conf) \
     <(ssh servidor2 cat /etc/nginx/nginx.conf)

# Leer múltiples streams simultáneamente
while IFS= read -r linea; do
    echo "Procesando: $linea"
done < <(find /var/log -name "*.log" -newer /tmp/checkpoint)
\`\`\`

### 📖 xargs: construir comandos desde stdin

\`\`\`bash
# Ejecutar un comando por cada línea de stdin
cat archivos.txt | xargs rm

# Con sustitución de argumento (más flexible)
cat servidores.txt | xargs -I{} ssh {} uptime

# Limitar a 1 argumento por ejecución
ls *.log | xargs -n1 gzip

# Ejecución paralela: -P (número de procesos simultáneos)
cat urls.txt | xargs -P4 -I{} curl -O {}

# Manejar nombres con espacios: delimitador nulo
find /tmp -name "*.tmp" -print0 | xargs -0 rm
\`\`\`

### 📖 tee: bifurcar un stream

\`\`\`bash
# Ver stdout Y guardarlo en archivo
make build | tee build.log

# Enviar a múltiples archivos
comando | tee archivo1.log archivo2.log

# Patrón común: guardar log y mostrar errores en terminal
./deploy.sh 2>&1 | tee deploy.log | grep -E "ERROR|WARN"

# tee con process substitution
comando | tee >(gzip > salida.gz) | grep "importante"
\`\`\`

### 📖 Procesamiento eficiente de logs grandes

\`\`\`bash
# Contar IPs únicas en un log de nginx
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20

# Filtrar por rango de tiempo y buscar errores
grep "\\[15/Jan/2024" /var/log/nginx/access.log | grep " 5[0-9][0-9] "

# Procesar archivo gzippeado sin descomprimir
zcat /var/log/nginx/access.log.gz | grep "ERROR" | wc -l

# Procesar múltiples archivos rotados
zcat /var/log/nginx/access.log.gz /var/log/nginx/access.log.1.gz | grep "error"
\`\`\`

### 📋 Lo que debes recordar

* \`2>&1\` redirige stderr (fd 2) al mismo destino que stdout (fd 1). El orden importa: \`> archivo 2>&1\` funciona; \`2>&1 > archivo\` no hace lo que esperas.
* \`| tee archivo\` es el patrón para guardar Y ver simultáneamente — no elegir entre uno u otro.
* \`xargs -P4\` para paralelismo simple es suficiente para la mayoría de tareas de administración.
* \`find -print0 | xargs -0\` es el par correcto para manejar nombres de archivos con espacios.

### 🧪 Autoevaluación

1. ¿Qué diferencia hay entre \`comando > salida.txt 2>&1\` y \`comando 2>&1 > salida.txt\`?
2. Tienes un archivo con 1000 URLs, una por línea. ¿Cómo las descargas todas en paralelo con máximo 8 conexiones simultáneas?
3. ¿Para qué sirve el here-doc con \`<< 'EOF'\` (con comillas en el delimitador)?

---

1. \`> salida.txt 2>&1\`: primero redirige stdout al archivo, luego redirige stderr al mismo destino que stdout (el archivo). Ambos van al archivo. \`2>&1 > salida.txt\`: primero redirige stderr al destino actual de stdout (la terminal), luego redirige stdout al archivo. Resultado: stderr sigue en terminal, solo stdout va al archivo.
2. \`cat urls.txt | xargs -P8 -I{} curl -O {}\` — el flag \`-P8\` lanza hasta 8 procesos \`curl\` en paralelo.
3. Con \`<< 'EOF'\` (comillas simples en el delimitador), Bash NO expande variables ni sustituciones de comando dentro del here-doc. Útil cuando el contenido tiene \`$variables\` o \`\$(comandos)\` que deben llegar literalmente, por ejemplo al generar scripts o templates que contienen código Bash.
`

export default content
