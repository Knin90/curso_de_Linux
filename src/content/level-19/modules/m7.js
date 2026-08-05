const content = `
## Módulo 7 — Rate Limiting, limit_conn y Protección contra Abuso

### 🎯 Objetivos de aprendizaje
* Comprender por qué el rate limiting es una capa de seguridad indispensable
* Configurar \`limit_req_zone\` y \`limit_req\` con parámetros precisos
* Distinguir el comportamiento de \`burst\`, \`nodelay\` y \`delay\`
* Limitar conexiones simultáneas por IP con \`limit_conn\`
* Configurar respuestas HTTP 429 y registrar eventos de limitación
* Construir listas blancas para IPs de confianza
* Verificar la configuración con herramientas de carga

### ❓ El problema real
Tu aplicación web tiene un endpoint de inicio de sesión en \`/login\`. Un atacante
lanza un ataque de fuerza bruta automatizado: envía 500 solicitudes por segundo
probando combinaciones de contraseñas. Tu base de datos empieza a saturarse,
el tiempo de respuesta sube y usuarios legítimos no pueden entrar.

Al mismo tiempo, un bot descarga masivamente archivos de tu servidor abriendo
50 conexiones simultáneas, agotando los workers de nginx.

¿La solución? Rate limiting y control de conexiones en nginx — configurado en
el nivel del servidor web, antes de que la solicitud llegue a tu aplicación.

### 📖 ¿Por qué rate limiting en nginx?

El rate limiting en nginx actúa como portero antes de tu aplicación:

- **Fuerza bruta en login**: limita intentos de autenticación por IP
- **Mitigación de DDoS**: absorbe ráfagas sin colapsar el backend
- **Abuso de API**: previene que un cliente monopolice recursos
- **Protección de scraping**: ralentiza bots que consumen contenido masivamente

nginx implementa el algoritmo **leaky bucket**: las solicitudes entran a un
cubo con tasa constante de salida. Si el cubo se llena, las solicitudes se
rechazan o se encolan.

### 📖 limit_req_zone: definir la zona de limitación

Se define en el bloque \`http {}\`, fuera de los \`server {}\`:

\`\`\`nginx
http {
    # Sintaxis: limit_req_zone <key> zone=<nombre>:<tamaño> rate=<tasa>;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;
    limit_req_zone \$binary_remote_addr zone=api:10m    rate=30r/s;
    limit_req_zone \$binary_remote_addr zone=general:10m rate=10r/s;
}
\`\`\`

**Parámetros clave:**

| Parámetro | Descripción |
|---|---|
| \`\$binary_remote_addr\` | IP del cliente en formato binario (4 bytes IPv4, 16 bytes IPv6) |
| \`\$http_x_forwarded_for\` | Usar cuando nginx está detrás de un proxy/load balancer |
| \`zone=login:10m\` | Nombre de la zona y memoria asignada (10 MB ≈ 160 000 IPs) |
| \`rate=1r/s\` | 1 solicitud por segundo; también admite \`r/m\` (por minuto) |

**¿Por qué \`\$binary_remote_addr\` y no \`\$remote_addr\`?**
La representación binaria ocupa menos memoria en la zona compartida.
Con 10 MB puedes rastrear aproximadamente 160 000 IPs IPv4 simultáneas.

**Tasas comunes:**
\`\`\`
rate=1r/s    → máximo 1 solicitud por segundo
rate=10r/s   → máximo 10 solicitudes por segundo
rate=1r/m    → máximo 1 solicitud por minuto (muy restrictivo)
rate=30r/s   → 30 req/s para APIs de uso moderado
\`\`\`

### 📖 limit_req: aplicar la limitación en una ubicación

\`\`\`nginx
location /login {
    limit_req zone=login burst=5 nodelay;
    limit_req_status 429;

    proxy_pass http://127.0.0.1:8080;
}
\`\`\`

**El parámetro \`burst\`:**
Permite ráfagas cortas por encima de la tasa base. Si \`rate=1r/s\` y \`burst=5\`,
el cliente puede enviar hasta 6 solicitudes casi simultáneas: la primera se
procesa de inmediato, las 5 siguientes se encolan y se procesan a razón de
1 por segundo. La solicitud número 7 recibe error 503 (o 429 con \`limit_req_status\`).

**\`nodelay\` — procesar la ráfaga inmediatamente:**
Sin \`nodelay\`, las solicitudes del burst se encolan y se sirven con retardo
artificial (para cumplir la tasa). Con \`nodelay\`, todas las solicitudes del
burst se procesan de inmediato, sin espera. Cuando el burst se agota, las
nuevas solicitudes reciben error hasta que los "slots" del burst se recarguen
con el tiempo.

\`\`\`nginx
# Sin nodelay: burst se sirve espaciado en el tiempo (latencia artificial)
limit_req zone=login burst=5;

# Con nodelay: burst se sirve inmediatamente, sin cola de espera
limit_req zone=login burst=5 nodelay;
\`\`\`

**\`delay=N\` — comportamiento intermedio (nginx 1.15.7+):**
Las primeras N solicitudes del burst se procesan sin retardo; las restantes
se encolan normalmente.

\`\`\`nginx
limit_req zone=api burst=20 delay=10;
# Primeras 10 del burst: inmediatas; siguientes 10: encoladas con retardo
\`\`\`

### 📖 Respuesta HTTP 429 Too Many Requests

Por defecto nginx devuelve **503 Service Unavailable** cuando se supera el límite.
Es semánticamente incorrecto — 429 es el código estándar para rate limiting:

\`\`\`nginx
http {
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;

    server {
        location /api/ {
            limit_req zone=api burst=60 nodelay;
            limit_req_status 429;    # Código HTTP correcto
        }
    }
}
\`\`\`

### 📖 limit_conn_zone y limit_conn: conexiones simultáneas

Mientras \`limit_req\` controla la tasa de solicitudes, \`limit_conn\` limita
cuántas conexiones TCP simultáneas puede tener una IP:

\`\`\`nginx
http {
    limit_conn_zone \$binary_remote_addr zone=addr:10m;
    limit_conn_zone \$binary_remote_addr zone=downloads:10m;

    server {
        # Máximo 20 conexiones simultáneas por IP en todo el servidor
        limit_conn addr 20;

        location /downloads/ {
            # Máximo 5 descargas simultáneas por IP
            limit_conn downloads 5;
            limit_conn_status 429;
        }
    }
}
\`\`\`

Útil para prevenir que un solo cliente acapare los workers de nginx con
descargas masivas o conexiones keep-alive prolongadas.

### 📖 Configuración y logging

\`\`\`nginx
http {
    # Nivel de log para eventos de limitación (default: error)
    limit_req_log_level warn;
    limit_conn_log_level warn;

    server {
        location /api/ {
            limit_req zone=api burst=60 nodelay;
            limit_req_status 429;

            # \$limit_req_status: PASSED, DELAYED, REJECTED, DELAYED_DRY_RUN, REJECTED_DRY_RUN
            log_format rate_log '\$remote_addr [\$time_local] "\$request" '
                                '\$status \$limit_req_status';
            access_log /var/log/nginx/api-rate.log rate_log;
        }
    }
}
\`\`\`

Monitorear eventos de limitación en el log de errores:
\`\`\`bash
grep "limiting requests" /var/log/nginx/error.log
grep "limiting connections" /var/log/nginx/error.log

# Ver en tiempo real
tail -f /var/log/nginx/error.log | grep -E "limit"
\`\`\`

### 📖 Configuraciones reales por caso de uso

**Caso 1 — Endpoint de login (protección contra fuerza bruta):**
\`\`\`nginx
http {
    limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;

    server {
        location /login {
            limit_req zone=login burst=5 nodelay;
            limit_req_status 429;
            proxy_pass http://127.0.0.1:8080;
        }
    }
}
\`\`\`
Un usuario legítimo raramente necesita más de 1 login por segundo.
burst=5 tolera recargas rápidas de página sin bloquear al usuario.

**Caso 2 — API REST de uso moderado:**
\`\`\`nginx
http {
    limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/s;

    server {
        location /api/ {
            limit_req zone=api burst=60 nodelay;
            limit_req_status 429;
            proxy_pass http://127.0.0.1:3000;
        }
    }
}
\`\`\`
30 req/s es suficiente para aplicaciones SPA activas. El burst de 60 absorbe
picos de carga inicial sin rechazar solicitudes legítimas.

**Caso 3 — Servidor de descargas:**
\`\`\`nginx
http {
    limit_conn_zone \$binary_remote_addr zone=downloads:10m;

    server {
        location /files/ {
            limit_conn downloads 5;   # máximo 5 descargas simultáneas por IP
            limit_conn_status 429;
            alias /var/www/files/;
        }
    }
}
\`\`\`

### 📖 Lista blanca: excluir IPs de confianza

Con el módulo \`geo\` (incluido en nginx):

\`\`\`nginx
http {
    geo \$limit {
        default         1;          # limitar por defecto
        10.0.0.0/8     0;          # red interna: sin límite
        192.168.1.100  0;          # IP específica: sin límite
        203.0.113.5    0;          # IP de partner: sin límite
    }

    # La key es vacía ("") para IPs excluidas → no se cuentan en la zona
    map \$limit \$limit_key {
        0 "";
        1 \$binary_remote_addr;
    }

    limit_req_zone \$limit_key zone=api:10m rate=30r/s;

    server {
        location /api/ {
            limit_req zone=api burst=60 nodelay;
            limit_req_status 429;
        }
    }
}
\`\`\`

Cuando \`\$limit_key\` es vacío, nginx no registra la IP en la zona y no aplica
limitación. Las IPs no excluidas usan su dirección como clave normalmente.

### 📖 Testing y verificación

**Apache Bench — simular carga:**
\`\`\`bash
# 100 solicitudes totales, 10 concurrentes
ab -n 100 -c 10 http://tu-servidor/api/endpoint

# Revisar "Failed requests" y "Non-2xx responses" en la salida
\`\`\`

**wrk — herramienta moderna de benchmarking:**
\`\`\`bash
# 10 segundos, 4 threads, 50 conexiones concurrentes
wrk -t4 -c50 -d10s http://tu-servidor/api/endpoint
\`\`\`

**curl en bucle — verificar respuestas 429:**
\`\`\`bash
for i in \$(seq 1 20); do
    code=\$(curl -s -o /dev/null -w "%{http_code}" http://tu-servidor/login)
    echo "Solicitud \$i: \$code"
done
\`\`\`

**Verificar logs de limitación:**
\`\`\`bash
# Contar eventos de rate limiting en las últimas 24h
grep "limiting requests" /var/log/nginx/error.log | wc -l

# Ver IPs más limitadas
grep "limiting requests" /var/log/nginx/error.log \\
    | grep -oP 'client: \\K[^,]+' \\
    | sort | uniq -c | sort -rn | head -20
\`\`\`

### 📋 Lo que debes recordar
* \`limit_req_zone\` va en \`http {}\`; \`limit_req\` va en \`location {}\` o \`server {}\`
* \`burst\` define el tamaño de la cola; \`nodelay\` la procesa inmediatamente
* Sin \`nodelay\`, el burst introduce latencia artificial para cumplir la tasa
* Usa \`limit_req_status 429\` en lugar del 503 por defecto
* \`limit_conn\` controla conexiones TCP simultáneas, no tasa de solicitudes
* El módulo \`geo\` + \`map\` es la forma idiomática de listas blancas en nginx
* Monitorea \`/var/log/nginx/error.log\` para detectar abusos activos

### 🧪 Autoevaluación
1. ¿Cuál es la diferencia de comportamiento entre \`limit_req zone=X burst=10\` y \`limit_req zone=X burst=10 nodelay\`?
2. Tienes nginx detrás de un load balancer. ¿Por qué \`\$binary_remote_addr\` puede ser incorrecto como key, y qué variable deberías usar?
3. ¿Cómo configurarías una zona para permitir máximo 5 conexiones simultáneas de descarga por IP, devolviendo 429 al superarse el límite?

---

1. Sin \`nodelay\`, las solicitudes del burst se encolan y se procesan espaciadas en el tiempo para mantener la tasa configurada, introduciendo latencia artificial. Con \`nodelay\`, todas las solicitudes del burst se sirven inmediatamente sin espera; cuando los slots del burst se agotan, las nuevas solicitudes se rechazan hasta que la tasa las recargue.
2. Detrás de un load balancer, \`\$binary_remote_addr\` contendría la IP del balanceador, no la del cliente real. Se debe usar \`\$http_x_forwarded_for\` (o la variable que el balanceador inyecte) para obtener la IP original del cliente.
3. \`limit_conn_zone \$binary_remote_addr zone=downloads:10m;\` en \`http {}\`, y en la \`location\` de descarga: \`limit_conn downloads 5;\` y \`limit_conn_status 429;\`.
`

export default content
