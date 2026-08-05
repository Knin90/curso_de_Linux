const content = `
## Módulo 1 — ¿Qué es SSH y cómo funciona internamente?

### 🎯 Objetivos de aprendizaje

* Entender por qué SSH reemplazó a Telnet y rlogin.
* Conocer las 7 fases de una conexión SSH.
* Distinguir criptografía simétrica de asimétrica y el rol de cada una en SSH.

### ❓ El problema real

Gestionas 30 servidores usando contraseñas. Los logs muestran miles de intentos de fuerza bruta diarios. Si una contraseña se filtra, el atacante tiene control total. ¿La solución? Eliminar las contraseñas del protocolo y reemplazarlas con criptografía asimétrica.

### 📖 Antes de SSH: Telnet y rlogin

Telnet y rlogin transmitían todo en texto plano — incluyendo las contraseñas. Cualquier router o switch intermedio podía leer cada byte. SSH (Secure Shell, 1995) reemplazó ambos protocolos cifrando todo el tráfico desde el primer paquete.

### 📖 Las 7 fases de una conexión SSH

\`\`\`text
1. ESTABLECIMIENTO TCP
   El cliente abre conexión TCP al puerto 22 del servidor.

2. NEGOCIACIÓN DE ALGORITMOS
   Cliente y servidor intercambian listas de algoritmos soportados
   y acuerdan el conjunto más fuerte que ambos conocen.

3. INTERCAMBIO DE HOST KEY
   El servidor presenta su Host Key (identidad del servidor).
   El cliente verifica contra ~/.ssh/known_hosts.

4. DIFFIE-HELLMAN KEY EXCHANGE
   Se deriva una clave de sesión simétrica temporal sin transmitirla.
   Todo el tráfico posterior se cifra con esta clave.

5. AUTENTICACIÓN DEL USUARIO
   El servidor desafía al cliente. El cliente firma el desafío
   con su llave privada. El servidor verifica con la llave pública.
   La llave privada NUNCA viaja por la red.

6. APERTURA DE CANALES
   Se crean canales multiplexados para shell, comandos remotos,
   reenvío de puertos o transferencia de archivos.

7. SESIÓN
   El usuario opera la shell remota o ejecuta comandos.
\`\`\`

### 📖 Criptografía simétrica vs asimétrica en SSH

\`\`\`text
ASIMÉTRICA (par de llaves)          SIMÉTRICA (clave compartida)
─────────────────────────────       ──────────────────────────────
Usada en: fases 3 y 5               Usada en: fase 4 en adelante
Algoritmos: Ed25519, RSA            Algoritmos: AES-256, ChaCha20
Velocidad: lenta (operaciones       Velocidad: muy rápida
  matemáticas complejas)
Propósito: autenticación e          Propósito: cifrar el tráfico
  intercambio seguro de claves        de toda la sesión
\`\`\`

> SSH usa criptografía asimétrica para resolver el problema de distribución de claves, y luego cambia a simétrica para el tráfico de sesión porque es órdenes de magnitud más rápida.

### 📖 El desafío de autenticación (fase 5 en detalle)

\`\`\`text
SERVIDOR                                   CLIENTE
    │                                          │
    │── "Hola, ¿quién eres?"                  │
    │── Genera nonce (número aleatorio)         │
    │──────────────────────────────────────────▶│
    │                                          │
    │         El cliente firma el nonce         │
    │         con su llave PRIVADA              │
    │         (la llave privada NO sale del PC) │
    │                                          │
    │◀─ "Soy alice. Aquí está la firma" ───────│
    │                                          │
    │   Busca la llave pública de alice         │
    │   en authorized_keys                      │
    │   Verifica la firma matemáticamente       │
    │                                          │
    │── "Acceso concedido" ────────────────────▶│
\`\`\`

### 📋 Lo que debes recordar

* SSH cifra TODO desde el primer intercambio. Telnet no cifraba nada.
* La llave privada **nunca** sale de tu máquina, ni siquiera durante la autenticación.
* SSH usa asimétrica para autenticar y establecer la sesión, luego simétrica para el tráfico.
* Las 7 fases ocurren en milisegundos antes de que veas el prompt.

### 🧪 Autoevaluación

1. ¿Por qué SSH usa criptografía simétrica para el tráfico de sesión en lugar de asimétrica?
2. ¿En qué fase de la conexión SSH viaja tu llave privada por la red?
3. ¿Qué problema resolvía SSH que Telnet no podía resolver?

---

1. La criptografía simétrica es **órdenes de magnitud más rápida**. La asimétrica solo se usa donde es necesaria: autenticación e intercambio inicial de claves.
2. **En ninguna.** La llave privada nunca viaja por la red. El cliente la usa localmente para firmar un desafío.
3. **El cifrado del canal completo.** Telnet transmitía contraseñas y datos en texto plano, legibles por cualquier nodo intermedio.
`

export default content
