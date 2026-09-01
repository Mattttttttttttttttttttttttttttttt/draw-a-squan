// =============================================================================
// Shared API configuration for the Square-1 image API.
//
// Imported by BOTH the browser app (scripts/script.js) and the serverless
// Cloud Function (functions/index.js) so that link generation (client) and
// request parsing (server) always agree on param names, defaults and presets.
// =============================================================================

export const API_BASE_URL = 'https://squan-go.web.app/draw/api';

// --------------------------------------------------------------------------
// Parameter names & defaults.
//
// Every parameter has a sane default so callers only include what they want
// to override — small links are the happy path.
// --------------------------------------------------------------------------
export const PARAM_DEFAULTS = {
  input: null,          // scramble | alg | hex (required; server 400s if missing)
  mode: 'scramble',     // scramble | inverse | hex
  style: 'SAC2',        // SAC2 | Abid (Dalton3D not supported by the API yet)
  size: 400,            // image size in px (decides resolution)
  pad: 0,               // effective padding % (see PAD_SAFE_ZERO notes)
  gap: 100,             // layer distance %
  orient: 'horizontal', // horizontal | vertical
  layer: 'both',        // both | top | bottom
  fmt: 'png',           // png | svg (jpeg/bmp fall back to png server-side)
  hideSlice: false,     // hide the slice indicator
  hideSides: false,     // hide side colors (SAC2 only)
  // Abid-only style controls (ignored for other designs)
  layerRatio: 0.76,
  strokeOuter: 0.016,
  strokeSlice: 0.016,
  strokeInner: 0.0135,
  // Color scheme
  scheme: 'classic',    // classic | custom
  // c = comma separated "slotId:color" pairs (only read when scheme=custom)
  c: null,
  // pc = base64url "color:idx,idx;color:idx" per-sticker recolor overrides
  pc: null,
};

// Map friendly API param name -> the core's styleSettings key.
export const STROKE_PARAM_TO_KEY = {
  strokeOuter: 'strokeWidthOuter',
  strokeSlice: 'sliceStrokeWidth',
  strokeInner: 'strokeWidthInner',
};

// Styles known to the API (in the same display order as the app).
// Dalton's 3D design is intentionally excluded for now.
export const API_STYLES = [
  { name: "SAC2's Design", source: 'SAC2', index: 0 },
  { name: "Abid's Design", source: 'Abid', index: 1 },
];

// --------------------------------------------------------------------------
// Presets.
//
// Shape: { key: { label, params } } where `params` uses the SAME key names as
// PARAM_DEFAULTS. `&p=<key>` expands to these params, then any explicit query
// params override them. Roughly "hardcoded common configurations usable
// worldwide".
//
// Add new ones by dumping the current UI state with the hidden shortcut
// (Alt+Shift+P in the app) and pasting the object here.
// --------------------------------------------------------------------------
export const PRESETS = {
  // Every preset is keyed by a short name usable in API links as &p=<key> and
  // in the app via applySquanPreset('<key>') from the browser console.
  //
  // Use the hidden shortcut (Alt+Shift+P in the app) to copy the current UI
  // state as a ready-to-paste preset object, then drop it into this map:
  //
//   "my presets": {
//     label: "My Preset",
//     // NOTE: a preset must NOT set input/mode/fmt — those describe the puzzle
//     // being rendered, not its look & feel. Any forbidden key is stripped at
//     // expansion time; the caller's ?input= always wins.
//     params: { style: "Abid", gap: 120, layerRatio: 0.8, ... },
//   },
  //
  // Example (tasteful Abid baseline) — replace or remove whenever you like.
  "abid-standard": {
    label: "Abid Standard",
    params: { style: "Abid", gap: 120, layerRatio: 0.8 },
  },
  "sac2-slim": {
    label: "SAC2 Slim",
    params: { style: "SAC2", gap: 80 },
  },
  "tight-layers": {
    label: "Tight Layers",
    params: { gap: 60, layerRatio: 0.5 },
  },
  // Colors-only preset: sets ONLY the color scheme, leaves the design (style /
  // gap / strokes / everything else) untouched. Stack with a design preset or
  // let the explicit params / defaults decide the rest.
  "warm-rubik": {
    label: "Warm Rubik Colors",
    params: {
      scheme: "custom",
      c: "front:#E63946,right:#F4A261,back:#E76F51,left:#F1C40F",
    },
  },
};

// --------------------------------------------------------------------------
// Pure helpers shared by client + server.
// --------------------------------------------------------------------------

export function truthy(v) {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  if (v === false || v === 'false' || v === '0' || v === 0) return false;
  return Boolean(v);
}

