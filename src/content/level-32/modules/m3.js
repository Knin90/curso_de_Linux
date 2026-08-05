const content = `
## Módulo 3 — HAProxy: algoritmos de balanceo y health checks

### 🎯 Objetivos de aprendizaje

* Conocer y elegir el algoritmo de balanceo correcto para cada caso de uso.
* Configurar health checks TCP y HTTP con parámetros de producción.
* Usar pesos y prioridades para control fino del tráfico.
* Implementar ACLs básicas para routing por path o header.

### ❓ El problema real

Tienes 3 servidores web: uno tiene 16 cores, los otros dos tienen 4 cores cada uno. Si usas round-robin por defecto, el servidor potente recibe el mismo tráfico que los pequeños y los pequeños se saturan. O peor: tienes un backend que cae, HAProxy no lo detecta y sigue enviando tráfico hacia él durante minutos. Los algoritmos y health checks correctos evitan ambos problemas.

### 📖 Algoritmos de balanceo

\`\`\`text
ALGORITMO        DESCRIPCIÓN                          USO RECOMENDADO
─────────────────────────────────────────────────────────────────────────
roundrobin       Turno rotativo entre servidores       Apps stateless, servidores iguales
leastconn        Al servidor con menos conexiones      Conexiones largas (WebSockets, DB)
source           Hash de IP del cliente                Sticky sin cookies (deprecado)
uri              Hash de la URI                        Cachés web, consistencia de contenido
hdr(name)        Hash de un header HTTP                Sticky por API key o tenant
random           Aleatorio (con seed)                  Evitar sesgo en roundrobin
static-rr        Roundrobin estático (ignora pesos)   Pruebas y depuración
first            Primer servidor disponible            Ahorro de energía
\`\`\`

\`\`\`text
# En el backend, cambiar algoritmo:
backend web_servers
    balance leastconn     # conexiones largas
    # ...

backend api_servers
    balance roundrobin    # peticiones cortas stateless
    # ...

backend cache_servers
    balance uri           # misma URI → mismo servidor de caché
    # ...
\`\`\`

### 📖 Pesos de servidor

\`\`\`text
backend web_servers
    balance roundrobin

    # web1 recibe 4x más tráfico que web2 y web3
    server web1 10.0.1.11:8080 weight 4 check
    server web2 10.0.1.12:8080 weight 1 check
    server web3 10.0.1.13:8080 weight 1 check

    # Servidor de backup: solo recibe tráfico si todos los demás caen
    server web4 10.0.1.14:8080 backup check
\`\`\`

Cambiar el peso de un servidor en caliente (sin recargar):
\`\`\`bash
echo "set weight web_servers/web1 2" | sudo socat stdio /run/haproxy/admin.sock
\`\`\`

### 📖 Health checks: tipos y parámetros

\`\`\`text
PARÁMETRO    DESCRIPCIÓN                                    DEFAULT
─────────────────────────────────────────────────────────────────────
check        Habilita el health check                       (requerido)
inter        Intervalo entre checks (ms o s)                2000ms
fastinter    Intervalo cuando el servidor está caído        inter
downinter    Intervalo cuando ya se confirmó caída          inter
rise         Nº de checks OK para marcar como UP           2
fall         Nº de checks FAIL para marcar como DOWN       3
port         Puerto específico para el check                mismo que server
\`\`\`

\`\`\`text
# Health check TCP básico (¿acepta conexiones?)
backend db_servers
    server db1 10.0.1.21:5432 check inter 5s rise 2 fall 3

# Health check HTTP (¿responde 200 en /health?)
backend web_servers
    option httpchk GET /health HTTP/1.1\\r\\nHost:\\ mi-app.com
    http-check expect status 200
    server web1 10.0.1.11:8080 check inter 2s rise 2 fall 3

# Health check HTTP con body esperado
backend api_servers
    option httpchk GET /health
    http-check expect string "OK"
    server api1 10.0.1.31:3000 check inter 3s fall 2

# Check en puerto separado (app en :8080, health en :8081)
backend web_servers
    option httpchk GET /health
    server web1 10.0.1.11:8080 check port 8081 inter 2s
\`\`\`

### 📖 Deshabilitar un servidor en caliente (mantenimiento)

\`\`\`bash
# Poner en MAINT: no recibe tráfico, no hace checks
echo "disable server web_servers/web1" | sudo socat stdio /run/haproxy/admin.sock

# Ver estado de todos los servidores
echo "show servers state" | sudo socat stdio /run/haproxy/admin.sock

# Re-habilitar
echo "enable server web_servers/web1" | sudo socat stdio /run/haproxy/admin.sock

# Drenar conexiones antes de mantenimiento (DRAIN: termina sesiones activas)
echo "set server web_servers/web1 state drain" | sudo socat stdio /run/haproxy/admin.sock
\`\`\`

### 📖 ACLs y routing condicional

\`\`\`text
# Enrutar por path: /api/* → backend API, resto → backend web
frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/mi-app.pem

    acl is_api path_beg /api/
    acl is_static path_beg /static/ /assets/ /favicon.ico

    use_backend api_servers  if is_api
    use_backend static_cdn   if is_static
    default_backend web_servers

backend api_servers
    balance leastconn
    server api1 10.0.1.31:3000 check
    server api2 10.0.1.32:3000 check

backend static_cdn
    balance roundrobin
    server cdn1 10.0.1.41:80 check

backend web_servers
    balance roundrobin
    server web1 10.0.1.11:8080 check
    server web2 10.0.1.12:8080 check
\`\`\`

\`\`\`text
# ACLs por header (routing multi-tenant)
frontend https_front
    acl is_tenant_a hdr(Host) -i tenant-a.mi-app.com
    acl is_tenant_b hdr(Host) -i tenant-b.mi-app.com

    use_backend tenant_a_servers if is_tenant_a
    use_backend tenant_b_servers if is_tenant_b
    default_backend web_servers
\`\`\`

### 📋 Lo que debes recordar

* \`roundrobin\` para peticiones cortas stateless; \`leastconn\` para conexiones largas.
* Los pesos permiten enviar más tráfico a servidores más potentes sin cambiar el algoritmo.
* \`rise 2 fall 3\`: se necesitan 2 checks OK para marcar UP, 3 fallos para marcar DOWN — evita flapping.
* El socket admin (\`/run/haproxy/admin.sock\`) permite cambios en caliente sin recargar la configuración.

### 🧪 Autoevaluación

1. ¿Por qué \`leastconn\` es mejor que \`roundrobin\` para WebSockets o conexiones a base de datos?
2. Tienes un servidor web1 con 32 cores y web2 con 8 cores. ¿Cómo configuras los pesos?
3. ¿Qué significa \`rise 2 fall 3\` en el contexto de un health check?

---

1. \`roundrobin\` distribuye nuevas conexiones en rotación sin considerar cuántas conexiones activas tiene cada servidor. Con WebSockets o consultas largas, un servidor puede acumular cientos de conexiones activas mientras otro está casi vacío. \`leastconn\` envía cada nueva conexión al servidor con menos conexiones activas en ese momento, distribuyendo la carga real de manera más equitativa.
2. La proporción de cores es 32:8 = 4:1. Se configura \`server web1 ... weight 4\` y \`server web2 ... weight 1\`. Esto envía 4 de cada 5 peticiones a web1, proporcional a su capacidad.
3. \`rise 2\` significa que un servidor marcado como DOWN necesita 2 health checks consecutivos con éxito para volver a marcarse como UP. \`fall 3\` significa que un servidor UP necesita 3 health checks consecutivos fallidos para marcarse como DOWN. Esto evita el "flapping": un servidor inestable que oscila entre UP y DOWN no causará redireccionamientos constantes de tráfico.
`

export default content
