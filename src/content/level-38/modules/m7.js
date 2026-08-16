const content = `
## Módulo 7 — Observabilidad: logs, monitoreo y backups automatizados

### 🎯 Objetivos de aprendizaje

* Centralizar y rotar los logs de srv-prod01 con retención definida.
* Configurar monitoreo básico con Prometheus y Grafana sobre los servicios del proyecto.
* Automatizar backups diarios con systemd timers y verificarlos con una restauración de prueba.
* Definir umbrales de alerta razonables para disponibilidad y saturación de recursos.

### ❓ El problema real

srv-prod01 ya es seguro y estable, pero si algo falla a las 3 de la mañana, nadie se entera hasta que un usuario se queja. Los logs actuales crecen sin rotación dentro de \`lv_log\` (creado en el módulo 4) y eventualmente lo llenarán. No existe ningún backup: si el disco de datos falla, la aplicación y su configuración desaparecen sin posibilidad de recuperación. Este módulo cierra el pilar de disponibilidad definido en el módulo 1 dándole al servidor ojos (monitoreo), memoria persistente auditable (logs con retención) y una red de seguridad real (backups verificados).

### 📖 Rotación y retención de logs

\`\`\`text
# /etc/logrotate.d/srv-prod01
/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}

/var/www/srv-prod01/logs/*.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
    copytruncate
}
\`\`\`

\`\`\`bash
# Validar la configuración sin esperar al cron diario
logrotate -d /etc/logrotate.d/srv-prod01
logrotate -f /etc/logrotate.d/srv-prod01

ls /var/log/nginx/
# access.log  access.log.1.gz  error.log  error.log.1.gz
df -h /var/log
\`\`\`

\`\`\`text
LOG                          RETENCIÓN   RAZÓN
──────────────────────────────────────────────────────────────────────────
nginx access/error           14 días     suficiente para investigar incidentes recientes
aplicación (app-srv)         30 días     trazabilidad de negocio más larga que infraestructura
journald (systemd)           7 días      configurado con SystemMaxUse en journald.conf
auditd                       90 días     requisito de trazabilidad de seguridad del módulo 6
\`\`\`

\`\`\`text
# /etc/systemd/journald.conf.d/srv-prod01.conf
[Journal]
Storage=persistent
SystemMaxUse=1G
MaxRetentionSec=7day
\`\`\`

\`\`\`bash
systemctl restart systemd-journald
journalctl --disk-usage
\`\`\`

### 📖 Monitoreo básico con Prometheus y Grafana

\`\`\`bash
# node_exporter expone métricas de sistema (CPU, memoria, disco) de srv-prod01
useradd -r -s /usr/sbin/nologin node_exporter
# ... instalación del binario en /usr/local/bin/node_exporter ...
\`\`\`

\`\`\`text
# /etc/systemd/system/node_exporter.service
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter --web.listen-address=127.0.0.1:9100
Restart=on-failure

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
systemctl daemon-reload
systemctl enable --now node_exporter
curl -s http://127.0.0.1:9100/metrics | head -5
\`\`\`

\`\`\`text
# prometheus.yml (en el servidor de monitoreo, no necesariamente en srv-prod01)
scrape_configs:
  - job_name: 'srv-prod01'
    static_configs:
      - targets: ['srv-prod01:9100']
    scrape_interval: 15s
\`\`\`

\`\`\`text
MÉTRICA                        UMBRAL DE ALERTA         RAZÓN
──────────────────────────────────────────────────────────────────────────────
node_filesystem_avail_bytes    < 15% en /var/log o /var/www   margen antes de llenar el disco
node_load1 / cpu count          > 2.0 sostenido 5 min           saturación de CPU
up{job="srv-prod01"}            == 0 por > 1 min                servidor o exporter caído
probe_success (healthz)         == 0                             el healthcheck de app-srv falla
\`\`\`

Grafana se conecta a Prometheus como fuente de datos y visualiza estas métricas en un dashboard; el detalle de instalación de Grafana está fuera del alcance de este módulo, que se centra en que srv-prod01 exponga datos monitoreables correctamente.

### 📖 Backups automatizados con systemd timers

\`\`\`bash
# Script de backup: configuración + contenido de la aplicación + dump si hubiera base de datos
mkdir -p /opt/backups/srv-prod01
\`\`\`

\`\`\`text
#!/usr/bin/env bash
# /opt/backups/srv-prod01/backup.sh
set -euo pipefail

FECHA=\\$(date +%Y%m%d-%H%M)
DESTINO=/opt/backups/srv-prod01/backup-\\$FECHA.tar.gz

tar -czf "\\$DESTINO" \\
    /var/www/srv-prod01 \\
    /etc/nginx/conf.d/srv-prod01.conf \\
    /etc/systemd/system/app-srv.service

find /opt/backups/srv-prod01 -name 'backup-*.tar.gz' -mtime +7 -delete

echo "Backup completado: \\$DESTINO"
\`\`\`

\`\`\`bash
chmod +x /opt/backups/srv-prod01/backup.sh
\`\`\`

\`\`\`text
# /etc/systemd/system/srv-prod01-backup.service
[Unit]
Description=Backup diario de srv-prod01

[Service]
Type=oneshot
ExecStart=/opt/backups/srv-prod01/backup.sh

# /etc/systemd/system/srv-prod01-backup.timer
[Unit]
Description=Ejecutar backup de srv-prod01 diariamente

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
\`\`\`

\`\`\`bash
systemctl daemon-reload
systemctl enable --now srv-prod01-backup.timer
systemctl list-timers | grep srv-prod01
\`\`\`

### 📖 Verificación del backup: la parte que casi nadie hace

\`\`\`bash
# Ejecutar el backup manualmente para no esperar al cron
systemctl start srv-prod01-backup.service
ls -lh /opt/backups/srv-prod01/

# Restaurar en un directorio de prueba, NO sobre el original
mkdir -p /tmp/restore-test
tar -xzf /opt/backups/srv-prod01/backup-*.tar.gz -C /tmp/restore-test
diff -rq /tmp/restore-test/var/www/srv-prod01 /var/www/srv-prod01
# Sin diferencias = el backup contiene exactamente lo esperado
rm -rf /tmp/restore-test
\`\`\`

Un backup nunca verificado es una promesa, no una garantía. Este paso se marca en el checklist maestro (módulo 1) solo cuando la restauración de prueba se ejecutó y comparó contra el original con éxito.

### 📋 Lo que debes recordar

* La rotación de logs con \`logrotate\` protege el volumen \`lv_log\` de llenarse, con retención distinta según la criticidad de cada log.
* \`node_exporter\` expone métricas de srv-prod01 en \`127.0.0.1:9100\` para que Prometheus las recolecte; los umbrales de alerta se definen antes de necesitarlos, no durante un incidente.
* Los backups se automatizan con un systemd timer, no con cron, para aprovechar \`Persistent=true\` (recupera ejecuciones perdidas si el servidor estuvo apagado).
* Un backup solo cuenta como válido después de una restauración de prueba verificada, comparando el contenido restaurado contra el original.

### 🧪 Autoevaluación

1. ¿Por qué el log de la aplicación tiene una retención de 30 días mientras que el de nginx solo 14?
2. ¿Qué ventaja tiene \`Persistent=true\` en un systemd timer frente a un cron job tradicional para el backup diario?
3. Un backup se ejecuta correctamente todas las noches según los logs del timer. ¿Es eso suficiente para confiar en él? ¿Qué falta?

---

1. Porque el log de la aplicación tiene valor de trazabilidad de negocio (qué hizo cada usuario, qué transacciones ocurrieron) que suele necesitarse por más tiempo que los logs de infraestructura de nginx, que principalmente sirven para depurar problemas recientes de red o del proxy.
2. \`Persistent=true\` hace que systemd ejecute el timer perdido tan pronto el sistema vuelva a estar disponible, si el servidor estuvo apagado en el momento programado (por ejemplo, durante una ventana de mantenimiento a las 2 AM); un cron tradicional simplemente se salta esa ejecución sin recuperarla.
3. No es suficiente: que el backup se ejecute sin errores solo confirma que el script corrió, no que el contenido del archivo resultante sea restaurable y correcto. Falta la restauración de prueba en un directorio aislado y la comparación (\`diff\`) contra el contenido original para confirmar que el backup realmente sirve en un desastre real.
`

export default content