function parseFloatParam(raw, fallback) {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntParam(raw, fallback) {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

// Params that a preset may never set — they describe the puzzle being rendered
// (which input, how to interpret it, image format, and recursion), not a style
// preference. Presets are meant to be pure "look & feel" stacks, so we strip
// these out of any preset's params at expansion time. The caller's explicit
// ?input= (and mode/fmt/p) always win.
const PRESET_FORBIDDEN = ['input', 'mode', 'fmt', 'p', 'pc'];

// Expand &p= preset(s) over a base params object, then overlay explicit params.
// Precedence (lowest → highest): base defaults → later-listed presets →
// earlier-listed presets → explicit params.
//
// Presets are stackable: &p=a,b applies preset a then preset b, with the
// FIRST-mentioned preset winning any conflict (applied last here). A single
// (&p=a) works exactly as before. Explicit query params always win over presets.
export function expandPreset(params = {}, presetKeys) {
  const keys = (Array.isArray(presetKeys) ? presetKeys : String(presetKeys ?? '').split(','))
    .map(k => String(k).trim()).filter(Boolean);
  let out = { ...params };
  // Apply from LAST to FIRST so the first-mentioned preset takes priority.
  for (let i = keys.length - 1; i >= 0; i--) {
    const preset = PRESETS[keys[i]];
    if (!preset || !preset.params) continue;
    // Drop any forbidden keys from the preset's params so a preset can never
    // hardcode the input / mode / format / nested preset.
    const safe = { ...preset.params };
    for (const fk of PRESET_FORBIDDEN) delete safe[fk];
    out = { ...out, ...safe };
  }
  return out;
}

// Turn a flat params object into a URL-encoded query string.
// `input` and any empty values are included so callers can build the
// spreadsheet formula around a variable input value.
export function buildQueryString(params = {}) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    let v = value;
    if (typeof v === 'boolean') v = v ? '1' : '0';
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return parts.join('&');
}

// --------------------------------------------------------------------------
// Per-sticker recolor encoding (pc=).
//
// Custom color mode is not fully custom: it starts from the classical scheme
// mapping and lets you repaint individual pieces independently (mute mode is
// just one such repaint). So instead of serializing the whole verbose
// getPiecesColors() tree, every sticker is given a FIXED index (0..46) and we
// only encode the stickers that differ from the default mapping, grouped by
// their (new) color value, as:
//
//     color:idx,idx,idx;color:idx
//
// then base64url the whole thing. The server reconstructs by first applying
// the classical/default mapping, then overlaying each group's color onto the
// listed sticker indices — links stay as short as possible.
//
// Sticker index assignment (share between client encoder and server decoder):
//   Edges   (8 pieces, hex ids 0,2,4,6,8,a,c,e)  inner,outer
//   Corners (8 pieces, hex ids 1,3,5,7,9,b,d,f)  top,left,right
//   Slices  top,bottom,left,right,front,back,internal
// --------------------------------------------------------------------------
const EDGE_PIECES = ['0', '2', '4', '6', '8', 'a', 'c', 'e'];
const CORNER_PIECES = ['1', '3', '5', '7', '9', 'b', 'd', 'f'];
const SLICE_SIDES = ['top', 'bottom', 'left', 'right', 'front', 'back', 'internal'];

// Canonical default color VALUE for each sticker (mirrors the core's
// createDefaultPieceColors()). Single source of truth for both the encoder
// (which stickers differ?) and the decoder (base skeleton to start from), so
// they can never drift apart.
const DEFAULT_EDGE_OUTER = { '0': 'back', '2': 'left', '4': 'front', '6': 'right', '8': 'right', 'a': 'front', 'c': 'left', 'e': 'back' };
const DEFAULT_SLICE_EDGE_INNER = { '0': 'top', '2': 'top', '4': 'top', '6': 'top', '8': 'bottom', 'a': 'bottom', 'c': 'bottom', 'e': 'bottom' };
const DEFAULT_CORNER = {
  '1': { top: 'top', left: 'back', right: 'left' },
  '3': { top: 'top', left: 'left', right: 'front' },
  '5': { top: 'top', left: 'front', right: 'right' },
  '7': { top: 'top', left: 'right', right: 'back' },
  '9': { top: 'bottom', left: 'back', right: 'right' },
  'b': { top: 'bottom', left: 'right', right: 'front' },
  'd': { top: 'bottom', left: 'front', right: 'left' },
  'f': { top: 'bottom', left: 'left', right: 'back' },
};
const DEFAULT_SLICE = { top: 'top', bottom: 'bottom', left: 'left', right: 'right', front: 'front', back: 'back', internal: 'internal' };

function schemaDefaultPiecesColors() {
  const edgeColors = {};
  for (const p of EDGE_PIECES) edgeColors[p] = { inner: DEFAULT_SLICE_EDGE_INNER[p], outer: DEFAULT_EDGE_OUTER[p] };
  const cornerColors = {};
  for (const p of CORNER_PIECES) cornerColors[p] = { ...DEFAULT_CORNER[p] };
  return { edgeColors, cornerColors, sliceColors: { ...DEFAULT_SLICE } };
}

// Build a stable "kind:piece:side" -> global sticker index (0..46).
export function buildStickerIndex() {
  const map = {};
  let n = 0;
  for (const p of EDGE_PIECES) {
    map[`e:${p}:inner`] = n++;
    map[`e:${p}:outer`] = n++;
  }
  for (const p of CORNER_PIECES) {
    map[`c:${p}:top`] = n++;
    map[`c:${p}:left`] = n++;
    map[`c:${p}:right`] = n++;
  }
  for (const s of SLICE_SIDES) {
    map[`s:${s}`] = n++;
  }
  return map;
}

// Reverse: sticker index -> "kind:piece:side" (or "kind:side" for slices).
export function buildStickerIndexReverse() {
  const fwd = buildStickerIndex();
  const rev = {};
  for (const [key, idx] of Object.entries(fwd)) rev[idx] = key;
  return rev;
}

// Recursive/ordered deep equality for plain JSON-like objects.
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

function b64urlEncode(str) {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Buffer.from(str, 'utf8').toString('base64url');
}

function b64urlDecode(str) {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(String(str).replace(/-/g, '+').replace(/_/g, '/'))));
  }
  return Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64url').toString('utf8');
}

