const content = `
## Módulo 5 — Redes Docker: bridge, host, overlay y custom networks

### 🎯 Objetivos de aprendizaje

* Entender cómo funciona la red bridge predeterminada de Docker y sus limitaciones.
* Crear redes personalizadas y aprovechar la resolución DNS automática entre contenedores.
* Conocer los drivers de red disponibles: bridge, host, none, macvlan y overlay.
* Publicar puertos de forma segura y comprender las reglas iptables que Docker genera.
* Diseñar topologías de red adecuadas para aplicaciones multi-contenedor.

### ❓ El problema real

Tienes una API en un contenedor que necesita conectarse a una base de datos en otro contenedor.
Intentas conectarte usando \`localhost\` — no funciona. Usas la IP del contenedor de la base
de datos — funciona, pero esa IP cambia cada vez que reinicias el contenedor. ¿Cómo logras
que los contenedores se encuentren entre sí de forma estable y segura?

### 📖 La red bridge predeterminada (docker0)

Cuando instalas Docker, se crea automáticamente una interfaz de red virtual llamada \`docker0\`.
Esta es el bridge predeterminado al que se conectan todos los contenedores que no especifican
una red explícita.

\`\`\`bash
# Ver la interfaz docker0 en el host
ip addr show docker0
# docker0: 172.17.0.1/16

# Lanzar dos contenedores en la red predeterminada
docker run -d --name c1 alpine sleep 3600
docker run -d --name c2 alpine sleep 3600

# Ver IPs asignadas
docker inspect c1 --format '{{.NetworkSettings.IPAddress}}'
# 172.17.0.2
docker inspect c2 --format '{{.NetworkSettings.IPAddress}}'
# 172.17.0.3

# c2 puede hacer ping a c1 por IP...
docker exec c2 ping -c2 172.17.0.2

# ...pero NO puede resolverlo por nombre
docker exec c2 ping -c2 c1
# ping: bad address 'c1'
\`\`\`

**Limitaciones del bridge predeterminado:**
- Sin resolución DNS entre contenedores (no puedes usar nombres).
- Todos los contenedores comparten la misma red y pueden comunicarse entre sí (sin aislamiento).
- No se recomienda para producción.

### 📖 Redes bridge personalizadas (custom bridge)

Las redes personalizadas resuelven el problema de DNS y proporcionan aislamiento real:

\`\`\`bash
# Crear una red personalizada
docker network create \\
  --driver bridge \\
  --subnet 172.20.0.0/16 \\
  --gateway 172.20.0.1 \\
  mynet

# Listar redes disponibles
docker network ls

# Conectar contenedores a la red personalizada
docker run -d --name db --network mynet postgres:15
docker run -d --name api --network mynet my-api-image

# Ahora "api" puede conectarse a "db" por nombre
docker exec api ping -c2 db        # funciona
docker exec api curl http://db:5432 # funciona

# Inspeccionar la red: ver contenedores conectados e IPs
docker network inspect mynet
\`\`\`

**Ventajas del custom bridge:**
- Resolución DNS automática: los contenedores se encuentran por nombre.
- Aislamiento: los contenedores en \`mynet\` no pueden comunicarse con los de otra red.
- Puedes conectar y desconectar contenedores en caliente con \`docker network connect/disconnect\`.

### 📖 Driver host

El contenedor comparte el espacio de red del host directamente — no hay NAT, no hay interfaz
virtual separada. El proceso dentro del contenedor abre puertos directamente en el host.

\`\`\`bash
# Nginx escucha en el puerto 80 del host directamente
docker run -d --network host nginx

# No se usa -p porque no hay NAT que traducir
# curl http://localhost:80 llega directo a nginx
\`\`\`

**Cuándo usarlo:** aplicaciones de muy alta performance donde el overhead de NAT importa
(servidores de métricas, proxies de baja latencia). Riesgo: conflictos de puertos con
procesos del host.

### 📖 Driver none

El contenedor no tiene ninguna interfaz de red, excepto loopback. Máximo aislamiento.

\`\`\`bash
docker run --network none alpine ip addr
# 1: lo: <LOOPBACK,UP> ...
# Sin eth0, sin acceso a internet, sin acceso a otros contenedores
\`\`\`

Útil para procesamiento offline, tareas de análisis o entornos de sandbox estrictos.

### 📖 Publicación de puertos

Publicar puertos expone un puerto del contenedor en el host mediante reglas NAT (iptables):

\`\`\`bash
# Mapeo básico: puerto 8080 del host → 80 del contenedor
docker run -p 8080:80 nginx

# Solo escuchar en localhost (más seguro, no expone a la red)
docker run -p 127.0.0.1:8080:80 nginx

# Puerto aleatorio del host (Docker elige)
docker run -p 80 nginx
docker port <container_id>  # ver qué puerto eligió
\`\`\`

**Reglas iptables que crea Docker:**
Cuando publicas un puerto, Docker modifica iptables automáticamente:

\`\`\`bash
# Ver la cadena DOCKER en iptables
sudo iptables -t nat -L DOCKER --line-numbers

# Docker crea:
# - DNAT para redirigir tráfico entrante al contenedor
# - MASQUERADE para NAT de salida (contenedor accede a internet)
# - Reglas ACCEPT en la cadena FORWARD para el tráfico publicado
\`\`\`

### 📖 Comunicación entre redes distintas

Los contenedores en redes diferentes están aislados entre sí. Para que se comuniquen:

\`\`\`bash
# Opción 1: conectar un contenedor a múltiples redes
docker network connect red-b mi-contenedor

# Opción 2: publicar puertos y acceder por el host
# (el contenedor A accede a host:puerto, que redirige a contenedor B)

# Verificar conectividad entre redes
docker network inspect red-a
docker network inspect red-b
\`\`\`

### 📖 Driver macvlan

Asigna al contenedor una dirección MAC e IP propias en la red física, sin NAT. El contenedor
aparece en la LAN como si fuera un dispositivo físico independiente.

\`\`\`bash
docker network create \\
  --driver macvlan \\
  --subnet 192.168.1.0/24 \\
  --gateway 192.168.1.1 \\
  -o parent=eth0 \\
  macvlan-net

docker run --network macvlan-net --ip 192.168.1.100 nginx
\`\`\`

Caso de uso: aplicaciones legacy que esperan acceso L2 directo o necesitan una IP fija
en la red corporativa.

### 📖 Driver overlay (Swarm)

Permite redes multi-host en Docker Swarm. Los contenedores en nodos físicos distintos se
comunican como si estuvieran en la misma red local.

\`\`\`bash
# Solo disponible en modo Swarm
docker swarm init
docker network create --driver overlay mi-overlay
\`\`\`

Se cubre en detalle en los módulos de orquestación. Para un solo host, usa bridge personalizado.

### 📖 Comandos de diagnóstico de red

\`\`\`bash
# Ver todas las redes
docker network ls

# Inspeccionar una red (contenedores, IPs, gateway)
docker network inspect mynet

# Ver puertos publicados de un contenedor
docker port mi-contenedor

# Ver interfaces de red dentro del contenedor
docker exec mi-contenedor ip addr

# Ver rutas de red del contenedor
docker exec mi-contenedor ip route

# Desconectar contenedor de una red
docker network disconnect mynet mi-contenedor

# Eliminar redes no usadas
docker network prune
\`\`\`

### 📋 Lo que debes recordar

* El bridge predeterminado NO resuelve nombres; un custom bridge SÍ lo hace via DNS interno.
* \`docker network create\` con \`--driver bridge\` crea redes aisladas con DNS automático.
* \`--network host\` elimina el NAT, comparte el stack de red del host; útil para performance, peligroso por conflictos.
* \`-p 127.0.0.1:8080:80\` restringe la escucha a localhost; sin la IP, escucha en todas las interfaces.
* Docker modifica iptables automáticamente al publicar puertos (cadena DOCKER, MASQUERADE, DNAT).
* Contenedores en redes distintas están aislados; conéctalos con \`docker network connect\` o publica puertos.
* \`macvlan\` da al contenedor identidad L2 en la red física — sin NAT, con IP propia en la LAN.
* \`overlay\` es para multi-host en Swarm; para un solo host usa siempre bridge personalizado.

### 🧪 Autoevaluación

1. Creas dos contenedores con \`docker run --name a alpine\` y \`docker run --name b alpine\`. ¿Puede \`b\` hacer ping a \`a\` por nombre? ¿Por qué?

2. ¿Cuál es la diferencia entre \`-p 8080:80\` y \`-p 127.0.0.1:8080:80\` en términos de seguridad?

3. Un contenedor en \`red-frontend\` necesita comunicarse con uno en \`red-backend\`. ¿Cuáles son las dos formas de lograrlo?

---

1. No puede resolverlo por nombre. El bridge predeterminado no tiene DNS interno. Solo funciona por IP directa. Un custom bridge sí resolvería \`a\` por nombre.

2. \`-p 8080:80\` escucha en todas las interfaces del host (accesible desde la red); \`-p 127.0.0.1:8080:80\` solo es accesible localmente. La segunda forma es más segura cuando el servicio no debe exponerse a la red.

3. (1) Conectar uno o ambos contenedores a una red compartida con \`docker network connect\`. (2) Publicar el puerto del contenedor de backend y acceder desde el frontend via el host o la IP del contenedor con el puerto publicado.
`

export default content
