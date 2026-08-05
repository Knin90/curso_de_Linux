const content = `
## Módulo 6 — La base de datos local de paquetes

### 🎯 Objetivos de aprendizaje

* Entender que el gestor de paquetes no busca archivos — consulta una base de datos.
* Conocer dónde vive esa base de datos en Debian/Ubuntu y RHEL/Fedora.
* Saber cómo reparar la base de datos cuando se corrompe.

### 📖 Por qué existe una base de datos local

Cuando instalas 500 paquetes en un servidor, necesitas poder responder:

* ¿Está nginx instalado? ¿En qué versión?
* ¿Qué archivos puso el paquete en mi sistema?
* ¿Cuáles son sus dependencias?
* ¿Qué paquetes pueden eliminarse con seguridad?

Linux no busca archivos en el sistema de archivos para responder esto. Consulta una **base de datos local** que se actualiza en cada operación del gestor de paquetes.

### 📖 Base de datos en Debian/Ubuntu (DPKG)

\`\`\`text
  /var/lib/dpkg/
  ├── status           ← estado de TODOS los paquetes instalados
  │                      (instalado, desconfigurado, medio-instalado...)
  ├── available        ← lista de paquetes disponibles en los repos
  ├── info/            ← un directorio por paquete instalado
  │   ├── nginx.list   ← lista de archivos que instaló nginx
  │   ├── nginx.md5sums ← checksums de los archivos
  │   └── nginx.conffiles ← archivos de configuración del paquete
  └── lock             ← archivo de bloqueo (previene ejecución simultánea)

  /var/cache/apt/
  ├── archives/        ← paquetes .deb descargados (caché local)
  └── pkgcache.bin     ← índice binario compilado de los repositorios
\`\`\`

\`\`\`bash
# Ver el estado de un paquete directamente en la base de datos
grep -A5 "Package: nginx" /var/lib/dpkg/status

# Ver el tamaño de la base de datos
du -sh /var/lib/dpkg/
\`\`\`

### 📖 Base de datos en RHEL/Fedora (RPM)

\`\`\`text
  /var/lib/rpm/
  ├── rpmdb.sqlite     ← base de datos SQLite con todos los paquetes (RHEL 9+)
  └── Packages         ← base de datos BerkleyDB (RHEL 8 y anteriores)

  /var/cache/dnf/      ← caché de índices y paquetes descargados
\`\`\`

\`\`\`bash
# Verificar la base de datos RPM
rpm --verifydb

# Reconstruir si está corrupta
sudo rpm --rebuilddb
\`\`\`

### 📖 El archivo de bloqueo

\`\`\`text
  /var/lib/dpkg/lock         ← DPKG
  /var/lib/apt/lists/lock    ← APT
  /var/cache/apt/archives/lock
  /var/lib/dnf/              ← DNF
\`\`\`

Si un proceso de APT/DNF muere abruptamente, puede dejar el archivo de bloqueo activo. El siguiente comando fallará con:

\`\`\`text
E: Could not get lock /var/lib/dpkg/lock-frontend
\`\`\`

\`\`\`bash
# Verificar qué proceso tiene el lock
lsof /var/lib/dpkg/lock-frontend

# Si el proceso ya no existe, eliminar el lock manualmente
sudo rm /var/lib/dpkg/lock-frontend
sudo rm /var/lib/dpkg/lock
sudo dpkg --configure -a   # terminar configuraciones pendientes
\`\`\`

### 💻 Consultar el estado del sistema de paquetes

\`\`\`bash
# Debian/Ubuntu: listar todos los paquetes instalados
dpkg -l

# Contar paquetes instalados
dpkg -l | grep "^ii" | wc -l

# Ver paquetes instalados manualmente (no como dependencia)
apt-mark showmanual

# RHEL/Fedora: listar paquetes instalados
rpm -qa

# Paquetes instalados en orden cronológico
rpm -qa --last | head -20

# Ver paquetes instalados manualmente en DNF
dnf history userinstalled
\`\`\`

### 📖 Reparar instalaciones rotas

\`\`\`bash
# Debian: terminar configuraciones interrumpidas
sudo dpkg --configure -a

# Debian: reparar dependencias rotas
sudo apt install -f

# RHEL: verificar y reparar
sudo dnf distro-sync
\`\`\`

### 📋 Lo que debes recordar

* La base de datos DPKG vive en \`/var/lib/dpkg/\`; la de RPM en \`/var/lib/rpm/\`.
* El archivo \`lock\` previene ejecuciones simultáneas — nunca eliminarlo si hay un proceso activo.
* \`dpkg -l | grep "^ii"\` lista solo paquetes correctamente instalados (\`ii\` = installed).
* Después de un corte de energía o kill de APT, ejecutar \`sudo dpkg --configure -a\` para terminar configuraciones pendientes.

### 🧪 Autoevaluación rápida

1. ¿Dónde vive físicamente la base de datos de paquetes en un sistema Debian?
2. ¿Qué significa \`ii\` al inicio de una línea en la salida de \`dpkg -l\`?
3. APT falla con "Could not get lock". ¿Cuál es el primer paso correcto?

---

1. En \`/var/lib/dpkg/\` — principalmente el archivo \`status\` y el directorio \`info/\`.
2. \`ii\` significa "**installed** (desired) + **installed** (actual)" — el paquete está correctamente instalado y configurado.
3. Verificar con \`lsof /var/lib/dpkg/lock-frontend\` si hay un proceso legítimo usando el lock. Solo si no hay ninguno, eliminar el archivo de bloqueo y ejecutar \`sudo dpkg --configure -a\`.
`
export default content
