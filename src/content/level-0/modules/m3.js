const content = `
## Módulo 3 — El ecosistema de distribuciones: familias y cómo elegir una

### 🎯 Objetivos de aprendizaje

* Identificar las principales familias de distribuciones y sus relaciones de parentesco.
* Comparar gestores de paquetes y ciclos de lanzamiento entre familias.
* Aplicar criterios objetivos para elegir una distribución según el objetivo del usuario.

### ❓ Problema real que resuelve

Un recién llegado a Linux suele quedar paralizado ante la cantidad de distribuciones disponibles: cientos de proyectos, cada uno con su propio nombre, filosofía y comunidad. Sin un mapa mental de las familias principales, elegir se vuelve una decisión arbitraria basada en qué video de YouTube se vio último, en lugar de una decisión informada según las necesidades reales.

### 💡 Analogía

Piensa en las distribuciones como **familias de idiomas**. Así como el español, el italiano y el francés derivan del latín y comparten gramática y vocabulario reconocibles entre sí, distribuciones como Ubuntu, Linux Mint y Pop!_OS derivan de Debian y comparten su gestor de paquetes y buena parte de su estructura interna. Aprender "el idioma base" de una familia te permite entender, con pequeños ajustes, a casi todos sus "dialectos".

### 📖 Explicación técnica

Las tres grandes familias que dominan el ecosistema de escritorio y servidor:

| Familia | Distribuciones representativas | Gestor de paquetes | Formato de paquete | Ciclo de lanzamiento típico |
| --- | --- | --- | --- | --- |
| **Debian/Ubuntu** | Debian, Ubuntu, Linux Mint, Pop!_OS | \`apt\` / \`apt-get\` | \`.deb\` | Versiones estables fijas (ej. Ubuntu LTS cada 2 años) |
| **Red Hat/Fedora** | Fedora, RHEL, CentOS Stream, AlmaLinux, Rocky Linux | \`dnf\` (antes \`yum\`) | \`.rpm\` | Fedora rápido (~6 meses); RHEL/derivados muy estable |
| **Arch** | Arch Linux, Manjaro, EndeavourOS | \`pacman\` | paquetes propios de Arch | *Rolling release* (actualización continua, sin versiones) |

Otras familias notables fuera de esta tríada: **openSUSE** (gestor \`zypper\`, formato \`.rpm\`, con la herramienta de administración YaST) y las distribuciones **independientes** como Slackware (una de las más antiguas aún vivas) o NixOS (con un modelo de gestión de paquetes declarativo y reproducible, muy distinto al resto).

Un concepto clave para elegir: el **ciclo de lanzamiento**.

* **Estable/fija (*point release*)**: el sistema se congela en una versión y solo recibe parches de seguridad y errores durante un tiempo definido. Prioriza estabilidad sobre novedad. Ejemplo: Debian estable, Ubuntu LTS.
* **Rolling release**: el sistema se actualiza continuamente a las versiones más recientes de cada programa, sin "versiones" del sistema completo. Prioriza tener siempre software actualizado, a cambio de mayor riesgo de romperse. Ejemplo: Arch Linux.

### ⚙️ ¿Qué ocurre internamente?

Mapa simplificado de parentescos entre distribuciones:

\`\`\`diagram
{"type":"tree","root":{"name":"Kernel Linux (1991)","meta":"deriva de Unix (1969)"},"children":[{"name":"Debian","meta":"apt / apt-get, .deb","children":[{"name":"Ubuntu","children":[{"name":"Pop!_OS"}]},{"name":"Linux Mint"}]},{"name":"Red Hat","meta":"dnf (antes yum), .rpm","children":[{"name":"Fedora"},{"name":"RHEL","children":[{"name":"AlmaLinux","meta":"clon compatible"},{"name":"Rocky Linux","meta":"clon compatible"}]}]},{"name":"Arch","meta":"pacman","children":[{"name":"Manjaro"},{"name":"EndeavourOS"}]}]}
\`\`\`

### 💻 Ejemplo básico

Identificar de qué familia es una distribución instalada, consultando su gestor de paquetes disponible:

\`\`\`bash
# Presente en la familia Debian/Ubuntu
command -v apt && echo "Familia Debian/Ubuntu"

# Presente en la familia Red Hat/Fedora
command -v dnf && echo "Familia Red Hat/Fedora"

# Presente en Arch y derivadas
command -v pacman && echo "Familia Arch"
\`\`\`

### 🏢 Caso de uso profesional

En entornos corporativos, la elección de distribución rara vez es cuestión de gusto personal: **RHEL** (o sus clones gratuitos como **AlmaLinux** y **Rocky Linux**) dominan servidores empresariales por su soporte a largo plazo y certificaciones; **Ubuntu Server** es muy común en infraestructura cloud (AWS, Azure, GCP) por su amplia documentación y compatibilidad; **Debian** se prefiere en servidores donde la estabilidad extrema importa más que tener el software más reciente.

### 🧪 Laboratorio guiado

1. Investiga tres distribuciones que no aparezcan en la tabla de este módulo (por ejemplo openSUSE, Gentoo, NixOS o Alpine) y determina a qué familia pertenece cada una o si es independiente.
2. Para cada una de las tres grandes familias, identifica cuál sería tu elección si el objetivo fuera: (a) máxima estabilidad para un servidor de producción, (b) tener siempre el software más reciente en un equipo personal, (c) aprender Linux "desde los fundamentos".
3. Sin instalar nada todavía, anota qué distribución elegirás para el **Nivel 1 — Instalación** y por qué, según los criterios de este módulo.

### ✅ Resultado esperado

El estudiante puede ubicar cualquier distribución nueva que encuentre dentro de una de las grandes familias, y elegir una distribución de forma justificada según el objetivo (aprendizaje, producción, actualidad de software) en lugar de por moda.

### 📚 Resumen

El ecosistema Linux no es caótico: la inmensa mayoría de distribuciones pertenece a un pequeño número de familias (Debian/Ubuntu, Red Hat/Fedora, Arch), cada una con su propio gestor de paquetes y filosofía de ciclo de lanzamiento. Elegir bien la familia es más importante que elegir bien la distribución específica.

### 🧪 Autoevaluación rápida

1. ¿Qué gestor de paquetes usa la familia Debian/Ubuntu, y qué formato de paquete le corresponde?
2. ¿Cuál es la diferencia fundamental entre un ciclo de lanzamiento estable y uno *rolling release*?
3. Nombra dos distribuciones que sean clones compatibles con RHEL.

---

1. \`apt\` (o \`apt-get\`), con paquetes en formato \`.deb\`.
2. En el estable, el sistema se congela en una versión y solo recibe parches; en el rolling release, el software se actualiza continuamente sin versiones fijas del sistema completo.
3. AlmaLinux y Rocky Linux.
`

export default content
