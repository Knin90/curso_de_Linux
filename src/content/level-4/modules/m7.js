const content = `
## Módulo 7 — Listas de Control de Acceso (ACLs)

### 🎯 Objetivos de aprendizaje

* Entender por qué el sistema UGO tiene un límite estructural y cuándo las ACLs lo resuelven.
* Crear, leer y eliminar reglas ACL con \`setfacl\` y \`getfacl\`.
* Comprender la máscara ACL y por qué puede hacer que una regla "correcta" no funcione.
* Configurar ACLs por defecto para que hereden en subdirectorios.

### ❓ El límite del sistema UGO

El sistema UGO tiene exactamente **3 ranuras** de permiso:

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"Sistema UGO (rígido)","rows":["Dueño (User)","Grupo (Group)","Otros (Others)"]},{"title":"Sistema ACL (flexible)","rows":["Dueño (User)","Grupo (Group)","Otros (Others)","usuario: X (ACL entry)","grupo: Y (ACL entry)"]}],"vsLabel":"VS"}
\`\`\`

**Escenario real:** El archivo \`balances_2026.csv\` pertenece al usuario \`finanzas\` y al grupo \`directores\`. El auditor externo necesita leerlo durante 3 días. No quieres añadirlo al grupo \`directores\` (tiene acceso a mucho más), ni cambiar el dueño del archivo. Con UGO estándar, no hay solución. Con ACL, sí.

### 💻 setfacl: crear reglas ACL

\`\`\`bash
# Dar permiso de lectura al usuario auditor_externo
setfacl -m u:auditor_externo:r balances_2026.csv

# Dar permiso de lectura y escritura a un grupo específico
setfacl -m g:auditores:rw balances_2026.csv

# Eliminar la regla ACL de un usuario específico
setfacl -x u:auditor_externo balances_2026.csv

# Eliminar TODAS las ACLs del archivo (restaurar UGO puro)
setfacl -b balances_2026.csv
\`\`\`

### 💻 getfacl: leer las reglas ACL

\`\`\`bash
getfacl balances_2026.csv
\`\`\`

\`\`\`text
# file: balances_2026.csv
# owner: finanzas
# group: directores
user::rw-               ← dueño: lectura + escritura
user:auditor_externo:r--  ← ACL: auditor solo lectura
group::r--              ← grupo directores: solo lectura
mask::r--               ← máscara efectiva
other::---              ← resto del mundo: sin acceso
\`\`\`

> Al hacer \`ls -l\`, verás un \`+\` al final: \`-rw-r--r--+\` — indica que hay ACLs activas.

### 📖 La máscara ACL: por qué importa

La \`mask\` es el elemento que más confunde a los administradores. Define el **permiso máximo efectivo** para todas las entradas ACL (excepto el dueño y \`other\`).

\`\`\`text
  Regla ACL definida:    user:auditor_externo:rwx
  Máscara (mask):                          r--
  ─────────────────────────────────────────────
  Permiso efectivo:                        r--   (rwx AND r-- = r--)
\`\`\`

\`\`\`bash
# Ver el permiso efectivo en getfacl
getfacl archivo.txt
# user:auditor_externo:rwx       #effective:r--

# Cambiar la máscara
setfacl -m mask::rwx archivo.txt
\`\`\`

> \`chmod\` sobre un archivo con ACLs **modifica la máscara**, no los permisos UGO directamente. Esto puede hacer que las ACLs definidas queden reducidas silenciosamente.

### 💻 ACLs por defecto: herencia en directorios

Las ACLs por defecto se aplican automáticamente a todos los archivos y subdirectorios creados dentro de un directorio:

\`\`\`bash
# Aplicar ACL por defecto al directorio /opt/proyecto
setfacl -d -m u:auditor_externo:rx /opt/proyecto

# Verificar
getfacl /opt/proyecto
\`\`\`

\`\`\`text
# file: /opt/proyecto
# owner: root
# group: developers
user::rwx
group::rwx
other::---
default:user::rwx          ← ACLs por defecto
default:user:auditor_externo:rx
default:group::rwx
default:mask::rwx
default:other::---
\`\`\`

### 💻 ACLs recursivas a un árbol existente

\`\`\`bash
# Aplicar a todos los archivos y subdirectorios existentes
setfacl -R -m u:auditor_externo:rx /opt/proyecto
\`\`\`

### 📋 Lo que debes recordar

* ACLs extienden UGO cuando necesitas permisos granulares para usuarios/grupos específicos.
* \`setfacl -m\` modifica, \`setfacl -x\` elimina una entrada, \`setfacl -b\` elimina todas.
* La **máscara** limita los permisos efectivos de todas las entradas ACL (excepto dueño y \`other\`).
* \`chmod\` sobre un archivo con ACLs modifica la máscara — puede reducir ACLs silenciosamente.
* ACLs \`-d\` (default) hacen que los archivos nuevos hereden las reglas automáticamente.

### 🧪 Autoevaluación rápida

1. ¿Qué hace la máscara ACL y por qué puede causar que una regla "correcta" no funcione?
2. ¿Cómo eliminas TODAS las ACLs de un archivo y vuelves a UGO puro?
3. Si defines \`user:pedro:rwx\` y la máscara es \`r--\`, ¿qué permisos efectivos tendrá Pedro?

---

1. La máscara define el **permiso máximo efectivo** para entradas ACL. Si una regla otorga más permisos que la máscara, el permiso real queda reducido al intersecto (AND binario). Puede pasar silenciosamente al ejecutar \`chmod\`.
2. Con \`setfacl -b archivo\`.
3. Solo \`r--\` (lectura). La máscara \`r--\` reduce \`rwx\` al intersecto: solo el bit de lectura está en ambos.
`
export default content
