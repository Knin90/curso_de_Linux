const content = `
## Módulo 2 — Hardening del kernel: sysctl y parámetros de seguridad de red

### 🎯 Objetivos de aprendizaje
* Entender qué es sysctl y cómo persisten sus configuraciones
* Aplicar parámetros de seguridad de red para proteger contra ataques comunes
* Configurar restricciones de kernel para limitar filtrado de información
* Verificar que los parámetros aplicados están activos en tiempo de ejecución
* Organizar configuraciones en /etc/sysctl.d/ siguiendo buenas prácticas

---

### ❓ El problema real

Un servidor de producción acepta redirects ICMP de cualquier origen. Un atacante en la misma red puede redirigir tráfico a través de su máquina (man-in-the-middle). El servidor también tiene ip_forward habilitado de una instalación anterior de Docker que ya no se usa — cualquier paquete puede ser reenviado. El kernel expone punteros de memoria en /proc/kallsyms, lo que ayuda a construir exploits de kernel. Ninguno de estos problemas requiere que la aplicación tenga un bug. Son configuraciones por defecto inseguras del kernel Linux.

---

### 📖 sysctl: el sistema de parámetros del kernel

sysctl es la interfaz para leer y modificar parámetros del kernel en tiempo de ejecución. Los parámetros viven en /proc/sys/ como archivos virtuales. sysctl provee una capa de abstracción con nombres legibles.

\`\`\`bash
# Ver todos los parámetros actuales
sysctl -a

# Ver un parámetro específico
sysctl net.ipv4.ip_forward

# Cambio temporal (se pierde al reiniciar)
sysctl -w net.ipv4.ip_forward=0

# Verificar directamente en /proc/sys
cat /proc/sys/net/ipv4/ip_forward
\`\`\`

**Persistencia con archivos de configuración:**

Los cambios temporales con \`sysctl -w\` no sobreviven un reinicio. Para hacerlos permanentes:

\`\`\`bash
# Archivo principal (no recomendado para tus cambios)
/etc/sysctl.conf

# Directorio de drop-ins (recomendado)
/etc/sysctl.d/

# Convención de nombres: prefijo numérico para orden de carga
/etc/sysctl.d/10-network-security.conf
/etc/sysctl.d/20-kernel-hardening.conf
/etc/sysctl.d/30-filesystem-hardening.conf

# Aplicar todos los archivos sin reiniciar
sysctl -p /etc/sysctl.d/10-network-security.conf
sysctl --system   # aplica todos los archivos en orden
\`\`\`

Los archivos en /etc/sysctl.d/ se cargan en orden alfabético. El prefijo numérico controla la precedencia — un número mayor sobreescribe uno menor si definen el mismo parámetro.

---

### 📖 Parámetros de seguridad de red

**Crear /etc/sysctl.d/10-network-security.conf:**

\`\`\`ini
# ─── REENVÍO DE PAQUETES ──────────────────────────────────────────────────────
# Deshabilitar IP forwarding (habilitarlo solo en routers/NAT)
# Docker y Kubernetes lo reactivan automáticamente cuando lo necesitan
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# ─── FILTRADO DE RUTAS (anti-spoofing) ───────────────────────────────────────
# rp_filter=1: descartar paquetes cuya ruta de retorno no use la misma interfaz
# Protege contra IP spoofing y ataques de amplificación
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# ─── SYN COOKIES (protección DoS) ────────────────────────────────────────────
# Activar SYN cookies cuando la cola de conexiones se desborda
# Protege contra SYN flood sin rechazar conexiones legítimas
net.ipv4.tcp_syncookies = 1

# ─── REDIRECTS ICMP ──────────────────────────────────────────────────────────
# No aceptar redirects ICMP (posible vector MITM)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# No enviar redirects ICMP (este servidor no es un router)
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# ─── SOURCE ROUTING ──────────────────────────────────────────────────────────
# Rechazar paquetes con source routing (obsoleto, peligroso)
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# ─── ICMP BROADCAST (Smurf attack) ───────────────────────────────────────────
# Ignorar pings dirigidos a broadcast (evita ser amplificador en Smurf)
net.ipv4.icmp_echo_ignore_broadcasts = 1

# ─── BOGUS ICMP ──────────────────────────────────────────────────────────────
# Ignorar respuestas ICMP malformadas
net.ipv4.icmp_ignore_bogus_error_responses = 1

# ─── LOGGING DE PAQUETES SOSPECHOSOS ─────────────────────────────────────────
# Registrar paquetes con rutas de origen imposibles (martians)
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# ─── TCP TIME-WAIT ────────────────────────────────────────────────────────────
# No reciclar sockets TIME_WAIT (puede romper NAT)
net.ipv4.tcp_tw_reuse = 0

# ─── IPv6 ────────────────────────────────────────────────────────────────────
# Deshabilitar autoconfiguración de IPv6 si no se usa
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
\`\`\`

---

### 📖 Parámetros de seguridad del kernel

**Crear /etc/sysctl.d/20-kernel-hardening.conf:**

\`\`\`ini
# ─── ASLR (Address Space Layout Randomization) ───────────────────────────────
# 0 = deshabilitado, 1 = parcial, 2 = completo (máximo)
# Hace impredecible la ubicación de stack, heap y librerías en memoria
# Dificulta enormemente exploits de buffer overflow
kernel.randomize_va_space = 2

# ─── RESTRICCIÓN DE DMESG ────────────────────────────────────────────────────
# dmesg_restrict=1: solo root puede leer el buffer del kernel
# Sin esto, usuarios sin privilegios ven info de hardware, módulos, IPs internas
kernel.dmesg_restrict = 1

# ─── PUNTEROS DE KERNEL EN /proc ─────────────────────────────────────────────
# kptr_restrict=2: ocultar punteros de kernel incluso para root
# Sin esto, /proc/kallsyms expone direcciones de funciones del kernel
# Esas direcciones ayudan a construir exploits de kernel (ROP chains)
kernel.kptr_restrict = 2

# ─── CORE DUMPS DE BINARIOS SUID ─────────────────────────────────────────────
# fs.suid_dumpable=0: binarios SUID no generan core dumps
# Un core dump de un proceso SUID puede contener datos sensibles de root
fs.suid_dumpable = 0

# ─── PERF EVENTS ─────────────────────────────────────────────────────────────
# Restringir acceso a performance events del kernel
# perf_event_paranoid=3 en kernels recientes (Debian/Ubuntu)
kernel.perf_event_paranoid = 3

# ─── BPFFS Y eBPF ────────────────────────────────────────────────────────────
# Restringir acceso a eBPF a root (evitar exploits via eBPF JIT)
kernel.unprivileged_bpf_disabled = 1
net.core.bpf_jit_harden = 2

# ─── USERNS (User Namespaces) ────────────────────────────────────────────────
# Restringir namespaces de usuario sin privilegios (vector de escalada)
# Comentar si el servidor usa contenedores rootless
kernel.unprivileged_userns_clone = 0

# ─── SYSRQ ───────────────────────────────────────────────────────────────────
# Deshabilitar magic SysRq (acceso de bajo nivel al kernel)
# En servidores de producción no tiene uso legítimo
kernel.sysrq = 0

# ─── PTRACE ──────────────────────────────────────────────────────────────────
# yama.ptrace_scope=1: solo el proceso padre puede tracear a sus hijos
# Sin esto, cualquier proceso puede adjuntarse a otros del mismo usuario
kernel.yama.ptrace_scope = 1
\`\`\`

---

### 📖 Aplicar y verificar

\`\`\`bash
# Aplicar todos los archivos de sysctl
sysctl --system

# Verificar parámetros específicos después de aplicar
sysctl net.ipv4.ip_forward
sysctl net.ipv4.tcp_syncookies
sysctl kernel.randomize_va_space
sysctl kernel.dmesg_restrict
sysctl kernel.kptr_restrict

# Verificar que no hay diferencia entre lo configurado y lo activo
# (detecta si algo sobreescribe tu configuración)
sysctl -a | grep ip_forward
cat /proc/sys/net/ipv4/ip_forward

# Ver qué archivo define cada parámetro (útil para depurar conflictos)
sysctl --system --dry-run 2>&1 | grep "Setting"
\`\`\`

**Verificar que ASLR funciona:**

\`\`\`bash
# Ejecutar el mismo programa dos veces — las direcciones deben ser distintas
ldd /bin/ls | grep libc
ldd /bin/ls | grep libc
# Con randomize_va_space=2 las direcciones cambian en cada ejecución
\`\`\`

**Verificar restricción de dmesg:**

\`\`\`bash
# Como usuario normal (sin sudo) debe fallar o mostrar vacío
dmesg
# dmesg: read kernel buffer failed: Operation not permitted

# Como root sigue funcionando
sudo dmesg | tail -5
\`\`\`

---

### 📖 Consideraciones para Docker y Kubernetes

Algunos parámetros entran en conflicto con contenedores:

\`\`\`bash
# Docker reactiva ip_forward al iniciarse
# No poner ip_forward=0 en sysctl si usas Docker en producción
# En su lugar, controlar con iptables/nftables qué tráfico se reenvía

# Kubernetes requiere:
# net.bridge.bridge-nf-call-iptables = 1
# net.bridge.bridge-nf-call-ip6tables = 1

# Si el servidor es solo de aplicación (sin contenedores):
# todos los parámetros de este módulo aplican sin excepción

# Verificar qué ha modificado Docker:
sysctl net.ipv4.ip_forward
# Si muestra 1 después de reiniciar con Docker activo, es Docker
\`\`\`

---

### 📋 Lo que debes recordar
* sysctl -w aplica cambios en caliente pero no persisten; usar /etc/sysctl.d/ para persistencia
* sysctl --system aplica todos los archivos de configuración en orden, sin reiniciar
* rp_filter=1 previene IP spoofing; tcp_syncookies=1 protege contra SYN flood
* randomize_va_space=2 (ASLR completo) dificulta exploits de memoria
* kptr_restrict=2 y dmesg_restrict=1 evitan fugas de información del kernel
* Docker puede reactivar ip_forward; verificar después de instalar Docker

---

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre aplicar \`sysctl -w net.ipv4.tcp_syncookies=1\` y escribir esa línea en /etc/sysctl.d/99-hardening.conf?
2. Un servidor necesita actuar como router NAT para una red interna. ¿Qué parámetro debes habilitar y qué riesgo implica dejarlo mal configurado en un servidor normal?
3. ¿Por qué kernel.kptr_restrict=2 mejora la seguridad aunque el atacante ya tenga acceso local?

---

1. \`sysctl -w\` aplica el cambio inmediatamente pero se pierde al reiniciar. El archivo en sysctl.d persiste entre reinicios pero requiere \`sysctl --system\` o un reinicio para aplicarse. En producción se hace ambos: primero el archivo, luego \`sysctl --system\`.
2. net.ipv4.ip_forward=1. En un servidor que no es router, dejarlo en 1 permite que un atacante que compromete el servidor lo use para reenviar tráfico entre segmentos de red, rompiendo el aislamiento de red.
3. Porque oculta las direcciones de funciones del kernel (kallsyms). Sin esas direcciones, construir exploits tipo ROP (Return-Oriented Programming) es extremadamente difícil. El atacante puede tener acceso local de usuario y aún así no poder escalar a kernel sin esas direcciones.
`

export default content
