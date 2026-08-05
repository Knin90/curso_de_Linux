const content = `
## Módulo 2 — Identidad: Usuarios, Grupos, UID y GID

### 🎯 Objetivos de aprendizaje

* Entender que Linux trabaja con números (UID/GID), no con nombres.
* Administrar usuarios y grupos con \`useradd\`, \`usermod\`, \`groupadd\`.
* Conocer los tres archivos críticos que definen la identidad en Linux.
* Saber la diferencia entre el grupo \`sudo\` (Debian/Ubuntu) y \`wheel\` (RHEL/Fedora).

### ❓ Problema real que resuelve

Tienes una aplicación web (Nginx) y una base de datos (PostgreSQL) en el mismo servidor. Si un hacker explota Nginx, **no debería tener acceso a los archivos de PostgreSQL**. La separación de identidades (usuarios del sistema) es la primera línea de defensa.

### 💡 Analogía

En Linux, los usuarios no son solo personas humanas. Son **tarjetas de identificación de empleados**. Nginx tiene su propia tarjeta (\`www-data\`) y PostgreSQL tiene la suya (\`postgres\`). Si la tarjeta de Nginx es comprometida, no abre la puerta de PostgreSQL.

### 📖 UID y GID: Linux solo entiende números

\`\`\`text
  Nombre visible    UID (número interno)
  ─────────────     ────────────────────
  root              0          ← UID 0 = privilegios totales
  daemon            1
  www-data          33
  postgres          114
  carlos            1001       ← Usuarios normales empiezan en 1000
  jrodriguez        1002

  GID (Grupo principal)    Grupos secundarios
  ─────────────────────    ──────────────────
  jrodriguez (GID 1002)    developers, docker, sudo
\`\`\`

> **UID 0 es especial**: cualquier proceso que corre con UID 0 tiene privilegios absolutos sobre el sistema. No es que \`root\` tenga permisos especiales — es que el kernel trata el UID 0 de forma especial en su código.

### 📁 Los tres archivos críticos de identidad

| Archivo | Contenido | Permisos |
| --- | --- | --- |
| \`/etc/passwd\` | Usuarios: nombre, UID, GID, directorio home, shell | Legible por todos |
| \`/etc/shadow\` | Hashes de contraseñas (cifradas) | Solo root |
| \`/etc/group\` | Grupos y sus miembros | Legible por todos |

\`\`\`bash
# Ver la entrada de un usuario en /etc/passwd
grep jrodriguez /etc/passwd
# jrodriguez:x:1002:1002::/home/jrodriguez:/bin/bash
#    nombre  hash UID GID   home           shell
\`\`\`

### 💻 Gestión de usuarios y grupos

#### Crear usuario con home y shell:

\`\`\`bash
sudo useradd -m -s /bin/bash jrodriguez
sudo passwd jrodriguez
\`\`\`

#### Verificar identidad completa:

\`\`\`bash
id jrodriguez
# uid=1002(jrodriguez) gid=1002(jrodriguez) groups=1002(jrodriguez),1005(developers)
\`\`\`

#### Crear un grupo:

\`\`\`bash
sudo groupadd developers
\`\`\`

#### Añadir usuario a grupo secundario:

\`\`\`bash
sudo usermod -aG developers jrodriguez
\`\`\`

> ⚠ **Error crítico**: \`usermod -G developers jrodriguez\` (sin \`-a\`) **elimina todos los grupos secundarios** del usuario y lo deja solo en \`developers\`. Siempre usa \`-aG\` (append + Group).

#### Diferencia de grupo administrador según distro:

\`\`\`text
  Debian / Ubuntu     →   grupo: sudo
  Fedora / RHEL / Rocky   →   grupo: wheel

  # Debian/Ubuntu:
  sudo usermod -aG sudo jrodriguez

  # RHEL/Fedora/Rocky:
  sudo usermod -aG wheel jrodriguez
\`\`\`

#### Eliminar usuario (conservando home):

\`\`\`bash
sudo userdel jrodriguez
\`\`\`

#### Eliminar usuario y su directorio home:

\`\`\`bash
sudo userdel -r jrodriguez
\`\`\`

### 📋 Lo que debes recordar

* Linux usa UID y GID numéricos internamente; los nombres son solo alias para humanos.
* UID 0 = root = privilegios absolutos.
* Archivos críticos: \`/etc/passwd\`, \`/etc/shadow\`, \`/etc/group\`.
* Siempre usar \`-aG\` (nunca solo \`-G\`) al agregar grupos secundarios.
* Grupo admin: \`sudo\` en Debian/Ubuntu, \`wheel\` en RHEL/Fedora.

### 🧪 Autoevaluación rápida

1. ¿Por qué el UID 0 tiene privilegios especiales en Linux?
2. ¿Qué archivo almacena los hashes de contraseñas de los usuarios?
3. ¿Qué consecuencia tiene ejecutar \`usermod -G developers usuario\` sin la bandera \`-a\`?

---

1. Porque el **kernel trata el UID 0 de forma especial** en su código, otorgándole privilegios absolutos.
2. El archivo **\`/etc/shadow\`** (solo legible por root).
3. **Elimina todos los grupos secundarios** del usuario excepto \`developers\`. Siempre usar \`-aG\`.
`
export default content
