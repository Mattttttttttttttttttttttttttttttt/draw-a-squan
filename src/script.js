/* ─── Color scheme editor ─────────────────────────── */
const SCHEME_FACES = ['top', 'bottom', 'front', 'right', 'back', 'left', 'border'];

function buildSchemeGrid() {
    const grid = document.getElementById('scheme-grid');
    grid.innerHTML = '';
    const scheme = sq1vis.getColorScheme();
    SCHEME_FACES.forEach(face => {
        const row = document.createElement('div');
        row.className = 'scheme-row';
        row.innerHTML = `
          <span class="scheme-face-label">${face}</span>
          <div class="scheme-switch-btn" id="switch-${face}" style="background:${scheme[face]}">
            <input class="scheme-color-input" type="color" value="${scheme[face]}" data-face="${face}" />
          </div>`;
        grid.appendChild(row);
    });
    grid.querySelectorAll('.scheme-color-input').forEach(inp => {
        inp.addEventListener('input', e => {
            const face = e.target.dataset.face;
            const color = e.target.value;
            document.getElementById(`switch-${face}`).style.background = color;
            sq1vis.setColorScheme({ [face]: color });
            draw();
        });
    });
}

buildSchemeGrid();

/* fill piece color stuff */
const fillModeBtn = document.getElementById('fill-mode-btn');
const fillResetBtn = document.getElementById('fill-reset-btn');
const fillColorInput = document.getElementById('fill-color-input');
const fillColorSwitch = document.getElementById('fill-color-switch');

let fillModeActive = false;
let fillResetActive = false;

fillModeBtn.addEventListener('click', () => {
    if (fillResetActive && !fillModeActive) fillResetBtn.click();

    fillModeActive = !fillModeActive;
    fillModeBtn.classList.toggle('active', fillModeActive);

    const squans = document.querySelectorAll('.squan');
    if (fillModeActive)
        squans.forEach(div => {div.style.cursor = 'pointer';});
    else
        squans.forEach(div => {div.style.cursor = 'auto';});
});

fillResetBtn.addEventListener('click', () => {
    if (fillModeActive && !fillResetActive) fillModeBtn.click();

    fillResetActive = !fillResetActive;
    fillResetBtn.classList.toggle('active', fillResetActive);

    const squans = document.querySelectorAll('.squan');
    if (fillResetActive)
        squans.forEach(div => {div.style.cursor = 'pointer';});
    else
        squans.forEach(div => {div.style.cursor = 'auto';});
});

// Keep switch color in sync with the native picker
fillColorInput.addEventListener('input', () => {
    fillColorSwitch.style.background = fillColorInput.value;
});

document.getElementById('canvas-inner').addEventListener('click', e => {
    if (fillModeActive) {
        const piece = e.target.closest('.sticker');
        if (!piece) return;
        sq1vis.setPieceColor(piece.id, fillColorInput.value);
        draw();
    }
});

document.getElementById('canvas-inner').addEventListener('click', e => {
    if (fillResetActive) {
        const piece = e.target.closest('.sticker');
        if (!piece) return;
        sq1vis.resetPieceColor(piece.id);
        draw();
    }
});

/* ─── Sync sliders ↔ number inputs ───────────────── */
function syncPair(sliderId, inputId, onChange) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    slider.addEventListener('input', () => { input.value = slider.value; onChange(); });
    input.addEventListener('input', () => { slider.value = input.value; onChange(); });
}
syncPair('size-slider', 'size-input', draw);
syncPair('gap-slider', 'gap-input', draw);

/* ─── Orientation ─────────────────────────────────── */
document.querySelectorAll('input[name=orientation]').forEach(r =>
    r.addEventListener('change', draw));

/* ─── Hide-slice toggle ───────────────────────────── */
document.getElementById('hide-slice').addEventListener('change', draw);

/* ─── Mode toggle ─────────────────────────────────────── */
const MODES = [
    { value: 'scramble', label: 'Scramble', placeholder: '1,0 / 3,3 / 0,-3 / ... (supports karn)' },
    { value: 'inverse', label: 'Alg', placeholder: '1,0 / 3,3 / 0,-3 / ... (supports karn)' },
    { value: 'hex', label: 'Hex', placeholder: '211033455677|99ebbaddcff8' },
];
let currentModeIndex = 0;

