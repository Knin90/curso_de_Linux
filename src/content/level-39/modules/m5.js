const content = `
## Módulo 5 — Evaluación de troubleshooting I: fallos de servicio y de red

### 🎯 Objetivos de aprendizaje

* Diagnosticar fallos de servicio a partir de logs y salidas de comando reales, sin acceso al código fuente.
* Aplicar un método sistemático de troubleshooting bajo presión de tiempo.
* Diferenciar síntomas de causas raíz en incidentes de red.
* Comunicar un diagnóstico de forma clara y accionable (como se espera en un reporte de incidente real).

### ❓ El problema real

En este bloque no hay preguntas de opción múltiple: hay incidentes. Cada escenario entrega la evidencia que un administrador real recibiría (una alerta, una salida de comando, un fragmento de log) y exige un diagnóstico completo: síntoma, hipótesis, verificación, causa raíz y corrección. Adivinar la causa sin verificarla con evidencia se considera una respuesta incompleta, aunque la conclusión final sea correcta.

### 📖 Incidente 1 — Servicio web caído intermitentemente

**Evidencia:**

\`\`\`bash
$ systemctl status api.service
● api.service - API Backend
   Active: active (running) since 08:00:00
$ curl -I http://localhost:3000/health
curl: (7) Failed to connect to localhost port 3000: Connection refused

$ journalctl -u api.service --since "5 min ago" | tail -20
Aug 14 09:41:02 srv1 node[2210]: FATAL: heap out of memory
Aug 14 09:41:03 srv1 systemd[1]: api.service: Main process exited, code=killed, status=9/KILL
Aug 14 09:41:03 srv1 systemd[1]: api.service: Scheduled restart job, restart counter is at 12.
Aug 14 09:41:04 srv1 systemd[1]: Started api.service.
\`\`\`

*Tarea:* diagnosticar por qué \`systemctl status\` muestra "active (running)" mientras el health check falla, identificar la causa raíz del crash loop y proponer una corrección de corto plazo y una de fondo.

### 📖 Incidente 2 — Timeout intermitente entre dos servidores

**Evidencia:**

\`\`\`bash
$ mtr -rw 10.0.5.20
HOST: srv-app                    Loss%   Snt   Last   Avg  Best  Wrst StDev
  1. gw-rack3                      0.0%    50    0.4   0.5   0.3   1.1   0.1
  2. core-switch                   0.0%    50    0.6   0.7   0.4   2.0   0.2
  3. 10.0.5.20                    38.0%    50   42.1  55.3  12.0 210.4  38.7
\`\`\`

*Tarea:* interpretar la pérdida de paquetes concentrada en el último salto (no en los intermedios) y descartar hipótesis de red core vs. problema del host o interfaz destino.

### 📖 Incidente 3 — Certificado TLS expirado detectado tarde

**Evidencia:**

\`\`\`bash
$ curl -v https://api.miempresa.com 2>&1 | grep -i expire
* SSL certificate problem: certificate has expired
$ openssl x509 -in /etc/ssl/certs/api.crt -noout -enddate
notAfter=Aug 10 23:59:59 2026 GMT
\`\`\`

*Tarea:* explicar por qué esto no debería haber llegado a producción sin alerta previa, y diseñar un control preventivo (monitoreo de expiración con alerta a 30/15/7 días, renovación automática con certbot).

### 📖 Incidente 4 — Base de datos rechaza conexiones nuevas

**Evidencia:**

\`\`\`bash
$ psql -h db1 -U app -d prod
psql: error: connection to server failed: FATAL: too many connections for role "app"
$ ss -tn | grep :5432 | wc -l
187
\`\`\`

*Tarea:* diagnosticar si el problema es un límite de conexiones mal dimensionado, un connection leak en la aplicación, o ambos, y qué evidencia adicional se necesita para diferenciarlos (histórico de conexiones a lo largo del día, revisión de pool de conexiones de la app).

### 📖 Incidente 5 — DNS interno resuelve nombres antiguos tras migración

**Evidencia:**

\`\`\`bash
$ dig api.internal +short
10.0.1.15   # IP antigua, el servicio migró a 10.0.2.30

$ dig api.internal +short @8.8.8.8
;; connection timed out
\`\`\`

*Tarea:* explicar el rol del TTL de DNS en este síntoma y por qué "esperar" no siempre es la única opción (flush de caché local, verificar TTL configurado antes de la migración).

### 📋 Rúbrica de evaluación — Troubleshooting I

| Criterio | Insuficiente | Aceptable | Sólido |
|---|---|---|---|
| Método de diagnóstico | Salta directo a una solución sin verificar hipótesis | Verifica hipótesis pero de forma desordenada | Sigue síntoma → hipótesis → verificación → causa raíz de forma explícita |
| Uso de evidencia | Ignora datos entregados en el escenario | Usa parte de la evidencia disponible | Usa toda la evidencia relevante y señala qué falta si aplica |
| Distinción síntoma/causa | Confunde el síntoma con la causa raíz | Identifica la causa raíz con ayuda | Identifica la causa raíz de forma autónoma y la distingue explícitamente del síntoma |
| Propuesta de corrección | Solo corrige el síntoma inmediato | Corrige el síntoma y menciona una causa de fondo | Propone corrección inmediata y medida preventiva de fondo |

**Criterio de aprobación:** mínimo "Aceptable" en los 4 criterios, con al menos 3 en "Sólido" para considerar el bloque dominado a nivel profesional.

### 📋 Lo que debes recordar

* "active (running)" en systemd no garantiza que el servicio responda correctamente — siempre validar con un health check funcional.
* La pérdida de paquetes concentrada en el último salto de un traceroute apunta al host o interfaz destino, no al tránsito de red.
* Un certificado TLS expirado en producción es una falla de monitoreo preventivo, no solo un problema técnico puntual.
* El TTL de DNS explica por qué un cambio de IP no se refleja inmediatamente en todos los resolutores.

### 🧪 Autoevaluación

1. En el Incidente 1, ¿por qué \`systemctl status\` mostraba "active (running)" mientras el servicio no respondía?
2. En el Incidente 2, ¿qué patrón en la salida de \`mtr\` indica que el problema está en el host destino y no en la red intermedia?
3. ¿Qué medida preventiva evita que el Incidente 3 (certificado expirado) se repita?

---

1. Porque systemd reinicia automáticamente el proceso tras cada crash (crash loop), así que en el instante de la consulta el proceso estaba efectivamente "running" — pero acababa de reiniciar tras un OOM (heap out of memory) y aún no había terminado de inicializar para aceptar conexiones, o volvería a caer segundos después. El estado de systemd refleja el proceso, no la salud funcional del servicio.
2. La pérdida de paquetes (38%) aparece recién en el último salto (el destino, 10.0.5.20) mientras los saltos intermedios (gateway, core switch) muestran 0% de pérdida. Esto descarta problemas de la red de tránsito y apunta a saturación, filtrado o problema de interfaz en el propio host o segmento destino.
3. Monitoreo activo de expiración de certificados con alertas escalonadas (30/15/7 días antes del vencimiento) más renovación automática (por ejemplo, certbot con renovación vía cron/systemd timer), de forma que la renovación ocurra sin depender de que un humano lo recuerde.
`

export default content
