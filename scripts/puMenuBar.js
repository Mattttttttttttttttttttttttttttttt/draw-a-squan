/* ── Enhanced-mode secondary top bar ("ribbon") ─────────────────────────
   Tabs: Workspaces · Insert · View · Export · Data. Each tab opens a
   dropdown panel under the bar, Microsoft-Word style (hovering another tab
   while a panel is open switches to it). Also owns the View overlays:
   screen rulers, workspace grid and live mouse coordinates. */

const TABS = [
    { id: 'workspaces', label: 'Workspaces' },
    { id: 'insert', label: 'Insert' },
    { id: 'view', label: 'View' },
    { id: 'export', label: 'Export' },
    { id: 'data', label: 'Data' },
];

/* Prebuilt vector assets shipped with the app. The actual list lives in
   img/assets/assets.json so new art can be linked without touching code;
   these defaults are only a fallback if the manifest can't be fetched. */
const DEFAULT_ASSETS = [
    { id: 'star', label: 'Star', src: './img/icon-192.png' },
    { id: 'arrow', label: 'Arrow', src: './img/icon-192.png' },
    { id: 'heart', label: 'Heart', src: './img/icon-192.png' },
    { id: 'bolt', label: 'Bolt', src: './img/icon-192.png' },
];

let assetsPromise = null;

function getImageAssets() {
    if (!assetsPromise) {
        assetsPromise = fetch('./img/assets/assets.json')
            .then(r => (r.ok ? r.json() : Promise.reject(new Error('manifest missing'))))
            .then(m => (Array.isArray(m.assets) && m.assets.length ? m.assets : DEFAULT_ASSETS))
            .catch(() => DEFAULT_ASSETS);
    }
    return assetsPromise;
}

let hooks = {};
let api = {};
let activeTab = null;
let floatMenuEl = null;

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return [...(root || document).querySelectorAll(sel)]; }

/* ── generic tiny floating menu ── */

function closeFloatMenu() {
    if (floatMenuEl) {
        floatMenuEl.remove();
        floatMenuEl = null;
    }
}

function showFloatMenu(items, anchorRect) {
    closeFloatMenu();
    floatMenuEl = document.createElement('div');
    floatMenuEl.className = 'pm-floatmenu';
    for (const item of items) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pm-floatitem' + (item.danger ? ' danger' : '');
        btn.textContent = item.label;
        btn.addEventListener('click', e => {
            e.stopPropagation();
            closeFloatMenu();
            closePanel();
            item.fn();
        });
        floatMenuEl.appendChild(btn);
    }
    document.body.appendChild(floatMenuEl);
    const fw = floatMenuEl.offsetWidth;
    const fh = floatMenuEl.offsetHeight;
    let x = Math.min(anchorRect.right - fw, innerWidth - fw - 8);
    let y = anchorRect.bottom + 4;
    if (y + fh > innerHeight - 8) y = anchorRect.top - fh - 4;
    floatMenuEl.style.left = `${Math.max(8, x)}px`;
    floatMenuEl.style.top = `${Math.max(8, y)}px`;
}

document.addEventListener('click', e => {
    if (floatMenuEl && !floatMenuEl.contains(e.target)) closeFloatMenu();
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeFloatMenu(); closePanel(); }
});

/* ── panel plumbing ── */

function panelEl() { return $('#pu-menu-panel'); }

function closePanel() {
    activeTab = null;
    const p = panelEl();
    if (p) {
        p.classList.remove('open');
        p.innerHTML = '';
    }
    $all('.pu-menubar .pm-tab.active').forEach(t => t.classList.remove('active'));
}

function positionPanel(tabBtn, width) {
    const p = panelEl();
    if (!p) return;
    p.style.width = `${width}px`;
    const barRect = $('.pu-menubar').getBoundingClientRect();
    const tabRect = tabBtn.getBoundingClientRect();
    let left = tabRect.left - barRect.left;
    left = Math.max(4, Math.min(left, barRect.width - width - 8));
    p.style.left = `${left}px`;
}

