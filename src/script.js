const PLACEHOLDER_HEX = '011233455677|998bbaddcffe';

function buildSchemeGrid() {
    const grid = document.getElementById('scheme-grid');
    grid.innerHTML = '';
    const slots = sq1vis.getColorSlots();
    const scheme = sq1vis.getColorScheme();
    slots.forEach(slot => {
        const row = document.createElement('div');
        row.className = 'scheme-row';
        row.innerHTML = `
          <span class="scheme-face-label">${slot.label}</span>
          <div class="scheme-switch-btn" id="switch-${slot.id}" style="background:${scheme[slot.id]}">
            <input class="scheme-color-input" type="color" value="${scheme[slot.id]}" data-face="${slot.id}" />
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

// ── Style dropdown ──────────────────────────────────────
function buildStyleDropdown() {
    const styles = sq1vis.getStyles();
    const select = document.getElementById('svg-style-select');
    select.innerHTML = '';
    styles.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.index;
        opt.textContent = s.name;
        select.appendChild(opt);
    });
    select.value = sq1vis.getActiveStyleIndex();
    select.addEventListener('change', () => {
        sq1vis.setActiveStyle(parseInt(select.value));
        updateStyleToggles();
        buildSchemeGrid();
        draw();
    });
}

function updateStyleToggles() {
    const style = sq1vis.getActiveStyle();
    const hideSidesRow = document.getElementById('hide-sides-row');
    const hideSliceRow = document.getElementById('hide-slice-row');
    hideSidesRow.style.display = style.hidableSideColor  ? '' : 'none';
    hideSliceRow.style.display = style.hasSliceIndicator ? '' : 'none';
}

buildStyleDropdown();
updateStyleToggles();

document.getElementById('color-scheme-toggle').addEventListener('click', () => {
    const body = document.getElementById('color-scheme-body');
    const arrow = document.querySelector('#color-scheme-toggle .section-arrow');
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    arrow.textContent = open ? '▲' : '▼';
});

/* fill piece color stuff */
// ── Classical / Custom toggle ──────────────────────────
const classicalBtn = document.getElementById('scheme-mode-classical');
const customBtn    = document.getElementById('scheme-mode-custom');
const classicalPanel = document.getElementById('scheme-classical-panel');
const customPanel    = document.getElementById('scheme-custom-panel');
const toolbar = document.getElementById('custom-toolbar');

[classicalBtn, customBtn].forEach(btn => {
    btn.addEventListener('click', () => {
        const isCustom = btn.dataset.mode === 'custom';
        classicalBtn.classList.toggle('active', !isCustom);
        customBtn.classList.toggle('active', isCustom);
        classicalPanel.style.display = isCustom ? 'none' : '';
        customPanel.style.display    = isCustom ? '' : 'none';
        toolbar.style.display     = isCustom ? '' : 'none';
    });
});

// Keys 1/2/3 select recent colors
document.addEventListener('keydown', e => {
    if (['1','2','3'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
        const idx = parseInt(e.key) - 1;
        if (lastUsedColors[idx]) {
            const slot = document.getElementById(`ctb-recent-${idx}`);
            selectRecentColor(lastUsedColors[idx], slot);
        }
    }
});

// ── Undo / Redo disabled state helpers ────────────────
function updateUndoRedo(canUndo, canRedo) {
    document.getElementById('ctb-undo').disabled = !canUndo;
    document.getElementById('ctb-redo').disabled = !canRedo;
}

document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { /* your undo logic */ }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { /* your redo logic */ }
}); 

const fillModeBtn = document.getElementById('fill-mode-btn');
const unfillBtn = document.getElementById('fill-unfill-btn');
const resetBtn = document.getElementById('fill-reset-btn');
const muteBtn = document.getElementById('fill-mute-btn');
const fillColorInput = document.getElementById('fill-color-input');
const fillColorSwitch = document.getElementById('fill-color-switch');

let fillModeActive = false;
let fillResetActive = false;
let muteActive = false;

function activateFill() {
    if (fillResetActive && !fillModeActive) unfillBtn.click();

    fillModeActive = !fillModeActive;
    fillModeBtn.classList.toggle('active', fillModeActive);

    const squans = document.querySelectorAll('.squan');
    if (fillModeActive)
        squans.forEach(div => {div.style.cursor = 'pointer';});
    else {
        squans.forEach(div => {div.style.cursor = 'auto';});
        document.querySelectorAll('.ctb-recent-slot').forEach(s => s.classList.remove('active-recent'));
    }
}

fillModeBtn.addEventListener('click', activateFill);

unfillBtn.addEventListener('click', () => {
    if (fillModeActive && !fillResetActive) fillModeBtn.click();

    fillResetActive = !fillResetActive;
    unfillBtn.classList.toggle('active', fillResetActive);

    const squans = document.querySelectorAll('.squan');
    if (fillResetActive)
        squans.forEach(div => {div.style.cursor = 'pointer';});
    else
        squans.forEach(div => {div.style.cursor = 'auto';});
});

let lastUsedColors = [];
const lastUsedLimit = 3;

// Keep switch color in sync with the native picker
fillColorInput.addEventListener('input', () => {
    fillColorSwitch.style.background = fillColorInput.value;
});

function updateLastUsed() {
    let value = fillColorInput.value;
    if (lastUsedColors.includes(value)) {
        lastUsedColors.splice(lastUsedColors.indexOf(value), 1);
        lastUsedColors.unshift(value);
    } else {
        if (lastUsedColors.length >= lastUsedLimit) lastUsedColors.pop();
        lastUsedColors.unshift(value);
    }
    renderRecentSlots();
}

fillColorInput.addEventListener("blur", () => {
    updateLastUsed();
    if (!fillModeActive) activateFill();
})

function renderRecentSlots() {
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`ctb-recent-${i}`);
    if (lastUsedColors[i]) {
        slot.classList.remove('empty');
        slot.style.background = lastUsedColors[i];
        slot.onclick = () => selectRecentColor(lastUsedColors[i], slot);
    } else {
        slot.classList.add('empty');
        slot.style.background = '';
        slot.onclick = null;
    }
  }
}

function selectRecentColor(hex, slotEl) {
    document.getElementById('fill-color-input').value = hex;
    document.getElementById('fill-color-switch').style.background = hex;
    document.querySelectorAll('.ctb-recent-slot').forEach(s => s.classList.remove('active-recent'));
    slotEl.classList.add('active-recent');
    updateLastUsed();
    if (!fillModeActive) activateFill();
}

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

resetBtn.addEventListener("click", () => {
    sq1vis.resetPiecesColors();
    draw();
});

muteBtn.addEventListener("click", () => {
    muteActive = !muteActive;
    muteBtn.classList.toggle('active', muteActive);
    draw();
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

/* ─── Hide-slice Hide-side color toggle ───────────────────────────── */
document.getElementById('hide-slice').addEventListener('change', draw);
document.getElementById('hide-sides').addEventListener('change', e => {
    sq1vis.setShowSideColors(!e.target.checked);
    buildSchemeGrid();
    draw();
});

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

function draw() {
    const input = document.getElementById('scramble-input').value;
    const size = parseInt(document.getElementById('size-input').value, 10);
    const gap = parseInt(document.getElementById('gap-input').value, 10);
    const mode = MODES[currentModeIndex].value;
    const canvasInner = document.getElementById('canvas-inner');
    const isVertical = document.querySelector('input[name=orientation]:checked').value === 'vertical';
    const showSlice = !document.getElementById("hide-slice").checked;
    const showSides = !document.getElementById("hide-sides").checked;

    if (!input) {
        // Draw placeholder cube with muted gray scheme
        // const realScheme = sq1vis.getColorScheme();
        // const realPiecesColors = sq1vis.getPiecesColors();
        // sq1vis.setColorScheme(PLACEHOLDER_SCHEME);
        const html = sq1vis.getSVG(PLACEHOLDER_HEX, size, gap, true, isVertical, showSlice, showSides);
        // sq1vis.setColorScheme({ ...realScheme, slice: null });
        // sq1vis.setPiecesColors(realPiecesColors);
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

        const html = sq1vis.getSVG(hex, size, gap, muteActive, isVertical, showSlice, showSides);
        canvasInner.innerHTML = html;

    } catch (err) {
        canvasInner.innerHTML = `<div class="error-banner">⚠ ${err.message}</div>`;
        console.error(err);
    }
}

/* ─── Export state ────────────────────────────────────── */
let exportLayer = 'both';
let exportFmt = 'svg';

document.querySelectorAll('.export-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const grp = btn.dataset.group;
        document.querySelectorAll(`.export-tab[data-group="${grp}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (grp === 'layer') exportLayer = btn.dataset.val;
        if (grp === 'fmt') exportFmt = btn.dataset.val;
    });
});