// Encode per-sticker recolor overrides as a short base64url string.
// Returns null when `pc` matches the default mapping (nothing changed), so
// callers can omit pc= entirely for the default look.
export function encodePieceColors(pc) {
  if (!pc) return null;
  const defaults = schemaDefaultPiecesColors();
  if (deepEqual(pc, defaults)) return null;

  const groups = new Map(); // colorValue -> [stickerIndex, ...]
  const add = (color, idx) => {
    if (!groups.has(color)) groups.set(color, []);
    groups.get(color).push(idx);
  };

  for (const p of EDGE_PIECES) {
    const piece = pc.edgeColors?.[p];
    for (const side of ['inner', 'outer']) {
      if (piece?.[side] === defaults.edgeColors[p][side]) continue;
      add(piece[side], buildStickerIndex()[`e:${p}:${side}`]);
    }
  }
  for (const p of CORNER_PIECES) {
    const piece = pc.cornerColors?.[p];
    for (const side of ['top', 'left', 'right']) {
      if (piece?.[side] === defaults.cornerColors[p][side]) continue;
      add(piece[side], buildStickerIndex()[`c:${p}:${side}`]);
    }
  }
  for (const s of SLICE_SIDES) {
    if (pc.sliceColors?.[s] === defaults.sliceColors[s]) continue;
    add(pc.sliceColors[s], buildStickerIndex()[`s:${s}`]);
  }

  if (groups.size === 0) return null;

  const parts = [];
  for (const [color, idxs] of groups) {
    parts.push(`${color}:${idxs.join(',')}`);
  }
  return b64urlEncode(parts.join(';'));
}

// Decode a pc= string back into a full {edgeColors, cornerColors, sliceColors}
// object by starting from the classical default mapping and applying each
// color group's sticker indices.
export function decodePieceColors(encoded) {
  const defaults = schemaDefaultPiecesColors();
  if (!encoded) return defaults;

  const reverse = buildStickerIndexReverse();
  try {
    const wire = b64urlDecode(encoded);
    for (const group of wire.split(';')) {
      if (!group) continue;
      const ci = group.indexOf(':');
      if (ci === -1) continue;
      const color = group.slice(0, ci);
      for (const idxStr of group.slice(ci + 1).split(',')) {
        const key = reverse[parseInt(idxStr, 10)];
        if (!key) continue;
        const kind = key[0];
        const rest = key.slice(2); // "piece:side" or "side"
        if (kind === 'e') {
          const [p, side] = rest.split(':');
          defaults.edgeColors[p] = { ...defaults.edgeColors[p], [side]: color };
        } else if (kind === 'c') {
          const [p, side] = rest.split(':');
          defaults.cornerColors[p] = { ...defaults.cornerColors[p], [side]: color };
        } else if (kind === 's') {
          defaults.sliceColors[rest] = color;
        }
      }
    }
  } catch (err) {
    // Malformed pc= — fall back to the plain default mapping.
  }
  return defaults;
}

