// =============================================================================
// Shared API configuration for the Square-1 image API.
//
// Imported by BOTH the browser app (scripts/script.js) and the serverless
// Cloud Function (functions/index.js) so that link generation (client) and
// request parsing (server) always agree on param names, defaults and presets.
// =============================================================================

export const API_BASE_URL = 'https://squan-go.web.app/draw/api/';

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
  // Color section (independent of the settings section above)
  scheme: 'classic',    // classic | custom (optional; colors now driven by cp/c)
  // cp = color preset key(s) that define a named color palette (see COLOR_PRESETS)
  cp: null,
  // c = comma separated "name:color" palette definitions / overrides
  //     (may redefine a cp= color or add a 9th+ named color)
  c: null,
  // pc = base64url "colorName:idx,idx;colorName:idx" custom color FORMATION —
  //     which stickers use which named color (custom/formation only)
  pc: null,
  // pf = named FORMATION preset key (see FORMATION_PRESETS) — an alternative,
  //     pre-built "which sticker gets which color" mapping that combines with
  //     any palette (cp=/c=). An explicit pc= overrides pf=.
  pf: null,
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

// ============================================================================
// Presets are split into TWO independent namespaces that can never interact:
//
//   1. SETTINGS_PRESETS  — the "rest of settings" section. Pure look & feel /
//      output configuration (style, gap, strokes, layers, size, format...).
//      Never sets colors. Applied via &p=<key>.
//
//   2. COLOR_PRESETS     — the "color" section. Defines a named color palette:
//      the 6 face colors (top,bottom,front,right,back,left) plus the slice
//      indicator and stroke, and optionally EXTRA named colors (a 9th color
//      and up) that a custom formation may reference. Applied via &cp=<key>,
//      overridable inline with &c=.
//
// A palette only ever touches colors; a settings preset only ever touches
// design. The API request is therefore the union of two sections:
//
//     ...&p=<settingsPreset>&cp=<colorPreset>&c=left:#FF00FF&pc=<formation>...
//
//   - Color section : &cp= (palette preset) + &c= (inline per-color overrides
//     / redefinitions, including extras) + &pc= (custom color FORMATION —
//     which sticker uses which named color).
//   - Settings section: &p= (design preset) + every other design/output param.
//
// "Custom color" is not part of a color preset. It is a FORMATION: a mapping
// of stickers to color NAMES, those names being resolved by the color
// palette. So a palette can say left=red and a formation can say
// "sticker 38,40 -> left; sticker 37,35,32 -> front", and the same formation
// renders differently under a different palette. To use a color beyond the
// base 8, define it in the palette (c= or a color preset) and reference its
// name in the formation.
// ============================================================================

// --------------------------------------------------------------------------
// Settings presets (the "rest of settings" section).
//
// Shape: { key: { label, params } } where `params` uses the SAME key names as
// PARAM_DEFAULTS (minus any color key). `&p=<key>` expands to these params,
// then any explicit query param of the settings section overrides them.
//
// COLOR KEYS (scheme / c / pc / cp) ARE FORBIDDEN here — a settings preset may
// not set colors, and a color preset may not set design. The two sections stay
// fully independent.
// --------------------------------------------------------------------------
export const SETTINGS_PRESETS = {
  // Use the hidden shortcut (Alt+Shift+P in the app) to copy the current UI
  // state as a ready-to-paste preset object, then drop it into this map:
  //
//   "my settings": {
//     label: "My Settings",
//     params: { style: "Abid", gap: 120, layerRatio: 0.8, ... },
//   },
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
  // "obl" — style-conditional via the engine's own handling: SAC2 honors
  // hideSides (hides the side colors) while completely ignoring layerRatio,
  // and Abid forces sides on (ignoring hideSides) while honoring layerRatio.
  // So one static preset yields: SAC2 → hide side colors, Abid → layerRatio 1.
  "obl": {
    label: "Obl",
    params: { hideSides: true, layerRatio: 1 },
  },
};

