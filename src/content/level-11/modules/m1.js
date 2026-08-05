const content = `
## Módulo 1 — Arquitectura de logs: syslog, journald y rsyslog

### 🎯 Objetivos de aprendizaje

* Entender por qué los logs son la primera herramienta de diagnóstico en producción.
* Conocer la evolución de syslog a journald y rsyslog.
* Distinguir qué sistema gestiona los logs en tu distribución.
* Comprender la estructura de un mensaje de log: facility, severity y formato.

### ❓ El problema real

Un proceso falla silenciosamente a las 3 AM. El servidor responde pero la aplicación no funciona. Sin logs, estás ciego: no sabes qué pasó, cuándo empezó ni si fue un error de hardware, de configuración o de código. Los logs no son un detalle opcional — son el sistema nervioso del servidor. Entender su arquitectura determina si puedes diagnosticar el problema en 2 minutos o en 2 horas.

### 📖 La evolución del logging en Linux

\`\`\`text
HISTORIA DEL LOGGING EN LINUX
══════════════════════════════════════════════════════════════
1980s  syslog         Protocolo original. UDP 514. Texto plano.
                      Aún el estándar de red entre sistemas.

2004   rsyslog        "Rocket-fast syslog". Backward-compatible,
                      con filtros, módulos, TCP/TLS, bases de datos.

2012   systemd-journald  Binario, estructurado, indexado. Integrado
                         con systemd units. No reemplaza rsyslog:
                         los dos coexisten.
══════════════════════════════════════════════════════════════
\`\`\`

### 📖 Cómo conviven journald y rsyslog

En un sistema moderno con systemd, los dos trabajan juntos:

\`\`\`text
┌─────────────────────────────────────────────────────────────┐
│                        PROCESO / KERNEL                     │
│   stdout/stderr   │   syslog()   │   journald API           │
└──────────┬────────┴───────┬──────┴──────────┬──────────────┘
           │                │                 │
           └────────────────┴─────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  systemd-      │   ← recibe TODO primero
                   │  journald      │   ← almacena en /run/log/journal
                   └────────┬───────┘     o /var/log/journal
                            │
                     (socket /run/systemd/journal/syslog)
                            │
                            ▼
                   ┌────────────────┐
                   │    rsyslog     │   ← lee desde journald
                   └────────┬───────┘   ← escribe a archivos de texto
                            │             /var/log/syslog, auth.log, etc.
                            ▼           ← puede reenviar a servidor remoto
                   /var/log/*.log
\`\`\`

**journald** captura primero — incluso antes de que el sistema de archivos esté montado al arranque. **rsyslog** lee de journald y escribe los archivos de texto clásicos.

### 📖 Estructura de un mensaje syslog

Todo mensaje de log tiene tres campos fundamentales:

\`\`\`text
FACILITY: quién genera el mensaje
──────────────────────────────────────────────────────────
kern       Mensajes del kernel
user       Procesos de usuario genéricos
mail       Subsistema de correo
daemon     Daemons del sistema (sshd, cron, etc.)
auth       Autenticación y seguridad
syslog     El propio syslogd
lpr        Sistema de impresión
news       Sistema de news (NNTP)
local0-7   Disponibles para aplicaciones personalizadas

SEVERITY: qué tan grave es (0 = más grave)
──────────────────────────────────────────────────────────
0  emerg    Sistema inutilizable (panic)
1  alert    Se requiere acción inmediata
2  crit     Condición crítica (hardware failure)
3  err      Condición de error
4  warning  Condición de advertencia
5  notice   Normal pero significativo
6  info     Mensaje informativo
7  debug    Mensajes de depuración
\`\`\`

Un selector syslog se escribe como \`facility.severity\`:

\`\`\`text
kern.crit          → mensajes del kernel con severidad crítica o mayor
auth.warning       → autenticación con severidad warning o mayor
*.err              → cualquier facility con error o mayor
daemon.*           → todos los mensajes de daemons
\`\`\`

### 📖 Dónde viven los logs

\`\`\`text
/var/log/
├── syslog          (Debian/Ubuntu) — mensajes generales del sistema
├── messages        (RHEL/Fedora)   — equivalente a syslog
├── auth.log        (Debian/Ubuntu) — autenticación: ssh, sudo, login
├── secure          (RHEL/Fedora)   — equivalente a auth.log
├── kern.log        — mensajes del kernel
├── dmesg           — buffer del anillo del kernel (arranque)
├── cron.log / cron — trabajos de cron
├── mail.log        — subsistema de correo
├── apt/            — historial de paquetes (Debian/Ubuntu)
├── nginx/          — access.log y error.log (si instalado)
└── journal/        — logs binarios de journald (si persistentes)

/run/log/journal/   — logs de journald en RAM (volátiles, hasta reinicio)
\`\`\`

Verificar cuál sistema de logging está activo:

\`\`\`bash
# ¿Está journald activo?
systemctl status systemd-journald

# ¿Está rsyslog activo?
systemctl status rsyslog

# ¿Los logs de journald persisten entre reinicios?
ls /var/log/journal/
# Si el directorio existe y tiene contenido: persistentes
# Si está vacío o no existe: volátiles (solo en RAM)
\`\`\`

Para hacer los logs de journald persistentes:

\`\`\`bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald
\`\`\`

### 📋 Lo que debes recordar

* journald captura primero todos los logs; rsyslog los consume para generar archivos de texto.
* Un selector syslog es \`facility.severity\`: conocer los niveles de severidad es fundamental para filtrar ruido.
* Por defecto, journald puede ser volátil — los logs desaparecen al reiniciar si no configuras persistencia.
* /var/log/auth.log (o /var/log/secure en RHEL) es siempre el primer lugar a revisar ante un incidente de seguridad.

### 🧪 Autoevaluación

1. Un proceso escribe a stderr. ¿Cuál de los dos sistemas lo captura primero: journald o rsyslog?
2. ¿Qué selector syslog usarías para capturar solo errores críticos del kernel?
3. ¿Por qué los logs de journald pueden desaparecer tras un reinicio?

---

1. **journald** lo captura primero. systemd-journald intercepta stdout/stderr de todos los procesos que gestiona systemd. rsyslog los lee después a través del socket de journald.
2. \`kern.crit\` captura mensajes del kernel con severidad crítica (nivel 2) o superior (alert y emerg).
3. Porque por defecto journald almacena en \`/run/log/journal/\` que es un filesystem tmpfs en RAM. Al reiniciar se borra. Solo persiste si el directorio \`/var/log/journal/\` existe y tiene los permisos correctos.
`

export default content
