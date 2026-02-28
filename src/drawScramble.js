/**
 * Square-1 Scramble Visualizer — Template-based rewrite
 *
 * Usage:
 *   const html = Square1Visualizer.fromHex("6e0cc804a2a6|0e8c64ee20c4", 200);
 *   document.getElementById("container").innerHTML = html;
 */

const Square1Visualizer = (() => {

    // === CONSTANTS ===

    let COLOR_SCHEME = {
        top: '#4d4d4d',
        bottom: '#FFFFFF',
        front: '#CC0000',
        right: '#00AA00',
        back: '#FF8C00',
        left: '#0066CC',
        border: '#000000',
        divider: '#7a0000',
        circle: 'transparent',
        slice: null
    };

    const CORNER_HEX_VALUES = ['1', '3', '5', '7', '9', 'b', 'd', 'f'];

    // === COLOR LOOKUPS ===

    let edgeColors, cornerColors;
    
    function defaultPieceColors()  {
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
                '1': { top: "top", left: "back", right: "left" },
                '3': { top: "top", left: "left", right: "front" },
                '5': { top: "top", left: "front", right: "right" },
                '7': { top: "top", left: "right", right: "back" },
                '9': { top: "bottom", left: "back", right: "right" },
                'b': { top: "bottom", left: "right", right: "front" },
                'd': { top: "bottom", left: "front", right: "left" },
                'f': { top: "bottom", left: "left", right: "back" }
            }
        }
    }

    function resetPieceColors() {
        const scheme = defaultPieceColors();
        edgeColors = scheme.edgeColors;
        cornerColors = scheme.cornerColors;
    }

    resetPieceColors();

    // === SCRAM OPERATORS ===
    function algToHex(scramble) {
        // Initial solved state
        let tlHex = '011233455677';
        let blHex = '998bbaddcffe';

        // Parse the scramble string
        const moves = parseScramble(scramble);

/*
        // Apply each move
        console.log('--- Parsed moves ---');
        console.log(moves);
        console.log('Start:', tlHex, '|', blHex);
*/

        for (const move of moves) {
            if (move.type === 'twist') {
                const result = twist(tlHex, blHex);
                tlHex = result.tlHex;
                blHex = result.blHex;
                //console.log('twist →', tlHex, '|', blHex);
            } else if (move.type === 'turn') {
                tlHex = cycleLeft(tlHex, move.top);
                blHex = cycleLeft(blHex, move.bottom);
                //console.log(`turn (${move.top},${move.bottom}) →`, tlHex, '|', blHex);
            }
        }

        //console.log('Final:', tlHex, '|', blHex);
        return { tlHex, blHex };
    }

    function parseScramble(scramble) {
        const moves = [];
        // Normalize: ensure spaces around slashes, then split
        const normalized = scramble.replace(/\//g, ' / ');
        const parts = normalized.trim().split(/\s+/).filter(p => p.length > 0);

        for (const part of parts) {
            if (part === '/') {
                moves.push({ type: 'twist' });
            } else if (part.includes(',')) {
                const cleaned = part.replace(/[()]/g, '');
                const [top, bottom] = cleaned.split(',').map(n => parseInt(n.trim()));
                if (!isNaN(top) && !isNaN(bottom)) {
                    moves.push({ type: 'turn', top, bottom });
                }
            }
        }

        return moves;
    }

    function twist(tlHex, blHex) {
        // Swap last 6 of top with first 6 of bottom
        const tlFirst6 = tlHex.slice(0, 6);
        const tlLast6 = tlHex.slice(6);
        const blFirst6 = blHex.slice(0, 6);
        const blLast6 = blHex.slice(6);

        return {
            tlHex: tlFirst6 + blFirst6,
            blHex: tlLast6 + blLast6
        };
    }

    function cycleLeft(hex, places) {
        // Normalize to positive value mod 12
        const normalized = ((places % 12) + 12) % 12;

        // Cycle left by moving characters from start to end
        return hex.slice(normalized) + hex.slice(0, normalized);
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
                const invertedValues = values.map(v => {
                    const num = parseInt(v);
                    if (isNaN(num)) return v;
                    return String(-num);
                });
                return '(' + invertedValues.join(',') + ')';
            }

            if (part.includes(',')) {
                const values = part.split(',').map(v => v.trim());
                const invertedValues = values.map(v => {
                    const num = parseInt(v);
                    if (isNaN(num)) return v;
                    return String(-num);
                });
                return invertedValues.join(',');
            }

            return part;
        });

        return inverted.join('/');
    }
    
    function dictReplace(str, dict) {
        // keys are already sorted longest → shortest
        const pattern = new RegExp(Object.keys(dict).join("|"), "g");
        while (str.replace(pattern, match => dict[match]) !== str)
            str = str.replace(pattern, match => dict[match]);
        return str;
    }

    const karnToWCA = {
        " U4 ": " U U' U U' ",
        " U4' ": " U' U U' U ",
        " D4 ": " D D' D D' ",
        " D4' ": " D' D D' D ",
        " u4 ": " u u' u u' ",
        " u4' ": " u' u u' u ",
        " d4 ": " d d' d d' ",
        " d4' ": " d' d d' d ",
        " U3 ": " U U' U ",
        " U3' ": " U' U U' ",
        " D3 ": " D D' D ",
        " D3' ": " D' D D' ",
        " u3 ": " u u' u ",
        " u3' ": " u' u u' ",
        " d3 ": " d d' d ",
        " d3' ": " d' d d' ",
        " F3 ": " F F' F ",
        " F3' ": " F' F F' ",
        " f3 ": " f f' f ",
        " f3' ": " f' f f' ",
        " W ": " U U' ",
        " W' ": " U' U ",
        " B ": " D D' ",
        " B' ": " D' D ",
        " w ": " u u' ",
        " w' ": " u' u ",
        " b ": " d d' ",
        " b' ": " d' d ",
        " F2 ": " F F' ",
        " F2' ": " F' F ",
        " f2 ": " f f' ",
        " f2' ": " f' f ",
        " UU ": " U U ",
        " UU' ": " U' U' ",
        " DD ": " D D ",
        " DD' ": " D' D' ",
        " U2 ": " 6,0 ",
        " U2D ": " 6,3 ",
        " U2D' ": " 6,-3 ",
        " U2D2 ": " 6,6 ",
        " D2 ": " 0,6 ",
        " UD2 ": " 3,6 ",
        " U'D2 ": " -3,6 ",
        " U ": " 3,0 ",
        " U' ": " -3,0 ",
        " D ": " 0,3 ",
        " D' ": " 0,-3 ",
        " E ": " 3,-3 ",
        " E' ": " -3,3 ",
        " e ": " 3,3 ",
        " e' ": " -3,-3 ",
        " u ": " 2,-1 ",
        " u' ": " -2,1 ",
        " d ": " -1,2 ",
        " d' ": " 1,-2 ",
        " F' ": " -4,-1 ",
        " F ": " 4,1 ",
        " f' ": " -1,-4 ",
        " f ": " 1,4 ",
        " T ": " 2,-4 ",
        " T' ": " -2,4 ",
        " t' ": " -4,2 ",
        " t ": " 4,-2 ",
        " m ": " 2,2 ",
        " m' ": " -2,-2 ",
        " M' ": " -1,-1 ",
        " M ": " 1,1 ",
        " u2 ": " 5,-1 ",
        " u2' ": " -5,1 ",
        " d2 ": " -1,5 ",
        " d2' ": " 1,-5 ",
        " K' ": " -5,-2 ",
        " K ": " 5,2 ",
        " k ": " 2,5 ",
        " k' ": " -2,-5 ",
    };

    const shorthandToKarn = {
        // case insensitive. do .toLowerCase()
        // slashes to enforce slices
        "bjj": "/U' e D'/",
        "fjj": "/U e' D/",

        "bpj10": "/d m' U/",
        "bpj0-1": "/u' m D'/",
        "fpj10": "/u m' D/",
        "fpj0-1": "/d' m U'/",

        "nn": "/E E'/",

        "aa10": "/u m' u T'/",
        "aa0-1": "/U m' U t'/",

        "fadj10": "/D M' d'/",
        "dadj10": "/D M' d'/",
        "fadj0-1": "/U' M u/",
        "u'adj0-1": "/U' M u/",
        "badj10": "/U M u'/",
        "uadj10": "/U M u'/",
        "badj0-1": "/D' M d/",
        "d'adj0-1": "/D' M d/",

        "bb10": "/T u' e U'/",
        "bb0-1": "/t d e' D/",
        
        "fdd10": "/D e' d t/",
        "fdd0-1": "/U' e u' T/",
        "bdd10": "/U e' u T'/",
        "bdd0-1": "/D' e d' t'/",

        "ff10": "/d m' d M E/",

        "fv10": "/d4/",
        "fv0-1": "/d4'/",
        "vf10": "/u4/",
        "vf0-1": "/u4'/",

        "jf10": "/w D' u T'/",
        "jf0-1": "/w' D u' T/",
        "fj10": "/b U' d t/",
        "fj0-1": "/b' U d' t'/",

        "jr00": "/e' w e/",
        "jr10": "/e' b e/",
        "jr0-1": "/e' w' e/",
        "jr1-1": "/e' b' e/",
        "rj00": "/e b' e'/",
        "rj10": "/e w e'/",
        "rj0-1": "/e b' e'/",
        "rj1-1": "/e w e'/",

        "jv10": "/b D d d2'/",
        "jv0-1": "/b' D' d' d2/",
        "vj10": "/w U u u2'/",
        "vj0-1": "/w' U' u' u2/",

        "kk10": "/u m' U E'/",
        "kk0-1": "/U m' u E'/",

        "opp10": "/u2 u2'/",
        "opp0-1": "/u2' u2/",

        "pn10": "/T T'/",
        "pn0-1": "/t t'/",

        "px10": "/f' d3' f'/",
        "px0-1": "/f d3 f/",
        "xp10": "/F' u3' F'/",
        "xp0-1": "/F u3 F/",

        "tt10": "/d m' F' u2'/",

        "fss10": "/u M D' E'/",
        "fss0-1": "/D' M u E'/",
        "bss10": "/D M' u' E/",
        "bss0-1": "/U' M d E/",

        "vv10": "/u M u m' E'/",

        "zz10": "/u M t' M D'/",
        "zz0-1": "/D' M t' M u/"
    };

    function unkarnify(scramble) {
        // scramble is a string that contains the starting 10 or 0-1 and the end alignment, etc.
        // downslice and upslice to a space; remove parentheses; condense spaces
        scramble = scramble.replaceAll(/\/|\\/g, " ").replaceAll(/\(|\)/g, "").replaceAll(/ +/g, " ");
        scramble = addCommas(scramble);
        return replaceShorthands(dictReplace(" "+scramble+" ", karnToWCA).slice(1,-1));
    }

    function replaceShorthands(scramble) {
        // scramble: e.g. "1,0 bJJ -3,0 2,-1 1,1 2,-1 -5,1 -1,0"
        // gonna assume the scramble is valid.
        let moves = scramble.split(" ");
        // check if the scramble doesn't actually have shorthands
        let good = true;
        for (let move of moves)
            if (move && isNaN(Number(move.charAt(0))) && !(" "+move+" " in karnToWCA)) good = false;
        if (good) return dictReplace(" "+scramble+" ", karnToWCA).slice(1,-1).replaceAll(" ", "/");

        // main logic
        let topA = false;
        let bottomA = false;
        for (let move of moves) {
            if (!move) continue;
            else if (move.includes(",")) {
                // it's a move, not a shorthand
                let [u, d] = move.split(",");
                if (parseInt(u, 10) % 3 !== 0) topA = !topA;
                if (parseInt(d, 10) % 3 !== 0) bottomA = !bottomA;
            } else {
                // it's a shorthand
                let replacement;
                if (["bjj", "fjj", "nn"].includes(move.toLowerCase()))
                    replacement = shorthandToKarn[move.toLowerCase()];
                else replacement = shorthandToKarn[move.toLowerCase()+getAlignment(topA, bottomA)];
                if (replacement === undefined) throw new Error(`${move} with ${getAlignment(topA, bottomA)} alignment is not a thing.`)
                scramble = scramble.replace(move, replacement);
                for (let submove of dictReplace(" "+replacement+" ", karnToWCA).split(" ")) {
                    let [u, d] = submove.split(",");
                    if (parseInt(u, 10) % 3 !== 0) topA = !topA;
                    if (parseInt(d, 10) % 3 !== 0) bottomA = !bottomA;
                }
            }
        }
        //console.log(scramble);
        scramble = scramble.replaceAll(/ *\/ */g, "/").replaceAll(/\/\//g, "/0,0/").replaceAll(/\//g, " ");
        return dictReplace(" "+scramble+" ", karnToWCA).slice(1,-1).replaceAll(" ", "/"); // unkarnify the shorthands
    }

    function getAlignment(topA, bottomA) {
        let ret = "";
        ret += topA ? "1" : "0";
        ret += bottomA ? "-1" : "0";
        return ret;
    }

    function addCommas(scramble) {
        // assume valid scramble
        let moves = scramble.split(" ")
        for (let inx = 0; inx < moves.length; inx++) {
            if (moves[inx] && !isNaN(Number(moves[inx].replace("-", "")))) {
                // we have a move like -23 or -10
                let move = moves[inx];
                switch (move.length) {
                    case 1:
                        moves[inx] = move + ",0"; // we will tolerate this
                        break;
                    case 2:
                        moves[inx] = move.charAt(0) === "-" ?
                                    move + ",0" :
                                    move.charAt(0) + "," + move.charAt(1);
                        break;
                    case 3:
                        moves[inx] = move.charAt(0) === "-" ?
                                    move.slice(0,2) + "," + move.charAt(2) :
                                    move.charAt(0) + "," + move.slice(1);
                        break;
                    case 4:
                        moves[inx] = move.slice(0,2) + "," + move.slice(2);
                        break;
                    default:
                        throw new Error(`${move} is not a valid move, idk how we got here`);
                }
            }
        }
        return moves.join(" ");
    }

    // === TEMPLATE SHAPE GENERATORS ===
    // Both functions draw a piece centred at origin (0,0) pointing UP (apex at top).
    // The caller wraps them in a <g transform="rotate(...) translate(...)"> to place them.

    /**
     * Returns SVG markup for an edge piece centred at origin, pointing up.
     * An edge occupies 30° of arc — inner point at origin, outer band at top.
     * @param {string} piece - piece hex code, e.g. "2"
     * @param {string} innerColor - face colour (top/bottom)
     * @param {string} outerColor - side face colour
     * @param {number} size - size of the image, actually. hardcoded here is for 220px
     */
    function getEdgeSVG(piece, innerColor, outerColor, size) {
        if (innerColor.charAt(0) !== "#") innerColor = COLOR_SCHEME[innerColor];
        if (outerColor.charAt(0) !== "#") outerColor = COLOR_SCHEME[outerColor];

        const scale = 54 / 27 * (size / 220);
        const ox = (50.0 / 100) * 27;
        const oy = (117.0 / 100) * 42.61;
        const tx = -ox * scale;
        const ty = -oy * scale;
        return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})">
            <path fill="${COLOR_SCHEME["border"]}" d="M.11,4.17l2.4,8.97h21.97l2.4-8.97c.56-2.1-1.02-4.17-3.2-4.17H3.31C1.14,0-.45,2.07.11,4.17Z"/>
            <path fill="${COLOR_SCHEME["border"]}" d="M3.05,15.11l6.57,24.52c1.07,3.98,6.71,3.98,7.77,0l6.57-24.52c.56-2.1-1.02-4.17-3.2-4.17H6.24c-2.18,0-3.76,2.07-3.2,4.17Z"/>
            <path class="sticker" id="${piece} outer" fill="${outerColor}" d="M21.3,10.94c.88,0,1.66-.59,1.88-1.45l.78-2.92.51-1.91c.33-1.24-.6-2.45-1.88-2.45H4.41c-1.28,0-2.22,1.22-1.88,2.45l.51,1.91.78,2.92c.23.85,1,1.45,1.88,1.45h15.6Z"/>
            <path class="sticker" id="${piece} inner" fill="${innerColor}" d="M19.67,13.14H7.34c-1.28,0-2.22,1.22-1.88,2.45l6.17,23.01c.52,1.93,3.25,1.93,3.77,0l6.17-23.01c.33-1.24-.6-2.45-1.88-2.45Z"/>
        </g>`;
    }

    /**
     * Returns SVG markup for a corner piece centred at origin, pointing up.
     * A corner occupies 60° of arc — inner point at origin, apex at top.
     * @param {string} piece - piece hex code, e.g. "2"
     * @param {string} topColor
     * @param {string} leftColor
     * @param {string} rightColor
     * @param {number} size
     */
    function getCornerSVG(piece, topColor, leftColor, rightColor, size) {
        if (topColor.charAt(0) !== "#") topColor = COLOR_SCHEME[topColor];
        if (leftColor.charAt(0) !== "#") leftColor = COLOR_SCHEME[leftColor];
        if (rightColor.charAt(0) !== "#") rightColor = COLOR_SCHEME[rightColor];

        const scale = 96 / 48.5 * (size / 220);
        const ox = (-3.5 / 100) * 48.5;
        const oy = (103.5 / 100) * 48.5;
        const tx = -ox * scale;
        const ty = -oy * scale;
        return `<g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)}) rotate(-45,${ox.toFixed(2)},${oy.toFixed(2)})">
            <path fill="${COLOR_SCHEME["border"]}" d="M10.19,2.45l-2.86,10.68h24.73c1.83,0,3.31,1.48,3.31,3.31v24.73l10.68-2.86c1.45-.39,2.45-1.7,2.45-3.2V3.31c0-1.83-1.48-3.31-3.31-3.31H13.39c-1.5,0-2.81,1.01-3.2,2.45Z"/>
            <path fill="${COLOR_SCHEME["border"]}" d="M7.26,13.39L.25,39.56c-1.41,5.28,3.42,10.11,8.7,8.7l26.16-7.01c1.45-.39,2.45-1.7,2.45-3.2V14.25c0-1.83-1.48-3.31-3.31-3.31H10.46c-1.5,0-2.81,1.01-3.2,2.45Z"/>
            <path class="sticker" id="${piece} right" fill="${rightColor}" d="M35.2,10.94c.52,0,1.01-.21,1.38-.57l.71-.71,5.72-5.72c.64-.64.19-1.73-.72-1.73H14.03c-.88,0-1.66.59-1.88,1.45l-.78,2.92-.51,1.91c-.33,1.24.6,2.45,1.88,2.45h22.47Z"/>
            <path class="sticker" id="${piece} left" fill="${leftColor}" d="M37.57,35.77c0,1.28,1.22,2.22,2.45,1.88l1.91-.51,2.92-.78c.85-.23,1.45-1,1.45-1.88V6.21c0-.9-1.09-1.36-1.73-.72l-5.72,5.72-.71.71c-.37.37-.57.86-.57,1.38v22.47Z"/>
            <path class="sticker" id="${piece} top" fill="${topColor}" d="M33.92,39.28c.85-.23,1.45-1,1.45-1.88V15.09c0-1.08-.87-1.95-1.95-1.95H11.1c-.88,0-1.66.59-1.88,1.45l-7,26.12c-.91,3.39,2.19,6.49,5.58,5.58l26.12-7Z"/>
        </g>`;
    }

    /**
     * Returns SVG markup for a corner piece centred at origin, pointing up.
     * A corner occupies 60° of arc — inner point at origin, apex at top.
     * @param {string} layer
     * @param {number} cx
     * @param {number} cy
     * @param {number} size
     */
    function getSliceSVG(layer, cx, cy, size = 220) {
        const scale = (size / 220) * 1.965;
        const topCol  = COLOR_SCHEME.slice || COLOR_SCHEME.top;
        const botCol  = COLOR_SCHEME.slice || COLOR_SCHEME.bottom;
        if (layer === "top") {
            return `<g transform="translate(${cx.toFixed(2) - 42/220*size},${cy.toFixed(2) - 123.5/220*size}) scale(${scale.toFixed(4)})">
                <path d="M42.56,3.6c-.16-.97-.86-1.73-1.81-1.99L35.06.09c-.21-.06-.43-.09-.65-.09-.86,0-1.64.44-2.1,1.17-.46.73-.5,1.63-.13,2.4l1.97,4.05c.42.86,1.28,1.4,2.24,1.4.5,0,.98-.15,1.39-.43l3.73-2.53c.82-.55,1.22-1.5,1.06-2.47Z"/>
                <path d="M8.45,116.55c-.42-.86-1.28-1.4-2.24-1.4-.5,0-.98.15-1.39.43l-3.73,2.53c-.82.55-1.22,1.5-1.06,2.47.16.97.86,1.73,1.81,1.99l5.7,1.53c.21.06.43.09.65.09.86,0,1.64-.44,2.1-1.17.46-.73.5-1.63.13-2.4l-1.97-4.05Z"/>
                <path fill="${topCol}" d="M40.37,3.06l-5.7-1.53c-.09-.02-.18-.04-.26-.04-.69,0-1.21.74-.88,1.42l1.97,4.05c.17.35.52.55.89.55.19,0,.38-.05.55-.17l3.73-2.53c.7-.47.52-1.55-.3-1.77Z"/>
                <path fill="${topCol}" d="M7.1,117.2c-.17-.35-.52-.55-.89-.55-.19,0-.38.05-.55.17l-3.73,2.53c-.7.47-.52,1.55.3,1.77l5.7,1.53c.09.02.18.04.26.04.69,0,1.21-.74.88-1.42l-1.97-4.05Z"/>
            </g>`
        }
        else if (layer === "bottom") {
            return `<g transform="translate(${cx.toFixed(2) - 98/220*size},${cy.toFixed(2) - 86/220*size}) scale(${scale.toFixed(4)}) rotate(-30)">
                <path d="M42.56,3.6c-.16-.97-.86-1.73-1.81-1.99L35.06.09c-.21-.06-.43-.09-.65-.09-.86,0-1.64.44-2.1,1.17-.46.73-.5,1.63-.13,2.4l1.97,4.05c.42.86,1.28,1.4,2.24,1.4.5,0,.98-.15,1.39-.43l3.73-2.53c.82-.55,1.22-1.5,1.06-2.47Z"/>
                <path d="M8.45,116.55c-.42-.86-1.28-1.4-2.24-1.4-.5,0-.98.15-1.39.43l-3.73,2.53c-.82.55-1.22,1.5-1.06,2.47.16.97.86,1.73,1.81,1.99l5.7,1.53c.21.06.43.09.65.09.86,0,1.64-.44,2.1-1.17.46-.73.5-1.63.13-2.4l-1.97-4.05Z"/>
                <path fill="${botCol}" d="M40.37,3.06l-5.7-1.53c-.09-.02-.18-.04-.26-.04-.69,0-1.21.74-.88,1.42l1.97,4.05c.17.35.52.55.89.55.19,0,.38-.05.55-.17l3.73-2.53c.7-.47.52-1.55-.3-1.77Z"/>
                <path fill="${botCol}" d="M7.1,117.2c-.17-.35-.52-.55-.89-.55-.19,0,.38.05-.55.17l-3.73,2.53c-.7.47-.52,1.55.3,1.77l5.7,1.53c.09.02.18.04.26.04.69,0,1.21-.74.88-1.42l-1.97-4.05Z"/>
            </g>`
        }
        throw new Error("what layer do you wanna draw bruh")
    }

    // === POSITION → ANGLE MAPPING ===
    // Square-1 has 12 slots per layer, each 30°.
    // Slot positions are 1-indexed (1–12 top, 1–12 bottom).
    // "Position" here is the 1-based slot index within a layer.
    // We place slot 1 at the top (0°), going clockwise.

    /**
     * Centre angle (degrees, clockwise from top) for a slot that starts at
     * 1-based index `pos` and spans `span` slots (1 for edge, 2 for corner).
     */
    function slotCentreAngle(pos, span) {
        // slot 1 starts at 0°, each slot is 30°
        const startAngle = (pos - 1) * 30;
        return startAngle + (span * 30) / 2;
    }

    // For the top layer the divider line sits between slot 12 and slot 1 (at 0°).
    // For the bottom layer it's mirrored — same maths, different SVG.

    // === HEX PARSER ===

    /**
     * Parses a 25-char hex string (with | or / separator) into an array of tokens.
     * Each token: { piece, type, layer, position }
     * `position` = 1-based slot-start index within that layer (1–12).
     *
     * @param {string} rawHex
     * @returns {{ top: Token[], bottom: Token[] }}
     */
    function parseHex(rawHex) {
        // Normalise separator
        let hex = rawHex.replace(/[|/]/, '');
        // hex is now 24 chars: indices 0-11 = top layer, 12-23 = bottom layer

        function parseLayer(chars) {
            const tokens = [];
            let slotPos = 1; // 1-based slot position within layer
            let i = 0;
            while (i < chars.length) {
                const ch = chars[i].toLowerCase();
                const isCorner = CORNER_HEX_VALUES.includes(ch);
                if (isCorner) {
                    // Corner uses this char + next char (both should be the same piece ID)
                    const piece = ch + (chars[i + 1] || '').toLowerCase();
                    tokens.push({ piece: ch, type: 'corner', position: slotPos });
                    slotPos += 2;
                    i += 2;
                } else {
                    tokens.push({ piece: ch, type: 'edge', position: slotPos });
                    slotPos += 1;
                    i += 1;
                }
            }
            return tokens;
        }

        return {
            top: parseLayer(hex.slice(0, 12)),
            bottom: parseLayer(hex.slice(12, 24))
        };
    }

    // === DRAW SCRAMBLE — renders one layer ===

    /**
     * Renders all pieces for one layer into SVG <g> elements.
     * Each piece is drawn at origin then rotated + translated to its slot position.
     *
     * @param {Token[]} tokens
     * @param {number} cx - layer circle centre x
     * @param {number} cy - layer circle centre y
     * @param {number} size - the size of the image
     * @returns {string} SVG fragment
     */
    function drawLayer(tokens, isBottom, cx, cy, size) {
        let svg = '';

        for (const token of tokens) {
            const span = token.type === 'corner' ? 2 : 1;
            const layerOffset = isBottom ? -195 : 15;
            const angle = -slotCentreAngle(token.position, span) + layerOffset;

            let pieceInner = '';
            if (token.type === 'edge') {
                const { inner, outer } = edgeColors[token.piece];
                pieceInner = getEdgeSVG(token.piece, inner, outer, size);
            } else {
                const { top, left, right } = cornerColors[token.piece];
                pieceInner = getCornerSVG(token.piece, top, left, right, size);
            }

            // Wrap in a group: rotate around layer centre by the slot angle
            svg += `<g transform="translate(${cx},${cy}) rotate(${angle.toFixed(2)})">${pieceInner}</g>`;
        }

        return svg;
    }

    // === MAIN SVG BUILDER ===

    function getSVG(rawHex, size = 400, ringDistance = 5, isVert, showSlice, exportPad = 0) {
        let hex = rawHex.replace(/[|/]/, '');
        if (hex.length !== 24) throw new Error('Hex must be 24 data characters (plus optional | separator).');

        const parsed = parseHex(rawHex);

        size = size * (220/400);

        const cx = size / 2, cy = size / 2;
        const margin = size * (0.44 * (2 + ringDistance / 100) - 1);

        // Slice indicator bleeds outside the natural [0,size] box.
        // Top indicator apex is at roughly cy - 123.5/220*size above origin,
        // plus the indicator shape itself is ~122px tall at size=220.
        // We compute how far above y=0 and below y=size it can reach.
        const sliceH   = (122 / 220) * size;   // indicator height scaled
        const topApexY = cy - (123.5 / 220) * size; // where top indicator starts
        const padTop   = exportPad + Math.max(0, Math.ceil(-topApexY + sliceH * 0.05));
        const padOther = exportPad;

        const vbX = -padOther;
        const vbY = -padTop;
        const vbW = size + padOther * 2;
        const vbH = size + padTop + padOther;

        let html = `<div style="display:flex;align-items:center;overflow:visible;padding:2rem;
            ${isVert ? "flex-direction: column;" : "flex-direction: row;"}
        ">`;

        html += `<svg width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" style="overflow:visible;" class="squan">`;
        html += drawLayer(parsed.top, false, cx, cy, size);
        if (showSlice) html += getSliceSVG("top", cx, cy, size);
        html += `</svg>`;

        html += `<svg width="${vbW}" height="${vbH}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" style="overflow:visible;${isVert ?
            "margin-top:" : "margin-left:"}${margin.toFixed(1)}px;" class="squan">`;
        html += drawLayer(parsed.bottom, true, cx, cy, size);
        if (showSlice) html += getSliceSVG("bottom", cx, cy, size);
        html += `</svg></div>`;

        return html;
    }

    function setColorScheme(scheme) {
        COLOR_SCHEME = { ...COLOR_SCHEME, ...scheme };
        resetPieceColors();
    }
    function getColorScheme() {
        return { ...COLOR_SCHEME };
    }

    function setPieceColor(id, color) {
        if (id.split(" ").length !== 2) throw new Error(`piece id ${id} is not valid.`);
        let [piece, sticker] = id.split(" ");
        if (parseInt(piece, 16) % 2 === 0) {
            // edge
            let currentScheme = edgeColors[piece];
            edgeColors = {...edgeColors, [piece]: {...currentScheme, [sticker]: color}};
        } else {
            // corner
            let currentScheme = cornerColors[piece];
            cornerColors = {...cornerColors, [piece]: {...currentScheme, [sticker]: color}};
        }
    }

    function resetPieceColor(id) {
        if (id.split(" ").length !== 2) throw new Error(`piece id ${id} is not valid.`);
        let [piece, sticker] = id.split(" ");
        if (parseInt(piece, 16) % 2 === 0) {
            // edge
            let currentScheme = edgeColors[piece];
            let resetColor = defaultPieceColors().edgeColors[piece][sticker]
            edgeColors = {...edgeColors, [piece]: {...currentScheme, [sticker]: resetColor}};
        } else {
            // corner
            let currentScheme = cornerColors[piece];
            let resetColor = defaultPieceColors().cornerColors[piece][sticker]
            cornerColors = {...cornerColors, [piece]: {...currentScheme, [sticker]: resetColor}};
        }
    }

    function resetPiecesColors() {
        // name is similar to resetPieceColor
        let piecesColors = defaultPieceColors();
        edgeColors = piecesColors.edgeColors;
        cornerColors = piecesColors.cornerColors;
    }
    
    function getPiecesColors() {
        return {
            edgeColors: edgeColors,
            cornerColors: cornerColors
        }
    }

    function setPiecesColors(piecesColors) {
        // name is similar to setPieceColor
        edgeColors = piecesColors.edgeColors;
        cornerColors = piecesColors.cornerColors;
    }


    return { 
        getSVG, parseHex, algToHex, invertScramble, unkarnify, setColorScheme, getColorScheme, setPieceColor,
        getPiecesColors, setPiecesColors, resetPieceColor, resetPiecesColors
     };

})();

// Browser
if (typeof window !== 'undefined') window.sq1vis = Square1Visualizer;
