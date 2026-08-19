const content = `
## Módulo 2 — La Shell y Redirección de Descriptores (0, 1, 2)

### 🎯 Objetivos de aprendizaje

* Dominar el flujo de datos basado en los 3 Descriptores de Archivo Estándar (*File Descriptors*).
* Redirigir salidas estándar y salidas de error hacia archivos o nulos de forma independiente o combinada.
* Conectar comandos mediante tuberías (*Pipes*) para procesar datos en cadena.

### ❓ Problema real que resuelve

Al ejecutar un script de automatización que procesa miles de archivos, los mensajes de error intermedios pueden contaminar la salida limpia. Saber separar el resultado correcto de los errores es indispensable para guardar reportes válidos y depurar fallos.

### 📖 Explicación técnica: Los 3 Descriptores Estándar

En Unix/Linux, **todo es un archivo**. Cuando la Shell ejecuta un comando, abre automáticamente tres flujos de datos identificados con números enteros:

\`\`\`diagram
{"type":"tree","root":{"name":"stdin (FD 0)","meta":"entrada estándar - teclado"},"children":[{"name":"COMANDO / PROCESO","edgeLabel":"entrada","focal":true,"children":[{"name":"stdout (FD 1)","meta":"salida estándar - resultados","edgeLabel":"resultado"},{"name":"stderr (FD 2)","meta":"salida de errores","edgeLabel":"error"}]}]}
\`\`\`

| Descriptor | Nombre técnico | ID numérico | Dispositivo por defecto | Propósito |
| --- | --- | --- | --- | --- |
| **stdin** | Standard Input | \`0\` | Teclado (\`/dev/tty\`) | Fuente de datos de entrada para el comando. |
| **stdout** | Standard Output | \`1\` | Pantalla (\`/dev/tty\`) | Salida normal de resultados exitosos del comando. |
| **stderr** | Standard Error | \`2\` | Pantalla (\`/dev/tty\`) | Mensajes de error, advertencias y depuración. |

### ⚙️ Operadores de Redirección y Pipes

* **\`>\` (Sobrescribir stdout):** Redirige FD 1 a un archivo (si existe, borra su contenido previo).
* **\`>>\` (Añadir a stdout):** Redirige FD 1 al final de un archivo sin borrar el contenido existente.
* **\`2>\` (Redirigir stderr):** Redirige FD 2 (los errores) a un archivo o destino específico.
* **\`2>&1\` o \`&>\` (Redirigir stdout + stderr):** Une la salida de error con la salida estándar.
* **\`|\` (Pipe / Tubería):** Conecta la salida estándar (FD 1) del comando izquierdo con la entrada estándar (FD 0) del comando derecho.

### 💻 Ejemplos prácticos

#### 1. Buscar archivos ocultando todos los mensajes de "Permiso Denegado":

\`\`\`bash
find /etc -name "*.conf" 2> /dev/null
\`\`\`

*(Los errores dirigidos a \`/dev/null\` son descartados por el sistema).*

#### 2. Guardar el resultado de un comando y sus errores en el mismo log:

\`\`\`bash
sudo apt update > actualizacion.log 2>&1
# O en sintaxis moderna de Bash:
sudo apt update &> actualizacion.log
\`\`\`

#### 3. Procesamiento en cadena con Pipes:

\`\`\`bash
cat /var/log/syslog | grep -i "error" | awk '{print \$1, \$2, \$5}' | head -n 10
\`\`\`

#### 4. Duplicar la salida: Guardar en archivo Y ver en pantalla:

\`\`\`bash
ping 8.8.8.8 | tee ping_results.txt
\`\`\`

### 🏢 Caso de uso profesional

En tareas cronometriadas (*Cron Jobs*), los administradores silencian stdout pero capturan stderr:

\`0 2 * * * /scripts/backup.sh > /var/log/backup.log 2> /var/log/backup.err\`

### 📋 Lo que debes recordar

* **Qué hace:** Dirige el flujo de entrada, salida y errores de cualquier comando o script.
* **Descriptores:** \`0\` = Entrada teclado, \`1\` = Salida normal, \`2\` = Salida de errores.
* **Símbolos clave:** \`>\` (guardar stdout), \`2>\` (guardar errores), \`&>\` (guardar todo), \`|\` (conectar comandos).

### 🧪 Autoevaluación rápida

1. ¿Qué número de descriptor representa la salida de errores (\`stderr\`) en Linux?
2. ¿Qué diferencia existe entre utilizar el operador \`>\` y el operador \`>>\`?
3. ¿Cómo rediriges los errores de un comando para que se descarten por completo?

---

1. El descriptor número **\`2\`**.
2. **\`>\`** sobrescribe el archivo de destino; **\`>>\`** concatena los datos al final sin borrar lo anterior.
3. Redirigiendo el descriptor 2 al dispositivo nulo: **\`2> /dev/null\`**.
`
export default content
