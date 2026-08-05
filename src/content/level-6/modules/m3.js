const content = `
## Módulo 3 — Enable vs Start: persistencia en el arranque

### 🎯 Objetivos de aprendizaje

* Entender la diferencia fundamental entre \`start\` y \`enable\`.
* Saber qué sucede internamente cuando se habilita un servicio.
* Conocer \`enable --now\`, \`mask\` y cuándo usarlos.

### ❓ El error más común en producción

Un administrador instala nginx, ejecuta \`systemctl start nginx\`, prueba que la web responde y cierra la sesión. A las 3 AM el servidor se reinicia por un corte de electricidad. La web lleva horas caída. La causa: nunca ejecutó \`enable\`.

\`\`\`text
  systemctl start nginx
  ────────────────────────────────────────────────
  ¿Qué hace?  Arranca el proceso nginx ahora mismo
  ¿Dónde?     Solo en la RAM (estado volátil)
  ¿Persiste?  NO — al reiniciar, nginx no arranca
  Afecta a:   Active: active (running)

  systemctl enable nginx
  ────────────────────────────────────────────────
  ¿Qué hace?  Crea un enlace simbólico en disco
  ¿Dónde?     /etc/systemd/system/multi-user.target.wants/
  ¿Persiste?  SÍ — nginx arrancará en cada boot
  Afecta a:   Loaded: enabled
\`\`\`

### 📖 Qué hace enable internamente

\`\`\`bash
sudo systemctl enable nginx
# Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service
#   → /usr/lib/systemd/system/nginx.service.
\`\`\`

systemd crea un **enlace simbólico** en el directorio del target predeterminado. En el próximo arranque, cuando systemd active el target \`multi-user\`, encontrará ese enlace y arrancará nginx automáticamente.

\`\`\`bash
# Verificar el enlace creado
ls -la /etc/systemd/system/multi-user.target.wants/ | grep nginx
# lrwxrwxrwx ... nginx.service → /usr/lib/systemd/system/nginx.service
\`\`\`

### 💻 Los comandos de persistencia

\`\`\`bash
# Habilitar (persistencia) — no arranca ahora
sudo systemctl enable nginx

# Deshabilitar (quitar persistencia) — no detiene si está corriendo
sudo systemctl disable nginx

# Habilitar Y arrancar en un solo paso (el más usado en producción)
sudo systemctl enable --now nginx

# Deshabilitar Y detener en un solo paso
sudo systemctl disable --now nginx

# Verificar si está habilitado
systemctl is-enabled nginx
# enabled / disabled / masked / static
\`\`\`

### 📖 El estado "static"

Algunos servicios muestran \`static\` en lugar de \`enabled\` o \`disabled\`:

\`\`\`text
  static = el servicio no tiene sección [Install] en su .service
           no puede habilitarse/deshabilitarse
           solo puede ser iniciado como dependencia de otro servicio
           o manualmente con start
\`\`\`

### 📖 mask: bloqueo total

\`mask\` va más allá de \`disable\`. Crea un enlace simbólico apuntando a \`/dev/null\`, haciendo imposible que el servicio arranque — incluso manualmente, incluso como dependencia de otro.

\`\`\`bash
# Bloquear totalmente un servicio
sudo systemctl mask apache2

# Intentar arrancarlo falla con:
# Failed to start apache2.service: Unit apache2.service is masked.

# Desbloquear
sudo systemctl unmask apache2
\`\`\`

> **Cuándo usar mask:** cuando tienes dos servidores web en conflicto (nginx y apache2) y quieres asegurarte de que apache2 nunca arranque accidentalmente — ni por un error de script, ni por una dependencia, ni por ningún motivo.

### 📖 Regla de oro post-instalación

\`\`\`text
  Instalaste un servicio.
       │
       ▼
  ¿Debe arrancar automáticamente al reiniciar?
       │
     Sí ────────────► systemctl enable --now servicio
       │
     No ────────────► systemctl start servicio
                      (o no hagas nada si no necesitas que corra ahora)
\`\`\`

### 📋 Lo que debes recordar

* \`start\` = volátil (RAM). \`enable\` = persistente (disco).
* \`enable --now\` hace las dos cosas — úsalo por defecto en instalaciones de producción.
* \`is-enabled\` devuelve: \`enabled\`, \`disabled\`, \`masked\`, o \`static\`.
* \`mask\` bloquea totalmente un servicio — más fuerte que \`disable\`.

### 🧪 Autoevaluación rápida

1. Ejecutas \`systemctl start postgresql\` en un servidor de producción. El servidor se reinicia 6 horas después. ¿Está PostgreSQL corriendo?
2. ¿Qué archivo/directorio modifica \`systemctl enable\` en el disco?
3. ¿Cuál es la diferencia entre \`systemctl disable\` y \`systemctl mask\`?

---

1. **No.** \`start\` es volátil — el estado no sobrevive al reinicio. Debería haberse usado \`enable --now\`.
2. Crea un **enlace simbólico** en \`/etc/systemd/system/<target>.wants/\` apuntando al archivo \`.service\`.
3. \`disable\` quita la persistencia (el enlace simbólico). \`mask\` reemplaza el enlace con uno apuntando a \`/dev/null\`, haciendo imposible cualquier arranque del servicio — incluso manual.
`
export default content
