const content = `
## Módulo 5 — Gestión de vulnerabilidades en producción: priorización y remediación

### 🎯 Objetivos de aprendizaje

* Aplicar un framework de priorización de vulnerabilidades más allá del CVSS.
* Entender el concepto de riesgo contextual: un CVE Medium puede ser más urgente que uno Critical.
* Diseñar un proceso de remediación con responsables, plazos y validación.
* Manejar vulnerabilidades en software sin soporte (EOL).

### ❓ El problema real

Tu escáner reporta 200 vulnerabilidades. CVSS dice que 12 son Critical. No puedes parchear todo al mismo tiempo sin afectar la disponibilidad del servicio. Necesitas un framework para decidir: ¿qué va primero? ¿qué puede esperar? ¿qué se acepta como riesgo? La gestión de vulnerabilidades sin priorización es caos — con ella, es un proceso controlable.

### 📖 El problema con CVSS como única métrica

CVSS mide la gravedad intrínseca de una vulnerabilidad — pero no tu riesgo real:

\`\`\`text
CVE-A: CVSS 9.8 (Critical)
  - Afecta Apache Struts
  - Tu empresa no usa Apache Struts
  - Riesgo real para ti: NINGUNO

CVE-B: CVSS 5.4 (Medium)
  - Afecta tu servidor web público
  - Existe exploit público y automatizado
  - El servidor procesa pagos con tarjeta
  - Riesgo real para ti: CRÍTICO INMEDIATO
\`\`\`

### 📖 SSVC: Stakeholder-Specific Vulnerability Categorization

SSVC (desarrollado por CISA y Carnegie Mellon) es un framework de decisión que evalúa:

\`\`\`text
FACTORES DE SSVC:
1. Explotación (Exploitation)
   - None: sin exploit conocido
   - PoC: proof of concept público
   - Active: explotación activa en la naturaleza

2. Impacto en la Misión (Mission Impact)
   - Ninguno: el componente no es crítico
   - Degradación: el servicio funciona con capacidad reducida
   - Fallo: servicio crítico no disponible

3. Bien Público (Public Well-Being Impact)
   - ¿Afecta a terceros? ¿Datos personales? ¿Infraestructura crítica?

ÁRBOL DE DECISIÓN SIMPLIFICADO:
Explotación activa + servicio crítico → ACTUAR AHORA (horas)
Exploit PoC + servicio importante     → ACTUAR PRONTO (días)
Sin exploit + servicio estándar       → PROGRAMAR (próximo ciclo)
Sin exploit + componente no crítico   → ACEPTAR O PROGRAMAR A LARGO PLAZO
\`\`\`

### 📖 Proceso de remediación estructurado

\`\`\`bash
# 1. IDENTIFICACIÓN: generar lista priorizada
cat > /opt/vuln-mgmt/triage.sh << 'SCRIPT'
#!/bin/bash
# Genera reporte priorizado de vulnerabilidades
REPORT_DIR="/var/reports/vulnerabilities/$(date +%Y-%m)"
mkdir -p \${REPORT_DIR}

# Escaneo con trivy
trivy rootfs --format json --output \${REPORT_DIR}/raw.json /

# Filtrar y priorizar
python3 << 'PYTHON'
import json, datetime

with open("\${REPORT_DIR}/raw.json") as f:
    data = json.load(f)

critical = []
high = []
for result in data.get("Results", []):
    for vuln in result.get("Vulnerabilities", []):
        entry = {
            "cve": vuln.get("VulnerabilityID"),
            "package": vuln.get("PkgName"),
            "installed": vuln.get("InstalledVersion"),
            "fixed": vuln.get("FixedVersion", "NO FIX AVAILABLE"),
            "severity": vuln.get("Severity"),
            "cvss": vuln.get("CVSS", {}).get("nvd", {}).get("V3Score", 0)
        }
        if vuln.get("Severity") == "CRITICAL":
            critical.append(entry)
        elif vuln.get("Severity") == "HIGH":
            high.append(entry)

print(f"=== CRÍTICOS ({len(critical)}) ===")
for v in sorted(critical, key=lambda x: x["cvss"], reverse=True):
    print(f"  {v['cve']} - {v['package']} ({v['installed']} → {v['fixed']})")

print(f"\n=== ALTOS ({len(high)}) ===")
for v in sorted(high, key=lambda x: x["cvss"], reverse=True)[:10]:
    print(f"  {v['cve']} - {v['package']} ({v['installed']} → {v['fixed']})")
PYTHON
SCRIPT
chmod +x /opt/vuln-mgmt/triage.sh

# 2. ASIGNACIÓN: crear ticket de remediación
# (integrable con Jira, ServiceNow, o sistema interno)
cat > /opt/vuln-mgmt/create-ticket.sh << 'SCRIPT'
#!/bin/bash
CVE=\$1
SEVERITY=\$2
ASSIGNEE=\$3

case \${SEVERITY} in
  CRITICAL) DUE_DAYS=1 ;;
  HIGH)     DUE_DAYS=7 ;;
  MEDIUM)   DUE_DAYS=30 ;;
  *)        DUE_DAYS=90 ;;
esac

DUE_DATE=$(date -d "+\${DUE_DAYS} days" +%Y-%m-%d)
echo "Ticket: VULN-\$(date +%s)"
echo "CVE: \${CVE}"
echo "Severidad: \${SEVERITY}"
echo "Asignado a: \${ASSIGNEE}"
echo "Fecha límite: \${DUE_DATE}"
SCRIPT
\`\`\`

### 📖 Manejo de software EOL (End of Life)

\`\`\`bash
# Verificar estado de soporte de Ubuntu
ubuntu-security-status 2>/dev/null
# o:
hwe-support-status --verbose

# Ver fecha de EOL de la distribución
cat /etc/os-release
lsb_release -a

# Ubuntu EOL dates (ejemplo):
# Ubuntu 20.04 LTS: Abril 2025 (estándar), Abril 2030 (ESM)
# Ubuntu 22.04 LTS: Abril 2027 (estándar), Abril 2032 (ESM)

# Extended Security Maintenance (Ubuntu Pro / ESM)
pro attach TOKEN   # activar Ubuntu Pro (gratuito hasta 5 máquinas)
pro status         # ver paquetes con cobertura ESM

# Para software específico EOL (ej: Python 2, PHP 7.2):
# Opción 1: Actualizar el software (ideal)
# Opción 2: Aislar en red (si actualización no es posible)
# Opción 3: Monitoreo adicional + WAF si es web
# Opción 4: Aceptación formal de riesgo (documentada)

# Verificar versiones EOL de paquetes críticos
python3 --version  # Python 3.6 EOL desde 2021
php --version      # PHP 7.4 EOL desde 2022
node --version     # Node 14 EOL desde 2023
\`\`\`

### 📖 Excepciones y aceptación de riesgo

No todo puede parchearse inmediatamente. El proceso formal de excepción:

\`\`\`bash
# Plantilla de excepción de riesgo
cat > /opt/vuln-mgmt/risk-exception-template.txt << 'EOF'
EXCEPCIÓN DE RIESGO DE SEGURIDAD

CVE: CVE-XXXX-XXXXX
Severidad: HIGH
Sistema afectado: servidor-pago-01.prod
Fecha de solicitud: $(date +%Y-%m-%d)

RAZÓN DE LA EXCEPCIÓN:
El parche requiere actualización de PHP 8.0 a 8.2. La aplicación de pagos
depende de extensiones que no son compatibles con PHP 8.2. El tiempo de
desarrollo para actualizar es de 3 semanas.

CONTROLES COMPENSATORIOS:
1. WAF habilitado con regla específica para CVE-XXXX-XXXXX
2. Restricción de acceso: solo IPs de la red interna
3. Monitoreo adicional: alertas en tiempo real para patrones de explotación
4. Revisión semanal del estado

FECHA DE REMEDIACIÓN PLANIFICADA: $(date -d "+30 days" +%Y-%m-%d)

APROBADO POR: (firma del responsable de seguridad)
EOF
\`\`\`

### 📋 Lo que debes recordar

* CVSS mide gravedad intrínseca, no tu riesgo contextual — siempre considera exposición, criticidad del sistema y existencia de exploit.
* SSVC simplifica la decisión: explotación activa + sistema crítico = actuar ahora, sin importar el CVSS.
* Las excepciones de riesgo deben ser formales, documentadas y con controles compensatorios y fecha de expiración.
* El software EOL es una deuda de seguridad acumulada — cada nuevo CVE queda sin parche permanentemente.

### 🧪 Autoevaluación

1. Tienes dos CVEs: uno Critical (CVSS 9.1) en un servidor de desarrollo sin acceso externo, y uno Medium (CVSS 5.8) en tu servidor de producción con exploit activo en la web. ¿Cuál tiene mayor urgencia real?
2. ¿Qué son los "controles compensatorios" y por qué son necesarios en las excepciones de riesgo?
3. Un paquete de sistema reporta 15 CVEs pero está marcado como EOL. ¿Cuáles son tus opciones?

---

1. El CVE Medium en producción tiene mayor urgencia real. El CVSS del Critical (9.1) describe su gravedad técnica intrínseca, pero su exposición es mínima (sin acceso externo). El Medium en producción tiene exploit activo, está expuesto a Internet, y afecta a un sistema crítico — el riesgo de explotación real es mucho mayor. Prioridad: 1) producción con exploit, 2) desarrollo crítico.
2. Los controles compensatorios son medidas de seguridad alternativas que reducen el riesgo mientras el parche no puede aplicarse: un WAF que bloquea el patrón de explotación, restricciones de red que limitan quién puede acceder al servicio vulnerable, monitoreo adicional para detectar intentos de explotación. Son necesarios porque una excepción de riesgo sin mitigaciones equivale a aceptar el riesgo sin hacer nada — las auditorías y regulaciones requieren evidencia de que el riesgo se gestiona activamente.
3. Opciones en orden de preferencia: (1) Actualizar a una versión con soporte activo — ideal pero puede requerir trabajo de migración. (2) Aislar el sistema en red interna, sin acceso desde Internet, minimizando superficie de ataque. (3) Activar soporte extendido si está disponible (Ubuntu ESM/Pro, RHEL ELS). (4) Migrar la funcionalidad a un servicio gestionado o diferente tecnología. (5) Documentar formalmente la aceptación del riesgo con fecha límite de migración.
`

export default content
