const content = `
## Módulo 6 — sed: edición de streams de texto

### 🎯 Objetivos de aprendizaje

* Usar sed para sustitución, borrado e inserción de líneas.
* Entender las expresiones regulares básicas y extendidas en sed.
* Aplicar sed para transformar archivos de configuración.
* Combinar sed con pipes para procesamiento de logs.

### ❓ El problema real

Necesitas cambiar la URL de la base de datos en 20 archivos de configuración, o eliminar comentarios de un archivo, o transformar el formato de fechas en un log. Abrir cada archivo a mano es costoso y propenso a errores. sed procesa streams de texto con expresiones regulares — es la herramienta estándar para transformación de texto en scripts de automatización.

### 📖 Modelo de funcionamiento de sed

\`\`\`text
Para cada línea del input:
  1. Lee la línea en el "pattern space"
  2. Aplica todos los comandos sed en orden
  3. Imprime el pattern space (a menos que sea -n)
  4. Repite con la siguiente línea
\`\`\`

\`\`\`bash
# Forma básica
sed 'comando' archivo

# Múltiples comandos
sed -e 'comando1' -e 'comando2' archivo

# Desde un script
sed -f script.sed archivo

# Edición in-place (modifica el archivo)
sed -i 'comando' archivo
sed -i.bak 'comando' archivo    # con backup .bak
\`\`\`

### 📖 Sustitución: el comando más usado

\`\`\`bash
# Sustituir primera ocurrencia por línea
sed 's/antiguo/nuevo/' archivo

# Sustituir TODAS las ocurrencias (flag g = global)
sed 's/antiguo/nuevo/g' archivo

# Case-insensitive (flag i)
sed 's/error/ERROR/gi' archivo

# Separador alternativo (útil con paths)
sed 's|/var/log|/data/logs|g' archivo
sed 's,/etc/nginx,/usr/local/nginx,g' archivo

# Referenciar el match completo con &
sed 's/[0-9]\+/[&]/g' archivo     # rodea números con corchetes
# "Puerto 80 disponible" → "Puerto [80] disponible"

# Grupos de captura con \\1, \\2
sed 's/\\([0-9]\\{4\\}\\)-\\([0-9]\\{2\\}\\)-\\([0-9]\\{2\\}\\)/\\3\\/\\2\\/\\1/g' fechas.txt
# 2024-01-15 → 15/01/2024

# Con -E (extended regex): grupos sin escape
sed -E 's/([0-9]{4})-([0-9]{2})-([0-9]{2})/\\3\\/\\2\\/\\1/g' fechas.txt
\`\`\`

### 📖 Selección de líneas (address)

\`\`\`bash
# Aplicar solo en línea N
sed '3s/foo/bar/' archivo          # solo línea 3

# Rango de líneas
sed '2,5s/foo/bar/' archivo        # líneas 2 a 5

# Desde línea N hasta el final
sed '10,$s/foo/bar/' archivo

# Líneas que coinciden con un patrón
sed '/error/s/error/ERROR/g' archivo

# Negar: líneas que NO coinciden
sed '/^#/!s/foo/bar/g' archivo     # todas menos las que empiezan con #

# Entre dos patrones (inclusive)
sed '/START/,/END/s/x/y/g' archivo
\`\`\`

### 📖 Borrado de líneas

\`\`\`bash
# Borrar líneas que coinciden con patrón
sed '/^#/d' archivo                # eliminar comentarios
sed '/^$/d' archivo                # eliminar líneas vacías
sed '/^[[:space:]]*$/d' archivo    # eliminar líneas en blanco (con espacios)

# Borrar rango de líneas
sed '5,10d' archivo

# Borrar líneas que NO coinciden (mantener solo las que coinciden)
sed '/ERROR/!d' archivo

# Combinado: eliminar comentarios y líneas vacías
sed '/^#/d; /^$/d' archivo
\`\`\`

### 📖 Inserción y adición de líneas

\`\`\`bash
# Insertar línea ANTES de la que coincide
sed '/patrón/i\\Nueva línea antes' archivo

# Añadir línea DESPUÉS de la que coincide
sed '/patrón/a\\Nueva línea después' archivo

# Reemplazar línea completa
sed '/patrón/c\\Línea completamente nueva' archivo

# Insertar al inicio del archivo
sed '1i\\# Generado automáticamente' archivo

# Añadir al final del archivo
sed '$a\\# Fin del archivo' archivo
\`\`\`

### 📖 Casos de uso reales

**Cambiar parámetro en archivo de configuración:**

\`\`\`bash
# Cambiar el puerto de nginx
sed -i 's/listen 80/listen 8080/g' /etc/nginx/nginx.conf

# Cambiar host de base de datos
sed -i "s|DB_HOST=.*|DB_HOST=nuevo-servidor.empresa.com|" /etc/app/.env

# Habilitar una directiva comentada
sed -i 's/^#\\(ServerName\\)/\\1/' /etc/apache2/sites-available/default.conf
\`\`\`

**Limpiar output de comandos:**

\`\`\`bash
# Eliminar colores ANSI de output de terminal
sed 's/\\x1b\\[[0-9;]*m//g'

# Extraer solo las IPs de un log (simplificado)
grep "Failed password" /var/log/auth.log | sed 's/.*from \\([0-9.]*\\) .*/\\1/'

# Convertir CSV a TSV
sed 's/,/\\t/g' archivo.csv
\`\`\`

**Transformar archivos de configuración:**

\`\`\`bash
# Reemplazar variables de entorno en template
sed "s/\\\${DB_HOST}/$DB_HOST/g; s/\\\${DB_PORT}/$DB_PORT/g" config.template > config.conf

# Eliminar trailing whitespace
sed 's/[[:space:]]*$//' archivo.conf

# Normalizar line endings (Windows CRLF → Unix LF)
sed 's/\\r//' archivo.txt
\`\`\`

### 📖 sed vs awk: cuándo usar cada uno

\`\`\`text
usa sed cuando:                     usa awk cuando:
──────────────────────────────────  ──────────────────────────────────
sustitución de texto                necesitas columnas/campos
borrar/filtrar líneas               cálculos o acumuladores
transformaciones de formato         condiciones complejas por campo
cambios in-place en archivos        múltiples variables de estado
\`\`\`

### 📋 Lo que debes recordar

* \`sed -i.bak\` es más seguro que \`sed -i\` — siempre deja un backup la primera vez que editas un archivo de producción.
* El separador \`s|...|...|g\` evita escapar slashes cuando trabajas con paths.
* \`sed -E\` activa extended regex — grupos sin escape, \`+\`, \`?\`, \`|\` nativos.
* \`/patrón/!d\` (borrar lo que NO coincide) es equivalente a \`grep patrón\` pero editable en pipe.

### 🧪 Autoevaluación

1. ¿Cómo eliminarías todos los comentarios (líneas que empiezan con #) y líneas vacías de un archivo en una sola llamada a sed?
2. Tienes una línea: \`"server = 192.168.1.10"\`. ¿Cómo cambias la IP a \`"10.0.0.5"\` preservando el resto?
3. ¿Cuál es el riesgo de \`sed -i\` sin extensión de backup?

---

1. \`sed '/^#/d; /^[[:space:]]*$/d' archivo\` — los dos comandos se aplican en secuencia a cada línea. El primero borra las que empiezan con \`#\`, el segundo borra las vacías o solo con espacios.
2. \`sed 's/server = .*/server = 10.0.0.5/' archivo\` — el \`.*\` consume el resto de la línea después de \`= \`. Con captura: \`sed -E 's/(server = )[0-9.]+/\\110.0.0.5/'\`.
3. \`sed -i\` modifica el archivo original en el acto. Si el comando sed tiene un error o la expresión regular es incorrecta, el archivo puede quedar corrupto o vacío sin posibilidad de recuperación. Con \`sed -i.bak\` siempre queda el original en \`archivo.bak\`.
`

export default content
