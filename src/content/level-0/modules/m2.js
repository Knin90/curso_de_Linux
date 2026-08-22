const content = `
## Módulo 2 — Historia y filosofía: Unix, GNU, Linus Torvalds y el software libre

### 🎯 Objetivos de aprendizaje

* Conocer el origen de Unix y su influencia directa sobre el diseño de Linux.
* Entender el proyecto GNU y por qué el nombre técnicamente correcto es "GNU/Linux".
* Diferenciar **software libre** de **open source** y comprender por qué la distinción importa.

### ❓ Problema real que resuelve

Muchas decisiones de diseño que hoy parecen "así es como funciona la terminal" (todo es un archivo, programas pequeños que se combinan con tuberías, permisos de usuario) no son arbitrarias: son herencia directa de decisiones tomadas hace más de 50 años en Unix. Entender esa historia ayuda a entender *por qué* Linux se comporta como se comporta, en lugar de memorizar comandos sin contexto.

### 💡 Analogía

La historia de Linux es como la historia de un idioma vivo. **Unix** es el latín: una lengua original de la que derivan muchas otras (BSD, System V, y conceptualmente Linux). **GNU** es como un diccionario y una gramática completos, escritos desde cero para ser libres de usar por cualquiera, a los que solo les faltaba una pieza central. **Linus Torvalds**, en 1991, escribió esa pieza que faltaba: el kernel. Fue como completar un idioma al que ya le sobraba vocabulario pero le faltaba un verbo fundamental.

\`\`\`diagram
{"type":"side-by-side","gapLabels":["+","+","="],"columns":[{"title":"Unix","icon":"server","rows":["Es el latín","Sistema original de los 70s"]},{"title":"GNU","icon":"package","rows":["Diccionario y gramática","Herramientas libres, sin kernel propio"]},{"title":"Kernel","icon":"chip","rows":["El verbo que faltaba","Escrito por Linus en 1991"]},{"title":"Linux","icon":"terminal","focal":true,"rows":["Idioma completo","GNU + kernel Linux"]}]}
\`\`\`

### 📖 Explicación técnica

* **Unix (1969)**: sistema operativo creado en los Bell Labs de AT&T por Ken Thompson y Dennis Ritchie. Introdujo ideas que siguen vigentes: sistema de archivos jerárquico, "todo es un archivo", procesos, tuberías (\`|\`) para encadenar programas pequeños y especializados.
* **Proyecto GNU (1983)**: iniciado por **Richard Stallman**, con el objetivo de crear un sistema operativo completo, compatible con Unix, pero enteramente libre. Para 1991, GNU ya tenía compilador (\`gcc\`), editor (\`emacs\`), shell (\`bash\`) y decenas de utilidades — pero le faltaba el kernel propio (**GNU Hurd**), que nunca maduró a tiempo.
* **Linus Torvalds (1991)**: estudiante finlandés que, como proyecto personal, publicó el código de un kernel propio inspirado en Unix. Al combinarse con las herramientas de GNU, formó un sistema operativo completo y utilizable: de ahí que el nombre técnicamente preciso sea **GNU/Linux**, aunque el uso común lo abrevie a "Linux".
* **Software libre vs open source**: ambos términos describen software cuyo código fuente es accesible y modificable, pero parten de énfasis distintos.

| Aspecto | Software libre (*Free Software*) | Open Source |
| --- | --- | --- |
| **Origen** | Richard Stallman, FSF (1985) | Open Source Initiative (1998) |
| **Énfasis** | Ético: libertad del usuario | Práctico: eficiencia y calidad del desarrollo colaborativo |
| **Licencia emblemática** | GPL (*copyleft*: las modificaciones también deben ser libres) | Licencias permisivas como MIT o Apache también encajan |
| **Lema representativo** | "Piensa en libre como en libertad, no como en gratis" | "El código abierto produce mejor software" |

### ⚙️ ¿Qué ocurre internamente?

Línea de tiempo simplificada:

\`\`\`text
1969 ── Unix (Bell Labs / AT&T)
   │
   ├── Deriva en múltiples ramas comerciales y académicas (BSD, System V...)
   │
1983 ── Nace el proyecto GNU (Richard Stallman)
   │      Se construyen: gcc, bash, emacs, coreutils...
   │      Falta: un kernel libre y estable
   │
1991 ── Linus Torvalds publica el kernel Linux (versión 0.01)
   │
   ▼
GNU + Linux = sistema operativo libre completo y usable
   │
   ▼
Distribuciones empaquetan GNU/Linux para el público: Slackware,
Debian, Red Hat, y de ahí en adelante todo el ecosistema actual.
\`\`\`

### 💻 Ejemplo básico

Ver la licencia bajo la que se distribuye el propio kernel, incluida en casi cualquier sistema Linux instalado:

\`\`\`bash
zcat /usr/share/doc/*/copyright 2>/dev/null | grep -i gpl | head -1
\`\`\`

Consultar la licencia de un paquete concreto de utilidades GNU (ejemplo con \`bash\`):

\`\`\`bash
bash --version
\`\`\`

*La salida incluye una línea como "License GPLv3+", confirmando que es software libre bajo licencia GPL.*

### 🏢 Caso de uso profesional

Cuando una empresa decide qué licencia usar para un componente interno que planea publicar, el equipo legal necesita distinguir si busca *permitir cualquier uso, incluso privativo* (licencias tipo MIT/Apache, más cercanas al espíritu "open source") o *garantizar que las mejoras de terceros también permanezcan libres* (licencias tipo GPL, con *copyleft*, más cercanas al espíritu "software libre"). Elegir mal la licencia puede tener consecuencias legales y de negocio años después.

### 📋 Lo que debes recordar

* **Unix** sentó las bases de diseño que Linux hereda: jerarquía de archivos, procesos, tuberías.
* **GNU** aportó casi todas las herramientas de un sistema Unix libre, pero le faltaba el kernel.
* **Linus Torvalds** aportó ese kernel en 1991; por eso el nombre técnico correcto es GNU/Linux.
* **Software libre** enfatiza la libertad del usuario (FSF, GPL); **open source** enfatiza el modelo de desarrollo colaborativo (OSI). No son sinónimos, aunque en la práctica se solapan mucho.

### 🧪 Autoevaluación rápida

1. ¿Por qué muchos consideran más preciso decir "GNU/Linux" en lugar de solo "Linux"?
2. ¿Qué aportó exactamente Linus Torvalds al ecosistema en 1991?
3. ¿Cuál es la diferencia principal de énfasis entre software libre y open source?

---

1. Porque el sistema operativo utilizable resulta de combinar el kernel Linux con las herramientas y utilidades desarrolladas por el proyecto GNU, que existían antes que el kernel.
2. El kernel: la pieza central que le faltaba al proyecto GNU para tener un sistema operativo libre completo y funcional.
3. El software libre pone el énfasis en la libertad ética del usuario (FSF/GPL); el open source pone el énfasis en las ventajas prácticas del desarrollo colaborativo (OSI).
`

export default content
