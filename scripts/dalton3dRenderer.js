import * as THREE from './three.module.min.js';

const CORNERS = ['1', '3', '5', '7', '9', 'b', 'd', 'f'];
const DEFAULT_HEX = '011233455677|998bbaddcffe';

const MODEL_FACE_ALIGNMENT = { x: 90, y: 0, z: 0 };
const CONTROL_AXES_ALIGNMENT = { x: 0, y: 0, z: -15 };
const HERO_SLIDER_VALUES = { rotationX: -33, rotationY: -45, rotationZ: 0 };
const HERO_CONTROL_FRAME_ROTATION = { x: 54.73561, y: 0, z: 45 };
const HERO_VIEW_FINE_TUNE = { x: 0, y: 0, z: 0 };
const DEFAULT_ORIENTATION_VERSION = 10;
const modelFaceOrientation = orientationFromRotations(MODEL_FACE_ALIGNMENT);
const controlAxesOrientation = orientationFromRotations(CONTROL_AXES_ALIGNMENT);
const AXIS_ALIGNED_ORIENTATION = normalizeQuaternion(multiplyQuaternions(
    modelFaceOrientation,
    inverseQuaternion(controlAxesOrientation),
));
const DEFAULT_ORIENTATION = normalizeQuaternion(multiplyQuaternions(
    orientationFromRotations(HERO_VIEW_FINE_TUNE),
    multiplyQuaternions(
        orientationFromLocalRotations(HERO_CONTROL_FRAME_ROTATION),
        inverseQuaternion(controlAxesOrientation),
    ),
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

function getTopBottomSurfaceColor(value, piecesColors, scheme, muted) {
    const piece = pieceHexFromLayerValue(value);
    if (!piece) return scheme.internal;
    const bucket = Math.abs(value) < 1 ? piecesColors.edgeColors : piecesColors.cornerColors;
    const role = Math.abs(value) < 1 ? 'inner' : 'top';
    const current = bucket[piece]?.[role];
    const color = resolveColor(current, scheme);
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

function inverseQuaternion(quaternion) {
    const q = normalizeQuaternion(quaternion);
    return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
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

function orientationFromLocalRotations(rotations) {
    let orientation = { w: 1, x: 0, y: 0, z: 0 };
    for (const axis of ['x', 'y', 'z']) {
        orientation = multiplyQuaternions(
            orientation,
            axisAngleQuaternion(axis, rotations[axis] * Math.PI / 180),
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

class ThreeImmediateAdapter {
    constructor(renderer, scene, camera, picking, target) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.picking = picking;
        this.target = target;
        this.width = 400;
        this.height = 400;
        this.stack = [];
        this.matrix = new THREE.Matrix4();
        this.vertices = [];
        this.colors = [];
        this.shapeVertices = [];
        this.shapeMode = null;
        this.QUADS = 'QUADS';
        this.CLOSE = 'CLOSE';
        this.currentColor = new THREE.Color();
        this.strokeColor = new THREE.Color(0x000000);
        this.strokeEnabled = true;
        this.mesh = null;
        this.lines = null;
    }

    clear() {
        this.matrix.identity();
        this.vertices = [];
        this.colors = [];
        this.shapeVertices = [];
        this.stack = [];
        this.removeOutput();
    }

    background() {}
    push() { this.stack.push(this.matrix.clone()); }
    pop() { this.matrix.copy(this.stack.pop() || new THREE.Matrix4()); }
    translate(x, y, z) { this.matrix.multiply(new THREE.Matrix4().makeTranslation(x, y, z)); }
    scale(value) { this.matrix.multiply(new THREE.Matrix4().makeScale(value, value, value)); }
    rotate(angle, axis) {
        this.matrix.multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...axis), angle));
    }
    rotateX(angle) { this.matrix.multiply(new THREE.Matrix4().makeRotationX(angle)); }
    rotateY(angle) { this.matrix.multiply(new THREE.Matrix4().makeRotationY(angle)); }
    rotateZ(angle) { this.matrix.multiply(new THREE.Matrix4().makeRotationZ(angle)); }
    fill(...args) {
        if (this.picking) {
            this.currentColor.setRGB((args[0] || 0) / 255, (args[1] || 0) / 255, (args[2] || 0) / 255);
        } else {
            this.currentColor.set(args[0]);
        }
    }
    noFill() { this.currentColor.set(0x000000); }
    stroke(color) { this.strokeColor.set(color); this.strokeEnabled = true; }
    noStroke() { this.strokeEnabled = false; }
    strokeWeight() {}
    beginShape(mode) { this.shapeMode = mode; this.shapeVertices = []; }
    vertex(x, y, z = 0) {
        this.shapeVertices.push(new THREE.Vector3(x, y, z).applyMatrix4(this.matrix));
    }
    endShape(mode) {
        if (this.shapeVertices.length < 3) return;
        const verts = this.shapeVertices;
        const triangles = mode === 'CLOSE' || this.shapeMode !== 'QUADS'
            ? verts.slice(1, -1).flatMap((_, i) => [verts[0], verts[i + 1], verts[i + 2]])
            : verts.flatMap((_, i) => i % 4 === 0
                ? [verts[i], verts[i + 1], verts[i + 2], verts[i], verts[i + 2], verts[i + 3]]
                : []);
        for (const vertex of triangles) {
            this.vertices.push(vertex.x, vertex.y, vertex.z);
            this.colors.push(this.currentColor.r, this.currentColor.g, this.currentColor.b);
        }
        if (this.strokeEnabled && !this.picking) {
            for (let i = 0; i < verts.length; i++) this.addLine(verts[i], verts[(i + 1) % verts.length]);
        }
    }
    line(x1, y1, z1, x2, y2, z2) {
        if (!this.picking && this.strokeEnabled) {
            this.addLine(
                new THREE.Vector3(x1, y1, z1).applyMatrix4(this.matrix),
                new THREE.Vector3(x2, y2, z2).applyMatrix4(this.matrix),
            );
        }
    }
    addLine(start, end) {
        if (!this.lineVertices) this.lineVertices = [];
        this.lineVertices.push(start.x, start.y, start.z, end.x, end.y, end.z);
    }
    pickColor(id) {
        const value = this.pickIds.get(id) || this.pickIds.size + 1;
        this.pickIds.set(id, value);
        return new THREE.Color((value & 255) / 255, ((value >> 8) & 255) / 255, ((value >> 16) & 255) / 255);
    }
    render() {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.DoubleSide,
        }));
        this.scene.add(this.mesh);
        if (this.lineVertices?.length) {
            const lineGeometry = new THREE.BufferGeometry();
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.lineVertices, 3));
            this.lines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: this.strokeColor }));
            this.scene.add(this.lines);
        }
        this.renderer.setRenderTarget(this.target);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
    }
    get(x, y) {
        const pixel = new Uint8Array(4);
        this.renderer.readRenderTargetPixels(this.target, x, this.height - y, 1, 1, pixel);
        return [pixel[0], pixel[1], pixel[2], pixel[3]];
    }
    removeOutput() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.lines) {
            this.scene.remove(this.lines);
            this.lines.geometry.dispose();
            this.lines.material.dispose();
        }
        this.mesh = null;
        this.lines = null;
        this.lineVertices = [];
    }
}

