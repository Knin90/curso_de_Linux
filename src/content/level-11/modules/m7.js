const content = `
## Módulo 7 — Observabilidad avanzada: strace, lsof y ss

### 🎯 Objetivos de aprendizaje

* Usar strace para ver qué llamadas al sistema hace un proceso.
* Identificar archivos y sockets abiertos con lsof.
* Diagnosticar conexiones de red activas con ss (sucesor de netstat).
* Aplicar estas herramientas en casos de diagnóstico reales.

### ❓ El problema real

Un proceso falla pero el mensaje de error es inútil: "Connection refused" sin más contexto. ¿A qué IP intenta conectarse? ¿Qué archivo intenta abrir? ¿Por qué falla la operación? Las herramientas de observabilidad avanzada son un microscopio para procesos: ves exactamente qué hace el sistema operativo en nombre del proceso, sin modificar el código fuente.

### 📖 strace: espía de llamadas al sistema

strace intercepta y registra todas las **system calls** (syscalls) que hace un proceso: open, read, write, connect, fork, exec...

\`\`\`bash
# Trazar un comando desde el inicio
strace ls /tmp

# Trazar un proceso ya en ejecución (por PID)
sudo strace -p 1234

# Seguir procesos hijo también
strace -f ls /tmp

# Solo mostrar llamadas que fallan
strace -e trace=all ls /tmp 2>&1 | grep "= -1"

# Filtrar por tipo de syscall
strace -e trace=network curl ejemplo.com       # solo llamadas de red
strace -e trace=file ls /tmp                   # solo operaciones de archivo
strace -e trace=open,read,write cat /etc/hosts # solo estas 3

# Guardar en archivo (strace suele ser verboso)
strace -o /tmp/strace-output.txt nginx -t

# Medir tiempo en cada syscall
strace -T ls /tmp

# Contar syscalls
strace -c ls /tmp
\`\`\`

**Caso de uso real — diagnóstico de "file not found":**

\`\`\`bash
strace -e trace=open,openat myapp 2>&1 | grep "No such file"
# Verás exactamente qué archivo busca y no encuentra
\`\`\`

**Caso de uso real — diagnóstico de "connection refused":**

\`\`\`bash
strace -e trace=connect myapp 2>&1 | grep connect
# Verás la IP y puerto exactos a los que intenta conectarse
\`\`\`

### 📖 lsof: lista de archivos abiertos

"Everything is a file" en Linux — lsof lista no solo archivos de disco sino también sockets, pipes, y dispositivos.

\`\`\`bash
# Todos los archivos abiertos (salida enorme)
sudo lsof | head -50

# Archivos abiertos por un proceso específico
lsof -p 1234

# Quién tiene abierto un archivo específico
lsof /var/log/auth.log

# Quién usa un puerto específico
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :22

# Todos los sockets de red abiertos
sudo lsof -i

# Solo conexiones TCP establecidas
sudo lsof -i TCP -s TCP:ESTABLISHED

# Archivos abiertos por un usuario
lsof -u www-data

# Archivos abiertos por un proceso y sus hijos
lsof -p 1234 +D /var/www/html

# Qué proceso usa /dev/sda
sudo lsof /dev/sda1
\`\`\`

**Caso de uso real — disco lleno:**

\`\`\`bash
# df muestra el disco lleno, pero du no encuentra los archivos grandes
# → un proceso tiene abierto un archivo ya borrado que no se libera
sudo lsof | grep "(deleted)"
# Matar ese proceso o reiniciarlo libera el espacio
\`\`\`

**Caso de uso real — puerto ocupado:**

\`\`\`bash
sudo lsof -i :8080
# COMMAND   PID     USER   FD   TYPE  DEVICE SIZE/OFF NODE NAME
# java     2341   tomcat   45u  IPv6   12345      0t0  TCP *:http-alt (LISTEN)
\`\`\`

### 📖 ss: estadísticas de sockets (reemplaza netstat)

\`\`\`bash
# Instalación: incluido en iproute2 (presente por defecto)

# Todos los sockets
ss

# Solo TCP
ss -t

# Solo UDP
ss -u

# Solo UNIX domain sockets
ss -x

# Sockets en estado LISTEN
ss -tlnp

# Explicación de flags -tlnp:
# -t = TCP
# -l = listening
# -n = numérico (no resolver nombres)
# -p = mostrar proceso dueño
\`\`\`

\`\`\`text
State    Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process
LISTEN   0       128     0.0.0.0:22           0.0.0.0:*          users:(("sshd",pid=891))
LISTEN   0       511     0.0.0.0:80           0.0.0.0:*          users:(("nginx",pid=1234))
ESTAB    0       0       192.168.1.10:22      10.0.0.5:54321     users:(("sshd",pid=4567))
\`\`\`

\`\`\`bash
# Todas las conexiones establecidas
ss -tnp state established

# Estadísticas de resumen
ss -s

# Conexiones a un puerto específico
ss -tnp '( dport = :443 or sport = :443 )'

# Ver conexiones TIME_WAIT (sockets esperando cierre)
ss -tn state time-wait | wc -l

# Información extendida (retransmisiones, RTT)
ss -ti
\`\`\`

### 📖 Comparación ss vs netstat

\`\`\`text
netstat (obsoleto)            ss (moderno, más rápido)
─────────────────────────     ─────────────────────────────
netstat -tlnp                 ss -tlnp
netstat -an                   ss -an
netstat -anp | grep :80       ss -tnlp '( sport = :80 )'
netstat -s                    ss -s
\`\`\`

ss es significativamente más rápido en sistemas con miles de conexiones porque lee directamente del kernel (netlink) en lugar de parsear /proc/net/tcp.

### 📖 Flujo de diagnóstico combinado

\`\`\`text
PROBLEMA: "mi servicio no puede conectar a la base de datos"

1. ¿Está postgres escuchando?
   ss -tlnp | grep 5432

2. ¿Qué IP/puerto usa tu servicio para conectar?
   strace -e trace=connect -p <PID> 2>&1 | grep connect

3. ¿Hay conexiones establecidas?
   ss -tnp state established | grep 5432

4. ¿El proceso tiene abierto el socket?
   lsof -p <PID> -i TCP

5. ¿Hay algún firewall bloqueando?
   sudo iptables -L -n | grep 5432
\`\`\`

### 📋 Lo que debes recordar

* **strace** = ver syscalls. Filtrar con \`-e trace=network\` o \`-e trace=file\` para no ahogarte en output.
* **lsof | grep "(deleted)"** = encontrar procesos con archivos borrados que impiden liberar espacio en disco.
* **ss -tlnp** es el reemplazo de \`netstat -tlnp\`. Memorizarlo es obligatorio.
* Combinar las tres herramientas da observabilidad completa: qué hace el proceso (strace), qué tiene abierto (lsof), cómo está conectado (ss).

### 🧪 Autoevaluación

1. \`df -h\` muestra el disco al 99% pero \`du -sh /*\` no suma eso. ¿Qué comando usas para encontrar el problema?
2. ¿Cómo encuentras qué proceso está escuchando en el puerto 3000?
3. Quieres ver a qué dirección IP intenta conectarse un proceso. ¿Qué strace usas?

---

1. \`sudo lsof | grep "(deleted)"\` — un proceso tiene abierto un archivo que fue borrado del filesystem. El inode (y el espacio en disco) no se libera hasta que el proceso cierre el file descriptor. La solución es reiniciar ese proceso.
2. \`ss -tlnp | grep :3000\` o \`sudo lsof -i :3000\` — ambos muestran el proceso dueño del socket en escucha en el puerto 3000.
3. \`sudo strace -p <PID> -e trace=connect 2>&1\` — filtra solo las syscalls \`connect()\`, que muestran la \`struct sockaddr\` con la IP y puerto de destino. Para un proceso nuevo: \`strace -e trace=connect <comando>\`.
`

export default content
