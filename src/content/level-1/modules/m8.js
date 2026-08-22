const content = `
## Módulo 8 — Proyecto real: runbook de instalación para una flota de 3 servidores

### 🎯 Objetivos de aprendizaje

* Completar la instalación de tres distribuciones representativas del ecosistema Linux: **Ubuntu**, **Fedora** y **Debian**.
* Documentar el particionado, el modo de arranque y el estado de cada instalación en un runbook reutilizable.
* Verificar cada instalación con los mismos comandos que usaría un administrador antes de aceptar un servidor nuevo.

### ❓ El problema real

Una startup pequeña te contrata para dejar listos tres servidores base antes de que el equipo de desarrollo empiece a usarlos: uno con **Ubuntu** (equipo de desarrollo web), uno con **Fedora** (equipo que prueba paquetes recientes) y uno con **Debian** (el servidor que se irá a producción, por su estabilidad). No basta con instalar y listo: la empresa exige un runbook escrito que documente cómo se particionó cada disco, en qué modo de firmware arrancó cada máquina, y con qué comandos se verificó que la instalación quedó sana. Ese runbook es el entregable de este proyecto.

### 📖 Estructura del proyecto

\`\`\`
fleet-instalacion/
├── inventario.md
├── ubuntu-particionado.txt
├── fedora-particionado.txt
├── debian-particionado.txt
└── verificacion-post-instalacion.sh
\`\`\`

### 📖 inventario.md — registro de las tres máquinas

\`\`\`text
Servidor 1
  Distro:     Ubuntu Server (instalador Subiquity/Calamares)
  Uso:        entorno de desarrollo web
  Firmware:   UEFI
  Particionado: automático (todo el disco)

Servidor 2
  Distro:     Fedora Server (instalador Anaconda)
  Uso:        pruebas de paquetes recientes
  Firmware:   UEFI
  Particionado: manual, sistema de archivos Btrfs con subvolúmenes

Servidor 3
  Distro:     Debian (Debian Installer, modo texto/gráfico)
  Uso:        candidato a producción
  Firmware:   UEFI
  Particionado: manual — /, /boot/efi, swap
\`\`\`

Cada familia usa un instalador distinto para las mismas tres decisiones: cómo particionar el disco, qué paquetes base incluir y cómo crear el primer usuario.

| Distribución | Instalador | Particularidad relevante |
| --- | --- | --- |
| **Ubuntu** | Subiquity / Calamares | Interfaz simplificada, detecta drivers propietarios automáticamente. |
| **Fedora** | Anaconda | Particionado avanzado; usa Btrfs con subvolúmenes por defecto. |
| **Debian** | Debian Installer | Interfaz tradicional; mayor control granular del particionado. |

### 📖 ubuntu-particionado.txt / fedora-particionado.txt / debian-particionado.txt

Estos tres archivos documentan la decisión tomada en cada instalación, porque el auditor de la empresa los pedirá antes de aceptar el servidor:

\`\`\`text
# ubuntu-particionado.txt
Modo: particionado guiado (usa todo el disco)
Resultado:
  /dev/sda1   ESP (FAT32, 512 MB)   → /boot/efi
  /dev/sda2   ext4 (resto del disco) → /

# fedora-particionado.txt
Modo: particionado manual
Resultado:
  /dev/sda1   ESP (FAT32, 512 MB)   → /boot/efi
  /dev/sda2   Btrfs (resto del disco), subvolúmenes @ y @home

# debian-particionado.txt
Modo: particionado manual
Resultado:
  /dev/sda1   ESP (FAT32, 512 MB)   → /boot/efi
  /dev/sda2   swap (2 GB)
  /dev/sda3   ext4 (resto del disco) → /
\`\`\`

### 📖 verificacion-post-instalacion.sh — script que se corre en cada servidor

\`\`\`bash
#!/bin/bash
# Se ejecuta manualmente en cada uno de los 3 servidores tras la instalación.
set -euo pipefail

echo "== Distribución y kernel =="
lsb_release -a
uname -r

echo "== Punto de montaje de la partición ESP =="
df -h /boot/efi

echo "== Entradas de arranque registradas en el firmware =="
sudo efibootmgr -v
\`\`\`

### 📖 Secuencia de ejecución

1. **Servidor 1 (Ubuntu):** crea la VM en modo UEFI, usa el particionado automático y anota el resultado en \`ubuntu-particionado.txt\`.
2. **Servidor 2 (Fedora):** crea la VM en modo UEFI, elige particionado manual con Btrfs y anota el resultado en \`fedora-particionado.txt\`.
3. **Servidor 3 (Debian):** crea la VM en modo UEFI, define manualmente \`/\`, \`/boot/efi\` y \`swap\`, y anota el resultado en \`debian-particionado.txt\`.
4. En cada servidor, ejecuta \`verificacion-post-instalacion.sh\` y guarda la salida.

Salida esperada del script en cualquiera de los tres servidores:

\`\`\`
== Distribución y kernel ==
Distributor ID: Ubuntu
Description:    Ubuntu 22.04.3 LTS
Release:        22.04
Codename:       jammy
6.5.0-14-generic

== Punto de montaje de la partición ESP ==
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       511M  6.1M  505M   2% /boot/efi

== Entradas de arranque registradas en el firmware ==
BootCurrent: 0000
BootOrder: 0000,0001
Boot0000* ubuntu	HD(1,GPT,...)/File(\\EFI\\ubuntu\\shimx64.efi)
\`\`\`

5. Toma una instantánea (*snapshot*) de cada máquina virtual ya verificada. Servirán como punto de partida para los laboratorios de los siguientes niveles.

### 📋 Lo que debes recordar

* Cada familia de distribuciones usa un instalador distinto (Subiquity/Calamares, Anaconda, Debian Installer) para resolver las mismas tres decisiones: particionado, paquetes base y usuario inicial.
* \`df -h /boot/efi\` confirma que la partición ESP quedó montada donde el sistema la espera.
* \`efibootmgr -v\` muestra si el firmware realmente registró la entrada de arranque de la distro instalada.
* Un runbook de instalación no es opcional en un entorno real: es la evidencia de que el servidor quedó en un estado conocido y verificable.

### 🧪 Autoevaluación

1. ¿Por qué el auditor de la empresa exige que cada instalación quede documentada en un archivo de particionado, en lugar de confiar solo en la memoria del administrador?
2. Si \`df -h /boot/efi\` no muestra ninguna línea montada, ¿qué problema de la instalación estarías diagnosticando?
3. ¿Qué diferencia práctica existe entre el particionado automático de Ubuntu y el particionado manual que usaste en Fedora y Debian?

---

1. Porque la documentación permite auditar y reproducir la instalación sin depender de que el administrador recuerde los detalles; también sirve como evidencia ante fallos futuros o migraciones.
2. Que la partición ESP no se montó correctamente (o no se creó), lo que probablemente impedirá que el firmware UEFI encuentre el cargador de arranque en el siguiente reinicio.
3. El particionado automático delega en el instalador la decisión de tamaños y layout usando todo el disco; el manual exige definir explícitamente cada partición (ESP, swap, raíz), dando más control pero también más responsabilidad sobre errores de configuración.

## 🏁 Cierre del Nivel 1

Al completar este nivel, has adquirido los conocimientos teóricos y prácticos para:

* Identificar el firmware (**BIOS/UEFI**) y gestionar sus entradas de arranque.
* Estructurar el almacenamiento utilizando esquemas de particionado **MBR** o **GPT**.
* Administrar el estado de **Secure Boot** e importar claves **MOK**.
* Desplegar entornos virtuales en **hipervisores** y configurar **WSL2** en Windows.
* Generar medios de arranque **Live USB** seguros mediante hash SHA256.
* Planificar un **Arranque Dual** tomando en cuenta Fast Startup y BitLocker.
* Ejecutar instalaciones completas de **Ubuntu, Fedora y Debian**.
`

export default content