export class Dalton3DRenderer {
    constructor(container, { onStickerClick } = {}) {
        this.container = container;
        this.onStickerClick = onStickerClick;
        this.p5 = null;
        this.pickGraphics = null;
        this.pickIds = new Map();
        this.pickColors = new Map();
        this.scene = null;
        this.camera = null;
        this.cameraRig = null;
        this.threeRenderer = null;
        this.pickTarget = null;
        this.orbit = { dragging: false, moved: false, x: 0, y: 0, zone: 1 };
        this.ready = false;
        this.failed = false;
        this.lastOptions = null;
        this.len = 250;
        this.edgeRadius = 0;
        this.cornerRadius = 0;
    }

    async init() {
        if (this.ready || this.failed) return;
        try {
            this.threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
            this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.threeRenderer.setClearColor(0x000000, 0);
            this.container.replaceChildren(this.threeRenderer.domElement);
            this.threeRenderer.domElement.className = 'dalton-3d-canvas';
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(45, 1, 1, 3000);
            this.cameraRig = new THREE.Group();
            this.scene.add(this.cameraRig);
            this.cameraRig.add(this.camera);
            this.camera.position.set(0, 720, 300);
            this.camera.lookAt(0, 0, 0);
            this.pickTarget = new THREE.WebGLRenderTarget(400, 400);
            this.p5 = new ThreeImmediateAdapter(this.threeRenderer, this.scene, this.camera, false, null);
            this.pickGraphics = new ThreeImmediateAdapter(this.threeRenderer, this.scene, this.camera, true, this.pickTarget);
            this.edgeRadius = this.len / (2 * Math.cos(Math.PI / 12));
            this.cornerRadius = this.len / 2 * Math.sqrt(2);
            this.resize(400);
            this.bindOrbit();
            this.ready = true;
        } catch (error) {
            this.failed = true;
            this.showFailure();
            console.error(error);
        }
    }

    destroy() {
        this.threeRenderer?.dispose();
        this.pickTarget?.dispose();
        this.p5 = null;
        this.pickGraphics = null;
        this.scene = null;
        this.camera = null;
        this.cameraRig = null;
        this.threeRenderer = null;
        this.ready = false;
    }

