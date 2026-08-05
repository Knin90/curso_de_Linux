const content = `
## Módulo 1 — ¿Cómo llega el software a tu servidor? Arquitectura general

### 🎯 Objetivos de aprendizaje

* Entender qué problema resuelve un gestor de paquetes.
* Comprender el flujo completo desde el repositorio hasta la aplicación instalada.
* Distinguir entre gestor de alto nivel (APT/DNF) y gestor de bajo nivel (DPKG/RPM).

### ❓ El problema que resuelve

Cuando instalas un navegador web en Linux, no copias un único archivo. Un navegador puede necesitar:

\`\`\`text
  Firefox
  ├── libssl       (cifrado TLS)
  ├── libglib      (funciones del sistema)
  ├── libfontconfig (renderizado de fuentes)
  ├── libpulse     (audio)
  └── libc         (biblioteca base de C)
\`\`\`

Gestionar eso manualmente significaría descargar cada biblioteca por separado, en la versión correcta, sin romper nada ya instalado. El gestor de paquetes coordina ese proceso automáticamente.

### 📖 El flujo completo de instalación

\`\`\`text
  1. Repositorio remoto
     (servidor con miles de paquetes versionados)
          │
          ▼
  2. Índice local
     (lista de qué paquetes existen y en qué versión)
          │
          ▼
  3. Gestor de alto nivel (APT / DNF)
     (resuelve dependencias, planifica la instalación)
          │
          ▼
  4. Descarga del paquete (.deb / .rpm)
          │
          ▼
  5. Verificación de firma GPG
     (¿el paquete no fue manipulado?)
          │
          ▼
  6. Gestor de bajo nivel (DPKG / RPM)
     (extrae archivos, ejecuta scripts)
          │
          ▼
  7. Base de datos local
     (registro de qué está instalado)
          │
          ▼
  8. Aplicación lista en el sistema de archivos
\`\`\`

### 📖 Capas del sistema de paquetes

\`\`\`text
  Usuario
     │
     ▼
  APT / DNF         ← Alto nivel: repositorios, dependencias, actualizaciones
     │
     ▼
  DPKG / RPM        ← Bajo nivel: instala/elimina paquetes individuales
     │
     ▼
  Base de datos     ← Registro de todo lo instalado
     │
     ▼
  Sistema de archivos
\`\`\`

> APT no instala nada por sí solo — llama a DPKG para el trabajo real. DNF llama a RPM. Los gestores de alto nivel resuelven el **qué** instalar; los de bajo nivel hacen el **cómo**.

### 📖 Familias de distribuciones

\`\`\`text
  Familia Debian                    Familia Red Hat
  ─────────────────────────────     ────────────────────────────
  Debian, Ubuntu, Mint, Kali        RHEL, CentOS, Rocky, Fedora

  Alto nivel:  APT                  Alto nivel:  DNF (antes YUM)
  Bajo nivel:  DPKG                 Bajo nivel:  RPM
  Formato:     .deb                 Formato:     .rpm
  Repos:       /etc/apt/            Repos:       /etc/yum.repos.d/
\`\`\`

### 📋 Lo que debes recordar

* Un gestor de paquetes resuelve dependencias automáticamente — eso es su valor principal.
* El flujo siempre es: repositorio → índice → descarga → verificación GPG → instalación → base de datos.
* APT y DNF son gestores de alto nivel. DPKG y RPM son el motor real debajo.

### 🧪 Autoevaluación rápida

1. ¿Qué diferencia hay entre APT y DPKG?
2. Si ejecutas \`apt install nginx\`, ¿descarga solo nginx o también sus dependencias?
3. ¿Por qué existe la verificación GPG en el proceso de instalación?

---

1. APT es el **gestor de alto nivel** que resuelve dependencias y gestiona repositorios. DPKG es el **motor de bajo nivel** que extrae e instala los archivos del paquete.
2. Descarga **nginx más todas sus dependencias** que no estén ya instaladas.
3. Para verificar que el paquete **no fue manipulado** entre el repositorio del desarrollador y tu servidor.
`
export default content
