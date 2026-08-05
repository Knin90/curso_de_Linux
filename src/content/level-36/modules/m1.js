const content = `
## Módulo 1 — Estrategia de backup: RPO, RTO, tipos y regla 3-2-1

### 🎯 Objetivos de aprendizaje

* Definir RPO y RTO como métricas de diseño que guían todas las decisiones de backup.
* Distinguir los tres tipos de backup (completo, incremental, diferencial) con sus trade-offs reales.
* Aplicar la regla 3-2-1 para diseñar una estrategia con redundancia suficiente.
* Comparar medios de almacenamiento y sus características operacionales.
* Definir políticas de retención alineadas a los requisitos del negocio.

### ❓ El problema real

Son las 3 a.m. El servidor de producción perdió su volumen de datos. Tienes backups pero no sabes cuánto tardará la restauración. El CEO pregunta cuándo vuelve el servicio. Tus SLAs dicen "alta disponibilidad" pero nadie midió qué significa eso en términos de tiempo y datos perdidos.

Sin RPO y RTO definidos antes del desastre, tomas decisiones bajo presión que costarán más tiempo y dinero. Con ellos, tienes un objetivo concreto y puedes medir si tu estrategia lo cumple.

### 📖 RPO: Recovery Point Objective

El RPO define **cuántos datos puedes perder** medidos en tiempo. Es la distancia máxima aceptable entre el momento del desastre y el último backup válido.

\`\`\`text
              RPO = 4 horas
              ◄──────────────►
tiempo: ──────●───────────────X──────
          último            desastre
          backup
\`\`\`

Ejemplos concretos:
- **RPO = 0**: Sin pérdida de datos. Requiere replicación síncrona en tiempo real. Caro.
- **RPO = 1 hora**: Backups cada hora o replicación asíncrona continua.
- **RPO = 24 horas**: Backups diarios. Común en sistemas menos críticos.
- **RPO = 1 semana**: Solo aceptable para datos históricos o archivos estáticos.

El RPO determina la **frecuencia mínima** de tus backups. Si tu RPO es de 4 horas, hacer backups diarios incumple el objetivo.

### 📖 RTO: Recovery Time Objective

El RTO define **cuánto tiempo puede estar el servicio caído** desde el momento del desastre hasta la restauración completa.

\`\`\`text
              RTO = 2 horas
              ◄──────────────►
tiempo: ──────X───────────────●──────
           desastre        servicio
                           restaurado
\`\`\`

Ejemplos concretos:
- **RTO = 0**: Sin tiempo de caída. Requiere failover automático con hot standby.
- **RTO = 15 minutos**: Restauración rápida desde snapshot local o failover semi-automático.
- **RTO = 4 horas**: Restauración desde backup local con procedimiento documentado.
- **RTO = 24 horas**: Aceptable para sistemas internos no críticos.

El RTO determina dónde guardas los backups y cuánta automatización necesitas. Un RTO de 15 minutos con backups en cinta no es posible.

### 📖 La relación entre RPO, RTO y costo

\`\`\`text
            ▲ Costo
            │
            │                    ● RPO=0, RTO=0
            │                  (replicación síncrona)
            │
            │            ● RPO=1h, RTO=15min
            │           (backup local + hot spare)
            │
            │      ● RPO=4h, RTO=2h
            │     (backup NAS + procedimiento)
            │
            │  ● RPO=24h, RTO=8h
            │ (backup diario en disco externo)
            │
            └────────────────────────────────► Tiempo
\`\`\`

Reducir RPO o RTO siempre aumenta el costo. La pregunta correcta es: ¿cuánto le cuesta al negocio una hora de caída? Si son \$10.000/hora, invertir en RTO bajo es rentable. Si son \$50/hora, no lo es.

### 📖 Tipos de backup

**Backup completo (Full)**

Copia todos los datos seleccionados, independientemente de cuándo cambiaron.

\`\`\`text
Día 1: COMPLETO  ████████████████  (10 GB, 2 horas)
Día 2: COMPLETO  ████████████████  (10 GB, 2 horas)
Día 3: COMPLETO  ████████████████  (10 GB, 2 horas)
\`\`\`

Ventajas:
- Restauración simple: un solo archivo/conjunto de archivos.
- Independiente de otros backups anteriores.

Desventajas:
- Lento: siempre copia todo aunque nada haya cambiado.
- Costoso en almacenamiento: cada backup repite datos idénticos.

**Backup incremental**

Copia solo los datos modificados desde el **último backup** (completo o incremental anterior).

\`\`\`text
Día 1: COMPLETO    ████████████████  (10 GB)
Día 2: INCREMENTAL ██                (1 GB — solo cambios del día 2)
Día 3: INCREMENTAL █                 (0.5 GB — solo cambios del día 3)
Día 4: INCREMENTAL ███               (1.5 GB — solo cambios del día 4)
\`\`\`

Ventajas:
- Rápido y eficiente en almacenamiento.
- Ideal para datos que cambian poco.

Desventajas:
- Restauración compleja: necesitas el completo + todos los incrementales en orden.
- Si un incremental intermedio está corrupto, no puedes restaurar los siguientes.

**Backup diferencial**

Copia los datos modificados desde el **último backup completo** (no desde el último backup).

\`\`\`text
Día 1: COMPLETO    ████████████████  (10 GB)
Día 2: DIFERENCIAL ██                (1 GB — cambios desde día 1)
Día 3: DIFERENCIAL ████              (2 GB — cambios desde día 1, acumulado)
Día 4: DIFERENCIAL ██████            (3 GB — cambios desde día 1, acumulado)
\`\`\`

Ventajas:
- Restauración simple: solo necesitas el completo + el diferencial más reciente.
- Más robusto que incremental (menos dependencias).

Desventajas:
- Crece con el tiempo hasta el próximo completo.
- Más lento que incremental.

**Comparación práctica**

| Criterio | Completo | Incremental | Diferencial |
|---|---|---|---|
| Velocidad de backup | Lenta | Muy rápida | Rápida |
| Espacio usado | Alto | Bajo | Medio |
| Velocidad de restauración | Rápida | Lenta | Media |
| Complejidad de restauración | Baja | Alta | Media |
| Cadena de dependencias | Ninguna | Larga | Corta (solo 2) |

**Estrategia recomendada en producción**: completo semanal + incrementales diarios. Esto equilibra velocidad de backup con tiempo de restauración manejable.

### 📖 La regla 3-2-1

La regla 3-2-1 es el estándar mínimo de la industria para cualquier sistema que necesite sobrevivir a desastres reales:

\`\`\`text
3 copias de los datos
  │
  ├─ 2 en medios diferentes
  │    │
  │    ├─ Copia 1: disco local (servidor de producción)
  │    └─ Copia 2: NAS o servidor de backup en la misma red
  │
  └─ 1 copia offsite
       └─ Copia 3: cloud (S3, Backblaze B2) o cinta en otra ubicación física
\`\`\`

Por qué importa cada parte:
- **3 copias**: si tienes 2 y ambas fallan simultáneamente (incendio, ransomware), pierdes todo.
- **2 medios diferentes**: un fallo de fabricante, un virus de storage, o un controlador defectuoso no elimina ambas copias.
- **1 offsite**: protege contra desastres físicos (incendio, inundación, robo del datacenter).

### 📖 Comparación de medios de almacenamiento

| Medio | Costo | Velocidad restore | Durabilidad | Caso de uso |
|---|---|---|---|---|
| Disco local | Bajo | Muy alta | Media (fallo HDD) | Copia primaria rápida |
| NAS/SAN | Medio | Alta | Alta (RAID) | Segunda copia local |
| Cinta (LTO) | Bajo/TB | Baja | Muy alta (30+ años) | Archivo a largo plazo |
| Cloud S3/B2 | Variable | Media (red) | Muy alta (redundante) | Copia offsite |
| USB externo | Bajo | Media | Baja (frágil) | Solo backups pequeños |

**Backblaze B2** cuesta ~\$6/TB/mes con API compatible con S3. Para startups es la opción offsite más económica. **AWS S3 Glacier** cuesta ~\$1/TB/mes pero el restore tarda horas — incompatible con RTO bajo.

### 📖 Catálogo de backups y retención

El catálogo es el registro de qué backups existen, cuándo se crearon, qué contienen y si están verificados. Sin catálogo, un backup es un archivo anónimo del que no sabes si funciona.

Política de retención típica para producción:

\`\`\`text
Backups diarios:   conservar 7 días
Backups semanales: conservar 4 semanas
Backups mensuales: conservar 6 meses
Backups anuales:   conservar 3 años (o según regulación)
\`\`\`

Esta política se conoce como **GFS (Grandfather-Father-Son)**. BorgBackup y la mayoría de soluciones enterprise la implementan con un solo comando de poda (prune).

Los requisitos legales pueden extender la retención: GDPR, PCI-DSS, SOC2 y HIPAA tienen sus propias exigencias. Documenta la política y sus fundamentos.

### 📋 Lo que debes recordar

* RPO = máxima pérdida de datos aceptable en tiempo. Determina la frecuencia de backups.
* RTO = máximo tiempo de caída aceptable. Determina dónde guardas backups y cuánta automatización necesitas.
* Incremental: rápido, eficiente, restauración compleja. Diferencial: balance entre ambos.
* Regla 3-2-1: 3 copias, 2 medios distintos, 1 offsite. Mínimo no negociable.
* Sin catálogo y sin pruebas de restauración, tus backups son promesas sin verificar.

### 🧪 Autoevaluación

1. Tu base de datos procesa 500 transacciones/hora. Si tu RPO es de 2 horas, ¿cuántas transacciones como máximo puedes perder en un desastre? ¿Con qué frecuencia mínima debes hacer backups?

2. Tienes backups completos los lunes y backups diferenciales de martes a domingo. El jueves hay un desastre. ¿Cuántos archivos de backup necesitas para restaurar? Nombra cuáles.

3. Describes tu estrategia de backup a tu CTO: "Tengo el backup en un disco externo conectado al mismo servidor." ¿Qué regla viola esto y por qué es un problema crítico?

---

1. Máximo 1.000 transacciones perdidas (500/hora × 2 horas). Frecuencia mínima de backups: cada 2 horas.

2. Dos archivos: el backup completo del lunes + el backup diferencial del jueves. El diferencial del jueves contiene todos los cambios desde el completo del lunes.

3. Viola las tres partes de la regla 3-2-1: solo hay 2 copias (producción + disco), ambas en el mismo medio (mismo servidor), y ninguna offsite. Si el servidor sufre un incendio, falla eléctrica severa, o ransomware que cifra discos conectados, se pierden ambas copias simultáneamente.
`

export default content
