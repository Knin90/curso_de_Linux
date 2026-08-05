const content = `
## Módulo 3 — /etc/shadow, /etc/group y NSS: internals del sistema de usuarios

### 🎯 Objetivos de aprendizaje

* Entender cada campo de /etc/passwd, /etc/shadow y /etc/group en profundidad.
* Leer e interpretar los hashes de /etc/shadow incluyendo el identificador de algoritmo.
* Comprender NSS (Name Service Switch) y cómo nsswitch.conf controla la resolución de usuarios.
* Usar \`getent\` para consultar bases de datos NSS de forma independiente de la fuente.

### ❓ El problema real

Tu empresa integra servidores Linux con Active Directory. Algunos usuarios existen en /etc/passwd local, otros vienen de LDAP/AD. Un script falla porque \`grep\` en /etc/passwd no encuentra usuarios de AD, y \`id\` sí los muestra. El problema es que el script bypasea NSS y lee el archivo directamente. Entender cómo el kernel y el sistema resuelven usuarios — y por qué \`getent\` es siempre la herramienta correcta — es fundamental para entornos híbridos.

### 📖 /etc/passwd: anatomía completa

\`\`\`text
# Formato: usuario:contraseña:UID:GID:GECOS:home:shell
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
maria:x:1001:1001:Maria García,Ext 2301,Oficina 204:/home/maria:/bin/bash
svcpostgres:x:999:999:PostgreSQL Service Account:/var/lib/postgresql:/bin/false
\`\`\`

\`\`\`text
CAMPO       DESCRIPCIÓN
─────────────────────────────────────────────────────────────────
usuario     Nombre de login. Máx 32 caracteres. Solo ASCII, sin espacios.
contraseña  'x' significa que el hash está en /etc/shadow.
            Si está vacío: sin contraseña (peligroso).
            Si es '*' o '!': cuenta bloqueada.
UID         User ID numérico. 0 = root. 1-999 = sistema. 1000+ = usuarios reales.
GID         Group ID primario (grupo principal del usuario).
GECOS       Comentario: nombre completo, teléfono, etc. Separado por comas.
home        Directorio home. Para cuentas de servicio: su directorio de trabajo.
shell       Shell al hacer login. /usr/sbin/nologin o /bin/false = sin acceso interactivo.
\`\`\`

\`\`\`bash
# Rangos de UID por convención (definidos en /etc/login.defs)
# UID 0: root
# UID 1-99: cuentas de sistema estáticas (daemon, bin, sync...)
# UID 100-999: cuentas de sistema dinámicas (servicios instalados)
# UID 1000+: usuarios reales

grep UID_MIN /etc/login.defs   # típicamente 1000
grep UID_MAX /etc/login.defs   # típicamente 60000
grep SYS_UID_MIN /etc/login.defs  # típicamente 201
grep SYS_UID_MAX /etc/login.defs  # típicamente 999
\`\`\`

### 📖 /etc/shadow: hashes y políticas de contraseña

\`\`\`text
# Formato: usuario:hash:lastchg:min:max:warn:inactive:expire:reserved
maria:$6$rounds=65536$sAlt12345$HashLargoAqui:19740:0:90:14:30:20000:
root:!:19740:0:99999:7:::
svcpostgres:*:19740::::::
\`\`\`

\`\`\`text
CAMPO       TIPO        DESCRIPCIÓN
────────────────────────────────────────────────────────────────────────────
usuario     string      Nombre de usuario (debe coincidir con /etc/passwd)
hash        string      Hash de la contraseña (ver formato abajo)
lastchg     días        Días desde epoch (1 ene 1970) del último cambio
min         días        Mínimo de días entre cambios de contraseña (0 = sin mínimo)
max         días        Días hasta que la contraseña expira (99999 = nunca)
warn        días        Días de advertencia antes de expirar
inactive    días        Días de gracia después de expirar (cuenta se bloquea)
expire      días        Fecha de expiración absoluta de la cuenta (vacío = nunca)
reserved    -           Reservado para uso futuro
\`\`\`

**Valores especiales del campo hash:**
- \`!\` al inicio: cuenta bloqueada (password lock, no afecta autenticación por llave SSH)
- \`!!\`: nunca se estableció contraseña
- \`*\`: cuenta de sistema sin contraseña (no puede hacer login con contraseña)

**Formato del hash de contraseña:**

\`\`\`text
\$id\$parametros\$salt\$hash

\$id = identificador del algoritmo:
  \$1\$   → MD5 (obsoleto, inseguro)
  \$2y\$  → bcrypt (común en BSD)
  \$5\$   → SHA-256
  \$6\$   → SHA-512 (estándar actual en la mayoría de distros Linux)
  \$y\$   → yescrypt (moderno, más seguro, Fedora 35+, Ubuntu 22.04+)

Ejemplo completo:
\$6\$rounds=65536\$sAlt12345aBcDeF\$HashBase64MuyLargoQueRepresentaElHashReal

\$6\$            = SHA-512
rounds=65536\$  = iteraciones (más = más lento para ataques de fuerza bruta)
sAlt12345...\$  = salt aleatoria (16 caracteres base64)
HashBase64...\$ = hash resultante (86 caracteres base64 para SHA-512)
\`\`\`

\`\`\`bash
# Ver qué algoritmo usa el sistema por defecto
grep ENCRYPT_METHOD /etc/login.defs
grep yescrypt /etc/pam.d/common-password  # en sistemas modernos

# Generar un hash manualmente para pruebas
openssl passwd -6 -rounds 65536 "MiContraseña"       # SHA-512
python3 -c "import crypt; print(crypt.crypt('pass', crypt.mksalt(crypt.METHOD_SHA512)))"

# Permisos correctos de los archivos
ls -la /etc/passwd /etc/shadow /etc/group /etc/gshadow
# -rw-r--r-- 1 root root  /etc/passwd
# -rw-r----- 1 root shadow /etc/shadow   (grupo shadow puede leer)
# -rw-r--r-- 1 root root  /etc/group
# -rw-r----- 1 root shadow /etc/gshadow
\`\`\`

### 📖 /etc/group y /etc/gshadow

\`\`\`text
# /etc/group — formato: nombre:contraseña:GID:miembros
root:x:0:
sudo:x:27:maria,carlos,pedro
developers:x:1005:maria,ana,jose,deploy
www-data:x:33:
postgres:x:999:

# Campos:
# nombre: nombre del grupo
# contraseña: 'x' si está en gshadow, '*' si no tiene contraseña de grupo
# GID: Group ID numérico
# miembros: lista de usuarios separados por coma (miembros adicionales — NO el grupo primario)
\`\`\`

\`\`\`text
# /etc/gshadow — contraseñas de grupo y administradores
# formato: nombre:contraseña:administradores:miembros
sudo:!::maria,carlos
developers:\$6\$hash\$...:maria:maria,ana,jose,deploy

# Las contraseñas de grupo permiten a usuarios no-miembros unirse temporalmente con 'newgrp'
\`\`\`

\`\`\`bash
# Comandos de gestión
groupadd -g 1010 devops          # crear grupo con GID específico
groupmod -n nuevonombre viejo    # renombrar grupo
groupdel developers              # eliminar grupo
gpasswd -a usuario grupo         # añadir usuario a grupo
gpasswd -d usuario grupo         # eliminar usuario de grupo
gpasswd -A maria developers      # hacer a maria administradora del grupo

# Ver membresías
groups maria                     # grupos de maria
id maria                         # UID, GID, y todos los grupos
\`\`\`

### 📖 NSS (Name Service Switch) y nsswitch.conf

NSS es la capa del sistema C que determina cómo se resuelven nombres de usuarios, grupos, hosts, etc. En lugar de ir directamente a /etc/passwd, las aplicaciones llaman a las funciones de la glibc (getpwnam, getgrnam, etc.) que consultan NSS.

\`\`\`text
# /etc/nsswitch.conf — base de datos → fuentes en orden
passwd:     files systemd  # usuarios: primero /etc/passwd, luego systemd (usuarios de servicio)
group:      files systemd  # grupos: primero /etc/group, luego systemd
shadow:     files          # contraseñas: solo /etc/shadow
hosts:      files dns      # hostnames: primero /etc/hosts, luego DNS
networks:   files          # redes: solo /etc/networks
protocols:  db files       # protocolos: base de datos, luego archivo
services:   db files       # servicios/puertos: base de datos, luego /etc/services

# Con SSSD/LDAP integrado:
passwd:     files sss      # sss = SSSD (System Security Services Daemon)
group:      files sss
shadow:     files sss
\`\`\`

\`\`\`text
# Fuentes disponibles:
files   → archivos locales (/etc/passwd, /etc/group, etc.)
dns     → DNS (solo para hosts)
nis     → NIS/YP (obsoleto)
ldap    → LDAP directo
sss     → SSSD (recomendado para AD/LDAP)
db      → base de datos Berkeley DB compilada
systemd → usuarios de systemd (UID 60000+)
\`\`\`

### 📖 getent: la herramienta correcta

\`\`\`bash
# getent consulta NSS — obtiene datos de TODAS las fuentes configuradas
# SIEMPRE usar getent en lugar de grep en /etc/passwd en entornos con NSS compuesto

# Buscar usuario en todas las fuentes NSS
getent passwd maria              # usuario específico
getent passwd 1001               # por UID
getent passwd | grep -v nologin  # todos los usuarios con shell

# Grupos
getent group developers          # grupo específico
getent group 1005                # por GID

# Hosts
getent hosts servidor01.empresa.com

# Todas las bases de datos disponibles
getent databases

# Comparar: grep directo vs getent
grep ^carlos /etc/passwd         # NO: solo busca en archivo local
getent passwd carlos             # SÍ: busca en todas las fuentes NSS

# Caso práctico: verificar que un usuario de AD es visible
getent passwd carlos.rodriguez   # si aparece: NSS lo resuelve correctamente
id carlos.rodriguez              # ídem usando la glibc directamente
\`\`\`

### 📖 Herramientas de gestión de usuarios y auditoría

\`\`\`bash
# Verificar integridad de /etc/passwd y /etc/shadow
pwck -r          # verifica consistencia de /etc/passwd
grpck -r         # verifica consistencia de /etc/group
pwck -s          # ordena /etc/passwd por UID

# Sincronizar passwd y shadow (por si se desincronizaron)
pwconv           # convertir a shadow passwords
pwunconv         # volver a contraseñas en /etc/passwd (no recomendado)
grpconv          # convertir /etc/group a /etc/gshadow
grpunconv        # revertir

# Bloquear/desbloquear cuentas
usermod -L maria          # lock: añade ! al inicio del hash
usermod -U maria          # unlock: quita el !
passwd -l maria           # lock (equivalente)
passwd -u maria           # unlock (equivalente)

# Ver cuentas bloqueadas
awk -F: '(\$2 ~ /^!/) {print \$1}' /etc/shadow

# Cuentas sin contraseña (peligroso)
awk -F: '(\$2 == "" || \$2 == "::") {print \$1}' /etc/shadow

# Auditar UIDs duplicados (no debe haber)
awk -F: '{print \$3}' /etc/passwd | sort -n | uniq -d
\`\`\`

### 📋 Lo que debes recordar

* El campo contraseña en /etc/shadow tiene un formato estructurado: \`\$id\$[params\$]salt\$hash\`. El ID identifica el algoritmo — \`\$6\$\` es SHA-512, \`\$y\$\` es yescrypt (más moderno).
* NSS (nsswitch.conf) controla el orden de resolución de usuarios — en entornos con LDAP/AD, \`files sss\` significa local primero, SSSD segundo.
* \`getent\` es siempre la herramienta correcta para consultar usuarios/grupos — \`grep\` directo en /etc/passwd bypasea NSS y falla en entornos con múltiples fuentes.
* Los permisos de /etc/shadow deben ser 640 con propietario root:shadow — si son 644 o peor 777, cualquier usuario puede intentar crackear los hashes offline.

### 🧪 Autoevaluación

1. Un usuario tiene este hash en /etc/shadow: \`\$6\$rounds=100000\$XyZ123\$hash...\`. ¿Qué algoritmo usa? ¿Es más o menos seguro ante fuerza bruta que \`\$6\$\$hash...\` (sin especificar rounds)?
2. En /etc/nsswitch.conf tienes \`passwd: files sss\`. Un usuario existe en AD (resuelto por SSSD) y también tiene una entrada local en /etc/passwd. ¿Cuál se usa? ¿Qué pasa si tienen UIDs diferentes?
3. ¿Por qué \`grep carlos /etc/passwd\` puede devolver resultados vacíos mientras que \`id carlos\` funciona correctamente? ¿Cuál es la causa y la solución?

---

1. Usa SHA-512 (\$6\$). Con \`rounds=100000\` es más seguro ante fuerza bruta porque cada intento requiere 100000 iteraciones del algoritmo. Sin especificar rounds, se usa el valor por defecto (5000 para SHA-512), que es significativamente más rápido de crackear. El valor recomendado actual es entre 65536 y 100000 — más alto es más seguro pero más lento para el login legítimo.
2. Con \`passwd: files sss\`, se usa primero el archivo local (/etc/passwd). Si carlos existe en /etc/passwd local, esa entrada gana independientemente de AD. Si tienen UIDs diferentes, pueden causar problemas de permisos de archivos (los archivos del usuario tienen el UID del archivo, no del nombre). La solución correcta es no duplicar usuarios — si un usuario viene de AD, no debe existir en /etc/passwd local.
3. carlos es un usuario de AD resuelto por SSSD. nsswitch.conf tiene \`passwd: files sss\`, pero \`grep\` solo lee /etc/passwd (el archivo local). \`id\` usa las funciones de la glibc (getpwnam) que respetan NSS y consultan todas las fuentes. Solución: reemplazar \`grep\` con \`getent passwd carlos\` en cualquier script.
`

export default content
