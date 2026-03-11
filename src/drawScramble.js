/**
 * Square-1 Scramble Visualizer — Modular Style System
 */

const Square1Visualizer = (() => {

    // === CONSTANTS ===
    const CORNER_HEX_VALUES = ['1', '3', '5', '7', '9', 'b', 'd', 'f'];

    const PLACEHOLDER_SCHEME = {
        sticker: '#2a2a2a',
        slice: '#666666',
    };

    // === PIECE COLOR STATE ===
    let edgeColors, cornerColors, sliceColors;

    function defaultPieceColors() {
        return {
            edgeColors: {
                '0':  { inner: "top", outer: "back" },
                '2':  { inner: "top", outer: "left" },
                '4':  { inner: "top", outer: "front" },
                '6':  { inner: "top", outer: "right" },
                '8':  { inner: "bottom", outer: "right" },
                'a':  { inner: "bottom", outer: "front" },
                'c':  { inner: "bottom", outer: "left" },
                'e':  { inner: "bottom", outer: "back" }
            },
            cornerColors: {
                '1': { top: "top", left: "back",  right: "left"  },
                '3': { top: "top", left: "left",  right: "front" },
                '5': { top: "top", left: "front", right: "right" },
                '7': { top: "top", left: "right", right: "back"  },
                '9': { top: "bottom", left: "back",  right: "right" },
                'b': { top: "bottom", left: "right", right: "front" },
                'd': { top: "bottom", left: "front", right: "left"  },
                'f': { top: "bottom", left: "left",  right: "back"  }
            },
            sliceColors: { top: "top", bottom: "bottom" }
        };
    }

    function resetPiecesColors() {
        const s = defaultPieceColors();
        edgeColors   = s.edgeColors;
        cornerColors = s.cornerColors;
        sliceColors  = s.sliceColors;
    }
    resetPiecesColors();

    // =====================================================================
    // === STYLE DEFINITIONS ===============================================
    // =====================================================================

    // Helper: resolve a color name like "top" → hex via a colors object,
    // or pass through if already a hex string.
    function resolveColor(val, colors) {
        if (val.charAt(0) === '#') return val;
        return colors[val] ?? val;
    }

    // -----------------------------------------------------------------
    // SAC2'S STYLE
    // -----------------------------------------------------------------
    const SAC2Style = {
        name: "SAC2's Style",
        source: "SAC2",
        hidableSideColor: true,
        hasSliceIndicator: true,

        withSideColor: {
            colorSlots: [
                { id: "top",    label: "Top",    default: "#4d4d4d" },
                { id: "bottom", label: "Bottom", default: "#FFFFFF" },
                { id: "front",  label: "Front",  default: "#CC0000" },
                { id: "right",  label: "Right",  default: "#00AA00" },
                { id: "back",   label: "Back",   default: "#FF8C00" },
                { id: "left",   label: "Left",   default: "#0066CC" },
                { id: "border", label: "Border", default: "#000000" },
            ],

            drawEdge(piece, colors, size, muted) {
                let innerColor = resolveColor(edgeColors[piece].inner, colors);
                let outerColor = resolveColor(edgeColors[piece].outer, colors);
                if (muted) {
                    const def = defaultPieceColors().edgeColors[piece];
                    if (innerColor === colors[def.inner]) innerColor = PLACEHOLDER_SCHEME.sticker;
                    if (outerColor === colors[def.outer]) outerColor = PLACEHOLDER_SCHEME.sticker;
                }
                const scale = 54 / 27 * (size / 220);
                const ox = (50.0 / 100) * 27;
                const oy = (117.0 / 100) * 42.61;
                const tx = -ox * scale, ty = -oy * scale;
                return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
                    <path fill="${colors.border}" d="M.11,4.17l2.4,8.97h21.97l2.4-8.97c.56-2.1-1.02-4.17-3.2-4.17H3.31C1.14,0-.45,2.07.11,4.17Z"/>
                    <path fill="${colors.border}" d="M3.05,15.11l6.57,24.52c1.07,3.98,6.71,3.98,7.77,0l6.57-24.52c.56-2.1-1.02-4.17-3.2-4.17H6.24c-2.18,0-3.76,2.07-3.2,4.17Z"/>
                    <path class="sticker" id="${piece} outer" fill="${outerColor}" d="M21.3,10.94c.88,0,1.66-.59,1.88-1.45l.78-2.92.51-1.91c.33-1.24-.6-2.45-1.88-2.45H4.41c-1.28,0-2.22,1.22-1.88,2.45l.51,1.91.78,2.92c.23.85,1,1.45,1.88,1.45h15.6Z"/>
                    <path class="sticker" id="${piece} inner" fill="${innerColor}" d="M19.67,13.14H7.34c-1.28,0-2.22,1.22-1.88,2.45l6.17,23.01c.52,1.93,3.25,1.93,3.77,0l6.17-23.01c.33-1.24-.6-2.45-1.88-2.45Z"/>
                </g>`;
            },

            drawCorner(piece, colors, size, muted) {
                let topColor   = resolveColor(cornerColors[piece].top,   colors);
                let leftColor  = resolveColor(cornerColors[piece].left,  colors);
                let rightColor = resolveColor(cornerColors[piece].right, colors);
                if (muted) {
                    const def = defaultPieceColors().cornerColors[piece];
                    if (topColor   === colors[def.top])   topColor   = PLACEHOLDER_SCHEME.sticker;
                    if (leftColor  === colors[def.left])  leftColor  = PLACEHOLDER_SCHEME.sticker;
                    if (rightColor === colors[def.right]) rightColor = PLACEHOLDER_SCHEME.sticker;
                }
                const scale = 96 / 48.5 * (size / 220);
                const ox = (-3.5 / 100) * 48.5;
                const oy = (103.5 / 100) * 48.5;
                const tx = -ox * scale, ty = -oy * scale;
                return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)}) rotate(-45,${ox.toFixed(2)},${oy.toFixed(2)})">
                    <path fill="${colors.border}" d="M10.19,2.45l-2.86,10.68h24.73c1.83,0,3.31,1.48,3.31,3.31v24.73l10.68-2.86c1.45-.39,2.45-1.7,2.45-3.2V3.31c0-1.83-1.48-3.31-3.31-3.31H13.39c-1.5,0-2.81,1.01-3.2,2.45Z"/>
                    <path fill="${colors.border}" d="M7.26,13.39L.25,39.56c-1.41,5.28,3.42,10.11,8.7,8.7l26.16-7.01c1.45-.39,2.45-1.7,2.45-3.2V14.25c0-1.83-1.48-3.31-3.31-3.31H10.46c-1.5,0-2.81,1.01-3.2,2.45Z"/>
                    <path class="sticker" id="${piece} right" fill="${rightColor}" d="M35.2,10.94c.52,0,1.01-.21,1.38-.57l.71-.71,5.72-5.72c.64-.64.19-1.73-.72-1.73H14.03c-.88,0-1.66.59-1.88,1.45l-.78,2.92-.51,1.91c-.33,1.24.6,2.45,1.88,2.45h22.47Z"/>
                    <path class="sticker" id="${piece} left" fill="${leftColor}" d="M37.57,35.77c0,1.28,1.22,2.22,2.45,1.88l1.91-.51,2.92-.78c.85-.23,1.45-1,1.45-1.88V6.21c0-.9-1.09-1.36-1.73-.72l-5.72,5.72-.71.71c-.37.37-.57.86-.57,1.38v22.47Z"/>
                    <path class="sticker" id="${piece} top" fill="${topColor}" d="M33.92,39.28c.85-.23,1.45-1,1.45-1.88V15.09c0-1.08-.87-1.95-1.95-1.95H11.1c-.88,0-1.66.59-1.88,1.45l-7,26.12c-.91,3.39,2.19,6.49,5.58,5.58l26.12-7Z"/>
                </g>`;
            },

            drawSlice(layer, cx, cy, size, colors, muted) {
                const scale = (size / 220) * 1.965;
                let topColor = resolveColor(sliceColors.top,    colors);
                let botColor = resolveColor(sliceColors.bottom, colors);
                if (muted) {
                    const def = defaultPieceColors().sliceColors;
                    if (topColor === colors[def.top])    topColor = PLACEHOLDER_SCHEME.slice;
                    if (botColor === colors[def.bottom]) botColor = PLACEHOLDER_SCHEME.slice;
                }
                if (layer === "top") {
                    return `<g transform="translate(${(cx - 42/220*size).toFixed(2)},${(cy - 123.5/220*size).toFixed(2)}) scale(${scale.toFixed(4)})">
                        <path d="M42.56,3.6c-.16-.97-.86-1.73-1.81-1.99L35.06.09c-.21-.06-.43-.09-.65-.09-.86,0-1.64.44-2.1,1.17-.46.73-.5,1.63-.13,2.4l1.97,4.05c.42.86,1.28,1.4,2.24,1.4.5,0,.98-.15,1.39-.43l3.73-2.53c.82-.55,1.22-1.5,1.06-2.47Z"/>
                        <path d="M8.45,116.55c-.42-.86-1.28-1.4-2.24-1.4-.5,0-.98.15-1.39.43l-3.73,2.53c-.82.55-1.22,1.5-1.06,2.47.16.97.86,1.73,1.81,1.99l5.7,1.53c.21.06.43.09.65.09.86,0,1.64-.44,2.1-1.17.46-.73.5-1.63.13-2.4l-1.97-4.05Z"/>
                        <path class="sticker" id="slice top" fill="${topColor}" d="M40.37,3.06l-5.7-1.53c-.09-.02-.18-.04-.26-.04-.69,0-1.21.74-.88,1.42l1.97,4.05c.17.35.52.55.89.55.19,0,.38-.05.55-.17l3.73-2.53c.7-.47.52-1.55-.3-1.77Z"/>
                        <path class="sticker" id="slice top" fill="${topColor}" d="M7.1,117.2c-.17-.35-.52-.55-.89-.55-.19,0-.38.05-.55.17l-3.73,2.53c-.7.47-.52,1.55.3,1.77l5.7,1.53c.09.02.18.04.26.04.69,0,1.21-.74.88-1.42l-1.97-4.05Z"/>
                    </g>`;
                } else {
                    return `<g transform="translate(${(cx - 98/220*size).toFixed(2)},${(cy - 86/220*size).toFixed(2)}) scale(${scale.toFixed(4)}) rotate(-30)">
                        <path d="M42.56,3.6c-.16-.97-.86-1.73-1.81-1.99L35.06.09c-.21-.06-.43-.09-.65-.09-.86,0-1.64.44-2.1,1.17-.46.73-.5,1.63-.13,2.4l1.97,4.05c.42.86,1.28,1.4,2.24,1.4.5,0,.98-.15,1.39-.43l3.73-2.53c.82-.55,1.22-1.5,1.06-2.47Z"/>
                        <path d="M8.45,116.55c-.42-.86-1.28-1.4-2.24-1.4-.5,0-.98.15-1.39.43l-3.73,2.53c-.82.55-1.22,1.5-1.06,2.47.16.97.86,1.73,1.81,1.99l5.7,1.53c.21.06.43.09.65.09.86,0,1.64-.44,2.1-1.17.46-.73.5-1.63.13-2.4l-1.97-4.05Z"/>
                        <path class="sticker" id="slice bottom" fill="${botColor}" d="M40.37,3.06l-5.7-1.53c-.09-.02-.18-.04-.26-.04-.69,0-1.21.74-.88,1.42l1.97,4.05c.17.35.52.55.89.55.19,0,.38-.05.55-.17l3.73-2.53c.7-.47.52-1.55-.3-1.77Z"/>
                        <path class="sticker" id="slice bottom" fill="${botColor}" d="M7.1,117.2c-.17-.35-.52-.55-.89-.55-.19,0,.38.05-.55.17l-3.73,2.53c-.7.47-.52,1.55.3,1.77l5.7,1.53c.09.02.18.04.26.04.69,0,1.21-.74.88-1.42l-1.97-4.05Z"/>
                    </g>`;
                }
            }
        },

        withoutSideColor: {
    colorSlots: [
        { id: "top",    label: "Top",    default: "#4d4d4d" },
        { id: "bottom", label: "Bottom", default: "#FFFFFF" },
        { id: "border", label: "Border", default: "#000000" },
    ],

    drawEdge(piece, colors, size, muted) {
        let innerColor = resolveColor(edgeColors[piece].inner, colors);
        if (muted) {
            const def = defaultPieceColors().edgeColors[piece];
            if (innerColor === colors[def.inner]) innerColor = PLACEHOLDER_SCHEME.sticker;
        }
        const scale = 54 / 27 * (size / 220) * 1.38;
        const ox = (50.0 / 100) * 27;
        const oy = (117.0 / 100) * 42.61;
        const tx = -ox * scale, ty = -oy * scale;
        return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
            <path fill="${colors.border}" d="M3.05,15.11l6.57,24.52c1.07,3.98,6.71,3.98,7.77,0l6.57-24.52c.56-2.1-1.02-4.17-3.2-4.17H6.24c-2.18,0-3.76,2.07-3.2,4.17Z"/>
            <path class="sticker" id="${piece} inner" fill="${innerColor}" d="M19.67,13.14H7.34c-1.28,0-2.22,1.22-1.88,2.45l6.17,23.01c.52,1.93,3.25,1.93,3.77,0l6.17-23.01c.33-1.24-.6-2.45-1.88-2.45Z"/>
        </g>`;
    },

    drawCorner(piece, colors, size, muted) {
        let topColor = resolveColor(cornerColors[piece].top, colors);
        if (muted) {
            const def = defaultPieceColors().cornerColors[piece];
            if (topColor === colors[def.top]) topColor = PLACEHOLDER_SCHEME.sticker;
        }
        const scale = 96 / 48.5 * (size / 220) * 1.38;
        const ox = (-3.5 / 100) * 48.5;
        const oy = (103.5 / 100) * 48.5;
        const tx = -ox * scale, ty = -oy * scale;
        return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)}) rotate(-45,${ox.toFixed(2)},${oy.toFixed(2)})">
            <path fill="${colors.border}" d="M7.26,13.39L.25,39.56c-1.41,5.28,3.42,10.11,8.7,8.7l26.16-7.01c1.45-.39,2.45-1.7,2.45-3.2V14.25c0-1.83-1.48-3.31-3.31-3.31H10.46c-1.5,0-2.81,1.01-3.2,2.45Z"/>
            <path class="sticker" id="${piece} top" fill="${topColor}" d="M33.92,39.28c.85-.23,1.45-1,1.45-1.88V15.09c0-1.08-.87-1.95-1.95-1.95H11.1c-.88,0-1.66.59-1.88,1.45l-7,26.12c-.91,3.39,2.19,6.49,5.58,5.58l26.12-7Z"/>
        </g>`;
    },

    drawSlice(layer, cx, cy, size, colors, muted) {
        return SAC2Style.withSideColor.drawSlice(layer, cx, cy, size, colors, muted);
    }
},
    };

    // =====================================================================
    // === STYLE REGISTRY ==================================================
    // =====================================================================

    const STYLES = [SAC2Style];

    // =====================================================================
    // === ACTIVE STYLE STATE ==============================================
    // =====================================================================

    let activeStyleIndex = 0;
    let showSideColors   = true;  // toggled by the "Hide side colors" checkbox

    function getActiveVariant() {
        const style = STYLES[activeStyleIndex];
        return showSideColors ? style.withSideColor : style.withoutSideColor;
    }

    // Runtime color overrides per variant.
    // Structure: Map keyed by `${styleSource}_${variantKey}` → { colorId: hexString }
    const colorOverrides = new Map();

    function variantKey(styleSource, withSides) {
        return `${styleSource}_${withSides ? 'with' : 'without'}`;
    }

    function getResolvedColors() {
        const style   = STYLES[activeStyleIndex];
        const variant = getActiveVariant();
        const key     = variantKey(style.source, showSideColors);
        const overrides = colorOverrides.get(key) || {};
        const colors = {};
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
    // === SCRAM OPERATORS (unchanged) =====================================
    // =====================================================================

    function algToHex(scramble) {
        let tlHex = '011233455677';
        let blHex = '998bbaddcffe';
        const moves = parseScramble(scramble);
        for (const move of moves) {
            if (move.type === 'twist') {
                const result = twist(tlHex, blHex);
                tlHex = result.tlHex; blHex = result.blHex;
            } else if (move.type === 'turn') {
                tlHex = cycleLeft(tlHex, move.top);
                blHex = cycleLeft(blHex, move.bottom);
            }
        }
        return { tlHex, blHex };
    }

    function parseScramble(scramble) {
        const moves = [];
        const normalized = scramble.replace(/\//g, ' / ');
        const parts = normalized.trim().split(/\s+/).filter(p => p.length > 0);
        for (const part of parts) {
            if (part === '/') {
                moves.push({ type: 'twist' });
            } else if (part.includes(',')) {
                const cleaned = part.replace(/[()]/g, '');
                const [top, bottom] = cleaned.split(',').map(n => parseInt(n.trim()));
                if (!isNaN(top) && !isNaN(bottom)) moves.push({ type: 'turn', top, bottom });
            }
        }
        return moves;
    }

    function twist(tlHex, blHex) {
        return { tlHex: tlHex.slice(0, 6) + blHex.slice(0, 6), blHex: tlHex.slice(6) + blHex.slice(6) };
    }

    function cycleLeft(hex, places) {
        const n = ((places % 12) + 12) % 12;
        return hex.slice(n) + hex.slice(0, n);
    }

    function invertScramble(scrambleString) {
        if (!scrambleString) return scrambleString;
        let str = String(scrambleString).trim();
        const parts = str.split('/');
        const reversed = parts.slice().reverse();
        const inverted = reversed.map(part => {
            part = part.trim();
            const turnMatch = part.match(/\(([^)]+)\)/);
            if (turnMatch) {
                const values = turnMatch[1].split(',').map(v => v.trim());
                const invertedValues = values.map(v => { const num = parseInt(v); return isNaN(num) ? v : String(-num); });
                return '(' + invertedValues.join(',') + ')';
            }
            if (part.includes(',')) {
                const values = part.split(',').map(v => v.trim());
                const invertedValues = values.map(v => { const num = parseInt(v); return isNaN(num) ? v : String(-num); });
                return invertedValues.join(',');
            }
            return part;
        });
        return inverted.join('/');
    }

    function dictReplace(str, dict) {
        const pattern = new RegExp(Object.keys(dict).join("|"), "g");
        while (str.replace(pattern, match => dict[match]) !== str)
            str = str.replace(pattern, match => dict[match]);
        return str;
    }

    const karnToWCA = {
        " U4 ": " U U' U U' "," U4' ": " U' U U' U "," D4 ": " D D' D D' "," D4' ": " D' D D' D ",
        " u4 ": " u u' u u' "," u4' ": " u' u u' u "," d4 ": " d d' d d' "," d4' ": " d' d d' d ",
        " U3 ": " U U' U "," U3' ": " U' U U' "," D3 ": " D D' D "," D3' ": " D' D D' ",
        " u3 ": " u u' u "," u3' ": " u' u u' "," d3 ": " d d' d "," d3' ": " d' d d' ",
        " F3 ": " F F' F "," F3' ": " F' F F' "," f3 ": " f f' f "," f3' ": " f' f f' ",
        " W ": " U U' "," W' ": " U' U "," B ": " D D' "," B' ": " D' D ",
        " w ": " u u' "," w' ": " u' u "," b ": " d d' "," b' ": " d' d ",
        " F2 ": " F F' "," F2' ": " F' F "," f2 ": " f f' "," f2' ": " f' f ",
        " UU ": " U U "," UU' ": " U' U' "," DD ": " D D "," DD' ": " D' D' ",
        " U2 ": " 6,0 "," U2D ": " 6,3 "," U2D' ": " 6,-3 "," U2D2 ": " 6,6 ",
        " D2 ": " 0,6 "," UD2 ": " 3,6 "," U'D2 ": " -3,6 ",
        " U ": " 3,0 "," U' ": " -3,0 "," D ": " 0,3 "," D' ": " 0,-3 ",
        " E ": " 3,-3 "," E' ": " -3,3 "," e ": " 3,3 "," e' ": " -3,-3 ",
        " u ": " 2,-1 "," u' ": " -2,1 "," d ": " -1,2 "," d' ": " 1,-2 ",
        " F' ": " -4,-1 "," F ": " 4,1 "," f' ": " -1,-4 "," f ": " 1,4 ",
        " T ": " 2,-4 "," T' ": " -2,4 "," t' ": " -4,2 "," t ": " 4,-2 ",
        " m ": " 2,2 "," m' ": " -2,-2 "," M' ": " -1,-1 "," M ": " 1,1 ",
        " u2 ": " 5,-1 "," u2' ": " -5,1 "," d2 ": " -1,5 "," d2' ": " 1,-5 ",
        " K' ": " -5,-2 "," K ": " 5,2 "," k ": " 2,5 "," k' ": " -2,-5 ",
    };

    const shorthandToKarn = {
        "bjj": "/U' e D'/","fjj": "/U e' D/","bpj10": "/d m' U/","bpj0-1": "/u' m D'/",
        "fpj10": "/u m' D/","fpj0-1": "/d' m U'/","nn": "/E E'/","aa10": "/u m' u T'/",
        "aa0-1": "/U m' U t'/","fadj10": "/D M' d'/","dadj10": "/D M' d'/","fadj0-1": "/U' M u/",
        "u'adj0-1": "/U' M u/","badj10": "/U M u'/","uadj10": "/U M u'/","badj0-1": "/D' M d/",
        "d'adj0-1": "/D' M d/","bb10": "/T u' e U'/","bb0-1": "/t d e' D/",
        "fdd10": "/D e' d t/","fdd0-1": "/U' e u' T/","bdd10": "/U e' u T'/","bdd0-1": "/D' e d' t'/",
        "ff10": "/d m' d M E/","fv10": "/d4/","fv0-1": "/d4'/","vf10": "/u4/","vf0-1": "/u4'/",
        "jf10": "/w D' u T'/","jf0-1": "/w' D u' T/","fj10": "/b U' d t/","fj0-1": "/b' U d' t'/",
        "jr00": "/e' w e/","jr10": "/e' b e/","jr0-1": "/e' w' e/","jr1-1": "/e' b' e/",
        "rj00": "/e b' e'/","rj10": "/e w e'/","rj0-1": "/e b' e'/","rj1-1": "/e w e'/",
        "jv10": "/b D d d2'/","jv0-1": "/b' D' d' d2/","vj10": "/w U u u2'/","vj0-1": "/w' U' u' u2/",
        "kk10": "/u m' U E'/","kk0-1": "/U m' u E'/","opp10": "/u2 u2'/","opp0-1": "/u2' u2/",
        "pn10": "/T T'/","pn0-1": "/t t'/","px10": "/f' d3' f'/","px0-1": "/f d3 f/",
        "xp10": "/F' u3' F'/","xp0-1": "/F u3 F/","tt10": "/d m' F' u2'/",
        "fss10": "/u M D' E'/","fss0-1": "/D' M u E'/","bss10": "/D M' u' E/","bss0-1": "/U' M d E/",
        "vv10": "/u M u m' E'/","zz10": "/u M t' M D'/","zz0-1": "/D' M t' M u/"
    };

    function unkarnify(scramble) {
        scramble = scramble.replaceAll(/\/|\\/g, " ").replaceAll(/\(|\)/g, "").replaceAll(/ +/g, " ");
        scramble = addCommas(scramble);
        return replaceShorthands(dictReplace(" "+scramble+" ", karnToWCA).slice(1,-1));
    }

    function replaceShorthands(scramble) {
        let moves = scramble.split(" ");
        let good = true;
        for (let move of moves)
            if (move && isNaN(Number(move.charAt(0))) && !(" "+move+" " in karnToWCA)) good = false;
        if (good) return dictReplace(" "+scramble+" ", karnToWCA).slice(1,-1).replaceAll(" ", "/");
        let topA = false, bottomA = false;
        for (let move of moves) {
            if (!move) continue;
            else if (move.includes(",")) {
                let [u, d] = move.split(",");
                if (parseInt(u, 10) % 3 !== 0) topA = !topA;
                if (parseInt(d, 10) % 3 !== 0) bottomA = !bottomA;
            } else {
                let replacement;
                if (["bjj","fjj","nn"].includes(move.toLowerCase()))
                    replacement = shorthandToKarn[move.toLowerCase()];
                else replacement = shorthandToKarn[move.toLowerCase()+getAlignment(topA, bottomA)];
                if (replacement === undefined) throw new Error(`${move} with ${getAlignment(topA, bottomA)} alignment is not a thing.`);
                scramble = scramble.replace(move, replacement);
                for (let submove of dictReplace(" "+replacement+" ", karnToWCA).split(" ")) {
                    let [u, d] = submove.split(",");
                    if (parseInt(u, 10) % 3 !== 0) topA = !topA;
                    if (parseInt(d, 10) % 3 !== 0) bottomA = !bottomA;
                }
            }
        }
        scramble = scramble.replaceAll(/ *\/ */g, "/").replaceAll(/\/\//g, "/0,0/").replaceAll(/\//g, " ");
        return dictReplace(" "+scramble+" ", karnToWCA).slice(1,-1).replaceAll(" ", "/");
    }

    function getAlignment(topA, bottomA) {
        return (topA ? "1" : "0") + (bottomA ? "-1" : "0");
    }

    function addCommas(scramble) {
        let moves = scramble.split(" ");
        for (let inx = 0; inx < moves.length; inx++) {
            if (moves[inx] && !isNaN(Number(moves[inx].replace("-", "")))) {
                let move = moves[inx];
                switch (move.length) {
                    case 1: moves[inx] = move + ",0"; break;
                    case 2: moves[inx] = move.charAt(0) === "-" ? move + ",0" : move.charAt(0) + "," + move.charAt(1); break;
                    case 3: moves[inx] = move.charAt(0) === "-" ? move.slice(0,2) + "," + move.charAt(2) : move.charAt(0) + "," + move.slice(1); break;
                    case 4: moves[inx] = move.slice(0,2) + "," + move.slice(2); break;
                    default: throw new Error(`${move} is not a valid move`);
                }
            }
        }
        return moves.join(" ");
    }

    // === POSITION → ANGLE MAPPING ===

    function slotCentreAngle(pos, span) {
        return (pos - 1) * 30 + (span * 30) / 2;
    }

    // === HEX PARSER ===

    function parseHex(rawHex) {
        let hex = rawHex.replace(/[|/]/, '');
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

    // === DRAW LAYER ===

    function drawLayer(tokens, isBottom, cx, cy, size, muted) {
        const variant = getActiveVariant();
        const colors  = getResolvedColors();
        let svg = '';
        for (const token of tokens) {
            const span = token.type === 'corner' ? 2 : 1;
            const layerOffset = isBottom ? -195 : 15;
            const angle = -slotCentreAngle(token.position, span) + layerOffset;
            const pieceInner = token.type === 'edge'
                ? variant.drawEdge(token.piece, colors, size, muted)
                : variant.drawCorner(token.piece, colors, size, muted);
            svg += `<g transform="translate(${cx},${cy}) rotate(${angle.toFixed(2)})">${pieceInner}</g>`;
        }
        return svg;
    }

    // === MAIN SVG BUILDER ===

    function getSVG(rawHex, size = 400, ringDistance = 5, muted, isVert, showSlice, _showSides, exportPad = 0) {
        // _showSides is now ignored — controlled internally via setShowSideColors()
        let hex = rawHex.replace(/[|/]/, '');
        if (hex.length !== 24) throw new Error('Hex must be 24 data characters (plus optional | separator).');

        const parsed = parseHex(rawHex);
        const variant = getActiveVariant();
        const colors  = getResolvedColors();

        size = size * (220 / 400);
        const cx = size / 2, cy = size / 2;
        const margin = size * (0.44 * (2 + ringDistance / 100) - 1);

        const sliceH   = (122 / 220) * size;
        const topApexY = cy - (123.5 / 220) * size;
        const padTop   = exportPad + Math.max(0, Math.ceil(-topApexY + sliceH * 0.05));
        const padOther = exportPad;
        const vbX = -padOther, vbY = -padTop;
        const vbW = size + padOther * 2, vbH = size + padTop + padOther;

        let html = `<div style="display:flex;align-items:center;overflow:visible;padding:2rem;${isVert ? "flex-direction:column;" : "flex-direction:row;"}">`;

        html += `<svg width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" style="overflow:visible;" class="squan">`;
        html += drawLayer(parsed.top, false, cx, cy, size, muted);
        if (showSlice) html += variant.drawSlice("top", cx, cy, size, colors, muted);
        html += `</svg>`;

        html += `<svg width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" style="overflow:visible;${isVert ? "margin-top:" : "margin-left:"}${margin.toFixed(1)}px;" class="squan">`;
        html += drawLayer(parsed.bottom, true, cx, cy, size, muted);
        if (showSlice) html += variant.drawSlice("bottom", cx, cy, size, colors, muted);
        html += `</svg></div>`;

        return html;
    }

    // === PUBLIC STYLE API ===

    function getStyles() { return STYLES.map((s, i) => ({ name: s.name, source: s.source, index: i })); }
    function getActiveStyleIndex() { return activeStyleIndex; }
    function setActiveStyle(index) { activeStyleIndex = index; }
    function getActiveStyle() { return STYLES[activeStyleIndex]; }

    function setShowSideColors(val) { showSideColors = val; }
    function getShowSideColors() { return showSideColors; }

    // Returns colorSlots for current variant (drives sidebar swatches)
    function getColorSlots() { return getActiveVariant().colorSlots; }

    // Returns resolved colors for current variant
    function getColorScheme() { return getResolvedColors(); }

    // Set a single color slot override
    function setColorScheme(partial) {
        for (const [id, hex] of Object.entries(partial)) setColorOverride(id, hex);
    }

    // === PIECE FILL API (unchanged behaviour) ===

    function setPieceColor(id, color) {
        if (id.split(" ").length !== 2) throw new Error(`piece id ${id} is not valid.`);
        let [piece, sticker] = id.split(" ");
        if (piece === "slice") {
            sliceColors = { ...sliceColors, [sticker]: color };
        } else if (parseInt(piece, 16) % 2 === 0) {
            edgeColors = { ...edgeColors, [piece]: { ...edgeColors[piece], [sticker]: color } };
        } else {
            cornerColors = { ...cornerColors, [piece]: { ...cornerColors[piece], [sticker]: color } };
        }
    }

    function resetPieceColor(id) {
        if (id.split(" ").length !== 2) throw new Error(`piece id ${id} is not valid.`);
        let [piece, sticker] = id.split(" ");
        if (piece === "slice") {
            sliceColors = { ...sliceColors, [sticker]: defaultPieceColors().sliceColors[sticker] };
        } else if (parseInt(piece, 16) % 2 === 0) {
            edgeColors = { ...edgeColors, [piece]: { ...edgeColors[piece], [sticker]: defaultPieceColors().edgeColors[piece][sticker] } };
        } else {
            cornerColors = { ...cornerColors, [piece]: { ...cornerColors[piece], [sticker]: defaultPieceColors().cornerColors[piece][sticker] } };
        }
    }

    function getPiecesColors() { return { edgeColors, cornerColors, sliceColors }; }
    function setPiecesColors(pc) { edgeColors = pc.edgeColors; cornerColors = pc.cornerColors; }

    return {
        getSVG, parseHex, algToHex, invertScramble, unkarnify,
        // Color scheme
        getColorSlots, getColorScheme, setColorScheme,
        // Style system
        getStyles, getActiveStyleIndex, setActiveStyle, getActiveStyle,
        setShowSideColors, getShowSideColors,
        // Piece fill
        setPieceColor, resetPieceColor, resetPiecesColors, getPiecesColors, setPiecesColors,
    };

})();

if (typeof window !== 'undefined') window.sq1vis = Square1Visualizer;