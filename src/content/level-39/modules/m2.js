const content = `
## Módulo 2 — Evaluación de fundamentos II: redes y almacenamiento

### 🎯 Objetivos de aprendizaje

* Diagnosticar problemas de conectividad de red usando las herramientas estándar del stack TCP/IP.
* Interpretar tablas de rutas, sockets abiertos y resolución DNS para aislar fallas.
* Resolver problemas de montaje, particionado y uso de espacio en disco.
* Aplicar criterio de troubleshooting por capas (física → enlace → red → transporte → aplicación).

### ❓ El problema real

Redes y almacenamiento son las dos áreas donde un error de diagnóstico cuesta más caro en producción: un montaje mal hecho puede corromper datos, y un diagnóstico de red incorrecto puede llevar a "arreglar" el componente equivocado mientras el problema real sigue activo. Esta evaluación mide capacidad de aislar la capa correcta antes de actuar.

### 📖 Bloque A — Redes (5 escenarios)

**Escenario A1.** Un servidor no puede alcanzar \`google.com\` pero sí responde a \`ping 8.8.8.8\`.

*Tarea:* identificar la capa fallando y el comando de diagnóstico específico.

\`\`\`bash
$ ping 8.8.8.8
64 bytes from 8.8.8.8: icmp_seq=1 ttl=115 time=12.4 ms
$ ping google.com
ping: google.com: Temporary failure in name resolution
\`\`\`

**Escenario A2.** Un servicio web no responde desde otra máquina de la red, pero \`curl localhost:8080\` funciona en el propio servidor.

\`\`\`bash
$ ss -tlnp | grep 8080
LISTEN 0 128 127.0.0.1:8080 0.0.0.0:*  users:(("node",pid=2210,fd=22))
\`\`\`

*Tarea:* identificar la causa exacta (bind a loopback en vez de 0.0.0.0) y la corrección.

**Escenario A3.** Una ruta a una subred remota no funciona después de reiniciar el servidor.

\`\`\`bash
$ ip route show
default via 192.168.1.1 dev eth0
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.50
\`\`\`

*Tarea:* explicar por qué la ruta estática hacia \`10.20.0.0/16\` desapareció y cómo hacerla persistente.

**Escenario A4.** Un firewall bloquea tráfico entrante en el puerto 443 pero el administrador jura que la regla está aplicada.

\`\`\`bash
$ sudo iptables -L -n | grep 443
$ sudo ss -tlnp | grep 443
LISTEN 0 128 0.0.0.0:443 0.0.0.0:* users:(("nginx",pid=990,fd=6))
\`\`\`

*Tarea:* la salida de \`iptables\` está vacía. Identificar qué otras cadenas o herramientas (nftables, firewalld, ufw) podrían estar gestionando las reglas y cómo verificarlo.

**Escenario A5.** Un enlace SSH se corta constantemente cada pocos minutos de inactividad.

*Tarea:* dar dos soluciones: una del lado cliente (\`ClientAliveInterval\` no aplica al cliente — usar \`ServerAliveInterval\`) y una del lado servidor (\`ClientAliveInterval\`/\`ClientAliveCountMax\`).

### 📖 Bloque B — Almacenamiento (5 escenarios)

**Escenario B1.** \`df -h\` muestra una partición al 100% pero \`du -sh /*\` no suma ese total.

\`\`\`bash
$ df -h /var
Filesystem  Size  Used Avail Use% Mounted on
/dev/sda3    20G   20G     0 100% /var
$ du -sh /var/* | sort -h | tail -5
1.2G /var/log
800M /var/cache
\`\`\`

*Tarea:* explicar la causa más probable (archivos borrados pero mantenidos abiertos por un proceso) y el comando para identificarlos (\`lsof +L1\` o \`lsof | grep deleted\`).

**Escenario B2.** Un montaje definido en \`/etc/fstab\` no se activa tras reiniciar.

\`\`\`text
UUID=a1b2c3d4-e5f6  /data  ext4  defaults  0  2
\`\`\`

*Tarea:* dar el comando para verificar el fstab sin reiniciar (\`mount -a\`) y explicar qué mensaje de error indicaría UUID incorrecto.

**Escenario B3.** Se necesita ampliar una partición LVM que se quedó sin espacio, y el volume group tiene espacio libre disponible.

*Tarea:* dar la secuencia completa: \`lvextend\` + \`resize2fs\`/\`xfs_growfs\` según el filesystem.

**Escenario B4.** Un disco reporta errores de E/S intermitentes en \`dmesg\`.

\`\`\`text
[12345.678] sd 2:0:0:0: [sdb] tag#12 FAILED Result: hostbyte=DID_OK
[12345.680] blk_update_request: I/O error, dev sdb, sector 4210332
\`\`\`

*Tarea:* identificar los próximos pasos de diagnóstico (SMART: \`smartctl -a /dev/sdb\`) antes de tomar acción sobre datos.

**Escenario B5.** Se necesita verificar si un filesystem tiene errores sin desmontarlo en producción.

*Tarea:* explicar por qué \`fsck\` no puede correr sobre un filesystem montado en modo lectura-escritura y qué alternativas existen (montar read-only, o \`fsck\` en el próximo reinicio con \`tune2fs -c\`).

### 📋 Rúbrica de evaluación — Bloque de fundamentos II

| Criterio | Insuficiente | Aceptable | Sólido |
|---|---|---|---|
| Diagnóstico por capas de red | Prueba comandos al azar sin hipótesis | Identifica la capa correcta con ayuda | Aísla la capa fallando en el primer intento con evidencia |
| Lectura de salidas de red | No interpreta \`ss\`/\`ip route\`/\`iptables\` | Interpreta con errores menores | Interpreta correctamente y detecta la anomalía específica |
| Gestión de almacenamiento | Ejecuta comandos destructivos sin verificar | Verifica antes de actuar pero con pasos de más | Verifica con el comando mínimo necesario y explica el riesgo |
| Criterio ante datos en riesgo | Actúa sobre el disco sin diagnóstico previo | Diagnostica pero duda sobre el orden de pasos | Diagnostica con SMART/fsck antes de cualquier acción destructiva |

**Criterio de aprobación:** mínimo "Aceptable" en los 4 criterios, con al menos 2 en "Sólido". El criterio "ante datos en riesgo" es eliminatorio: un "Insuficiente" ahí reprueba el bloque completo.

### 📋 Lo que debes recordar

* El diagnóstico de red se hace por capas: resolución DNS, ruta, puerto/socket, firewall, aplicación — en ese orden de aislamiento.
* Un servicio escuchando en \`127.0.0.1\` nunca es accesible desde otra máquina; se necesita \`0.0.0.0\` o la IP específica.
* \`df\` y \`du\` pueden discrepar por archivos borrados retenidos por procesos abiertos — no es un bug del filesystem.
* Nunca correr \`fsck\` sobre un filesystem montado en lectura-escritura; nunca actuar sobre un disco con errores SMART sin respaldo previo.

### 🧪 Autoevaluación

1. En el escenario A1, ¿qué capa está fallando y qué archivo de configuración se revisa primero?
2. ¿Por qué \`df\` puede mostrar 100% de uso mientras \`du\` no suma ese total?
3. ¿Qué comando confirma que un disco tiene fallas de hardware antes de decidir reemplazarlo?

---

1. Falla la resolución DNS (capa de aplicación/nombre), no la conectividad IP. Se revisa \`/etc/resolv.conf\` (o la configuración del gestor de red, como \`systemd-resolved\` con \`resolvectl status\`) para verificar los servidores DNS configurados.
2. Porque un proceso puede mantener abierto un descriptor de archivo hacia un archivo que ya fue borrado del filesystem (\`rm\` sin cerrar el file handle). El espacio no se libera hasta que el proceso cierra el descriptor o termina, pero \`du\` ya no puede ver ese archivo porque no tiene entrada en el árbol de directorios.
3. \`smartctl -a /dev/sdX\` (del paquete smartmontools), revisando específicamente atributos como \`Reallocated_Sector_Ct\`, \`Current_Pending_Sector\` y el resultado de \`SMART overall-health self-assessment\`.
`

export default content