    bindOrbit() {
        const canvas = this.threeRenderer.domElement;
        canvas.addEventListener('pointerdown', event => {
            this.orbit.dragging = true;
            this.orbit.moved = false;
            this.orbit.x = event.clientX;
            this.orbit.y = event.clientY;
            this.orbit.zone = Math.hypot(event.offsetX - canvas.clientWidth / 2, event.offsetY - canvas.clientHeight / 2)
                < Math.min(canvas.clientWidth, canvas.clientHeight) * 0.35 ? 1 : 2;
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointerup', event => {
            this.orbit.dragging = false;
            canvas.releasePointerCapture(event.pointerId);
            if (!this.orbit.moved) {
                const rect = canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                const id = this.pickSticker(x, y);
                if (id && this.onStickerClick) this.onStickerClick(id, event);
            }
        });
        canvas.addEventListener('pointermove', event => {
            if (!this.orbit.dragging) return;
            const dx = event.clientX - this.orbit.x;
            const dy = event.clientY - this.orbit.y;
            this.orbit.moved = this.orbit.moved || Math.hypot(dx, dy) > 2;
            const cameraQuaternion = new THREE.Quaternion();
            this.camera.getWorldQuaternion(cameraQuaternion);
            const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQuaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
            const q = new THREE.Quaternion();
            const speed = 0.006;

            if (this.orbit.zone === 1) {
                q.setFromAxisAngle(up, -dx * speed);
                this.cameraRig.quaternion.premultiply(q);
                q.setFromAxisAngle(right, -dy * speed);
                this.cameraRig.quaternion.premultiply(q);
            } else {
                const cx = canvas.clientWidth / 2;
                const cy = canvas.clientHeight / 2;
                const vecX = this.orbit.x - canvas.getBoundingClientRect().left - cx;
                const vecY = this.orbit.y - canvas.getBoundingClientRect().top - cy;
                const length = Math.hypot(vecX, vecY);

                if (length > 0.001) {
                    const radialX = vecX / length;
                    const radialY = vecY / length;
                    const tangentX = -radialY;
                    const tangentY = radialX;
                    const centralMagnitude = dx * radialX + dy * radialY;
                    const centralX = centralMagnitude * radialX;
                    const centralY = centralMagnitude * radialY;

                    q.setFromAxisAngle(up, -centralX * speed);
                    this.cameraRig.quaternion.premultiply(q);
                    q.setFromAxisAngle(right, -centralY * speed);
                    this.cameraRig.quaternion.premultiply(q);
                    q.setFromAxisAngle(forward, -(dx * tangentX + dy * tangentY) * speed);
                    this.cameraRig.quaternion.premultiply(q);
                }
            }
            this.cameraRig.quaternion.normalize();
            this.orbit.x = event.clientX;
            this.orbit.y = event.clientY;
            this.threeRenderer.render(this.scene, this.camera);
        });
        canvas.addEventListener('wheel', event => {
            event.preventDefault();
            const distance = THREE.MathUtils.clamp(
                Math.abs(this.camera.position.z) * (event.deltaY > 0 ? 1.1 : 0.9),
                320,
                1300,
            );
            this.camera.position.z = Math.sign(this.camera.position.z || -1) * distance;
            this.threeRenderer.render(this.scene, this.camera);
        }, { passive: false });
    }

    showFailure() {
        this.container.innerHTML = `<div class="error-banner">${graphicsHelpText()}</div>`;
    }

    resize(size) {
        if (!this.threeRenderer || !this.ready && !this.camera) return;
        const dimension = Number(size) || 400;
        this.threeRenderer.setSize(dimension, dimension, false);
        this.camera.aspect = 1;
        this.camera.updateProjectionMatrix();
        this.pickTarget?.setSize(dimension, dimension);
        this.p5.width = dimension;
        this.p5.height = dimension;
        this.pickGraphics.width = dimension;
        this.pickGraphics.height = dimension;
    }

    render(rawHex, options) {
        this.lastOptions = {
            ...options,
            hex: options.moves ? null : normalizeHex(rawHex || DEFAULT_HEX),
            orientation: normalizeQuaternion(options.orientation ?? DEFAULT_ORIENTATION),
        };
        this.resize(options.size);
        if (this.p5 && this.ready) {
            this.drawScene(this.p5, this.lastOptions, false);
            this.p5.render();
            this.threeRenderer.render(this.scene, this.camera);
        }
    }

    getCanvas() {
        return this.threeRenderer?.domElement ?? null;
    }

