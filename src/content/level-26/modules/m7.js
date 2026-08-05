const content = `
## Módulo 7 — Métricas de seguridad: CVSS, tiempo de remediación, SLA

### 🎯 Objetivos de aprendizaje
* Interpretar un vector CVSS v3.1 y calcular su puntuación base
* Distinguir entre puntuación base, temporal y ambiental
* Definir SLAs de remediación según la severidad de una vulnerabilidad
* Calcular KPIs de gestión de vulnerabilidades (MTTR, cumplimiento de SLA)
* Construir una matriz de priorización basada en riesgo real

---

### ❓ El problema real

Tu equipo tiene 47 vulnerabilidades abiertas. El CISO pregunta en la reunión semanal:
"¿Cuál arreglamos primero?" Responder con "la de mayor CVSS" suena razonable,
pero ignora que una vulnerabilidad con CVSS 7.5 ya explotada en producción
puede ser más urgente que una de CVSS 9.0 sin exploit público y en un sistema interno.

Necesitas un sistema de métricas que combine puntuación técnica, criticidad del activo
y explotabilidad real.

---

### 📖 CVSS v3.1: anatomía del vector base

CVSS (Common Vulnerability Scoring System) v3.1 es el estándar de la industria para
cuantificar la severidad técnica de una vulnerabilidad. La puntuación base describe
las características intrínsecas de la vulnerabilidad, independientemente del entorno.

**Vector completo de ejemplo:**
\`\`\`
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8 Critical
\`\`\`

**Métricas del vector base:**

| Métrica | Código | Valores |
|---|---|---|
| Attack Vector | AV | Network (N), Adjacent (A), Local (L), Physical (P) |
| Attack Complexity | AC | Low (L), High (H) |
| Privileges Required | PR | None (N), Low (L), High (H) |
| User Interaction | UI | None (N), Required (R) |
| Scope | S | Unchanged (U), Changed (C) |
| Confidentiality Impact | C | None (N), Low (L), High (H) |
| Integrity Impact | I | None (N), Low (L), High (H) |
| Availability Impact | A | None (N), Low (L), High (H) |

**Lectura del vector de ejemplo:**
- AV:N → Explotable vía red (sin acceso físico)
- AC:L → Complejidad baja (no requiere condiciones especiales)
- PR:N → No se necesitan privilegios previos
- UI:N → No requiere acción del usuario
- S:U → El impacto no se propaga a otros componentes
- C:H/I:H/A:H → Impacto total en confidencialidad, integridad y disponibilidad

Resultado: **9.8 Critical** — vulnerabilidad de red, sin fricciones, impacto máximo.

---

### 📖 Rangos de puntuación CVSS

| Rango | Severidad | Tiempo de respuesta típico |
|---|---|---|
| 9.0 – 10.0 | Critical | 24 horas |
| 7.0 – 8.9 | High | 7 días |
| 4.0 – 6.9 | Medium | 30 días |
| 0.1 – 3.9 | Low | 90 días |
| 0.0 | None | Sin urgencia |

---

### 📖 Puntuación temporal y ambiental

La puntuación base es estática. Las puntuaciones temporal y ambiental refinan
ese valor según el contexto actual.

**Puntuación temporal** (modifica la base):
- **Exploit Code Maturity (E):** ¿existe exploit público? Not Defined / Unproven / Proof-of-Concept / Functional / High
- **Remediation Level (RL):** ¿hay parche oficial? Official Fix / Temporary Fix / Workaround / Unavailable
- **Report Confidence (RC):** ¿está confirmada? Unknown / Reasonable / Confirmed

Una vulnerabilidad con CVSS base 8.0 puede bajar a 6.4 temporal si no existe exploit
y hay parche oficial disponible.

**Puntuación ambiental** (modifica la temporal):
- Ajusta los impactos (C/I/A) según la criticidad del activo en tu organización
- Un servidor de logging comprometido ≠ un servidor de pagos comprometido
- Se usan los Modified Impact Subscores para elevar o reducir la puntuación final

---

### 📖 CISA KEV: la lista que no se discute

El CISA (Cybersecurity and Infrastructure Security Agency) publica el **Known Exploited
Vulnerabilities (KEV) catalog**: vulnerabilidades con explotación activa confirmada en entornos reales.

**Regla operacional:** si una CVE está en el KEV catalog, se remedia con prioridad máxima
**independientemente** de su puntuación CVSS. Una CVE con CVSS 6.5 en KEV supera en
urgencia a una CVE de CVSS 9.0 sin exploit conocido.

Consulta el catálogo: https://www.cisa.gov/known-exploited-vulnerabilities-catalog

---

### 📖 SLA de remediación por severidad

Un SLA (Service Level Agreement) de vulnerabilidades define el tiempo máximo aceptable
entre la detección y la remediación.

| Severidad | CVSS | SLA estándar | Con activo crítico |
|---|---|---|---|
| Critical | 9.0–10.0 | 24 horas | Inmediato |
| High | 7.0–8.9 | 7 días | 3 días |
| Medium | 4.0–6.9 | 30 días | 15 días |
| Low | 0.1–3.9 | 90 días | 60 días |
| En KEV (cualquier CVSS) | — | 24 horas | Inmediato |

El SLA comienza desde la fecha de detección (escaneo o reporte), no desde la fecha
en que se asigna al equipo responsable.

---

### 📖 KPIs de gestión de vulnerabilidades

**MTTR (Mean Time To Remediate):**
\`\`\`
MTTR = suma(fecha_cierre - fecha_detección) / total_vulnerabilidades_cerradas
\`\`\`
Objetivo típico: MTTR < SLA para cada categoría de severidad.

**Cumplimiento de SLA (%):**
\`\`\`
SLA_compliance = (vulnerabilidades_cerradas_dentro_del_SLA / total_cerradas) × 100
\`\`\`
Objetivo: ≥ 95% para Critical/High.

**Backlog de vulnerabilidades:**
- Número total de vulnerabilidades abiertas por severidad
- Tendencia: ¿crece o decrece semana a semana?

**Patch coverage (%):**
\`\`\`
patch_coverage = (sistemas_parcheados / sistemas_en_scope) × 100
\`\`\`

---

### 📖 Matriz de priorización basada en riesgo

El riesgo operacional combina tres dimensiones:

\`\`\`
Riesgo = CVSS_temporal × criticidad_activo × factor_explotabilidad
\`\`\`

| Factor | Valores |
|---|---|
| CVSS temporal | 0.1 – 10.0 |
| Criticidad del activo | Bajo (1.0) / Medio (1.2) / Alto (1.5) / Crítico (2.0) |
| Factor explotabilidad | Sin exploit (0.8) / PoC público (1.2) / En KEV (2.0) |

**Ejemplo:**
- CVE-2021-44228 (Log4Shell): CVSS 10.0 × activo crítico (2.0) × en KEV (2.0) = 40.0 → Inmediato
- CVE-2022-9999: CVSS 7.5 × activo bajo (1.0) × sin exploit (0.8) = 6.0 → Semana próxima

---

### 📖 Registro de vulnerabilidades (tracking)

Cada vulnerabilidad debe rastrearse con estos campos mínimos:

| Campo | Descripción |
|---|---|
| CVE ID | Identificador único (CVE-YYYY-NNNNN) |
| CVSS base | Puntuación del NVD |
| CVSS temporal | Calculada con madurez del exploit y parche disponible |
| Sistema afectado | Hostname, IP, servicio |
| Criticidad del activo | Bajo / Medio / Alto / Crítico |
| Fecha de detección | Inicio del SLA |
| SLA deadline | Fecha límite según severidad |
| Estado | Abierto / En progreso / Mitigado / Cerrado |
| Fecha de cierre | Para calcular MTTR |
| MTTR real | días entre detección y cierre |

---

### 📖 Reporte ejecutivo

Un dashboard de seguridad para dirección debe incluir:

1. **Tendencia de vulnerabilidades abiertas** (gráfico de líneas, 90 días)
2. **Distribución por severidad** (donut chart: Critical / High / Medium / Low)
3. **SLA compliance %** por severidad (semáforo: verde ≥95%, amarillo 80–94%, rojo <80%)
4. **Top 5 riesgos activos** con CVE, activo, CVSS y SLA deadline
5. **Velocidad de remediación** (vulnerabilidades cerradas por semana)
6. **MTTR promedio** por severidad vs. objetivo

La narrativa del reporte debe responder: ¿mejoramos o empeoramos respecto al mes anterior?

---

### 📋 Lo que debes recordar
* CVSS base mide la severidad técnica intrínseca; no mide el riesgo en tu entorno
* Una CVE en el CISA KEV catalog se remedia urgente sin importar su CVSS
* El SLA comienza en la detección, no en la asignación
* MTTR = tiempo promedio entre detección y cierre de vulnerabilidades
* El riesgo real = CVSS temporal × criticidad del activo × explotabilidad

### 🧪 Autoevaluación
1. Un vector CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N tiene puntuación aproximada de 5.9 (Medium). ¿Qué significan AV:N y AC:H en términos operacionales?
2. Tienes una CVE con CVSS base 6.8 (Medium) que aparece en el CISA KEV catalog. ¿Cuál es tu SLA de remediación?
3. ¿Por qué la puntuación temporal puede ser más baja que la puntuación base de la misma CVE?

---

1. AV:N significa que la vulnerabilidad es explotable remotamente a través de la red. AC:H significa que el ataque requiere condiciones especiales difíciles de reproducir (configuración específica, race condition, etc.), lo que reduce la probabilidad de explotación exitosa.
2. 24 horas. Cualquier CVE presente en el KEV catalog se trata como Critical independientemente de su CVSS, porque tiene explotación activa confirmada en entornos reales.
3. La puntuación temporal disminuye cuando existe un parche oficial disponible (Remediation Level: Official Fix), cuando no hay exploit público conocido (Exploit Code Maturity: Unproven) o cuando la vulnerabilidad no ha sido confirmada de forma independiente (Report Confidence: Unknown). Estos factores reducen la urgencia práctica aunque la vulnerabilidad técnica permanezca igual.
`

export default content
