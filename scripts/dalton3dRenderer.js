const CORNERS = ['1', '3', '5', '7', '9', 'b', 'd', 'f'];
const DEFAULT_HEX = '011233455677|998bbaddcffe';
const DEFAULT_ORIENTATION = normalizeQuaternion(multiplyQuaternions(
    orientationFromRotations({ x: -116, y: -178, z: -178 }),
    orientationFromRotations({ x: -20, y: 30, z: 0 }),
));

const DALTON_EDGE_OUTER_FACE = {
    '0': 'back',
    '2': 'right',
    '4': 'front',
    '6': 'left',
    '8': 'front',
    'a': 'right',
    'c': 'back',
    'e': 'left',
};

const DALTON_CORNER_SIDE_FACE = {
    '1': { right: 'back', left: 'right' },
    '3': { right: 'right', left: 'front' },
    '5': { right: 'front', left: 'left' },
    '7': { right: 'left', left: 'back' },
    '9': { right: 'front', left: 'right' },
    'b': { right: 'right', left: 'back' },
    'd': { right: 'back', left: 'left' },
    'f': { right: 'left', left: 'front' },
};

const PIECE_VALUE_TO_HEX = {
    1: '1',
    2: '3',
    3: '5',
    4: '7',
    5: '9',
    6: 'b',
    7: 'd',
    8: 'f',
};

const SOLVED_UP_LAYER = [1, -1, 0.02, 2, -2, 0.03, 3, -3, 0.04, 4, -4, 0.01];
const SOLVED_DOWN_LAYER = [0.05, 5, -5, 0.06, 6, -6, 0.07, 7, -7, 0.08, 8, -8];

function normalizeHex(rawHex) {
    const hex = String(rawHex || DEFAULT_HEX).toLowerCase().replace(/[|/]/g, '');
    if (hex.length !== 24) throw new Error('Hex must be 24 data characters.');
    return hex;
}

function turnLayer(layer, move) {
    const next = layer.slice();
    for (let i = 0; i < Math.abs(move); i++) {
        if (move > 0) next.unshift(next.pop());
        else next.push(next.shift());
    }
    return next;
}

function twistState(state) {
    const upSection = state.upLayer.slice(0, 6);
    const downSection = state.downLayer.slice(0, 6);
    return {
        upLayer: [...downSection, ...state.upLayer.slice(6, 12)],
        downLayer: [...upSection, ...state.downLayer.slice(6, 12)],
        bar: !state.bar,
    };
}

function stateFromMoves(moves = []) {
    let state = {
        upLayer: SOLVED_UP_LAYER.slice(),
        downLayer: SOLVED_DOWN_LAYER.slice(),
        bar: false,
    };

    for (const move of moves) {
        if (move.type === 'twist') {
            state = twistState(state);
        } else if (move.type === 'turn') {
            state = {
                ...state,
                upLayer: turnLayer(state.upLayer, move.top),
                downLayer: turnLayer(state.downLayer, move.bottom),
            };
        }
    }

    return state;
}

function hexEdgeToValue(ch) {
    return (parseInt(ch, 16) / 2 + 1) / 100;
}

function hexCornerToValue(ch, chars, index) {
    const pieceNumber = (parseInt(ch, 16) + 1) / 2;
    const prev = chars[(index + chars.length - 1) % chars.length];
    return prev === ch ? -pieceNumber : pieceNumber;
}

function hexLayerToDaltonValues(chars, layer) {
    const values = [...chars].map((ch, index) => (
        CORNERS.includes(ch)
            ? hexCornerToValue(ch, chars, index)
            : hexEdgeToValue(ch)
    ));
    if (layer === 'top') return values.slice(1).concat(values[0]);

    const bottom = [];
    for (let i = 0; i < values.length; i += 3) {
        bottom.push(values[i + 2], values[i], values[i + 1]);
    }
    return bottom;
}

function colorIsTransparent(value) {
    return String(value || '').trim().toLowerCase() === 'transparent'
        || String(value || '').replace(/\s+/g, '').toLowerCase() === 'rgba(0,0,0,0)';
}

function resolveColor(value, scheme) {
    if (!value) return '#000000';
    return String(value).charAt(0) === '#' || String(value).startsWith('rgb') || value === 'transparent'
        ? value
        : (scheme[value] ?? value);
}