    getExportCanvas() {
        const source = this.getCanvas();
        if (!source || !this.p5 || !this.lastOptions) return null;

        this.render(null, { ...this.lastOptions, showAbsoluteAxes: false });
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        canvas.getContext('2d').drawImage(source, 0, 0);
        this.render(null, this.lastOptions);
        return canvas;
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
        this.pickGraphics.clear();
        if (this.p5.mesh) this.p5.mesh.visible = false;
        if (this.p5.lines) this.p5.lines.visible = false;
        this.drawScene(this.pickGraphics, this.lastOptions, true);
        this.pickGraphics.render();
        if (this.p5.mesh) this.p5.mesh.visible = true;
        if (this.p5.lines) this.p5.lines.visible = true;
        const [r, g, b] = this.pickGraphics.get(Math.round(x), Math.round(y));
        this.pickGraphics.removeOutput();
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
        if (options.showAbsoluteAxes && !picking) {
            p.push();
            p.scale(scale);
            this.absoluteRotationAxes(p, options.absoluteRotationAxes);
            p.pop();
        }
    }

    absoluteRotationAxes(p, axes = {}) {
        const length = 330;
        const drawAxis = (direction, color) => {
            const [x, y, z] = direction;
            p.stroke(color);
            p.line(-x * length, -y * length, -z * length, x * length, y * length, z * length);
        };
        p.push();
        p.noFill();
        p.strokeWeight(1);
        drawAxis(axes.x ?? [1, 0, 0], '#60D937');
        drawAxis(axes.y ?? [0, 1, 0], '#0433FF');
        drawAxis(axes.z ?? [0, 0, 1], '#FF2600');
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
        if (isTop && !isInternal) p.translate(0, 0, -this.len / 2);
        else if (!isTop && !isInternal) p.translate(0, 0, this.len / 2);
        else if (isTop && isInternal) p.translate(0, 0, -this.len / 6);
        else p.translate(0, 0, this.len / 6);

        const layer = isTop ? state.upLayer : state.downLayer;
        if (isTop) {
            for (let i = startPosition; i < startPosition + 6; i++) {
                const value = layer[i];
                p.push();
                p.rotateZ(Math.PI / 6 * i);
                if (Math.abs(value) < 1) {
                    const id = isInternal ? '' : getPieceSurfaceId(value, 'inner');
                    const color = isInternal ? state.scheme.internal : getTopBottomSurfaceColor(value, state.piecesColors, state.scheme, state.muted);
                    this.fillSurface(p, state, color, id);
                    this.edge(p);
                } else {
                    const id = isInternal ? '' : getPieceSurfaceId(value, 'top');
                    const color = isInternal ? state.scheme.internal : getTopBottomSurfaceColor(value, state.piecesColors, state.scheme, state.muted);
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
                    const color = isInternal ? state.scheme.internal : getTopBottomSurfaceColor(value, state.piecesColors, state.scheme, state.muted);
                    this.fillSurface(p, state, color, id);
                    this.edge(p);
                } else {
                    p.rotateZ(-(i + 2) * Math.PI / 6);
                    const id = isInternal ? '' : getPieceSurfaceId(value, 'top');
                    const color = isInternal ? state.scheme.internal : getTopBottomSurfaceColor(value, state.piecesColors, state.scheme, state.muted);
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
                    p.translate(0, 0, -this.len / 3);
                    this.eadj(p);
                } else if (value >= 1) {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'right', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'right'));
                    p.translate(0, 0, -this.len / 3);
                    this.cadj(p);
                } else {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'left', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'left'));
                    p.rotateZ(Math.PI / 3);
                    p.translate(-this.cornerRadius * Math.cos(Math.PI / 6), this.edgeRadius - this.cornerRadius * Math.sin(Math.PI / 6), -this.len / 3);
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
                    p.translate(0, 0, this.len / 3);
                    this.eadj(p);
                } else if (value >= 1) {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'right', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'right'));
                    p.rotateZ(-(i - 1) * Math.PI / 6);
                    p.translate(-this.cornerRadius * Math.cos(Math.PI / 6), this.edgeRadius - this.cornerRadius * Math.sin(Math.PI / 6), this.len / 3);
                    this.cadj(p);
                } else {
                    this.fillSurface(p, state, getSideSurfaceColor(value, 'left', state.piecesColors, state.scheme, state.muted), getPieceSurfaceId(value, 'left'));
                    p.rotateZ(-(i + 1) * Math.PI / 6);
                    p.translate(0, 0, this.len / 3);
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

export {
    DEFAULT_HEX as DALTON_3D_DEFAULT_HEX,
    AXIS_ALIGNED_ORIENTATION as DALTON_3D_AXIS_ALIGNED_ORIENTATION,
    DEFAULT_ORIENTATION as DALTON_3D_DEFAULT_ORIENTATION,
    CONTROL_AXES_ALIGNMENT as DALTON_3D_CONTROL_AXES_ALIGNMENT,
    HERO_SLIDER_VALUES as DALTON_3D_HERO_SLIDER_VALUES,
    DEFAULT_ORIENTATION_VERSION as DALTON_3D_ORIENTATION_VERSION,
    graphicsHelpText,
};
