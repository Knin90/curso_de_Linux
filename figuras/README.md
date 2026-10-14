# Figuras interactivas (skill «anatomy»)

Figuras isométricas interactivas generadas con la skill
[`anatomy`](../.agents/skills/anatomy/SKILL.md). Cada figura es un script de
Node que usa el kit de la skill y escribe dos páginas autónomas en
`public/figuras/`: `<nombre>.html` (tema oscuro) y `<nombre>-light.html`
(tema claro).

```sh
npm run figuras        # recompila todas las figuras
```

## Usarlas en un módulo

En el markdown del módulo, un bloque `anatomy` con el nombre de la figura:

````md
```anatomy
{ "src": "permisos-octal", "title": "Permisos en octal" }
```
````

`src/components/level/AnatomyFigure.jsx` la inserta en un iframe, elige el
tema según el del sitio y ajusta la altura automáticamente.

## Figuras

| Figura | Módulo | Qué explica |
|---|---|---|
| `permisos-octal` | Nivel 4 · Módulo 3 | rwx → octal: bloques patrón de altura 4, 2 y 1 apilados; un medidor de altura lee el dígito |

Para añadir una nueva: copia `permisos-octal/build.mjs` como punto de partida,
añádela al script `figuras` de `package.json` y verifica con
`.agents/skills/anatomy/scripts/capture.mjs` y `scripts/lines.mjs`
(`line ends: 0`).
