const content = `
## Módulo 4 — ulimits: límites de recursos por proceso y usuario

### 🎯 Objetivos de aprendizaje

* Entender los límites soft y hard de ulimit y sus diferencias.
* Ver, ajustar y persistir límites de recursos en producción.
* Diagnosticar problemas causados por límites demasiado bajos.
* Configurar límites para servicios systemd y para el sistema completo.

### ❓ El problema real

Tu aplicación Node.js falla silenciosamente bajo carga alta. Los logs muestran "EMFILE: too many open files". El problema: el límite de descriptores de archivo del proceso es 1024 (el valor por defecto histórico de Unix), pero tu app tiene 500 conexiones WebSocket activas más archivos de log. Sin entender ulimits, este bug parece misterioso y se reproduce solo bajo carga.

### 📖 Tipos de límites: soft y hard

\`\`\`text
SOFT LIMIT: límite actual que aplica al proceso
HARD LIMIT: techo máximo que puede alcanzar el soft limit

Reglas:
- Un proceso puede aumentar su soft limit hasta el hard limit
- Solo root puede aumentar el hard limit
- Un proceso puede reducir su hard limit (irreversible para no-root)
- Los hijos heredan los límites del padre
\`\`\`

\`\`\`bash
# Ver todos los límites del shell actual
ulimit -a

# Output típico:
# core file size          (blocks, -c) 0
# data seg size           (kbytes, -d) unlimited
# scheduling priority             (-e) 0
# file size               (blocks, -f) unlimited
# pending signals                 (-i) 63392
# max locked memory       (kbytes, -l) 64
# max memory size         (kbytes, -m) unlimited
# open files                      (-n) 1024       ← problema común
# pipe size            (512 bytes, -p) 8
# POSIX message queues     (bytes, -q) 819200
# real-time priority              (-r) 0
# stack size              (kbytes, -s) 8192
# cpu time               (seconds, -t) unlimited
# max user processes              (-u) 63392
# virtual memory          (kbytes, -v) unlimited
# file locks                      (-x) unlimited

# Ver soft vs hard para un recurso específico
ulimit -Sn    # soft limit de open files
ulimit -Hn    # hard limit de open files
\`\`\`

### 📖 Límites más importantes

\`\`\`text
FLAG   RECURSO              DESCRIPCIÓN                    VALOR TÍPICO PROD
───────────────────────────────────────────────────────────────────────────────
-n     open files           Descriptores de archivo         65536 - 1048576
-u     max user processes   Procesos/threads por usuario    65536
-s     stack size (KB)      Tamaño del stack por thread     8192 (raramente cambiar)
-c     core file size       Tamaño máximo de core dump      0 (prod), unlimited (dev)
-m     max memory (KB)      Memoria física máxima           unlimited
-t     cpu time (secs)      Tiempo de CPU máximo            unlimited
-f     file size (blocks)   Tamaño máximo de archivo        unlimited
\`\`\`

### 📖 Cambiar límites

\`\`\`bash
# Cambiar soft limit (temporal, solo sesión actual)
ulimit -n 65536         # open files a 65536
ulimit -u 32768         # max processes a 32768

# Cambiar soft y hard a la vez (requiere root para aumentar hard)
ulimit -Hn 1048576      # solo hard limit
ulimit -Sn 65536        # solo soft limit

# Ver límites de un proceso en ejecución
cat /proc/1234/limits
# Limit                     Soft Limit  Hard Limit  Units
# Max cpu time              unlimited   unlimited   seconds
# Max file size             unlimited   unlimited   bytes
# Max data size             unlimited   unlimited   bytes
# Max stack size            8388608     unlimited   bytes
# Max core file size        0           unlimited   bytes
# Max resident set          unlimited   unlimited   bytes
# Max processes             63392       63392       processes
# Max open files            65536       65536       files    ← ya aumentado
# Max locked memory         65536       65536       bytes
# Max address space         unlimited   unlimited   bytes
# Max file locks            unlimited   unlimited   locks
# Max pending signals       63392       63392       signals
# Max msgqueue size         819200      819200      bytes
# Max nice priority         0           0
# Max realtime priority     0           0
# Max realtime timeout      unlimited   unlimited   us
\`\`\`

### 📖 Persistir límites: /etc/security/limits.conf

\`\`\`bash
# /etc/security/limits.conf — límites permanentes por usuario o grupo
# Formato: <dominio> <tipo> <item> <valor>

# Límites para usuario específico
www-data    soft    nofile    65536
www-data    hard    nofile    131072
postgres    soft    nofile    65536
postgres    hard    nofile    65536
postgres    soft    nproc     4096
postgres    hard    nproc     8192

# Para todos los usuarios (*)
*           soft    nofile    4096
*           hard    nofile    65536

# Para un grupo (@)
@developers soft    core      unlimited
@developers hard    core      unlimited

# deploy puede usar prioridad nice negativa
deploy      hard    nice      -10
\`\`\`

\`\`\`bash
# También se puede usar /etc/security/limits.d/ (archivos separados por app)
sudo tee /etc/security/limits.d/mi-app.conf << 'EOF'
mi-app-user  soft  nofile  262144
mi-app-user  hard  nofile  262144
mi-app-user  soft  nproc   65536
mi-app-user  hard  nproc   65536
EOF
\`\`\`

**Importante:** limits.conf aplica solo en sesiones PAM (login, ssh, su). Para servicios que se inician al boot, hay que configurarlo en systemd.

### 📖 Límites en systemd services

\`\`\`bash
# En el archivo .service, sección [Service]
sudo systemctl edit nginx  # crea override

# Agrega:
[Service]
LimitNOFILE=65536          # open files
LimitNPROC=4096            # max processes/threads
LimitCORE=0                # deshabilitar core dumps en producción
LimitMEMLOCK=infinity      # para databases que hacen mlock

sudo systemctl daemon-reload
sudo systemctl restart nginx

# Verificar que aplicó
systemctl show nginx | grep LimitNOFILE
# LimitNOFILE=65536
\`\`\`

\`\`\`bash
# Ejemplo completo para PostgreSQL
sudo tee /etc/systemd/system/postgresql.service.d/limits.conf << 'EOF'
[Service]
LimitNOFILE=65536
LimitNPROC=4096
LimitMEMLOCK=infinity
EOF
\`\`\`

### 📖 Límites globales del sistema

\`\`\`bash
# Máximo de FDs abiertos en todo el sistema (no por proceso)
cat /proc/sys/fs/file-max
# 9223372036854775807 (en sistemas modernos, prácticamente ilimitado)

# FDs actualmente en uso / FDs máximos asignados / FDs máximos del sistema
cat /proc/sys/fs/file-nr
# 5312    0       9223372036854775807

# Máximo de PIDs en el sistema
cat /proc/sys/kernel/pid_max
# 4194304

# Aumentar permanentemente con sysctl
sudo sysctl -w fs.file-max=2097152
echo "fs.file-max = 2097152" | sudo tee /etc/sysctl.d/99-file-limits.conf
sudo sysctl -p /etc/sysctl.d/99-file-limits.conf
\`\`\`

### 📋 Lo que debes recordar

* El soft limit es el límite activo; el hard limit es el techo. Solo root puede subir el hard limit.
* "Too many open files" se resuelve con \`LimitNOFILE\` en systemd o en limits.conf.
* limits.conf solo aplica a sesiones PAM — los servicios systemd necesitan su propia configuración.
* Verificar con \`/proc/PID/limits\` que el límite realmente aplicó al proceso después de reiniciarlo.

### 🧪 Autoevaluación

1. ¿Por qué configurar limits.conf no resuelve el problema de "too many open files" para un servicio nginx iniciado por systemd?
2. Tienes un proceso con soft nofile = 1024 y hard nofile = 65536. ¿Puede el proceso mismo aumentar su soft limit a 65536 sin ser root?
3. ¿Cuál es la diferencia entre /proc/sys/fs/file-max y el límite nofile de ulimit?

---

1. Porque limits.conf aplica solo a sesiones que pasan por PAM (login SSH, su, sudo, etc.). Systemd inicia los servicios directamente sin pasar por PAM, así que ignora limits.conf. Para servicios systemd hay que usar \`LimitNOFILE=\` en el archivo .service o en un override con \`systemctl edit\`.
2. Sí. La regla es que cualquier proceso puede aumentar su soft limit hasta el hard limit sin necesidad de privilegios. El proceso puede hacer \`setrlimit(RLIMIT_NOFILE, ...)\` con el nuevo valor de soft hasta 65536. Esto se usa en servidores que hacen \`setrlimit\` al arrancar para optimizar su propio límite.
3. \`/proc/sys/fs/file-max\` es el límite global del sistema — el total de FDs que pueden estar abiertos sumando todos los procesos. El ulimit nofile (RLIMIT_NOFILE) es el límite por proceso individual. Puedes tener file-max = 1 millón pero un proceso con nofile = 1024 solo puede abrir 1024 archivos.
`

export default content
