const content = `
## Módulo 7 — SSSD y autenticación centralizada: LDAP y Active Directory

### 🎯 Objetivos de aprendizaje

* Entender qué problema resuelve SSSD y por qué reemplaza a nss-ldap y pam-ldap directos.
* Leer e interpretar sssd.conf: secciones, providers y opciones críticas.
* Unir un servidor Linux a un dominio Active Directory con realmd y sssd.
* Diagnosticar problemas comunes de autenticación SSSD.

### ❓ El problema real

Tu empresa tiene 150 servidores Linux y un Active Directory con 500 usuarios. Sin autenticación centralizada, cada servidor tiene sus propios usuarios locales, las contraseñas no están sincronizadas, y cuando un empleado deja la empresa hay que desactivar su cuenta en 150 servidores uno por uno. Con SSSD, los 150 servidores consultan el mismo AD: cuando se desactiva la cuenta en AD, automáticamente pierde acceso a todos los servidores en segundos. Un cambio de contraseña en AD se propaga a todos los sistemas de forma inmediata.

### 📖 Qué es SSSD y por qué es mejor que la alternativa directa

SSSD (System Security Services Daemon) es un demonio que actúa de intermediario entre el sistema Linux (NSS/PAM) y proveedores de identidad remotos (LDAP, AD, Kerberos, FreeIPA).

\`\`\`text
Sin SSSD (nss-ldap directo):
  pam → libpam-ldap → LDAP server (consulta por cada request, sin caché)
  nss → libnss-ldap → LDAP server (consulta por cada lookup)

  Problemas:
  - Sin caché: si el LDAP server no responde, nadie puede hacer login (ni con red activa)
  - Sin caché offline: si se corta la red, los usuarios no pueden entrar
  - Consultas lentas: cada \`ls -l\` en un directorio con archivos de usuarios de LDAP hace consultas
  - Falta de integración Kerberos/Tickets

Con SSSD:
  pam → SSSD → (caché local) → LDAP/AD server (solo cuando necesita actualizar)
  nss → SSSD → (caché local) → LDAP/AD server

  Ventajas:
  - Caché offline: usuarios pueden autenticarse aunque el servidor esté caído
  - Una sola conexión al servidor remoto (multiplexada)
  - Integración nativa con Kerberos para AD
  - Renovación automática de tickets Kerberos
  - Política de caché configurable
\`\`\`

### 📖 Instalación y estructura básica

\`\`\`bash
# Instalar SSSD y herramientas
# En Debian/Ubuntu:
apt-get install sssd sssd-tools sssd-ad sssd-ldap libpam-sss libnss-sss

# En RHEL/Fedora/Rocky:
dnf install sssd sssd-ad sssd-ldap oddjob oddjob-mkhomedir adcli

# Estructura de archivos
# /etc/sssd/sssd.conf          — configuración principal
# /var/lib/sss/db/             — bases de datos de caché
# /var/log/sssd/               — logs por dominio
# /var/lib/sss/pipes/          — sockets de comunicación IPC

# Permisos críticos del archivo de configuración
chmod 600 /etc/sssd/sssd.conf   # SSSD se niega a arrancar si son más permisivos
chown root:root /etc/sssd/sssd.conf
\`\`\`

### 📖 sssd.conf: anatomía completa

\`\`\`text
# /etc/sssd/sssd.conf

[sssd]
# Lista de dominios a usar (puede haber múltiples)
domains = empresa.local
# Servicios que SSSD provee
services = nss, pam, sudo
# Nivel de debug (0-9, 0 = solo errores, 6 = debug completo)
config_file_version = 2

[nss]
# Tiempo de caché para entradas de usuario/grupo (segundos)
entry_cache_timeout = 300
# Cuándo considerar que una entrada ha caducado
entry_negative_timeout = 15
# Filtrar usuarios locales de NSS (evitar conflictos)
filter_users = root, daemon, nobody
filter_groups = root

[pam]
# Tiempo de validez de credenciales en caché offline (segundos)
offline_credentials_expiration = 86400    # 24 horas
# Intentos de autenticación offline permitidos
offline_failed_login_attempts = 3
offline_failed_login_delay = 5

[domain/empresa.local]
# ─── Tipo de proveedor ───────────────────────────────────────────
id_provider = ad               # fuente de identidad: Active Directory
auth_provider = ad             # autenticación: AD (Kerberos)
access_provider = ad           # control de acceso: grupos AD
sudo_provider = ad             # sudo desde AD (opcional)

# ─── Conexión AD ─────────────────────────────────────────────────
ad_domain = empresa.local
ad_server = dc01.empresa.local, dc02.empresa.local   # failover
ad_backup_server = dc03.empresa.local

# ─── Usuarios ────────────────────────────────────────────────────
# Prefijo de dominio en nombres (EMPRESA\\usuario vs solo usuario)
use_fully_qualified_names = False         # False: usuarios pueden hacer login como "carlos"
                                          # True: requiere "carlos@empresa.local" (más seguro)
# Crear directorio home automáticamente al primer login
fallback_homedir = /home/%u               # %u = username
default_shell = /bin/bash

# ─── Rendimiento y caché ─────────────────────────────────────────
cache_credentials = true          # cachear credenciales para login offline
entry_cache_timeout = 300
ad_enable_gc = true               # Global Catalog para búsquedas multi-dominio

# ─── Control de acceso ───────────────────────────────────────────
# Solo permitir login a miembros de grupos AD específicos
ad_access_filter = (memberOf=CN=LinuxAdmins,OU=Groups,DC=empresa,DC=local)
# O múltiples grupos:
# ad_access_filter = (|(memberOf=CN=LinuxAdmins,...)(memberOf=CN=Developers,...))
\`\`\`

### 📖 Integración con Active Directory usando realmd

\`realmd\` simplifica enormemente el proceso de unir un servidor Linux a AD.

\`\`\`bash
# Instalar realmd
apt-get install realmd adcli samba-common-bin    # Debian/Ubuntu
dnf install realmd adcli samba-common-tools      # RHEL/Rocky

# Paso 1: Verificar que el servidor AD es alcanzable
realm discover empresa.local
# Output esperado:
# empresa.local
#   type: kerberos
#   realm-name: EMPRESA.LOCAL
#   domain-name: empresa.local
#   configured: kerberos-member
#   server-software: active-directory
#   client-software: sssd
#   required-package: sssd-tools
#   required-package: sssd
#   required-package: libnss-sss
#   required-package: libpam-sss
#   required-package: adcli
#   required-package: samba-common-bin

# Verificar resolución DNS (crítico para Kerberos)
host -t SRV _ldap._tcp.empresa.local
host -t SRV _kerberos._tcp.empresa.local
nslookup dc01.empresa.local

# Sincronizar el reloj (Kerberos requiere máximo 5 minutos de diferencia)
timedatectl set-ntp true
timedatectl status

# Paso 2: Unirse al dominio
realm join --user=Administrador empresa.local
# Pedirá la contraseña del usuario Administrador del dominio
# Este comando:
# - Crea una cuenta de computadora en AD
# - Configura /etc/sssd/sssd.conf
# - Configura /etc/krb5.conf
# - Habilita y arranca sssd
# - Modifica /etc/nsswitch.conf para añadir sss
# - Modifica /etc/pam.d/common-* para añadir pam_sss.so

# Paso 3: Verificar la unión
realm list
# empresa.local
#   type: kerberos
#   realm-name: EMPRESA.LOCAL
#   domain-name: empresa.local
#   configured: kerberos-member
#   server-software: active-directory
#   client-software: sssd
#   login-formats: %U@empresa.local

# Verificar que usuarios AD son visibles
id carlos@empresa.local
getent passwd carlos@empresa.local

# Paso 4: Configurar creación automática de home
# En sistemas con PAM:
pam-auth-update --enable mkhomedir     # Debian/Ubuntu
authselect select sssd with-mkhomedir  # RHEL/Rocky
# O instalar y habilitar oddjobd:
systemctl enable --now oddjobd
\`\`\`

### 📖 Configuración de sudo desde AD

\`\`\`bash
# En AD se pueden definir reglas sudo como objetos LDAP (sudo-ldap schema)
# En sssd.conf añadir:
# [domain/empresa.local]
# sudo_provider = ad

# En /etc/nsswitch.conf:
# sudoers: files sss

# Esto permite que los administradores de AD gestionen sudo centralmente
# Alternativa más simple: usar grupos AD en /etc/sudoers local

# /etc/sudoers.d/ad-admins:
%LinuxAdmins@empresa.local  ALL = (ALL:ALL) ALL
%DBATeam@empresa.local      ALL = (postgres) /usr/bin/systemctl restart postgresql
\`\`\`

### 📖 Diagnóstico y troubleshooting de SSSD

\`\`\`bash
# Herramienta principal de diagnóstico
sssctl status                    # estado general
sssctl domain-status empresa.local  # estado del dominio
sssctl user-checks carlos@empresa.local  # verificar resolución de usuario

# Logs de SSSD (uno por dominio/servicio)
ls /var/log/sssd/
# sssd.log            — log principal
# sssd_empresa.local.log  — log del dominio específico
# sssd_nss.log        — log del servicio NSS
# sssd_pam.log        — log del servicio PAM

# Aumentar verbosidad temporalmente para debug
sssctl debug-level 6             # debug completo para todos los dominios
# O por dominio en sssd.conf:
# [domain/empresa.local]
# debug_level = 6
systemctl restart sssd

# Problemas comunes y soluciones:

# 1. SSSD no puede conectar con AD → verificar DNS y kerberos
realm discover empresa.local     # ¿descubre el dominio?
kinit administrador@EMPRESA.LOCAL  # ¿puede obtener ticket Kerberos?
klist                            # ver tickets actuales

# 2. Usuarios no visibles → limpiar caché y reintentar
sss_cache -E                     # invalidar toda la caché
systemctl restart sssd
getent passwd carlos@empresa.local

# 3. Login falla offline → verificar caché de credenciales
# En sssd.conf: cache_credentials = true

# 4. Tiempo de respuesta lento → verificar que el DC es alcanzable
time getent passwd carlos@empresa.local   # cuánto tarda la consulta
# Si es > 1 segundo, el DC puede estar sobrecargado o con problemas de red

# 5. Conflicto de UID entre usuarios locales y AD
# AD asigna UIDs por SID — verificar que no colisionan con locales:
id carlos                        # si hay un carlos local y otro de AD, habrá conflicto
# Solución: usar use_fully_qualified_names = True

# Estado de Kerberos (para diagnóstico AD)
klist -ke /etc/krb5.keytab       # ver keytab de la máquina
kvno host/\$(hostname -f)@EMPRESA.LOCAL  # verificar ticket de la máquina
\`\`\`

### 📖 SSSD con LDAP genérico (no AD)

\`\`\`text
# /etc/sssd/sssd.conf para LDAP genérico (OpenLDAP, FreeIPA, etc.)

[domain/ldap.empresa.local]
id_provider = ldap
auth_provider = ldap

ldap_uri = ldaps://ldap.empresa.local:636    # usar LDAPS (TLS) siempre
ldap_search_base = dc=empresa,dc=local
ldap_default_bind_dn = cn=sssd,ou=service-accounts,dc=empresa,dc=local
ldap_default_authtok = contraseña_del_servicio  # usar ldap_default_authtok_type = password

# TLS/SSL
ldap_tls_reqcert = demand         # verificar certificado del servidor
ldap_tls_cacert = /etc/ssl/certs/empresa-ca.crt

# Mapeo de atributos (si el schema LDAP no usa los nombres estándar POSIX)
ldap_user_object_class = inetOrgPerson
ldap_user_name = uid
ldap_user_uid_number = uidNumber
ldap_user_gid_number = gidNumber
ldap_user_home_directory = homeDirectory
ldap_user_shell = loginShell
ldap_group_object_class = posixGroup
ldap_group_name = cn
ldap_group_gid_number = gidNumber
ldap_group_member = memberUid
\`\`\`

### 📋 Lo que debes recordar

* SSSD con caché offline es crítico en producción: si el controlador de dominio no responde, los usuarios pueden seguir autenticándose con credenciales cacheadas (configurable con \`offline_credentials_expiration\`).
* \`realm join\` automatiza la mayoría de la configuración, pero es importante verificar DNS y sincronización de tiempo (NTP) antes de intentar unirse al dominio — Kerberos requiere máximo 5 minutos de diferencia.
* \`use_fully_qualified_names = True\` es más seguro en entornos multi-dominio porque evita ambigüedad entre usuarios locales y de AD con el mismo nombre.
* Los logs de SSSD en /var/log/sssd/ son la primera herramienta de diagnóstico — activar \`debug_level = 6\` temporalmente da información muy detallada sobre qué está fallando.

### 🧪 Autoevaluación

1. Un usuario de AD puede autenticarse en el servidor cuando la red funciona, pero no puede hacer login cuando el DC está caído. ¿Qué configuración de SSSD falta y cómo se habilita?
2. Después de ejecutar \`realm join\`, el comando \`id carlos\` funciona pero \`id carlos@empresa.local\` falla. ¿Qué parámetro de sssd.conf explica este comportamiento y cuál es el tradeoff de ese parámetro?
3. Los usuarios de AD pueden hacer login en el servidor pero su directorio home no se crea automáticamente. ¿Qué mecanismos están disponibles para crear el home automáticamente y cuál es la diferencia entre ellos?

---

1. Falta \`cache_credentials = true\` en la sección \`[domain/...]\` de sssd.conf. Con esta opción, SSSD almacena las credenciales (hash de contraseña) en su base de datos local cifrada. Cuando el DC no es accesible, SSSD verifica la contraseña contra el caché local. También es recomendable configurar \`offline_credentials_expiration = 86400\` para limitar cuánto tiempo son válidas las credenciales cacheadas. Reiniciar SSSD después del cambio.
2. \`use_fully_qualified_names = False\` permite usar solo el nombre de usuario sin el sufijo de dominio (\`carlos\` en lugar de \`carlos@empresa.local\`). El tradeoff: si hay un usuario local \`carlos\` y uno de AD \`carlos\`, puede haber ambigüedad y conflictos. Con \`True\`, siempre se usa el nombre calificado (\`carlos@empresa.local\`), lo que es más seguro en entornos multi-dominio pero menos conveniente para los usuarios.
3. Tres mecanismos: (1) \`pam_mkhomedir.so\` en el stack PAM (\`session optional pam_mkhomedir.so\`) — crea el home en el momento del login. (2) oddjob + oddjob-mkhomedir — un servicio dbus que crea el home de forma más robusta; habilitarlo con \`systemctl enable --now oddjobd\` y \`pam-auth-update --enable mkhomedir\`. (3) \`authselect select sssd with-mkhomedir\` en RHEL/Rocky — configura PAM automáticamente. La diferencia: pam_mkhomedir es simple pero puede fallar silenciosamente; oddjob es más robusto y recomendado en producción porque separa la creación del home del proceso de autenticación.
`

export default content
