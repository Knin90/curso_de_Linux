const content = `
## Módulo 6 — Análisis de tiempos y dependencias de arranque

### 🎯 Objetivos de aprendizaje

* Medir de forma precisa los tiempos de ejecución del proceso de arranque.
* Localizar servicios bloqueantes o lentos que retrasan la disponibilidad del sistema.
* Exportar e interpretar diagramas de flujo de carga.

### 📖 Explicación técnica: Medición de rendimiento en el arranque

Para optimizar un servidor o diagnosticar retrasos, \`systemd\` analiza el tiempo transcurrido en cada una de las capas de software mediante el comando \`systemd-analyze\`.

\`\`\`text
  [ Firmware ] ──► [ Loader (GRUB) ] ──► [ Kernel ] ──► [ Initrd ] ──► [ Userspace ]
  ├────────────────────────────────────────────────────────────────────────────────┤
  │                            Medido por systemd-analyze                          │
\`\`\`

### 💻 Comandos de auditoría de tiempos

#### 1. Resumen global del tiempo de arranque:

\`\`\`bash
systemd-analyze
\`\`\`

*Ejemplo de salida:*

\`\`\`text
Startup finished in 1.214s (firmware) + 2.102s (loader) + 1.890s (kernel) + 2.450s (initrd) + 6.120s (userspace) = 13.776s
graphical.target reached after 6.110s in userspace.
\`\`\`

#### 2. Listar los servicios más lentos ordenados por tiempo de ejecución:

\`\`\`bash
systemd-analyze blame
\`\`\`

#### 3. Identificar la cadena crítica (servicios que bloquean a otros):

\`\`\`bash
systemd-analyze critical-chain
\`\`\`

#### 4. Exportar un diagrama de Gantt en formato SVG:

\`\`\`bash
systemd-analyze plot > arranque_analisis.svg
\`\`\`

*(Puedes abrir el archivo \`.svg\` generado en cualquier navegador web para ver una representación gráfica de la secuencia de arranque).*

### 📋 Lo que debes recordar

* **Qué hace:** Diagnostica retrasos y mide el rendimiento del proceso de carga del sistema.
* **Comandos clave:**
  * \`systemd-analyze\` (totales por capa).
  * \`systemd-analyze blame\` (lista de servicios lentos).
  * \`systemd-analyze critical-chain\` (árbol de dependencias bloqueantes).
* **Diagnóstico:** Permite detectar servicios que esperan innecesariamente por respuestas de red durante el arranque.

### 🧪 Autoevaluación rápida

1. ¿Qué comando muestra los servicios del sistema ordenados estrictamente por el tiempo que tardaron en iniciar?
2. ¿Por qué un servicio listado en \`systemd-analyze blame\` puede no ser necesariamente el causante del retraso del arranque total?
3. ¿Cómo puedes visualizar gráficamente la cascada completa del arranque de tu servidor?

---

1. \`systemd-analyze blame\`.
2. Porque un servicio puede tardar en cargar pero ejecutarse en paralelo sin bloquear la llegada al Target final. Para verificar bloqueos reales se usa \`critical-chain\`.
3. Generando una imagen SVG con \`systemd-analyze plot > archivo.svg\`.
`

export default content
