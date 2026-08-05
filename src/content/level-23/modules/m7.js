const content = `
## Módulo 7 — Cumplimiento normativo: PCI-DSS, HIPAA y CIS con auditd

### 🎯 Objetivos de aprendizaje

* Entender qué exige cada normativa en materia de auditoría.
* Implementar las reglas de auditd requeridas por PCI-DSS y CIS Benchmark.
* Configurar retención de logs conforme a requisitos normativos.
* Generar evidencia de cumplimiento para auditorías externas.

### ❓ El problema real

Tu empresa procesa pagos con tarjeta y el auditor de PCI-DSS pregunta: "¿Pueden demostrar que registran todos los accesos a datos de tarjetahabientes y que los logs no han sido modificados?". Sin la configuración correcta de auditd, la respuesta es no, lo que puede resultar en multas o pérdida de la certificación. Las normativas son concretas en qué hay que registrar.

### 📖 Requisitos de PCI-DSS relacionados con auditoría

\`\`\`text
REQUISITO PCI-DSS    DESCRIPCIÓN                          IMPLEMENTACIÓN auditd
───────────────────────────────────────────────────────────────────────────────
10.2.1               Acceso individual a datos de CH       -k pci-data-access
10.2.2               Acciones de root/admin               -F euid=0 -k pci-root
10.2.3               Acceso a audit trails                 -w /var/log/audit/ -p rwa
10.2.4               Intentos de acceso inválidos          aureport --failed
10.2.5               Uso de mecanismos de ID y auth        aureport --auth
10.2.6               Init/stop/pause del audit log        -m DAEMON_START,DAEMON_END
10.2.7               Creación/eliminación de objetos       -S creat -S unlink
10.3.x               Datos en cada registro de log         automático en auditd
10.5.x               Protección de logs de auditoría       -e 2, permisos restrictivos
10.7                 Retención 12 meses (3 meses online)   max_log_file, num_logs
\`\`\`

### 📖 Reglas PCI-DSS: /etc/audit/rules.d/40-pci-dss.rules

\`\`\`bash
## ============================================================
## PCI-DSS v4.0 Audit Rules
## Cubre Requisito 10.x — Registro y monitoreo de accesos
## ============================================================

# 10.2.1 — Acceso a datos de tarjetahabientes
# Ajustar rutas a los directorios reales de datos
-w /var/lib/postgresql/ -p rwa -k pci-cardholder-data
-w /opt/app/data/ -p rwa -k pci-cardholder-data

# 10.2.2 — Acciones con privilegios de root
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid!=4294967295 -k pci-root-action
-a always,exit -F arch=b32 -S execve -F euid=0 -F auid!=4294967295 -k pci-root-action

# 10.2.3 — Acceso al audit trail mismo
-w /var/log/audit/ -p rwa -k pci-audit-trail
-w /etc/audit/ -p wa -k pci-audit-config

# 10.2.4 y 10.2.5 — Autenticación (manejado por PAM, los eventos llegan automáticamente)
# Asegurarse de no tener reglas que excluyan USER_AUTH y USER_LOGIN

# 10.2.7 — Creación y eliminación de archivos de sistema
-a always,exit -F arch=b64 -S creat -S truncate -S ftruncate -F success=1 -k pci-file-create
-a always,exit -F arch=b64 -S unlink -S unlinkat -S rename -S renameat -F success=1 -k pci-file-delete

# 10.2.x — Cambios de permisos y propietario
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -F auid>=1000 -k pci-permission-change
-a always,exit -F arch=b64 -S chown -S fchown -S lchown -S fchownat -F auid>=1000 -k pci-ownership-change
\`\`\`

### 📖 Reglas CIS Benchmark Level 2

\`\`\`bash
## ============================================================
## CIS Benchmark Linux Level 2 — Audit Rules
## Referencia: CIS Linux Benchmark v2.0
## ============================================================

# CIS 4.1.3 — Monitorear eventos de fecha y hora
-a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time-change
-a always,exit -F arch=b32 -S adjtimex -S settimeofday -S stime -k time-change
-w /etc/localtime -p wa -k time-change

# CIS 4.1.4 — Monitorear modificaciones de usuarios y grupos
-w /etc/group -p wa -k identity
-w /etc/passwd -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/security/opasswd -p wa -k identity

# CIS 4.1.5 — Monitorear cambios en red
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k system-locale
-w /etc/issue -p wa -k system-locale
-w /etc/issue.net -p wa -k system-locale
-w /etc/hosts -p wa -k system-locale
-w /etc/network/ -p wa -k system-locale

# CIS 4.1.6 — Monitorear cambios en AppArmor/SELinux
-w /etc/apparmor/ -p wa -k MAC-policy
-w /etc/apparmor.d/ -p wa -k MAC-policy

# CIS 4.1.7 — Monitorear intentos de login fallidos
# (automático con PAM — verificar que USER_AUTH no está excluido)

# CIS 4.1.8 — Recopilar sesiones de login
-w /var/run/utmp -p wa -k session
-w /var/log/wtmp -p wa -k session
-w /var/log/btmp -p wa -k session

# CIS 4.1.11 — Permisos y propietarios de archivos
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -F auid>=1000 -k perm-mod
-a always,exit -F arch=b64 -S chown -S fchown -S lchown -S fchownat -F auid>=1000 -k perm-mod

# CIS 4.1.14 — Acceso a archivos no autorizados
-a always,exit -F arch=b64 -S creat -S open -S openat -S truncate -F exit=-EACCES -k access
-a always,exit -F arch=b64 -S creat -S open -S openat -S truncate -F exit=-EPERM -k access

# CIS 4.1.17 — Acciones de administrador con sudo
-w /var/log/sudo.log -p wa -k sudo_log

# CIS 4.1.18 — Carga de módulos
-w /sbin/insmod -p x -k modules
-w /sbin/rmmod -p x -k modules
-w /sbin/modprobe -p x -k modules
-a always,exit -F arch=b64 -S init_module -S finit_module -k modules
\`\`\`

### 📖 Configurar retención de logs

\`\`\`bash
# Para PCI-DSS: 12 meses (3 online, resto archivados)
# Para HIPAA: 6 años de retención
# Para CIS: retención recomendada 90 días online

# Ajustar en /etc/audit/auditd.conf:
max_log_file = 200        # 200 MB por archivo
num_logs = 15             # 15 archivos rotados = ~3 GB online
max_log_file_action = ROTATE

# Para archivar automáticamente logs rotados:
# /etc/logrotate.d/audit
\`\`\`

\`\`\`text
/var/log/audit/audit.log {
    daily
    rotate 365
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        /sbin/service auditd restart > /dev/null 2>&1 || true
    endscript
}
\`\`\`

### 📖 Verificar cumplimiento

\`\`\`bash
# Listar todas las reglas activas
sudo auditctl -l

# Verificar que auditd está activo y en modo inmutable
sudo auditctl -s | grep -E "^(enabled|pid)"

# Generar evidencia de período para auditor
sudo aureport --start 01/01/2024 --end 01/31/2024 > /tmp/audit-enero-2024.txt

# Verificar integridad del log (sin modificaciones)
sudo ausearch -m DAEMON_ROTATE --start this-month -i
\`\`\`

### 📋 Lo que debes recordar

* PCI-DSS Requisito 10 exige registrar accesos a datos de titulares de tarjetas y acciones de administradores.
* La retención varía: PCI-DSS requiere 12 meses, HIPAA hasta 6 años — configura \`num_logs\` y rotación externa.
* CIS Benchmark L2 cubre identidad, red, módulos del kernel, sesiones y permisos — es un excelente punto de partida.
* \`-e 2\` (inmutable) es requerido por PCI-DSS para proteger la integridad de la configuración de auditoría.

### 🧪 Autoevaluación

1. ¿Qué requisito PCI-DSS exige monitorear el propio log de auditoría?
2. ¿Por qué CIS Benchmark incluye la regla \`-a always,exit -F exit=-EACCES -k access\`?
3. ¿Cómo demostrarías a un auditor que los logs de auditoría no han sido modificados?

---

1. El Requisito 10.2.3 de PCI-DSS exige registrar "el acceso a todos los rastros de auditoría". La regla \`-w /var/log/audit/ -p rwa -k pci-audit-trail\` implementa esto — cualquier lectura, escritura o cambio de atributo en el directorio de logs queda registrado.
2. \`EACCES\` es el error "Permission denied". Esta regla captura todos los intentos de acceso a archivos que fueron denegados por permisos. Esto detecta exploración del sistema o intentos de acceder a recursos para los que el atacante no tiene permiso — comportamiento típico de reconocimiento.
3. Mostrando los eventos \`DAEMON_START\`, \`DAEMON_ROTATE\` y \`DAEMON_END\` del período (\`aureport -ts this-year\`), combinados con la ausencia de eventos de escritura en \`/var/log/audit/\` por usuarios no autorizados. Adicionalmente, los checksums del log firmados con una clave privada o enviados a un SIEM externo proveen evidencia criptográfica.
`

export default content