// --------------------------------------------------------------------------
// Color presets (the "color" section).
//
// Shape: { key: { label, colors } } where `colors` maps a NAMED color to a CSS
// color value (hex / rgba). The names are typically the 6 face slots
// (top,bottom,front,right,back,left) plus the slice/stroke slots, but any
// string is allowed so a palette can define extra (9th+) named colors.
//
// The palette is applied wholesale, then any inline &c= override redefines
// individual names (useful to keep e.g. "left" red but override it to
// magenta for one request).
// --------------------------------------------------------------------------
export const COLOR_PRESETS = {
  // "default" — the stock face colors plus the muted helper gray used by the
  // related settings presets. Everything else falls back to the style default.
  "default": {
    label: "Default",
    colors: {
      muted: "#818181FF",
    },
  },

  // "white-top" — white top, dark-gray bottom, green left, blue right. The
  // rest of the faces stay at their style defaults.
  "white-top": {
    label: "White Top",
    colors: {
      top: "#FFFFFF",
      bottom: "#474747FF",
      left: "#00AA00",
      right: "#0066CC",
      muted: "#818181FF",
    },
  },

  // "yellow-top" — same as white-top but with a yellow top face.
  "yellow-top": {
    label: "Yellow Top",
    colors: {
      top: "#FFFD00FF",
      bottom: "#474747FF",
      left: "#00AA00",
      right: "#0066CC",
      muted: "#818181FF",
    },
  },

  // "yellow-bottom" — the default palette with just the bottom set yellow.
  "yellow-bottom": {
    label: "Yellow Bottom",
    colors: {
      bottom: "#FFFD00FF",
      muted: "#818181FF",
    },
  },
};

// (Kept as a merged view for tooling; the two sections above are authoritative.)
export const PRESETS = {
  ...Object.fromEntries(Object.entries(SETTINGS_PRESETS).map(([k, v]) => [k, v])),
};

// --------------------------------------------------------------------------
// Formation presets (the "which sticker gets which color" section).
//
// A formation preset assigns palette color NAMES (muted, front, right, back,
// ...) to specific sticker indices, overriding the classical default mapping.
// It lives in the COLOR section and is activated via &pf=<key>; it combines
// with ANY palette (cp= / c=) — the names only resolve once a palette is
// active. It also supports computed color tokens for special cases:
//
//   lighten<pct>:name1,name2   → the per-channel average of name1 and name2,
//                                then lightened toward white by <pct>%, as an
//                                opaque #rrggbb fill (resolved at render time
//                                against the active palette).
//
// Sticker indices 0..46 (see buildStickerIndex): edges 0-15 (inner+outer),
// corners 16-39 (top,left,right), slices 40-46.
// --------------------------------------------------------------------------
function buildFormation(groups) {
  // groups: { colorToken: "idx,idx,from-to,from-to" }
  const out = {};
  for (const [color, spec] of Object.entries(groups)) {
    for (const part of String(spec).split(',')) {
      const tok = part.trim();
      if (tok === '') continue;
      const dash = tok.split('-');
      const a = parseInt(dash[0], 10);
      if (dash.length === 1) { out[a] = color; continue; }
      const b = parseInt(dash[1], 10);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out[i] = color;
    }
  }
  return out;
}

export const FORMATION_PRESETS = {
  // CP — the whole outer rim (all 16 edge stickers) goes muted.
  "cp": {
    label: "CP",
    formation: buildFormation({ muted: "0-15" }),
  },
  // SB — top corners + interleaved edges muted; bottom-front (8,9), bottom-left (12,13) stay default.
  "sb": {
    label: "SB",
    formation: buildFormation({ muted: "0-7,10-11,14-27" }),
  },
  // RSB — same as SB but bottom-back edge (14,15) also stays default.
  "rsb": {
    label: "RSB",
    formation: buildFormation({ muted: "0-7,10-11,16-27" }),
  },
  // ASP — RSB's mute set, then paints a few stickers with face colors.
  "asp": {
    label: "ASP",
    formation: buildFormation({
      muted: "0-7,10-11,16-27",
      front: "9,30",
      right: "29,33",
      back: "32",
    }),
  },
  // ASDP — like ASP but 9 & 15 get the average of front+back at 40% opacity.
  "asdp": {
    label: "ASDP",
    formation: buildFormation({
      muted: "0-7,10-11,16-27",
      front: "30",
      right: "29,33",
      back: "32",
      "lighten40:front,back": "9,15",
    }),
  },
};

