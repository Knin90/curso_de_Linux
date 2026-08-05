const content = `
## Módulo 1 — Tablas de routing: ip route y decisiones de enrutamiento

### 🎯 Objetivos de aprendizaje

* Leer e interpretar la tabla de routing con \`ip route\`.
* Entender cómo el kernel decide qué ruta usar para un paquete.
* Distinguir entre rutas de host, red y gateway.
* Inspeccionar la decisión de routing para una IP destino específica.

### ❓ El problema real

Tu servidor tiene tres interfaces de red y el tráfico sale siempre por la interfaz incorrecta. O peor: configuras una ruta nueva y de repente pierdes acceso al servidor por SSH. Entender cómo el kernel elige rutas es imprescindible antes de modificar cualquier cosa en red.

### 📖 La tabla de routing en Linux

El kernel mantiene una tabla de rutas que consulta para cada paquete saliente. La lectura correcta de esta tabla evita el 80% de los problemas de routing.

\`\`\`bash
# Ver la tabla de routing completa
ip route show
ip route   # forma corta

# Salida típica de un servidor con una sola interfaz
default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.100 metric 100
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100
\`\`\`

**Anatomía de una entrada de ruta:**

\`\`\`text
default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.100 metric 100
│       │   │           │   │    │    │         │              │
│       │   │           │   │    │    │         │              └─ métrica (menor = preferida)
│       │   │           │   │    │    │         └─ IP origen preferida para esta ruta
│       │   │           │   │    │    └─ origen: dhcp, static, kernel, ospf...
│       │   │           │   │    └─ protocolo de routing que instaló esta ruta
│       │   │           │   └─ interfaz de salida
│       │   └─────────── gateway (next hop)
│       └─ via = a través de
└─ destino (default = 0.0.0.0/0 = cualquier destino)
\`\`\`

### 📖 Cómo el kernel elige la ruta

El kernel aplica el algoritmo **Longest Prefix Match (LPM)**: gana la ruta más específica (prefijo más largo).

\`\`\`text
Tabla de rutas:
  10.0.0.0/8       via 192.168.1.254   metric 100
  10.10.0.0/16     via 192.168.1.253   metric 100
  10.10.20.0/24    via 192.168.1.252   metric 100
  default          via 192.168.1.1     metric 100

Destino: 10.10.20.50
  Coincide con 10.0.0.0/8       → prefijo /8
  Coincide con 10.10.0.0/16     → prefijo /16
  Coincide con 10.10.20.0/24    → prefijo /24  ← GANA (más específico)
  → El paquete sale via 192.168.1.252
\`\`\`

Cuando dos rutas tienen el mismo prefijo, gana la de menor **métrica**.

### 📖 Consultar la ruta para un destino específico

\`\`\`bash
# ¿Qué ruta usará el kernel para llegar a 8.8.8.8?
ip route get 8.8.8.8
# 8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.100 uid 0
#     cache

# ¿Y para una IP de la red local?
ip route get 192.168.1.50
# 192.168.1.50 dev eth0 src 192.168.1.100 uid 0

# Con IP de origen explícita (útil con múltiples interfaces)
ip route get 8.8.8.8 from 10.0.0.5
\`\`\`

### 📖 Tipos de rutas en la tabla

\`\`\`text
TIPO          EJEMPLO                        SIGNIFICADO
──────────────────────────────────────────────────────────────────
connected     192.168.1.0/24 dev eth0        Red directamente conectada
default       default via 192.168.1.1        Ruta de último recurso (0.0.0.0/0)
host          10.0.0.1 dev lo                Ruta a una IP específica (/32)
blackhole     blackhole 10.200.0.0/24        Descartar silenciosamente
unreachable   unreachable 10.200.0.0/24      Descartar con ICMP unreachable
prohibit      prohibit 10.200.0.0/24         Descartar con ICMP prohibited
\`\`\`

\`\`\`bash
# Ver rutas de caché (kernel las guarda temporalmente para eficiencia)
ip route show cache

# Ver tabla completa incluyendo rutas de kernel
ip route show table all

# Ver solo rutas de una tabla específica
ip route show table main    # la tabla normal
ip route show table local   # rutas locales y broadcast
\`\`\`

### 📖 Agregar y eliminar rutas temporales

\`\`\`bash
# Agregar ruta a una red vía gateway
ip route add 10.20.0.0/16 via 192.168.1.254

# Agregar ruta por una interfaz específica (sin gateway, red directa)
ip route add 172.16.0.0/12 dev eth1

# Agregar ruta con métrica específica
ip route add 10.20.0.0/16 via 192.168.1.254 metric 200

# Agregar ruta con IP origen preferida
ip route add 10.20.0.0/16 via 192.168.1.254 src 192.168.1.100

# Eliminar ruta
ip route del 10.20.0.0/16 via 192.168.1.254

# Eliminar ruta default
ip route del default

# Reemplazar ruta existente (add + del en una operación)
ip route replace 10.20.0.0/16 via 192.168.1.253
\`\`\`

**Importante:** las rutas agregadas con \`ip route add\` son temporales — desaparecen al reiniciar. La persistencia se configura en NetworkManager, systemd-networkd o archivos de red según la distribución.

### 📋 Lo que debes recordar

* El kernel usa Longest Prefix Match: la ruta más específica gana siempre.
* \`ip route get <IP>\` muestra exactamente qué ruta usará el kernel para ese destino.
* Las rutas tienen métrica: menor métrica = mayor prioridad cuando el prefijo es idéntico.
* \`ip route add\` crea rutas temporales. Para persistencia se necesita configuración en el gestor de red.

### 🧪 Autoevaluación

1. La tabla tiene \`10.0.0.0/8 via gw1\` y \`10.0.10.0/24 via gw2\`. ¿Por cuál gateway sale un paquete a \`10.0.10.5\`?
2. ¿Qué diferencia hay entre \`ip route get 8.8.8.8\` y \`ip route show\`?
3. Agregas una ruta con \`ip route add\` y al día siguiente ya no está. ¿Qué pasó?

---

1. Por \`gw2\`, porque \`10.0.10.0/24\` es más específico (/24 > /8) que \`10.0.0.0/8\`. El Longest Prefix Match siempre gana con el prefijo más largo.
2. \`ip route show\` lista todas las rutas en la tabla. \`ip route get\` simula exactamente qué ruta elegiría el kernel para un destino concreto, aplicando LPM y resolviendo empates por métrica — es la herramienta de verificación real.
3. Las rutas añadidas con \`ip route add\` son volátiles: viven solo en memoria del kernel y se pierden al reiniciar o al reiniciar la interfaz. Para persistencia hay que configurarlas en el gestor de red de la distribución (NetworkManager, systemd-networkd, /etc/network/interfaces, etc.).
`

export default content
