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
  // pc = base64url JSON of per-sticker recolor overrides (getPiecesColors)
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
  //     input: "optional seed scramble",
  //     params: { style: "Abid", gap: 120, layerRatio: 0.8, ... },
  //   },
  //
  // Example (tasteful Abid baseline) — replace or remove whenever you like.
  "abid-standard": {
    label: "Abid Standard",
    params: { style: "Abid", gap: 120, layerRatio: 0.8 },
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

// Expand &p= preset over a base params object, then overlay explicit params.
// Precedence (lowest → highest): base defaults → preset params → explicit params.
export function expandPreset(params = {}, presetKey) {
  const preset = presetKey && PRESETS[presetKey] ? PRESETS[presetKey].params : {};
  return { ...params, ...preset };
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
  // Optional base64url-encoded JSON of getPiecesColors() (edgeColors,
  // cornerColors, sliceColors). Absent -> no per-sticker overrides.
  let piecesColors;
  if (merged.pc) {
    try {
      const b64 = String(merged.pc).replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      const buf = Buffer.from(padded, 'base64').toString('utf8');
      piecesColors = JSON.parse(buf);
    } catch (err) {
      // Ignore malformed pc; render with the plain scheme.
      piecesColors = undefined;
    }
  }

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
