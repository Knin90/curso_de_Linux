const content = `
## Módulo 3 — ausearch: búsqueda y filtrado de eventos de auditoría

### 🎯 Objetivos de aprendizaje

* Buscar eventos en \`audit.log\` por clave, usuario, archivo, syscall y tiempo.
* Interpretar la salida de \`ausearch\` en formato legible.
* Combinar filtros para investigar incidentes específicos.
* Exportar resultados para análisis externo.

### ❓ El problema real

El archivo \`/etc/sudoers\` fue modificado anoche. El log de auditoría tiene 50.000 líneas. Sin \`ausearch\`, tendrías que hacer \`grep\` en texto crudo con campos numéricos que necesitas traducir manualmente. \`ausearch\` entiende el formato nativo de audit, traduce UIDs a nombres, timestamps a fechas legibles, y filtra por cualquier campo en segundos.

### 📖 Sintaxis básica de ausearch

\`\`\`bash
# Buscar por clave (la más común en operaciones diarias)
sudo ausearch -k identity
sudo ausearch -k sudoers-changes

# Buscar por archivo específico
sudo ausearch -f /etc/passwd
sudo ausearch -f /etc/shadow

# Buscar por usuario (por nombre o UID)
sudo ausearch -ua root            # por auid (audit UID)
sudo ausearch -ui 1000            # por UID numérico
sudo ausearch -ul alice           # por nombre de usuario de login

# Buscar por PID
sudo ausearch -p 5678

# Buscar por tipo de evento
sudo ausearch -m USER_AUTH
sudo ausearch -m SYSCALL
sudo ausearch -m USER_LOGIN
sudo ausearch -m USER_CMD
\`\`\`

### 📖 Filtros de tiempo

\`\`\`bash
# Eventos de hoy
sudo ausearch --start today

# Eventos de las últimas 2 horas
sudo ausearch --start recent

# Rango de fechas (formato: MM/DD/YYYY HH:MM:SS)
sudo ausearch --start 01/15/2024 00:00:00 --end 01/15/2024 23:59:59

# Desde hace 1 hora hasta ahora
sudo ausearch --start "$(date -d '1 hour ago' '+%m/%d/%Y %H:%M:%S')"

# Solo el día de ayer
sudo ausearch --start yesterday --end today
\`\`\`

### 📖 Formato de salida

\`\`\`bash
# Formato por defecto (crudo pero agrupado)
sudo ausearch -k identity

# Formato interpretado (legible — RECOMENDADO)
sudo ausearch -k identity -i

# Formato JSON (para procesamiento automático)
sudo ausearch -k identity --format json

# Solo el campo execve para ver comandos ejecutados
sudo ausearch -k exec-commands -i | grep -A2 "type=EXECVE"
\`\`\`

\`\`\`text
# Ejemplo de salida con -i (interpretado)
----
time->Mon Jan 15 02:34:56 2024
type=SYSCALL msg=audit(1705283696.123:789):
  arch=x86_64
  syscall=openat
  success=yes
  exit=3
  ppid=1234 pid=5678
  auid=alice uid=root gid=root
  euid=root suid=root fsuid=root
  egid=root sgid=root fsgid=root
  tty=pts0
  ses=5
  comm=nano
  exe=/usr/bin/nano
  key=identity
type=CWD msg=audit(1705283696.123:789): cwd=/root
type=PATH msg=audit(1705283696.123:789):
  item=0 name=/etc/passwd
  inode=131073 dev=fd:00
  mode=file,644
  ouid=root ogid=root
  nametype=NORMAL
\`\`\`

### 📖 Combinaciones útiles para investigación

\`\`\`bash
# ¿Quién modificó /etc/sudoers en las últimas 24h?
sudo ausearch -f /etc/sudoers --start today -i

# ¿Qué comandos ejecutó el usuario alice hoy?
sudo ausearch -k exec-commands -ul alice --start today -i

# ¿Hubo intentos de login fallidos?
sudo ausearch -m USER_AUTH --start today -i | grep "res=failed"

# ¿Alguien usó sudo hoy?
sudo ausearch -m USER_CMD --start today -i

# ¿Se ejecutó algo en /tmp o /dev/shm? (técnica común de malware)
sudo ausearch -k exec-commands -i | grep -E "exe=(/tmp|/dev/shm)"

# Eventos por un proceso específico
sudo ausearch -p 9876 -i

# Ver todos los archivos accedidos por un usuario sospechoso
sudo ausearch -ul mallory --start today -i | grep "name="
\`\`\`

### 📖 Buscar en archivos de log rotados

\`\`\`bash
# Por defecto ausearch lee solo /var/log/audit/audit.log
# Para incluir logs rotados:
sudo ausearch -if /var/log/audit/audit.log.1 -k identity

# Para buscar en todos los logs (pipe manual)
for log in /var/log/audit/audit.log*; do
    echo "=== \$log ==="
    sudo ausearch -if "\$log" -k identity -i 2>/dev/null
done

# Alternativa con find
sudo find /var/log/audit/ -name "audit.log*" | \
    xargs -I{} sudo ausearch -if {} -k identity -i 2>/dev/null
\`\`\`

### 📖 Exportar resultados

\`\`\`bash
# Guardar resultados para análisis
sudo ausearch -k identity --start today -i > /tmp/identity-events.txt

# Exportar en JSON para SIEM
sudo ausearch -k identity --format json > /tmp/events.json

# Contar eventos por tipo
sudo ausearch --start today -i | grep "^type=" | \
    awk '{print \$1}' | sort | uniq -c | sort -rn
\`\`\`

### 📋 Lo que debes recordar

* \`-i\` es tu mejor amigo: traduce UIDs, syscall numbers y timestamps a texto legible.
* La clave \`-k\` es el filtro más rápido — asigna claves descriptivas a todas tus reglas.
* \`auid\` (audit UID) identifica al usuario real aunque haya hecho \`sudo\` — busca con \`-ul nombre\`.
* Combina \`ausearch\` con \`grep\` para filtrar dentro de los resultados ya filtrados.

### 🧪 Autoevaluación

1. ¿Cómo buscarías todos los eventos de modificación de \`/etc/passwd\` del último mes?
2. ¿Qué diferencia hay entre \`-ua alice\` y \`-ul alice\` en ausearch?
3. Un atacante ejecutó un binario desde \`/tmp\`. ¿Qué comando de ausearch usarías para encontrarlo?

---

1. \`sudo ausearch -f /etc/passwd --start 12/15/2023 00:00:00 --end 01/15/2024 23:59:59 -i\` ajustando las fechas al mes anterior. También se puede usar la clave si se configuró: \`sudo ausearch -k identity --start 12/15/2023 -i\`.
2. \`-ua alice\` busca por el nombre en el campo \`auid\` (login UID original). \`-ul alice\` busca el nombre de login del usuario. En la práctica, \`-ul\` es más robusto porque busca por nombre de login independientemente de si alice usó \`su\` o \`sudo\`.
3. \`sudo ausearch -k exec-commands -i | grep 'exe=/tmp/'\`. O directamente: \`sudo ausearch -k exec-commands --start today -i | grep -E "exe=(/tmp|/dev/shm|/var/tmp)"\`.
`

export default content
