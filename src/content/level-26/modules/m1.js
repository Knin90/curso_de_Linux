const content = `
## Módulo 1 — CVE, NVD y el ecosistema de vulnerabilidades

### 🎯 Objetivos de aprendizaje

* Entender qué es un CVE y cómo se estructura su identificador.
* Navegar la NVD (National Vulnerability Database) para investigar vulnerabilidades.
* Comprender el ciclo de vida de una vulnerabilidad desde el descubrimiento hasta el parche.
* Usar herramientas de línea de comandos para consultar CVEs relevantes a paquetes instalados.

### ❓ El problema real

Recibes una alerta a las 2 AM: "CVE-2024-XXXX crítico afecta a OpenSSL". Sin entender el ecosistema de vulnerabilidades, no sabes si tu sistema está afectado, qué versión soluciona el problema, ni cómo priorizar la respuesta. El caos no viene de la vulnerabilidad en sí — viene de no tener un proceso para evaluarla y responder sistemáticamente.

### 📖 Anatomía de un CVE

CVE (Common Vulnerabilities and Exposures) es un identificador único para vulnerabilidades de seguridad conocidas públicamente. Lo mantiene MITRE Corporation y cada entrada tiene formato:

\`\`\`text
CVE-AÑO-NÚMERO
│    │      │
│    │      └── Número secuencial (puede tener más de 4 dígitos desde 2014)
│    └────────── Año de asignación o descubrimiento
└─────────────── Prefijo estándar

Ejemplos:
CVE-2021-44228   → Log4Shell (Apache Log4j)
CVE-2022-0847    → Dirty Pipe (kernel Linux)
CVE-2023-44487   → HTTP/2 Rapid Reset Attack
\`\`\`

Un CVE describe QUÉ es la vulnerabilidad. No cómo explotarla ni cómo parchearla — para eso existen otras bases de datos.

### 📖 La NVD y el enriquecimiento de CVEs

La NVD (National Vulnerability Database) del NIST toma los CVEs de MITRE y los enriquece con:

- **Puntuación CVSS** (gravedad numérica 0.0-10.0)
- **Vector de ataque** (cómo se explota: red, local, físico)
- **CWE** (tipo de debilidad: buffer overflow, injection, etc.)
- **Referencias** (advisories, parches, exploits públicos)
- **CPE** (plataformas afectadas en formato estándar)

\`\`\`bash
# Consultar NVD via API (requiere API key para uso intensivo)
curl -s "https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-44228" | \
  python3 -m json.tool | grep -A5 "descriptions"

# Herramienta vulners-cli para búsquedas
pip3 install vulners
vulners cve CVE-2021-44228

# cve-search: base de datos local de CVEs
git clone https://github.com/cve-search/cve-search
cd cve-search
pip3 install -r requirements.txt
./sbin/db_mgmt_cpe_dictionary.py -p   # poblar CPE
./sbin/db_mgmt.py -p                   # poblar CVEs
./bin/search.py -p openssl             # buscar por producto
\`\`\`

### 📖 Ciclo de vida de una vulnerabilidad

\`\`\`text
DESCUBRIMIENTO
    │
    ▼
COORDINACIÓN CON VENDOR (embargo típico: 90 días)
    │
    ▼
ASIGNACIÓN DE CVE (puede ser antes o después del parche)
    │
    ├─→ PARCHE DISPONIBLE → publicación coordinada (CVD)
    │
    └─→ 0-DAY: explotación pública antes del parche
    │
    ▼
PUBLICACIÓN EN NVD (puede tomar días o semanas después del CVE)
    │
    ▼
DISTRIBUCIONES EMPAQUETAN EL PARCHE
    │
    ▼
PARCHE DISPONIBLE EN REPOSITORIOS
    │
    ▼
ADMINISTRADORES APLICAN EL PARCHE ← aquí estamos nosotros
\`\`\`

**La ventana de riesgo** es el tiempo entre la publicación del CVE y la aplicación del parche. En sistemas críticos esta ventana debe medirse en horas para CVEs críticos.

### 📖 Fuentes de inteligencia de vulnerabilidades

\`\`\`bash
# 1. Advisories oficiales de distribuciones
# Ubuntu Security Notices (USN):
#   https://ubuntu.com/security/notices

# 2. OSV (Open Source Vulnerabilities) — multi-ecosistema
curl -s "https://api.osv.dev/v1/query" \
  -d '{"package": {"name": "openssl", "ecosystem": "Debian"}}' \
  -H "Content-Type: application/json" | python3 -m json.tool

# 3. Debian Security Tracker
curl -s "https://security-tracker.debian.org/tracker/data/json" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); \
  print(list(d.get('openssl',[]).keys())[:5])"

# 4. OVAL (Open Vulnerability and Assessment Language)
# Definitions para Ubuntu:
curl -O "https://people.canonical.com/~ubuntu-security/oval/com.ubuntu.focal.usn.oval.xml.bz2"
bunzip2 com.ubuntu.focal.usn.oval.xml.bz2
# Analizar con oscap
oscap oval eval --results oval-results.xml com.ubuntu.focal.usn.oval.xml
\`\`\`

### 📖 Herramientas de inventario y correlación

Para saber si un CVE te afecta, necesitas saber qué tienes instalado y qué versiones:

\`\`\`bash
# Inventario de paquetes instalados (Debian/Ubuntu)
dpkg -l | grep "^ii" | awk '{print \$2, \$3}' > /tmp/packages.txt

# Verificar si un paquete específico tiene CVEs abiertos
# Con grype (Anchore) — escaner de vulnerabilidades moderno
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh
grype dir:/usr/lib/ssl            # escanear directorio
grype ubuntu:22.04               # escanear imagen base
grype --output table dir:/       # sistema completo (lento)

# Con trivy (Aqua Security) — muy usado en CI/CD
apt-get install -y trivy          # o via repositorio oficial
trivy rootfs /                    # sistema de archivos raíz
trivy image ubuntu:22.04          # imagen Docker
trivy --severity CRITICAL,HIGH rootfs /  # solo críticos y altos

# Salida típica de trivy:
# Total: 47 (CRITICAL: 3, HIGH: 12, MEDIUM: 22, LOW: 10)
\`\`\`

### 📋 Lo que debes recordar

* CVE = identificador; NVD = base de datos enriquecida con CVSS y referencias.
* El ciclo de vida va de descubrimiento a parche — la ventana de riesgo es lo que hay que minimizar.
* Para saber si te afecta un CVE necesitas: versión instalada + versión fija anunciada en el advisory.
* Grype y Trivy son herramientas modernas que correlacionan paquetes instalados con CVEs automáticamente.

### 🧪 Autoevaluación

1. ¿Por qué un CVE puede existir en NVD sin puntuación CVSS durante días o semanas?
2. ¿Qué diferencia hay entre un "zero-day" y una vulnerabilidad con CVE asignado?
3. ¿Cómo determinas si CVE-2021-44228 (Log4Shell) afecta a tu sistema Linux?

---

1. La asignación del CVE la hace MITRE o un CNA (CVE Numbering Authority) y puede ocurrir antes de que el NIST termine el análisis que produce la puntuación CVSS. El enriquecimiento en NVD toma tiempo adicional. Por eso a veces ves CVEs marcados como "AWAITING ANALYSIS" o "UNDERGOING ANALYSIS".
2. Un zero-day es una vulnerabilidad que se explota activamente antes de que exista un parche — puede o no tener CVE asignado. Una vulnerabilidad con CVE asignado tiene al menos reconocimiento público; si además tiene parche disponible, ya no es un zero-day en sentido estricto.
3. Log4Shell afecta a Log4j (Java). Los pasos: (1) verificar si tienes Java instalado (\`java -version\`), (2) buscar JARs de log4j (\`find / -name "log4j*.jar" 2>/dev/null\`), (3) si usas apps Java (Elasticsearch, Jenkins, etc.), revisar sus advisories específicos para saber qué versión las parchea.
`

export default content