function parseRGB(color) {
  if (typeof color !== 'string') return null;
  const hex = color.trim();
  if (hex[0] === '#') {
    let h = hex.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    const num = parseInt(h.slice(0, 6), 16);
    if (Number.isNaN(num) || h.length < 6) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  const m = hex.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map(s => Number.parseFloat(s.trim()));
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0 };
  }
  return null;
}

// Standard face colors for SAC2/Abid (identical in both). Used to resolve an
// avg- token's source faces when the active palette doesn't override them —
// e.g. ASDP averages front & back, but most palettes leave those at default.
const DEFAULT_FACE_RGB = {
  top:    { r: 77,  g: 77,  b: 77 },
  bottom: { r: 255, g: 255, b: 255 },
  front:  { r: 204, g: 0,   b: 0 },
  right:  { r: 0,   g: 170, b: 0 },
  back:   { r: 255, g: 140, b: 0 },
  left:   { r: 0,   g: 102, b: 204 },
};

// Token like "lighten40:front,back" → average the source colors per channel,
// then lighten toward white by the given percent, full opacity.
//   newC = avgC × (100−p)/100 + 255 × p/100
// Produces an opaque "#rrggbb" using the active palette (falling back to the
// standard face defaults for any face the palette doesn't override).
function computeAvgToken(token, scheme) {
  const ci = token.indexOf(':');
  const pct = Number.parseInt(token.slice(7, ci === -1 ? token.length : ci), 10);
  const names = (ci === -1 ? token.slice(7) : token.slice(ci + 1)).split(',');
  const vals = names
    .map(n => parseRGB(scheme ? scheme[n] : null) || DEFAULT_FACE_RGB[n])
    .filter(Boolean);
  const p = Number.isFinite(pct) ? pct : 100;
  const mix = i => {
    const avg = vals.reduce((s, v) => s + [v.r, v.g, v.b][i], 0) / vals.length;
    return Math.round(avg * ((100 - p) / 100) + 255 * (p / 100));
  };
  if (!vals.length) return token;
  const hex = v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0');
  return `#${hex(mix(0))}${hex(mix(1))}${hex(mix(2))}`;
}

// Resolve a named formation preset into a full {edgeColors, cornerColors,
// sliceColors} object (starting from the classical default mapping) using the
// active color scheme to compute any avg tokens. Returns null on unknown key.
export function resolveFormationPreset(presetKey, colorScheme) {
  const preset = FORMATION_PRESETS[presetKey];
  if (!preset) return null;
  const pc = schemaDefaultPiecesColors();
  const reverse = buildStickerIndexReverse();
  for (const [idxStr, token] of Object.entries(preset.formation)) {
    if (token === undefined) continue;
    const key = reverse[parseInt(idxStr, 10)];
    if (!key) continue;
    const kind = key[0];
    const rest = key.slice(2);
    const color = token.indexOf('lighten') === 0 ? computeAvgToken(token, colorScheme) : token;
    if (kind === 'e') {
      const [p, side] = rest.split(':');
      pc.edgeColors[p] = { ...pc.edgeColors[p], [side]: color };
    } else if (kind === 'c') {
      const [p, side] = rest.split(':');
      pc.cornerColors[p] = { ...pc.cornerColors[p], [side]: color };
    } else if (kind === 's') {
      pc.sliceColors[rest] = color;
    }
  }
  return pc;
}

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

// Keys a SETTINGS preset may never set — they either describe the puzzle being
// rendered (input/mode/fmt) or belong to the COLOR section (scheme/c/pc/cp).
// Splitting them out keeps the two sections fully independent: a settings
// preset can never leak into colors, and a color preset can never touch design,
// no matter how they're stacked.
const SETTINGS_FORBIDDEN = ['input', 'mode', 'fmt', 'p', 'cp', 'scheme', 'c', 'pc', 'pf'];
// Keys a COLOR preset may never set — the design/output section. A color
// preset only ever produces palette colors.
const COLOR_FORBIDDEN = ['input', 'mode', 'fmt', 'p', 'cp', 'pc', 'style', 'size', 'pad', 'gap', 'orient', 'layer', 'hideSlice', 'hideSides', 'layerRatio', 'strokeOuter', 'strokeSlice', 'strokeInner'];

