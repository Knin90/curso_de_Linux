const content = `
## Módulo 3 — El sistema UGO: Permisos Base (rwx)

### 🎯 Objetivos de aprendizaje

* Comprender la estructura de permisos User-Group-Others (UGO).
* Interpretar correctamente la salida de \`ls -l\`.
* Entender qué significan \`r\`, \`w\` y \`x\` en archivos **y** en directorios (son diferentes).
* Convertir entre notación simbólica (\`rwx\`) y octal (\`7\`, \`6\`, \`5\`...).

### 📖 Anatomía de los permisos UGO

\`\`\`text
  $ ls -l informe.sh
  -rwxr-x--- 1 carlos developers 2048 Aug 04 10:00 informe.sh

   │ │││ │││ │││
   │ │││ │││ └┴┴── Others (o): resto del mundo  →  --- (sin permisos)
   │ │││ └┴┴────── Group  (g): grupo developers  →  r-x (leer + ejecutar)
   │ └┴┴────────── User   (u): carlos (dueño)    →  rwx (todo)
   └────────────── Tipo: - archivo regular, d directorio, l enlace
\`\`\`

### ⚠️ Permisos en archivos vs. directorios: significados DISTINTOS

Esta es la diferencia que más confunde a los administradores nuevos:

| Permiso | En un **archivo** | En un **directorio** |
| --- | --- | --- |
| \`r\` (4) | Leer el contenido del archivo | Listar los nombres de los archivos dentro |
| \`w\` (2) | Modificar el contenido | Crear, renombrar o eliminar archivos dentro |
| \`x\` (1) | Ejecutar el archivo como programa | Entrar al directorio con \`cd\` y atravesarlo |

> **Ejemplo crítico:** Un directorio con permisos \`644\` (\`rw-r--r--\`) permite listar sus contenidos pero **nadie puede entrar** con \`cd\` porque ninguno tiene el bit \`x\`. El mínimo para un directorio funcional es \`755\`.

### 🔢 Sistema octal: de bits a números

\`\`\`text
  Permiso    Bits       Suma
  ─────────────────────────────
  rwx     =  1 1 1  =  4+2+1 = 7
  rw-     =  1 1 0  =  4+2   = 6
  r-x     =  1 0 1  =  4+1   = 5
  r--     =  1 0 0  =  4     = 4
  -wx     =  0 1 1  =  2+1   = 3
  -w-     =  0 1 0  =  2     = 2
  --x     =  0 0 1  =  1     = 1
  ---     =  0 0 0  =  0     = 0

  Ejemplo completo:
  chmod 750 archivo
        │││
        ││└── Others: 0 = ---
        │└─── Group:  5 = r-x
        └──── User:   7 = rwx
\`\`\`

### 💻 Leer permisos en la práctica

\`\`\`bash
# Ver permisos de archivo
ls -l /etc/passwd

# Ver permisos de directorio (con -d para no listar el contenido)
ls -ld /var/log

# Ver información completa del inodo
stat /etc/hosts
\`\`\`

### 📋 Lo que debes recordar

* Estructura: \`[tipo][User][Group][Others]\` — 10 caracteres en \`ls -l\`.
* \`r\`=4, \`w\`=2, \`x\`=1 — la suma da el número octal.
* Los permisos en **directorios** tienen significado diferente que en archivos.
* Directorio sin \`x\` = no se puede entrar con \`cd\`.

### 🧪 Autoevaluación rápida

1. ¿Qué significa el permiso \`w\` aplicado a un **directorio**?
2. ¿Cuál es el valor octal de los permisos \`r-xr-x---\`?
3. ¿Por qué un directorio con permisos \`644\` no es funcional?

---

1. Permite **crear, renombrar y eliminar archivos** dentro del directorio.
2. \`550\` (r-x=5 para User, r-x=5 para Group, ---=0 para Others).
3. Porque ninguna categoría (ni siquiera el dueño) tiene el bit \`x\` de ejecución, por lo que **nadie puede entrar** con \`cd\`.
`
export default content
