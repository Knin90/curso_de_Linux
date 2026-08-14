# Curso de Linux

> De cero a administrador profesional — curso abierto y gratuito de Linux en español.

![Versión](https://img.shields.io/badge/versión-0.1.0-00DF82?style=flat-square)
![Licencia](https://img.shields.io/badge/licencia-CC--BY--SA%204.0%20%2B%20MIT-03624C?style=flat-square)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square)
![Último commit](https://img.shields.io/github/last-commit/Knin90/curso_de_Linux?style=flat-square&label=último%20commit)
![Estrellas](https://img.shields.io/github/stars/Knin90/curso_de_Linux?style=flat-square&label=estrellas)

Un curso gratuito que te lleva desde los fundamentos del sistema operativo hasta administrar servidores reales en producción: una ruta progresiva, orientada a la práctica, con laboratorios reales y mapeo directo a certificaciones de la industria (CompTIA Linux+, LPIC, RHCSA, RHCE, CKA). Sin cuentas ni costo: solo tu terminal y ganas de aprender.

## Tabla de contenidos

- [Características](#características)
- [Contenido del curso](#contenido-del-curso)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Puesta en marcha](#puesta-en-marcha)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Añadir o editar contenido](#añadir-o-editar-contenido)
- [Diseño](#diseño)
- [Estado del proyecto](#estado-del-proyecto)
- [Licencia](#licencia)

## Características

- **37 niveles** con contenido secuencial: cada nivel se apoya en el anterior.
- **288 módulos guiados** con markdown, ejemplos de terminal y bloques de código resaltados.
- **36 laboratorios** y un **proyecto final integrador** que te lleva de un servidor real de Internet a la nube.
- **Autoevaluación interactiva** por módulo con respuestas desplegables.
- **Mapa del curso** navegable con filtro por etapa y seguimiento de progreso local (guardado en `localStorage`).
- **Tema claro/oscuro** con estética de terminal profesional (`>_`, JetBrains Mono, acentos verde/cian).
- **Seguimiento de lectura** automático por módulo (IntersectionObserver) y memoria de posición de scroll.
- SPA en **React + Vite**, con code-splitting por nivel y respeto de `prefers-reduced-motion`.

## Contenido del curso

| Etapa | Tema | Niveles |
|-------|------|---------|
| 1 | Fundamentos (instalación, terminal, usuarios, paquetes, systemd, almacenamiento, SSH, firewall) | 0–10 |
| 2 | Administración del Sistema (monitoreo, Bash, cron, procesos, usuarios avanzados) | 11–15 |
| 3 | Redes (diagnóstico, routing, DNS, nginx web y proxy inverso) | 16–20 |
| 4 | Seguridad (hardening, SSL/TLS, auditd, SELinux/AppArmor, IDS, vulnerabilidades) | 21–26 |
| 5 | Automatización (Ansible, Docker, Docker Compose) | 27–29 |
| 6 | Infraestructura (Git/CI-CD, Terraform, alta disponibilidad, PostgreSQL, Redis, Prometheus/Grafana, backups) | 30–36 |
| 7 | Proyecto Final integrador | — |

> Nota: el nivel 0 (Introducción al mundo Linux) es introductorio y no tiene módulos propios; el contenido real arranca en el nivel 1.

## Stack tecnológico

- **React 18** + **React Router 6**
- **Vite 5** (build y dev server)
- **Tailwind CSS 3** + **PostCSS** + **Autoprefixer**
- **pnpm** como gestor de paquetes
- **Parser de markdown propio** (`src/components/level/LevelContent.jsx`) con resaltado de sintaxis propio (`src/components/level/CodeBlock.jsx`) — el contenido se renderiza sin dependencias de terceros

## Requisitos previos

- **Node.js** ≥ 18
- **pnpm** (recomendado; el proyecto incluye `pnpm-lock.yaml` y `pnpm-workspace.yaml`)

## Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Servidor de desarrollo (puerto 5174, o el siguiente libre)
pnpm dev

# 3. Build de producción
pnpm build

# 4. Previsualizar el build
pnpm preview
```

Para servir el build en producción con el servidor Node incluido:

```bash
node server.js   # sirve dist/ en el puerto 4173
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo de Vite (puerto 5174) |
| `pnpm build` | Build de producción en `dist/` |
| `pnpm preview` | Previsualiza el build localmente |
| `pnpm audit:exports` | Audita exportaciones del contenido (`scripts/audit-exports.mjs`) |

## Estructura del proyecto

```
├── index.html              # HTML de entrada (fuentes, estilos de highlight.js)
├── server.js               # Servidor estático de producción (puerto 4173)
├── vite.config.js          # Configuración de Vite
├── tailwind.config.js      # Configuración de Tailwind
├── public/
│   └── linux.svg           # Favicon
├── scripts/
│   └── audit-exports.mjs   # Script de auditoría de exportaciones
└── src/
    ├── main.jsx            # Punto de entrada
    ├── App.jsx             # Rutas (/, /nivel/:levelId, /nivel/:levelId/modulo/:moduleId)
    ├── registry.js         # Etapas y niveles (id, stage, título, estado)
    ├── pages/              # Home (landing), LevelPage, ModulePage
    ├── components/         # ReadingProgress, ThemeToggle, CountUp, level/*, hooks/*
    ├── hooks/              # useCourseProgress, useRevealOnScroll, etc.
    ├── content/
    │   ├── metaRegistry.js # Metadatos ligeros por nivel (landing)
    │   ├── contentRegistry.js
    │   └── level-N/        # Contenido por nivel (index.js + modules/)
    ├── index.css
    └── ...
```

## Añadir o editar contenido

El contenido vive en `src/content/level-N/`:

1. Cada nivel exporta `meta` (información del nivel) y `modules` (lista de módulos con su markdown).
2. Los niveles con muchos módulos los dividen en `src/content/level-N/modules/mN.js`.
3. Registra nuevos niveles en `src/registry.js` y su contenido en `src/content/metaRegistry.js` y `contentRegistry.js`.
4. Valida con `pnpm audit:exports`.

## Diseño

El sistema de diseño (colores, tipografía, componentes, reglas) está documentado en [`DESIGN.md`](./DESIGN.md). La visión de producto y la audiencia objetivo están en [`PRODUCT.md`](./PRODUCT.md).

## Estado del proyecto

- [x] 37 niveles definidos y disponibles.
- [x] Landing, mapa del curso, navegación por niveles y módulos, tema claro/oscuro.
- [x] Autoevaluación interactiva por módulo.
- [ ] Pendiente: examen de etapa, evaluación global y persistencia de progreso en backend.

## Licencia

- **Contenido educativo** (niveles, módulos y documentación): [Creative Commons Attribution-ShareAlike 4.0](./LICENSE-CONTENT.md) (CC BY-SA 4.0).
- **Código fuente**: [MIT](./LICENSE.md).

El curso es gratuito, abierto y sin cuentas: puedes estudiarlo, adaptarlo y compartirlo citando la fuente.

---

Hecho con 💚 para la comunidad hispanohablante.
