const content = `
## Módulo 2 — iptables: tablas, cadenas y políticas

### 🎯 Objetivos de aprendizaje

* Conocer las 4 tablas de iptables y cuándo aplica cada una.
* Entender las cadenas de la tabla filter y sus políticas por defecto.
* Listar reglas activas con distintos niveles de detalle.
* Guardar y restaurar reglas para sobrevivir un reinicio.

### ❓ El problema real

Configuras un firewall perfecto con iptables. Reinicias el servidor y todas las reglas desaparecen — iptables no persiste reglas por defecto. Además, sin entender las tablas y cadenas, puede que estés bloqueando tráfico en el lugar equivocado del flujo de paquetes. Este módulo establece la base conceptual antes de tocar una sola regla.

### 📖 Las 4 tablas de iptables

iptables organiza las reglas en **tablas**, cada una con un propósito diferente:

\`\`\`text
┌──────────┬────────────────────────────────────────────────────────────┐
│ Tabla    │ Propósito                                                  │
├──────────┼────────────────────────────────────────────────────────────┤
│ filter   │ La tabla por defecto. Decide si un paquete se acepta o     │
│          │ descarta. Contiene INPUT, FORWARD, OUTPUT.                 │
├──────────┼────────────────────────────────────────────────────────────┤
│ nat      │ Network Address Translation. Modifica IPs y puertos de     │
│          │ origen/destino. Contiene PREROUTING, OUTPUT, POSTROUTING.  │
├──────────┼────────────────────────────────────────────────────────────┤
│ mangle   │ Modificación de cabeceras de paquetes (TTL, TOS, marcas).  │
│          │ Uso avanzado: QoS, enrutamiento basado en políticas.       │
├──────────┼────────────────────────────────────────────────────────────┤
│ raw      │ Exenciones de conntrack. Los paquetes marcados aquí        │
│          │ no pasan por el rastreador de conexiones.                  │
└──────────┴────────────────────────────────────────────────────────────┘
\`\`\`

> En el 90% de los casos solo necesitas la tabla **filter**. Cuando trabajas con NAT, usas la tabla **nat**. Las tablas mangle y raw son para casos muy especializados.

### 📖 Las cadenas de la tabla filter

La tabla filter tiene tres cadenas que mapean directamente a hooks de Netfilter:

\`\`\`text
  INPUT     ──▶  Tráfico destinado al propio host
                 Ejemplos: conexión SSH entrante, petición HTTP a nginx

  FORWARD   ──▶  Tráfico que pasa a través del host (el host es un router)
                 Ejemplos: firewall de red, gateway VPN

  OUTPUT    ──▶  Tráfico generado por el propio host
                 Ejemplos: curl saliente, actualizaciones de paquetes
\`\`\`

### 📖 Políticas por defecto: ACCEPT vs DROP

Cada cadena tiene una **política por defecto**: lo que ocurre cuando un paquete no coincide con ninguna regla.

\`\`\`bash
# Ver políticas actuales
iptables -L | grep policy

# Salida típica de un servidor recién instalado (inseguro):
# Chain INPUT (policy ACCEPT)
# Chain FORWARD (policy ACCEPT)
# Chain OUTPUT (policy ACCEPT)
\`\`\`

\`\`\`text
┌─────────────────┬────────────────────────────────────────────────────┐
│ Política        │ Comportamiento                                     │
├─────────────────┼────────────────────────────────────────────────────┤
│ ACCEPT          │ Si ninguna regla coincide, el paquete PASA.        │
│ (inseguro)      │ Debes escribir reglas de bloqueo explícitas.       │
│                 │ Un error de omisión deja pasar el tráfico.         │
├─────────────────┼────────────────────────────────────────────────────┤
│ DROP            │ Si ninguna regla coincide, el paquete se DESCARTA. │
│ (seguro)        │ Debes escribir reglas de permiso explícitas.       │
│                 │ Un error de omisión bloquea el tráfico.            │
└─────────────────┴────────────────────────────────────────────────────┘
\`\`\`

En producción, la política correcta es **DROP** en INPUT y FORWARD. Esto implementa el principio de mínimo privilegio: nada está permitido hasta que lo permites explícitamente.

### 📖 Comandos de listado

\`\`\`bash
# Listado básico (muestra nombres de destino y origen)
iptables -L

# Listado detallado con contadores de paquetes y bytes
iptables -L -v

# Listado sin resolución DNS (más rápido, muestra IPs numéricas)
iptables -L -n

# Combinación más útil: verbose + numérico
iptables -L -v -n

# Mostrar números de línea (necesario para insertar/eliminar por posición)
iptables -L -n --line-numbers

# Ver solo la tabla nat
iptables -t nat -L -v -n

# Ver solo una cadena específica
iptables -L INPUT -v -n
\`\`\`

Ejemplo de salida de \`iptables -L -v -n\`:

\`\`\`text
Chain INPUT (policy DROP 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
  156  12KB ACCEPT     all  --  lo     *       0.0.0.0/0            0.0.0.0/0
 2341 890KB ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0    ctstate ESTABLISHED
    4  240  ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0    tcp dpt:22
\`\`\`

Los contadores \`pkts\` y \`bytes\` son cruciales para diagnóstico: una regla con 0 hits puede indicar que nunca se alcanza o que la condición nunca se cumple.

### 📖 Ver reglas en formato de comandos: iptables-save

\`iptables -L\` muestra las reglas en formato de tabla. Para ver las reglas como comandos reproducibles:

\`\`\`bash
# Ver todas las reglas en formato de comandos (tabla filter por defecto)
iptables-save

# Ver todas las tablas
iptables-save -c  # incluye contadores

# Filtrar solo la tabla nat
iptables-save | grep -A 999 '*nat'
\`\`\`

Salida de \`iptables-save\`:

\`\`\`text
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]
-A INPUT -i lo -j ACCEPT
-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A INPUT -p tcp --dport 22 -j ACCEPT
COMMIT
\`\`\`

Este formato es exactamente el que se puede restaurar con \`iptables-restore\`.

### 📖 Persistencia de reglas

iptables no guarda las reglas en disco por defecto. Al reiniciar, el kernel empieza sin ninguna regla.

\`\`\`bash
# Guardar las reglas actuales (Debian/Ubuntu)
iptables-save > /etc/iptables/rules.v4

# Restaurar manualmente
iptables-restore < /etc/iptables/rules.v4

# En Debian/Ubuntu, instalar iptables-persistent para restauración automática al boot
apt install iptables-persistent
# Durante la instalación pregunta si guardar las reglas actuales.
# Para guardar reglas después de la instalación:
netfilter-persistent save
\`\`\`

\`\`\`text
FLUJO DE PERSISTENCIA:

boot  ──▶  iptables-restore lee /etc/iptables/rules.v4  ──▶  reglas activas
                 ▲
                 │
          netfilter-persistent  (servicio systemd que lo automatiza)
\`\`\`

### 📋 Lo que debes recordar

* Solo necesitas la tabla **filter** para filtrado básico; **nat** para NAT.
* Las cadenas de filter son INPUT (entrante al host), FORWARD (pasa a través), OUTPUT (sale del host).
* La política **DROP** es segura: bloquea todo lo que no está explícitamente permitido.
* \`iptables-save\` / \`iptables-restore\` son el mecanismo de persistencia; sin ellos las reglas se pierden al reiniciar.

### 🧪 Autoevaluación

1. Tienes un servidor que actúa como router para una red interna. ¿En qué cadena de la tabla filter debes poner las reglas de filtrado para el tráfico que pasa entre redes?
2. ¿Cuál es la diferencia práctica entre política ACCEPT y política DROP en la cadena INPUT?
3. Un colega dice que sus reglas de iptables están perfectas pero al reiniciar el servidor el firewall no bloquea nada. ¿Qué olvidó hacer?

---

1. En la cadena **FORWARD**, que maneja paquetes que atraviesan el host sin ser destinados a él.
2. Con **ACCEPT**, cualquier paquete no cubierto por una regla pasa libremente — debes bloquear explícitamente. Con **DROP**, cualquier paquete no cubierto se descarta — debes permitir explícitamente. DROP es el modelo seguro.
3. Olvidó **persistir las reglas**. Debe ejecutar \`iptables-save > /etc/iptables/rules.v4\` y asegurarse de que \`iptables-restore\` se ejecute al arrancar (por ejemplo, via \`iptables-persistent\`).
`

export default content
