const content = `
## Módulo 1 — Principios de hardening: superficie de ataque y defensa en profundidad

### 🎯 Objetivos de aprendizaje
* Definir superficie de ataque y saber cómo medirla en un servidor real
* Aplicar el principio de mínimo privilegio a servicios, usuarios y archivos
* Comprender las capas del modelo de defensa en profundidad
* Identificar los frameworks CIS y STIG como referencias de hardening
* Comparar la exposición de un servidor Ubuntu por defecto frente a uno endurecido

---

### ❓ El problema real

Acabas de entregar un servidor Ubuntu 24.04 a producción. Tiene nginx corriendo, una app en Python y acceso SSH. El cliente está contento. Tres semanas después recibes una alerta: el servidor está enviando tráfico a una IP rusa. La investigación revela que avahi-daemon tenía una vulnerabilidad conocida, el servidor respondía a redirects ICMP, root podía entrar por SSH con contraseña, y un binario SUID sin justificación permitió escalar privilegios.

Ninguno de esos vectores tenía relación con la aplicación. Todos eran superficie de ataque innecesaria que nunca debió existir en producción.

---

### 📖 Superficie de ataque: definición operativa

La superficie de ataque es el conjunto de todos los puntos donde un atacante puede intentar introducir o extraer datos, ejecutar código, o elevar privilegios. Se divide en tres dimensiones:

**Superficie de red**: puertos abiertos, protocolos activos, interfaces expuestas.
**Superficie del sistema**: binarios SUID, servicios corriendo como root, daemons innecesarios.
**Superficie humana**: cuentas de usuario, contraseñas débiles, claves SSH sin protección.

Reducir la superficie de ataque no elimina vulnerabilidades — las oculta o las hace inaccesibles. Un servicio con una CVE crítica que no está instalado no es un riesgo.

**Auditoría rápida de superficie en un servidor nuevo:**

\`\`\`bash
# Puertos escuchando
ss -tlnp

# Servicios activos
systemctl list-units --type=service --state=running

# Binarios con SUID
find / -perm -4000 -type f 2>/dev/null

# Usuarios con shell válida
awk -F: '\$7 !~ /nologin|false/' /etc/passwd

# Conexiones de red activas
ss -tnp state established
\`\`\`

---

### 📖 Principio de mínimo privilegio

Todo proceso, usuario y archivo debe tener exactamente los permisos necesarios para su función — ni uno más.

En la práctica:

| Elemento | Mal aplicado | Bien aplicado |
|---|---|---|
| Servicio web | Corre como root | Corre como www-data |
| Archivo de config | chmod 644 con secrets | chmod 600, propietario = daemon |
| Usuario de app | Tiene sudo completo | Sin sudo, sin shell interactiva |
| Clave SSH | Una sola clave para todos | Clave por persona, rotación periódica |
| Base de datos | Usuario root en app | Usuario con permisos solo sobre su DB |

\`\`\`bash
# Crear usuario de servicio sin shell ni home
useradd -r -s /usr/sbin/nologin -M myapp

# Ejecutar servicio bajo ese usuario
# En /etc/systemd/system/myapp.service:
# [Service]
# User=myapp
# Group=myapp

# Verificar que el proceso no corre como root
ps aux | grep myapp
\`\`\`

---

### 📖 Defensa en profundidad: las capas

No existe una sola medida que proteja un sistema. La defensa en profundidad asume que cualquier capa puede fallar y diseña el sistema para que ese fallo no sea suficiente para comprometer el todo.

**Capa 1 — Física**: acceso físico al hardware. Si alguien tiene acceso físico, el juego termina sin otras protecciones. Centros de datos con control de acceso, discos cifrados (LUKS).

**Capa 2 — Red**: firewalls, segmentación de VLANs, IDS/IPS, VPN para administración. Un atacante que no puede llegar al puerto no puede explotar el servicio.

**Capa 3 — Host**: hardening del SO, actualizaciones, configuración de kernel (sysctl), auditoría de procesos y archivos. Si atravesó la red, el sistema debe resistir.

**Capa 4 — Aplicación**: validación de entrada, autenticación robusta, gestión de sesiones, principio de mínimo privilegio en código. Si el SO fue comprometido, la aplicación debe limitar el daño.

**Capa 5 — Datos**: cifrado en reposo y en tránsito, backups fuera del servidor, control de acceso a base de datos. Los datos son el objetivo final.

**Capa 6 — Monitoreo**: logs centralizados, alertas, SIEM. Si todo lo demás falla, necesitas saberlo rápido.

Un atacante que rompe la capa 2 (red) todavía enfrenta el host endurecido (capa 3), y aunque comprometa el proceso de aplicación (capa 4), los datos están cifrados (capa 5) y la actividad anómala genera alertas (capa 6).

---

### 📖 Frameworks de referencia: CIS y STIG

**CIS Benchmarks** (Center for Internet Security): guías de configuración segura publicadas por consenso entre expertos. Existen para Ubuntu, RHEL, Debian, nginx, MySQL, y docenas de otras tecnologías. Cada control tiene dos niveles:

- **Nivel 1**: configuraciones básicas, bajo impacto operativo. Adecuado para la mayoría de servidores.
- **Nivel 2**: configuraciones más restrictivas, puede afectar funcionalidad. Para entornos de alta seguridad.

Cada control incluye: descripción del riesgo, cómo verificar el estado actual, y cómo remediarlo.

**STIG** (Security Technical Implementation Guides): equivalente del Departamento de Defensa de EE.UU. Más estricto que CIS, orientado a entornos gubernamentales y militares. Cada control tiene una severidad (CAT I, II, III).

Para un servidor de producción comercial, CIS Benchmark Nivel 1 es el punto de partida estándar.

---

### 📖 Servidor por defecto vs. servidor endurecido

**Ubuntu 24.04 recién instalado — exposición típica:**

\`\`\`bash
# ss -tlnp en servidor por defecto
State   Recv-Q  Send-Q  Local Address:Port
LISTEN  0       4096    0.0.0.0:22          # SSH
LISTEN  0       128     0.0.0.0:25          # postfix (si instalado)
LISTEN  0       4096    127.0.0.53:53       # systemd-resolved
LISTEN  0       4096    0.0.0.0:5353        # avahi-daemon (mDNS)
LISTEN  0       4096    0.0.0.0:631         # cups (impresión)

# Servicios corriendo
snapd.service           active running
avahi-daemon.service    active running
cups.service            active running
ModemManager.service    active running
bluetooth.service       active running
\`\`\`

**Mismo servidor después de hardening básico:**

\`\`\`bash
# ss -tlnp después de hardening
State   Recv-Q  Send-Q  Local Address:Port
LISTEN  0       4096    0.0.0.0:2222        # SSH en puerto no estándar
LISTEN  0       4096    127.0.0.53:53       # systemd-resolved (solo loopback)

# Servicios corriendo (solo lo necesario)
ssh.service             active running
systemd-resolved        active running
\`\`\`

La reducción es dramática: de 5 puertos a 2, de múltiples servicios innecesarios a cero.

---

### 📖 Checklist de hardening: el enfoque sistemático

El hardening no es una lista de comandos a ejecutar una vez. Es un proceso:

1. **Inventario**: ¿qué hay instalado? ¿qué corre? ¿qué escucha?
2. **Clasificar**: ¿cada elemento es necesario? ¿quién lo necesita?
3. **Eliminar**: desinstalar o deshabilitar lo que no se necesita
4. **Configurar**: aplicar configuración segura a lo que sí se necesita
5. **Verificar**: confirmar que los cambios tuvieron efecto
6. **Documentar**: registrar qué se hizo y por qué
7. **Mantener**: aplicar el proceso después de cada cambio

\`\`\`bash
# Script de inventario inicial (guardar antes de hardening)
echo "=== PUERTOS ===" > /root/pre-hardening-audit.txt
ss -tlnp >> /root/pre-hardening-audit.txt

echo "=== SERVICIOS ===" >> /root/pre-hardening-audit.txt
systemctl list-units --type=service --state=running >> /root/pre-hardening-audit.txt

echo "=== USUARIOS ===" >> /root/pre-hardening-audit.txt
awk -F: '\$3 >= 1000 && \$7 !~ /nologin/' /etc/passwd >> /root/pre-hardening-audit.txt

echo "=== SUID ===" >> /root/pre-hardening-audit.txt
find / -perm -4000 -type f 2>/dev/null >> /root/pre-hardening-audit.txt

echo "Auditoría guardada en /root/pre-hardening-audit.txt"
\`\`\`

Guardar este snapshot antes de cualquier cambio permite comparar el estado inicial con el final y detectar regresiones futuras.

---

### 📋 Lo que debes recordar
* La superficie de ataque es todo punto de entrada posible — reducirla es la primera medida de seguridad
* El principio de mínimo privilegio aplica a usuarios, procesos, archivos y conexiones de red
* La defensa en profundidad asume que cualquier capa puede fallar; diseña para ello
* CIS Benchmark Nivel 1 es el estándar de referencia para servidores comerciales
* Siempre hacer un inventario antes de hardening para poder comparar después

---

### 🧪 Autoevaluación

1. Un servidor tiene postfix instalado pero no envía correo; la aplicación usa un relay externo. ¿Qué acción tomas y por qué?
2. Un proceso de aplicación necesita leer un archivo de configuración con credenciales de base de datos. ¿Qué permisos y propietario asignas al archivo?
3. ¿Cuál es la diferencia entre CIS Benchmark Nivel 1 y Nivel 2? ¿Cuándo usarías cada uno?

---

1. Deshabilitar y desinstalar postfix: si no cumple función, es superficie de ataque innecesaria. \`systemctl disable --now postfix && apt remove postfix\`.
2. Propietario: el usuario del proceso de aplicación (ej. myapp). Permisos: \`chmod 600\` para que solo el propietario pueda leerlo. Nunca world-readable.
3. Nivel 1 es de bajo impacto operativo, adecuado para casi todos los servidores. Nivel 2 es más restrictivo y puede romper funcionalidad; se usa en entornos de alta seguridad (gobierno, finanzas, salud).
`

export default content