function openPanel(tabId) {
    const tabBtn = $(`.pu-menubar .pm-tab[data-tab="${tabId}"]`);
    if (!tabBtn) return;
    activeTab = tabId;
    $all('.pu-menubar .pm-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    const p = panelEl();
    p.innerHTML = '';
    p.classList.add('open');
    p.style.visibility = 'hidden';
    requestAnimationFrame(() => {
        if (activeTab !== tabId) return; /* closed before render tick */
        switch (tabId) {
            case 'workspaces': renderWorkspacesPanel(p, tabBtn); break;
            case 'insert': renderInsertPanel(p, tabBtn); break;
            case 'view': renderViewPanel(p, tabBtn); break;
            case 'export': renderExportPanel(p, tabBtn); break;
            case 'data': renderDataPanel(p, tabBtn); break;
        }
        p.style.visibility = '';
    });
}

function fmtDate(ts) {
    if (!ts) return '';
    try {
        return new Date(ts).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    } catch (e) { return ''; }
}

/* ── Workspaces panel ── */

async function renderWorkspacesPanel(p, tabBtn) {
    positionPanel(tabBtn, 560);
    p.innerHTML = '<div class="pm-head">Workspaces <span class="pm-hint">auto-saved locally</span></div><div class="pws-grid"><div class="pm-empty">Loading…</div></div>';

    let rows = [];
    try {
        rows = await hooks.listWorkspaces();
    } catch (e) {
        rows = [];
    }
    /* panel may have been closed/replaced while awaiting */
    if (activeTab !== 'workspaces') return;

    const grid = document.createElement('div');
    grid.className = 'pws-grid';

    const addCard = document.createElement('button');
    addCard.type = 'button';
    addCard.className = 'pws-card pws-add';
    addCard.innerHTML = '<span class="pws-plus">+</span><span>Add workspace</span>';
    addCard.addEventListener('click', e => {
        /* stopPropagation keeps the document-level closers from killing the
           menu in the same event that opened it */
        e.stopPropagation();
        showFloatMenu([
            { label: 'New blank workspace', fn: () => hooks.workspaceNew() },
            { label: 'Import from file…', fn: () => hooks.workspaceImportFile() },
        ], addCard.getBoundingClientRect());
    });
    grid.appendChild(addCard);

    for (const ws of rows) {
        const card = document.createElement('div');
        card.className = 'pws-card checker' + (ws.isCurrent ? ' current' : '');
        card.dataset.wsid = ws.id;
        card.title = ws.name;
        const thumb = ws.thumb
            ? `<img src="${ws.thumb}" alt="" draggable="false">`
            : '<span class="pws-nothumb">empty</span>';
        card.innerHTML = `
            <button type="button" class="pws-dot" title="Workspace options">⋮</button>
            <div class="pws-thumb">${thumb}</div>
            <div class="pws-name"></div>
            <div class="pws-date">${fmtDate(ws.updatedAt)}</div>`;
        card.querySelector('.pws-name').textContent = ws.name;
        card.addEventListener('click', e => {
            if (e.target.closest('.pws-dot')) return;
            closePanel();
            hooks.workspaceOpen(ws.id);
        });
        card.querySelector('.pws-dot').addEventListener('click', e => {
            e.stopPropagation();
            showFloatMenu([
                { label: 'Export (.json)', fn: () => hooks.workspaceExport(ws.id) },
                { label: 'Delete', danger: true, fn: () => hooks.workspaceDelete(ws.id) },
            ], e.currentTarget.getBoundingClientRect());
        });
        grid.appendChild(card);
    }

    p.innerHTML = `<div class="pm-head">Workspaces <span class="pm-hint">auto-saved locally</span></div>`;
    p.appendChild(grid);
}

/* ── Insert panel (Image opens a sibling panel — no room for flyouts) ── */

async function renderInsertPanel(p, tabBtn) {
    positionPanel(tabBtn, 230);
    p.innerHTML = `
        <div class="pm-head">Insert</div>
        <button type="button" class="pm-row" data-ins="text">Text</button>
        <button type="button" class="pm-row" data-ins="cube">New cube layer</button>
        <button type="button" class="pm-row pm-hassub" data-ins="image">Image<span class="pm-arrow">▸</span></button>`;
    $('[data-ins=text]', p).addEventListener('click', e => {
        e.stopPropagation();
        closePanel();
        hooks.insertText();
    });
    $('[data-ins=cube]', p).addEventListener('click', e => {
        e.stopPropagation();
        closePanel();
        hooks.insertCube();
    });
    $('[data-ins=image]', p).addEventListener('click', e => {
        e.stopPropagation();
        renderInsertImagePanel(p, tabBtn);
    });
}

async function renderInsertImagePanel(p, tabBtn) {
    positionPanel(tabBtn, 292);
    p.innerHTML = '<div class="pm-head">Insert image</div><div class="pm-empty">Loading…</div>';
    const assets = await getImageAssets();
    if (activeTab !== 'insert') return;

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'pm-row pm-back';
    back.innerHTML = '‹ Back';
    back.addEventListener('click', e => {
        e.stopPropagation();
        renderInsertPanel(p, tabBtn);
    });

    const local = document.createElement('button');
    local.type = 'button';
    local.className = 'pm-row';
    local.textContent = 'From local files…';
    local.addEventListener('click', e => {
        e.stopPropagation();
        closePanel();
        hooks.insertImageLocal();
    });

    const grid = document.createElement('div');
    grid.className = 'pm-assets pm-assets-panel';
    for (const asset of assets) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pm-asset';
        btn.title = asset.label || '';
        const img = document.createElement('img');
        img.src = asset.src;
        img.alt = '';
        img.draggable = false;
        const span = document.createElement('span');
        span.textContent = asset.label || '';
        btn.append(img, span);
        btn.addEventListener('click', ev => {
            ev.stopPropagation();
            closePanel();
            hooks.insertImageAsset({ src: asset.src, label: asset.label });
        });
        grid.appendChild(btn);
    }

    p.innerHTML = `<div class="pm-head">Insert image <span class="pm-hint">prebuilt assets</span></div>`;
    p.append(back, grid, local);
}