// Parse an API query (like req.query / URLSearchParams) into a fully-resolved
// settings object that the renderer can use directly.
//
// Returns:
// {
//   input, mode, fmt, layer,
//   styleIndex, showSideColors,
//   styleSettings,             // for the renderer (uses core key names)
//   colorScheme,               // only set for custom schemes
//   size, ringDistance, isVertical, showSlice, exportPad,
// }
export function resolveSettings(query = {}) {
  const presetKey = query.p;
  const base = { ...PARAM_DEFAULTS };
  const merged = expandPreset(base, presetKey);

  // Apply real query params (ignore the presence marker we already used).
  for (const key of Object.keys(merged)) {
    if (key === 'p') continue;
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      merged[key] = query[key];
    }
  }

  const input = merged.input != null ? String(merged.input) : null;
  const mode = String(merged.mode || 'scramble').toLowerCase();
  const fmt = String(merged.fmt || 'png').toLowerCase();
  const layer = String(merged.layer || 'both').toLowerCase();

  // ---- design / style -----------------------------------------------
  let styleIndex;
  const styleVal = String(merged.style ?? '').trim();
  if (styleVal === '') {
    styleIndex = 0; // SAC2 (matches app default)
  } else if (/^\d+$/.test(styleVal)) {
    styleIndex = parseIntParam(styleVal, 0);
    if (!API_STYLES.some(s => s.index === styleIndex)) {
      throw new Error(`Unknown style index "${styleVal}". Supported: ${API_STYLES.map(s => `${s.index}=${s.source}`).join(', ')}.`);
    }
  } else {
    const found = API_STYLES.find(s => s.source.toLowerCase() === styleVal.toLowerCase() || s.name.toLowerCase() === styleVal.toLowerCase());
    if (!found) {
      throw new Error(`Unknown style "${styleVal}". Supported designs: ${API_STYLES.map(s => s.source).join(', ')}.`);
    }
    styleIndex = found.index;
  }
  const showSideColors = !truthy(merged.hideSides);

  // ---- style-specific settings (Abid) --------------------------------
  const styleSettings = {};
  if (Object.prototype.hasOwnProperty.call(merged, 'layerRatio')) {
    styleSettings.layerRatio = parseFloatParam(merged.layerRatio, PARAM_DEFAULTS.layerRatio);
  }
  for (const [paramKey, coreKey] of Object.entries(STROKE_PARAM_TO_KEY)) {
    if (Object.prototype.hasOwnProperty.call(merged, paramKey)) {
      styleSettings[coreKey] = parseFloatParam(merged[paramKey], PARAM_DEFAULTS[paramKey]);
    }
  }

  // ---- color scheme ---------------------------------------------------
  const scheme = String(merged.scheme || 'classic').toLowerCase();
  let colorScheme;
  if (scheme === 'custom' && merged.c) {
    colorScheme = {};
    // The c= value is "slot:color,slot:color,...". Colored values may be
    // comma-containing rgba(...) strings, so splitting on "," would truncate
    // them at the first comma. Recombine fragments that trail a "slot:" value
    // (fragments without a ":") back onto the previous slot.
    let lastSlot = null;
    for (const part of String(merged.c).split(',')) {
      const idx = part.indexOf(':');
      if (idx !== -1) {
        lastSlot = part.slice(0, idx).trim();
        colorScheme[lastSlot] = part.slice(idx + 1).trim();
      } else if (lastSlot) {
        colorScheme[lastSlot] += ',' + part.trim();
      }
    }
    // Tolerate a leading # being eaten by URL parsers / spreadsheets.
    for (const slotId of Object.keys(colorScheme)) {
      let color = colorScheme[slotId];
      color = color.replace(/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3,8})(?:[^0-9a-fA-F]|$)/, '#$1');
      colorScheme[slotId] = color;
    }
  } else if (scheme !== 'classic' && scheme !== 'custom') {
    throw new Error(`Unknown scheme "${scheme}". Use "classic" or "custom".`);
  }

  // ---- global rendering options ---------------------------------------
  const size = parseIntParam(merged.size, PARAM_DEFAULTS.size);
  const gap = parseIntParam(merged.gap, PARAM_DEFAULTS.gap);
  const isVertical = String(merged.orient || 'horizontal').toLowerCase() === 'vertical';
  const hideSlice = truthy(merged.hideSlice);
  const pad = parseIntParam(merged.pad, PARAM_DEFAULTS.pad);
  const sc = Math.round(size * (220 / 400));
  const exportPad = Math.round(sc * pad / 100);

  // ---- per-sticker recolor overrides ------------------------------------
  // Optional base64url "color:idx,idx;color:idx" string (see encodePieceColors).
  // Absent -> no per-sticker overrides (classical default mapping).
  const piecesColors = merged.pc ? decodePieceColors(String(merged.pc)) : undefined;

  return {
    input,
    mode,
    fmt,
    layer,
    styleIndex,
    showSideColors,
    styleSettings,
    colorScheme,
    piecesColors,
    size,
    ringDistance: gap,
    isVertical,
    showSlice: !hideSlice,
    exportPad,
  };
}