function isSchemeColorName(value) {
    return ['top', 'bottom', 'left', 'right', 'front', 'back', 'internal', 'border'].includes(value);
}

function pieceHexFromLayerValue(value) {
    const abs = Math.abs(value);
    if (abs < 1) return ((Math.round(abs * 100) - 1) * 2).toString(16);
    return PIECE_VALUE_TO_HEX[Math.round(abs)];
}

function getPieceSurfaceId(value, surface) {
    const piece = pieceHexFromLayerValue(value);
    return piece ? `${piece} ${surface}` : '';
}

function getTopBottomSurfaceColor(value, isTopLayer, piecesColors, scheme, muted) {
    const piece = pieceHexFromLayerValue(value);
    if (!piece) return scheme.internal;
    const bucket = Math.abs(value) < 1 ? piecesColors.edgeColors : piecesColors.cornerColors;
    const role = Math.abs(value) < 1 ? 'inner' : 'top';
    const current = bucket[piece]?.[role];
    const color = resolveColor(isSchemeColorName(current) ? (isTopLayer ? 'top' : 'bottom') : current, scheme);
    return muted ? '#4d4d4d' : color;
}

function getSideSurfaceColor(value, surface, piecesColors, scheme, muted) {
    const piece = pieceHexFromLayerValue(value);
    if (!piece) return scheme.internal;
    const isEdge = Math.abs(value) < 1;
    const role = isEdge ? 'outer' : surface;
    const bucket = isEdge ? piecesColors.edgeColors : piecesColors.cornerColors;
    const current = bucket[piece]?.[role];
    const defaultFace = isEdge ? DALTON_EDGE_OUTER_FACE[piece] : DALTON_CORNER_SIDE_FACE[piece]?.[role];
    const color = resolveColor(isSchemeColorName(current) ? defaultFace : current, scheme);
    return muted ? '#4d4d4d' : color;
}

function getSliceSurfaceColor(surface, piecesColors, scheme, muted) {
    if (muted) return '#4d4d4d';
    return resolveColor(piecesColors.sliceColors?.[surface], scheme);
}

function axisAngleQuaternion(axis, angle) {
    const halfAngle = angle / 2;
    const scale = Math.sin(halfAngle);
    const quaternion = { w: Math.cos(halfAngle), x: 0, y: 0, z: 0 };
    quaternion[axis] = scale;
    return quaternion;
}

function multiplyQuaternions(left, right) {
    return {
        w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
        x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
        y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
        z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
    };
}

function normalizeQuaternion(quaternion) {
    const length = Math.hypot(quaternion.w, quaternion.x, quaternion.y, quaternion.z) || 1;
    return {
        w: quaternion.w / length,
        x: quaternion.x / length,
        y: quaternion.y / length,
        z: quaternion.z / length,
    };
}

function orientationFromRotations(rotations) {
    let orientation = { w: 1, x: 0, y: 0, z: 0 };
    for (const axis of ['x', 'y', 'z']) {
        orientation = multiplyQuaternions(
            axisAngleQuaternion(axis, rotations[axis] * Math.PI / 180),
            orientation,
        );
    }
    return normalizeQuaternion(orientation);
}

function browserName() {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'edge';
    if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) return 'chrome';
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
    return 'browser';
}

function graphicsHelpText() {
    const name = browserName();
    if (name === 'chrome') return 'WebGL did not start. In Chrome, open chrome://settings/system, turn on "Use graphics acceleration when available", restart Chrome, then check chrome://gpu for WebGL.';
    if (name === 'edge') return 'WebGL did not start. In Edge, open edge://settings/system, turn on "Use graphics acceleration when available", restart Edge, then check edge://gpu for WebGL.';
    if (name === 'firefox') return 'WebGL did not start. In Firefox, open Settings > General > Performance, enable hardware acceleration, restart Firefox, then check about:support for WebGL.';
    if (name === 'safari') return 'WebGL did not start. In Safari, open Safari > Settings > Advanced and make sure WebGL is allowed, then restart Safari.';
    return 'WebGL did not start. Enable hardware or graphics acceleration in your browser settings, restart the browser, and try again.';
}

