// Bundles functions/index.js (and its ../scripts ESM imports) into this
// functions project's lib/draw/index.js so the Firebase Functions runtime /
// Local Emulator can load it (scripts/*.js are ESM under a CommonJS root and
// cannot be imported directly by Node). Keeps native/external deps external.
import { build } from "esbuild";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "lib", "draw");

mkdirSync(OUT_DIR, { recursive: true });

await build({
  entryPoints: [join(__dirname, "index.js")],
  outfile: join(OUT_DIR, "index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Left external: native bindings (resvg) can't be bundled, and
  // firebase-functions / firebase-admin are provided by this package.json.
  external: ["firebase-functions", "firebase-admin", "@resvg/resvg-js"],
});

console.log("✓ built functions/lib/draw/index.js");
