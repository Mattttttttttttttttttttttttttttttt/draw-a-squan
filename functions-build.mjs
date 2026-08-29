#!/usr/bin/env node
// Bundles functions/index.js (+ its imports) into the parent repo's
// functions/lib/draw/, derived from this file's own location — works
// standalone or via update-subwebsites.sh, no env vars needed.
import { build } from "esbuild";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "..", "functions", "lib", "draw");

mkdirSync(OUT_DIR, { recursive: true });

await build({
  entryPoints: [join(__dirname, "functions", "index.js")],
  outfile: join(OUT_DIR, "index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Left external: native bindings (resvg) can't be bundled, and
  // firebase-functions is provided by the deployed functions/package.json.
  external: ["firebase-functions", "@resvg/resvg-js"],
});

console.log("✓ built functions/lib/draw/index.js");