/* ── View panel ── */

function viewRow(key, label, desc) {
    const st = hooks.getViewState();
    const on = !!st[key];
    return `<button type="button" class="pm-row pm-toggle${on ? ' on' : ''}" data-view="${key}" title="${desc}">
        <span class="pm-check">${on ? '✓' : ''}</span>${label}</button>`;
}

function renderViewPanel(p, tabBtn) {
    positionPanel(tabBtn, 250);
    p.innerHTML = `<div class="pm-head">View</div>
        ${viewRow('rulers', 'Screen ruler', 'Rulers along the top and left edges that track your mouse')}
        ${viewRow('grid', 'Show grid', 'Grid overlay over the workspace')}
        ${viewRow('coords', 'Mouse coordinates', 'Live mouse coordinates in the bottom bar')}`;
    $all('[data-view]', p).forEach(el => {
        el.addEventListener('click', e => {
            /* the synchronous re-render below detaches this row; without
               stopPropagation the document-level closer sees a target that
               no longer has the panel as an ancestor and slams it shut */
            e.stopPropagation();
            const key = el.dataset.view;
            const next = { ...hooks.getViewState(), [key]: !hooks.getViewState()[key] };
            hooks.setViewState(next);
            api.setView(next);
            renderViewPanel(p, tabBtn);
        });
    });
}

/* ── Export panel ── */

function renderExportPanel(p, tabBtn) {
    positionPanel(tabBtn, 250);
    p.innerHTML = `<div class="pm-head">Export <span class="pm-hint">PNG only in Enhanced Mode</span></div>
        <button type="button" class="pm-row" data-exp="download">Download PNG</button>
        <button type="button" class="pm-row" data-exp="clipboard">Copy to clipboard</button>`;
    $all('[data-exp]', p).forEach(el => {
        el.addEventListener('click', () => {
            closePanel();
            hooks.exportPNG(el.dataset.exp);
        });
    });
}

/* ── Data panel ── */

