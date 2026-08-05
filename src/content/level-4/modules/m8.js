const content = `
## Módulo 8 — Laboratorio integrador: Infraestructura segura de equipos

### 🎯 Objetivos de aprendizaje

* Diseñar e implementar una estructura de seguridad de identidades desde cero.
* Combinar permisos UGO, SGID, umask y ACLs en un escenario real.
* Verificar el acceso iniciando sesión como cada usuario y comprobando el comportamiento.

### 🏢 Escenario: Infraestructura de una empresa de software

Vas a configurar el acceso a \`/opt/empresa\` para los siguientes equipos:

\`\`\`text
  Grupos y usuarios a crear:
  ──────────────────────────
  developers     → dev1, dev2
  qa             → tester1
  auditor        → auditor_ext  (solo lectura sobre /opt/empresa/informes)
  deploy         → deployer     (acceso a /opt/empresa/releases)
  www-data       → (usuario de sistema, ya existe)

  Estructura de directorios:
  ──────────────────────────
  /opt/empresa/
  ├── codigo/     → developers (rwx), qa (rx), resto: nada
  ├── informes/   → developers (rx), qa (rx), auditor_ext: ACL lectura
  └── releases/   → deployer (rwx), resto: nada
\`\`\`

---

### 🧪 Paso 1: Crear grupos

\`\`\`bash
sudo groupadd developers
sudo groupadd qa
sudo groupadd auditor
sudo groupadd deploy
\`\`\`

---

### 🧪 Paso 2: Crear usuarios y asignarlos a grupos

\`\`\`bash
sudo useradd -m -s /bin/bash dev1
sudo useradd -m -s /bin/bash dev2
sudo useradd -m -s /bin/bash tester1
sudo useradd -m -s /bin/bash auditor_ext
sudo useradd -m -s /bin/bash deployer

sudo usermod -aG developers dev1
sudo usermod -aG developers dev2
sudo usermod -aG qa tester1
sudo usermod -aG auditor auditor_ext
sudo usermod -aG deploy deployer
\`\`\`

Verificar:

\`\`\`bash
id dev1
# uid=1001(dev1) gid=1001(dev1) groups=1001(dev1),1010(developers)
\`\`\`

---

### 🧪 Paso 3: Crear estructura de directorios

\`\`\`bash
sudo mkdir -p /opt/empresa/{codigo,informes,releases}
\`\`\`

---

### 🧪 Paso 4: Asignar propietarios y grupos

\`\`\`bash
sudo chown root:developers /opt/empresa/codigo
sudo chown root:qa /opt/empresa/informes
sudo chown root:deploy /opt/empresa/releases
\`\`\`

---

### 🧪 Paso 5: Configurar permisos UGO + SGID

\`\`\`bash
# codigo: developers rwx, otros sin acceso, SGID para que archivos hereden grupo
sudo chmod 2770 /opt/empresa/codigo

# informes: developers y qa pueden leer, dueño escribe
sudo chmod 2750 /opt/empresa/informes

# releases: solo deployer
sudo chmod 2700 /opt/empresa/releases
\`\`\`

Verificar:

\`\`\`bash
ls -ld /opt/empresa/*/
# drwxrws--- 2 root developers ... codigo
# drwxr-s--- 2 root qa         ... informes
# drwx--S--- 2 root deploy     ... releases  ← S = SGID sin x para others (correcto)
\`\`\`

---

### 🧪 Paso 6: Dar acceso de lectura a developers sobre informes

\`\`\`bash
# developers necesita leer informes pero el grupo dueño es qa
setfacl -m g:developers:rx /opt/empresa/informes
setfacl -d -m g:developers:rx /opt/empresa/informes
\`\`\`

---

### 🧪 Paso 7: Dar acceso de auditoría a auditor_ext (ACL quirúrgica)

\`\`\`bash
# Solo lectura para el auditor externo — sin tocarlo al grupo qa ni a developers
setfacl -m u:auditor_ext:rx /opt/empresa/informes
setfacl -d -m u:auditor_ext:rx /opt/empresa/informes
\`\`\`

Verificar ACL completa:

\`\`\`bash
getfacl /opt/empresa/informes
\`\`\`

\`\`\`text
# file: opt/empresa/informes
# owner: root
# group: qa
user::rwx
group::r-x
group:developers:r-x
user:auditor_ext:r-x
mask::r-x
other::---
default:group:developers:r-x
default:user:auditor_ext:r-x
...
\`\`\`

---

### 🧪 Paso 8: Verificar acceso real con cada usuario

\`\`\`bash
# Verificar que dev1 puede acceder a codigo
sudo -u dev1 ls /opt/empresa/codigo
# (debe listar sin error)

# Verificar que dev1 puede acceder a informes (vía ACL de grupo)
sudo -u dev1 ls /opt/empresa/informes

# Verificar que auditor_ext puede leer informes pero no escribir
sudo -u auditor_ext ls /opt/empresa/informes
sudo -u auditor_ext touch /opt/empresa/informes/test.txt
# touch: cannot touch '/opt/empresa/informes/test.txt': Permission denied  ✓

# Verificar que tester1 NO puede entrar a releases
sudo -u tester1 ls /opt/empresa/releases
# ls: cannot open directory '/opt/empresa/releases': Permission denied  ✓

# Verificar que SGID funciona: dev1 crea un archivo en codigo
sudo -u dev1 touch /opt/empresa/codigo/main.py
ls -l /opt/empresa/codigo/main.py
# -rw-r--r-- 1 dev1 developers ...  ← grupo heredado: developers  ✓
\`\`\`

---

### 📋 Tabla resumen de herramientas del Nivel 4

| Herramienta | Función |
| --- | --- |
| \`id\` | Mostrar UID, GID y grupos del usuario |
| \`groups\` | Listar los grupos del usuario actual |
| \`whoami\` | Mostrar el nombre del usuario actual |
| \`useradd\` | Crear usuario |
| \`usermod -aG\` | Añadir usuario a grupo secundario (siempre con \`-a\`) |
| \`groupadd\` | Crear grupo |
| \`chmod\` | Cambiar permisos (octal o simbólico) |
| \`chown\` | Cambiar propietario y/o grupo |
| \`chgrp\` | Cambiar solo el grupo |
| \`umask\` | Ver o establecer permisos por defecto al crear archivos |
| \`setfacl\` | Crear, modificar o eliminar reglas ACL |
| \`getfacl\` | Consultar todas las reglas ACL de un archivo/directorio |
| \`find -perm\` | Buscar archivos por permisos (auditoría SUID/SGID) |
| \`stat\` | Ver información completa del inodo |

### 📋 Lo que debes recordar

* El flujo correcto: Grupos → Directorios → Permisos UGO → SGID → ACLs (en ese orden).
* SGID en directorios resuelve el caos de grupos en trabajo colaborativo.
* ACLs son la solución quirúrgica para excepciones que UGO no puede expresar.
* Verificar siempre con \`sudo -u usuario\` o \`su - usuario\` para confirmar el comportamiento real.
* \`usermod -G\` sin \`-a\` destruye los grupos secundarios — es el error #1 de administradores novatos.
`
export default content
