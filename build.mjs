import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dst = join(__dirname, 'public');

function mkdirp(p) {
  mkdirSync(p, { recursive: true });
}

function cp(src, dest) {
  const s = join(__dirname, src);
  const d = join(dst, dest);
  mkdirp(dirname(d));
  copyFileSync(s, d);
}

function readdirRecursive(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...readdirRecursive(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function copyFolderRecursive(src, dest) {
  const entries = readdirRecursive(src);
  for (const entry of entries) {
    const rel = entry.slice(src.length);
    const dstFile = join(dest, rel);
    mkdirp(dirname(dstFile));
    copyFileSync(entry, dstFile);
  }
}

async function buildJS() {
  await esbuild.build({
    entryPoints: [join(__dirname, 'scripts/script.js')],
    bundle: true,
    minify: true,
    keepNames: false,
    format: 'iife',
    outfile: join(dst, 'app.bundle.js'),
  });
  console.log('✓ JS bundled → public/app.bundle.js');
}

async function buildCSS() {
  await esbuild.build({
    entryPoints: [
      join(__dirname, 'css/style.css'),
      join(__dirname, 'css/pickr.css'),
    ],
    bundle: false,
    minify: true,
    outdir: join(dst, 'css'),
    allowOverwrite: true,
  });
  console.log('✓ CSS minified → public/css/');
}

function copyAssets() {
  const imgs = ['menu.svg', 'download.svg', 'copy.svg', 'fill.svg', 'bulk-input.svg'];
  for (const img of imgs) {
    cp(`img/${img}`, `img/${img}`);
  }
  console.log('✓ Images copied');

  const fontDirs = ['JetBrains_Mono', 'Syne'];
  for (const dir of fontDirs) {
    copyFolderRecursive(join(__dirname, 'fonts', dir), join(dst, 'fonts', dir));
  }
  console.log('✓ Fonts copied');

  cp('favicon.ico', 'favicon.ico');
  cp('scripts/pickr.js', 'pickr.js');
  cp('scripts/jszip-lib.js', 'jszip-lib.js');
  cp('scripts/xlsx-min.js', 'xlsx-min.js');
  console.log('✓ Vendor scripts & static assets copied');
}

function buildHTML() {
  const htmlPath = join(__dirname, 'index.html');
  let html = readFileSync(htmlPath, 'utf-8');

  html = html.replace(
    /<script src="\.\/scripts\/pickr\.js"><\/script>/,
    '<script src="./pickr.js"></script>'
  );
  html = html.replace(
    /<script src="\.\/scripts\/jszip-lib\.js"><\/script>/,
    '<script src="./jszip-lib.js"></script>'
  );
  html = html.replace(
    /<script src="\.\/scripts\/xlsx-min\.js"><\/script>/,
    '<script src="./xlsx-min.js"></script>'
  );
  html = html.replace(
    /<script type="module" src="\.\/scripts\/script\.js"><\/script>/,
    '<script src="./app.bundle.js"></script>'
  );

  writeFileSync(join(dst, 'index.html'), html, 'utf-8');
  console.log('✓ index.html generated');
}

async function main() {
  mkdirp(dst);
  await buildJS();
  await buildCSS();
  copyAssets();
  buildHTML();
  console.log('\n✓ Build complete! Output in ./public/');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
