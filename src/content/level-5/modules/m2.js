const content = `
## Módulo 2 — ¿Qué es realmente un paquete? Contenido y dependencias

### 🎯 Objetivos de aprendizaje

* Entender que un paquete es un contenedor, no solo un ejecutable.
* Comprender qué datos incluye un paquete y cómo se gestionan las dependencias.
* Saber inspeccionar el contenido de un paquete antes de instalarlo.

### 📖 Un paquete es un contenedor

Muchos creen que instalar un paquete es copiar un programa. En realidad un paquete \`.deb\` o \`.rpm\` es un archivo comprimido que contiene múltiples componentes:

\`\`\`text
  nginx.deb (o nginx.rpm)
  ├── /usr/sbin/nginx              ← ejecutable
  ├── /etc/nginx/nginx.conf        ← configuración por defecto
  ├── /lib/systemd/system/nginx.service  ← unidad de systemd
  ├── /usr/share/doc/nginx/        ← documentación
  ├── /usr/share/man/man8/nginx.8  ← manual (man nginx)
  ├── preinst / postinst           ← scripts que corren antes/después de instalar
  ├── prerm / postrm               ← scripts que corren al eliminar
  └── control (metadatos)
      ├── Package: nginx
      ├── Version: 1.24.0
      ├── Architecture: amd64
      ├── Depends: libssl3, libpcre3, zlib1g
      └── Description: ...
\`\`\`

### 📖 El árbol de dependencias

Las dependencias pueden ser recursivas. Instalar un paquete puede requerir instalar otros, que a su vez requieren más:

\`\`\`text
  nginx
  ├── libssl3
  │   └── libc6
  ├── libpcre3
  │   └── libc6
  └── zlib1g
      └── libc6

  APT resuelve este árbol completo automáticamente.
  Sin gestor de paquetes: "Dependency Hell".
\`\`\`

> **Dependency Hell** es el caos de instalar dependencias manualmente: instalar A requiere B versión 2, pero C ya instalado requiere B versión 1. Son incompatibles. El gestor de paquetes detecta este conflicto y aborta antes de romper el sistema.

### 💻 Inspeccionar un paquete antes de instalarlo

\`\`\`bash
# Ver información completa del paquete (sin instalar)
apt show nginx

# Ver qué dependencias necesita
apt depends nginx

# Buscar paquetes por nombre o descripción
apt search "web server"

# Ver qué archivos instalaría (requiere el paquete descargado)
dpkg --contents nginx_*.deb
\`\`\`

### 💻 Inspeccionar un paquete ya instalado

\`\`\`bash
# Ver todos los archivos que instaló un paquete
dpkg -L nginx

# Saber a qué paquete pertenece un archivo del sistema
dpkg -S /usr/sbin/nginx
# nginx: /usr/sbin/nginx

# Ver información detallada del paquete instalado
dpkg -s nginx
\`\`\`

Equivalentes en RPM:

\`\`\`bash
rpm -ql nginx        # listar archivos instalados
rpm -qf /usr/sbin/nginx  # a qué paquete pertenece el archivo
rpm -qi nginx        # información del paquete
rpm -qR nginx        # dependencias del paquete
\`\`\`

### 📋 Lo que debes recordar

* Un paquete contiene: ejecutables, configuración, documentación, scripts y metadatos.
* Los metadatos incluyen la lista de dependencias — APT/DNF la lee para planificar la instalación.
* \`dpkg -S /ruta/archivo\` responde "¿quién instaló este archivo?" — muy útil en auditorías.
* \`apt depends paquete\` muestra el árbol de dependencias antes de instalar.

### 🧪 Autoevaluación rápida

1. ¿Qué son los scripts \`postinst\` y \`postrm\` dentro de un paquete?
2. ¿Cómo averiguas a qué paquete pertenece el archivo \`/usr/bin/ssh\`?
3. ¿Qué es el "Dependency Hell" y cómo lo evita el gestor de paquetes?

---

1. Scripts que el instalador ejecuta **después de instalar** (\`postinst\`) y **después de eliminar** (\`postrm\`) el paquete (ej. crear usuarios de sistema, recargar servicios).
2. Con \`dpkg -S /usr/bin/ssh\` (Debian) o \`rpm -qf /usr/bin/ssh\` (RHEL).
3. El conflicto de versiones incompatibles de dependencias. El gestor detecta el conflicto **antes de tocar el sistema** y aborta la instalación con un mensaje claro.
`
export default content