function renderDataPanel(p, tabBtn) {
    positionPanel(tabBtn, 280);
    p.innerHTML = `<div class="pm-head">Data</div>
        <button type="button" class="pm-row" data-data="export">Export all workspaces…</button>
        <button type="button" class="pm-row" data-data="import">Import all workspaces…</button>
        <button type="button" class="pm-row danger" data-data="wipe">Delete all enhanced-mode data</button>
        <div class="pm-note">Deletes every saved workspace and all Enhanced Mode settings stored on this device.</div>`;
    $all('[data-data]', p).forEach(el => {
        el.addEventListener('click', () => {
            const kind = el.dataset.data;
            if (kind === 'wipe') {
                if (!el.dataset.armed) {
                    el.dataset.armed = '1';
                    el.textContent = 'Click again to confirm deletion';
                    setTimeout(() => {
                        if (el.isConnected) {
                            delete el.dataset.armed;
                            el.textContent = 'Delete all enhanced-mode data';
                        }
                    }, 3000);
                    return;
                }
            }
            closePanel();
            if (kind === 'export') hooks.dataExportAll();
            else if (kind === 'import') hooks.dataImportAll();
            else hooks.dataDeleteAll();
        });
    });
}

/* ── View overlays: rulers, grid, coordinates ──
   Rulers and grid measure from the CENTER of the work area (where the
   cube sits), in layout units, so 0/0 is always the middle of the frame
   and values stay meaningful at any zoom. */

let rulerTop = null;
let rulerLeft = null;
let markerH = null;
let markerV = null;
let gridEl = null;
let ro = null;
let gridRO = null;
let mmHandler = null;

const RULER_THICK = 18;

function viewZ() {
    const inner = $('#canvas-inner');
    if (!inner) return 1;
    return 1 / (parseFloat(inner.style.getPropertyValue('--pu-zinv')) || 1);
}

/* screen-space position of the workspace center, relative to the viewport */
function viewOrigin() {
    const vc = $('#viewport-canvas');
    const inner = $('#canvas-inner');
    if (!vc || !inner) return null;
    const ir = inner.getBoundingClientRect();
    const vr = vc.getBoundingClientRect();
    return { x: ir.left - vr.left + ir.width / 2, y: ir.top - vr.top + ir.height / 2 };
}

/* smallest "1-2-5 ×10ⁿ" step whose on-screen length clears minPx */
function niceStep(minPx, z) {
    for (let k = 0; k < 7; k++) {
        for (const m of [1, 2, 5]) {
            const step = m * Math.pow(10, k);
            if (step * z >= minPx) return step;
        }
    }
    return Math.pow(10, 7);
}

function drawRuler(canvas, horizontal) {
    const vc = $('#viewport-canvas');
    if (!canvas || !vc) return;
    /* the left ruler starts below the top one */
    const len = horizontal ? vc.clientWidth : Math.max(0, vc.clientHeight - RULER_THICK);
    if (len <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = horizontal ? len : RULER_THICK;
    const h = horizontal ? RULER_THICK : len;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
    }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const bg = getComputedStyle(document.body).getPropertyValue('--surface').trim() || '#16161c';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const z = viewZ();
    const org = viewOrigin();
    if (!org) return;
    const cross = horizontal ? org.x : org.y; /* where layout 0 sits on screen */

    const cs = getComputedStyle(document.documentElement);
    const cTick = (cs.getPropertyValue('--border2') || '#333').trim();
    const cText = (cs.getPropertyValue('--muted') || '#888').trim();
    const cAccent = (cs.getPropertyValue('--accent') || '#0ae').trim();

    const minor = niceStep(10, z);
    const major = minor * 5;
    const showLabels = major * z >= 30;

    ctx.font = '9px monospace';
    ctx.textBaseline = 'top';

    const startL = Math.floor((-(horizontal ? cross : cross)) / minor) * minor - minor;
    const endL = (horizontal ? w : h) - cross + minor;
    for (let L = startL; L <= endL; L += minor) {
        const px = Math.round(cross + L * z) + 0.5;
        const isMajor = ((L % major) + major) % major === 0;
        const tickLen = isMajor ? 9 : 5;
        ctx.strokeStyle = L === 0 ? cAccent : cTick;
        ctx.beginPath();
        if (horizontal) {
            ctx.moveTo(px, h - tickLen);
            ctx.lineTo(px, h);
        } else {
            ctx.moveTo(w - tickLen, px);
            ctx.lineTo(w, px);
        }
        ctx.stroke();
        if (isMajor && showLabels && L !== 0) {
            ctx.fillStyle = cText;
            const label = String(L);
            if (horizontal) {
                ctx.textAlign = 'left';
                ctx.fillText(label, px + 3, 2);
            } else {
                ctx.save();
                ctx.translate(2, px + 3);
                ctx.fillText(label, 0, 0);
                ctx.restore();
            }
        }
    }
    /* accent dot marking the workspace center (origin) */
    ctx.strokeStyle = cAccent;
    ctx.fillStyle = cAccent;
    if (cross >= 0 && cross <= (horizontal ? w : h)) {
        if (horizontal) ctx.fillRect(Math.round(cross) - 1, h - 12, 2, 12);
        else ctx.fillRect(w - 12, Math.round(cross) - 1, 12, 2);
    }
}

