const content = `
## Módulo 1 — Conceptos de HA: SLA, RTO, RPO y Single Points of Failure

### 🎯 Objetivos de aprendizaje

* Entender qué significa alta disponibilidad y cómo se mide con SLA, RTO y RPO.
* Identificar single points of failure en una arquitectura existente.
* Calcular el impacto económico de downtime.
* Distinguir entre las distintas estrategias de HA: active-active vs. active-passive.

### ❓ El problema real

Tu aplicación lleva meses funcionando perfectamente en un único servidor. Un martes a las 10 PM el disco falla: el servidor muere y la empresa pierde ingresos por hora mientras el equipo de infraestructura trabaja a contrarreloj. Esto se llama un Single Point of Failure (SPOF). El objetivo de la alta disponibilidad no es eliminar los fallos — los fallos son inevitables — sino diseñar el sistema para que los fallos no se traduzcan en downtime perceptible para el usuario.

Alta disponibilidad no es gratis ni sencillo. Implica más hardware, más complejidad de configuración, y más superficie de error. Este módulo te da el vocabulario y los conceptos para tomar decisiones informadas sobre cuándo y cómo implementar HA.

### 📖 SLA: Service Level Agreement

Un SLA es el porcentaje de tiempo que un sistema estará disponible. Se expresa en "nueves":

\`\`\`text
DISPONIBILIDAD   DOWNTIME/AÑO    DOWNTIME/MES    DOWNTIME/SEMANA
─────────────────────────────────────────────────────────────────
90%  (1 nine)    36.5 días       72 horas        16.8 horas
99%  (2 nines)   3.65 días       7.2 horas       1.68 horas
99.9%  (3 n.)    8.76 horas      43.8 minutos    10.1 minutos
99.99% (4 n.)    52.6 minutos    4.38 minutos    1.01 minutos
99.999% (5 n.)   5.26 minutos    26.3 segundos   6.05 segundos
\`\`\`

Los SLAs más comunes en producción son 99.9% (3 nines) para aplicaciones empresariales estándar y 99.99% (4 nines) para sistemas críticos. Lograr 5 nines requiere arquitecturas extremadamente complejas y costosas — Google, Amazon y Microsoft los ofrecen para sus servicios core.

### 📖 RTO y RPO: métricas de recuperación

Estas dos métricas definen cuánto puedes tolerar perder en un desastre:

\`\`\`text
RTO — Recovery Time Objective
  El tiempo máximo aceptable desde que ocurre el fallo hasta que el
  servicio está restaurado. "¿Cuánto tiempo podemos estar caídos?"

  Ejemplo: RTO = 1 hora significa que el sistema debe estar operativo
  en menos de 1 hora tras un fallo.

RPO — Recovery Point Objective
  La cantidad máxima de datos que se pueden perder. "¿Hasta cuándo
  atrás podemos recuperar datos?"

  Ejemplo: RPO = 15 minutos significa que si el sistema falla, a lo
  sumo perdemos 15 minutos de datos (los backups son cada 15 min).
\`\`\`

La relación entre RTO/RPO y coste es directa: RTO = 0 y RPO = 0 requieren replicación síncrona en tiempo real y múltiples nodos activos. RTO = 24h y RPO = 24h se pueden lograr con un backup diario a S3.

\`\`\`text
ESTRATEGIA           RTO         RPO         COSTE RELATIVO
────────────────────────────────────────────────────────────
Backup a disco       horas       24h         bajo
Backup + standby     minutos     1-24h       medio
Replicación async    minutos     segundos    medio-alto
Replicación sync     segundos    ~0          alto
Active-active        segundos    ~0          muy alto
\`\`\`

### 📖 Single Points of Failure

Un SPOF es cualquier componente cuyo fallo hace caer todo el sistema. Identificarlos es el primer paso de cualquier diseño de HA:

\`\`\`text
COMPONENTE          SPOF TÍPICO             SOLUCIÓN HA
────────────────────────────────────────────────────────────────────
Servidor web        un solo nginx           múltiples + load balancer
Base de datos       un solo Postgres        primary + standby + failover
Load balancer       un solo HAProxy         HAProxy + keepalived (VRRP)
Almacenamiento      un solo disco           RAID, replicación, SAN/NFS HA
Red                 un solo NIC             bonding/LACP, múltiples switches
DNS                 un solo servidor        DNS con múltiples registros A
\`\`\`

Metodología para identificar SPOFs en tu arquitectura:

\`\`\`bash
# 1. Dibuja el diagrama de tu arquitectura
# 2. Para cada componente, pregúntate: "¿qué pasa si este falla?"
# 3. Si la respuesta es "el sistema entero cae", es un SPOF
# 4. Prioriza por probabilidad × impacto
\`\`\`

### 📖 Active-active vs. active-passive

\`\`\`text
ACTIVE-PASSIVE (failover)
  ┌──────────┐    ┌──────────┐
  │ Nodo A   │    │ Nodo B   │
  │ (ACTIVO) │    │(STANDBY) │
  └──────────┘    └──────────┘
       │
   Tráfico

  Ventajas: simple, barato, fácil de operar
  Desventajas: capacidad subutilizada, failover tarda segundos/minutos
  Uso: bases de datos, load balancers

ACTIVE-ACTIVE (balanceo real)
  ┌──────────┐    ┌──────────┐
  │ Nodo A   │    │ Nodo B   │
  │ (ACTIVO) │    │ (ACTIVO) │
  └──────────┘    └──────────┘
        ↑               ↑
        └───── LB ──────┘

  Ventajas: mayor capacidad, failover transparente, mejor uso de recursos
  Desventajas: complejidad en manejo de estado, consistencia de datos
  Uso: servidores web stateless, APIs, microservicios
\`\`\`

### 📖 Cálculo del coste de downtime

\`\`\`bash
# Fórmula básica
# Coste = (ingresos/hora) × horas_caído + coste_reputacional

# Ejemplo: e-commerce con 50.000 EUR/día de facturación
echo "Ingresos por hora: $((50000 / 24)) EUR"
# → 2083 EUR/hora

# SLA 99.9% permite ~8.76 horas de downtime al año
# Coste máximo de downtime aceptado: 2083 × 8.76 = ~18.247 EUR/año

# Si un cluster HA cuesta 500 EUR/mes (6.000 EUR/año) y evita ese downtime,
# el ROI es claro: 18.247 - 6.000 = 12.247 EUR de ahorro neto
\`\`\`

### 📋 Lo que debes recordar

* SLA expresa disponibilidad en porcentaje; RTO es el tiempo máximo de recuperación; RPO es la pérdida máxima de datos aceptable.
* Un SPOF es cualquier componente cuyo fallo colapsa el sistema completo — el load balancer también puede ser un SPOF.
* Active-passive es más simple y barato; active-active ofrece mayor capacidad pero requiere gestión de estado.
* Siempre calcular el coste del downtime antes de justificar la inversión en HA.

### 🧪 Autoevaluación

1. Una empresa tiene SLA del 99.9%. ¿Cuántos minutos de downtime al mes puede tener como máximo?
2. ¿Cuál es la diferencia entre RTO y RPO? Da un ejemplo concreto de cada uno.
3. En una arquitectura típica de 3 capas (LB → web → DB), identifica al menos 3 SPOFs potenciales.

---

1. 99.9% de disponibilidad = 0.1% de downtime. En un mes de 30 días = 43.200 minutos × 0.001 = 43.2 minutos máximo de downtime mensual.
2. RTO es el tiempo de recuperación: "El sistema debe volver en menos de 1 hora". RPO es la pérdida de datos: "No podemos perder más de 15 minutos de transacciones". Son independientes: puedes tener RTO=5 minutos (recuperas rápido) pero RPO=1 hora (aceptas perder hasta 1 hora de datos).
3. SPOFs en arquitectura 3 capas: (1) el load balancer único — si cae, nada llega a los web servers; (2) un único servidor de base de datos — si cae, toda la capa web pierde acceso a datos; (3) el switch de red — si falla la conectividad de red entre capas, el sistema cae aunque los servidores estén vivos.
`

export default content
