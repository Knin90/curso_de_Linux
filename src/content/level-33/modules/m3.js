const content = `
## Módulo 3 — psql, roles, bases de datos y esquemas

### 🎯 Objetivos de aprendizaje

* Usar psql con eficiencia: metacomandos, historial, modo tubo y scripting.
* Crear y gestionar roles con el modelo de privilegios de PostgreSQL.
* Organizar objetos con esquemas y controlar \`search_path\`.
* Consultar los catálogos del sistema (pg_roles, pg_database, information_schema).

### ❓ El problema real

El equipo de desarrollo ha creado los objetos de la base de datos como el superusuario \`postgres\`. La aplicación se conecta con el mismo superusuario. En una auditoría de seguridad se descubre que la aplicación tiene permisos para borrar cualquier tabla, modificar la configuración del servidor, y crear nuevos superusuarios. Adicionalmente, todos los objetos están en el esquema \`public\`, mezclados sin ninguna organización. La aplicación de monitoreo comparte la misma base de datos que la app principal.

Configurar roles con privilegios mínimos y esquemas bien definidos es una decisión de arquitectura que se debe tomar en el momento del diseño, no después.

### 📖 psql: el cliente de línea de comandos

psql es el cliente oficial de PostgreSQL. Es la herramienta principal del DBA en producción.

\`\`\`bash
# Conectar como superusuario al cluster local (socket Unix, sin contraseña con peer auth)
sudo -u postgres psql

# Conectar a una base de datos específica
sudo -u postgres psql -d myapp

# Conectar con usuario, host y puerto explícitos
psql -U appuser -h 10.10.0.5 -p 5432 -d myapp

# Ejecutar una consulta y salir (útil para scripts)
psql -U postgres -d myapp -c "SELECT count(*) FROM orders WHERE created_at > now() - interval '1 hour'"

# Ejecutar un archivo SQL
psql -U postgres -d myapp -f /tmp/migration_v2.sql

# Con salida en formato CSV para exportar
psql -U postgres -d myapp -A -F',' -c "SELECT id, email FROM users" > /tmp/export.csv
\`\`\`

**Metacomandos esenciales**:

\`\`\`text
METACOMANDO              DESCRIPCIÓN
──────────────────────────────────────────────────────────────────────────────
\\l                       Listar todas las bases de datos
\\l+                      Listar con tamaño, encoding, collation
\\c dbname               Conectar a otra base de datos
\\dt                      Listar tablas en el search_path actual
\\dt schema.*            Listar tablas de un esquema específico
\\d tablename            Describir estructura de tabla (columnas, índices, FK)
\\di                      Listar índices
\\dv                      Listar vistas
\\df                      Listar funciones
\\du                      Listar roles (usuarios)
\\dn                      Listar esquemas
\\dp tablename           Ver privilegios de un objeto
\\timing                  Activar/desactivar timing de consultas
\\e                       Abrir editor externo (EDITOR o vi)
\\x                       Modo extendido (filas verticales — útil para tablas anchas)
\\pset pager off         Desactivar paginación (útil en pipes)
\\set AUTOCOMMIT off     Modo transaccional manual
\\copy                    COPY desde/hacia archivos locales (no requiere superuser)
\\q                       Salir
\`\`\`

\`\`\`sql
-- Ver tamaño de bases de datos
\\l+

-- O con SQL directamente
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) AS size,
  datcollate,
  datctype
FROM pg_database
ORDER BY pg_database_size(datname) DESC;

-- Ver tamaño de tablas en la base actual
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
\`\`\`

### 📖 Modelo de roles en PostgreSQL

PostgreSQL usa un modelo unificado de **roles** — no hay distinción técnica entre usuario y grupo. Un rol puede tener LOGIN (puede conectarse) y puede ser miembro de otros roles (hereda privilegios).

**Crear roles para producción**:

\`\`\`sql
-- Superusuario solo para administración (nunca para la aplicación)
-- El rol 'postgres' ya existe, no crear otro superusuario sin necesidad

-- Rol para la aplicación: solo puede conectarse y usar su base de datos
CREATE ROLE appuser LOGIN PASSWORD 'P@ssw0rd_Segura_Prod' CONNECTION LIMIT 50;

-- Rol de solo lectura para reporting/analítica
CREATE ROLE readonly LOGIN PASSWORD 'ReadOnly_2024!';

-- Rol de grupo para heredar privilegios (sin LOGIN)
CREATE ROLE app_role;

-- Dar privilegios al rol de grupo
GRANT CONNECT ON DATABASE myapp TO app_role;
GRANT USAGE ON SCHEMA public TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;

-- Hacer que appuser herede de app_role
GRANT app_role TO appuser;

-- Privilegios de solo lectura
GRANT CONNECT ON DATABASE myapp TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Garantizar que tablas futuras también tengan los privilegios
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO readonly;
\`\`\`

**Verificar privilegios**:

\`\`\`sql
-- Ver roles y sus atributos
\\du

-- O con SQL
SELECT
  rolname,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolcanlogin,
  rolconnlimit,
  rolvaliduntil
FROM pg_roles
WHERE rolname NOT LIKE 'pg_%'
ORDER BY rolname;

-- Ver privilegios en tablas
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'app_role'
ORDER BY table_name, privilege_type;

-- Ver membresía en roles
SELECT
  r.rolname AS role,
  m.rolname AS member
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.roleid
JOIN pg_roles m ON m.oid = am.member;
\`\`\`

**Cambiar contraseña y expiración**:

\`\`\`sql
-- Cambiar contraseña
ALTER ROLE appuser PASSWORD 'NuevaContraseña_2024!';

-- Contraseña con fecha de expiración
ALTER ROLE appuser VALID UNTIL '2025-12-31';

-- Revocar capacidad de login (deshabilitar sin borrar el rol)
ALTER ROLE appuser NOLOGIN;

-- Borrar rol (primero revocar todos sus privilegios y reasignar objetos)
REASSIGN OWNED BY olduser TO postgres;
DROP OWNED BY olduser;
DROP ROLE olduser;
\`\`\`

### 📖 Crear bases de datos

\`\`\`sql
-- Crear base de datos con encoding y collation explícitos
CREATE DATABASE myapp
  OWNER appuser
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8'
  TEMPLATE template0;   -- template0 garantiza collation limpia

-- Por qué template0 y no template1:
-- template1 puede tener objetos creados por el DBA (extensiones, etc.)
-- template0 es siempre el template base limpio

-- Configurar parámetros por base de datos
ALTER DATABASE myapp SET work_mem = '32MB';
ALTER DATABASE myapp SET search_path = myapp_schema, public;
ALTER DATABASE myapp SET log_min_duration_statement = 500;

-- Ver bases de datos
SELECT datname, datdba::regrole, pg_encoding_to_char(encoding),
       datcollate, datctype, pg_size_pretty(pg_database_size(datname))
FROM pg_database
WHERE NOT datistemplate;
\`\`\`

### 📖 Esquemas: organización de objetos

Un esquema (schema) es un namespace dentro de una base de datos. Sin esquemas explícitos, todo va al esquema \`public\`. En producción, los esquemas permiten:
- Separar objetos de la aplicación de objetos de extensiones.
- Control de acceso por área funcional.
- Múltiples versiones o módulos de una aplicación en la misma DB.

\`\`\`sql
-- Conectar a la base de datos de la aplicación
\\c myapp

-- Crear esquemas
CREATE SCHEMA app AUTHORIZATION appuser;       -- Esquema principal de la app
CREATE SCHEMA audit AUTHORIZATION appuser;     -- Esquema de auditoría
CREATE SCHEMA reporting AUTHORIZATION readonly; -- Solo lectura para reporting

-- Crear una tabla en el esquema correcto
CREATE TABLE app.users (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit.user_changes (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT NOT NULL,
  old_data   JSONB,
  new_data   JSONB
);

-- search_path: el orden en que PostgreSQL busca objetos sin schema prefix
-- La sesión del appuser debe tener el esquema de la app primero
ALTER ROLE appuser SET search_path = app, public;

-- Verificar search_path actual
SHOW search_path;

-- Con search_path = app, public, no es necesario prefijo:
SELECT * FROM users;   -- Busca en app.users primero, luego en public.users

-- Sin search_path adecuado, referenciar explícitamente:
SELECT * FROM app.users;
\`\`\`

**Extensiones útiles y dónde instalarlas**:

\`\`\`sql
-- Crear esquema dedicado para extensiones (buena práctica)
CREATE SCHEMA extensions;

-- Instalar extensiones en ese esquema
CREATE EXTENSION pg_stat_statements SCHEMA extensions;
CREATE EXTENSION pgcrypto SCHEMA extensions;
CREATE EXTENSION pg_trgm SCHEMA extensions;   -- Para búsqueda de texto y GIN/GiST

-- Listar extensiones instaladas
SELECT name, default_version, installed_version, comment
FROM pg_available_extensions
WHERE installed_version IS NOT NULL;
\`\`\`

### 📖 Importar y exportar datos con COPY

\`\`\`sql
-- Exportar tabla a CSV (desde servidor — requiere superuser o pg_read_server_files)
COPY app.users TO '/tmp/users_export.csv' CSV HEADER;

-- Importar desde CSV
COPY app.users (email, created_at) FROM '/tmp/users_import.csv' CSV HEADER;

-- \\copy: versión cliente de COPY (no requiere privilegios de servidor)
-- Útil para archivos locales al cliente, no al servidor
\\copy app.users TO /home/denis/users_export.csv CSV HEADER
\\copy app.users (email) FROM /home/denis/new_users.csv CSV HEADER
\`\`\`

### 📋 Lo que debes recordar

* Nunca conectar la aplicación con el rol \`postgres\` o cualquier superusuario.
* \`CREATE ROLE appuser LOGIN PASSWORD '...' CONNECTION LIMIT N\` es el patrón correcto.
* \`ALTER DEFAULT PRIVILEGES\` garantiza que las tablas futuras también hereden los privilegios.
* \`search_path\` controla en qué esquemas busca PostgreSQL objetos sin prefijo — configurarlo por rol.
* \`template0\` al crear bases de datos garantiza un template limpio con collation consistente.
* \`\\copy\` es la versión cliente de COPY — no necesita privilegios de servidor.

### 🧪 Autoevaluación

1. ¿Cuál es la diferencia entre GRANT en tablas existentes y ALTER DEFAULT PRIVILEGES?
2. ¿Por qué se recomienda usar \`template0\` en lugar de \`template1\` al crear una base de datos nueva?
3. Un desarrollador ejecuta \`SELECT * FROM users\` y obtiene "relation users does not exist" aunque la tabla \`app.users\` existe. ¿Cuál es la causa más probable?

---

1. GRANT sobre tablas existentes aplica los privilegios a los objetos actuales. ALTER DEFAULT PRIVILEGES configura los privilegios que tendrán los objetos creados en el futuro. En producción se necesitan ambos: uno para el estado actual y otro para las migraciones futuras.
2. template1 puede contener extensiones, objetos, o configuraciones que el DBA haya añadido previamente, lo que puede causar inconsistencias de collation o conflictos. template0 es el template base inmutable de PostgreSQL, garantizando una base limpia con el encoding y collation especificados.
3. El \`search_path\` de la sesión no incluye el esquema \`app\`. PostgreSQL busca la tabla en los esquemas del search_path y no la encuentra. La solución es referenciar \`app.users\` explícitamente, o configurar \`SET search_path = app, public\` para la sesión o el rol.
`

export default content
