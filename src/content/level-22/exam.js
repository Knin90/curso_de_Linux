const exam = [
  {
    q: "¿Qué clave nunca debe abandonar el servidor en criptografía asimétrica?",
    options: ["La clave privada", "La clave pública", "El certificado X.509", "El número de serie"],
    correct: 0,
  },
  {
    q: "¿Qué campo del certificado X.509 usan los navegadores modernos para validar el hostname?",
    options: ["El Serial Number", "El SAN (Subject Alternative Name)", "El CN únicamente", "El Issuer"],
    correct: 1,
  },
  {
    q: "¿Cuál es el orden correcto de la cadena de confianza jerárquica?",
    options: ["Intermediate CA → Root CA → Leaf", "Leaf → Root CA → Intermediate CA", "Root CA → Intermediate CA → Leaf", "Leaf → Intermediate CA → Root CA"],
    correct: 2,
  },
  {
    q: "¿Por qué la clave privada de una Root CA suele mantenerse en un HSM desconectado de internet?",
    options: ["Porque acelera el handshake TLS", "Porque lo exige el formato PEM", "Para reducir el tamaño del certificado", "Para proteger el eslabón más valioso de la cadena de confianza"],
    correct: 3,
  },
  {
    q: "Un certificado auto-firmado se caracteriza porque:",
    options: ["El Subject y el Issuer son el mismo", "Su validez máxima es de 90 días", "Tiene una CA intermedia obligatoria", "Nunca puede usarse en desarrollo"],
    correct: 0,
  },
  {
    q: "¿Qué comando regenera el bundle de CAs tras añadir una CA personalizada en Debian/Ubuntu?",
    options: ["update-ca-trust", "update-ca-certificates", "certbot renew", "openssl verify"],
    correct: 1,
  },
  {
    q: "¿Qué algoritmo de clave se recomienda hoy por ser más rápido y usar claves más cortas que RSA con igual seguridad?",
    options: ["DSA", "MD5", "ECDSA", "3DES"],
    correct: 2,
  },
  {
    q: "¿Qué contiene una CSR (Certificate Signing Request)?",
    options: ["El certificado ya firmado por la CA", "La lista de certificados revocados", "La clave privada cifrada", "La clave pública y los datos de identidad del solicitante"],
    correct: 3,
  },
  {
    q: "¿Qué comando muestra el contenido completo y legible de un certificado?",
    options: ["openssl x509 -text -noout -in cert.crt", "openssl genrsa -out cert.crt", "openssl req -new -key cert.key", "openssl pkcs12 -export -in cert.crt"],
    correct: 0,
  },
  {
    q: "¿Qué comando prueba una conexión TLS y muestra la cadena de certificados recibida?",
    options: ["openssl verify", "openssl s_client -connect host:443", "openssl req -x509", "openssl rsa -check"],
    correct: 1,
  },
  {
    q: "¿Qué formato empaqueta certificado, clave privada y cadena en un solo archivo binario protegido con contraseña?",
    options: ["PEM", "DER", "PKCS#12", "CSR"],
    correct: 2,
  },
  {
    q: "¿Cómo se verifica que una clave privada corresponde a un certificado dado?",
    options: ["Comparando el número de serie del certificado", "Ejecutando openssl s_client", "Comparando la fecha de expiración", "Comparando el hash MD5 de sus módulos"],
    correct: 3,
  },
  {
    q: "¿Qué protocolo usa Let's Encrypt para automatizar la validación de dominio y emisión de certificados?",
    options: ["ACME", "TLS 1.3", "SPF", "OCSP"],
    correct: 0,
  },
  {
    q: "¿Qué desafío de certbot requiere que el puerto 80 sea accesible desde internet?",
    options: ["DNS-01", "HTTP-01", "TLS-ALPN", "mTLS"],
    correct: 1,
  },
  {
    q: "¿Qué desafío es el único que soporta certificados wildcard?",
    options: ["HTTP-01", "Standalone", "DNS-01", "Webroot"],
    correct: 2,
  },
  {
    q: "¿Qué hace el modo certbot certonly --standalone?",
    options: ["Usa el servidor web existente sin interrupción", "Requiere un plugin DNS", "Solo funciona con certificados wildcard", "Levanta un servidor HTTP temporal propio en el puerto 80"],
    correct: 3,
  },
  {
    q: "¿Qué archivo debe configurarse en nginx para servir la cadena completa emitida por certbot?",
    options: ["fullchain.pem", "privkey.pem", "chain.pem", "cert.pem"],
    correct: 0,
  },
  {
    q: "¿Qué comando simula la renovación sin modificar archivos ni consumir cuota de producción?",
    options: ["certbot delete", "certbot renew --dry-run", "certbot revoke", "certbot renew --force-renewal"],
    correct: 1,
  },
  {
    q: "¿Cada cuánto se ejecuta el certbot.timer de systemd por defecto?",
    options: ["Una vez por semana", "Una vez al mes", "Dos veces al día", "Cada hora"],
    correct: 2,
  },
  {
    q: "¿Qué hook de certbot se ejecuta SOLO cuando la renovación fue exitosa?",
    options: ["--pre-hook", "--post-hook", "--dry-run", "--deploy-hook"],
    correct: 3,
  },
  {
    q: "¿En qué directorio se colocan hooks persistentes de renovación exitosa?",
    options: ["/etc/letsencrypt/renewal-hooks/deploy/", "/etc/letsencrypt/live/", "/etc/letsencrypt/archive/", "/etc/ssl/CA/"],
    correct: 0,
  },
  {
    q: "¿Qué archivo almacena la configuración de renovación de un certificado específico?",
    options: ["/etc/ssl/certs/ca-certificates.crt", "/etc/letsencrypt/renewal/dominio.conf", "/etc/nginx/nginx.conf", "/etc/letsencrypt/live/dominio/cert.pem"],
    correct: 1,
  },
  {
    q: "¿Qué opción de openssl x509 permite comprobar en un script si un certificado expira en menos de 30 días?",
    options: ["-modulus", "-fingerprint", "-checkend 2592000", "-issuer"],
    correct: 2,
  },
  {
    q: "¿Qué comando fuerza la renovación de un certificado específico sin esperar a los 30 días?",
    options: ["certbot certificates", "certbot delete --cert-name dominio", "certbot renew --dry-run", "certbot renew --force-renewal --cert-name dominio"],
    correct: 3,
  },
  {
    q: "¿Qué añade mTLS al handshake TLS estándar?",
    options: ["La verificación de un certificado presentado por el cliente", "Cifrado simétrico adicional", "Un segundo puerto de escucha", "La firma de la Root CA en cada petición"],
    correct: 0,
  },
  {
    q: "¿Qué campo del Extended Key Usage debe tener un certificado de cliente para mTLS?",
    options: ["serverAuth", "clientAuth", "codeSigning", "timeStamping"],
    correct: 1,
  },
  {
    q: "¿Qué directiva de nginx define la CA que firma los certificados de cliente en mTLS?",
    options: ["ssl_certificate", "ssl_crl", "ssl_client_certificate", "ssl_protocols"],
    correct: 2,
  },
  {
    q: "¿Qué valor de ssl_verify_client permite decidir en la aplicación si se exige o no el certificado de cliente?",
    options: ["on", "off", "strict", "optional"],
    correct: 3,
  },
  {
    q: "¿Qué variable de nginx indica si el certificado de cliente fue verificado con éxito?",
    options: ["$ssl_client_verify", "$ssl_protocol", "$ssl_session_id", "$ssl_client_serial"],
    correct: 0,
  },
  {
    q: "¿Qué flags de curl se usan para presentar un certificado de cliente en mTLS?",
    options: ["--insecure y --http2", "--cert y --key", "--user y --pass", "--resolve y --connect-to"],
    correct: 1,
  },
  {
    q: "¿Qué significa Verify return code: 0 (ok) en la salida de openssl s_client?",
    options: ["El certificado está expirado", "El servidor no tiene certificado", "La cadena de confianza es válida", "Hay un error de hostname"],
    correct: 2,
  },
  {
    q: "¿Qué código de verificación de openssl s_client indica que el hostname no coincide?",
    options: ["10", "18", "20", "62"],
    correct: 3,
  },
  {
    q: "Un sitio funciona en Chrome pero falla en curl con error de cadena. ¿Cuál es la causa más probable?",
    options: ["La cadena está incompleta y Chrome descarga la intermedia vía AIA", "El certificado es auto-firmado", "El navegador ignora TLS 1.3", "curl no soporta HTTPS"],
    correct: 0,
  },
  {
    q: "¿Qué herramienta audita protocolos, cipher suites y vulnerabilidades conocidas como Heartbleed o POODLE?",
    options: ["certbot", "testssl.sh", "update-ca-certificates", "openssl genpkey"],
    correct: 1,
  },
  {
    q: "¿Dónde aparecen los errores SSL de nginx en producción?",
    options: ["/var/log/letsencrypt/letsencrypt.log", "/etc/ssl/CA/index.txt", "/var/log/nginx/error.log", "/etc/letsencrypt/renewal/"],
    correct: 2,
  },
  {
    q: "¿Qué comando de nmap enumera los cipher suites aceptados por un servidor?",
    options: ["nmap -sV", "nmap -p 80", "nmap --traceroute", "nmap --script ssl-enum-ciphers -p 443"],
    correct: 3,
  },
  {
    q: "¿Qué comando crea el certificado auto-firmado de una Root CA propia?",
    options: ["openssl req -x509 -new -key ca.key -out ca.crt", "openssl s_client -connect ca:443", "certbot certonly --standalone", "openssl pkcs12 -export"],
    correct: 0,
  },
  {
    q: "¿Qué archivo de la CA lleva el registro de todos los certificados emitidos?",
    options: ["serial", "index.txt", "crlnumber", "ca.key"],
    correct: 1,
  },
  {
    q: "¿Qué comando de openssl gestiona automáticamente la firma, el index.txt y el número de serie?",
    options: ["openssl x509 -req", "openssl genrsa", "openssl ca -config openssl.cnf", "openssl verify"],
    correct: 2,
  },
  {
    q: "¿Qué es una CRL en el contexto de una CA propia?",
    options: ["Una clave privada cifrada", "Un tipo de certificado wildcard", "Un formato de exportación PKCS#12", "Una lista de certificados revocados"],
    correct: 3,
  },
  {
    q: "¿Qué comando distribuye la CA raíz al almacén de confianza en RHEL/CentOS?",
    options: ["update-ca-trust", "update-ca-certificates", "certbot certificates", "openssl ca -gencrl"],
    correct: 0,
  },
  {
    q: "¿Por qué se recomienda usar CA propia en lugar de Let's Encrypt para servicios internos?",
    options: ["Porque Let's Encrypt no soporta HTTPS", "Porque los certificados de CA propia no requieren validación pública del dominio y no tienen límite de tasa", "Porque CA propia es más barata para dominios públicos", "Porque Let's Encrypt no permite renovación automática"],
    correct: 1,
  },
  {
    q: "¿Con qué permisos debe protegerse la clave privada de la CA raíz?",
    options: ["777", "644", "400", "666"],
    correct: 2,
  },
  {
    q: "¿Por qué se usa una Intermediate CA en lugar de firmar todo directamente con la Root CA?",
    options: ["Porque acelera el handshake TLS", "Porque la Root CA no puede firmar certificados", "Porque los navegadores lo exigen por ley", "Para poder revocarla sin invalidar la Root CA si se compromete"],
    correct: 3,
  },
  {
    q: "¿Qué restricción impone pathlen:0 en el certificado de una Intermediate CA?",
    options: ["Que no puede crear CAs subordinadas adicionales", "Que no puede firmar ningún certificado", "Que solo puede firmar certificados de cliente", "Que su validez máxima es de 30 días"],
    correct: 0,
  },
  {
    q: "¿En qué orden deben concatenarse los certificados al construir un fullchain.crt?",
    options: ["Root CA primero, luego el leaf", "Primero el leaf, luego las CAs intermedias", "Orden alfabético por Common Name", "No importa el orden"],
    correct: 1,
  },
  {
    q: "¿Qué comando verifica la cadena completa de un certificado de servidor contra la Root CA usando una Intermediate CA no confiable directamente?",
    options: ["openssl x509 -text -noout -in server.crt", "openssl req -new -key server.key", "openssl verify -CAfile root.crt -untrusted intermediate.crt server.crt", "openssl s_client -connect server:443"],
    correct: 2,
  },
  {
    q: "En la configuración de nginx del proyecto, ¿qué directiva impone que el cliente presente un certificado válido?",
    options: ["ssl_prefer_server_ciphers off", "add_header Strict-Transport-Security", "ssl_protocols TLSv1.2 TLSv1.3", "ssl_verify_client on"],
    correct: 3,
  },
  {
    q: "¿Qué logra ejecutar update-ca-certificates tras copiar la Root CA al sistema?",
    options: ["Que los clientes del sistema operativo confíen en la CA sin flags adicionales como --cacert", "Renovar automáticamente todos los certificados", "Revocar certificados comprometidos", "Generar una nueva CSR"],
    correct: 0,
  },
  {
    q: "¿Qué campo de un certificado de servidor moderno reemplaza al CN para la validación de hostname por parte de los navegadores?",
    options: ["El Serial Number", "El Subject Alternative Name (SAN)", "El Issuer", "El Key Usage"],
    correct: 1,
  },
]

export default exam