function redrawRulers() {
    drawRuler(rulerTop, true);
    drawRuler(rulerLeft, false);
}

function moveMarkers(clientX, clientY) {
    const vc = $('#viewport-canvas');
    if (!vc || !markerH || !markerV) return;
    const r = vc.getBoundingClientRect();
    const inX = clientX >= r.left && clientX <= r.right;
    const inY = clientX >= r.top && clientY <= r.bottom;
    markerH.style.display = inX ? 'block' : 'none';
    markerV.style.display = inY ? 'block' : 'none';
    markerH.style.left = `${clientX - r.left}px`;
    markerV.style.top = `${clientY - r.top}px`;
}

function ensureRulers() {
    const vc = $('#viewport-canvas');
    if (!vc) return;
    if (!rulerTop) {
        rulerTop = document.createElement('canvas');
        rulerTop.className = 'pu-ruler pu-ruler-top';
        rulerLeft = document.createElement('canvas');
        rulerLeft.className = 'pu-ruler pu-ruler-left';
        markerH = document.createElement('div');
        markerH.className = 'pu-rmarker pu-rmarker-h';
        markerV = document.createElement('div');
        markerV.className = 'pu-rmarker pu-rmarker-v';
        vc.append(rulerTop, rulerLeft, markerH, markerV);
        ro = new ResizeObserver(redrawRulers);
        ro.observe(vc);
    }
    rulerTop.style.display = '';
    rulerLeft.style.display = '';
    redrawRulers();

    if (!mmHandler) {
        mmHandler = e => {
            moveMarkers(e.clientX, e.clientY);
            if (hooks.getViewState().coords) {
                const inner = $('#canvas-inner');
                if (inner) {
                    const z = viewZ();
                    const org = viewOrigin();
                    const vr = $('#viewport-canvas').getBoundingClientRect();
                    const x = Math.round((e.clientX - vr.left - org.x) / z);
                    const y = Math.round((e.clientY - vr.top - org.y) / z);
                    hooks.onCoords(x, y);
                }
            }
        };
        vc.addEventListener('mousemove', mmHandler);
        vc.addEventListener('mouseleave', () => {
            if (markerH) markerH.style.display = 'none';
            if (markerV) markerV.style.display = 'none';
            hooks.onCoords(null);
        });
    }
}

function teardownRulers() {
    [rulerTop, rulerLeft, markerH, markerV].forEach(el => el && el.remove());
    rulerTop = rulerLeft = markerH = markerV = null;
    if (ro) { ro.disconnect(); ro = null; }
}

/* Adaptive precision grid: drawn over the viewport in screen space with
   lines anchored to layout coordinates. Minor/major spacing picks the
   smallest 1-2-5 step that stays legible, so subdividing increases
   automatically as you zoom in — constant usable density. */
