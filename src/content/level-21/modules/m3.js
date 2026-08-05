const content = `
## Módulo 3 — Servicios y puertos: eliminar lo innecesario

### 🎯 Objetivos de aprendizaje
* Auditar todos los servicios activos y mapearlos a sus puertos
* Distinguir entre deshabilitar y enmascarar un servicio en systemd
* Identificar los servicios habitualmente innecesarios en servidores de producción
* Configurar un firewall básico con ufw como capa complementaria
* Escribir un script de auditoría de puertos para uso periódico

---

### ❓ El problema real

Una empresa migra sus servidores a la nube y descubre en una auditoría de seguridad que el 40% de sus instancias tiene rpcbind escuchando en puerto 111, un servicio heredado de NFS que nadie configuró conscientemente. Otra instancia tiene cups (impresión) activo en un servidor web. Otra más tiene bluetooth.service corriendo en un VPS donde es imposible que haya hardware Bluetooth. Cada uno de estos servicios es una superficie de ataque activa con CVEs asociadas, consumiendo recursos, y presente porque nadie se molestó en eliminar lo que las imágenes base instalan por defecto.

---

### 📖 Auditoría de servicios activos

El primer paso es saber exactamente qué está corriendo:

\`\`\`bash
# Listar todos los servicios activos
systemctl list-units --type=service --state=running

# Listar TODOS los servicios (incluyendo inactivos/fallidos)
systemctl list-units --type=service --all

# Ver estado detallado de un servicio
systemctl status avahi-daemon.service

# Listar servicios habilitados (arrancan con el sistema)
systemctl list-unit-files --type=service --state=enabled
\`\`\`

**Mapear puertos a procesos y servicios:**

\`\`\`bash
# Ver todos los puertos TCP escuchando con el proceso que los ocupa
# -t: TCP, -l: listening, -n: numérico, -p: proceso
ss -tlnp

# Versión con UDP también
ss -tulnp

# Mapeo detallado: puerto → proceso → servicio systemd
ss -tlnp | awk 'NR>1 {print \$4, \$6}' | while read addr proc; do
    pid=\$(echo "\$proc" | grep -oP 'pid=\K[0-9]+')
    if [ -n "\$pid" ]; then
        svc=\$(systemctl status "\$pid" 2>/dev/null | grep -oP '(?<=─ )\S+\.service' | head -1)
        echo "\$addr → PID \$pid → \$svc"
    fi
done
\`\`\`

\`\`\`bash
# Ejemplo de salida de ss -tlnp en servidor por defecto
Netid  State  Recv-Q  Send-Q  Local Address:Port  Process
tcp    LISTEN 0       128     0.0.0.0:22          users:(("sshd",pid=892,fd=3))
tcp    LISTEN 0       4096    0.0.0.0:111         users:(("rpcbind",pid=543,fd=4))
tcp    LISTEN 0       4096    0.0.0.0:5353        users:(("avahi-daemon",pid=612,fd=13))
tcp    LISTEN 0       128     0.0.0.0:631         users:(("cupsd",pid=701,fd=7))
tcp    LISTEN 0       4096    127.0.0.53:53       users:(("systemd-resolve",pid=412,fd=14))
\`\`\`

---

### 📖 disable vs mask: la diferencia crítica

systemd ofrece dos formas de detener un servicio permanentemente:

**disable**: elimina el enlace simbólico en los targets de arranque. El servicio no arranca automáticamente, pero puede iniciarse manualmente o como dependencia de otro servicio.

\`\`\`bash
systemctl disable avahi-daemon.service
# Removes /etc/systemd/system/multi-user.target.wants/avahi-daemon.service
\`\`\`

**mask**: crea un enlace simbólico a /dev/null. El servicio no puede iniciarse por ningún medio — ni manual, ni como dependencia, ni por otro servicio. Es el bloqueo total.

\`\`\`bash
systemctl mask avahi-daemon.service
# Creates /etc/systemd/system/avahi-daemon.service → /dev/null
\`\`\`

**Regla práctica:**
- Usa **disable** para servicios que podrías necesitar en el futuro
- Usa **mask** para servicios que definitivamente no deben correr en este servidor

\`\`\`bash
# Detener, deshabilitar Y enmascarar en un solo flujo
systemctl stop avahi-daemon.service
systemctl disable avahi-daemon.service
systemctl mask avahi-daemon.service

# Verificar
systemctl is-enabled avahi-daemon.service
# masked

# Intentar iniciar un servicio enmascarado siempre falla
systemctl start avahi-daemon.service
# Failed to start avahi-daemon.service: Unit avahi-daemon.service is masked.

# Revertir mask si fuera necesario
systemctl unmask avahi-daemon.service
\`\`\`

---

### 📖 Servicios habitualmente innecesarios en servidores

**avahi-daemon**: descubrimiento mDNS/DNS-SD (Bonjour/Zeroconf). Útil en escritorio para encontrar impresoras y dispositivos en la red local. En un servidor de producción: nunca necesario.

\`\`\`bash
systemctl stop avahi-daemon.socket avahi-daemon.service
systemctl mask avahi-daemon.socket avahi-daemon.service
\`\`\`

**cups / cups-browsed**: sistema de impresión. Imposible que un servidor headless necesite imprimir.

\`\`\`bash
systemctl stop cups.service cups-browsed.service cups.socket
systemctl mask cups.service cups-browsed.service cups.socket
apt remove --purge cups cups-browsed 2>/dev/null || true
\`\`\`

**bluetooth**: solo tiene sentido con hardware Bluetooth. Los VPS y servidores dedicados no tienen ese hardware.

\`\`\`bash
systemctl stop bluetooth.service
systemctl mask bluetooth.service
apt remove --purge bluez 2>/dev/null || true
\`\`\`

**rpcbind / portmap**: necesario solo para NFS y servicios RPC legacy. Puerto 111, historial de CVEs.

\`\`\`bash
systemctl stop rpcbind.service rpcbind.socket
systemctl mask rpcbind.service rpcbind.socket
apt remove --purge rpcbind 2>/dev/null || true
\`\`\`

**ModemManager**: gestión de módems de banda ancha. Sin sentido en servidores.

\`\`\`bash
systemctl stop ModemManager.service
systemctl mask ModemManager.service
\`\`\`

**snapd**: en servidores donde no se usan snaps, consume recursos y expone superficie adicional.

\`\`\`bash
# Solo si no usas ningún snap
snap list  # verificar primero
systemctl stop snapd.service snapd.socket snapd.seeded.service
systemctl mask snapd.service snapd.socket
apt remove --purge snapd
\`\`\`

**iscsid**: iSCSI initiator. Solo si no usas almacenamiento iSCSI.

\`\`\`bash
systemctl stop iscsid.service open-iscsi.service
systemctl mask iscsid.service open-iscsi.service
\`\`\`

---

### 📖 Firewall con ufw

Incluso con servicios deshabilitados, un firewall es la capa de defensa de red del host. ufw (Uncomplicated Firewall) es una interfaz simplificada sobre iptables/nftables.

\`\`\`bash
# Instalar si no está presente
apt install ufw -y

# Política por defecto: denegar todo entrante, permitir todo saliente
ufw default deny incoming
ufw default allow outgoing

# Permitir solo lo necesario (ejemplo: servidor web + SSH)
ufw allow 2222/tcp comment 'SSH puerto no estandar'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Para SSH en puerto estándar: ufw allow ssh (alias para 22/tcp)

# Permitir solo desde IP específica (admin)
ufw allow from 10.0.0.5 to any port 2222 proto tcp

# Habilitar el firewall
ufw enable

# Ver estado
ufw status verbose
\`\`\`

\`\`\`bash
# Salida esperada de ufw status verbose
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip

To                         Action      From
--                         ------      ----
2222/tcp                   ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
\`\`\`

**Reglas adicionales útiles:**

\`\`\`bash
# Limitar intentos de conexión SSH (rate limiting)
ufw limit 2222/tcp comment 'SSH rate limit'

# Bloquear una IP específica
ufw deny from 192.168.1.100

# Ver reglas numeradas (para eliminar específicas)
ufw status numbered

# Eliminar regla por número
ufw delete 3

# Deshabilitar sin borrar reglas
ufw disable
\`\`\`

---

### 📖 Script de auditoría periódica

\`\`\`bash
#!/bin/bash
# /usr/local/bin/port-audit.sh
# Ejecutar periódicamente para detectar cambios en la exposición de red

REPORT="/var/log/port-audit-\$(date +%Y%m%d-%H%M%S).txt"

{
echo "=============================="
echo " AUDITORÍA DE PUERTOS Y SERVICIOS"
echo " \$(date)"
echo "=============================="

echo ""
echo "--- PUERTOS TCP ESCUCHANDO ---"
ss -tlnp

echo ""
echo "--- PUERTOS UDP ESCUCHANDO ---"
ss -ulnp

echo ""
echo "--- SERVICIOS ACTIVOS ---"
systemctl list-units --type=service --state=running --no-pager

echo ""
echo "--- SERVICIOS HABILITADOS (arrancan con sistema) ---"
systemctl list-unit-files --type=service --state=enabled --no-pager

echo ""
echo "--- CONEXIONES ESTABLECIDAS ---"
ss -tnp state established

} > "\$REPORT"

echo "Auditoría guardada en \$REPORT"

# Comparar con auditoría anterior si existe
PREV=\$(ls -t /var/log/port-audit-*.txt 2>/dev/null | sed -n '2p')
if [ -n "\$PREV" ]; then
    echo ""
    echo "--- DIFERENCIAS RESPECTO A \$PREV ---"
    diff <(grep "LISTEN" "\$PREV") <(grep "LISTEN" "\$REPORT") || true
fi
\`\`\`

\`\`\`bash
chmod +x /usr/local/bin/port-audit.sh

# Programar en cron (semanal, o después de cambios)
echo "0 6 * * 1 root /usr/local/bin/port-audit.sh" >> /etc/cron.d/port-audit
\`\`\`

---

### 📋 Lo que debes recordar
* \`ss -tlnp\` muestra exactamente qué proceso escucha en cada puerto
* \`systemctl mask\` es más fuerte que \`disable\`: un servicio enmascarado no puede iniciarse de ningún modo
* Avahi, cups, bluetooth, rpcbind y ModemManager son los candidatos más comunes a eliminar en servidores
* ufw complementa el hardening de servicios — incluso si un servicio se inicia accidentalmente, el firewall lo bloquea
* Siempre verificar antes de eliminar un servicio: puede ser dependencia de otro

---

### 🧪 Autoevaluación

1. Tienes un servicio que deshabilitas con \`systemctl disable\`, pero al reiniciar vuelve a correr. ¿Cuál es la causa más probable y cómo lo solucionas?
2. ¿Por qué es recomendable usar \`ufw\` aunque todos los servicios innecesarios ya estén deshabilitados?
3. Un colega necesita NFS para montar un directorio compartido desde otro servidor. ¿Qué servicio que normalmente eliminarías deberías conservar?

---

1. Otro servicio lo está iniciando como dependencia. \`disable\` solo elimina el arranque automático, no impide que lo active otra unidad. La solución es \`systemctl mask\` para que no pueda iniciarse por ningún medio.
2. Defensa en profundidad: si un servicio se instala por error, si una actualización reactiva algo, o si hay un proceso que abre un puerto inesperado, el firewall actúa como red de seguridad independiente de la gestión de servicios.
3. rpcbind (puerto 111), que es requerido por el cliente y servidor NFS para el mapeo de puertos RPC. Sin rpcbind, NFS no funciona.
`

export default content
