const content = `
## Módulo 3 — OpenVAS y Nessus: escaneo de vulnerabilidades

### 🎯 Objetivos de aprendizaje

* Entender la diferencia entre un escáner de vulnerabilidades y un escáner de puertos.
* Instalar y configurar Greenbone/OpenVAS para escaneos básicos.
* Interpretar los resultados de un escaneo y priorizar hallazgos.
* Conocer Nessus Essentials como alternativa gratuita para entornos pequeños.

### ❓ El problema real

\`nmap\` te dice qué puertos están abiertos. Un escáner de vulnerabilidades te dice qué servicios detrás de esos puertos tienen CVEs conocidos, configuraciones inseguras o versiones desactualizadas. Son herramientas complementarias, no alternativas. Sin escaneo activo de vulnerabilidades, solo sabes lo que tienes — no lo que está roto.

### 📖 Arquitectura de Greenbone/OpenVAS

Greenbone Vulnerability Manager (GVM) es la plataforma open source detrás de OpenVAS:

\`\`\`diagram
{"type":"table-like","title":"Greenbone Security Manager","rows":[{"key":"GSA (Web UI)","value":"puerto 9392"},{"key":"gvm-cli","value":"GMP API"},{"key":"OpenVAS Scanner","value":"motor de checks"},{"key":"Feed","value":"70,000+ NVTs (plugins) · Greenbone Community Feed, actualización diaria"},{"value":"NVT = Network Vulnerability Test — cada plugin verifica una vulnerabilidad específica"}]}
\`\`\`

### 📖 Instalación de Greenbone/OpenVAS

\`\`\`bash
# Ubuntu/Debian — método recomendado: contenedor Docker oficial
docker run -d \
  --name openvas \
  -p 9392:9392 \
  -e PASSWORD=admin123 \
  -v openvas_data:/data \
  greenbone/community-edition

# Esperar a que se sincronice el feed (puede tardar 15-30 minutos)
docker logs -f openvas | grep -E "sync|complete|error"

# Acceder a la interfaz web:
# https://localhost:9392 (usuario: admin, contraseña: admin123)

# ── Instalación nativa en Kali Linux ───────────────────────
# Kali incluye GVM pre-empaquetado:
sudo apt-get install -y gvm
sudo gvm-setup        # configuración inicial (tarda mucho, descarga feeds)
sudo gvm-check-setup  # verificar que todo está OK
sudo gvm-start        # iniciar los servicios
# Web UI: https://localhost:9392

# Actualizar feeds manualmente
sudo runuser -u _gvm -- greenbone-nvt-sync
sudo runuser -u _gvm -- greenbone-feed-sync --type SCAP
sudo runuser -u _gvm -- greenbone-feed-sync --type CERT
\`\`\`

### 📖 Uso de gvm-cli para escaneos automatizados

\`\`\`bash
# Instalar cliente
pip3 install gvm-tools

# Conectar al GVM
gvm-cli --gmp-username admin --gmp-password admin123 \
  socket --socketpath /run/gvmd/gvmd.sock \
  --xml "<get_version/>"

# Script Python para crear y ejecutar un escaneo
cat > /opt/scripts/gvm_scan.py << 'SCRIPT'
from gvm.connections import UnixSocketConnection
from gvm.protocols.gmp import Gmp
from gvm.transforms import EtreeCheckCommandTransform
import time

conn = UnixSocketConnection(path='/run/gvmd/gvmd.sock')
transform = EtreeCheckCommandTransform()

with Gmp(connection=conn, transform=transform) as gmp:
    gmp.authenticate('admin', 'admin123')

    # Obtener el ID del scan config "Full and Fast"
    configs = gmp.get_scan_configs()
    full_fast_id = None
    for config in configs.findall('config'):
        if 'Full and fast' in config.find('name').text:
            full_fast_id = config.get('id')
            break

    # Crear target
    target = gmp.create_target(
        name='Servidor Web',
        hosts='192.168.1.10',
        port_list_id='730ef368-57e2-11e1-a90f-406186ea4fc5'  # "All IANA assigned TCP"
    )
    target_id = target.get('id')

    # Crear y lanzar tarea
    task = gmp.create_task(
        name='Escaneo Servidor Web',
        config_id=full_fast_id,
        target_id=target_id,
        scanner_id='08b69003-5fc2-4037-a479-93b440211c73'  # OpenVAS scanner
    )
    task_id = task.get('id')

    gmp.start_task(task_id)
    print(f"Escaneo iniciado. Task ID: {task_id}")
SCRIPT

python3 /opt/scripts/gvm_scan.py
\`\`\`

### 📖 Nessus Essentials: alternativa gratuita

Nessus Essentials de Tenable es gratuito para hasta 16 IPs:

\`\`\`bash
# Descargar desde https://www.tenable.com/products/nessus/nessus-essentials
# (requiere registro de email para obtener código de activación)

# Instalar en Debian/Ubuntu
dpkg -i Nessus-10.x.x-debian10_amd64.deb
systemctl enable --now nessusd

# Acceder a la interfaz web:
# https://localhost:8834

# ── Nessus desde línea de comandos ──────────────────────────
# nessuscli para gestión básica
/opt/nessus/sbin/nessuscli fix --list         # ver configuración
/opt/nessus/sbin/nessuscli update             # actualizar plugins
/opt/nessus/sbin/nessuscli fetch --register CODE_ACTIVACION

# Exportar resultados como CSV
# (esto se hace desde la UI web → Reports → Export)
# O via API REST:
curl -k -X POST https://localhost:8834/session \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -m json.tool
\`\`\`

### 📖 Interpretar resultados de un escaneo

\`\`\`text
SEVERIDAD    CVSS    ACCIÓN TÍPICA
──────────────────────────────────────────────────────────────
Critical     9.0-10  Parchear en <24 horas (si hay exploit activo: horas)
High         7.0-8.9 Parchear en la próxima ventana de mantenimiento (<7 días)
Medium       4.0-6.9 Parchear en el próximo ciclo de parches (<30 días)
Low          0.1-3.9 Incluir en backlog, parchear oportunísticamente
Info         N/A     Configuración informativa, sin riesgo directo
\`\`\`

Hallazgos clave a revisar primero:
- **Exploit público disponible**: multiplicador de urgencia
- **Acceso sin autenticación**: superficie de ataque máxima
- **Software sin soporte (EOL)**: todos los CVEs futuros quedarán sin parche

\`\`\`bash
# Generar reporte en texto desde OpenVAS CLI
gvm-cli --gmp-username admin --gmp-password admin123 \
  socket --xml "<get_reports report_id='UUID' format_id='texto-plano-uuid'/>" \
  > reporte_vulnerabilidades.txt

# Filtrar solo críticos y altos
grep -E "(Critical|High)" reporte_vulnerabilidades.txt | sort -u
\`\`\`

### 📋 Lo que debes recordar

* OpenVAS/Greenbone usa NVTs (plugins) — necesita feeds actualizados para detectar vulnerabilidades recientes.
* Un escaneo autenticado (con credenciales SSH/SMB al objetivo) es 10x más preciso que uno sin autenticación.
* Nessus Essentials es gratuito hasta 16 IPs — suficiente para infraestructuras pequeñas.
* Los resultados "Info" no son vulnerabilidades pero revelan superficie de ataque: servicios innecesarios, versiones expuestas, etc.

### 🧪 Autoevaluación

1. ¿Por qué un escaneo autenticado encuentra más vulnerabilidades que uno sin autenticación?
2. Tu escaneo reporta OpenSSH con CVE-2023-XXXX (Medium, CVSS 5.3). El sistema tiene una ventana de mantenimiento en 3 semanas. ¿Es apropiado esperar?
3. ¿Qué significa que un hallazgo tenga "exploit público disponible" y cómo cambia la prioridad?

---

1. Sin autenticación, el escáner solo puede verificar versiones de servicios expuestos en red. Con credenciales SSH, puede hacer lo mismo que un administrador: listar paquetes instalados, leer configuraciones, verificar permisos, etc. El escaneo autenticado detecta vulnerabilidades en software no expuesto en red, configuraciones incorrectas del sistema, y software instalado pero no escuchando en red.
2. Para un CVE Medium (CVSS 5.3), esperar 3 semanas es aceptable según las políticas típicas de SLA. Sin embargo, debes verificar: ¿hay exploit público? ¿está expuesto externamente? Si alguna de esas condiciones es verdad, eleva la prioridad.
3. Un exploit público significa que herramientas automáticas pueden atacar tu sistema sin conocimiento especializado. Cambia la probabilidad de explotación de "teórica" a "alta". Un CVE Medium con exploit público se trata como High o Critical en la práctica — el tiempo de remediación debe reducirse significativamente.
`

export default content