function setMode(index) {
    currentModeIndex = ((index % MODES.length) + MODES.length) % MODES.length;
    const m = MODES[currentModeIndex];
    document.getElementById('mode-toggle-btn').textContent = m.label;
    document.getElementById('scramble-input').placeholder = m.placeholder;
    document.querySelectorAll('.mode-dropdown-item').forEach(el => {
        el.classList.toggle('active', el.dataset.mode === m.value);
    });
    draw();
}

document.getElementById('mode-toggle-btn').addEventListener('click', () => setMode(currentModeIndex + 1));
document.getElementById('mode-toggle-btn').addEventListener('contextmenu', e => {
    e.preventDefault();
    setMode(currentModeIndex - 1);
});

document.getElementById('mode-dropdown-btn').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('mode-dropdown-menu').classList.toggle('open');
});

document.querySelectorAll('.mode-dropdown-item').forEach(el => {
    el.addEventListener('click', () => {
        const idx = MODES.findIndex(m => m.value === el.dataset.mode);
        document.getElementById('mode-dropdown-menu').classList.remove('open');
        setMode(idx);
    });
});

document.addEventListener('click', () => {
    document.getElementById('mode-dropdown-menu').classList.remove('open');
});

/* ─── Input reactive ──────────────────────────────────── */
document.getElementById('scramble-input').addEventListener('input', draw);

const PLACEHOLDER_HEX = '011233455677|998bbaddcffe';
const PLACEHOLDER_SCHEME = {
    top: '#2a2a2a',
    bottom: '#2a2a2a',
    front: '#2a2a2a',
    right: '#2a2a2a',
    back: '#2a2a2a',
    left: '#2a2a2a',
    slice: '#666666',
};

function draw() {
    const input = document.getElementById('scramble-input').value;
    const size = parseInt(document.getElementById('size-input').value, 10);
    const gap = parseInt(document.getElementById('gap-input').value, 10);
    const mode = MODES[currentModeIndex].value;
    const canvasInner = document.getElementById('canvas-inner');
    const isVertical = document.querySelector('input[name=orientation]:checked').value === 'vertical';
    const showSlice = !document.getElementById("hide-slice").checked;

    if (!input) {
        // Draw placeholder cube with muted gray scheme
        const realScheme = sq1vis.getColorScheme();
        const realPiecesColors = sq1vis.getPiecesColors();
        sq1vis.setColorScheme(PLACEHOLDER_SCHEME);
        const html = sq1vis.getSVG(PLACEHOLDER_HEX, size, gap, isVertical, showSlice);
        sq1vis.setColorScheme({ ...realScheme, slice: null });
        sq1vis.setPiecesColors(realPiecesColors);
        canvasInner.innerHTML = html;
        return;
    }

    try {
        let hex;
        if (mode === 'hex') {
            hex = input;
        } else if (mode === 'inverse') {
            const { tlHex, blHex } = sq1vis.algToHex(sq1vis.invertScramble(sq1vis.unkarnify(input)));
            hex = `${tlHex}|${blHex}`;
        } else {
            // mode = "scramble"
            const { tlHex, blHex } = sq1vis.algToHex(sq1vis.unkarnify(input));
            hex = `${tlHex}|${blHex}`;
        }

        const html = sq1vis.getSVG(hex, size, gap, isVertical, showSlice);
        canvasInner.innerHTML = html;

    } catch (err) {
        canvasInner.innerHTML = `<div class="error-banner">⚠ ${err.message}</div>`;
        console.error(err);
    }
}

/* ─── Export state ────────────────────────────────────── */
let exportLayer = 'both';
let exportFmt = 'svg';
let exportMethod = 'download';

