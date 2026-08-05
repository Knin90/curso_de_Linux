const content = `
## Módulo 7 — awk: procesamiento de datos estructurados

### 🎯 Objetivos de aprendizaje

* Entender el modelo de procesamiento de awk: registros, campos y reglas.
* Usar variables internas: NR, NF, FS, OFS.
* Aplicar filtros, cálculos y acumuladores.
* Procesar logs de nginx, /etc/passwd y archivos CSV reales.

### ❓ El problema real

Tienes un log de nginx con 2 millones de líneas y necesitas la suma del tráfico transferido, la IP más frecuente y el tiempo de respuesta promedio. Con grep y cut puedes extraer campos, pero no puedes acumular valores. awk es una mini-lenguaje de programación diseñado exactamente para esto: procesar texto estructurado por campos y hacer cálculos sobre él.

### 📖 Modelo de funcionamiento de awk

\`\`\`text
Para cada línea (registro) del input:
  1. Divide la línea en campos por FS (field separator)
  2. Evalúa cada regla: si el patrón coincide, ejecuta la acción
  3. Continúa con la siguiente línea

Estructura de una regla:
  patrón { acción }

Reglas especiales:
  BEGIN { }    ejecuta antes de leer cualquier línea
  END { }      ejecuta después de procesar todas las líneas
\`\`\`

### 📖 Variables internas fundamentales

\`\`\`text
$0      línea completa
$1      primer campo
$2      segundo campo
$NF     último campo (field number)
$(NF-1) penúltimo campo

NR      número de registro (línea) actual
NF      número de campos en la línea actual
FNR     número de registro en el archivo actual (útil con múltiples archivos)
FS      separador de campo de entrada (default: espacio/tab)
OFS     separador de campo de salida (default: espacio)
RS      separador de registros (default: \\n)
ORS     separador de registros de salida
FILENAME nombre del archivo actual
\`\`\`

### 📖 Uso básico

\`\`\`bash
# Imprimir campo específico (columna 1)
awk '{print $1}' /etc/passwd

# Especificar separador con -F
awk -F: '{print $1}' /etc/passwd           # usuario
awk -F: '{print $1, $3}' /etc/passwd       # usuario y UID

# Imprimir con separador personalizado
awk -F: 'BEGIN{OFS="\\t"} {print $1,$3,$4}' /etc/passwd

# Filtrar: imprimir líneas donde el 3er campo > 1000
awk -F: '$3 > 1000 {print $1, $3}' /etc/passwd

# Patrón de texto (como grep pero con acceso a campos)
awk '/ERROR/ {print NR, $0}' /var/log/syslog
awk '!/^#/ && NF > 0' /etc/hosts           # sin comentarios ni líneas vacías
\`\`\`

### 📖 Acumuladores y cálculos

\`\`\`bash
# Suma de valores en una columna
awk '{sum += $1} END {print sum}' numeros.txt

# Promedio
awk '{sum += $1; count++} END {print sum/count}' numeros.txt

# Máximo y mínimo
awk 'BEGIN{max=0} {if($1>max) max=$1} END{print max}' archivo.txt

# Contar ocurrencias (equivalente a sort | uniq -c pero con más control)
awk '{count[$1]++} END {for(ip in count) print count[ip], ip}' access.log
\`\`\`

### 📖 Procesamiento de logs de nginx

El log de nginx tiene este formato:
\`\`\`text
IP - - [fecha] "MÉTODO /ruta HTTP/1.1" CÓDIGO BYTES "referrer" "user-agent"
\`\`\`

\`\`\`bash
# Top 10 IPs por número de requests
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Total de bytes transferidos (en MB)
awk '{sum += $10} END {printf "%.2f MB\\n", sum/1024/1024}' /var/log/nginx/access.log

# Distribución de códigos HTTP
awk '{codes[$9]++} END {for(c in codes) print codes[c], c}' /var/log/nginx/access.log | sort -rn

# Tiempo promedio de respuesta (si el log incluye $request_time)
awk '{sum += $NF; count++} END {printf "Promedio: %.3fs\\n", sum/count}' /var/log/nginx/access.log

# Requests por hora
awk '{
    match($4, /([0-9]{2}\/[A-Za-z]{3}\/[0-9]{4}:[0-9]{2})/, arr)
    horas[arr[1]]++
} END {
    for(h in horas) print horas[h], h
}' /var/log/nginx/access.log | sort -rn | head -24
\`\`\`

### 📖 Procesamiento de CSV y archivos estructurados

\`\`\`bash
# Leer CSV (nota: awk básico no maneja comillas en campos)
awk -F, 'NR>1 {print $1, $3}' datos.csv    # saltar header, imprimir cols 1 y 3

# Calcular suma de una columna numérica
awk -F, 'NR>1 {sum += $2} END {print "Total:", sum}' ventas.csv

# Filtrar y transformar
awk -F, 'NR>1 && $3 > 100 {printf "%s: %.2f\\n", $1, $3 * 1.21}' precios.csv

# Generar reporte
awk -F, '
BEGIN {
    print "=== REPORTE ==="
    total = 0
}
NR > 1 {
    total += $3
    printf "%-20s %8.2f\\n", $1, $3
}
END {
    printf "%-20s %8.2f\\n", "TOTAL", total
    print "==============="
}' ventas.csv
\`\`\`

### 📖 Transformación de /etc/passwd

\`\`\`bash
# Listar usuarios del sistema con su shell
awk -F: '$3 >= 1000 && $3 != 65534 {printf "%-15s UID=%-6s Shell=%s\\n", $1, $3, $7}' /etc/passwd

# Usuarios con bash
awk -F: '$7 ~ /bash$/ {print $1}' /etc/passwd

# Verificar UIDs duplicados (podría indicar problema de seguridad)
awk -F: '{uids[$3]++} END {for(uid in uids) if(uids[uid]>1) print "UID duplicado:", uid}' /etc/passwd
\`\`\`

### 📖 awk multiline y arrays asociativos

\`\`\`bash
# Reporte de uso de disco por usuario
ls -la /home | awk '
NR > 1 && $3 != "root" {
    usuario[$3] += $5
}
END {
    for (u in usuario) {
        printf "%-15s %10.1f MB\\n", u, usuario[u]/1024/1024
    }
}' | sort -k2 -rn
\`\`\`

### 📋 Lo que debes recordar

* \`awk -F: '{print $1}'\` — el flag \`-F\` define el separador de campo. Esencial para CSV, /etc/passwd, logs con separadores específicos.
* \`BEGIN{}\` y \`END{}\` son los hooks para inicializar y finalizar — los acumuladores van en \`END\`.
* Los arrays asociativos de awk (\`count[$1]++\`) son la forma idiomática de contar/agrupar.
* Para logs complejos, la combinación \`awk | sort | uniq -c | sort -rn | head\` es el patrón más productivo.

### 🧪 Autoevaluación

1. ¿Cómo imprimirías solo las líneas del archivo donde el segundo campo es mayor que 100?
2. ¿Qué hace \`awk 'END{print NR}' archivo\`?
3. Tienes un log con IP en \`$1\` y bytes en \`$10\`. ¿Cómo calculas el total de bytes por IP?

---

1. \`awk '$2 > 100' archivo\` — en awk, un patrón sin acción imprime la línea completa si el patrón es verdadero.
2. Imprime el número total de líneas del archivo. \`NR\` (number of records) se incrementa con cada línea; en \`END{}\` tiene el valor final. Es equivalente a \`wc -l\` pero integrable en pipelines awk más complejos.
3. \`awk '{bytes[$1] += $10} END {for(ip in bytes) print bytes[ip], ip}' log | sort -rn\` — usa un array asociativo indexado por IP para acumular el total de bytes, luego en \`END{}\` itera el array e imprime.
`

export default content
