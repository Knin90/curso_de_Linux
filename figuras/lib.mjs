// Utilidades comunes de las figuras: página embebible en iframe.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../.agents/skills/anatomy/scripts/inline-kit.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));

export function options() {
  const argv = process.argv.slice(2);
  const outAt = argv.indexOf("--out");
  return {
    theme: argv.includes("--light") ? "light" : "dark",
    out: outAt >= 0 ? resolve(argv[outAt + 1]) : resolve(ROOT, "../public/figuras"),
  };
}

// Dentro de un iframe la figura avisa de su altura al documento padre.
const HEIGHT_SCRIPT = `
const sendHeight = () => { if (parent !== window) parent.postMessage({ anatomyFigure: location.pathname, height: Math.ceil(document.documentElement.scrollHeight) }, "*"); };
new ResizeObserver(sendHeight).observe(document.body);
addEventListener("load", sendHeight);
`;

const EMBED_CSS = `<style>body{background:var(--anatomy-card)}.iso-page{margin:0 auto;width:100%;max-width:720px;padding:2px 2px 14px}.iso-legend{padding:0 14px}</style>`;

export function writeFigure({ name, title, body, live, theme, out }) {
  const html = k
    .pageHtml({ title, theme, body, script: kitScript() + live + HEIGHT_SCRIPT, width: 720 })
    .replace('<html lang="en">', '<html lang="es">')
    .replace("</head>", `${EMBED_CSS}</head>`);
  const file = join(out, theme === "light" ? `${name}-light.html` : `${name}.html`);
  mkdirSync(out, { recursive: true });
  writeFileSync(file, html);
  console.log("wrote", file);
}
