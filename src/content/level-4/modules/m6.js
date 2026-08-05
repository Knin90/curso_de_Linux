const content = `
## Módulo 6 — Permisos Especiales: SUID, SGID y Sticky Bit

### 🎯 Objetivos de aprendizaje

* Entender cuándo y por qué el sistema UGO estándar se queda corto.
* Aplicar SUID, SGID y Sticky Bit con criterio profesional.
* Identificar archivos con bits especiales y evaluar si representan un riesgo.

### ❓ Problema real que resuelve

Escenario 1: El comando \`passwd\` permite a cualquier usuario cambiar su propia contraseña, pero \`/etc/shadow\` solo puede escribirlo \`root\`. ¿Cómo puede un usuario normal modificar ese archivo?

Escenario 2: Tu equipo de desarrollo comparte la carpeta \`/opt/proyecto\`. Cada dev crea archivos, pero esos archivos heredan su grupo personal en lugar del grupo \`developers\`. Colaborar se vuelve un caos de permisos.

Escenario 3: El directorio \`/tmp\` es escribible por todos. Cualquier usuario podría borrar los archivos temporales de otro. ¿Cómo se protege?

Los tres bits especiales resuelven exactamente estos tres escenarios.

### 📖 SUID — Set-User-ID (bit 4000)

Cuando se aplica a un **ejecutable**, el proceso corre con el UID del **dueño del archivo**, no del usuario que lo lanza.

\`\`\`text
  Usuario carlos (UID 1001)
         │
         ▼
  Ejecuta: /usr/bin/passwd
         │
  ¿Tiene SUID? Sí (dueño = root)
         │
         ▼
  El proceso corre con UID 0 (root)
         │
         ▼
  Puede escribir en /etc/shadow
         │
         ▼
  Contraseña actualizada
\`\`\`

\`\`\`bash
# Ver que passwd tiene SUID (la 's' en el bit de ejecución del dueño)
ls -l /usr/bin/passwd
# -rwsr-xr-x 1 root root 68208 /usr/bin/passwd
#    ^
#    's' = SUID activo + x presente

# Aplicar SUID a un ejecutable propio
chmod u+s mi_programa
# o en octal: chmod 4750 mi_programa
\`\`\`

> ⚠️ **Riesgo de seguridad:** Un archivo SUID de root mal programado puede ser explotado para escalada de privilegios. Audita periódicamente: \`find / -perm -4000 -type f 2>/dev/null\`

### 📖 SGID — Set-Group-ID (bit 2000)

**En ejecutables:** el proceso corre con el GID del dueño del archivo (análogo a SUID pero para grupo).

**En directorios (el uso más valioso):** todo archivo o subdirectorio creado dentro hereda el grupo del directorio padre, sin importar el grupo principal del usuario que lo creó.

\`\`\`text
  Directorio: /opt/proyecto  (grupo: developers, SGID activo)
       │
       ├── carlos crea informe.txt  →  grupo: developers  ✓
       ├── ana crea deploy.sh       →  grupo: developers  ✓
       └── pedro crea config.yml    →  grupo: developers  ✓

  Sin SGID:
       ├── carlos crea informe.txt  →  grupo: carlos   ✗
       ├── ana crea deploy.sh       →  grupo: ana      ✗
       └── pedro crea config.yml    →  grupo: pedro    ✗
\`\`\`

\`\`\`bash
# Aplicar SGID al directorio del equipo
sudo chmod g+s /opt/proyecto
# o en octal: sudo chmod 2770 /opt/proyecto

# Verificar (la 's' aparece en el bit de ejecución del grupo)
ls -ld /opt/proyecto
# drwxrwsr-x 2 root developers 4096 /opt/proyecto
#       ^
#       's' = SGID activo
\`\`\`

### 📖 Sticky Bit (bit 1000)

**En directorios:** aunque todos los usuarios puedan escribir en el directorio, cada usuario solo puede **eliminar sus propios archivos**. Los archivos de otros usuarios están protegidos.

\`\`\`bash
# Ver que /tmp tiene Sticky Bit (la 't' en el bit de ejecución de others)
ls -ld /tmp
# drwxrwxrwt 20 root root 4096 /tmp
#          ^
#          't' = Sticky Bit activo

# Aplicar Sticky Bit a un directorio compartido
sudo chmod +t /var/compartido
# o en octal: sudo chmod 1777 /var/compartido
\`\`\`

### 🔢 Resumen de bits especiales en octal

\`\`\`text
  Bit especial    Valor    Ejemplo completo
  ───────────────────────────────────────────
  SUID            4000     chmod 4750 archivo
  SGID            2000     chmod 2770 directorio
  Sticky          1000     chmod 1777 directorio
  SUID + SGID     6000     chmod 6750 archivo
\`\`\`

### 💻 Detectar bits especiales en el sistema

\`\`\`bash
# Encontrar todos los archivos SUID en el sistema
find / -perm -4000 -type f 2>/dev/null

# Encontrar todos los archivos SGID
find / -perm -2000 -type f 2>/dev/null

# Ver 'S' mayúscula (bit set pero sin x) — potencial problema
ls -l archivo_sin_x
# -rwSr--r-- ...  ← S mayúscula = SUID sin permiso de ejecución (inefectivo)
\`\`\`

### 📋 Lo que debes recordar

* **SUID en ejecutable:** proceso hereda UID del dueño (ej. \`passwd\` → root).
* **SGID en directorio:** archivos nuevos heredan el grupo del directorio (colaboración de equipo).
* **Sticky Bit en directorio:** cada usuario solo borra sus propios archivos (ej. \`/tmp\`).
* \`s\` minúscula = bit especial activo con \`x\` presente. \`S\` mayúscula = bit activo sin \`x\` (inefectivo).
* Auditar archivos SUID/SGID regularmente es una práctica de seguridad obligatoria.

### 🧪 Autoevaluación rápida

1. ¿Por qué \`/usr/bin/passwd\` puede escribir en \`/etc/shadow\` aunque lo ejecute un usuario normal?
2. ¿Qué hace el SGID aplicado a un **directorio** en concreto?
3. Si ves \`-rwSr--r--\` en \`ls -l\`, ¿qué indica la \`S\` mayúscula?

---

1. Porque \`/usr/bin/passwd\` tiene el bit **SUID** activo y su dueño es \`root\`. El proceso hereda UID 0 temporalmente.
2. Todo archivo o subdirectorio creado dentro **hereda el grupo del directorio padre**, facilitando la colaboración del equipo.
3. Que el bit SUID está activado pero el archivo **no tiene permiso de ejecución** (\`x\`). El SUID es inefectivo — el proceso no puede ejecutarse con privilegios elevados.
`
export default content
