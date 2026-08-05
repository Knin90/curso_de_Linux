const content = `
## Módulo 8 — Laboratorio integrador: despliegue profesional de un servicio

### 🎯 Objetivos de aprendizaje

* Desplegar un servicio completo siguiendo el flujo profesional de producción.
* Crear una unidad \`.service\` personalizada desde cero.
* Aplicar el checklist de troubleshooting ante un fallo introducido deliberadamente.

### 🏢 Escenario: servidor de sincronización de tiempo en producción

Eres el administrador de un servidor recién instalado. La sincronización de tiempo es crítica para logs, certificados SSL y coordinación de bases de datos distribuidas. Debes:

1. Instalar chrony como demonio de sincronización NTP.
2. Asegurarte de que sobrevive a reinicios.
3. Monitorear sus logs en tiempo real.
4. Crear una unidad personalizada para un script de salud del sistema.
5. Diagnosticar un fallo introducido deliberadamente.

---

### 🧪 Fase 1: Instalación y arranque de chrony

\`\`\`bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y chrony

# RHEL/Fedora
sudo dnf install -y chrony

# Ver el archivo de unidad que instaló el paquete
systemctl cat chronyd

# Habilitar y arrancar en un solo paso
sudo systemctl enable --now chronyd

# Verificar estado completo
sudo systemctl status chronyd
\`\`\`

**Resultado esperado:**
\`\`\`text
● chrony.service - chrony, an NTP client/server
     Loaded: loaded (/usr/lib/systemd/system/chrony.service; enabled; ...)
     Active: active (running) since ...
\`\`\`

Confirmar dos datos:
- \`Loaded: ... enabled\` → sobrevivirá al reinicio
- \`Active: active (running)\` → está funcionando ahora

---

### 🧪 Fase 2: Monitoreo de logs en tiempo real

En una terminal, iniciar monitoreo en vivo:

\`\`\`bash
journalctl -u chronyd -f
\`\`\`

En otra terminal, reiniciar el servicio para ver el evento:

\`\`\`bash
sudo systemctl restart chronyd
\`\`\`

Observar en la primera terminal cómo aparecen los mensajes de parada y arranque en tiempo real.

\`\`\`bash
# Verificar sincronización con los servidores NTP
chronyc tracking

# Ver las fuentes de tiempo
chronyc sources -v
\`\`\`

---

### 🧪 Fase 3: Crear una unidad personalizada

Crear un script de verificación de salud del sistema y registrarlo como servicio oneshot:

\`\`\`bash
# 1. Crear el script
sudo tee /usr/local/bin/health-check.sh <<'EOF'
#!/bin/bash
echo "=== Health Check $(date) ==="
echo "Uptime: $(uptime -p)"
echo "Disk usage: $(df -h / | tail -1 | awk '{print $5}')"
echo "Memory free: $(free -h | awk '/^Mem:/{print $4}')"
echo "Load average: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"
EOF

sudo chmod +x /usr/local/bin/health-check.sh

# 2. Crear la unidad de servicio
sudo tee /etc/systemd/system/health-check.service <<'EOF'
[Unit]
Description=System Health Check
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/health-check.sh
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 3. Recargar systemd y probar
sudo systemctl daemon-reload
sudo systemctl start health-check
sudo systemctl status health-check

# 4. Ver la salida en el journal
journalctl -u health-check -n 20
\`\`\`

---

### 🧪 Fase 4: Diagnóstico de un fallo deliberado

Introducir un error en la configuración de chrony para practicar troubleshooting:

\`\`\`bash
# Hacer copia de seguridad de la configuración
sudo cp /etc/chrony.conf /etc/chrony.conf.bak

# Introducir un error deliberado
sudo sed -i 's/^server/invalid_directive/' /etc/chrony.conf

# Intentar reiniciar — fallará
sudo systemctl restart chronyd
\`\`\`

**Aplicar el flujo de diagnóstico:**

\`\`\`bash
# Paso 1: ¿Qué dice el estado?
sudo systemctl status chronyd

# Paso 2: ¿Cuál fue el último mensaje del proceso?
journalctl -u chronyd -n 20 --no-pager

# Paso 3: ¿Hay un validador de configuración?
chronyd -Q  # test de configuración de chrony

# Paso 4: Ver exactamente la línea con error
grep "invalid_directive" /etc/chrony.conf

# Paso 5: Restaurar la configuración correcta
sudo cp /etc/chrony.conf.bak /etc/chrony.conf

# Paso 6: Resetear el contador de fallos y arrancar
sudo systemctl reset-failed chronyd
sudo systemctl start chronyd
sudo systemctl status chronyd
\`\`\`

---

### 🧪 Fase 5: Verificación final completa

\`\`\`bash
# ¿Está corriendo?
systemctl is-active chronyd

# ¿Arrancará al reiniciar?
systemctl is-enabled chronyd

# ¿Qué target lo activa?
systemctl show chronyd -p WantedBy

# ¿Cuánto tiempo lleva corriendo?
systemctl show chronyd -p ActiveEnterTimestamp

# Ver historial de arranques y paradas del servicio
journalctl -u chronyd --since today
\`\`\`

---

### 📋 Tabla resumen de herramientas del Nivel 6

| Herramienta | Función |
| --- | --- |
| \`systemctl status\` | Estado actual + últimos logs del servicio |
| \`systemctl start\` | Arrancar servicio ahora (volátil) |
| \`systemctl stop\` | Detener servicio |
| \`systemctl restart\` | Matar y recrear el proceso (corta conexiones) |
| \`systemctl reload\` | Recargar config sin cortar conexiones |
| \`systemctl enable\` | Persistencia en el arranque |
| \`systemctl disable\` | Quitar persistencia |
| \`systemctl enable --now\` | Persistencia + arranque inmediato |
| \`systemctl mask\` | Bloqueo total del servicio |
| \`systemctl is-active\` | ¿Está corriendo? (para scripts) |
| \`systemctl is-enabled\` | ¿Arranca al boot? (para scripts) |
| \`systemctl daemon-reload\` | Recargar definición de unidades tras cambios |
| \`systemctl reset-failed\` | Resetear contador de intentos fallidos |
| \`systemctl list-units\` | Listar unidades activas |
| \`systemctl list-dependencies\` | Ver árbol de dependencias |
| \`systemctl get-default\` | Ver target de arranque por defecto |
| \`systemctl set-default\` | Cambiar target por defecto |
| \`systemctl cat\` | Ver el archivo .service de una unidad |
| \`systemd-analyze blame\` | Ver tiempos de arranque por servicio |
| \`journalctl -u\` | Logs de un servicio específico |
| \`journalctl -u -f\` | Logs en tiempo real |
| \`journalctl -p err\` | Solo errores del sistema |
| \`journalctl -b -1\` | Logs del arranque anterior |
| \`journalctl --vacuum-time\` | Limpiar logs antiguos |
`
export default content
