const content = `
## Módulo 8 — Proyecto real: programa completo de gestión de vulnerabilidades

### 🎯 Objetivos de aprendizaje
* Ejecutar una auditoría Lynis y extraer los hallazgos prioritarios
* Identificar vulnerabilidades en servicios de red con nmap y cruzarlas con CVEs conocidas
* Construir y gestionar una lista de priorización con SLA deadlines
* Aplicar remediaciones y verificar la mejora del hardening index
* Automatizar el ciclo de escaneo con un script semanal y cron

### ❓ El problema real

Tienes una infraestructura de 5 servidores: web, base de datos, correo, monitoreo y backup.
Sin un proceso sistemático, las vulnerabilidades se acumulan silenciosamente.
Este laboratorio construye un programa completo: detección, priorización, remediación,
verificación y automatización. Al final tendrás un ciclo reproducible cada semana.

### 📖 Estructura del proyecto

\`\`\`
/tmp/lynis-report.txt
/tmp/lynis-report-post.txt
/var/log/lynis.log

/opt/scripts/weekly-vuln-scan.sh
/var/reports/vulnerabilidades/
├── lynis-<fecha>.txt
└── .last_hardening_index
/var/log/weekly-vuln-scan.log
\`\`\`

### 📖 Paso 1: auditoría Lynis en el servidor web

Lynis analiza la configuración del sistema y produce un hardening index (0–100%)
junto con advertencias y sugerencias concretas.

**Ejecutar la auditoría y guardar el reporte:**
\`\`\`bash
lynis audit system 2>&1 | tee /tmp/lynis-report.txt
\`\`\`

**Leer el hardening index:**
\`\`\`bash
grep "Hardening index" /tmp/lynis-report.txt
# Ejemplo de salida: Hardening index : 62 [############        ]
\`\`\`

**Extraer advertencias (warnings — problemas activos):**
\`\`\`bash
grep "^!" /tmp/lynis-report.txt | head -10
\`\`\`

**Extraer sugerencias del log de Lynis:**
\`\`\`bash
grep "^\[suggestion\]" /var/log/lynis.log | head -20
\`\`\`

**Hallazgos típicos en un servidor Ubuntu sin hardening previo:**
- SSH root login permitido
- Contraseñas sin complejidad mínima configurada
- Servicios innecesarios activos (avahi-daemon, cups)
- sysctl: sin protección contra IP spoofing
- No se usa auditd para registro de eventos del sistema

**Interpretar la salida:** cada línea con \`!\` es una advertencia que requiere acción.
Las líneas con \`*\` son sugerencias de mejora. Ambas contribuyen al hardening index.

### 📖 Paso 2: descubrimiento de vulnerabilidades con nmap

Nmap puede identificar versiones de servicios y cruzarlas con scripts de vulnerabilidades conocidas.

**Escaneo de versiones y scripts de vulnerabilidad:**
\`\`\`bash
nmap -sV -sC --script vuln 192.168.1.10
\`\`\`

**Salida relevante (ejemplo):**
\`\`\`
80/tcp  open  http    Apache httpd 2.4.29
| http-vuln-cve2021-41773:
|   VULNERABLE: CVE-2021-41773
|   Path traversal and RCE in Apache 2.4.49/2.4.50
|   CVSS: 7.5 High
\`\`\`

**Verificar la versión instalada con apt:**
\`\`\`bash
apt-cache show apache2 | grep Version
# Version: 2.4.29-1ubuntu4.21
\`\`\`

**Cruzar con NVD:** consulta https://nvd.nist.gov/vuln/search para obtener el vector
CVSS completo y confirmar si el sistema es vulnerable según la versión exacta.

**Nota sobre OpenVAS:** en entornos de producción se usa OpenVAS/Greenbone para escaneos
más completos. Nmap con --script vuln cubre los casos más conocidos y es suficiente
para este laboratorio.

### 📖 Paso 3: construcción de la lista de priorización

Con los hallazgos del paso anterior, construye un registro de vulnerabilidades
con SLA deadlines calculados desde hoy.

**Formato de la tabla de priorización:**

\`\`\`
CVE ID           | CVSS | Severidad | Sistema         | Criticidad | SLA deadline        | Estado
CVE-2021-41773   | 7.5  | High      | web-server-01   | Alto       | $(date -d '+3 days') | Abierto
LYNIS-SSH-ROOT   | —    | High      | web-server-01   | Alto       | $(date -d '+7 days') | Abierto
LYNIS-AVAHI      | —    | Low       | web-server-01   | Alto       | $(date -d '+60 days')| Abierto
LYNIS-SYSCTL     | —    | Medium    | web-server-01   | Alto       | $(date -d '+15 days')| Abierto
\`\`\`

**Cálculo de criticidad efectiva con activo de producción:**
\`\`\`
Puntuación efectiva = CVSS_temporal × factor_criticidad_activo
                    = 7.5 × 1.5 (servidor web de producción = Alto)
                    = 11.25 → prioridad máxima dentro del rango High
\`\`\`

**Orden de remediación resultante:**
1. CVE-2021-41773 (Apache) — vulnerabilidad activa con exploit público, SLA 3 días
2. LYNIS-SSH-ROOT — acceso root directo por SSH, SLA 7 días
3. LYNIS-SYSCTL — hardening de red, SLA 15 días
4. LYNIS-AVAHI — servicio innecesario, SLA 60 días

### 📖 Paso 4: remediación

**4.1 Parche de Apache (CVE-2021-41773):**
\`\`\`bash
apt-get update
apt-get upgrade apache2 -y
apache2 -v
# Verificar: Server version: Apache/2.4.52 (Ubuntu) o superior
\`\`\`

**4.2 Deshabilitar SSH root login:**
\`\`\`bash
# Editar /etc/ssh/sshd_config
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
grep PermitRootLogin /etc/ssh/sshd_config
systemctl restart sshd
\`\`\`

**4.3 Deshabilitar servicios innecesarios (Lynis: avahi-daemon):**
\`\`\`bash
systemctl disable avahi-daemon
systemctl stop avahi-daemon
systemctl status avahi-daemon  # debe mostrar "disabled"
\`\`\`

**4.4 Hardening de sysctl (recomendación Lynis):**
\`\`\`bash
cat >> /etc/sysctl.conf << 'EOF'
# Protección contra IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
# Deshabilitar aceptación de paquetes ICMP redirect
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
# Protección SYN flood
net.ipv4.tcp_syncookies = 1
EOF
sysctl -p
\`\`\`

**4.5 Instalar y activar auditd:**
\`\`\`bash
apt-get install auditd -y
systemctl enable --now auditd
\`\`\`

### 📖 Paso 5: estado post-remediación

**5.1 Re-ejecutar Lynis y comparar hardening index:**
\`\`\`bash
lynis audit system 2>&1 | tee /tmp/lynis-report-post.txt
grep "Hardening index" /tmp/lynis-report-post.txt
# Resultado esperado: Hardening index : 71 (vs. 62 inicial)
\`\`\`

**5.2 Comparar advertencias antes y después:**
\`\`\`bash
# Antes
grep -c "^!" /tmp/lynis-report.txt

# Después
grep -c "^!" /tmp/lynis-report-post.txt
# Debe haber reducido el número de advertencias
\`\`\`

**5.3 Verificar versión de Apache con nmap:**
\`\`\`bash
nmap -sV -p 80,443 192.168.1.10
# Debe mostrar la versión actualizada
nmap -sV -sC --script vuln 192.168.1.10
# CVE-2021-41773 ya no debe aparecer como vulnerable
\`\`\`

**5.4 Actualizar el registro:**
\`\`\`
CVE-2021-41773   | 7.5  | High | web-server-01 | Cerrado | MTTR: 1 día
LYNIS-SSH-ROOT   | —    | High | web-server-01 | Cerrado | MTTR: 1 día
\`\`\`

### 📖 Paso 6: automatización con script semanal

**Script /opt/scripts/weekly-vuln-scan.sh:**
\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR="/var/reports/vulnerabilidades"
DATE=\$(date +%Y-%m-%d)
REPORT="\${REPORT_DIR}/lynis-\${DATE}.txt"
PREV_INDEX_FILE="\${REPORT_DIR}/.last_hardening_index"
ADMIN_EMAIL="seguridad@empresa.com"

mkdir -p "\$REPORT_DIR"

# Ejecutar auditoría Lynis
echo "[*] Ejecutando Lynis audit..."
lynis audit system 2>&1 > "\$REPORT"

# Extraer hardening index actual
CURRENT_INDEX=\$(grep "Hardening index" "\$REPORT" | grep -oP '\d+(?= \[)')

# Comparar con el índice anterior
if [ -f "\$PREV_INDEX_FILE" ]; then
    PREV_INDEX=\$(cat "\$PREV_INDEX_FILE")
    DIFF=\$((CURRENT_INDEX - PREV_INDEX))
    TREND="Cambio: \${DIFF} puntos respecto a la semana anterior"
else
    TREND="Primera ejecución — sin comparación anterior"
fi

echo "\$CURRENT_INDEX" > "\$PREV_INDEX_FILE"

# Extraer advertencias
WARNINGS=\$(grep -c "^!" "\$REPORT" || true)

# Enviar reporte por email
BODY="Reporte de vulnerabilidades semanal - \${DATE}
Hardening index: \${CURRENT_INDEX}/100
\${TREND}
Advertencias activas: \${WARNINGS}

Ver reporte completo en: \${REPORT}"

echo "\$BODY" | mail -s "Vuln Report \${DATE} - HI:\${CURRENT_INDEX}" "\$ADMIN_EMAIL"

echo "[*] Reporte enviado a \${ADMIN_EMAIL}"
echo "[*] Hardening index: \${CURRENT_INDEX}/100 — \${TREND}"
\`\`\`

**Hacer el script ejecutable:**
\`\`\`bash
chmod +x /opt/scripts/weekly-vuln-scan.sh
\`\`\`

**Programar con cron (todos los domingos a las 03:00):**
\`\`\`bash
crontab -e
# Agregar la siguiente línea:
0 3 * * 0 /opt/scripts/weekly-vuln-scan.sh >> /var/log/weekly-vuln-scan.log 2>&1
\`\`\`

### 📖 Política de gestión de vulnerabilidades (plantilla)

Un programa maduro requiere documentación formal. Secciones mínimas:

**1. Alcance:** todos los sistemas administrados en producción, staging y DMZ.

**2. Roles y responsabilidades:**
- Security team: detección, priorización, reporte ejecutivo
- Sysadmins: remediación dentro del SLA
- CISO: aprobación de excepciones y seguimiento ejecutivo

**3. Tabla de SLAs:**
| Severidad | SLA estándar | Con activo crítico |
|---|---|---|
| Critical / KEV | 24 horas | Inmediato |
| High | 7 días | 3 días |
| Medium | 30 días | 15 días |
| Low | 90 días | 60 días |

**4. Flujo del proceso:**
Detección → Registro en tracker → Priorización → Asignación → Remediación → Verificación → Cierre

**5. Escalación:**
Si un SLA Critical no puede cumplirse, el sysadmin notifica al Security team en menos de 4 horas
para acordar mitigación temporal (WAF rule, desactivar servicio, firewall rule).

### 📋 Lo que debes recordar
* Lynis produce un hardening index — documentar antes y después de cada ciclo de remediación
* El SLA comienza en la detección, no cuando se asigna la tarea
* Nmap con --script vuln identifica CVEs en versiones de servicios en producción
* La automatización con cron y un script de comparación permite detectar regresiones semana a semana
* Un programa de gestión de vulnerabilidades requiere proceso documentado, no solo herramientas

### 🧪 Autoevaluación
1. Ejecutas Lynis y obtienes hardening index 58. Una semana después de aplicar remediaciones obtienes 70. ¿Qué métricas adicionales deberías reportar junto con ese delta para que el reporte sea significativo?
2. nmap detecta Apache 2.4.29 con CVE-2021-41773 (CVSS 7.5 High). El servidor es de producción (criticidad Alta). ¿Cuál es tu SLA de remediación y qué harías si no puedes aplicar el parche en ese plazo?
3. ¿Por qué el script semanal guarda el hardening index anterior en un archivo en lugar de recalcularlo cada vez?

---

1. Además del delta del hardening index, deberías reportar: número de advertencias (!) antes y después, número de vulnerabilidades cerradas, MTTR promedio de las vulnerabilidades cerradas en la semana, y SLA compliance % (cuántas se cerraron dentro del plazo). El índice solo mide configuración de hardening, no el progreso en vulnerabilidades de aplicación.
2. El SLA es de 3 días (activo de producción High). Si no puedes parchear en ese plazo, la mitigación temporal consiste en aplicar una regla de WAF o firewall que bloquee las rutas afectadas (en CVE-2021-41773: bloquear requests con \`../\` en la URL), documentar la excepción con fecha y plan de remediación, y notificar al CISO dentro de las 4 horas siguientes al incumplimiento previsto.
3. Para comparar con el valor de la semana anterior necesitas haberlo persistido en algún lugar. Recalcularlo implicaría guardar el reporte completo anterior y volver a parsearlo, lo que es más frágil. Un archivo con solo el número es la forma más simple y robusta de mantener el estado entre ejecuciones de cron.
`

export default content
