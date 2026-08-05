const content = `
## Módulo 7 — Disaster Recovery: planificación, runbooks y failover

### 🎯 Objetivos de aprendizaje
* Distinguir DR de backup: el backup es un componente del DR, no el plan completo
* Definir RPO y RTO para distintos tiers de sistemas y traducirlos a decisiones técnicas
* Entender las arquitecturas de standby: cold, warm y hot, con sus costos y tiempos de recuperación
* Redactar runbooks de DR ejecutables, no documentos aspiracionales
* Diseñar escenarios de failover para los fallos más comunes: pérdida de servidor, pérdida de datacenter, ransomware
* Planificar y ejecutar ejercicios de DR: tabletop, partial failover y full DR drill

### ❓ El problema real

El 14 de agosto de 2003, un fallo en un sistema de monitoreo en Ohio desencadenó un apagón que dejó sin electricidad a 55 millones de personas en el noreste de EE.UU. y Canadá. Los sistemas de control tenían fallos, pero sin monitoreo nadie lo supo hasta que fue tarde.

Escala a tu infraestructura: tu empresa tiene backups diarios, pero ningún procedimiento escrito para restaurar. Cuando el servidor principal cae un sábado a las 2am, el oncall pasa 40 minutos buscando en Slack cuál era la passphrase de Borg, otros 30 minutos recordando cómo configurar el servidor nuevo, y una hora verificando que la aplicación funciona. Total: 2h10m de downtime que con un runbook habría sido 35 minutos.

El Disaster Recovery plan no es el backup. Es la respuesta completa a la pregunta: "¿Qué hacemos exactamente cuando esto falla?"

### 📖 DR vs backup: la distinción fundamental

| Aspecto | Backup | Disaster Recovery |
|---------|--------|------------------|
| Propósito | Preservar datos | Recuperar operaciones |
| Alcance | Datos | Datos + sistemas + procesos + comunicación |
| Audiencia | Equipo técnico | Técnico + negocio + management |
| Producto | Archives | Plan ejecutable + runbooks + procedimientos |
| Prueba | Restore test | DR drill completo |

El backup responde: "¿Tenemos los datos?" El DR responde: "¿Podemos volver a operar, en cuánto tiempo, y quién hace qué?"

### 📖 RPO y RTO: las métricas que definen las decisiones

**RPO (Recovery Point Objective):** cuántos datos puedes perder. Si el RPO es 4 horas, el backup debe ocurrir al menos cada 4 horas.

**RTO (Recovery Time Objective):** cuánto tiempo puedes estar caído. Si el RTO es 2 horas, el proceso de restauración completo debe completarse en 2 horas.

**Tiers de sistemas según criticidad:**

| Tier | Ejemplos | RPO | RTO | Arquitectura requerida |
|------|----------|-----|-----|----------------------|
| Crítico | Pagos, auth, API principal | < 1h | < 1h | Hot standby / active-active |
| Estándar | App principal, CMS, reporting | < 24h | < 4h | Warm standby |
| Soporte | Backoffice, herramientas internas | < 24h | < 24h | Cold standby (restore desde backup) |
| Archival | Logs históricos, reportes anuales | < 1 semana | < 1 semana | Backup en cinta / S3 Glacier |

El costo de la infraestructura de DR es proporcional a la ambición de RPO/RTO. Un hot standby puede costar el doble de infraestructura. Un cold standby (restaurar desde backup) no cuesta casi nada extra pero puede tener RTO de horas. La decisión es de negocio, no técnica: ¿cuánto cuesta una hora de downtime vs cuánto cuesta el DR?

### 📖 Arquitecturas de standby

**Cold standby (restaurar desde backup):**
- Sin réplica en tiempo real. Cuando falla el primario, se provisiona un servidor nuevo y se restaura desde backup.
- RTO: 1-4 horas (depende del tamaño del backup y la velocidad de restauración)
- Costo: bajo (sólo el costo del almacenamiento de backup)
- Adecuado para: sistemas de Tier Soporte/Archival

**Warm standby (réplica lista pero inactiva):**
- Un servidor réplica recibe replicación continua pero no sirve tráfico.
- RTO: 15-30 minutos (verificar réplica, actualizar DNS, probar)
- Costo: medio (servidor extra, transferencia de datos)
- Adecuado para: sistemas Estándar
- Ejemplo en PostgreSQL: streaming replication + \`pg_promote\` para convertir la réplica en primario

**Hot standby (active-active):**
- Múltiples nodos sirven tráfico simultáneamente. Un fallo es transparente al usuario.
- RTO: segundos (el load balancer redirige tráfico automáticamente)
- Costo: alto (N+1 servidores, complejidad operacional)
- Adecuado para: sistemas Críticos
- Ejemplo: PostgreSQL con Patroni, Galera Cluster para MySQL, Redis Sentinel

### 📖 Business Impact Analysis

Antes de escribir runbooks, debes saber qué sistemas importan y cuánto:

\`\`\`
# Plantilla de BIA (Business Impact Analysis)

Sistema: API de checkout (api.mystore.com)
Tier: Crítico
Dueño técnico: equipo-backend
Dueño de negocio: VP Comercial

Dependencias upstream: Base de datos PostgreSQL, Redis, servicio de pagos Stripe
Dependencias downstream: app móvil, frontend web, sistema de inventario

Costo de downtime:
  - 0-1h: \$5,000 (pérdida directa de ventas)
  - 1-4h: \$25,000 + daño reputacional
  - > 4h: \$100,000 + posible breach de SLA con clientes enterprise

RPO objetivo: 15 minutos
RTO objetivo: 30 minutos
Arquitectura actual: warm standby (PostgreSQL streaming replication)
Gap: RTO actual en pruebas: 45 minutos — necesita mejora
\`\`\`

### 📖 Runbooks: procedimientos ejecutables

Un runbook no es documentación general. Es una lista de pasos numerados, ejecutables por cualquier persona del equipo oncall a las 3am con sueño y adrenalina. Si requiere "criterio" o "investigación", no es un runbook, es un troubleshooting guide.

**Estructura de un runbook:**

\`\`\`markdown
# RUNBOOK: Pérdida de servidor de base de datos primario

## Condiciones de activación
- Alerta PagerDuty: "postgres-primary: health check failed > 5min"
- O: SSH al servidor falla después de 3 intentos
- O: App reporta "connection refused" a la base de datos

## Responsable
Oncall primario (ver PagerDuty escalation policy)

## Tiempo estimado de recuperación
25-35 minutos

## Pasos

### 1. Confirmar el fallo (2 min)
ssh admin@db-primary.prod "pg_isready" || echo "FALLO CONFIRMADO"
# Si responde: investigar antes de proceder — puede ser un falso positivo

### 2. Verificar estado de la réplica (2 min)
ssh admin@db-replica.prod "pg_isready"
psql -h db-replica.prod -U postgres -c "SELECT pg_is_in_recovery();"
# Debe devolver: t (true — confirmando que es una réplica activa)

### 3. Verificar lag de replicación (1 min)
psql -h db-replica.prod -U postgres \
  -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"
# Si el lag > 5 minutos, documenta el dato — puede significar pérdida de datos

### 4. Promover réplica a primario (2 min)
ssh admin@db-replica.prod "pg_ctl promote -D /var/lib/postgresql/14/main"
# O con pg_promote() en PostgreSQL 12+:
psql -h db-replica.prod -U postgres -c "SELECT pg_promote();"

### 5. Actualizar DNS / configuración de app (5 min)
# Opción A: actualizar DNS
aws route53 change-resource-record-sets --cli-input-json '{
  "HostedZoneId": "ZXXXX",
  "ChangeBatch": {
    "Changes": [{"Action": "UPSERT", "ResourceRecordSet": {
      "Name": "db.prod.mycompany.com",
      "Type": "CNAME",
      "TTL": 60,
      "ResourceRecords": [{"Value": "db-replica.prod.mycompany.com"}]
    }}]
  }
}'
# Opción B: reiniciar app con nueva variable de entorno
# DB_HOST=db-replica.prod systemctl restart myapp

### 6. Verificar que la app funciona (5 min)
curl -f https://api.mycompany.com/health
# Verificar logs de la aplicación: journalctl -u myapp -n 50

### 7. Notificar (2 min)
# Ver sección de Plan de Comunicación más abajo

### Pasos de rollback
# Si el promote falla o la app no funciona después del paso 6:
# - NO intentar restaurar el primario original sin investigación
# - Escalar al tech lead o a quien está en la escalation policy de PagerDuty
# - Documenta qué funcionó y qué falló para el post-mortem

## Verificación de recuperación
- [ ] pg_isready responde en el nuevo primario
- [ ] App health check devuelve 200
- [ ] No hay errores de DB en logs de app en los últimos 5 minutos
- [ ] Monitoreo muestra métricas normales

## Post-recuperación
- Abrir ticket de post-mortem dentro de 24h
- Provisionar nueva réplica de la nueva primario (la arquitectura volvió a tener single point of failure)
\`\`\`

### 📖 Plan de comunicación

El runbook técnico dice qué hacer. El plan de comunicación dice a quién informar y cuándo.

\`\`\`
## Plan de comunicación para P1 (outage de sistema Crítico)

T+0 (inicio del incidente):
  - Oncall: declara el incidente en #incidents (Slack)
  - Oncall: abre ticket en sistema de incidentes

T+5 minutos:
  - Oncall: notifica a tech lead del servicio afectado
  - CTO automáticamente paginado via PagerDuty si dura > 5 min

T+15 minutos:
  - Tech lead: actualiza status page (statuspage.io)
  - Tech lead: notifica a VP de Producto con: qué falló, usuarios afectados, ETA de recuperación

T+30 minutos (si no hay resolución):
  - Escalar a: Director de Engineering
  - Considerar: notificación proactiva a clientes enterprise con SLA

Al resolver:
  - Actualizar status page: "resolved"
  - Email a clientes afectados (si aplica SLA)
  - Anuncio en #incidents con timeline
  - Agendar post-mortem dentro de 48h
\`\`\`

### 📖 Escenarios de failover críticos

**Escenario 1: Ransomware / corrupción total**

El escenario más temido y el que requiere más preparación:

\`\`\`bash
# Señales de ransomware: archivos con extensiones desconocidas, nota de rescate
# PRIMER PASO: aislar el servidor de la red INMEDIATAMENTE
# NO intentar limpiar en caliente — el malware puede seguir corriendo

# 1. Aislar el servidor
iptables -P INPUT DROP
iptables -P OUTPUT DROP
iptables -P FORWARD DROP

# 2. Identificar el último backup limpio (ANTES de la infección)
# Los archivos Borg son inmutables — un ransomware no puede cifrar archives ya guardados
borg list user@backup-server:/backups/myserver

# 3. Provisionar servidor completamente nuevo (no limpiar el comprometido)
# El servidor comprometido conservarlo para forensics

# 4. Restaurar desde el archive ANTERIOR a la infección
# (Nunca el más reciente — puede incluir archivos ya cifrados)
borg extract user@backup-server:/backups/myserver::hostname-2024-01-12T03:00 /

# 5. Cambiar TODAS las credenciales antes de volver online
\`\`\`

**Escenario 2: Pérdida de datacenter completo**

Requiere repositorios de backup en ubicación geográfica diferente:

\`\`\`bash
# El repositorio remoto está en otro datacenter / cloud provider
# Verificar que el backup remoto es accesible
borg list user@dr-backup.eu-west-1.mycompany.com:/backups/myserver

# Provisionar infraestructura en la región de DR
# (Idealmente infraestructura como código: Terraform, Ansible)
terraform apply -var="region=eu-west-1" terraform/dr-environment/

# Restaurar y configurar
borg extract user@dr-backup.eu-west-1:/backups/myserver::latest /
\`\`\`

### 📖 Tipos de ejercicios de DR

| Ejercicio | Descripción | Frecuencia | Interrupción |
|-----------|-------------|-----------|--------------|
| Tabletop | El equipo sigue el runbook en papel/Zoom, sin ejecutar comandos reales | Trimestral | Ninguna |
| Partial failover | Se ejecuta el runbook real en staging | Semestral | Baja (sólo staging) |
| Full DR drill | Se ejecuta el runbook completo en producción, con downtime planificado | Anual | Planificada |

El tabletop exercise es el más subestimado: en 2 horas de reunión, el equipo descubre qué pasos del runbook son incorrectos, qué herramientas no están disponibles, y quién no sabe hacer qué. Es el mejor ROI en preparación de DR.

### 📋 Lo que debes recordar
* DR no es backup. El backup preserva datos; el DR preserva la capacidad operacional de la empresa
* RPO y RTO son decisiones de negocio con implicaciones técnicas, no decisiones técnicas
* Cold/warm/hot standby tienen tradeoffs claros de costo vs tiempo de recuperación
* Un runbook que requiere "criterio" no es un runbook — debe ser ejecutable a las 3am por cualquier oncall
* El plan de comunicación es parte del DR: el equipo no-técnico necesita información mientras el técnico trabaja
* Haz tabletop exercises trimestralmente — descubrir fallos en papel es infinitamente más barato que en producción

### 🧪 Autoevaluación
1. Tu empresa procesa \$10,000 por hora en transacciones. El CTO te pide que diseñes el DR para el sistema de checkout. ¿Qué RPO y RTO propondrías, y qué arquitectura de standby requiere esa decisión?
2. ¿Cuál es la diferencia entre un tabletop exercise y un full DR drill? ¿Cuándo usarías cada uno?
3. Un servidor de producción tiene signos de ransomware — algunos archivos tienen extensiones desconocidas. ¿Cuáles son los tres primeros pasos que debes tomar, en orden?

---

1. Con \$10,000/hora, incluso 30 minutos de downtime cuesta \$5,000. Un RPO de 15 minutos y RTO de 30 minutos sería razonable. Eso requiere arquitectura hot standby o warm standby con replicación continua (PostgreSQL streaming replication o equivalente). Cold standby (restore desde backup) no es viable con un RTO de 30 minutos — el restore de backups de tamaño significativo lleva más tiempo. El costo de un servidor réplica adicional (warm/hot) se justifica con un solo incidente evitado.
2. Un tabletop exercise es una simulación en papel/videoconferencia donde el equipo sigue el runbook verbalmente sin ejecutar comandos reales. Tiene cero interrupción y descubre fallos conceptuales en el plan. Un full DR drill es la ejecución real del plan en producción, con downtime planificado, verificando que los pasos técnicos funcionan realmente. Usa tabletop trimestralmente (bajo costo, alta frecuencia); reserva el full DR drill para anual (requiere coordinación, causa downtime planificado).
3. Primero: aislar el servidor de la red inmediatamente (cortar su acceso a otros sistemas para prevenir propagación lateral). Segundo: NO intentar limpiar ni apagar el servidor — preservarlo intacto para análisis forense. Tercero: identificar en el repositorio de backup el último archive anterior a la infección (no el más reciente, que puede contener archivos ya cifrados) y comenzar el proceso de restauración en un servidor nuevo limpio.
`

export default content
