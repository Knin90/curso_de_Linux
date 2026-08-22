const content = `
## Módulo 8 — Proyecto real: infraestructura de identidades para una empresa de software

### 🎯 Objetivos de aprendizaje

* Diseñar e implementar una estructura de seguridad de identidades desde cero.
* Combinar permisos UGO, SGID y ACLs en un escenario con varios equipos y niveles de acceso.
* Verificar el acceso real iniciando sesión como cada usuario y comprobando el comportamiento.

### ❓ El problema real

Una empresa de software te contrata para dejar listo el acceso a \`/opt/empresa\` antes de que los equipos empiecen a trabajar. Hay desarrolladores, QA, un auditor externo que solo debe poder leer los informes, y una persona de despliegues que necesita una carpeta exclusiva. Los permisos UGO tradicionales no alcanzan para el caso del auditor externo (necesita leer una carpeta cuyo grupo dueño no es el suyo), así que también vas a necesitar ACLs. El entregable es un conjunto de scripts numerados que cualquier compañero pueda releer y volver a ejecutar en un servidor nuevo.

### 📖 Estructura del proyecto

\`\`\`
setup-empresa/
├── 01-crear-grupos.sh
├── 02-crear-usuarios.sh
├── 03-estructura-directorios.sh
├── 04-permisos-sgid.sh
├── 05-acls.sh
└── 06-verificacion.sh
\`\`\`

Equipos y grupos a crear:

\`\`\`text
developers     → dev1, dev2
qa             → tester1
auditor        → auditor_ext  (solo lectura sobre /opt/empresa/informes)
deploy         → deployer     (acceso exclusivo a /opt/empresa/releases)
\`\`\`

### 📖 01-crear-grupos.sh

\`\`\`bash
#!/bin/bash
set -euo pipefail

sudo groupadd developers
sudo groupadd qa
sudo groupadd auditor
sudo groupadd deploy
\`\`\`

### 📖 02-crear-usuarios.sh

\`\`\`bash
#!/bin/bash
set -euo pipefail

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

Verificación rápida tras crear cada usuario:

\`\`\`
$ id dev1
uid=1001(dev1) gid=1001(dev1) groups=1001(dev1),1010(developers)
\`\`\`

### 📖 03-estructura-directorios.sh

\`\`\`bash
#!/bin/bash
set -euo pipefail

sudo mkdir -p /opt/empresa/{codigo,informes,releases}

sudo chown root:developers /opt/empresa/codigo
sudo chown root:qa /opt/empresa/informes
sudo chown root:deploy /opt/empresa/releases
\`\`\`

### 📖 04-permisos-sgid.sh

\`\`\`bash
#!/bin/bash
set -euo pipefail

# codigo: developers rwx, otros sin acceso, SGID para que los archivos hereden el grupo
sudo chmod 2770 /opt/empresa/codigo

# informes: developers y qa pueden leer, el dueño escribe
sudo chmod 2750 /opt/empresa/informes

# releases: solo deployer
sudo chmod 2700 /opt/empresa/releases
\`\`\`

Verificación esperada:

\`\`\`
$ ls -ld /opt/empresa/*/
drwxrws--- 2 root developers ... codigo
drwxr-s--- 2 root qa         ... informes
drwx--S--- 2 root deploy     ... releases   ← S sin x para others (correcto)
\`\`\`

### 📖 05-acls.sh

\`\`\`bash
#!/bin/bash
# developers necesita leer informes, pero el grupo dueño de esa carpeta es qa;
# y auditor_ext necesita una excepción quirúrgica de solo lectura.
set -euo pipefail

setfacl -m g:developers:rx /opt/empresa/informes
setfacl -d -m g:developers:rx /opt/empresa/informes

setfacl -m u:auditor_ext:rx /opt/empresa/informes
setfacl -d -m u:auditor_ext:rx /opt/empresa/informes
\`\`\`

Verificación con \`getfacl\`:

\`\`\`
$ getfacl /opt/empresa/informes
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
\`\`\`

### 📖 06-verificacion.sh — comprobar el acceso real de cada usuario

\`\`\`bash
#!/bin/bash
set -euo pipefail

echo "== dev1 puede acceder a codigo =="
sudo -u dev1 ls /opt/empresa/codigo

echo "== dev1 puede acceder a informes vía ACL de grupo =="
sudo -u dev1 ls /opt/empresa/informes

echo "== auditor_ext puede leer informes pero no escribir =="
sudo -u auditor_ext ls /opt/empresa/informes
sudo -u auditor_ext touch /opt/empresa/informes/test.txt || true

echo "== tester1 NO puede entrar a releases =="
sudo -u tester1 ls /opt/empresa/releases || true

echo "== SGID: dev1 crea un archivo en codigo y hereda el grupo developers =="
sudo -u dev1 touch /opt/empresa/codigo/main.py
ls -l /opt/empresa/codigo/main.py
\`\`\`

### 📖 Secuencia de ejecución

1. Ejecuta \`01-crear-grupos.sh\`.
2. Ejecuta \`02-crear-usuarios.sh\` y confirma con \`id dev1\`.
3. Ejecuta \`03-estructura-directorios.sh\`.
4. Ejecuta \`04-permisos-sgid.sh\` y confirma con \`ls -ld\`.
5. Ejecuta \`05-acls.sh\` y confirma con \`getfacl\`.
6. Ejecuta \`06-verificacion.sh\`.

Salida esperada del paso 6 (fragmentos relevantes):

\`\`\`
== auditor_ext puede leer informes pero no escribir ==
touch: cannot touch '/opt/empresa/informes/test.txt': Permission denied

== tester1 NO puede entrar a releases ==
ls: cannot open directory '/opt/empresa/releases': Permission denied

== SGID: dev1 crea un archivo en codigo y hereda el grupo developers ==
-rw-r--r-- 1 dev1 developers 0 Jan 12 15:02 /opt/empresa/codigo/main.py
\`\`\`

### 📋 Lo que debes recordar

* El flujo correcto es siempre: Grupos → Usuarios → Directorios → Permisos UGO/SGID → ACLs, en ese orden.
* SGID en un directorio resuelve el caos de grupos en trabajo colaborativo: los archivos nuevos heredan el grupo del directorio, no el del usuario que los crea.
* Las ACLs son la solución quirúrgica para excepciones que UGO no puede expresar (como darle acceso a un usuario cuyo grupo no es el dueño del recurso).
* Verifica siempre con \`sudo -u usuario\` para confirmar el comportamiento real, no solo lo que muestra \`ls -l\`.
* \`usermod -G\` sin \`-a\` destruye los grupos secundarios existentes — es el error más común de administradores nuevos.

### 🧪 Autoevaluación

1. ¿Por qué \`developers\` necesita una regla ACL sobre \`/opt/empresa/informes\` en lugar de resolverse solo con permisos UGO?
2. Si \`dev1\` crea un archivo dentro de \`/opt/empresa/codigo\` y el bit SGID está activo, ¿qué grupo queda asignado al archivo nuevo?
3. ¿Qué error common comete un administrador que ejecuta \`usermod -G qa tester1\` en vez de \`usermod -aG qa tester1\`?

---

1. Porque el grupo dueño de \`informes\` es \`qa\`, y \`developers\` no pertenece a ese grupo; UGO solo permite un grupo dueño por recurso, así que se necesita una ACL adicional para dar acceso a un segundo grupo sin cambiar la propiedad.
2. El grupo del directorio padre (\`developers\`), no el grupo primario de \`dev1\`, porque el bit SGID fuerza la herencia del grupo en los archivos y subdirectorios creados dentro de esa carpeta.
3. \`usermod -G\` sin \`-a\` reemplaza por completo la lista de grupos secundarios del usuario, eliminando cualquier grupo al que ya perteneciera; con \`-a\` (append) el nuevo grupo se agrega sin tocar los existentes.
`

export default content
