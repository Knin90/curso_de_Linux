// Recompila todas las figuras en los dos temas: node figuras/build-all.mjs
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIGURES = ["redireccion", "permisos-octal", "systemd-enable"];

for (const name of FIGURES) {
  for (const flags of [[], ["--light"]]) {
    execFileSync(process.execPath, [join(HERE, name, "build.mjs"), ...flags], { stdio: "inherit" });
  }
}
