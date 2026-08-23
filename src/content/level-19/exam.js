const exam = [
  {
    q: "¿Qué proceso de nginx es el encargado de procesar el tráfico HTTP real de las conexiones?",
    options: ["El proceso master","Los procesos worker","El proceso systemd","El proceso cron"],
    correct: 1,
  },
  {
    q: "¿Qué mecanismo de I/O usa nginx en Linux para manejar miles de conexiones simultáneas con un solo hilo por worker?",
    options: ["select()","epoll","threads por conexión","fork() por conexión"],
    correct: 1,
  },
  {
    q: "Con `worker_processes 4;` y `worker_connections 1024;`, ¿cuántas conexiones simultáneas máximas puede manejar nginx?",
    options: ["1024","4096","4","65535"],
    correct: 1,
  },
  {
    q: "¿Qué hace el comando `nginx -t`?",
    options: ["Recarga la configuración sin cortar conexiones","Valida la sintaxis de la configuración sin aplicar cambios","Detiene el proceso master","Reabre los archivos de log"],
    correct: 1,
  },
  {
    q: "¿Qué diferencia hay entre `nginx -s stop` y `nginx -s quit`?",
    options: ["Son exactamente lo mismo","stop reinicia los workers, quit los detiene","stop termina inmediatamente (SIGTERM); quit espera a que terminen las conexiones activas (SIGQUIT)","quit termina inmediatamente; stop espera conexiones activas"],
    correct: 2,
  },
  {
    q: "¿Para qué sirve `ExecStartPre` en el unit de systemd de nginx?",
    options: ["Para recargar la configuración automáticamente cada hora","Para ejecutar `nginx -t` antes de iniciar y evitar arrancar con configuración inválida","Para reiniciar el servicio si falla","Para limitar el uso de memoria de nginx"],
    correct: 1,
  },
  {
    q: "¿Qué relación jerárquica existe entre los contextos de nginx.conf?",
    options: ["location contiene a server, que contiene a http","http contiene a server, que contiene a location","main contiene a location directamente, sin pasar por http ni server","events contiene a http y a server"],
    correct: 1,
  },
  {
    q: "Dentro de `server_name`, ¿cuál es el orden de prioridad de mayor a menor?",
    options: ["Regex > wildcard > exacto > default_server","Exacto > wildcard al inicio > wildcard al final > regex > default_server","default_server > exacto > regex > wildcard","wildcard al final > exacto > regex > wildcard al inicio"],
    correct: 1,
  },
  {
    q: "Si hay dos server blocks en el puerto 80 y ninguno define `default_server`, ¿cuál recibe una petición con un Host desconocido?",
    options: ["Ninguno, nginx devuelve error 500","El último server block del archivo","El primer server block que aparece en la configuración","nginx elige uno al azar en cada petición"],
    correct: 2,
  },
  {
    q: "¿Qué permite SNI (Server Name Indication) en nginx?",
    options: ["Comprimir el tráfico HTTPS","Servir múltiples certificados SSL distintos desde la misma IP y puerto 443","Redirigir automáticamente HTTP a HTTPS","Cachear las sesiones TLS en disco"],
    correct: 1,
  },
  {
    q: "¿Qué hace `return 444;` en un server block catch-all?",
    options: ["Devuelve una página de error 444 con contenido HTML","Cierra la conexión TCP sin enviar ninguna respuesta HTTP","Redirige al cliente a otro dominio","Registra la IP en una lista negra permanente"],
    correct: 1,
  },
  {
    q: "En el patrón sites-available/sites-enabled de Debian/Ubuntu, ¿cómo se habilita un virtual host?",
    options: ["Copiando el archivo de sites-available a sites-enabled","Creando un symlink en sites-enabled que apunte al archivo en sites-available","Editando directamente nginx.conf con el contenido del virtual host","Renombrando el archivo con extensión .enabled"],
    correct: 1,
  },
  {
    q: "¿Qué logra `listen 203.0.113.10:80;` en un servidor con múltiples IPs?",
    options: ["Vincula ese server block únicamente a esa IP específica","Escucha en todas las interfaces del servidor","Solo acepta tráfico IPv6","Redirige el tráfico de esa IP a otra IP"],
    correct: 0,
  },
  {
    q: "¿Cuál es el orden correcto de evaluación de los tipos de location?",
    options: ["Prefijo normal → regex → exacto (=) → ^~","Exacto (=) → prefijo más largo con ^~ → regex en orden de archivo → prefijo más largo sin ^~","Regex → exacto (=) → prefijo normal → ^~","El orden es siempre el de aparición en el archivo, sin excepciones"],
    correct: 1,
  },
  {
    q: "¿Qué configuración de `try_files` es la adecuada para servir una SPA como React o Vue?",
    options: ["try_files $uri =404;","try_files $uri $uri/ /index.html;","try_files $uri @backend;","try_files /index.html $uri;"],
    correct: 1,
  },
  {
    q: "¿Cómo se accede a un named location como `@backend`?",
    options: ["Es idéntico a un location de prefijo normal","Solo funciona dentro del contexto http, no en server","Escribiendo directamente la URL /@backend en el navegador","Solo puede accederse mediante try_files, error_page o rewrite ... last, nunca desde una petición externa"],
    correct: 3,
  },
  {
    q: "¿Por qué `return` suele ser más eficiente que `rewrite` para redirecciones simples?",
    options: ["return no requiere que nginx procese ninguna regex","rewrite siempre es más rápido porque usa el motor PCRE","return solo funciona con código 200","No hay ninguna diferencia de rendimiento entre ambos"],
    correct: 0,
  },
  {
    q: "¿Qué diferencia hay entre `rewrite ... last` y `rewrite ... break`?",
    options: ["break reinicia la búsqueda de location; last continúa en el mismo location","last solo funciona con regex y break solo con prefijos","Son sinónimos exactos","last reinicia la búsqueda de location con la nueva URI; break continúa en el location actual sin buscar otro"],
    correct: 3,
  },
  {
    q: "¿Qué efecto tiene la directiva `internal` en un location?",
    options: ["Hace que el location solo sea accesible desde dentro de nginx (error_page, X-Accel-Redirect), no desde peticiones externas directas","Deshabilita completamente ese location","Obliga a usar HTTPS para acceder a ese location","Aumenta la prioridad del location por encima de los exactos"],
    correct: 0,
  },
  {
    q: "Con `location /static/ { root /var/www/miapp; }`, ¿qué archivo busca nginx para `GET /static/css/main.css`?",
    options: ["/var/www/css/main.css","/var/www/miapp/css/main.css","/var/www/miapp/static/css/main.css","/static/var/www/miapp/css/main.css"],
    correct: 2,
  },
  {
    q: "¿Por qué se recomienda mantener `autoindex off` en el server block general?",
    options: ["Porque impide el uso de HTTPS","Porque consume más memoria que autoindex on","Porque ralentiza las respuestas de nginx","Porque expone la estructura de archivos del servidor a cualquier visitante"],
    correct: 3,
  },
  {
    q: "¿Qué combinación optimiza la transferencia de archivos estáticos en nginx?",
    options: ["limit_req + limit_conn","gzip on + autoindex on","sendfile on + tcp_nopush on","ssl_stapling on + hsts"],
    correct: 2,
  },
  {
    q: "¿Qué problema resuelve `open_file_cache` en sitios de alto tráfico?",
    options: ["Reduce las syscalls repetidas de open()/stat() cacheando file descriptors y metadatos en memoria","Comprime los archivos antes de enviarlos","Cachea las respuestas completas del backend proxy","Cifra el tráfico HTTPS más rápido"],
    correct: 0,
  },
  {
    q: "¿Cuál es la línea de `try_files` correcta para que una SPA funcione en rutas directas o al refrescar la página?",
    options: ["try_files /index.html;","try_files $uri @php;","try_files $uri =404;","try_files $uri $uri/ /index.html;"],
    correct: 3,
  },
  {
    q: "¿Por qué es seguro poner `Cache-Control: public, immutable` con `expires 1y` en archivos JS con hash en el nombre, pero peligroso en `index.html`?",
    options: ["No hay ninguna diferencia real entre ambos casos","Los archivos JS nunca deben cachearse, por eso es igual de peligroso","El hash cambia con cada deploy generando una URL nueva; index.html no cambia de nombre y referencia los assets actuales","index.html se comprime mejor con gzip que los archivos JS"],
    correct: 2,
  },
  {
    q: "¿Qué versiones de TLS se recomienda habilitar en producción hoy?",
    options: ["TLS 1.2 y 1.3","Solo TLS 1.0","SSL 3.0 y TLS 1.0","TLS 1.0 y 1.1"],
    correct: 0,
  },
  {
    q: "¿Por qué `ssl_session_tickets off;` mejora la Perfect Forward Secrecy?",
    options: ["Porque obliga a usar certificados autofirmados","Porque aumenta la velocidad del handshake sin relación con la seguridad","Porque desactiva por completo el cifrado TLS","Porque evita que una clave de tickets filtrada permita descifrar tráfico grabado previamente"],
    correct: 3,
  },
  {
    q: "¿Qué logra el OCSP stapling frente a la verificación OCSP estándar?",
    options: ["Aumenta el tamaño del certificado para mayor seguridad","Elimina por completo la necesidad de certificados SSL","nginx consulta la CA y adjunta la respuesta en el handshake, evitando que el navegador contacte la CA directamente","Permite usar TLS 1.0 de forma segura"],
    correct: 2,
  },
  {
    q: "Un usuario visitó tu sitio con HSTS `max-age=31536000` y al día siguiente eliminas el certificado y pasas el sitio a HTTP. ¿Qué ocurre?",
    options: ["El navegador seguirá forzando HTTPS durante ese periodo y no podrá conectar al sitio en HTTP","nginx redirige automáticamente sin importar la configuración","El certificado se renueva automáticamente","El navegador usa HTTP sin problema porque HSTS expira al instante"],
    correct: 0,
  },
  {
    q: "¿Qué hace `certbot renew --dry-run`?",
    options: ["Renueva los certificados de forma definitiva","Elimina los certificados existentes","Simula el proceso de renovación sin aplicar cambios reales","Genera un nuevo dominio para el certificado"],
    correct: 2,
  },
  {
    q: "¿Qué código de redirección debe usarse para pasar tráfico de HTTP a HTTPS de forma permanente?",
    options: ["404","200","302","301"],
    correct: 3,
  },
  {
    q: "¿Cuál es el nivel de compresión gzip recomendado como punto óptimo en producción?",
    options: ["4-6","9","0","1"],
    correct: 0,
  },
  {
    q: "¿Por qué no se recomienda aplicar gzip a imágenes JPEG o PNG?",
    options: ["Porque las imágenes deben servirse siempre sin comprimir por ley","Porque rompe la visualización en el navegador","Porque gzip no soporta esos formatos técnicamente","Porque ya tienen compresión interna y gzip añade CPU sin reducir tamaño"],
    correct: 3,
  },
  {
    q: "¿Qué problema resuelve `gzip_vary on;`?",
    options: ["Evita que proxies o CDNs sirvan la versión comprimida a clientes que no soportan gzip","Aumenta el nivel de compresión automáticamente","Permite comprimir video y audio de forma segura","Elimina la necesidad de ETag"],
    correct: 0,
  },
  {
    q: "¿Cómo funciona la revalidación con ETag y respuesta 304?",
    options: ["304 indica que el archivo fue eliminado del servidor","El navegador siempre descarga el archivo completo aunque no haya cambiado","El navegador envía el ETag guardado y nginx responde 304 sin cuerpo si el archivo no cambió","ETag solo funciona con archivos HTML"],
    correct: 2,
  },
  {
    q: "¿Para qué sirve `keepalive_timeout` en el contexto http?",
    options: ["Para definir cuánto tiempo nginx mantiene abierta una conexión TCP para reutilizarla en múltiples requests","Para limitar el tamaño máximo de un archivo subido","Para definir el tiempo de vida de un certificado SSL","Para establecer cuántos workers puede lanzar nginx"],
    correct: 0,
  },
  {
    q: "¿Por qué `index.html` debe configurarse con `Cache-Control: no-cache` en vez de una caché larga?",
    options: ["Porque el navegador ignora las cabeceras de caché en archivos HTML","Porque index.html debe servirse siempre por HTTPS únicamente","Porque index.html nunca puede comprimirse con gzip","Porque referencia assets con hash; si se cachea, el usuario seguirá viendo assets viejos tras un nuevo deploy"],
    correct: 3,
  },
  {
    q: "¿En qué contexto se define `limit_req_zone`?",
    options: ["Dentro del bloque ssl_params","Dentro de cada location individualmente","En el bloque http {}, fuera de los server {}","Solo dentro del bloque events {}"],
    correct: 2,
  },
  {
    q: "Con `limit_req zone=api burst=60 nodelay;`, ¿cómo se procesan las solicitudes dentro del burst?",
    options: ["Se encolan y se sirven espaciadas para cumplir la tasa exacta","Se ignoran y no cuentan para el límite","Se rechazan todas inmediatamente","Se procesan de inmediato sin cola de espera, hasta agotar el burst"],
    correct: 3,
  },
  {
    q: "¿Por qué se recomienda usar `limit_req_status 429;` en vez del código por defecto?",
    options: ["Porque 429 es el código HTTP estándar para \"Too Many Requests\", más semánticamente correcto que el 503 por defecto","Porque 429 permite comprimir la respuesta","Porque 503 no es un código HTTP válido","Porque 429 evita que el cliente reintente la petición"],
    correct: 0,
  },
  {
    q: "¿Qué controla específicamente `limit_conn`, a diferencia de `limit_req`?",
    options: ["El número de conexiones TCP simultáneas por IP, no la tasa de solicitudes","El ancho de banda total del servidor","La cantidad de certificados SSL activos","El tiempo de vida de las sesiones TLS"],
    correct: 0,
  },
  {
    q: "¿Cómo se implementa una lista blanca de IPs sin límite de rate limiting en nginx?",
    options: ["Usando `allow` dentro de limit_req_zone","Con la directiva `whitelist` nativa de nginx","Combinando el módulo `geo` con `map` para asignar una clave vacía a las IPs excluidas","Deshabilitando limit_req_zone globalmente"],
    correct: 2,
  },
  {
    q: "Si nginx está detrás de un load balancer, ¿por qué `$binary_remote_addr` puede ser incorrecto como key de rate limiting?",
    options: ["Porque contendría la IP del load balancer y no la del cliente real","Porque esa variable no existe en nginx","Porque solo funciona con IPv6","Porque duplica el conteo de solicitudes"],
    correct: 0,
  },
  {
    q: "En el proyecto de producción, ¿dónde se ubican los virtual hosts individuales según la estructura propuesta?",
    options: ["En /var/www/conf/","En /etc/nginx/ssl/","Todos dentro de nginx.conf directamente","En /etc/nginx/conf.d/, incluidos desde nginx.conf con `include`"],
    correct: 3,
  },
  {
    q: "¿Qué logra la directiva `server_tokens off;`?",
    options: ["Bloquea las conexiones sin certificado SSL","Deshabilita completamente el logging de accesos","Oculta la versión de nginx en la cabecera Server de las respuestas","Impide el uso de tokens JWT en la API"],
    correct: 2,
  },
  {
    q: "¿Por qué es obligatorio `fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;` en un location que usa PHP-FPM?",
    options: ["Para que PHP-FPM sepa qué archivo PHP ejecutar en disco","Para habilitar la compresión gzip en PHP","Para definir el timeout de la conexión con PHP-FPM","Para establecer el nombre del socket unix de PHP-FPM"],
    correct: 0,
  },
  {
    q: "¿Qué vulnerabilidad previene `try_files $uri =404;` antes de pasar una petición a PHP-FPM?",
    options: ["Ataques de denegación de servicio por rate limiting","La exposición de la versión de nginx","Ataques de fuerza bruta contra el login","La ejecución de archivos PHP arbitrarios subidos con extensiones falsas cuando la ruta no corresponde a un archivo real"],
    correct: 3,
  },
  {
    q: "¿Por qué el endpoint `/health` de la API se coloca fuera del location que aplica `limit_req`?",
    options: ["Porque /health siempre debe estar cacheado 1 año","Porque los endpoints de salud no pueden usar HTTPS","Para que los sistemas de monitoreo que lo consultan continuamente no consuman cuota de la zona de rate limiting y reciban siempre respuesta","Porque limit_req solo funciona con métodos POST"],
    correct: 2,
  },
  {
    q: "¿Por qué `systemctl reload nginx` es preferible a `systemctl restart nginx` en producción?",
    options: ["No hay ninguna diferencia entre ambos comandos","restart es más rápido y por eso se prefiere en todos los casos","reload corta todas las conexiones activas, restart no","reload recarga la config sin interrumpir conexiones activas; restart detiene y reinicia el proceso completo cortando conexiones"],
    correct: 3,
  },
  {
    q: "En Rocky Linux/RHEL, ¿qué puede bloquear que un worker de nginx se conecte a un backend en otro puerto aunque la configuración sea correcta?",
    options: ["La directiva gzip_proxied","El firewall de Windows","SELinux, si no se habilita `httpd_can_network_connect`","El propio proceso master de nginx"],
    correct: 2,
  },
]

export default exam