function ensureGrid() {
    const vc = $('#viewport-canvas');
    if (!vc) return;
    if (!gridEl) {
        gridEl = document.createElement('canvas');
        gridEl.className = 'pu-grid-overlay';
        vc.appendChild(gridEl);
        gridRO = new ResizeObserver(drawGrid);
        gridRO.observe(vc);
    }
    drawGrid();
}

function drawGrid() {
    const vc = $('#viewport-canvas');
    if (!gridEl || !vc) return;
    const w = vc.clientWidth;
    const h = vc.clientHeight;
    if (w <= 0 || h <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (gridEl.width !== Math.round(w * dpr) || gridEl.height !== Math.round(h * dpr)) {
        gridEl.width = Math.round(w * dpr);
        gridEl.height = Math.round(h * dpr);
    }
    gridEl.style.width = `${w}px`;
    gridEl.style.height = `${h}px`;

    const ctx = gridEl.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const z = viewZ();
    const org = viewOrigin();
    if (!org) return;

    const minor = niceStep(11, z);
    const major = minor * 5;
    const cs = getComputedStyle(document.documentElement);
    const cMinor = (cs.getPropertyValue('--accent') || '#0ae').trim();
    const alphaMinor = 0.08;
    const alphaMajor = 0.20;

    const x0 = Math.floor((-org.x / z) / minor) * minor;
    const x1 = (w - org.x) / z;
    const y0 = Math.floor((-org.y / z) / minor) * minor;
    const y1 = (h - org.y) / z;

    ctx.lineWidth = 1;
    for (const orient of ['v', 'h']) {
        const start = orient === 'v' ? x0 : y0;
        const end = orient === 'v' ? x1 : y1;
        for (let L = start; L <= end; L += minor) {
            const px = Math.round((orient === 'v' ? org.x : org.y) + L * z) + 0.5;
            const isMajor = ((L % major) + major) % major === 0;
            ctx.strokeStyle = cMinor;
            ctx.globalAlpha = L === 0 ? 0.55 : (isMajor ? alphaMajor : alphaMinor);
            ctx.beginPath();
            if (orient === 'v') { ctx.moveTo(px, 0); ctx.lineTo(px, h); }
            else { ctx.moveTo(0, px); ctx.lineTo(w, px); }
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
}

function teardownGrid() {
    if (gridEl) { gridEl.remove(); gridEl = null; }
    if (gridRO) { gridRO.disconnect(); gridRO = null; }
}

/* ── public API ── */

export function initPUMenuBar(userHooks) {
    hooks = userHooks;
    const bar = $('.pu-menubar');
    if (!bar) return api;

    bar.innerHTML = TABS.map(t =>
        `<button type="button" class="pm-tab" data-tab="${t.id}">${t.label}</button>`).join('');

    let openTimer = null;
    $all('.pm-tab', bar).forEach(btn => {
        btn.addEventListener('click', () => {
            if (activeTab === btn.dataset.tab) closePanel();
            else openPanel(btn.dataset.tab);
        });
        /* Word ribbon behavior: dragging across tabs while a panel is open
           switches panels without an extra click. */
        btn.addEventListener('mouseenter', () => {
            clearTimeout(openTimer);
            if (activeTab && activeTab !== btn.dataset.tab) {
                openTimer = setTimeout(() => openPanel(btn.dataset.tab), 120);
            }
        });
        btn.addEventListener('mouseleave', () => clearTimeout(openTimer));
    });

    document.addEventListener('click', e => {
        if (!activeTab) return;
        if (e.target.closest('.pu-menubar') || e.target.closest('#pu-menu-panel')
            || e.target.closest('.pm-floatmenu')) return;
        closePanel();
    });

    api.closePanels = closePanel;

    /* re-render rulers + grid (zoom changes, theme swaps, …) */
    api.redrawOverlays = () => {
        if (rulerTop?.isConnected) redrawRulers();
        if (gridEl?.isConnected) drawGrid();
    };

    api.setView = state => {
        if (state.rulers) ensureRulers();
        else teardownRulers();
        if (state.grid) ensureGrid();
        else teardownGrid();
        if (!state.coords) hooks.onCoords(null);
    };

    return api;
}
