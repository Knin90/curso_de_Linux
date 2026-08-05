const content = `
## Módulo 3 — tar y compresión: backups de archivos y directorios

### 🎯 Objetivos de aprendizaje
* Dominar los flags esenciales de tar para crear, extraer, listar y verificar archivos
* Elegir el algoritmo de compresión correcto según el trade-off velocidad/ratio
* Implementar backups incrementales con tar usando snapshots
* Dividir, reasamblar y verificar archivos grandes con checksums
* Usar compresión paralela para optimizar el rendimiento en sistemas multi-núcleo

### ❓ El problema real
Son las 2am. El servidor de producción tiene el disco raíz corrupto. Tienes un backup de \`/var/www\` y \`/etc/nginx\` en un archivo \`.tar.gz\` en el servidor de backup — pero nunca verificaste si el archivo estaba completo, nunca probaste la extracción, y no recuerdas si el path dentro del archivo coincide con donde necesitas restaurar. El downtime se extiende porque estás adivinando flags de tar en pánico.

Este módulo elimina ese escenario.

### 📖 Flags fundamentales de tar

tar usa una sintaxis de flags que parece críptica al principio pero sigue una lógica clara:

\`\`\`
-c  crear archivo (create)
-x  extraer archivo (extract)
-t  listar contenido (table of contents)
-v  verbose (mostrar cada archivo procesado)
-f  especificar el nombre del archivo (siempre último antes del nombre)
\`\`\`

La regla mnemónica: **c**rear, e**x**traer, lis**t**ar, **v**erbose, **f**ile.

### 📖 Algoritmos de compresión

tar no comprime por sí solo — delega en herramientas externas. Cada flag activa un compresor diferente:

| Flag | Formato | Extensión | Velocidad | Ratio | Uso recomendado |
|------|---------|-----------|-----------|-------|-----------------|
| \`-z\` | gzip | .tar.gz | Rápido | Moderado | Backups diarios, uso general |
| \`-j\` | bzip2 | .tar.bz2 | Lento | Bueno | Archivos de largo plazo |
| \`-J\` | xz | .tar.xz | Muy lento | Excelente | Distribución de software |
| \`--zstd\` | zstd | .tar.zst | Rápido + bueno | Excelente | Elección moderna |

**Benchmark para decidir:**
\`\`\`bash
# Comparar gzip vs xz en tu propio dataset
time tar -czf /dev/null /var/www
time tar -cJf /dev/null /var/www

# zstd (si está disponible)
time tar --zstd -cf /dev/null /var/www
\`\`\`

Si la diferencia de tiempo es grande pero el ratio de compresión es similar, usa gzip. Si tienes tiempo y el espacio importa, usa xz.

### 📖 Crear backups

**Backup básico:**
\`\`\`bash
tar -czf backup-\$(date +%Y%m%d).tar.gz /var/www /etc/nginx
\`\`\`

\`\$(date +%Y%m%d)\` genera un sufijo de fecha como \`20240115\`. Usar fechas en el nombre es imprescindible — "backup.tar.gz" sobrescribe el anterior.

**Con exclusiones:**
\`\`\`bash
tar --exclude='/var/www/cache' \
    --exclude='/var/www/tmp' \
    --exclude='*.log' \
    --exclude='*.pyc' \
    -czf backup-\$(date +%Y%m%d).tar.gz /var/www /etc/nginx
\`\`\`

Las exclusiones van **antes** del \`-czf\`. El orden importa en tar.

**Advertencia sobre paths absolutos:** tar por defecto strips el \`/\` inicial para evitar sobreescribir rutas del sistema al extraer. El archivo internamente guarda \`var/www/\` no \`/var/www/\`. Esto es el comportamiento correcto y seguro.

### 📖 Extraer archives

**Extracción completa:**
\`\`\`bash
tar -xzf backup.tar.gz -C /restore/
\`\`\`

\`-C\` especifica el directorio destino. Sin \`-C\`, extrae en el directorio actual.

**Extraer un único archivo:**
\`\`\`bash
tar -xzf backup.tar.gz ./etc/nginx/nginx.conf
\`\`\`

El path debe coincidir exactamente con lo que está dentro del archivo (sin \`/\` inicial, por eso \`./etc/nginx/nginx.conf\`). Si no sabes el path exacto, lista primero.

**Listar contenido sin extraer:**
\`\`\`bash
tar -tzf backup.tar.gz | head -20
tar -tzf backup.tar.gz | grep nginx.conf
\`\`\`

Haz esto **siempre** antes de una restauración crítica para confirmar que el archivo contiene lo que esperas.

### 📖 Backups incrementales con tar

tar soporta backups incrementales mediante un archivo de snapshot (\`.snar\`) que registra el estado de cada archivo en el último backup:

\`\`\`bash
# Backup nivel 0 (completo inicial)
tar --listed-incremental=/var/lib/tar-snapshot.snar \
    -czf backup-full-\$(date +%Y%m%d).tar.gz /data

# Backups incrementales posteriores (sólo cambios desde el snapshot)
tar --listed-incremental=/var/lib/tar-snapshot.snar \
    -czf backup-\$(date +%u).tar.gz /data
\`\`\`

\`%u\` es el día de la semana (1=Lunes, 7=Domingo). Esto crea backup-1.tar.gz, backup-2.tar.gz, etc.

**Para restaurar desde incrementales:**
1. Restaurar el backup completo (nivel 0) primero
2. Aplicar cada incremental en orden cronológico

**Limitación:** tar incrementales son simples pero frágiles. Para backups incrementales serios en producción, BorgBackup (Módulo 4) es la elección correcta.

### 📖 Verificación e integridad

**Verificar que el archivo no está corrupto:**
\`\`\`bash
tar -tzf backup.tar.gz > /dev/null && echo "OK" || echo "CORRUPT"
\`\`\`

Esto lista el contenido descartándolo (\`> /dev/null\`). Si tar puede leer el archivo completo sin errores, devuelve 0. Si el archivo está truncado o corrupto, devuelve error.

**Checksum criptográfico:**
\`\`\`bash
# Generar checksum
sha256sum backup.tar.gz > backup.tar.gz.sha256

# Verificar checksum (confirma que el archivo no fue alterado)
sha256sum -c backup.tar.gz.sha256
\`\`\`

Guarda el archivo \`.sha256\` en un lugar diferente al backup. Si ambos se corrompen juntos, el checksum no sirve.

**Práctica recomendada:** ejecutar ambas verificaciones después de cada backup y registrar el resultado en el log.

### 📖 Dividir archives grandes

Cuando el backup supera el tamaño de un medio de almacenamiento o un límite de transferencia:

\`\`\`bash
# Crear y dividir en partes de 1GB
tar -czf - /bigdata | split -b 1G - backup.tar.gz.

# Crea: backup.tar.gz.aa, backup.tar.gz.ab, backup.tar.gz.ac ...
\`\`\`

El \`-\` como nombre de archivo le dice a tar que escriba a stdout, y split lee de stdin.

**Reasamblar y extraer:**
\`\`\`bash
cat backup.tar.gz.* | tar -xz
\`\`\`

**Verificar partes antes de reasamblar:**
\`\`\`bash
cat backup.tar.gz.* | tar -tz | wc -l
# Debe mostrar el número de archivos en el backup
\`\`\`

### 📖 Compresión paralela

gzip y bzip2 son single-threaded. En servidores modernos con múltiples CPUs, esto desperdicia recursos:

**pigz (parallel gzip):**
\`\`\`bash
# Instalar
apt install pigz   # Debian/Ubuntu
dnf install pigz   # RHEL/Fedora

# Usar con tar
tar -I pigz -cf backup.tar.gz /data

# pigz usa todos los CPUs disponibles por defecto
# Especificar número de cores
tar -I "pigz -p 4" -cf backup.tar.gz /data
\`\`\`

**Ajustar nivel de compresión gzip:**
\`\`\`bash
# Más rápido, menos compresión (nivel 1)
GZIP=-1 tar -czf backup.tar.gz /data

# Más lento, mejor compresión (nivel 9, default es 6)
GZIP=-9 tar -czf backup.tar.gz /data
\`\`\`

**Regla práctica:** si el backup tarda más de 10 minutos con gzip estándar y tienes 4+ CPUs, instala pigz — suele reducir el tiempo a la mitad o menos.

### 📋 Lo que debes recordar
* Los flags van en orden: operación (\`-c/-x/-t\`), modificadores (\`-v/-z/-j\`), \`-f\` siempre antes del nombre
* Siempre pon fecha en el nombre del archivo de backup
* Usa \`-C\` para especificar el directorio de extracción
* Lista el contenido con \`-t\` antes de cualquier restauración crítica
* Verifica el archivo con \`-t > /dev/null\` y \`sha256sum -c\` después de cada backup
* zstd es la elección moderna: compresión de xz con velocidad cercana a gzip
* pigz paraleliza gzip y acelera significativamente en sistemas multi-núcleo
* Las exclusiones van antes del \`-f\` en la línea de comando

### 🧪 Autoevaluación
1. ¿Qué flag de tar usas para crear un archive con compresión xz y qué extensión debe tener el archivo resultante?
2. Tienes \`backup.tar.gz\` y necesitas restaurar sólo el archivo \`./etc/nginx/sites-enabled/default\`. ¿Cuál es el comando exacto?
3. ¿Cuál es la diferencia entre verificar con \`tar -tzf backup.tar.gz > /dev/null\` y con \`sha256sum -c backup.tar.gz.sha256\`?

---

1. El flag es \`-J\` y la extensión debe ser \`.tar.xz\`. Ejemplo: \`tar -cJf backup.tar.xz /data\`
2. \`tar -xzf backup.tar.gz ./etc/nginx/sites-enabled/default\` — el path debe coincidir exactamente con el contenido interno del archive (sin \`/\` inicial)
3. \`tar -tzf\` verifica que la estructura interna del archivo es válida y legible (integridad del formato tar+gzip). \`sha256sum -c\` verifica que los bytes del archivo no han cambiado desde que se generó el checksum (integridad del archivo en disco). Ambas verificaciones son complementarias: una puede pasar y la otra fallar.
`

export default content
