const content = `
## Módulo 5 — WSL (Windows Subsystem for Linux)

### 🎯 Objetivos de aprendizaje

* Comprender la arquitectura de WSL2 y sus diferencias con una VM convencional.
* Integrar la línea de comandos de Linux en flujos de trabajo sobre Windows.

### ❓ Problema real que resuelve

Iniciar una máquina virtual completa o realizar un arranque dual resulta pesado cuando solo se requiere acceder a herramientas de terminal de Linux desde un entorno Windows.

### 💡 Analogía

WSL es como un **conector de adaptación**: permite usar herramientas diseñadas para un sistema directamente en el entorno de otro, sin necesidad de cambiar de máquina.

### 📖 Explicación técnica

* **WSL 1:** Traducía las llamadas al sistema (*syscalls*) de Linux a llamadas de Windows.
* **WSL 2:** Utiliza un **kernel de Linux real** ejecutado sobre una versión optimizada del hipervisor Hyper-V. Ofrece compatibilidad completa con llamadas al sistema, soporte para Docker y soporte para aplicaciones gráficas (WSLg).

\`\`\`text
Windows 10 / 11
       │
       ▼
Hyper-V Architecture (Arquitectura ligera)
       │
       ▼
Kernel de Linux Oficial
       │
       ▼
Distribución (Ubuntu, Debian, Fedora Remix)
\`\`\`

### 💻 Ejemplo básico

Comandos esenciales de administración de WSL en Windows PowerShell:

\`\`\`powershell
# Instalar distribución por defecto (Ubuntu)
wsl --install

# Listar distribuciones instaladas y versión del motor
wsl -l -v

# Cambiar la versión por defecto a WSL 2
wsl --set-default-version 2
\`\`\`

### 🏢 Caso de uso profesional

Equipos de desarrollo y DevOps que utilizan estaciones de trabajo con Windows emplean WSL2 para ejecutar contenedores Docker y scripts de Bash de forma nativa, integrándolo con editores como VS Code.

### ⚠️ Advertencia crítica de rendimiento

> Guardar archivos de proyectos dentro del sistema de archivos de Windows (ej. \`/mnt/c/Users/...\`) desde WSL2 degrada drásticamente la velocidad de lectura/escritura (E/S).
> **Regla de oro:** Trabaja los proyectos siempre dentro del sistema de archivos nativo de Linux (ej. \`/home/usuario/proyectos/\`).

### 🧪 Laboratorio guiado

1. Instala WSL2 en un equipo con Windows 10/11.
2. Abre la terminal de la distribución instalada y ejecuta \`uname -a\`.
3. Navega al directorio raíz del sistema de archivos de Linux (\`/\`) y compara los tiempos de respuesta frente al directorio montado \`/mnt/c/\`.
`

export default content