document.querySelectorAll('.export-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const grp = btn.dataset.group;
        document.querySelectorAll(`.export-tab[data-group="${grp}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (grp === 'layer') exportLayer = btn.dataset.val;
        if (grp === 'fmt') exportFmt = btn.dataset.val;
        if (grp === 'method') {
            exportMethod = btn.dataset.val;
            document.getElementById('export-btn-icon').textContent = exportMethod === 'download' ? '↓' : '⎘';
            document.getElementById('export-btn-label').textContent = exportMethod === 'download' ? 'Download' : 'Copy';
        }
    });
});

document.getElementById('do-export').addEventListener('click', () => doExport());

/* ─── Keyboard shortcuts ──────────────────────────────── */
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doExport('download'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement !== document.getElementById('scramble-input')) {
        e.preventDefault(); doExport('clipboard');
    }
});

/* ─── Core export ─────────────────────────────────────── */
function getExportSVGString(layer) {
    const size = parseInt(document.getElementById('size-input').value, 10);
    const gap = parseInt(document.getElementById('gap-input').value, 10);
    const isVertical = document.querySelector('input[name=orientation]:checked').value === 'vertical';
    const showSlice = !document.getElementById('hide-slice').checked;
    const input = document.getElementById('scramble-input').value.trim();
    const mode = MODES[currentModeIndex].value;

    if (!input) return null;

    let hex;
    if (mode === 'hex') {
        hex = input;
    } else if (mode === 'inverse') {
        const { tlHex, blHex } = sq1vis.algToHex(sq1vis.invertScramble(sq1vis.unkarnify(input)));
        hex = `${tlHex}|${blHex}`;
    } else {
        // mode = "scramble"
        const { tlHex, blHex } = sq1vis.algToHex(sq1vis.unkarnify(input));
        hex = `${tlHex}|${blHex}`;
    }

    // Render to a temp div so we can grab individual SVGs
    const scaledSize = size * (220 / 400);
    const PAD = Math.round(scaledSize * 0.28);
    const tmp = document.createElement('div');
    tmp.innerHTML = sq1vis.getSVG(hex, size, gap, isVertical, showSlice, PAD);
    const svgs = tmp.querySelectorAll('svg');

    let svgEl;
    if (layer === 'both') {
        const svg0 = svgs[0], svg1 = svgs[1];
        const vb = svg0.getAttribute('viewBox').split(' ').map(parseFloat);
        const vbX = vb[0], vbY = vb[1], vbW = vb[2], vbH = vb[3];

        // The logical (content) size before padding — matches what getSVG uses internally
        const s = Math.round(size * (220 / 400));
        const PAD_TOP = -vbY;           // how far viewBox extends above 0
        const PAD_OTHER = -vbX;           // how far it extends left/right/bottom

        // Recompute margin the same way getSVG does so it matches the preview exactly
        const margin = s * (0.44 * (2 + gap / 100) - 1);

        const inner0 = svg0.innerHTML;
        const inner1 = svg1.innerHTML;

        // Shift content so negative viewBox space becomes positive canvas space
        const g0shift = `translate(${PAD_OTHER}, ${PAD_TOP})`;
        const g1shift = isVertical
            ? `translate(${PAD_OTHER}, ${PAD_TOP + s + margin})`
            : `translate(${PAD_OTHER + s + margin}, ${PAD_TOP})`;

        const totalW = isVertical ? vbW : PAD_OTHER + s + margin + s + PAD_OTHER;
        const totalH = isVertical ? PAD_TOP + s + margin + s + PAD_OTHER : vbH;

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">` +
            `<g transform="${g0shift}">${inner0}</g><g transform="${g1shift}">${inner1}</g></svg>`;
    } else {
        const idx = layer === 'top' ? 0 : 1;
        svgEl = svgs[idx];
        svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return svgEl.outerHTML;
    }
}

