const content = `
## Módulo 5 — ufw: gestión simplificada del firewall

### 🎯 Objetivos de aprendizaje

* Entender qué es ufw y en qué casos es la herramienta correcta.
* Dominar el flujo básico de operación: enable, allow, deny, delete.
* Configurar políticas por defecto y perfiles de aplicación.
* Saber cuándo ufw es insuficiente y cuándo preferir iptables directo.

### ❓ El problema real

Un sysadmin junior necesita proteger un servidor Ubuntu con nginx y PostgreSQL. Conocer iptables requiere entender tablas, cadenas, hooks y orden de reglas. ufw abstrae toda esa complejidad en comandos como \`ufw allow 'Nginx Full'\`. Para la mayoría de los casos de uso en Ubuntu/Debian, ufw es la herramienta correcta — rápida, segura por defecto y con muy poco margen de error.

### 📖 Qué es ufw

ufw (Uncomplicated Firewall) es un **frontend de alto nivel** desarrollado por Canonical para Ubuntu. Internamente traduce sus comandos a reglas iptables (en sistemas más antiguos) o nftables (en sistemas más nuevos). No reemplaza Netfilter — lo simplifica.

\`\`\`text
USUARIO  ──▶  ufw allow 22/tcp
                     │
                     ▼
              ufw traduce a reglas iptables/nftables
                     │
                     ▼
              Netfilter (kernel) ejecuta las reglas
\`\`\`

ufw está instalado por defecto en Ubuntu y disponible en Debian. En RHEL/CentOS/Fedora, la herramienta equivalente es \`firewalld\`.

### 📖 Flujo básico de operación

\`\`\`bash
# 1. Verificar estado actual
ufw status

# Si está inactivo, la salida es:
# Status: inactive

# 2. Configurar política antes de activar (CRÍTICO: hazlo antes de ufw enable)
ufw default deny incoming
ufw default allow outgoing

# 3. Permitir SSH ANTES de activar (o te bloquearás)
ufw allow 22/tcp

# 4. Activar el firewall
ufw enable

# 5. Verificar
ufw status verbose
\`\`\`

> **Regla de oro**: siempre configura las reglas necesarias (especialmente SSH) **antes** de ejecutar \`ufw enable\`. Una vez activo con política deny, bloquea todo lo que no esté explícitamente permitido.

### 📖 Comandos esenciales

\`\`\`bash
# ── ACTIVACIÓN Y ESTADO ──────────────────────────────────────────────
ufw enable                          # Activar el firewall
ufw disable                         # Desactivar (¡no elimina reglas!)
ufw reload                          # Recargar reglas sin desactivar
ufw reset                           # Resetear a estado por defecto (desactiva ufw)

ufw status                          # Estado resumido
ufw status verbose                  # Estado con políticas y reglas completas
ufw status numbered                 # Estado con número de regla (para borrar)

# ── POLÍTICAS POR DEFECTO ─────────────────────────────────────────────
ufw default deny incoming           # Bloquear todo el tráfico entrante
ufw default allow outgoing          # Permitir todo el tráfico saliente
ufw default deny forward            # Bloquear reenvío (si no es router)

# ── PERMITIR PUERTOS ──────────────────────────────────────────────────
ufw allow 22/tcp                    # Permitir SSH
ufw allow 80/tcp                    # Permitir HTTP
ufw allow 443/tcp                   # Permitir HTTPS
ufw allow 5432/tcp                  # Permitir PostgreSQL

# ── DENEGAR PUERTOS ───────────────────────────────────────────────────
ufw deny 3306/tcp                   # Bloquear MySQL desde cualquier origen
ufw deny 23/tcp                     # Bloquear Telnet

# ── REGLAS CON ORIGEN ESPECÍFICO ──────────────────────────────────────
# Bloquear una IP específica
ufw deny from 203.0.113.5

# Permitir solo desde una red específica a un puerto específico
ufw allow from 10.0.0.0/8 to any port 5432

# Permitir desde una IP específica cualquier tráfico
ufw allow from 192.168.1.50

# Combinar origen, destino y puerto
ufw allow from 10.0.0.0/8 to 10.0.0.10 port 8080 proto tcp

# ── ELIMINAR REGLAS ───────────────────────────────────────────────────
# Método 1: por especificación (igual que el allow/deny)
ufw delete allow 80/tcp

# Método 2: por número (ver número con ufw status numbered)
ufw status numbered
ufw delete 3

# ── LOGGING ───────────────────────────────────────────────────────────
ufw logging on                      # Activar logging (nivel low por defecto)
ufw logging medium                  # Nivel medio: incluye paquetes bloqueados
ufw logging high                    # Nivel alto: incluye paquetes permitidos
ufw logging off                     # Desactivar logging
\`\`\`

### 📖 Perfiles de aplicación

ufw incluye un sistema de perfiles para aplicaciones conocidas. Un perfil define qué puertos debe abrir una aplicación:

\`\`\`bash
# Ver todos los perfiles disponibles
ufw app list

# Salida típica:
# Available applications:
#   Nginx Full
#   Nginx HTTP
#   Nginx HTTPS
#   OpenSSH
#   Apache
#   Apache Full
#   Apache Secure

# Ver qué puertos incluye un perfil
ufw app info 'Nginx Full'
# Profile: Nginx Full
# Title: Web Server (HTTP,HTTPS)
# Description: Small, but very powerful and efficient web server
# Ports: 80,443/tcp

# Usar un perfil
ufw allow 'Nginx Full'
ufw allow 'OpenSSH'

# Eliminar un perfil
ufw delete allow 'Nginx Full'
\`\`\`

Los perfiles se definen en \`/etc/ufw/applications.d/\`. Puedes crear perfiles personalizados para tus aplicaciones.

### 📖 Ver el resultado: status verbose

\`\`\`bash
ufw status verbose
\`\`\`

\`\`\`text
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), deny (forward)
New profiles: skip

To                         Action      From
──                         ──────      ────
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
5432/tcp                   ALLOW IN    10.0.0.0/8
22/tcp (v6)                ALLOW IN    Anywhere (v6)
80/tcp (v6)                ALLOW IN    Anywhere (v6)
443/tcp (v6)               ALLOW IN    Anywhere (v6)
\`\`\`

ufw automáticamente crea reglas para IPv6 cuando aplica. Para deshabilitar IPv6 en ufw, editar \`/etc/default/ufw\` y poner \`IPV6=no\`.

### 📖 Logs de ufw

\`\`\`bash
# Ver logs en tiempo real
journalctl -f | grep UFW

# Ver logs de hoy
journalctl --since today | grep UFW

# Los logs también van a /var/log/ufw.log (en distribuciones con rsyslog)
\`\`\`

Formato de un log de ufw:
\`\`\`text
Aug 04 15:32:01 servidor kernel: [UFW BLOCK] IN=eth0 OUT= MAC=... SRC=203.0.113.5 DST=10.0.0.1 LEN=60 TOS=0x00 PREC=0x00 TTL=50 ID=12345 DF PROTO=TCP SPT=54321 DPT=3306 WINDOW=65535
\`\`\`

Campos clave: \`SRC\` (IP origen), \`DPT\` (puerto destino), \`PROTO\` (protocolo).

### 📖 Cuándo usar ufw vs iptables directo

\`\`\`text
USA UFW cuando:
  • Sistema Ubuntu/Debian con casos de uso estándar
  • Quieres velocidad de configuración y menos errores
  • No necesitas NAT, mangle ni chains personalizadas
  • El servidor tiene un rol simple (web, SSH, DB)

USA IPTABLES/NFTABLES DIRECTO cuando:
  • Necesitas NAT (masquerading, port forwarding)
  • Necesitas chains personalizadas para lógica compleja
  • Trabajas con múltiples interfaces de red y enrutamiento
  • Necesitas control granular sobre el orden exacto de las reglas
  • Sistema RHEL/CentOS (usa firewalld, no ufw)
  • Scripting avanzado de firewall
\`\`\`

> ufw y iptables directo no deben coexistir en el mismo sistema — se pisarán las reglas mutuamente. Elige uno.

### 📋 Lo que debes recordar

* ufw es un frontend; internamente usa iptables o nftables.
* Siempre configura SSH y políticas por defecto **antes** de \`ufw enable\`.
* Los perfiles de aplicación (\`ufw app list\`) simplifican la configuración de software conocido.
* \`ufw status numbered\` + \`ufw delete N\` es la forma más segura de eliminar reglas.
* ufw automáticamente crea reglas IPv4 e IPv6.

### 🧪 Autoevaluación

1. Ejecutas \`ufw enable\` en un servidor remoto sin haber configurado ninguna regla primero. ¿Qué ocurre?
2. ¿Cuál es la diferencia entre \`ufw deny from 1.2.3.4\` y \`ufw deny 80/tcp\`?
3. ¿Por qué no se recomienda usar ufw y iptables directo simultáneamente en el mismo servidor?

---

1. Si la política por defecto es \`deny incoming\` (que es lo recomendado), **pierdes acceso SSH inmediatamente** porque no hay regla que permita el puerto 22. Debes crear la regla antes de activar ufw.
2. \`ufw deny from 1.2.3.4\` bloquea **toda comunicación** de esa IP específica (todos los puertos). \`ufw deny 80/tcp\` bloquea el puerto 80 TCP **para cualquier IP** (origen no especificado).
3. Porque ambas herramientas escriben en las mismas cadenas de iptables/Netfilter. Las reglas pueden **interferirse entre sí** — ufw puede sobrescribir reglas manuales al recargar, o las reglas manuales pueden filtrarse antes de que ufw las evalúe, generando comportamiento impredecible.
`

export default content