function splitKeys(presetKeys) {
  return (Array.isArray(presetKeys) ? presetKeys : String(presetKeys ?? '').split(','))
    .map(k => String(k).trim()).filter(Boolean);
}

// Expand &p= settings-preset(s) over a base params object.
// Precedence (lowest → highest): base defaults → later-listed presets →
// earlier-listed presets. First-mentioned preset wins conflicts; explicit
// query params always beat presets (applied by the caller afterwards).
export function expandSettingsPreset(params = {}, presetKeys) {
  let out = { ...params };
  const keys = splitKeys(presetKeys);
  for (let i = keys.length - 1; i >= 0; i--) {
    const preset = SETTINGS_PRESETS[keys[i]];
    if (!preset || !preset.params) continue;
    const safe = { ...preset.params };
    for (const fk of SETTINGS_FORBIDDEN) delete safe[fk];
    out = { ...out, ...safe };
  }
  return out;
}

// Resolve the color section's palette from &cp= color-preset(s) merged with
// inline &c= overrides. Returns null when nothing is defined (use defaults).
// Precedence within the color section (lowest → highest): later-listed color
// presets → earlier-listed → inline &c= overrides.
export function resolveColorPalette(colorPresetKeys, inlineColors) {
  const palette = {};

  const keys = splitKeys(colorPresetKeys);
  for (let i = keys.length - 1; i >= 0; i--) {
    const preset = COLOR_PRESETS[keys[i]];
    if (!preset || !preset.colors) continue;
    Object.assign(palette, preset.colors);
  }

  if (inlineColors) {
    // "name:color,name:color,..." — color values may be comma-containing
    // rgba(...) strings, so recombine fragments without a ":" onto the
    // previous name.
    let lastName = null;
    for (const part of String(inlineColors).split(',')) {
      const idx = part.indexOf(':');
      if (idx !== -1) {
        lastName = part.slice(0, idx).trim();
        palette[lastName] = part.slice(idx + 1).trim();
      } else if (lastName) {
        palette[lastName] += ',' + part.trim();
      }
    }
    for (const name of Object.keys(palette)) {
      palette[name] = palette[name].replace(/^([0-9a-fA-F]{6}|[0-9a-fA-F]{3,8})(?:[^0-9a-fA-F]|$)/, '#$1');
    }
  }

  return Object.keys(palette).length ? palette : null;
}

// Backward-compatible alias used by tooling/older callers.
export function expandPreset(params = {}, presetKeys) {
  return expandSettingsPreset(params, presetKeys);
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
  const base = { ...PARAM_DEFAULTS };
  // Settings section: only SETTINGS_PRESETS via &p= may contribute design /
  // output params; color keys are forbidden here so a settings preset can
  // never touch colors.
  const merged = expandSettingsPreset(base, query.p);

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

  // ---- color section (palette + formation) ------------------------------
  // The palette is built entirely from the color section: &cp= color-preset(s)
  // plus inline &c= redefinitions (which also allow a 9th+ named color). The
  // design params above never influence it, and it never influences them.
  // Leave both empty to keep the style's default colors.
  let colorScheme = resolveColorPalette(query.cp, query.c);
  // Accept the legacy scheme param for clarity, but it's no longer required to
  // open the color section (using cp/c alone now turns colors on).
  const scheme = String(merged.scheme ?? 'classic').toLowerCase();
  if (scheme !== 'classic' && scheme !== 'custom') {
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
  // Either an explicit base64url pc= blob (see encodePieceColors) or a named
  // &pf= formation preset that combines with the active palette above. An
  // explicit pc= always wins over pf=. Absent -> classical default mapping.
  const piecesColors = merged.pc
    ? decodePieceColors(String(merged.pc))
    : merged.pf
      ? resolveFormationPreset(String(merged.pf), colorScheme)
      : undefined;

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