async function doExport(methodOverride) {
    const method = methodOverride || exportMethod;
    const input = document.getElementById('scramble-input').value.trim();
    if (!input) { alert('Enter a scramble first.'); return; }

    const svgStr = getExportSVGString(exportLayer);
    if (!svgStr) return;

    const fname = `sq1-${exportLayer}`;

    if (exportFmt === 'svg') {
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        if (method === 'clipboard') {
            await navigator.clipboard.writeText(svgStr);
            flashBtn('SVG Copied!');
        } else {
            triggerDownload(blob, `${fname}.svg`);
        }
        return;
    }

    // Rasterize for PNG / JPEG / BMP
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
    img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        // For JPEG/BMP fill white bg
        const ctx = canvas.getContext('2d');
        if (exportFmt === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const mimeMap = { png: 'image/png', jpeg: 'image/jpeg', bmp: 'image/bmp' };
        const extMap = { png: 'png', jpeg: 'jpg', bmp: 'bmp' };
        const mime = mimeMap[exportFmt] || 'image/png';
        const ext = extMap[exportFmt] || 'png';

        if (exportFmt === 'bmp') {
            const blob = createBMP32(canvas);
            if (method === 'clipboard') {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ 'image/bmp': blob })]);
                    flashBtn('Copied!');
                } catch { alert('Clipboard BMP copy failed — try PNG instead.'); }
            } else {
                triggerDownload(blob, `${fname}.bmp`);
            }
        } else if (method === 'clipboard') {
            canvas.toBlob(async blob => {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
                    flashBtn('Copied!');
                } catch { alert('Clipboard write failed — try PNG or SVG copy.'); }
            }, mime);
        } else {
            canvas.toBlob(blob => triggerDownload(blob, `${fname}.${ext}`), mime);
        }
    };
    img.src = url;
}

function createBMP32(canvas) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const fileHeaderSize = 14;
    const dibHeaderSize = 108;
    const pixelDataSize = w * h * 4;
    const fileSize = fileHeaderSize + dibHeaderSize + pixelDataSize;
    const buf = new ArrayBuffer(fileSize);
    const view = new DataView(buf);
    let o = 0;

    const u8 = (v) => {
        if (o >= fileSize) { console.error('[BMP] u8 overflow at o=', o, 'fileSize=', fileSize); throw new RangeError('u8 overflow'); }
        view.setUint8(o++, v);
    };
    const u16 = (v) => { view.setUint16(o, v, true); o += 2; };
    const u32 = (v) => { view.setUint32(o, v, true); o += 4; };
    const i32 = (v) => { view.setInt32(o, v, true); o += 4; };
    const zer = (n) => { for (let i = 0; i < n; i++) { view.setUint8(o, 0); o++; } };

    // ── File header (14 bytes) ──
    u8(0x42); u8(0x4D); // 'BM'
    u32(fileSize);
    u16(0); u16(0);     // reserved
    u32(fileHeaderSize + dibHeaderSize);

    // ── BITMAPV4HEADER (108 bytes) ──
    u32(dibHeaderSize);
    i32(w);
    i32(-h);            // negative = top-down row order
    u16(1);             // color planes
    u16(32);            // bits per pixel
    u32(3);             // BI_BITFIELDS
    u32(pixelDataSize);
    i32(2835);          // X pixels/meter
    i32(2835);          // Y pixels/meter
    u32(0);             // colors in table
    u32(0);             // important colors
    u32(0x00FF0000);    // R mask
    u32(0x0000FF00);    // G mask
    u32(0x000000FF);    // B mask
    u32(0xFF000000);    // A mask
    u32(0x57696E20);    // color space 'Win '
    zer(36);            // CIEXYZTRIPLE — 9 × FXPT2DOT30 (3 endpoints × 3 coords × 4 bytes)
    zer(12);            // gamma R, G, B (3 × 4 bytes)

    // ── Pixel data (BGRA) ──
    for (let i = 0; i < w * h; i++) {
        const base = i * 4;
        u8(imgData[base + 2]); // B
        u8(imgData[base + 1]); // G
        u8(imgData[base + 0]); // R
        u8(imgData[base + 3]); // A
    }

    return new Blob([buf], { type: 'image/bmp' });
}

function triggerDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function flashBtn(msg) {
    const lbl = document.getElementById('export-btn-label');
    const orig = lbl.textContent;
    lbl.textContent = msg;
    setTimeout(() => lbl.textContent = orig, 1800);
}

/* ─── Init ────────────────────────────────────────── */
draw();
