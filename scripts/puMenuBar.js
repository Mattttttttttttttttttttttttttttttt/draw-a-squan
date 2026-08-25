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

/* Prebuilt vector assets shipped with the app */
export const IMAGE_ASSETS = [
    { label: 'Star', src: './img/assets/star.svg' },
    { label: 'Arrow', src: './img/assets/arrow-right.svg' },
    { label: 'Heart', src: './img/assets/heart.svg' },
    { label: 'Bolt', src: './img/assets/bolt.svg' },
];

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

/* ── Insert panel ── */

function renderInsertPanel(p, tabBtn) {
    positionPanel(tabBtn, 230);
    p.innerHTML = `
        <div class="pm-head">Insert</div>
        <button type="button" class="pm-row" data-ins="text">Text</button>
        <button type="button" class="pm-row" data-ins="cube">New cube layer</button>
        <div class="pm-row pm-hassub" data-ins="image" tabindex="0">
            Image<span class="pm-arrow">▸</span>
            <div class="pm-sub">
                <div class="pm-row pm-hassub2" tabindex="0">
                    From image assets<span class="pm-arrow">▸</span>
                    <div class="pm-sub pm-assets">
                        ${IMAGE_ASSETS.map(a =>
        `<button type="button" class="pm-asset" data-asset="${a.src}" title="${a.label}">
                            <img src="${a.src}" alt="" draggable="false"><span>${a.label}</span>
                          </button>`).join('')}
                    </div>
                </div>
                <button type="button" class="pm-row" data-ins="image-local">From local files…</button>
            </div>
        </div>`;
    $all('[data-ins]', p).forEach(el => {
        el.addEventListener('click', e => {
            if (e.target.closest('.pm-sub')) return;
            const kind = el.dataset.ins;
            if (el.classList.contains('pm-hassub')) return;
            closePanel();
            if (kind === 'text') hooks.insertText();
            else if (kind === 'cube') hooks.insertCube();
            else if (kind === 'image-local') hooks.insertImageLocal();
        });
    });
    $all('.pm-asset', p).forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const asset = IMAGE_ASSETS.find(a => a.src === btn.dataset.asset);
            closePanel();
            if (asset) hooks.insertImageAsset(asset);
        });
    });
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

/* ── View overlays: rulers, grid, coordinates ── */

let rulerTop = null;
let rulerLeft = null;
let markerH = null;
let markerV = null;
let gridEl = null;
let ro = null;
let mmHandler = null;

const TICK_MAJOR = 50;
const TICK_LABEL = 100;

function drawRuler(canvas, horizontal) {
    const vc = $('#viewport-canvas');
    const inner = $('#canvas-inner');
    if (!canvas || !vc || !inner) return;
    const thick = 18;
    const len = horizontal ? vc.clientWidth : vc.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(len * dpr)) {
        canvas.width = Math.round(len * dpr);
        canvas.height = Math.round(thick * dpr);
    }
    canvas.style.width = `${len}px`;
    canvas.style.height = `${thick}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, len, thick);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--surface') || '#16161c';
    ctx.fillRect(0, 0, len, thick);

    const z = 1 / (parseFloat(inner.style.getPropertyValue('--pu-zinv')) || 1);
    const ir = inner.getBoundingClientRect();
    const vcr = vc.getBoundingClientRect();
    const originPx = horizontal ? (ir.left - vcr.left) : (ir.top - vcr.top);

    const cs = getComputedStyle(document.documentElement);
    const cTick = cs.getPropertyValue('--border2') || '#333';
    const cText = cs.getPropertyValue('--muted') || '#888';

    ctx.strokeStyle = cTick.trim();
    ctx.fillStyle = cText.trim();
    ctx.font = '9px monospace';
    ctx.textBaseline = 'top';

    const startLayout = Math.floor((-originPx / z) / TICK_MAJOR) * TICK_MAJOR;
    const endLayout = ((len - originPx) / z);
    for (let L = startLayout; L <= endLayout; L += TICK_MAJOR) {
        const px = originPx + L * z;
        if (px < -1 || px > len + 1) continue;
        const major = ((L % TICK_LABEL) + TICK_LABEL) % TICK_LABEL === 0;
        const tickLen = major ? 9 : 5;
        ctx.beginPath();
        if (horizontal) {
            ctx.moveTo(px + 0.5, thick - tickLen);
            ctx.lineTo(px + 0.5, thick);
            if (major && z * TICK_LABEL > 34) ctx.fillText(String(L), px + 3, 2);
        } else {
            ctx.moveTo(thick - tickLen, px + 0.5);
            ctx.lineTo(thick, px + 0.5);
            if (major && z * TICK_LABEL > 34) {
                ctx.save();
                ctx.translate(2, px + 3);
                ctx.fillText(String(L), 0, 0);
                ctx.restore();
            }
        }
        ctx.stroke();
    }
}

function redrawRulers() {
    if (rulerTop?. isConnected) drawRuler(rulerTop, true);
    if (rulerLeft?.isConnected) drawRuler(rulerLeft, false);
}

function moveMarkers(clientX, clientY) {
    const vc = $('#viewport-canvas');
    if (!vc || !markerH || !markerV) return;
    const r = vc.getBoundingClientRect();
    const inX = clientX >= r.left && clientX <= r.right;
    const inY = clientY >= r.top && clientY <= r.bottom;
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
                    const z = 1 / (parseFloat(inner.style.getPropertyValue('--pu-zinv')) || 1);
                    const ir = inner.getBoundingClientRect();
                    const x = Math.round((e.clientX - ir.left) / z);
                    const y = Math.round((e.clientY - ir.top) / z);
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

function ensureGrid() {
    const inner = $('#canvas-inner');
    if (!inner) return;
    if (!gridEl) {
        gridEl = document.createElement('div');
        gridEl.className = 'pu-grid-overlay';
    }
    if (gridEl.parentElement !== inner) inner.appendChild(gridEl);
    gridEl.style.display = 'block';
}

function teardownGrid() {
    if (gridEl) { gridEl.remove(); gridEl = null; }
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

    api.setView = state => {
        if (state.rulers) ensureRulers();
        else teardownRulers();
        if (state.grid) ensureGrid();
        else teardownGrid();
        if (!state.coords) hooks.onCoords(null);
    };

    return api;
}