document.getElementById('do-export').addEventListener('click', () => doExport('download'));
document.getElementById('do-copy').addEventListener('click', () => doExport('clipboard'));

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
    const showSides = !document.getElementById("hide-sides").checked;
    const input = document.getElementById('scramble-input').value.trim();
    const mode = MODES[currentModeIndex].value;

    let muted;
    if (!input) {
        muted = true;
        hex = PLACEHOLDER_HEX;
    }
    else {
        muted = muteActive
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
    }

    // Render to a temp div so we can grab individual SVGs
    const scaledSize = size * (220 / 400);
    const PAD = Math.round(scaledSize * 0.28);
    const tmp = document.createElement('div');
    tmp.innerHTML = sq1vis.getSVG(hex, size, gap, muted, isVertical, showSlice, showSides, PAD);
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
    // if (!input) { alert('Enter a scramble first.'); return; }

    const svgStr = getExportSVGString(exportLayer);
    if (!svgStr) return;

    const fname = `sq1-${exportLayer}`;

    if (exportFmt === 'svg') {
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        if (method === 'clipboard') {
            await navigator.clipboard.writeText(svgStr);
            flashBtn('Copied to clipboard!');
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
                    flashBtn('Copied to clipboard!');
                } catch { flashBtn('Failed to copy to clipboard'); }
            } else {
                triggerDownload(blob, `${fname}.bmp`);
            }
        } else if (method === 'clipboard') {
            canvas.toBlob(async blob => {
                try {
                    await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
                    flashBtn('Copied to clipboard!');
                } catch { flashBtn('Failed to copy to clipboard'); }
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
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(flashBtn._t);
    flashBtn._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ─── Init ────────────────────────────────────────── */

// ═══════════════════════════════════════════════════
// ═══ BULK EXPORT ═══════════════════════════════════
// ═══════════════════════════════════════════════════

(function initBulkExport() {

    // ── helpers ──────────────────────────────────────
    function getCurrentSettings() {
        return {
            size:       parseInt(document.getElementById('size-input').value, 10),
            gap:        parseInt(document.getElementById('gap-input').value, 10),
            isVertical: document.querySelector('input[name=orientation]:checked').value === 'vertical',
            showSlice:  !document.getElementById('hide-slice').checked,
            showSides:  !document.getElementById('hide-sides').checked,
            mode:       MODES[currentModeIndex].value,
        };
    }

    function inputToHex(raw, s) {
        const input = raw.trim();
        if (!input) throw new Error('empty');
        if (s.mode === 'hex') return input;
        if (s.mode === 'inverse') {
            const { tlHex, blHex } = sq1vis.algToHex(sq1vis.invertScramble(sq1vis.unkarnify(input)));
            return `${tlHex}|${blHex}`;
        }
        const { tlHex, blHex } = sq1vis.algToHex(sq1vis.unkarnify(input));
        return `${tlHex}|${blHex}`;
    }

    function svgStringForHex(hex, s) {
        const PAD = Math.round(s.size * (220/400) * 0.28);
        const tmp = document.createElement('div');
        tmp.innerHTML = sq1vis.getSVG(hex, s.size, s.gap, muteActive, s.isVertical, s.showSlice, s.showSides, PAD);
        const svgs = tmp.querySelectorAll('svg');
        const svg0 = svgs[0], svg1 = svgs[1];

        const vb    = svg0.getAttribute('viewBox').split(' ').map(parseFloat);
        const vbX   = vb[0], vbY = vb[1], vbW = vb[2], vbH = vb[3];
        const sc    = Math.round(s.size * (220/400));
        const padT  = -vbY, padO = -vbX;
        const margin = sc * (0.44 * (2 + s.gap/100) - 1);

        const g0shift = `translate(${padO},${padT})`;
        const g1shift = s.isVertical
            ? `translate(${padO},${padT + sc + margin})`
            : `translate(${padO + sc + margin},${padT})`;
        const totalW = s.isVertical ? vbW : padO + sc + margin + sc + padO;
        const totalH = s.isVertical ? padT + sc + margin + sc + padO : vbH;

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">` +
               `<g transform="${g0shift}">${svg0.innerHTML}</g>` +
               `<g transform="${g1shift}">${svg1.innerHTML}</g></svg>`;
    }

    async function rasterizeBlob(svgStr, fmt) {
    return new Promise((res, rej) => {
        const img = new Image();
        const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width  = img.naturalWidth  || img.width;
            c.height = img.naturalHeight || img.height;
            const ctx = c.getContext('2d');
            if (fmt === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            if (fmt === 'bmp') { res(createBMP32(c)); return; }
            const mime = fmt === 'jpeg' ? 'image/jpeg' : 'image/png';
            c.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), mime);
        };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img load failed')); };
        img.src = url;
    });
}

    // ── modal wiring ─────────────────────────────────
    const overlay      = document.getElementById('bulk-modal-overlay');
    const closeBtn     = document.getElementById('bulk-modal-close');
    const openBtn      = document.getElementById('bulk-export-btn');
    const tabs         = document.querySelectorAll('.modal-tab');
    const panelText    = document.getElementById('bulk-tab-text');
    const panelXlsx    = document.getElementById('bulk-tab-xlsx');
    const warnOverlay  = document.getElementById('bulk-warn-overlay');
    const warnList     = document.getElementById('bulk-warn-list');
    const warnClose    = document.getElementById('bulk-warn-close');
    const warnCancel   = document.getElementById('bulk-warn-cancel');
    const warnProceed  = document.getElementById('bulk-warn-proceed');
    const dropzone     = document.getElementById('bulk-dropzone');
    const fileInput    = document.getElementById('bulk-xlsx-file');
    const dropLabel    = document.getElementById('bulk-dropzone-label');

    let pendingExportFn = null;
    let loadedXlsxFile  = null;

    openBtn.addEventListener('click', () => overlay.classList.add('open'));
    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panelText.style.display = tab.dataset.tab === 'text' ? '' : 'none';
            panelXlsx.style.display = tab.dataset.tab === 'xlsx' ? '' : 'none';
        });
    });

    // warn modal
    function showWarn(invalids, onProceed) {
        warnList.innerHTML = invalids.map(v => `<li>${v}</li>`).join('');
        warnOverlay.classList.add('open');
        pendingExportFn = onProceed;
    }
    warnClose.addEventListener('click',  () => { warnOverlay.classList.remove('open'); pendingExportFn = null; });
    warnCancel.addEventListener('click', () => { warnOverlay.classList.remove('open'); pendingExportFn = null; });
    warnProceed.addEventListener('click',() => { warnOverlay.classList.remove('open'); if (pendingExportFn) pendingExportFn(); });

    // ── dropzone ─────────────────────────────────────
    dropzone.addEventListener('click',      () => fileInput.click());
    dropzone.addEventListener('dragover',   e  => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave',  ()  => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const f = e.dataTransfer.files[0];
        if (f) setXlsxFile(f);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) setXlsxFile(fileInput.files[0]);
    });

    function setXlsxFile(f) {
        loadedXlsxFile = f;
        dropLabel.textContent = f.name;
    }

    // ── TEXT EXPORT ───────────────────────────────────
    document.getElementById('bulk-text-export').addEventListener('click', () => {
        const lines = document.getElementById('bulk-text-input').value
            .split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return flashBtn('No inputs entered.');

        const s = getCurrentSettings();
        const invalids = [];
        const valid    = [];

        lines.forEach((line, i) => {
            try {
                const hex = inputToHex(line, s);
                valid.push({ label: `line-${i+1}`, hex });
            } catch {
                invalids.push(`Line ${i+1}: "${line}"`);
            }
        });

        const doExportZip = async () => {
            const zip = new JSZip();
            for (const item of valid) {
                try {
                    const svgStr = svgStringForHex(item.hex, s);
                    const blob   = await rasterizeBlob(svgStr, exportFmt === 'svg' ? 'png' : exportFmt);
                    zip.file(`${item.label}.png`, blob);
                } catch { /* skip render errors silently */ }
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            triggerDownload(blob, 'bulk-export.zip');
            overlay.classList.remove('open');
        };

        if (invalids.length) showWarn(invalids, doExportZip);
        else doExportZip();
    });

    // ── XLSX EXPORT ───────────────────────────────────
    async function processXlsx(outputMode) {
    if (!loadedXlsxFile) return flashBtn('No file selected.');
    const s   = getCurrentSettings();
    const fmt = exportFmt === 'svg' ? 'png' : exportFmt; // svg doesn't embed well in xlsx, fallback to png
    const mimeForFmt = { png: 'image/png', jpeg: 'image/jpeg', bmp: 'image/png' }; // bmp→png for xlsx compat
    const extForFmt  = { png: 'png', jpeg: 'jpeg', bmp: 'png' };
    const imgMime    = mimeForFmt[fmt] || 'image/png';
    const imgExt     = extForFmt[fmt]  || 'png';
    const imgContentType = imgMime === 'image/jpeg'
        ? 'image/jpeg'
        : 'image/png';
    const xlsxImgType = imgMime === 'image/jpeg' ? 'jpeg' : 'png';

    const arrayBuf = await loadedXlsxFile.arrayBuffer();
    const wb       = XLSX.read(arrayBuf, { type: 'array' });

    const tasks    = [];
    const invalids = [];

    wb.SheetNames.forEach((sheetName, si) => {
        const ws = wb.Sheets[sheetName];
        if (!ws || !ws['!ref']) return;
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const addr = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[addr];
                if (!cell || cell.v === undefined || cell.v === '') continue;
                const raw = String(cell.v).trim();
                if (!raw) continue;
                try {
                    const hex = inputToHex(raw, s);
                    tasks.push({ sheetIdx: si, sheetName, cellAddr: addr, row: R, col: C, hex, valid: true });
                } catch {
                    invalids.push(`Sheet "${sheetName}" ${addr}: "${raw}"`);
                    tasks.push({ sheetIdx: si, sheetName, cellAddr: addr, row: R, col: C, hex: null, valid: false, rawVal: raw });
                }
            }
        }
    });

    const doExport = async () => {
        // ── Render all images ──────────────────────────────
        // taskImgMap: taskIdx → { blob, uint8, w, h }
        const taskImgMap = new Map();
        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i];
            if (!t.valid) continue;
            try {
                const svgStr = svgStringForHex(t.hex, s);
                const blob   = await rasterizeBlob(svgStr, fmt);
                const abuf   = await blob.arrayBuffer();
                const uint8  = new Uint8Array(abuf);
                // Read dimensions from PNG/JPEG header
                let w = 400, h = 400;
                if (imgExt === 'png') {
                    const dv = new DataView(abuf);
                    w = dv.getUint32(16); h = dv.getUint32(20);
                } else if (imgExt === 'jpeg') {
                    // scan for SOF0/SOF2 marker
                    const dv = new DataView(abuf);
                    let off = 2;
                    while (off < abuf.byteLength - 8) {
                        const marker = dv.getUint16(off);
                        const len    = dv.getUint16(off + 2);
                        if (marker === 0xFFC0 || marker === 0xFFC2) {
                            h = dv.getUint16(off + 5);
                            w = dv.getUint16(off + 7);
                            break;
                        }
                        off += 2 + len;
                    }
                }
                taskImgMap.set(i, { blob, uint8, w, h });
            } catch (e) { console.warn('render failed for task', i, e); }
        }

        if (outputMode === 'zip') {
            const zip = new JSZip();
            for (const [i, img] of taskImgMap) {
                const t = tasks[i];
                zip.file(`${t.sheetName}-${t.cellAddr}.${imgExt}`, img.blob);
            }
            const blob = await zip.generateAsync({ type: 'blob' });
            triggerDownload(blob, 'bulk-export.zip');
            overlay.classList.remove('open');
            return;
        }

        // ── XLSX with embedded images via raw ZIP surgery ──

        // Build clean xlsx — strip valid cell values so image shows over empty cell
        const newWb = XLSX.utils.book_new();
        for (let si = 0; si < wb.SheetNames.length; si++) {
            const sheetName = wb.SheetNames[si];
            const srcWs = wb.Sheets[sheetName];
            if (!srcWs) { XLSX.utils.book_append_sheet(newWb, {}, sheetName); continue; }
            // shallow clone all keys
            const ws = {};
            for (const key of Object.keys(srcWs)) ws[key] = srcWs[key];
            // clear valid task cells
            tasks.filter(t => t.sheetIdx === si && t.valid).forEach(t => {
                ws[t.cellAddr] = { t: 's', v: '' };
            });
            XLSX.utils.book_append_sheet(newWb, ws, sheetName);
        }
        const xlsxBytes = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });

        // Re-open as JSZip for surgery
        const xz = await JSZip.loadAsync(xlsxBytes);

        // ── Helpers ────────────────────────────────────────
        const nsR   = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
        const nsCT  = 'http://schemas.openxmlformats.org/package/2006/content-types';
        const nsDrw = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
        const nsA   = 'http://schemas.openxmlformats.org/drawingml/2006/main';
        const nsRel = 'http://schemas.openxmlformats.org/package/2006/relationships';

        function xmlEscape(s) {
            return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        // Read workbook.xml.rels to find actual sheet filenames
        const wbRelsRaw = await xz.file('xl/_rels/workbook.xml.rels').async('string');
        // Extract all Relationship targets for worksheets
        const sheetTargets = {}; // sheetIndex (0-based) → e.g. "worksheets/sheet1.xml"
        const relMatches = [...wbRelsRaw.matchAll(/<Relationship[^>]+Id="([^"]*)"[^>]+Type="([^"]*)"[^>]+Target="([^"]*)"/g)];
        for (const m of relMatches) {
            const [, id, type, target] = m;
            if (type.endsWith('/worksheet')) {
                // SheetJS orders sheets rId1, rId2... matching SheetNames order
                const num = parseInt(id.replace('rId',''), 10) - 1;
                sheetTargets[num] = target.startsWith('/xl/') ? target.slice(4) : target.startsWith('xl/') ? target.slice(3) : target;
            }
        }

        // Group tasks by sheet
        const bySheet = new Map();
        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i];
            if (!taskImgMap.has(i)) continue;
            if (!bySheet.has(t.sheetIdx)) bySheet.set(t.sheetIdx, []);
            bySheet.get(t.sheetIdx).push({ t, imgData: taskImgMap.get(i), globalIdx: i });
        }

        // Track content-types overrides to add
        const ctOverrides = []; // { partName, contentType }
        const ctDefaults  = []; // { ext, contentType }

        for (const [si, entries] of bySheet) {
            const drawingNum  = si + 1;
            const drawingFile = `drawings/drawing${drawingNum}.xml`;
            const drawingPath = `xl/${drawingFile}`;
            const drawingRelsPath = `xl/drawings/_rels/drawing${drawingNum}.xml.rels`;
            const sheetFile   = sheetTargets[si] || `worksheets/sheet${si+1}.xml`;
            const sheetPath   = `xl/${sheetFile}`;
            const sheetRelsPath = `xl/${sheetFile.replace('worksheets/','worksheets/_rels/').replace('.xml','.xml.rels')}`;

            // ── Add media files ──────────────────────────────
            const drawingRelEntries = []; // { rId, target, imgFile }
            let rIdN = 1;
            for (const { t, imgData, globalIdx } of entries) {
                const imgFile = `image_s${si}_${t.cellAddr}.${imgExt}`;
                xz.file(`xl/media/${imgFile}`, imgData.uint8);
                drawingRelEntries.push({
                    rId: `rId${rIdN++}`,
                    target: `../media/${imgFile}`,
                    t, imgData, globalIdx
                });
            }

            // ── drawing xml ──────────────────────────────────
            let anchors = '';
            let picId = 2;
            for (const { rId, t, imgData } of drawingRelEntries) {
                const emuW = Math.round(imgData.w * 9525);
                const emuH = Math.round(imgData.h * 9525);
                anchors += `<xdr:oneCellAnchor>` +
                    `<xdr:from><xdr:col>${t.col}</xdr:col><xdr:colOff>0</xdr:colOff>` +
                    `<xdr:row>${t.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
                    `<xdr:ext cx="${emuW}" cy="${emuH}"/>` +
                    `<xdr:pic>` +
                    `<xdr:nvPicPr>` +
                    `<xdr:cNvPr id="${picId++}" name="${xmlEscape('img_'+t.cellAddr)}"/>` +
                    `<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>` +
                    `</xdr:nvPicPr>` +
                    `<xdr:blipFill>` +
                    `<a:blip r:embed="${rId}"/>` +
                    `<a:stretch><a:fillRect/></a:stretch>` +
                    `</xdr:blipFill>` +
                    `<xdr:spPr>` +
                    `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${emuW}" cy="${emuH}"/></a:xfrm>` +
                    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
                    `</xdr:spPr>` +
                    `</xdr:pic>` +
                    `<xdr:clientData/>` +
                    `</xdr:oneCellAnchor>`;
            }

            const drawingXml =
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
                `<xdr:wsDr` +
                ` xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"` +
                ` xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"` +
                ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"` +
                `>${anchors}</xdr:wsDr>`;
            xz.file(drawingPath, drawingXml);

            // ── drawing rels ─────────────────────────────────
            const drawingRelsXml =
                `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
                `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
                drawingRelEntries.map(({ rId, target }) =>
                    `<Relationship Id="${rId}"` +
                    ` Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"` +
                    ` Target="${xmlEscape(target)}"/>`
                ).join('') +
                `</Relationships>`;
            xz.file(drawingRelsPath, drawingRelsXml);

            // ── patch sheet xml ──────────────────────────────
            let sheetXml = await xz.file(sheetPath).async('string');

            // Ensure xmlns:r on worksheet element (only if not already there)
            if (!sheetXml.includes('xmlns:r=')) {
                sheetXml = sheetXml.replace(/(<worksheet\b)/, `$1 xmlns:r="${nsR}"`);
            }
            // Remove any existing <drawing .../> tags to avoid duplicates
            sheetXml = sheetXml.replace(/<drawing\b[^>]*\/>/g, '');
            // Remove legacy pageMargins / pageSetup blocks to inject cleanly before </worksheet>
            // Inject <drawing> ref as last child of worksheet (must come after sheetData, after pageMargins etc.)
            const drawingTag = `<drawing r:id="rId_drw${drawingNum}"/>`;
            if (sheetXml.includes('</worksheet>')) {
                sheetXml = sheetXml.replace('</worksheet>', `${drawingTag}</worksheet>`);
            } else {
                sheetXml += drawingTag;
            }
            xz.file(sheetPath, sheetXml);

            // ── patch sheet rels ─────────────────────────────
            let sheetRelsXml;
            const sheetRelsFile = xz.file(sheetRelsPath);
            if (sheetRelsFile) {
                sheetRelsXml = await sheetRelsFile.async('string');
                // Remove any stale drawing relationships
                sheetRelsXml = sheetRelsXml.replace(/<Relationship[^>]*drawing[^>]*\/>/g, '');
            } else {
                sheetRelsXml =
                    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
                    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
            }
            const drawingRelEntry =
                `<Relationship Id="rId_drw${drawingNum}"` +
                ` Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing"` +
                ` Target="../${drawingFile}"/>`;
            sheetRelsXml = sheetRelsXml.replace('</Relationships>', `${drawingRelEntry}</Relationships>`);
            xz.file(sheetRelsPath, sheetRelsXml);

            // Queue content type entries
            ctOverrides.push({
                partName: `/xl/${drawingFile}`,
                contentType: 'application/vnd.openxmlformats-officedocument.drawing+xml'
            });
        }

        // ── Patch [Content_Types].xml ────────────────────────
        let ctXml = await xz.file('[Content_Types].xml').async('string');

        // Add image extension default if missing
        if (!ctXml.includes(`Extension="${imgExt}"`)) {
            ctDefaults.push({ ext: imgExt, contentType: imgContentType });
        }
        for (const { ext, contentType } of ctDefaults) {
            ctXml = ctXml.replace(
                '</Types>',
                `<Default Extension="${ext}" ContentType="${contentType}"/></Types>`
            );
        }
        for (const { partName, contentType } of ctOverrides) {
            if (!ctXml.includes(`PartName="${partName}"`)) {
                ctXml = ctXml.replace(
                    '</Types>',
                    `<Override PartName="${partName}" ContentType="${contentType}"/></Types>`
                );
            }
        }
        xz.file('[Content_Types].xml', ctXml);

        // ── Generate final xlsx blob ─────────────────────────
        const finalBlob = await xz.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        triggerDownload(finalBlob, 'bulk-export.xlsx');
        overlay.classList.remove('open');
    };

    if (invalids.length) showWarn(invalids, doExport);
    else doExport();
}

    document.getElementById('bulk-xlsx-export-zip').addEventListener('click',  () => processXlsx('zip'));
    document.getElementById('bulk-xlsx-export-xlsx').addEventListener('click', () => processXlsx('xlsx'));

})();

draw();