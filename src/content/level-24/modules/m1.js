const content = `
## Módulo 1 — MAC vs DAC: modelo de seguridad mandatorio vs discrecional

### 🎯 Objetivos de aprendizaje

* Entender la diferencia fundamental entre DAC y MAC.
* Identificar las limitaciones de DAC frente a amenazas reales.
* Comprender el modelo Bell-LaPadula y su relevancia práctica.
* Elegir entre SELinux, AppArmor y seccomp según el caso de uso.

### ❓ El problema real

Un atacante explota una vulnerabilidad en tu servidor web nginx. El proceso nginx corre como usuario \`www-data\` con permisos estándar. Con DAC puro, ese proceso comprometido puede leer cualquier archivo que \`www-data\` pueda leer —incluyendo configuraciones de base de datos, claves privadas en directorios accesibles, o sockets de otros servicios. El atacante tiene todo lo que necesita para moverse lateralmente. MAC detiene esto: aunque nginx esté comprometido, el kernel rechaza cualquier acceso que no esté explícitamente permitido por la política, independientemente de quién sea el propietario del archivo.

### 📖 DAC: Control de Acceso Discrecional

DAC es el modelo de seguridad predeterminado de Unix/Linux. El término "discrecional" significa que el propietario de un recurso decide quién puede acceder a él.

\`\`\`diagram
{"type":"tree","root":{"name":"Proceso (uid=1000)","meta":"archivo.conf · rw-r--r-- (644) · propietario: root","icon":"lock"},"children":[{"name":"Bits de propietario","edgeLabel":"UID == propietario","meta":"se aplican","icon":"user"},{"name":"Bits de grupo","edgeLabel":"GID == grupo","meta":"se aplican","icon":"users"},{"name":"Bits de otros","edgeLabel":"ningún caso anterior","meta":"se aplican","icon":"network"}]}
\`\`\`

*El propietario del archivo controla los permisos; el kernel solo los hace cumplir — nunca los reinterpreta.*

**Mecanismo de DAC en Linux:**

\`\`\`bash
# Permisos estándar Unix
chmod 640 /etc/app/config.conf    # propietario: rw, grupo: r, otros: nada
chown root:appgroup /etc/app/config.conf

# ACLs POSIX (extensión de DAC)
setfacl -m u:webuser:r /etc/app/config.conf
getfacl /etc/app/config.conf

# Ejemplo: proceso con uid=webuser puede leer, uid=otrouser no puede
\`\`\`

**Limitaciones críticas de DAC:**

1. **Root lo puede todo**: si un proceso escala a root (exploit SUID, kernel exploit), DAC no lo detiene.
2. **Confianza transitiva**: si comprometes un proceso, heredas todos sus permisos.
3. **Sin separación por función**: un proceso de aplicación con acceso a /etc puede leer configuraciones de otros servicios.
4. **SUID/SGID como vectores**: binarios SUID ejecutan con privilegios del propietario, ampliando superficie de ataque.

\`\`\`bash
# Binarios SUID: vectores clásicos de escalada
find / -perm -4000 -type f 2>/dev/null
# /usr/bin/passwd, /usr/bin/su, /usr/bin/sudo, /bin/mount...

# Si cualquiera de estos tiene vulnerabilidad → acceso root
# DAC no puede contener el daño post-explotación
\`\`\`

### 📖 MAC: Control de Acceso Mandatorio

MAC invierte el control: la política es definida por el administrador del sistema (o el proveedor del SO) y el kernel la impone. **Ningún proceso puede modificar su propia política de acceso**, ni siquiera root.

\`\`\`diagram
{"type":"nested","container":{"title":"Política del kernel","meta":"archivo.conf con contexto system_u:object_r:httpd_config_t:s0. La política controla el acceso, el propietario no puede cambiarlo."},"items":[{"name":"httpd_t → httpd_config_t","meta":"SÍ, regla explícita en política","icon":"lock"},{"name":"httpd_t → shadow_t","meta":"NO, sin regla → denegado","icon":"alert"}]}
\`\`\`

**Principio de mínimo privilegio con MAC:**

\`\`\`text
Sin MAC (solo DAC):
  nginx comprometido → acceso a todo lo que www-data puede leer

Con MAC (SELinux httpd_t):
  nginx comprometido → acceso SOLO a lo que la política httpd_t permite:
  ✓ /var/www/html (httpd_sys_content_t)
  ✓ /etc/nginx (httpd_config_t)
  ✗ /etc/shadow (shadow_t) → DENEGADO aunque www-data tenga permisos
  ✗ /root/.ssh (ssh_home_t) → DENEGADO
  ✗ /var/lib/mysql (mysqld_db_t) → DENEGADO
  ✗ conexiones de red arbitrarias → DENEGADO
\`\`\`

### 📖 El modelo Bell-LaPadula

Bell-LaPadula (1973) es el fundamento teórico de MAC, diseñado originalmente para sistemas militares de información clasificada.

\`\`\`text
Niveles de clasificación (ejemplo):
  TOP SECRET  (nivel 3)
  SECRET      (nivel 2)
  CONFIDENTIAL (nivel 1)
  UNCLASSIFIED (nivel 0)

Reglas fundamentales:
  1. "No Read Up"   → un proceso en nivel N no puede leer datos de nivel N+1
  2. "No Write Down" → un proceso en nivel N no puede escribir en nivel N-1

Objetivo: información clasificada no "fluye hacia abajo" por accidente o ataque
\`\`\`

En Linux moderno, esto se implementa como MLS (Multi-Level Security) en SELinux, aunque la política más común (targeted) usa un modelo simplificado basado en tipos en lugar de niveles numéricos.

### 📖 SELinux vs AppArmor vs seccomp

Los tres son mecanismos MAC pero con enfoques distintos:

\`\`\`diagram
{"type":"side-by-side","columns":[{"title":"SELinux","icon":"lock","rows":["Base: etiquetas en inodos (contextos persistentes)","Política: Tipo-Enforcement (TE), MLS/MCS opcional","Granularidad: muy alta (syscall-level)","Complejidad: alta (curva de aprendizaje)","Distros: RHEL, Fedora, CentOS, Rocky, AlmaLinux","Robusto a renombrado de archivos (usa inodos, no rutas)","Desventaja: difícil de depurar, puede romper servicios"]},{"title":"AppArmor","icon":"lock","rows":["Base: rutas de sistema de archivos (nombres/rutas)","Política: perfiles por aplicación","Granularidad: alta (path-based)","Complejidad: media (más accesible)","Distros: Ubuntu, Debian, openSUSE","Vulnerable a path traversal en algunos casos","Desventaja: menos cobertura sistémica"]}],"vsLabel":"VS"}
\`\`\`

\`\`\`text
seccomp (Secure Computing Mode):
  - No es MAC completo, sino filtro de syscalls
  - Usado por Docker, Chrome, systemd (SystemCallFilter=)
  - Complementa SELinux/AppArmor, no los reemplaza
  - Ejemplo: permitir solo read/write/open, bloquear socket/execve
\`\`\`

**Cuándo usar cada uno:**

\`\`\`text
SELinux:
  ✓ RHEL/CentOS/Fedora (viene preconfigurado)
  ✓ Entornos donde se necesita certificación (FIPS, Common Criteria)
  ✓ Cuando la política targeted es suficiente (nginx, httpd, sshd)
  ✓ Cuando se necesita MLS para datos clasificados

AppArmor:
  ✓ Ubuntu/Debian en producción
  ✓ Confinamiento de aplicaciones personalizadas
  ✓ Cuando se necesita iterar rápido con aa-genprof
  ✓ Contenedores LXC/LXD

seccomp:
  ✓ Contenedores Docker (ya activo por defecto)
  ✓ Servicios systemd (SystemCallFilter=)
  ✓ Aplicaciones que necesitan sandbox mínimo sin overhead de política
  ✓ Complemento de SELinux/AppArmor para filtrado de syscalls
\`\`\`

### 📋 Lo que debes recordar

* DAC es discrecional: el propietario controla accesos. MAC es mandatorio: el kernel impone política que ni root puede saltarse.
* La limitación crítica de DAC es que root lo puede todo y un proceso comprometido hereda todos los permisos de su usuario.
* SELinux usa etiquetas en inodos (contextos) y es más robusto frente a renombrado de archivos. AppArmor usa rutas y es más accesible.
* Bell-LaPadula: "no read up, no write down" — información clasificada no fluye hacia niveles inferiores.
* seccomp filtra syscalls, no acceso a recursos. Es complementario, no sustituto de MAC.
* En producción: nunca deshabilitar SELinux/AppArmor — usar modo permissive para diagnosticar, enforcing para proteger.

### 🧪 Autoevaluación

1. ¿Por qué DAC no puede contener el daño cuando un proceso nginx comprometido intenta leer /etc/shadow?
2. Un proceso con SELinux tipo \`httpd_t\` intenta leer un archivo con contexto \`mysqld_db_t\`. No existe ninguna regla en la política que lo permita. ¿Qué ocurre?
3. ¿En qué escenario preferirías AppArmor sobre SELinux?

---

1. Porque si el proceso corre como www-data y /etc/shadow tiene permisos 640 (root:shadow), DAC deniega. Pero si escala privilegios (exploit SUID → root), DAC ya no detiene nada. Con MAC, incluso root dentro del dominio httpd_t sigue limitado por la política.
2. El kernel deniega el acceso y registra un AVC denial en el log de auditoría. La regla es: denegado por defecto (default-deny). Sin una regla explícita que permita la operación, no se permite.
3. En Ubuntu/Debian donde AppArmor viene preconfigurado; cuando necesitas confinar una aplicación personalizada rápidamente con aa-genprof; o cuando el equipo no tiene experiencia con SELinux y la curva de aprendizaje sería un riesgo operacional.
`

export default content