function ensureP5() {
    return new Promise((resolve, reject) => {
        if (window.p5) {
            resolve(window.p5);
            return;
        }

        const existing = document.querySelector('script[data-p5-loader]');
        if (existing) {
            existing.addEventListener('load', () => resolve(window.p5), { once: true });
            existing.addEventListener('error', () => reject(new Error('Could not load p5.')), { once: true });
            return;
        }

        const isBuiltApp = [...document.scripts].some(script => /app\.bundle\.js(?:$|\?)/.test(script.src));
        const paths = isBuiltApp ? ['./p5.min.js', './vendor/p5.min.js'] : ['./vendor/p5.min.js', './p5.min.js'];
        let index = 0;
        const loadNext = () => {
            const script = document.createElement('script');
            script.src = paths[index++];
            script.dataset.p5Loader = 'true';
            script.onload = () => resolve(window.p5);
            script.onerror = () => {
                script.remove();
                if (index < paths.length) loadNext();
                else reject(new Error('Could not load p5.'));
            };
            document.head.appendChild(script);
        };
        loadNext();
    });
}

export class Dalton3DRenderer {
    constructor(container, { onStickerClick } = {}) {
        this.container = container;
        this.onStickerClick = onStickerClick;
        this.p5 = null;
        this.pickGraphics = null;
        this.pickIds = new Map();
        this.pickColors = new Map();
        this.ready = false;
        this.failed = false;
        this.lastOptions = null;
        this.len = 250;
        this.edgeRadius = 0;
        this.cornerRadius = 0;
    }

    async init() {
        if (this.ready || this.failed) return;
        const P5 = await ensureP5();
        await new Promise((resolve) => {
            this.p5 = new P5((p) => this.sketch(p, resolve));
        });
    }

    destroy() {
        if (this.p5) this.p5.remove();
        this.p5 = null;
        this.pickGraphics = null;
        this.ready = false;
    }

    sketch(p, resolveReady) {
        p.setup = () => {
            try {
                const canvas = p.createCanvas(400, 400, p.WEBGL);
                canvas.parent(this.container);
                canvas.elt.className = 'dalton-3d-canvas';
                p.pixelDensity(1);
                p.frameRate(30);
                this.pickGraphics = p.createGraphics(400, 400, p.WEBGL);
                this.pickGraphics.pixelDensity(1);
                this.edgeRadius = this.len / (2 * Math.cos(Math.PI / 12));
                this.cornerRadius = this.len / 2 * Math.sqrt(2);
                this.ready = true;
                resolveReady();
            } catch (error) {
                this.failed = true;
                this.showFailure();
                console.error(error);
                resolveReady();
            }
        };

        p.draw = () => {
            if (!this.ready || !this.lastOptions) return;
            this.drawScene(p, this.lastOptions, false);
        };

        p.mouseClicked = () => {
            if (!this.ready || !this.lastOptions) return;
            if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return;
            const id = this.pickSticker(p.mouseX, p.mouseY);
            if (id && this.onStickerClick) this.onStickerClick(id);
        };
    }

    showFailure() {
        this.container.innerHTML = `<div class="error-banner">${graphicsHelpText()}</div>`;
    }

    resize(size) {
        if (!this.p5 || !this.ready) return;
        this.p5.resizeCanvas(size, size);
        this.pickGraphics.resizeCanvas(size, size);
    }

    render(rawHex, options) {
        this.lastOptions = {
            ...options,
            hex: options.moves ? null : normalizeHex(rawHex || DEFAULT_HEX),
            orientation: normalizeQuaternion(options.orientation ?? DEFAULT_ORIENTATION),
        };
        this.resize(options.size);
        if (this.p5 && this.ready) this.drawScene(this.p5, this.lastOptions, false);
    }

    getCanvas() {
        return this.p5?.canvas ?? null;
    }

