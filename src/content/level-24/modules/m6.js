const content = `
## Módulo 6 — aa-genprof y aa-logprof: creación de perfiles AppArmor

### 🎯 Objetivos de aprendizaje

* Crear un perfil AppArmor desde cero con \`aa-genprof\`.
* Refinar perfiles iterativamente con \`aa-logprof\`.
* Entender el flujo completo de creación de perfiles en producción.
* Escribir y modificar perfiles manualmente con sintaxis avanzada.
* Usar subperfiles (hat profiles) para sub-procesos.

### ❓ El problema real

Tienes un script Python que procesa archivos de clientes: lee CSVs de \`/data/input\`, genera reportes en \`/data/output\`, y llama a \`/usr/bin/pandoc\` para convertir a PDF. Necesitas confinarlo con AppArmor. No sabes exactamente qué archivos del sistema necesita acceder —librerías Python, módulos, archivos de locale, etc. Escribir el perfil a mano sería tedioso y propenso a errores. \`aa-genprof\` automatiza este proceso.

### 📖 aa-genprof: generación asistida de perfiles

\`aa-genprof\` combina tres fases: crear perfil en blanco, ejecutar la aplicación en modo complain, y generar reglas interactivamente.

\`\`\`bash
# Instalar herramientas (Ubuntu/Debian)
apt install apparmor-utils

# Instalar herramientas (RHEL/Fedora — AppArmor no es el default)
dnf install apparmor-utils  # si se usa AppArmor en RHEL

# Iniciar generación de perfil
aa-genprof /usr/bin/python3

# Salida:
# Profiling: /usr/bin/python3
#
# Please start the application to be profiled in another window and
# exercise its functionality now.
#
# Once completed, select the "Scan" option below in order to
# possibly generate a new set of rules that need to be added to
# the profile.
#
# (S)can system log for AppArmor events / (F)inish
\`\`\`

**Flujo completo con aa-genprof:**

\`\`\`bash
# Terminal 1: ejecutar aa-genprof
aa-genprof /opt/miapp/procesar.py

# Terminal 2: ejecutar la aplicación y ejercitar su funcionalidad
python3 /opt/miapp/procesar.py --input /data/input/test.csv --output /data/output/

# Terminal 1: presionar S (Scan) para procesar eventos
# Aparecerán sugerencias de reglas:

# Profile:  /opt/miapp/procesar.py
# Execute:  /usr/bin/python3
# Severity: 4
#
# (I)nherit / (C)hild / (P)rofile / (N)amed / (U)nconfined / (X) ix On / (D)eny / Abo(r)t / (F)inish
\`\`\`

**Opciones de ejecución para procesos hijo:**

\`\`\`text
(I)nherit  → el proceso hijo hereda el perfil actual (ix)
             Usa para herramientas auxiliares que forman parte del mismo contexto

(C)hild    → usar subperfil (hat) definido en el mismo archivo (cx)
             Usa cuando el subproceso necesita permisos distintos

(P)rofile  → transicionar al propio perfil del ejecutable si existe (px)
             Usa cuando /usr/bin/pandoc ya tiene su propio perfil AppArmor

(N)amed    → especificar nombre de perfil destino manualmente

(U)nconfined → ejecutar sin restricciones (ux)
             EVITAR en producción — solo para diagnóstico

(D)eny     → denegar explícitamente la ejecución
\`\`\`

\`\`\`bash
# Para reglas de archivo, las opciones son:
#
# Path:    /usr/lib/python3/dist-packages/csv.py
# Mode:    r
# Severity: 2
#
# (A)llow / [(D)eny] / (I)gnore / (G)lob / Glob with (E)xt / (N)ew / Abo(r)t / (F)inish / (M)ore

# A → Allow: agregar la regla al perfil
# D → Deny: denegar explícitamente (sin regla = deny implícito, explicit deny tiene precedencia)
# I → Ignore: no agregar (ni allow ni deny)
# G → Glob: generalizar la ruta (/usr/lib/python3/dist-packages/*.py)
# E → Glob con extensión: /usr/lib/python3/**/*.py
# N → Nueva ruta: especificar ruta manualmente
\`\`\`

### 📖 Sesión completa de aa-genprof

\`\`\`bash
# Paso 1: iniciar profiling
aa-genprof /opt/miapp/procesar.py

# Paso 2: en otra terminal, ejecutar casos de uso representativos
python3 /opt/miapp/procesar.py --input /data/input/clientes.csv
python3 /opt/miapp/procesar.py --input /data/input/ventas.csv --pdf
python3 /opt/miapp/procesar.py --help

# Paso 3: volver a la terminal 1, presionar S para escanear

# Responder a cada sugerencia:
# /usr/lib/python3.10/**  r  → (A) Allow (generalizar con G primero)
# /usr/share/locale/**    r  → (A) Allow
# /etc/localtime          r  → (A) Allow
# /proc/self/maps         r  → (A) Allow (Python lo necesita)
# /data/input/*.csv       r  → (A) Allow
# /data/output/           w  → (A) Allow
# /tmp/python-XXXX        rw → (G) Glob → /tmp/python-*  → (A) Allow
# /usr/bin/pandoc   exec  → (P) Profile (si pandoc tiene perfil) o (I) Inherit

# Paso 4: presionar S de nuevo para más eventos, o F para finalizar

# Paso 5: guardar
# (S)ave profile / (F)inish without saving
# → S

# El perfil se guarda en:
cat /etc/apparmor.d/opt.miapp.procesar.py
\`\`\`

### 📖 aa-logprof: refinamiento iterativo

\`aa-logprof\` procesa el log del sistema para encontrar violaciones AppArmor y sugiere reglas adicionales. Se usa para refinar perfiles existentes.

\`\`\`bash
# Analizar log del sistema (necesita perfil en modo complain)
aa-logprof

# Con archivo de log específico
aa-logprof -f /var/log/syslog

# Solo mostrar sugerencias sin aplicar
aa-logprof -d /etc/apparmor.d

# Flujo típico:
# 1. Poner perfil en complain
aa-complain /etc/apparmor.d/opt.miapp.procesar.py

# 2. Ejecutar la aplicación con casos de uso reales (incluyendo edge cases)
python3 /opt/miapp/procesar.py --all-customers --generate-pdf --email

# 3. Revisar violaciones con aa-logprof
aa-logprof

# 4. Responder a sugerencias (igual que aa-genprof)

# 5. Volver a enforce
aa-enforce /etc/apparmor.d/opt.miapp.procesar.py

# 6. Recargar el perfil
apparmor_parser -r /etc/apparmor.d/opt.miapp.procesar.py
\`\`\`

### 📖 Sintaxis avanzada: escribir perfiles manualmente

\`\`\`bash
# Perfil completo para un script Python de procesamiento
cat > /etc/apparmor.d/opt.miapp.procesar.py << 'EOF'
#include <tunables/global>

/opt/miapp/procesar.py {
  #include <abstractions/base>
  #include <abstractions/python>
  #include <abstractions/nameservice>

  # El propio script
  /opt/miapp/procesar.py  r,
  /opt/miapp/*.py         r,
  /opt/miapp/lib/**       r,

  # Datos de entrada (solo lectura)
  /data/input/            r,
  /data/input/*.csv       r,
  /data/input/*.json      r,

  # Datos de salida (lectura-escritura)
  /data/output/           rw,
  /data/output/**         rw,

  # Archivos temporales
  owner /tmp/proc-*       rw,
  /tmp/                   r,

  # Pandoc para generación de PDF
  /usr/bin/pandoc         Px,

  # Logs de la aplicación
  /var/log/miapp/         rw,
  /var/log/miapp/*.log    w,

  # Configuración (solo lectura)
  /etc/miapp/config.yaml  r,

  # Red: solo HTTP saliente (para envío de reportes)
  network inet stream,

  # Señales (para manejo de SIGTERM)
  signal receive set=(term hup),
}
EOF
\`\`\`

### 📖 Subperfiles (hat profiles)

Los hat profiles permiten definir contextos distintos para subprocesos del mismo programa. Útiles para servidores que despachan peticiones con permisos distintos según el contexto.

\`\`\`bash
cat /etc/apparmor.d/usr.sbin.apache2
\`\`\`

\`\`\`text
#include <tunables/global>

/usr/sbin/apache2 {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  capability net_bind_service,
  /etc/apache2/**          r,
  /var/www/**              r,
  /var/log/apache2/*.log   w,
  /run/apache2/            rw,

  # Hat para CGI scripts
  ^CGI {
    #include <abstractions/base>
    /usr/lib/cgi-bin/**   rix,
    /var/www/cgi-bin/**   rix,
    /tmp/cgi-*            rw,
    # Sin acceso a /etc/apache2 desde CGI
  }

  # Hat para PHP-FPM handler
  ^PHP {
    #include <abstractions/base>
    #include <abstractions/php>
    /var/www/html/**      rw,
    /tmp/php-*            rw,
  }
}
\`\`\`

\`\`\`bash
# Para que un proceso use un hat, el código debe llamar explícitamente
# a aa_change_hat() o aa_change_profile() (libapparmor)
# Esto es relevante para Apache mod_apparmor, no para perfiles simples
\`\`\`

### 📖 Verificación y depuración de perfiles

\`\`\`bash
# Verificar sintaxis del perfil sin cargarlo
apparmor_parser -p /etc/apparmor.d/opt.miapp.procesar.py

# Cargar perfil en modo complain para pruebas
apparmor_parser -C /etc/apparmor.d/opt.miapp.procesar.py

# Cargar perfil en modo enforce
apparmor_parser -r /etc/apparmor.d/opt.miapp.procesar.py

# Ver denials en tiempo real
tail -f /var/log/syslog | grep apparmor

# Denial típico en syslog:
# kernel: [12345.678] audit: type=1400 audit(1703001234.567:789):
# apparmor="DENIED" operation="open" profile="/opt/miapp/procesar.py"
# name="/etc/ssl/openssl.cnf" pid=1234 comm="python3"
# requested_mask="r" denied_mask="r" fsuid=1000 ouid=0

# Parsear: profile indica qué perfil denegó, name es el recurso,
# requested_mask es el modo pedido (r/w/x), denied_mask es lo que faltaba
\`\`\`

### 📋 Lo que debes recordar

* \`aa-genprof\` crea perfiles nuevos: ejecuta la app, escanea logs, responde a sugerencias interactivamente.
* \`aa-logprof\` refina perfiles existentes procesando eventos de un perfil en modo complain.
* Flujo de producción: genprof → pruebas en complain → logprof → enforce → monitoreo.
* Opciones de ejecución para binarios: \`ix\` (inherit, más común), \`px\` (propio perfil), \`ux\` (unconfined, evitar).
* Abstractions reutilizan conjuntos de reglas: \`<abstractions/python>\` incluye todo lo que Python necesita.
* Los hat profiles permiten sub-dominios con permisos distintos dentro del mismo proceso.

### 🧪 Autoevaluación

1. ¿Por qué se usa \`aa-logprof\` después de \`aa-genprof\` en lugar de solo \`aa-genprof\`?
2. Tu script Python llama a \`/usr/bin/gpg\` para firmar archivos. ¿Qué modo de ejecución usarías en el perfil y por qué?
3. Un denial muestra \`requested_mask="w" denied_mask="w"\` para \`/var/log/miapp/app.log\`. ¿Qué regla necesitas agregar al perfil?

---

1. aa-genprof captura solo lo que ocurre durante la sesión de profiling (que es corta). aa-logprof procesa el log de días o semanas de uso real en producción (con perfil en complain), capturando casos de uso que no se cubrieron durante genprof — incluyendo paths de error, edge cases, y comportamientos poco frecuentes.
2. Si gpg tiene su propio perfil AppArmor instalado, usar \`Px\` (px) para que gpg ejecute bajo su propio perfil confinado. Si no tiene perfil pero gpg es de confianza, \`ix\` para heredar el perfil del script. Evitar \`ux\` (unconfined) en producción porque deja gpg sin restricciones.
3. \`/var/log/miapp/app.log  w,\` o mejor \`/var/log/miapp/*.log  w,\` para cubrir todos los logs de la aplicación. Si solo se necesita append, usar \`a,\` en lugar de \`w,\` para mayor seguridad.
`

export default content
