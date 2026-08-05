const content = `
## Módulo 5 — Monitoreo de archivos críticos: /etc/passwd, /etc/sudoers, /bin/

### 🎯 Objetivos de aprendizaje

* Identificar qué archivos del sistema merecen monitoreo permanente.
* Escribir un conjunto completo de reglas para archivos de identidad.
* Monitorear directorios de binarios del sistema contra modificaciones.
* Detectar y alertar sobre cambios en tiempo real.

### ❓ El problema real

Las técnicas de persistencia más comunes después de comprometer un sistema implican modificar \`/etc/passwd\` (añadir usuario root falso), \`/etc/sudoers\` (dar privilegios sin contraseña) o reemplazar un binario del sistema en \`/usr/bin/\` por una versión troyanizada. Sin monitoreo, estos cambios pueden pasar desapercibidos durante semanas.

### 📖 Categorías de archivos críticos

\`\`\`text
CATEGORÍA               ARCHIVOS
──────────────────────────────────────────────────────────────
Identidad               /etc/passwd, /etc/shadow, /etc/group,
                        /etc/gshadow, /etc/security/opasswd
Autorización            /etc/sudoers, /etc/sudoers.d/
Autenticación           /etc/pam.d/, /etc/security/
SSH                     /etc/ssh/sshd_config, ~/.ssh/authorized_keys
Binarios del sistema    /bin/, /sbin/, /usr/bin/, /usr/sbin/
Configuración de red    /etc/hosts, /etc/resolv.conf, /etc/iptables/
Cron y scheduled tasks  /etc/crontab, /etc/cron.d/, /var/spool/cron/
Módulos del kernel      /etc/modules, /etc/modprobe.d/
Boot y GRUB             /boot/, /etc/grub.d/
\`\`\`

### 📖 Reglas para archivos de identidad y autenticación

\`\`\`bash
# Crear /etc/audit/rules.d/10-identity.rules

# Archivos de usuarios y contraseñas
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/security/opasswd -p wa -k identity

# Privilegios sudo
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# PAM (cambios en autenticación del sistema)
-w /etc/pam.d/ -p wa -k pam-config
-w /etc/security/access.conf -p wa -k pam-config
-w /etc/security/limits.conf -p wa -k pam-config

# SSH
-w /etc/ssh/sshd_config -p wa -k sshd-config
-w /etc/ssh/ -p wa -k sshd-config
\`\`\`

### 📖 Reglas para binarios del sistema

\`\`\`bash
# Crear /etc/audit/rules.d/20-binaries.rules
# NOTA: monitorear ejecuciones en /bin es de alto volumen
# Para producción, monitorear solo escrituras (modificaciones)

# Monitorear MODIFICACIONES a binarios (crítico)
-w /bin/ -p wa -k bin-modification
-w /sbin/ -p wa -k bin-modification
-w /usr/bin/ -p wa -k bin-modification
-w /usr/sbin/ -p wa -k bin-modification
-w /usr/local/bin/ -p wa -k bin-modification
-w /usr/local/sbin/ -p wa -k bin-modification

# Monitorear módulos del kernel (carga de rootkits)
-w /sbin/insmod -p x -k kernel-module-load
-w /sbin/rmmod -p x -k kernel-module-load
-w /sbin/modprobe -p x -k kernel-module-load
-a always,exit -F arch=b64 -S init_module -S finit_module -k kernel-module-load

# Monitorear cron
-w /etc/crontab -p wa -k cron-modification
-w /etc/cron.d/ -p wa -k cron-modification
-w /etc/cron.daily/ -p wa -k cron-modification
-w /etc/cron.weekly/ -p wa -k cron-modification
-w /var/spool/cron/ -p wa -k cron-modification
\`\`\`

### 📖 Script de alerta en tiempo real

\`\`\`bash
# /usr/local/bin/audit-watch.sh
# Monitorea el log en tiempo real y alerta sobre eventos críticos

#!/bin/bash

LOGFILE="/var/log/audit/audit.log"
ALERTLOG="/var/log/audit/alerts.log"
MAILTO="security@empresa.com"

tail -F "\$LOGFILE" | while read -r line; do
    # Detectar modificaciones a archivos críticos
    if echo "\$line" | grep -qE 'key="(identity|sudoers|bin-modification)"'; then
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        KEY=$(echo "\$line" | grep -oP 'key="\K[^"]+')

        echo "[\$TIMESTAMP] ALERTA: evento con clave \$KEY" >> "\$ALERTLOG"
        echo "\$line" >> "\$ALERTLOG"

        # Email inmediato para eventos críticos
        if echo "\$KEY" | grep -qE "(identity|sudoers|bin-modification)"; then
            echo "Evento crítico de auditoría en \$(hostname):
Clave: \$KEY
Tiempo: \$TIMESTAMP
Línea: \$line" | mail -s "[CRÍTICO] Modificación de archivo protegido" "\$MAILTO"
        fi
    fi
done
\`\`\`

### 📖 Verificar integridad de /etc/passwd en tiempo real

\`\`\`bash
# Método 1: checksum diario y comparar
sudo sha256sum /etc/passwd /etc/shadow /etc/group > /root/.file-checksums
# Al día siguiente:
sudo sha256sum -c /root/.file-checksums

# Método 2: ver cambios recientes con ausearch
sudo ausearch -k identity --start today -i | grep -E "name=(/etc/passwd|/etc/shadow)"

# Método 3: ver qué usuario hizo el cambio
sudo ausearch -k identity -i | grep -B5 "name=/etc/passwd" | grep "auid="
\`\`\`

### 📖 Detectar authorized_keys modificados

\`\`\`bash
# Las authorized_keys de usuarios son vectores de persistencia

# Regla para monitorear authorized_keys de todos los usuarios
# (requiere conocer los homes de los usuarios)
-w /root/.ssh/ -p wa -k ssh-keys
-w /home/ -p wa -k ssh-keys

# Buscar cambios recientes
sudo ausearch -k ssh-keys --start today -i

# Ver qué authorized_keys existen en el sistema
sudo find /home /root -name "authorized_keys" -type f 2>/dev/null
\`\`\`

### 📋 Lo que debes recordar

* Monitorear escrituras (\`-p wa\`) en archivos críticos es siempre necesario; monitorear ejecuciones (\`-p x\`) en \`/bin/\` es muy ruidoso — úsalo solo para binarios específicos sospechosos.
* El campo \`auid\` en los eventos de modificación revela el usuario real, incluso si usó \`sudo\`.
* Los \`authorized_keys\` en homes de usuarios son vectores de persistencia muy comunes tras un compromiso.
* Combinar auditd con checksums periódicos (o AIDE, módulo siguiente) da doble cobertura.

### 🧪 Autoevaluación

1. ¿Por qué es peligroso activar \`-w /usr/bin/ -p x\`? ¿Cuándo tendría sentido?
2. ¿Cómo verificarías qué usuario añadió una línea a \`/etc/sudoers\` hace dos días?
3. Un atacante añade su clave pública a \`/root/.ssh/authorized_keys\`. ¿Qué regla captura este evento?

---

1. Monitorear ejecuciones en \`/usr/bin/\` genera miles de eventos por hora — cada \`ls\`, \`grep\`, \`awk\` o comando del sistema crea un registro. En la práctica satura el log y hace imposible encontrar señales. Tiene sentido en un sistema de muy baja actividad o para un binario específico sospechoso (\`-w /usr/bin/curl -p x\`).
2. \`sudo ausearch -k sudoers --start 01/13/2024 00:00:00 --end 01/13/2024 23:59:59 -i\`. El campo \`auid\` en el resultado revela quién lo hizo; el campo \`name=\` confirma el archivo.
3. La regla \`-w /root/.ssh/ -p wa -k ssh-keys\` captura cualquier escritura dentro del directorio. Si no existe esa regla, no hay registro. Por eso es importante añadirla preventivamente, no después del incidente.
`

export default content
