const content = `
## Módulo 3 — Repositorios y verificación GPG

### 🎯 Objetivos de aprendizaje

* Entender qué es un repositorio y cómo se configura.
* Comprender la estructura de directorios de APT y DNF.
* Saber cómo funciona la verificación GPG y por qué es crítica.
* Añadir repositorios externos siguiendo las prácticas modernas (sin \`apt-key\`).

### 📖 ¿Qué es un repositorio?

Un repositorio es un servidor remoto que contiene paquetes versionados junto con índices firmados digitalmente. Cuando ejecutas \`apt update\`, descargas esos índices — no los paquetes, solo la lista de qué existe y en qué versión.

\`\`\`text
  Repositorio remoto
  ├── Packages.gz       ← índice con todos los paquetes y versiones
  ├── Release           ← metadatos del repositorio
  └── Release.gpg       ← firma GPG del archivo Release

  Repositorio local (caché)
  └── /var/lib/apt/lists/
\`\`\`

### 📖 Verificación GPG: por qué existe

\`\`\`text
  Sin verificación GPG:
  Repositorio comprometido ──► Paquete malicioso ──► Tu servidor infectado

  Con verificación GPG:
  Repositorio comprometido ──► Firma no coincide ──► APT cancela, te avisa
\`\`\`

GPG funciona como un sello de cera digital. El desarrollador firma el índice con su clave privada. Tu sistema verifica con la clave pública. Si alguien modificó el paquete, la firma no coincide y la instalación se cancela.

### 📖 Estructura de configuración APT (Debian/Ubuntu)

\`\`\`text
  /etc/apt/
  ├── sources.list              ← repositorios principales (formato clásico)
  ├── sources.list.d/           ← repositorios adicionales (un archivo por repo)
  │   ├── docker.list
  │   └── nginx.list
  └── trusted.gpg.d/            ← claves GPG de repositorios externos
      ├── docker.gpg
      └── nginx.gpg
\`\`\`

### 📖 Estructura de configuración DNF (Fedora/RHEL)

\`\`\`text
  /etc/yum.repos.d/
  ├── fedora.repo
  ├── fedora-updates.repo
  └── nginx.repo
\`\`\`

### 💻 Ver los repositorios configurados

\`\`\`bash
# Debian/Ubuntu: ver todos los repositorios activos
cat /etc/apt/sources.list
ls /etc/apt/sources.list.d/

# Ver la prioridad y origen de un paquete
apt policy nginx

# RHEL/Fedora: listar repositorios
dnf repolist
dnf repolist --all   # incluye los deshabilitados
\`\`\`

### 💻 Añadir un repositorio externo — método moderno (sin apt-key)

> ⚠️ \`apt-key\` está **obsoleto** desde Debian 11 / Ubuntu 22.04. El método correcto usa \`signed-by=\` con un keyring dedicado.

\`\`\`bash
# 1. Descargar y convertir la clave GPG al formato binario
curl -fsSL https://nginx.org/keys/nginx_signing.key \
  | sudo gpg --dearmor \
  -o /usr/share/keyrings/nginx.gpg

# 2. Añadir el repositorio referenciando la clave
echo "deb [signed-by=/usr/share/keyrings/nginx.gpg] \\
  http://nginx.org/packages/ubuntu $(lsb_release -cs) nginx" \
  | sudo tee /etc/apt/sources.list.d/nginx.list

# 3. Actualizar índices
sudo apt update
\`\`\`

### 💻 Añadir repositorio en DNF (RHEL/Fedora)

\`\`\`bash
# Crear archivo de repositorio
sudo tee /etc/yum.repos.d/nginx.repo <<EOF
[nginx-stable]
name=nginx stable repo
baseurl=http://nginx.org/packages/centos/\\$releasever/\\$basearch/
gpgcheck=1
enabled=1
gpgkey=https://nginx.org/keys/nginx_signing.key
EOF

# Verificar
dnf repolist
\`\`\`

### ⚠️ Errores comunes

\`\`\`text
❌ Error 1: Usar apt-key add
   apt-key está deprecated. Claves añadidas así afectan a TODOS los repos,
   no solo al que corresponde. Usar siempre signed-by= con keyring dedicado.

❌ Error 2: Instalar paquetes .deb descargados de páginas desconocidas
   Un .deb puede ejecutar scripts arbitrarios como root durante la instalación.
   Solo instalar desde repositorios firmados o fuentes oficiales verificadas.

❌ Error 3: Deshabilitar la verificación GPG (gpgcheck=0 en DNF)
   Nunca en producción. Si un repositorio no tiene firma válida, no lo uses.
\`\`\`

### 📋 Lo que debes recordar

* \`apt update\` / \`dnf check-update\` descarga **índices**, no instala nada.
* GPG firma los índices del repositorio — protege contra paquetes manipulados.
* Método moderno APT: clave en \`/usr/share/keyrings/\` + \`signed-by=\` en el archivo del repo.
* \`apt-key\` está obsoleto — no usarlo en sistemas modernos.

### 🧪 Autoevaluación rápida

1. ¿Qué hace \`apt update\` exactamente? ¿Instala actualizaciones?
2. ¿Por qué \`apt-key\` está deprecated y cuál es el método correcto?
3. Si la firma GPG de un paquete no coincide, ¿qué hace APT?

---

1. **No.** \`apt update\` descarga únicamente los índices de paquetes (listas de qué existe). No instala ni actualiza ningún software.
2. \`apt-key\` añade claves a un keyring global que afecta a todos los repositorios — es un riesgo de seguridad. El método correcto es guardar la clave en \`/usr/share/keyrings/\` y referenciarla con \`signed-by=\` solo para ese repositorio específico.
3. **Cancela la instalación** con un error de verificación GPG y no modifica el sistema.
`
export default content
