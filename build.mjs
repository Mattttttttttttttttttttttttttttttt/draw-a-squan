import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'fs';
import { join, relative, dirname } from 'path';
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

// ── Inline SVG & HTML compression ─────────────────────────

let svgoOptimize;
async function getSvgo() {
  if (!svgoOptimize) {
    const mod = await import('svgo');
    svgoOptimize = mod.optimize;
  }
  return svgoOptimize;
}

const SVGO_CONFIG = {
  multipass: true,
  js2svg: { pretty: false },
  plugins: [
    {
      name: 'preset-default',
    },
    {
      name: 'removeViewBox',
      active: false,
    },
    {
      name: 'cleanupIds',
      active: false,
    },
  ],
};

function compressHTML(str, { trim = true } = {}) {
  const compressed = str
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+(\/?>)/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, '');
  return trim ? compressed.trim() : compressed;
}

function hasMarkup(content) {
  return /<[a-z][\s>]/i.test(content) || content.includes('</');
}

function isCompleteSvg(str) {
  return /<svg[\s>][\s\S]*<\/svg>/i.test(str);
}

async function compressContent(content) {
  if (!hasMarkup(content)) return content;

  const isSvg = /<svg[\s>]/i.test(content);
  const parts = content.split(/(\$\{[^}]*\})/);

  const optimize = await getSvgo();

  const hasInterpolations = parts.length > 1;
  const processed = parts.map(part => {
    if (/^\$\{[^}]*\}$/.test(part)) return part;
    if (!part.trim()) return part;

    if (isSvg && isCompleteSvg(part)) {
      try {
        const result = optimize(part, SVGO_CONFIG);
        return result.data;
      } catch { }
    }

    return compressHTML(part, { trim: !hasInterpolations });
  });

  return processed.join('');
}

function extractTemplateContent(source, start) {
  let depth = 0;
  let j = start;
  while (j < source.length) {
    const ch = source[j];
    if (ch === '`' && depth === 0) {
      return { content: source.slice(start, j), endIdx: j };
    }
    if (ch === '$' && source[j + 1] === '{') {
      depth++;
      j += 2;
    } else if (ch === '}' && depth > 0) {
      depth--;
      j++;
    } else if (ch === '\\') {
      j += 2;
    } else {
      j++;
    }
  }
  return { content: source.slice(start), endIdx: source.length };
}

async function compressTemplateLiterals(source) {
  let result = '';
  let i = 0;
  while (i < source.length) {
    const btIdx = source.indexOf('`', i);
    if (btIdx === -1) {
      result += source.slice(i);
      break;
    }
    result += source.slice(i, btIdx);
    const { content, endIdx } = extractTemplateContent(source, btIdx + 1);
    result += '`' + (await compressContent(content)) + '`';
    i = endIdx + 1;
  }
  return result;
}

// ── Build steps ────────────────────────────────────────────

async function buildJS() {
  const srcDir = join(__dirname, 'scripts');
  const entries = readdirSync(srcDir).filter(f => f.endsWith('.js') && !f.includes('pickr') && !f.includes('jszip') && !f.includes('xlsx'));

  const compressPlugin = {
    name: 'compress-templates',
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, async (args) => {
        if (args.path.includes('node_modules')) return;
        if (args.path.includes('pickr.js') || args.path.includes('jszip-lib') || args.path.includes('xlsx-min')) return;
        const source = readFileSync(args.path, 'utf-8');
        const transformed = await compressTemplateLiterals(source);
        if (transformed !== source) {
          return { contents: transformed, loader: 'js' };
        }
      });
    },
  };

  await esbuild.build({
    entryPoints: { 'app.bundle': join(__dirname, 'scripts/script.js') },
    bundle: true,
    minify: true,
    keepNames: false,
    format: 'esm',
    splitting: true,
    outdir: dst,
    plugins: [compressPlugin],
  });
  console.log('✓ JS bundled → public/app.bundle.js (+ chunks)');
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
  cp('vendor/p5.min.js', 'p5.min.js');
  cp('manifest.webmanifest', 'manifest.webmanifest');
  cp('icon-192.png', 'icon-192.png');
  cp('icon-512.png', 'icon-512.png');
  console.log('✓ Vendor scripts, PWA assets & static assets copied');
}

function buildHTML() {
  const htmlPath = join(__dirname, 'index.html');
  let html = readFileSync(htmlPath, 'utf-8');

  html = html.replace(
    /<script src="\.\/scripts\/pickr\.js"><\/script>/,
    '<script src="./pickr.js"></script>'
  );
  html = html.replace(
    /<script type="module" src="\.\/scripts\/script\.js"><\/script>/,
    '<script type="module" src="./app.bundle.js"></script>'
  );

  writeFileSync(join(dst, 'index.html'), html, 'utf-8');
  console.log('✓ index.html generated');
}

function buildServiceWorker() {
  const CACHE_FILE_TYPES = [
    'html', 'htm', 'css', 'js', 'mjs', 'json',
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico',
    'woff', 'woff2', 'ttf', 'webmanifest',
  ];

  function extensionOf(name) {
    const dot = name.lastIndexOf('.');
    return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  }

  const files = readdirRecursive(dst)
    .map(f => './' + relative(dst, f).replace(/\\/g, '/'))
    .filter(f => CACHE_FILE_TYPES.includes(extensionOf(f)));

  const swSrc = readFileSync(join(__dirname, 'service-worker.js'), 'utf-8');
  const swBuilt = swSrc.replace(
    'const PRECACHE = /*__PRECACHE__*/[];',
    'const PRECACHE = ' + JSON.stringify(files) + ';'
  );
  writeFileSync(join(dst, 'service-worker.js'), swBuilt, 'utf-8');
  console.log(`✓ Service worker built with ${files.length} precached files`);
}

function clean() {
  rmSync(dst, { recursive: true, force: true });
  console.log('✓ Cleaned public/');
}

async function main() {
  clean();
  mkdirp(dst);
  await buildJS();
  await buildCSS();
  copyAssets();
  buildHTML();
  buildServiceWorker();
  console.log('\n✓ Build complete! Output in ./public/');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