    toBlob(type = 'image/png', quality) {
        const canvas = this.getCanvas();
        if (!canvas) return Promise.reject(new Error('3D canvas is not ready.'));
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create image.')), type, quality);
        });
    }

    pickSticker(x, y) {
        if (!this.pickGraphics || !this.lastOptions) return '';
        this.pickIds.clear();
        this.pickColors.clear();
        this.drawScene(this.pickGraphics, this.lastOptions, true);
        const [r, g, b] = this.pickGraphics.get(Math.round(x), Math.round(y));
        return this.pickColors.get(`${r},${g},${b}`) || '';
    }

    colorForPickId(id) {
        if (!id) return [0, 0, 0];
        if (this.pickIds.has(id)) return this.pickIds.get(id);
        const n = this.pickIds.size + 1;
        const rgb = [n & 255, (n >> 8) & 255, (n >> 16) & 255];
        this.pickIds.set(id, rgb);
        this.pickColors.set(rgb.join(','), id);
        return rgb;
    }

    drawScene(target, options, picking) {
        const p = target;
        const layerState = options.moves
            ? stateFromMoves(options.moves)
            : (() => {
                const half = options.hex.length / 2;
                const topChars = options.hex.slice(0, half);
                const bottomChars = options.hex.slice(half);
                return {
                    upLayer: hexLayerToDaltonValues(topChars, 'top'),
                    downLayer: hexLayerToDaltonValues(bottomChars, 'bottom'),
                    bar: false,
                };
            })();
        const state = {
            upLayer: layerState.upLayer,
            downLayer: layerState.downLayer,
            bar: layerState.bar,
            scheme: options.scheme,
            piecesColors: options.piecesColors,
            muted: options.muted,
            picking,
        };

        p.clear();
        if (!picking) p.background(0, 0);
        this.applyStroke(p, options.scheme.border, picking);
        p.push();
        const scale = (options.size || 400) / 600;
        p.scale(scale);
        const { w, x, y, z } = normalizeQuaternion(options.orientation ?? DEFAULT_ORIENTATION);
        const halfAngleSin = Math.hypot(x, y, z);
        if (halfAngleSin > Number.EPSILON) {
            p.rotate(2 * Math.atan2(halfAngleSin, w), [x / halfAngleSin, y / halfAngleSin, z / halfAngleSin]);
        }
        this.restCube(p, state);
        p.pop();
    }

    fillSurface(p, state, color, pickId = '') {
        if (state.picking) {
            p.fill(...this.colorForPickId(pickId));
            return;
        }
        if (colorIsTransparent(color)) p.noFill();
        else p.fill(color);
    }

    applyStroke(p, border, picking) {
        if (picking || colorIsTransparent(border)) {
            p.noStroke();
            return;
        }
        p.stroke(border);
        p.strokeWeight(3);
    }

    edge(p) {
        p.beginShape();
        p.vertex(0, 0, 0);
        p.vertex(0, -this.edgeRadius, 0);
        p.vertex(this.edgeRadius * Math.cos(Math.PI / 3), -this.edgeRadius * Math.sin(Math.PI / 3), 0);
        p.endShape(p.CLOSE);
    }

    corner(p) {
        p.beginShape();
        p.vertex(0, 0, 0);
        p.vertex(0, -this.edgeRadius, 0);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 3), -this.cornerRadius * Math.sin(Math.PI / 3), 0);
        p.vertex(this.edgeRadius * Math.cos(Math.PI / 6), -this.edgeRadius * Math.sin(Math.PI / 6), 0);
        p.endShape(p.CLOSE);
    }

    cshape(p, state, isTop, isRight, isInternal) {
        p.push();
        const startPosition = isRight ? 0 : 6;
        if (isTop && !isInternal) p.translate(0, 0, this.len / 2);
        else if (!isTop && !isInternal) p.translate(0, 0, -this.len / 2);
        else if (isTop && isInternal) p.translate(0, 0, this.len / 6);
        else p.translate(0, 0, -this.len / 6);

        const layer = isTop ? state.upLayer : state.downLayer;
        if (isTop) {
            for (let i = startPosition; i < startPosition + 6; i++) {
                const value = layer[i];
                p.push();
                p.rotateZ(Math.PI / 6 * i);
                if (Math.abs(value) < 1) {
                    const id = isInternal ? '' : getPieceSurfaceId(value, 'inner');
                    const color = isInternal ? state.scheme.internal : getTopBottomSurfaceColor(value, true, state.piecesColors, state.scheme, state.muted);
                    this.fillSurface(p, state, color, id);
                    this.edge(p);
                } else {
                    const id = isInternal ? '' : getPieceSurfaceId(value, 'top');
                    const color = isInternal ? state.scheme.internal : getTopBottomSurfaceColor(value, true, state.piecesColors, state.scheme, state.muted);
                    this.fillSurface(p, state, color, id);
                    this.corner(p);
                    i++;
                }
                p.pop();
            }
        } else {
            p.push();
            p.rotateZ(Math.PI);
            for (let i = startPosition; i < startPosition + 6; i++) {
                const value = layer[i];
                p.push();
                if (Math.abs(value) < 1) {
                    p.rotateZ(-(i + 1) * Math.PI / 6);
                    const id = isInternal ? '' : getPieceSurfaceId(value, 'inner');
                    const color = isInternal ? state.scheme.internal : getTopBottomSurfaceColor(value, false, state.piecesColors, state.scheme, state.muted);
                    this.fillSurface(p, state, color, id);
                    this.edge(p);
                } else {
                    p.rotateZ(-(i + 2) * Math.PI / 6);
                    const id = isInternal ? '' : getPieceSurfaceId(value, 'top');
                    const color = isInternal ? state.scheme.internal : getTopBottomSurfaceColor(value, false, state.piecesColors, state.scheme, state.muted);
                    this.fillSurface(p, state, color, id);
                    this.corner(p);
                    i++;
                }
                p.pop();
            }
            p.pop();
        }
        p.pop();
    }

    eadj(p) {
        p.beginShape(p.QUADS);
        p.vertex(0, -this.edgeRadius, this.len / 6);
        p.vertex(this.edgeRadius * Math.cos(Math.PI / 3), -this.edgeRadius * Math.sin(Math.PI / 3), this.len / 6);
        p.vertex(this.edgeRadius * Math.cos(Math.PI / 3), -this.edgeRadius * Math.sin(Math.PI / 3), -this.len / 6);
        p.vertex(0, -this.edgeRadius, -this.len / 6);
        p.endShape();
    }

    cadj(p) {
        p.beginShape(p.QUADS);
        p.vertex(0, -this.edgeRadius, this.len / 6);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 3), -this.cornerRadius * Math.sin(Math.PI / 3), this.len / 6);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 3), -this.cornerRadius * Math.sin(Math.PI / 3), -this.len / 6);
        p.vertex(0, -this.edgeRadius, -this.len / 6);
        p.endShape();
    }

    layerSides(p, state, isTop, isRight) {
        const startPosition = isRight ? 0 : 6;
        const layer = isTop ? state.upLayer : state.downLayer;
        if (isTop) {
            for (let i = startPosition; i < startPosition + 6; i++) {
                const value = layer[i];
                p.push();
                p.rotateZ(i * Math.PI / 6);
                if (Math.abs(value) < 1) {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'outer', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'outer'));
                    p.translate(0, 0, this.len / 3);
                    this.eadj(p);
                } else if (value >= 1) {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'right', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'right'));
                    p.translate(0, 0, this.len / 3);
                    this.cadj(p);
                } else {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'left', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'left'));
                    p.rotateZ(Math.PI / 3);
                    p.translate(-this.cornerRadius * Math.cos(Math.PI / 6), this.edgeRadius - this.cornerRadius * Math.sin(Math.PI / 6), this.len / 3);
                    this.cadj(p);
                }
                p.pop();
            }
        } else {
            for (let i = startPosition; i < startPosition + 6; i++) {
                const value = layer[i];
                p.push();
                p.rotateZ(Math.PI);
                if (Math.abs(value) < 1) {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'outer', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'outer'));
                    p.rotateZ(-(i + 1) * Math.PI / 6);
                    p.translate(0, 0, -this.len / 3);
                    this.eadj(p);
                } else if (value >= 1) {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'right', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'right'));
                    p.rotateZ(-(i - 1) * Math.PI / 6);
                    p.translate(-this.cornerRadius * Math.cos(Math.PI / 6), this.edgeRadius - this.cornerRadius * Math.sin(Math.PI / 6), -this.len / 3);
                    this.cadj(p);
                } else {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'left', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'left'));
                    p.rotateZ(-(i + 1) * Math.PI / 6);
                    p.translate(0, 0, -this.len / 3);
                    this.cadj(p);
                }
                p.pop();
            }
        }
    }

    equatorBar(p) {
        p.beginShape(p.QUADS);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 3), -this.cornerRadius * Math.sin(Math.PI / 3), this.len / 6);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 6), this.cornerRadius * Math.sin(Math.PI / 6), this.len / 6);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 6), this.cornerRadius * Math.sin(Math.PI / 6), -this.len / 6);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 3), -this.cornerRadius * Math.sin(Math.PI / 3), -this.len / 6);
        p.endShape();
    }

    equatorEndLong(p) {
        p.beginShape(p.QUADS);
        p.vertex(0, this.edgeRadius, this.len / 6);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 6), this.cornerRadius * Math.sin(Math.PI / 6), this.len / 6);
        p.vertex(this.cornerRadius * Math.cos(Math.PI / 6), this.cornerRadius * Math.sin(Math.PI / 6), -this.len / 6);
        p.vertex(0, this.edgeRadius, -this.len / 6);
        p.endShape();
    }

    coreTops(p, state, isRight) {
        p.push();
        if (isRight) p.rotateZ(Math.PI);
        this.fillSurface(p, state, getSliceSurfaceColor('internal', state.piecesColors, state.scheme, state.muted), 'slice internal');
        p.beginShape(p.QUADS);
        p.vertex(0, -this.edgeRadius, this.len / 6);
        p.vertex(-this.cornerRadius * Math.cos(Math.PI / 6), -this.cornerRadius * Math.sin(Math.PI / 6), this.len / 6);
        p.vertex(-this.cornerRadius * Math.cos(Math.PI / 3), this.cornerRadius * Math.sin(Math.PI / 3), this.len / 6);
        p.vertex(0, this.edgeRadius, this.len / 6);
        p.vertex(0, -this.edgeRadius, -this.len / 6);
        p.vertex(-this.cornerRadius * Math.cos(Math.PI / 6), -this.cornerRadius * Math.sin(Math.PI / 6), -this.len / 6);
        p.vertex(-this.cornerRadius * Math.cos(Math.PI / 3), this.cornerRadius * Math.sin(Math.PI / 3), -this.len / 6);
        p.vertex(0, this.edgeRadius, -this.len / 6);
        p.endShape();
        p.pop();
    }

    equator(p, state, isRight, barflip = false) {
        p.push();
        if (barflip) p.rotateX(Math.PI);
        this.coreTops(p, state, isRight);
        if (isRight) {
            this.fillSurface(p, state, getSliceSurfaceColor('right', state.piecesColors, state.scheme, state.muted), 'slice right');
            this.equatorBar(p);
            this.fillSurface(p, state, getSliceSurfaceColor('front', state.piecesColors, state.scheme, state.muted), 'slice front');
            this.equatorEndLong(p);
            this.fillSurface(p, state, getSliceSurfaceColor('back', state.piecesColors, state.scheme, state.muted), 'slice back');
            this.cadj(p);
        } else {
            p.rotateZ(Math.PI);
            this.fillSurface(p, state, getSliceSurfaceColor('left', state.piecesColors, state.scheme, state.muted), 'slice left');
            this.equatorBar(p);
            this.fillSurface(p, state, getSliceSurfaceColor('back', state.piecesColors, state.scheme, state.muted), 'slice back');
            this.equatorEndLong(p);
            this.fillSurface(p, state, getSliceSurfaceColor('front', state.piecesColors, state.scheme, state.muted), 'slice front');
            this.cadj(p);
        }
        p.pop();
    }

    sliceInternal(p, state) {
        this.fillSurface(p, state, getSliceSurfaceColor('internal', state.piecesColors, state.scheme, state.muted), 'slice internal');
        p.beginShape(p.QUADS);
        p.vertex(0, -this.edgeRadius, -this.len / 2);
        p.vertex(0, this.edgeRadius, -this.len / 2);
        p.vertex(0, this.edgeRadius, this.len / 2);
        p.vertex(0, -this.edgeRadius, this.len / 2);
        p.endShape();
    }

    leftCube(p, state) {
        this.cshape(p, state, true, false, false);
        this.cshape(p, state, false, false, false);
        this.cshape(p, state, true, false, true);
        this.cshape(p, state, false, false, true);
        this.layerSides(p, state, true, false);
        this.layerSides(p, state, false, false);
        this.equator(p, state, false, false);
        this.sliceInternal(p, state);
    }

    rightCube(p, state) {
        this.cshape(p, state, true, true, false);
        this.cshape(p, state, false, true, false);
        this.cshape(p, state, true, true, true);
        this.cshape(p, state, false, true, true);
        this.layerSides(p, state, true, true);
        this.layerSides(p, state, false, true);
        this.equator(p, state, true, state.bar);
        this.sliceInternal(p, state);
    }

    restCube(p, state) {
        this.leftCube(p, state);
        this.rightCube(p, state);
    }
}

export { DEFAULT_HEX as DALTON_3D_DEFAULT_HEX, DEFAULT_ORIENTATION as DALTON_3D_DEFAULT_ORIENTATION, graphicsHelpText };
