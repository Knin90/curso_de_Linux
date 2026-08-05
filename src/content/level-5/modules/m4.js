const content = `
## Módulo 4 — APT y DPKG: el sistema de paquetes Debian/Ubuntu

### 🎯 Objetivos de aprendizaje

* Dominar los comandos esenciales de APT para administración diaria.
* Entender la diferencia entre \`upgrade\` y \`full-upgrade\`.
* Usar DPKG para operaciones de bajo nivel sobre paquetes individuales.
* Reconocer y evitar los errores más comunes.

### 📖 APT vs DPKG: cuándo usar cada uno

\`\`\`text
  APT (gestor de alto nivel)              DPKG (gestor de bajo nivel)
  ────────────────────────────            ────────────────────────────
  Instalar desde repositorio              Instalar un .deb local
  Resolver dependencias automático        Inspeccionar paquetes instalados
  Actualizar el sistema                   Ver qué archivos instaló un paquete
  Buscar paquetes                         Reparar instalaciones rotas
\`\`\`

### 💻 APT: instalación y eliminación

\`\`\`bash
# Actualizar índices (SIEMPRE antes de instalar)
sudo apt update

# Instalar uno o varios paquetes
sudo apt install nginx
sudo apt install nginx curl git

# Instalar sin pedir confirmación (scripts de automatización)
sudo apt install -y nginx

# Eliminar paquete (conserva archivos de configuración)
sudo apt remove nginx

# Eliminar paquete Y sus archivos de configuración
sudo apt purge nginx

# Eliminar dependencias huérfanas
sudo apt autoremove
\`\`\`

### 💻 APT: actualización del sistema

\`\`\`text
  apt update       → descarga índices          (no instala nada)
       │
       ▼
  apt upgrade      → actualiza paquetes        (no elimina ninguno)
       │
       ▼
  apt full-upgrade → actualiza + puede eliminar paquetes para resolver conflictos
\`\`\`

| Comando | Comportamiento |
| --- | --- |
| \`apt update\` | Descarga índices actualizados. No instala. |
| \`apt upgrade\` | Actualiza paquetes instalados. Nunca elimina. |
| \`apt full-upgrade\` | Actualiza. Puede instalar o eliminar paquetes para resolver dependencias. |

> ⚠️ \`apt upgrade\` sin \`apt update\` previo puede instalar versiones desactualizadas. Siempre en orden: \`update\` → \`upgrade\`.

### 💻 APT: búsqueda e información

\`\`\`bash
# Buscar paquetes por nombre o descripción
apt search "web server"

# Ver información detallada de un paquete (sin instalar)
apt show nginx

# Ver dependencias de un paquete
apt depends nginx

# Ver qué repositorio provee el paquete y qué versión está instalada
apt policy nginx
\`\`\`

### 💻 DPKG: operaciones de bajo nivel

\`\`\`bash
# Instalar un .deb local (APT no gestiona dependencias en este caso)
sudo dpkg -i paquete_local.deb

# Si dpkg falla por dependencias, repararlas con:
sudo apt install -f

# Listar todos los paquetes instalados
dpkg -l

# Listar con filtro
dpkg -l | grep nginx

# Ver todos los archivos que instaló un paquete
dpkg -L nginx

# Saber a qué paquete pertenece un archivo
dpkg -S /usr/sbin/nginx
# nginx: /usr/sbin/nginx

# Ver estado de un paquete (instalado, configurado, etc.)
dpkg -s nginx
\`\`\`

### ⚠️ Errores comunes

\`\`\`text
❌ Error 1: apt upgrade sin apt update previo
   Instala versiones obsoletas del índice local.
   Regla: siempre apt update && apt upgrade

❌ Error 2: dpkg -i sin gestionar dependencias
   dpkg -i instala el paquete pero si faltan dependencias, el sistema queda
   parcialmente roto. Ejecutar después: sudo apt install -f

❌ Error 3: apt remove cuando se quería apt purge
   apt remove deja los archivos de configuración. Si vas a reinstalar limpio
   o a liberar espacio, usa apt purge.
\`\`\`

### 📋 Lo que debes recordar

* \`apt update\` descarga índices. \`apt upgrade\` actualiza paquetes. Son dos pasos distintos.
* \`full-upgrade\` puede **eliminar** paquetes — usarlo con criterio en producción.
* \`dpkg -S /ruta\` responde "¿qué paquete instaló este archivo?" — valioso en auditorías.
* \`dpkg -i\` no resuelve dependencias; después siempre \`apt install -f\` si hay errores.

### 🧪 Autoevaluación rápida

1. ¿Cuál es la diferencia entre \`apt upgrade\` y \`apt full-upgrade\`?
2. ¿Qué comando usarías para saber a qué paquete pertenece \`/usr/bin/curl\`?
3. Instalaste un \`.deb\` local con \`dpkg -i\` y fallan dependencias. ¿Cómo lo reparas?

---

1. \`apt upgrade\` actualiza paquetes sin eliminar ninguno. \`apt full-upgrade\` puede **eliminar paquetes** para resolver conflictos de dependencias.
2. \`dpkg -S /usr/bin/curl\`
3. Con \`sudo apt install -f\` — APT detecta las dependencias faltantes y las instala.
`
export default content
