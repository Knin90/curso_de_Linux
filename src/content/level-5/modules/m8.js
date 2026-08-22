const content = `
## Módulo 8 — Proyecto real: despliegue verificado de nginx en un servidor nuevo

### 🎯 Objetivos de aprendizaje

* Ejecutar el ciclo completo de gestión de software como lo haría un administrador en producción.
* Verificar firmas, consultar orígenes, gestionar dependencias y limpiar el sistema después de instalar.
* Aplicar el mismo flujo tanto en Debian/Ubuntu como en RHEL/Fedora.

### ❓ El problema real

Te entregan un servidor recién instalado (el mismo tipo de máquina del Nivel 1) y te piden dejarlo listo para recibir tráfico web. La política de la empresa exige instalar nginx desde su repositorio oficial —no desde el repositorio genérico de la distro, que trae una versión más vieja— y dejar evidencia de que el paquete instalado corresponde exactamente a ese origen, con sus dependencias resueltas y el sistema limpio de residuos de la instalación.

### 📖 Estructura del proyecto

\`\`\`
deploy-nginx/
├── 01-estado-inicial.sh
├── 02-preparar-repo-nginx.sh
├── 03-instalar-y-verificar.sh
├── 04-limpieza.sh
└── historial.md
\`\`\`

### 📖 01-estado-inicial.sh — línea base antes de tocar nada

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "== Paquetes instalados =="
dpkg -l | grep "^ii" | wc -l          # Debian/Ubuntu
# rpm -qa | wc -l                     # RHEL/Fedora (usar en su lugar si aplica)

echo "== Espacio ocupado por la caché de paquetes =="
du -sh /var/cache/apt/archives/       # Debian/Ubuntu
# du -sh /var/cache/dnf/               # RHEL/Fedora

echo "== ¿nginx ya está instalado? =="
dpkg -s nginx 2>&1 | grep Status || echo "no instalado"   # Debian/Ubuntu
# rpm -qi nginx 2>&1 | head -5                              # RHEL/Fedora
\`\`\`

### 📖 02-preparar-repo-nginx.sh — repositorio oficial, no el de la distro

\`\`\`bash
#!/bin/bash
set -euo pipefail

## --- Debian / Ubuntu ---
# Descargar y guardar la clave GPG del repositorio oficial de nginx
curl -fsSL https://nginx.org/keys/nginx_signing.key \\
  | sudo gpg --dearmor -o /usr/share/keyrings/nginx.gpg

# Registrar el repositorio con referencia explícita a esa clave (signed-by)
CODENAME=\$(lsb_release -cs)
echo "deb [signed-by=/usr/share/keyrings/nginx.gpg] http://nginx.org/packages/ubuntu \${CODENAME} nginx" \\
  | sudo tee /etc/apt/sources.list.d/nginx.list

sudo apt update

## --- RHEL / Fedora (usar en su lugar si aplica) ---
# sudo tee /etc/yum.repos.d/nginx.repo <<'EOF'
# [nginx-stable]
# name=nginx stable repo
# baseurl=http://nginx.org/packages/centos/\$releasever/\$basearch/
# gpgcheck=1
# enabled=1
# gpgkey=https://nginx.org/keys/nginx_signing.key
# EOF
\`\`\`

### 📖 03-instalar-y-verificar.sh — instalar y probar que vino del repo correcto

\`\`\`bash
#!/bin/bash
set -euo pipefail

sudo apt install -y nginx           # Debian/Ubuntu
# sudo dnf install -y nginx          # RHEL/Fedora

echo "== ¿De qué repositorio se instaló? =="
apt policy nginx                    # Debian/Ubuntu — muestra el origen
# dnf info nginx | grep "From repo"  # RHEL/Fedora

echo "== Archivos que instaló el paquete =="
dpkg -L nginx                       # Debian/Ubuntu
# rpm -ql nginx                     # RHEL/Fedora

echo "== Árbol de dependencias =="
apt depends nginx                   # Debian/Ubuntu
# rpm -qR nginx                     # RHEL/Fedora
\`\`\`

### 📖 04-limpieza.sh — dejar el sistema sin residuos de la instalación

\`\`\`bash
#!/bin/bash
set -euo pipefail

sudo apt autoremove -y              # Debian/Ubuntu — dependencias huérfanas
sudo apt clean                      # limpia toda la caché de .deb descargados
sudo apt autoclean                  # limpia solo versiones antiguas en caché

# sudo dnf autoremove -y             # RHEL/Fedora
# sudo dnf clean all                 # RHEL/Fedora

echo "== Espacio en disco tras la limpieza =="
df -h /
\`\`\`

### 📖 historial.md — evidencia de lo que se hizo

\`\`\`text
Servidor:        srv-web-01
Paquete:         nginx (repositorio oficial nginx.org, no el de Ubuntu)
Clave GPG:       verificada, guardada en /usr/share/keyrings/nginx.gpg
Comando:         tail -30 /var/log/apt/history.log
Resultado:       instalación confirmada, sin dependencias rotas
Limpieza:        apt autoremove + apt clean ejecutados tras verificar
\`\`\`

### 📖 Secuencia de ejecución

1. Ejecuta \`01-estado-inicial.sh\` y guarda la salida como línea base.
2. Ejecuta \`02-preparar-repo-nginx.sh\` para registrar el repositorio oficial con su clave GPG.

Salida esperada de \`apt update\` tras registrar el repo:

\`\`\`
Get:1 http://nginx.org/packages/ubuntu jammy InRelease [2,553 B]
Get:2 http://nginx.org/packages/ubuntu jammy/nginx amd64 Packages [1,102 B]
Fetched 3,655 B in 1s
Reading package lists... Done
\`\`\`

3. Ejecuta \`03-instalar-y-verificar.sh\`.

Salida esperada de \`apt policy nginx\` (confirma el origen correcto):

\`\`\`
nginx:
  Installed: 1.25.3-1~jammy
  Candidate: 1.25.3-1~jammy
  Version table:
 *** 1.25.3-1~jammy 500
        500 http://nginx.org/packages/ubuntu jammy/nginx amd64 Packages
        100 /var/lib/dpkg/status
\`\`\`

4. Ejecuta \`04-limpieza.sh\` y compara el espacio en disco contra la línea base del paso 1.
5. Registra el resultado en \`historial.md\` y revisa el log real del sistema para confirmar la traza de la operación:

\`\`\`bash
tail -30 /var/log/apt/history.log
\`\`\`

### 📋 Lo que debes recordar

* \`apt policy\` (o \`dnf info ... | grep "From repo"\`) es el comando que confirma que un paquete vino del repositorio esperado, no de uno genérico.
* Registrar un repositorio de terceros siempre implica verificar su clave GPG (\`signed-by\`) — instalar sin verificar la firma es aceptar código sin garantía de origen.
* \`dpkg -L\` / \`rpm -ql\` muestran exactamente qué archivos trajo un paquete al sistema, útil para auditar cambios.
* \`apt autoremove\` + \`apt clean\` después de instalar evita que la caché de paquetes crezca sin control en servidores de producción.
* El historial (\`/var/log/apt/history.log\` o \`dnf history\`) es la fuente de verdad de lo que realmente se ejecutó, más confiable que la memoria del administrador.

### 🧪 Autoevaluación

1. ¿Por qué se prefiere registrar el repositorio oficial de nginx en lugar de instalar la versión que trae por defecto el repositorio de la distro?
2. Si \`apt policy nginx\` muestra que el paquete instalado NO proviene de \`nginx.org\`, ¿qué paso del proyecto se saltó o hizo mal el administrador?
3. ¿Qué diferencia hay entre \`apt clean\` y \`apt autoclean\`?

---

1. Porque el repositorio de la distro suele traer una versión más antigua de nginx (fijada al ciclo de release de la distro), mientras que el repositorio oficial de nginx.org ofrece la versión estable más reciente con parches de seguridad al día.
2. Que \`apt update\` se ejecutó sin haber registrado antes el archivo \`/etc/apt/sources.list.d/nginx.list\` (o lo registró apuntando al repo equivocado), por lo que \`apt install\` resolvió el paquete contra el repositorio genérico de la distro en vez del oficial.
3. \`apt clean\` elimina TODA la caché de paquetes \`.deb\` descargados; \`apt autoclean\` elimina solo las versiones que ya no se pueden volver a descargar (paquetes obsoletos que ya no están en los repositorios), conservando los que sí siguen disponibles.
`

export default content
