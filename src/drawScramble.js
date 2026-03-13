/**
 * Square-1 Scramble Visualizer — Modular Style System
 */

const Square1Visualizer = (() => {

    // =====================================================================
    // === CONSTANTS & DEFAULTS ============================================
    // =====================================================================

    const CORNER_HEX_VALUES = ['1', '3', '5', '7', '9', 'b', 'd', 'f'];

    const DEFAULT_PLACEHOLDER = {
        sticker: '#2a2a2a',
        slice:   '#666666',
        border:  '#000000',
    };

    function defaultPieceColors() {
        return {
            edgeColors: {
                '0': { inner: 'top',    outer: 'back'  },
                '2': { inner: 'top',    outer: 'left'  },
                '4': { inner: 'top',    outer: 'front' },
                '6': { inner: 'top',    outer: 'right' },
                '8': { inner: 'bottom', outer: 'right' },
                'a': { inner: 'bottom', outer: 'front' },
                'c': { inner: 'bottom', outer: 'left'  },
                'e': { inner: 'bottom', outer: 'back'  },
            },
            cornerColors: {
                '1': { top: 'top',    left: 'back',  right: 'left'  },
                '3': { top: 'top',    left: 'left',  right: 'front' },
                '5': { top: 'top',    left: 'front', right: 'right' },
                '7': { top: 'top',    left: 'right', right: 'back'  },
                '9': { top: 'bottom', left: 'back',  right: 'right' },
                'b': { top: 'bottom', left: 'right', right: 'front' },
                'd': { top: 'bottom', left: 'front', right: 'left'  },
                'f': { top: 'bottom', left: 'left',  right: 'back'  },
            },
            sliceColors: { top: 'top', bottom: 'bottom' },
        };
    }

    // =====================================================================
    // === PIECE COLOR STATE ===============================================
    // =====================================================================

    let edgeColors, cornerColors, sliceColors;

    function resetPiecesColors() {
        ({ edgeColors, cornerColors, sliceColors } = defaultPieceColors());
    }
    resetPiecesColors();

    // =====================================================================
    // === STYLE DEFINITIONS ===============================================
    // =====================================================================

    // Resolve a color name like "top" → hex via a colors object,
    // or pass through if it's already a hex string.
    function resolveColor(val, colors) {
        return val.charAt(0) === '#' ? val : (colors[val] ?? val);
    }

    // -----------------------------------------------------------------
    // SAC2'S STYLE
    // -----------------------------------------------------------------
    const SAC2Style = {
        name: "SAC2's Style",
        placeholderScheme: { sticker: '#2a2a2a', slice: '#666666', border: '#000000' },
        source: 'SAC2',
        hidableSideColor: true,
        hasSliceIndicator: true,

        withSideColor: {
            layerScale: 1,
            colorSlots: [
                { id: 'top',    label: 'Top',    default: '#4d4d4d' },
                { id: 'bottom', label: 'Bottom', default: '#FFFFFF' },
                { id: 'front',  label: 'Front',  default: '#CC0000' },
                { id: 'right',  label: 'Right',  default: '#00AA00' },
                { id: 'back',   label: 'Back',   default: '#FF8C00' },
                { id: 'left',   label: 'Left',   default: '#0066CC' },
                { id: 'border', label: 'Border', default: '#000000' },
            ],

            drawEdge(piece, colors, size, muted, ph = DEFAULT_PLACEHOLDER) {
                let innerColor = resolveColor(edgeColors[piece].inner, colors);
                let outerColor = resolveColor(edgeColors[piece].outer, colors);
                if (muted) {
                    const def = defaultPieceColors().edgeColors[piece];
                    if (innerColor === colors[def.inner]) innerColor = ph.sticker;
                    if (outerColor === colors[def.outer]) outerColor = ph.sticker;
                }
                const scale = 54 / 27 * (size / 220);
                const ox = (50.0 / 100) * 27;
                const oy = (117.0 / 100) * 42.61;
                const tx = -ox * scale, ty = -oy * scale;
                return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
                    <path fill="${muted ? ph.border : colors.border}" d="M.11,4.17l2.4,8.97h21.97l2.4-8.97c.56-2.1-1.02-4.17-3.2-4.17H3.31C1.14,0-.45,2.07.11,4.17Z"/>
                    <path fill="${muted ? ph.border : colors.border}" d="M3.05,15.11l6.57,24.52c1.07,3.98,6.71,3.98,7.77,0l6.57-24.52c.56-2.1-1.02-4.17-3.2-4.17H6.24c-2.18,0-3.76,2.07-3.2,4.17Z"/>
                    <path class="sticker" id="${piece} outer" fill="${outerColor}" d="M21.3,10.94c.88,0,1.66-.59,1.88-1.45l.78-2.92.51-1.91c.33-1.24-.6-2.45-1.88-2.45H4.41c-1.28,0-2.22,1.22-1.88,2.45l.51,1.91.78,2.92c.23.85,1,1.45,1.88,1.45h15.6Z"/>
                    <path class="sticker" id="${piece} inner" fill="${innerColor}" d="M19.67,13.14H7.34c-1.28,0-2.22,1.22-1.88,2.45l6.17,23.01c.52,1.93,3.25,1.93,3.77,0l6.17-23.01c.33-1.24-.6-2.45-1.88-2.45Z"/>
                </g>`;
            },

            drawCorner(piece, colors, size, muted, ph = DEFAULT_PLACEHOLDER) {
                let topColor   = resolveColor(cornerColors[piece].top,   colors);
                let leftColor  = resolveColor(cornerColors[piece].left,  colors);
                let rightColor = resolveColor(cornerColors[piece].right, colors);
                if (muted) {
                    const def = defaultPieceColors().cornerColors[piece];
                    if (topColor   === colors[def.top])   topColor   = ph.sticker;
                    if (leftColor  === colors[def.left])  leftColor  = ph.sticker;
                    if (rightColor === colors[def.right]) rightColor = ph.sticker;
                }
                const scale = 96 / 48.5 * (size / 220);
                const ox = (-3.5 / 100) * 48.5;
                const oy = (103.5 / 100) * 48.5;
                const tx = -ox * scale, ty = -oy * scale;
                return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)}) rotate(-45,${ox.toFixed(2)},${oy.toFixed(2)})">
                    <path fill="${muted ? ph.border : colors.border}" d="M10.19,2.45l-2.86,10.68h24.73c1.83,0,3.31,1.48,3.31,3.31v24.73l10.68-2.86c1.45-.39,2.45-1.7,2.45-3.2V3.31c0-1.83-1.48-3.31-3.31-3.31H13.39c-1.5,0-2.81,1.01-3.2,2.45Z"/>
                    <path fill="${muted ? ph.border : colors.border}" d="M7.26,13.39L.25,39.56c-1.41,5.28,3.42,10.11,8.7,8.7l26.16-7.01c1.45-.39,2.45-1.7,2.45-3.2V14.25c0-1.83-1.48-3.31-3.31-3.31H10.46c-1.5,0-2.81,1.01-3.2,2.45Z"/>
                    <path class="sticker" id="${piece} right" fill="${rightColor}" d="M35.2,10.94c.52,0,1.01-.21,1.38-.57l.71-.71,5.72-5.72c.64-.64.19-1.73-.72-1.73H14.03c-.88,0-1.66.59-1.88,1.45l-.78,2.92-.51,1.91c-.33,1.24.6,2.45,1.88,2.45h22.47Z"/>
                    <path class="sticker" id="${piece} left"  fill="${leftColor}"  d="M37.57,35.77c0,1.28,1.22,2.22,2.45,1.88l1.91-.51,2.92-.78c.85-.23,1.45-1,1.45-1.88V6.21c0-.9-1.09-1.36-1.73-.72l-5.72,5.72-.71.71c-.37.37-.57.86-.57,1.38v22.47Z"/>
                    <path class="sticker" id="${piece} top"   fill="${topColor}"   d="M33.92,39.28c.85-.23,1.45-1,1.45-1.88V15.09c0-1.08-.87-1.95-1.95-1.95H11.1c-.88,0-1.66.59-1.88,1.45l-7,26.12c-.91,3.39,2.19,6.49,5.58,5.58l26.12-7Z"/>
                </g>`;
            },

            drawSlice(layer, cx, cy, size, colors, muted, ph = DEFAULT_PLACEHOLDER, relScale = 1.965) {
                const scale = (size / 220) * relScale;
                let topColor = resolveColor(sliceColors.top,    colors);
                let botColor = resolveColor(sliceColors.bottom, colors);
                if (muted) {
                    const def = defaultPieceColors().sliceColors;
                    if (topColor === colors[def.top])    topColor = ph.slice;
                    if (botColor === colors[def.bottom]) botColor = ph.slice;
                }
                const color = layer === 'top' ? topColor : botColor;
                const angle = layer === 'top' ? 0 : -30;
                const tx = (cx + 29.5 / 220 * size).toFixed(2);
                const ty = (cy - 114 / 220 * size).toFixed(2);
                const arrowPath = `<path d="M7.32.86C6.69.13,5.72-.16,4.79.09c-.48.13-.91.4-1.23.77L.61,4.26C-.03,5.01-.18,6.03.23,6.92c.41.9,1.28,1.45,2.26,1.45h5.9c.22,0,.44-.03.65-.08.83-.22,1.47-.85,1.73-1.67.25-.82.07-1.7-.5-2.35L7.32.86Z"/>
                    <path fill="${color}" d="M6.18,1.84c-.26-.3-.65-.4-1-.31-.18.05-.35.15-.49.31l-2.95,3.41c-.55.64-.1,1.63.74,1.63h5.9c.09,0,.18-.01.26-.03.67-.18.97-1.03.48-1.59l-2.95-3.41Z"/>`;
                const transform = `rotate(%ROT%, ${cx}, ${cy}) translate(${tx}, ${ty}) scale(${scale.toFixed(4)}) translate(5.43, 4.19) rotate(-165)`;
                return `<g transform="${transform.replace('%ROT%', angle)}">${arrowPath}</g>` +
                       `<g transform="${transform.replace('%ROT%', angle + 180)}">${arrowPath}</g>`;
            },
        },

        withoutSideColor: {
            layerScale: 0.93,
            colorSlots: [
                { id: 'top',    label: 'Top',    default: '#4d4d4d' },
                { id: 'bottom', label: 'Bottom', default: '#FFFFFF' },
                { id: 'border', label: 'Border', default: '#000000' },
            ],

            drawEdge(piece, colors, size, muted, ph = DEFAULT_PLACEHOLDER) {
                let innerColor = resolveColor(edgeColors[piece].inner, colors);
                if (muted) {
                    const def = defaultPieceColors().edgeColors[piece];
                    if (innerColor === colors[def.inner]) innerColor = ph.sticker;
                }
                const scale = 54 / 27 * (size / 220) * 1.38;
                const ox = (50.0 / 100) * 27;
                const oy = (117.0 / 100) * 42.61;
                const tx = -ox * scale, ty = -oy * scale;
                return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
                    <path fill="${muted ? ph.border : colors.border}" d="M3.05,15.11l6.57,24.52c1.07,3.98,6.71,3.98,7.77,0l6.57-24.52c.56-2.1-1.02-4.17-3.2-4.17H6.24c-2.18,0-3.76,2.07-3.2,4.17Z"/>
                    <path class="sticker" id="${piece} inner" fill="${innerColor}" d="M19.67,13.14H7.34c-1.28,0-2.22,1.22-1.88,2.45l6.17,23.01c.52,1.93,3.25,1.93,3.77,0l6.17-23.01c.33-1.24-.6-2.45-1.88-2.45Z"/>
                </g>`;
            },

            drawCorner(piece, colors, size, muted, ph = DEFAULT_PLACEHOLDER) {
                let topColor = resolveColor(cornerColors[piece].top, colors);
                if (muted) {
                    const def = defaultPieceColors().cornerColors[piece];
                    if (topColor === colors[def.top]) topColor = ph.sticker;
                }
                const scale = 96 / 48.5 * (size / 220) * 1.38;
                const ox = (-3.5 / 100) * 48.5;
                const oy = (103.5 / 100) * 48.5;
                const tx = -ox * scale, ty = -oy * scale;
                return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)}) rotate(-45,${ox.toFixed(2)},${oy.toFixed(2)})">
                    <path fill="${muted ? ph.border : colors.border}" d="M7.26,13.39L.25,39.56c-1.41,5.28,3.42,10.11,8.7,8.7l26.16-7.01c1.45-.39,2.45-1.7,2.45-3.2V14.25c0-1.83-1.48-3.31-3.31-3.31H10.46c-1.5,0-2.81,1.01-3.2,2.45Z"/>
                    <path class="sticker" id="${piece} top" fill="${topColor}" d="M33.92,39.28c.85-.23,1.45-1,1.45-1.88V15.09c0-1.08-.87-1.95-1.95-1.95H11.1c-.88,0-1.66.59-1.88,1.45l-7,26.12c-.91,3.39,2.19,6.49,5.58,5.58l26.12-7Z"/>
                </g>`;
            },

            drawSlice(layer, cx, cy, size, colors, muted, ph = DEFAULT_PLACEHOLDER) {
                return SAC2Style.withSideColor.drawSlice(layer, cx, cy, size, colors, muted, ph, 1.968 * 1.38 / 0.93);
            },
        },
    };

    // -----------------------------------------------------------------
    // ABID'S STYLE
    // -----------------------------------------------------------------
    const AbidStyle = {
        name: "Abid's Style",
        placeholderScheme: { sticker: '#0d0d0dff', slice: '#4e0000ff', border: '#d0d0d0ff' },
        source: 'Abid',
        hidableSideColor: true,
        hasSliceIndicator: true,

        withSideColor: {
            layerScale: 1.64,
            colorSlots: [
                { id: 'top',             label: 'Top',             default: '#000000ff' },
                { id: 'bottom',          label: 'Bottom',          default: '#FFFFFF'   },
                { id: 'front',           label: 'Front',           default: '#CC0000'   },
                { id: 'right',           label: 'Right',           default: '#00AA00'   },
                { id: 'back',            label: 'Back',            default: '#FF8C00'   },
                { id: 'left',            label: 'Left',            default: '#0066CC'   },
                { id: 'border',          label: 'Border',          default: '#333333'   },
                { id: 'slice-indicator', label: 'Slice Indicator', default: '#6f0000ff' },
            ],

            drawEdge(piece, colors, size, muted, ph = DEFAULT_PLACEHOLDER) {
                let innerColor = resolveColor(edgeColors[piece].inner, colors);
                let outerColor = resolveColor(edgeColors[piece].outer, colors);
                if (muted) {
                    const def = defaultPieceColors().edgeColors[piece];
                    if (innerColor === colors[def.inner]) innerColor = ph.sticker;
                    if (outerColor === colors[def.outer]) outerColor = ph.sticker;
                }
                const rOuter = size * 0.4 * 0.7, half = 15;
                const midR = rOuter * 0.8;
                function pt(r, deg) {
                    const rad = deg * Math.PI / 180;
                    return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
                }
                function ps(pts) { return pts.map(p => `${p.x},${p.y}`).join(' '); }
                const pi = { x: 0, y: 0 };
                const pA = pt(rOuter, -half), pB = pt(rOuter, half);
                const pmA = pt(midR, -half),  pmB = pt(midR, half);
                const sw = (size * 0.004).toFixed(2);
                return `<polygon class="sticker" id="${piece} outer" points="${ps([pmA, pA, pB, pmB])}" fill="${outerColor}" stroke="${muted ? ph.border : colors.border}" stroke-width="${sw}"/>` +
                       `<polygon class="sticker" id="${piece} inner" points="${ps([pi, pmA, pmB])}"      fill="${innerColor}" stroke="${muted ? ph.border : colors.border}" stroke-width="${sw}"/>`;
            },

            drawCorner(piece, colors, size, muted, ph = DEFAULT_PLACEHOLDER) {
                let topColor   = resolveColor(cornerColors[piece].top,   colors);
                let leftColor  = resolveColor(cornerColors[piece].left,  colors);
                let rightColor = resolveColor(cornerColors[piece].right, colors);
                if (muted) {
                    const def = defaultPieceColors().cornerColors[piece];
                    if (topColor   === colors[def.top])   topColor   = ph.sticker;
                    if (leftColor  === colors[def.left])  leftColor  = ph.sticker;
                    if (rightColor === colors[def.right]) rightColor = ph.sticker;
                }
                const rOuter = size * 0.4 * 0.7;
                const rApex  = rOuter * 1.366025404;
                const half = 30, sf = 0.80;
                function pt(r, deg) {
                    const rad = deg * Math.PI / 180;
                    return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
                }
                function lerp(a, b, t) {
                    return { x: +((a.x + (b.x - a.x) * t).toFixed(2)), y: +((a.y + (b.y - a.y) * t).toFixed(2)) };
                }
                function ps(pts) { return pts.map(p => `${p.x},${p.y}`).join(' '); }
                const pi  = { x: 0, y: 0 };
                const pOR = pt(rOuter, -half), pAp = pt(rApex, 0), pOL = pt(rOuter, half);
                const psL = lerp(pi, pOL, sf), psR = lerp(pi, pOR, sf), psB = lerp(pi, pAp, sf);
                const swM = (size * 0.004).toFixed(2), swT = (size * 0.003).toFixed(2);
                const col = muted ? ph.border : colors.border;
                return `<polygon class="sticker" id="${piece} left"  points="${ps([pi, pOL, pAp, psB, psL])}" fill="${leftColor}"  stroke="${col}" stroke-width="${swM}"/>` +
                       `<polygon class="sticker" id="${piece} right" points="${ps([pi, psR, psB, pAp, pOR])}" fill="${rightColor}" stroke="${col}" stroke-width="${swM}"/>` +
                       `<polygon class="sticker" id="${piece} top"   points="${ps([pi, psL, psB, psR])}"      fill="${topColor}"   stroke="${col}" stroke-width="${swT}"/>` +
                       `<polygon                                      points="${ps([pi, pOL, pAp, pOR])}"      fill="none"         stroke="${col}" stroke-width="${swM}"/>` +
                       `<line x1="${pAp.x}" y1="${pAp.y}" x2="${psB.x}" y2="${psB.y}" stroke="${col}" stroke-width="${swM}" stroke-linecap="round"/>`;
            },

            drawSlice(layer, cx, cy, size, colors, muted, ph = DEFAULT_PLACEHOLDER) {
                const rOuter  = size * 0.4 * 0.7;
                const ringR   = rOuter + size * 0.4 * 0.4;
                const r       = ringR * 1.20;
                const sw      = (size * 0.008).toFixed(2);
                const color   = muted ? ph.slice : (colors['slice-indicator'] ?? '#6f0000');
                function polarPt(r, deg) {
                    const rad = (deg - 90) * Math.PI / 180;
                    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
                }
                const [a1, a2] = layer === 'top' ? [-15, 165] : [15, 195];
                const p1 = polarPt(r, a1), p2 = polarPt(r, a2);
                return `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="${color}" stroke-width="${sw}"/>`;
            },
        },

        withoutSideColor: {
            layerScale: 1.64,
            colorSlots: [
                { id: 'top',             label: 'Top',             default: '#000000ff' },
                { id: 'bottom',          label: 'Bottom',          default: '#FFFFFF'   },
                { id: 'border',          label: 'Border',          default: '#333333'   },
                { id: 'slice-indicator', label: 'Slice Indicator', default: '#6f0000'   },
            ],

            drawEdge(piece, colors, size, muted, ph = DEFAULT_PLACEHOLDER) {
                let innerColor = resolveColor(edgeColors[piece].inner, colors);
                if (muted) {
                    const def = defaultPieceColors().edgeColors[piece];
                    if (innerColor === colors[def.inner]) innerColor = ph.sticker;
                }
                const rOuter = size * 0.4 * 0.7, half = 15;
                function pt(r, deg) {
                    const rad = deg * Math.PI / 180;
                    return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
                }
                function ps(pts) { return pts.map(p => `${p.x},${p.y}`).join(' '); }
                const pi = { x: 0, y: 0 };
                const pA = pt(rOuter, -half), pB = pt(rOuter, half);
                const sw = (size * 0.004).toFixed(2);
                return `<polygon class="sticker" id="${piece} inner" points="${ps([pi, pA, pB])}" fill="${innerColor}" stroke="${muted ? ph.border : colors.border}" stroke-width="${sw}"/>`;
            },

            drawCorner(piece, colors, size, muted, ph = DEFAULT_PLACEHOLDER) {
                let topColor = resolveColor(cornerColors[piece].top, colors);
                if (muted) {
                    const def = defaultPieceColors().cornerColors[piece];
                    if (topColor === colors[def.top]) topColor = ph.sticker;
                }
                const rOuter = size * 0.4 * 0.7;
                const rApex  = rOuter * 1.366025404;
                const half   = 30;
                function pt(r, deg) {
                    const rad = deg * Math.PI / 180;
                    return { x: +(r * Math.sin(rad)).toFixed(2), y: +(-r * Math.cos(rad)).toFixed(2) };
                }
                function ps(pts) { return pts.map(p => `${p.x},${p.y}`).join(' '); }
                const pi  = { x: 0, y: 0 };
                const pOR = pt(rOuter, -half), pAp = pt(rApex, 0), pOL = pt(rOuter, half);
                const sw  = (size * 0.004).toFixed(2);
                return `<polygon class="sticker" id="${piece} top" points="${ps([pi, pOR, pAp, pOL])}" fill="${topColor}" stroke="${muted ? ph.border : colors.border}" stroke-width="${sw}"/>`;
            },

            drawSlice(layer, cx, cy, size, colors, muted, ph = DEFAULT_PLACEHOLDER) {
                // Reuse withSideColor — same visual, same angles
                return AbidStyle.withSideColor.drawSlice(layer, cx, cy, size, colors, muted, ph);
            },
        },
    };

    // =====================================================================
    // === STYLE REGISTRY ==================================================
    // =====================================================================

    const STYLES = [SAC2Style, AbidStyle];

    // =====================================================================
    // === ACTIVE STYLE STATE ==============================================
    // =====================================================================

    let activeStyleIndex = 0;
    let showSideColors   = true;

    function getActiveVariant() {
        const style = STYLES[activeStyleIndex];
        return showSideColors ? style.withSideColor : style.withoutSideColor;
    }

    function getPlaceholderScheme() {
        return STYLES[activeStyleIndex]?.placeholderScheme ?? DEFAULT_PLACEHOLDER;
    }

    // ── Color overrides ──────────────────────────────────────────────────
    // Keyed by `${styleSource}_${with|without}` → { colorId: hexString }
    const colorOverrides = new Map();

    function variantKey(source, withSides) {
        return `${source}_${withSides ? 'with' : 'without'}`;
    }

    function getResolvedColors() {
        const style    = STYLES[activeStyleIndex];
        const variant  = getActiveVariant();
        const key      = variantKey(style.source, showSideColors);
        const overrides = colorOverrides.get(key) || {};
        const colors   = {};
        for (const slot of variant.colorSlots) {
            colors[slot.id] = overrides[slot.id] ?? slot.default;
        }
        return colors;
    }

    function setColorOverride(slotId, hex) {
        const style = STYLES[activeStyleIndex];
        const key   = variantKey(style.source, showSideColors);
        if (!colorOverrides.has(key)) colorOverrides.set(key, {});
        colorOverrides.get(key)[slotId] = hex;
    }



    // =====================================================================
    // === HEX PARSING & RENDERING =========================================
    // =====================================================================

    function slotCentreAngle(pos, span) {
        return (pos - 1) * 30 + (span * 30) / 2;
    }

    function parseHex(rawHex) {
        const hex = rawHex.replace(/[|/]/, '');
        function parseLayer(chars) {
            const tokens = [];
            let slotPos = 1, i = 0;
            while (i < chars.length) {
                const ch = chars[i].toLowerCase();
                if (CORNER_HEX_VALUES.includes(ch)) {
                    tokens.push({ piece: ch, type: 'corner', position: slotPos });
                    slotPos += 2; i += 2;
                } else {
                    tokens.push({ piece: ch, type: 'edge', position: slotPos });
                    slotPos += 1; i += 1;
                }
            }
            return tokens;
        }
        return { top: parseLayer(hex.slice(0, 12)), bottom: parseLayer(hex.slice(12, 24)) };
    }

    function drawLayer(tokens, isBottom, cx, cy, size, muted) {
        const variant = getActiveVariant();
        const colors  = getResolvedColors();
        const ph      = getPlaceholderScheme();
        const layerScale = variant.layerScale ?? 1;
        let svg = '';
        for (const token of tokens) {
            const span        = token.type === 'corner' ? 2 : 1;
            const layerOffset = isBottom ? -195 : 15;
            const angle       = -slotCentreAngle(token.position, span) + layerOffset;
            const pieceInner  = token.type === 'edge'
                ? variant.drawEdge(token.piece,   colors, size, muted, ph)
                : variant.drawCorner(token.piece, colors, size, muted, ph);
            svg += `<g transform="translate(${cx},${cy}) rotate(${angle.toFixed(2)})">${pieceInner}</g>`;
        }
        if (layerScale !== 1) {
            svg = `<g transform="translate(${cx},${cy}) scale(${layerScale}) translate(${-cx},${-cy})">${svg}</g>`;
        }
        return svg;
    }

    // =====================================================================
    // === MAIN SVG BUILDER ================================================
    // =====================================================================

    function getSVG(rawHex, size = 400, ringDistance = 5, muted, isVert, showSlice, _showSides, exportPad = 0) {
        // _showSides is ignored — controlled via setShowSideColors()
        const hex = rawHex.replace(/[|/]/, '');
        if (hex.length !== 24) throw new Error('Hex must be 24 data characters (plus optional | separator).');

        const parsed  = parseHex(rawHex);
        const variant = getActiveVariant();
        const colors  = getResolvedColors();

        size = size * (220 / 400);
        const cx = size / 2, cy = size / 2;
        const margin = size * (0.44 * (2 + ringDistance / 100) - 1);

        const topApexY = cy - (123.5 / 220) * size;
        const padTop   = exportPad + Math.max(0, Math.ceil(-topApexY + (122 / 220) * size * 0.05));
        const padOther = exportPad;
        const vbX = -padOther, vbY = -padTop;
        const vbW = size + padOther * 2, vbH = size + padTop + padOther;

        const dir = isVert ? 'flex-direction:column;' : 'flex-direction:row;';
        let html = `<div style="display:flex;align-items:center;overflow:visible;padding:2rem;${dir}">`;

        const svgAttrs = `width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" style="overflow:visible;" class="squan"`;
        const gap = isVert ? `margin-top:${margin.toFixed(1)}px;` : `margin-left:${margin.toFixed(1)}px;`;

        html += `<svg ${svgAttrs}>`;
        if (showSlice) html += variant.drawSlice('top', cx, cy, size, colors, muted, getPlaceholderScheme());
        html += drawLayer(parsed.top, false, cx, cy, size, muted);
        html += `</svg>`;

        html += `<svg ${svgAttrs.replace('style="overflow:visible;"', `style="overflow:visible;${gap}"`)}>`;
        if (showSlice) html += variant.drawSlice('bottom', cx, cy, size, colors, muted, getPlaceholderScheme());
        html += drawLayer(parsed.bottom, true, cx, cy, size, muted);
        html += `</svg></div>`;

        return html;
    }

    // =====================================================================
    // === PIECE FILL API ==================================================
    // =====================================================================

    function setPieceColor(id, color) {
        const [piece, sticker] = id.split(' ');
        if (!sticker) throw new Error(`piece id ${id} is not valid.`);
        if (piece === 'slice') {
            sliceColors = { ...sliceColors, [sticker]: color };
        } else if (parseInt(piece, 16) % 2 === 0) {
            edgeColors = { ...edgeColors, [piece]: { ...edgeColors[piece], [sticker]: color } };
        } else {
            cornerColors = { ...cornerColors, [piece]: { ...cornerColors[piece], [sticker]: color } };
        }
    }

    function resetPieceColor(id) {
        const [piece, sticker] = id.split(' ');
        if (!sticker) throw new Error(`piece id ${id} is not valid.`);
        const def = defaultPieceColors();
        if (piece === 'slice') {
            sliceColors = { ...sliceColors, [sticker]: def.sliceColors[sticker] };
        } else if (parseInt(piece, 16) % 2 === 0) {
            edgeColors = { ...edgeColors, [piece]: { ...edgeColors[piece], [sticker]: def.edgeColors[piece][sticker] } };
        } else {
            cornerColors = { ...cornerColors, [piece]: { ...cornerColors[piece], [sticker]: def.cornerColors[piece][sticker] } };
        }
    }

    function getPiecesColors()   { return { edgeColors, cornerColors, sliceColors }; }
function setPiecesColors(pc) { edgeColors = pc.edgeColors; cornerColors = pc.cornerColors; if (pc.sliceColors) sliceColors = pc.sliceColors; }

    // =====================================================================
    // === PUBLIC API ======================================================
    // =====================================================================

    return {
        // Core rendering
        getSVG, parseHex, algToHex, invertScramble, unkarnify,
        // Color scheme
        getColorSlots()  { return getActiveVariant().colorSlots; },
        getColorScheme() { return getResolvedColors(); },
        setColorScheme(partial) { for (const [id, hex] of Object.entries(partial)) setColorOverride(id, hex); },
        // Style system
        getStyles()          { return STYLES.map((s, i) => ({ name: s.name, source: s.source, index: i })); },
        getActiveStyleIndex(){ return activeStyleIndex; },
        setActiveStyle(i)    { activeStyleIndex = i; },
        getActiveStyle()     { return STYLES[activeStyleIndex]; },
        setShowSideColors(v) { showSideColors = v; },
        getShowSideColors()  { return showSideColors; },
        // Piece fill
        setPieceColor, resetPieceColor, resetPiecesColors, getPiecesColors, setPiecesColors,
    };

})();

if (typeof window !== 'undefined') window.sq1vis = Square1Visualizer;