const content = `
## Módulo 3 — Reglas iptables: sintaxis, targets y orden

### 🎯 Objetivos de aprendizaje

* Dominar la sintaxis general de una regla iptables.
* Conocer los targets ACCEPT, DROP, REJECT, LOG y RETURN.
* Entender por qué el orden de las reglas es crítico.
* Construir un ruleset de producción completo.

### ❓ El problema real

Tienes iptables configurado pero el puerto 443 no responde aunque tienes una regla que lo permite. El problema: una regla DROP más arriba en la cadena está descartando el paquete antes de que llegue a tu regla ACCEPT. Las reglas de iptables se evalúan en orden secuencial y **la primera que hace match gana**. El orden no es un detalle — es el mecanismo fundamental.

### 📖 Sintaxis general

\`\`\`bash
iptables [TABLA] OPERACIÓN CADENA [CRITERIOS] -j TARGET
\`\`\`

\`\`\`text
Componente          Descripción                         Ejemplo
──────────────────  ──────────────────────────────────  ─────────────────────
-t tabla            Tabla a modificar (filter default)  -t nat
-A CADENA           Append: añadir al final             -A INPUT
-I CADENA [N]       Insert: insertar en posición N      -I INPUT 1
-D CADENA           Delete: eliminar una regla          -D INPUT 3
-p protocolo        Protocolo                           -p tcp, -p udp, -p icmp
-s IP/CIDR          IP/red de origen                    -s 192.168.1.0/24
-d IP/CIDR          IP/red de destino                   -d 10.0.0.1
--dport puerto      Puerto de destino                   --dport 22
--sport puerto      Puerto de origen                    --sport 1024:65535
-i interfaz         Interfaz de entrada                 -i eth0
-o interfaz         Interfaz de salida                  -o eth0
-m módulo           Módulo de extensión                 -m conntrack
-j TARGET           Acción a tomar                      -j ACCEPT
\`\`\`

### 📖 Los targets principales

\`\`\`text
TARGET      Comportamiento
──────────  ──────────────────────────────────────────────────────────────
ACCEPT      El paquete pasa. Deja de evaluarse contra más reglas en esta
            cadena.

DROP        El paquete se descarta silenciosamente. El origen no recibe
            ninguna respuesta — el paquete "desaparece".

REJECT      El paquete se descarta PERO se envía una respuesta ICMP de
            error al origen (ej: "port unreachable"). El origen sabe que
            fue rechazado.

LOG         Registra el paquete en el log del kernel (dmesg/journalctl).
            NO termina el procesamiento — el paquete sigue evaluándose.
            Siempre combinar LOG con una regla DROP/ACCEPT posterior.

RETURN      Termina el recorrido por la cadena actual y vuelve a la cadena
            que la llamó (útil en cadenas personalizadas).
\`\`\`

**DROP vs REJECT en práctica:**

\`\`\`text
DROP:   El cliente espera hasta timeout (puede ser 30-120 segundos).
        Ventaja: el atacante no sabe si el puerto existe.
        Desventaja: experiencia horrible para usuarios legítimos mal configurados.

REJECT: El cliente recibe error inmediatamente.
        Ventaja: diagnóstico más rápido, mejor UX para tráfico legítimo.
        Desventaja: confirma al atacante que el host existe.
\`\`\`

Recomendación: usa **DROP** en INPUT con política por defecto, y **REJECT** solo para redes internas de confianza donde quieras mejor diagnóstico.

### 📖 El orden importa: primera regla que hace match gana

\`\`\`text
Paquete TCP destino puerto 22 llega desde 10.0.0.1

EVALUACIÓN DE REGLAS EN ORDEN:

Regla 1: -A INPUT -i lo -j ACCEPT
         ¿Lo es interfaz loopback? NO → continuar

Regla 2: -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
         ¿Es conexión establecida? NO (es nueva) → continuar

Regla 3: -A INPUT -s 10.0.0.0/8 -p tcp --dport 22 -j ACCEPT
         ¿Origen en 10.0.0.0/8? SÍ. ¿TCP? SÍ. ¿Puerto 22? SÍ
         ──▶ ACCEPT. Se detiene aquí. Las reglas posteriores no se evalúan.
\`\`\`

**Consecuencia crítica:** si pones una regla DROP antes de una regla ACCEPT para el mismo tráfico, la regla ACCEPT nunca se ejecutará.

\`\`\`bash
# INCORRECTO: DROP antes de ACCEPT para SSH
iptables -A INPUT -j DROP           # Esta regla descarta TODO
iptables -A INPUT -p tcp --dport 22 -j ACCEPT  # Esta nunca se alcanza

# CORRECTO: ACCEPT específico antes de DROP general
iptables -A INPUT -p tcp --dport 22 -j ACCEPT  # Permite SSH
iptables -A INPUT -j DROP                       # Descarta el resto
\`\`\`

### 📖 Ruleset completo de producción

Este es el conjunto mínimo de reglas para un servidor que sirve SSH y web:

\`\`\`bash
#!/bin/bash
# === RESET COMPLETO ===
# Establecer política permisiva ANTES de flush para no quedar bloqueado
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT

# Eliminar todas las reglas
iptables -F         # Flush: borra todas las reglas de todas las cadenas
iptables -X         # Delete: borra cadenas personalizadas
iptables -Z         # Zero: pone contadores a cero

# === REGLAS EN ORDEN ===

# 1. Loopback: el servidor necesita comunicarse consigo mismo
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# 2. Conexiones establecidas: permite el tráfico de retorno
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 3. SSH (cambiar 22 por tu puerto si lo modificaste)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 4. HTTP y HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 5. ICMP (ping) — opcional pero útil para diagnóstico
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# === POLÍTICA POR DEFECTO: BLOQUEAR TODO LO DEMÁS ===
iptables -P INPUT DROP
iptables -P FORWARD DROP
# OUTPUT se deja en ACCEPT (el servidor puede iniciar conexiones salientes)

# === GUARDAR ===
iptables-save > /etc/iptables/rules.v4
\`\`\`

### 📖 Insertar y eliminar reglas

\`\`\`bash
# Ver reglas con números de línea
iptables -L INPUT -n --line-numbers

# Insertar en posición específica (en este caso, posición 1 = primera regla)
iptables -I INPUT 1 -s 192.168.1.100 -j DROP

# Insertar al final (equivalente a -A)
iptables -I INPUT 999 -p tcp --dport 8080 -j ACCEPT

# Eliminar por número de línea
iptables -D INPUT 3

# Eliminar por especificación exacta de la regla
iptables -D INPUT -p tcp --dport 8080 -j ACCEPT
\`\`\`

### 📖 Flush y reset de emergencia

Si te bloqueaste accidentalmente (cosa que ocurre):

\`\`\`bash
# Flush y permitir todo (comando de recuperación)
iptables -F
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT

# Si tienes acceso a consola, puedes hacer esto para recuperar acceso SSH
# y luego reconstruir las reglas correctamente
\`\`\`

> Regla de oro: **siempre establece la política ACCEPT antes de hacer flush** si trabajas en remoto. Si el flush elimina una regla que permitía tu SSH y la política es DROP, te habrás bloqueado.

### 📋 Lo que debes recordar

* La sintaxis es: \`iptables [TABLA] OPERACIÓN CADENA [CRITERIOS] -j TARGET\`
* DROP descarta silenciosamente; REJECT informa al origen; LOG registra sin detener.
* El orden es crítico: la primera regla que coincide gana, el resto no se evalúa.
* Siempre permite loopback y conexiones ESTABLISHED antes de cualquier regla restrictiva.
* Establece política ACCEPT antes de hacer flush para no bloquearte en remoto.

### 🧪 Autoevaluación

1. Tienes estas dos reglas en orden: (1) \`-A INPUT -j DROP\` y (2) \`-A INPUT -p tcp --dport 80 -j ACCEPT\`. ¿Funciona el acceso HTTP?
2. ¿Cuál es la diferencia práctica entre DROP y REJECT desde la perspectiva del atacante?
3. ¿Por qué es importante la regla \`-m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT\` en un ruleset con política DROP?

---

1. **No funciona.** La regla (1) hace match con todo el tráfico y lo descarta. La regla (2) nunca se evalúa porque el paquete HTTP ya fue eliminado por la regla anterior.
2. Con **DROP**, el atacante no recibe respuesta y no puede saber si el host existe o si el puerto está cerrado (podría ser un firewall intermedio). Con **REJECT**, el atacante recibe una respuesta ICMP y sabe que el host está activo pero el puerto está bloqueado.
3. Sin esa regla, con política DROP, el servidor podría **iniciar** conexiones salientes (curl, apt, etc.) pero nunca recibiría las respuestas, ya que los paquetes de retorno serían clasificados como nuevas conexiones entrantes y descartados.
`

export default content
