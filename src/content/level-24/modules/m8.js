const content = `
## Módulo 8 — Proyecto real: implementar MAC completo en un servidor de producción

### 🎯 Objetivos de aprendizaje

* Ejecutar un ciclo completo de diagnóstico y corrección SELinux sobre nginx con configuración no estándar.
* Usar las herramientas del ciclo SELinux: \`getenforce\`, \`setenforce\`, \`audit2why\`, \`semanage\`, \`restorecon\`, \`getsebool\`, \`setsebool\`.
* Configurar y refinar un perfil AppArmor para nginx con \`aa-complain\`, \`aa-logprof\` y \`aa-enforce\`.
* Verificar el estado final de confinamiento en ambos sistemas.

### ❓ El problema real

Tu empresa migra un servidor nginx a producción. La configuración es deliberadamente no estándar para evitar rutas predecibles: el contenido está en \`/opt/webroot\`, el puerto HTTPS es 8443, y nginx actúa como proxy hacia un backend Node en \`localhost:3000\`. Hay dos servidores: uno Rocky Linux 9 (SELinux) y otro Ubuntu 22.04 (AppArmor). Ambos tienen MAC activo. Nada funciona en la primera prueba. Este laboratorio reproduce el problema y lo resuelve paso a paso.

### 📖 Estructura del proyecto

\`\`\`
Rocky Linux 9 (SELinux)
├── /opt/webroot/index.html
├── /etc/nginx/conf.d/produccion.conf
└── contexto: httpd_sys_content_t, puerto 8443 registrado como http_port_t

Ubuntu 22.04 (AppArmor)
├── /var/log/myapp/{access.log,error.log}
└── /etc/apparmor.d/usr.sbin.nginx
\`\`\`

### 📖 Parte A — SELinux en Rocky Linux / RHEL

#### Paso 1: verificar el modo actual

\`\`\`bash
getenforce
# Enforcing

# Para diagnóstico inicial, pasar a permissive temporalmente
# En permissive, SELinux registra pero no bloquea — ideal para ver todos los problemas
setenforce 0
getenforce
# Permissive
\`\`\`

El modo permissive es una herramienta de diagnóstico, no una solución. El objetivo final es volver a enforcing con la política correcta.

#### Paso 2: desplegar nginx con ruta no estándar

\`\`\`bash
# Instalar nginx si no está instalado
dnf install -y nginx

# Crear directorio de contenido en ruta no estándar
mkdir -p /opt/webroot
echo "<h1>Producción</h1>" > /opt/webroot/index.html

# Configurar nginx para servir desde /opt/webroot en puerto 8443
cat > /etc/nginx/conf.d/produccion.conf << 'EOF'
server {
    listen 8443;
    root /opt/webroot;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3000;
    }
}
EOF

# Verificar configuración
nginx -t
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Iniciar nginx
systemctl start nginx
systemctl status nginx
# ● nginx.service - The nginx HTTP and reverse proxy server
#    Active: active (running)
\`\`\`

#### Paso 3: intentar acceder — obtener 403 y 502

\`\`\`bash
# Estamos en permissive, así que nginx arranca, pero veamos qué registra SELinux
curl -s http://localhost:8443/
# <h1>Producción</h1>  ← funciona en permissive porque no bloquea

# Volver a enforcing para ver los errores reales
setenforce 1
getenforce
# Enforcing

curl -s http://localhost:8443/
# <html><head><title>403 Forbidden</title></head><body>...

curl -s http://localhost:8443/api/health
# <html><head><title>502 Bad Gateway</title></head><body>...
\`\`\`

Hay dos problemas: el 403 (contexto de archivos incorrecto) y el 502 (booleano de red desactivado).

#### Paso 4: diagnosticar con audit.log y audit2why

\`\`\`bash
# Ver las denegaciones AVC recientes
grep AVC /var/log/audit/audit.log | tail -10

# Salida representativa:
# type=AVC msg=audit(1722816000.123:456): avc:  denied  { read } for
#   pid=12345 comm="nginx" name="index.html"
#   scontext=system_u:system_r:httpd_t:s0
#   tcontext=unconfined_u:object_r:usr_t:s0 tclass=file permissive=0

# type=AVC msg=audit(1722816001.456:457): avc:  denied  { name_connect } for
#   pid=12345 comm="nginx" dest=3000
#   scontext=system_u:system_r:httpd_t:s0
#   tcontext=system_u:object_r:unreserved_port_t:s0 tclass=tcp_socket permissive=0

# type=AVC msg=audit(1722816002.789:458): avc:  denied  { name_bind } for
#   pid=12345 comm="nginx" src=8443
#   scontext=system_u:system_r:httpd_t:s0
#   tcontext=system_u:object_r:unreserved_port_t:s0 tclass=tcp_socket permissive=0

# Explicar en lenguaje claro
grep AVC /var/log/audit/audit.log | audit2why

# Was caused by:
#   Missing type enforcement (TE) allow rule.
#   /opt/webroot/index.html: httpd_t no tiene permiso de lectura sobre usr_t
#
# Was caused by:
#   Missing boolean: httpd_can_network_connect
#   httpd_t no puede iniciar conexiones de red (necesario para proxy)
#
# Was caused by:
#   Missing port label: 8443 no está definido como http_port_t
\`\`\`

Tres problemas identificados: contexto de archivos, booleano de red, y puerto no registrado.

#### Paso 5: corregir el contexto de /opt/webroot

\`\`\`bash
# Ver contexto actual
ls -Z /opt/webroot/
# unconfined_u:object_r:usr_t:s0 index.html

# Registrar la regla de contexto permanente
semanage fcontext -a -t httpd_sys_content_t "/opt/webroot(/.*)?"

# Confirmar que fue registrada
semanage fcontext -l | grep webroot
# /opt/webroot(/.*)?    all files    system_u:object_r:httpd_sys_content_t:s0

# Aplicar el contexto a los archivos existentes
restorecon -Rv /opt/webroot
# Relabeled /opt/webroot from unconfined_u:object_r:usr_t:s0
#         to unconfined_u:object_r:httpd_sys_content_t:s0
# Relabeled /opt/webroot/index.html from unconfined_u:object_r:usr_t:s0
#         to unconfined_u:object_r:httpd_sys_content_t:s0

# Verificar resultado
ls -Z /opt/webroot/
# unconfined_u:object_r:httpd_sys_content_t:s0 index.html
\`\`\`

#### Paso 6: registrar el puerto 8443 como http_port_t

\`\`\`bash
# Ver puertos actuales
semanage port -l | grep http_port_t
# http_port_t    tcp    80, 443, 488, 8008, 8009, 8080

# 8443 no está listado — añadirlo
semanage port -a -t http_port_t -p tcp 8443

# Verificar
semanage port -l | grep http_port_t
# http_port_t    tcp    80, 443, 488, 8008, 8009, 8080, 8443
\`\`\`

#### Paso 7: activar el booleano para proxy inverso

\`\`\`bash
# Ver estado actual
getsebool httpd_can_network_connect
# httpd_can_network_connect --> off

# Activar de forma permanente
setsebool -P httpd_can_network_connect on

# Confirmar
getsebool httpd_can_network_connect
# httpd_can_network_connect --> on
\`\`\`

#### Paso 8: volver a enforcing y probar

\`\`\`bash
# Asegurarse de estar en enforcing
setenforce 1
getenforce
# Enforcing

# Reiniciar nginx para que reintente el bind al puerto
systemctl restart nginx
systemctl status nginx
# ● nginx.service - The nginx HTTP and reverse proxy server
#    Active: active (running)

# Probar acceso al contenido estático
curl -s http://localhost:8443/
# <h1>Producción</h1>    ← correcto

# Probar proxy (si el backend Node está corriendo)
curl -s http://localhost:8443/api/health
# {"status":"ok"}    ← correcto

# Verificar que no hay nuevas denegaciones AVC
grep AVC /var/log/audit/audit.log | grep "$(date +%H:%M)" | wc -l
# 0
\`\`\`

#### Verificación final del estado SELinux

\`\`\`bash
# Contexto de archivos
ls -Z /opt/webroot/
# unconfined_u:object_r:httpd_sys_content_t:s0 index.html

# Regla de contexto registrada
semanage fcontext -l | grep webroot
# /opt/webroot(/.*)?    all files    system_u:object_r:httpd_sys_content_t:s0

# Puerto registrado
semanage port -l | grep 8443
# http_port_t    tcp    ..., 8443

# Booleano de red activo
getsebool httpd_can_network_connect
# httpd_can_network_connect --> on

# Modo enforcing
getenforce
# Enforcing
\`\`\`

### 📖 Parte B — AppArmor en Ubuntu 22.04

#### Paso 1: verificar el estado de nginx en AppArmor

\`\`\`bash
# Ver todos los perfiles cargados y su modo
aa-status
# apparmor module is loaded.
# 15 profiles are loaded.
# 15 profiles are in enforce mode.
#    /usr/sbin/nginx
# ...

# Ver específicamente nginx
aa-status | grep nginx
# /usr/sbin/nginx (enforce)
\`\`\`

nginx ya tiene un perfil en enforce. Si intentamos servirlo desde una ruta o escribir en un directorio no contemplado en el perfil, AppArmor lo bloqueará.

#### Paso 2: identificar la ruta personalizada que necesitamos

El escenario: nginx necesita escribir logs en \`/var/log/myapp/\` (ruta que no está en el perfil estándar).

\`\`\`bash
# Crear el directorio de logs personalizados
mkdir -p /var/log/myapp
chown www-data:www-data /var/log/myapp

# Configurar nginx para escribir ahí
cat >> /etc/nginx/conf.d/produccion.conf << 'EOF'
access_log /var/log/myapp/access.log;
error_log  /var/log/myapp/error.log;
EOF

nginx -t
# nginx: configuration file /etc/nginx/nginx.conf test is successful

systemctl restart nginx

# ¿Nginx escribe los logs?
ls -la /var/log/myapp/
# total 8
# drwxr-xr-x 2 www-data www-data 4096 Aug  5 10:00 .
# drwxrwxr-x 1 root     root     4096 Aug  5 10:00 ..
# ← directorio vacío: AppArmor bloqueó la creación de los logs

# Confirmar en kern.log
grep -i "apparmor.*DENIED.*nginx" /var/log/kern.log | tail -3
# kernel: [...] audit: type=1400 audit(...): apparmor="DENIED"
#   operation="open" profile="/usr/sbin/nginx"
#   name="/var/log/myapp/access.log" pid=1234 comm="nginx"
#   requested_mask="wc" denied_mask="wc" fsuid=33 ouid=33
\`\`\`

#### Paso 3: pasar nginx a modo complain para capturar accesos

\`\`\`bash
# Poner nginx en modo complain (registra pero no bloquea)
aa-complain /usr/sbin/nginx

# Verificar el cambio de modo
aa-status | grep nginx
# /usr/sbin/nginx (complain)

# Reiniciar nginx — ahora escribirá los logs sin ser bloqueado
systemctl restart nginx

# Generar algo de tráfico para que nginx use los logs
curl -s http://localhost:8443/ > /dev/null
curl -s http://localhost:8443/notfound > /dev/null

# Verificar que los logs se crearon en modo complain
ls -la /var/log/myapp/
# -rw-r--r-- 1 www-data www-data 256 Aug  5 10:05 access.log
# -rw-r--r-- 1 www-data www-data  89 Aug  5 10:05 error.log
\`\`\`

#### Paso 4: usar aa-logprof para generar las reglas

\`\`\`bash
# aa-logprof lee el kern.log y propone reglas para los accesos en complain
aa-logprof

# Salida interactiva representativa:
# Reading log entries from /var/log/kern.log.
# Updating AppArmor profiles in /etc/apparmor.d.
#
# Profile:        /usr/sbin/nginx
# Path:           /var/log/myapp/access.log
# New Mode:       owner w
# Severity:       3
#
# [1 - #include <abstractions/apache2-common>]
#  2 - /var/log/myapp/access.log w,
#  3 - /var/log/myapp/ w,
#  4 - /var/log/myapp/** w,
# (A)llow / [(D)eny] / (I)gnore / (G)lob / Glob with (E)xt / (N)ew / Audi(t) / Abo(r)t / (F)inish
# → Seleccionar opción 4 y presionar A (Allow)
#
# Profile:        /usr/sbin/nginx
# Path:           /var/log/myapp/error.log
# New Mode:       owner w
# → Seleccionar opción 4 y presionar A (Allow)
#
# [(S)ave Changes] / (D)iscard Changes / Finish
# → Presionar S para guardar
\`\`\`

Las reglas quedan escritas automáticamente en el perfil \`/etc/apparmor.d/usr.sbin.nginx\`.

#### Paso 5: verificar el perfil modificado

\`\`\`bash
# Ver el perfil actualizado
grep -A 3 "myapp" /etc/apparmor.d/usr.sbin.nginx
#   /var/log/myapp/** w,

# Si necesitamos ajuste manual (por ejemplo, el glob generado no es exactamente lo que queremos)
nano /etc/apparmor.d/usr.sbin.nginx
# Ajustar: /var/log/myapp/*.log  w,

# Recargar el perfil con los cambios
apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx
\`\`\`

#### Paso 6: volver a modo enforce y probar

\`\`\`bash
# Poner nginx de vuelta en enforce
aa-enforce /usr/sbin/nginx

# Verificar modo
aa-status | grep nginx
# /usr/sbin/nginx (enforce)

# Reiniciar nginx
systemctl restart nginx

# Generar tráfico
curl -s http://localhost:8443/ > /dev/null
sleep 1

# Verificar que nginx sigue escribiendo en /var/log/myapp/
tail -3 /var/log/myapp/access.log
# 127.0.0.1 - - [05/Aug/2026:10:10:01 +0000] "GET / HTTP/1.1" 200 18 "-" "curl/7.81.0"

# Confirmar que no hay nuevas denegaciones de AppArmor para nginx
grep -i "apparmor.*DENIED.*nginx" /var/log/kern.log | grep "$(date +%H:%M)" | wc -l
# 0
\`\`\`

#### Verificación final del estado AppArmor

\`\`\`bash
# Estado global de AppArmor
apparmor_status
# apparmor module is loaded.
# 15 profiles are loaded.
# 15 profiles are in enforce mode.
#    /usr/sbin/nginx
#    ...

# Confirmar que no hay denegaciones recientes para nginx
grep "apparmor.*DENIED.*nginx" /var/log/kern.log | tail -5
# (sin salida — no hay denegaciones)

# Ver las reglas de la ruta personalizada en el perfil
grep myapp /etc/apparmor.d/usr.sbin.nginx
# /var/log/myapp/*.log  w,
\`\`\`

### 📖 Comparativa del proceso completo

El patrón de trabajo es el mismo en SELinux y AppArmor:

| Fase | SELinux | AppArmor |
|---|---|---|
| Diagnosticar sin bloquear | \`setenforce 0\` (permissive) | \`aa-complain /usr/sbin/nginx\` |
| Capturar accesos | \`/var/log/audit/audit.log\` | \`/var/log/kern.log\` |
| Entender denegaciones | \`audit2why\` | leer mensajes DENIED |
| Generar reglas | \`semanage fcontext\`, \`semanage port\`, \`setsebool\` | \`aa-logprof\` (interactivo) |
| Aplicar reglas | \`restorecon\`, registro inmediato | \`apparmor_parser -r\` |
| Activar confinamiento | \`setenforce 1\` | \`aa-enforce /usr/sbin/nginx\` |
| Verificar | \`ls -Z\`, \`semanage -l\`, \`getsebool\` | \`aa-status\`, \`grep DENIED kern.log\` |

### 📋 Lo que debes recordar

* Usar permissive / complain para diagnóstico, nunca como configuración permanente de producción.
* El ciclo correcto en SELinux: identificar denegación → \`audit2why\` → aplicar corrección → volver a enforcing → verificar.
* \`restorecon -Rv\` solo aplica los contextos ya registrados con \`semanage fcontext\`. Sin el registro previo, \`restorecon\` revertiría al contexto original.
* \`aa-logprof\` lee del log de kernel y propone reglas interactivamente — es la forma más segura de extender un perfil.
* Siempre verificar con \`aa-status\` y con pruebas funcionales reales después de pasar a enforce.
* Los cambios con \`setsebool -P\` y \`semanage\` son persistentes tras reboot. Sin \`-P\`, un reboot revierta el booleano.

### 🧪 Autoevaluación

1. En el laboratorio SELinux, si se omitiera el paso \`restorecon -Rv /opt/webroot\` después de \`semanage fcontext -a\`, ¿qué ocurriría? ¿Por qué?
2. ¿Por qué es necesario pasar nginx a modo complain antes de usar \`aa-logprof\`? ¿Qué pasaría si se usara \`aa-logprof\` directamente en modo enforce con los logs de las denegaciones?
3. Describe el efecto exacto del comando \`setsebool -P httpd_can_network_connect on\` y explica qué cambiaría si se ejecutara sin la opción \`-P\`.

---

1. Los archivos existentes en \`/opt/webroot\` mantendrían su contexto incorrecto (\`usr_t\`). \`semanage fcontext\` solo registra la regla en la base de datos de políticas; \`restorecon\` es quien aplica esa regla a los inodos existentes. Sin ese paso, nginx seguiría recibiendo denegaciones AVC aunque la regla esté correctamente registrada.
2. En modo enforce, AppArmor bloquea los accesos y no los registra con suficiente detalle para que \`aa-logprof\` genere reglas útiles. El modo complain permite que nginx acceda a los recursos (sin bloqueo) y registra cada acceso en el log del kernel. \`aa-logprof\` lee esos registros para proponer reglas. En enforce puro, los accesos denegados podrían aparecer en el log, pero \`aa-logprof\` genera mejores reglas cuando puede observar el comportamiento completo sin interferencia.
3. El comando activa el booleano \`httpd_can_network_connect\`, que permite al dominio \`httpd_t\` iniciar conexiones TCP salientes (necesario para proxy inverso). Sin \`-P\`, el cambio es efectivo solo en la sesión actual y se pierde al reiniciar el sistema o al recargar la política SELinux. Con \`-P\`, la configuración se persiste en disco y sobrevive reboots.
`

export default content
