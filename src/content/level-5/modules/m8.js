const content = `
## Módulo 8 — Laboratorio integrador: ciclo completo de software en producción

### 🎯 Objetivos de aprendizaje

* Ejecutar el ciclo completo de gestión de software como lo haría un administrador en producción.
* Verificar firmas, consultar orígenes, gestionar dependencias y limpiar el sistema.
* Aplicar el mismo flujo tanto en Debian/Ubuntu como en RHEL/Fedora.

### 🏢 Escenario: configuración de un servidor web nuevo

Tienes un servidor recién instalado. El objetivo es instalar nginx desde su repositorio oficial, verificar la instalación, consultar los archivos que introdujo, y dejar el sistema limpio.

---

### 🧪 Fase 1: Estado inicial del sistema

\`\`\`bash
# ¿Cuántos paquetes hay instalados?
dpkg -l | grep "^ii" | wc -l          # Debian
rpm -qa | wc -l                        # RHEL

# ¿Cuánto espacio ocupa la caché de paquetes?
du -sh /var/cache/apt/archives/        # Debian
du -sh /var/cache/dnf/                 # RHEL

# ¿Está nginx instalado?
dpkg -s nginx 2>&1 | grep Status      # Debian
rpm -qi nginx 2>&1 | head -5          # RHEL
\`\`\`

---

### 🧪 Fase 2: Actualizar índices y revisar antes de instalar

\`\`\`bash
# Debian/Ubuntu
sudo apt update
apt list --upgradable 2>/dev/null | wc -l   # ¿cuántas actualizaciones disponibles?

# RHEL/Fedora
sudo dnf check-update
\`\`\`

---

### 🧪 Fase 3: Añadir repositorio oficial de nginx (método moderno)

#### Debian/Ubuntu:

\`\`\`bash
# Descargar clave GPG
curl -fsSL https://nginx.org/keys/nginx_signing.key \
  | sudo gpg --dearmor \
  -o /usr/share/keyrings/nginx.gpg

# Verificar que la clave se guardó correctamente
ls -lh /usr/share/keyrings/nginx.gpg

# Añadir repositorio con referencia signed-by
CODENAME=$(lsb_release -cs)
echo "deb [signed-by=/usr/share/keyrings/nginx.gpg] \\
  http://nginx.org/packages/ubuntu \${CODENAME} nginx" \\
  | sudo tee /etc/apt/sources.list.d/nginx.list

# Actualizar e instalar
sudo apt update
sudo apt install -y nginx
\`\`\`

#### RHEL/Fedora:

\`\`\`bash
# Crear archivo de repositorio
sudo tee /etc/yum.repos.d/nginx.repo <<'EOF'
[nginx-stable]
name=nginx stable repo
baseurl=http://nginx.org/packages/centos/$releasever/$basearch/
gpgcheck=1
enabled=1
gpgkey=https://nginx.org/keys/nginx_signing.key
EOF

# Instalar
sudo dnf install -y nginx
\`\`\`

---

### 🧪 Fase 4: Verificar la instalación

\`\`\`bash
# ¿Desde qué repositorio se instaló?
apt policy nginx                       # Debian — muestra el origen
dnf info nginx | grep "From repo"     # RHEL

# ¿Qué archivos instaló el paquete?
dpkg -L nginx                          # Debian
rpm -ql nginx                          # RHEL

# ¿A qué paquete pertenece el ejecutable principal?
dpkg -S $(which nginx)                 # Debian
rpm -qf $(which nginx)                 # RHEL

# Ver información completa instalada
dpkg -s nginx                          # Debian
rpm -qi nginx                          # RHEL
\`\`\`

---

### 🧪 Fase 5: Inspeccionar dependencias

\`\`\`bash
# Ver el árbol de dependencias de nginx
apt depends nginx                      # Debian
rpm -qR nginx                          # RHEL

# Confirmar que las dependencias están instaladas
apt depends nginx | awk '{print $2}' | xargs dpkg -s 2>/dev/null | grep "^Status"
\`\`\`

---

### 🧪 Fase 6: Eliminar y limpiar

\`\`\`bash
# Debian: eliminar nginx y su configuración
sudo apt purge nginx nginx-common
sudo apt autoremove

# Confirmar que desapareció
dpkg -s nginx 2>&1 | grep Status

# RHEL: eliminar nginx
sudo dnf remove nginx
sudo dnf autoremove

# Verificar
rpm -qi nginx 2>&1 | head -3
\`\`\`

---

### 🧪 Fase 7: Limpiar caché y verificar espacio

\`\`\`bash
# Debian
sudo apt clean
sudo apt autoclean
du -sh /var/cache/apt/archives/

# RHEL
sudo dnf clean all
du -sh /var/cache/dnf/

# Ver espacio recuperado
df -h /
\`\`\`

---

### 🧪 Fase 8: Revisar el historial de lo que hiciste

\`\`\`bash
# Debian: últimas 20 operaciones
tail -30 /var/log/apt/history.log

# RHEL: historial de DNF
dnf history
dnf history info 1    # detalle de la primera transacción de esta sesión
\`\`\`

---

### 📋 Tabla resumen de herramientas del Nivel 5

| Herramienta | Sistema | Función |
| --- | --- | --- |
| \`apt update\` | Debian | Actualizar índices de repositorios |
| \`apt upgrade\` | Debian | Actualizar paquetes instalados |
| \`apt install\` | Debian | Instalar paquete |
| \`apt remove\` | Debian | Eliminar paquete (conserva config) |
| \`apt purge\` | Debian | Eliminar paquete y configuración |
| \`apt autoremove\` | Debian | Eliminar dependencias huérfanas |
| \`apt clean\` | Debian | Limpiar toda la caché |
| \`apt autoclean\` | Debian | Limpiar versiones antiguas de caché |
| \`apt policy\` | Debian | Ver origen y versión disponible |
| \`apt show\` | Debian | Información del paquete |
| \`apt depends\` | Debian | Ver árbol de dependencias |
| \`dpkg -i\` | Debian | Instalar \`.deb\` local |
| \`dpkg -l\` | Debian | Listar paquetes instalados |
| \`dpkg -L\` | Debian | Archivos instalados por un paquete |
| \`dpkg -S\` | Debian | Paquete dueño de un archivo |
| \`dpkg -s\` | Debian | Estado e info del paquete |
| \`dnf check-update\` | RHEL | Ver actualizaciones disponibles |
| \`dnf install\` | RHEL | Instalar paquete |
| \`dnf remove\` | RHEL | Eliminar paquete |
| \`dnf upgrade\` | RHEL | Actualizar paquetes |
| \`dnf info\` | RHEL | Información del paquete |
| \`dnf history\` | RHEL | Historial de transacciones |
| \`dnf clean all\` | RHEL | Limpiar caché |
| \`rpm -qi\` | RHEL | Info del paquete instalado |
| \`rpm -ql\` | RHEL | Archivos del paquete |
| \`rpm -qf\` | RHEL | Paquete dueño de un archivo |
| \`rpm -V\` | RHEL | Verificar integridad de archivos |
`
export default content
