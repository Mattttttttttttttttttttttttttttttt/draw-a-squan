import { onRequest } from "firebase-functions/v2/https";
import { Resvg } from "@resvg/resvg-js";
import { algToHex, invertScramble, unkarnify } from "../scripts/parseScramble.js";
import { renderSquare1SVG, renderSquare1LayerSVG } from "../scripts/drawScrambleCore.js";

function inputToHex(input, mode) {
  if (mode === "hex") return input;
  if (mode === "inverse") {
    const { tlHex, blHex } = algToHex(invertScramble(unkarnify(input)));
    return `${tlHex}|${blHex}`;
  }
  const { tlHex, blHex } = algToHex(unkarnify(input));
  return `${tlHex}|${blHex}`;
}

// Ports the DOM-based layer combiner from index.html's deeplink script to
// plain string ops, since Cloud Functions has no DOM.
function combineLayers(html, sc, gap, isVert) {
  const svgs = html.match(/<svg\b[^>]*>[\s\S]*?<\/svg>/g) || [];
  if (svgs.length < 2) throw new Error("Expected two <svg> layers.");
  const [svg0, svg1] = svgs;
  const getAttr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
  const getInner = (tag) => tag.replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>$/, "");

  const [vbX, vbY, vbW, vbH] = getAttr(svg0, "viewBox").split(" ").map(Number);
  const padT = -vbY, padO = -vbX;
  const margin = sc * (0.44 * (2 + gap / 100) - 1);
  const g0shift = `translate(${padO},${padT})`;
  const g1shift = isVert
    ? `translate(${padO},${padT + sc + margin})`
    : `translate(${padO + sc + margin},${padT})`;
  const totalW = isVert ? vbW : padO + sc + margin + sc + padO;
  const totalH = isVert ? padT + sc + margin + sc + padO : vbH;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">` +
    `<g transform="${g0shift}">${getInner(svg0)}</g>` +
    `<g transform="${g1shift}">${getInner(svg1)}</g></svg>`;
}

export const drawApi = onRequest({ cors: true }, async (req, res) => {
  try {
    const q = req.query;
    if (!q.input) { res.status(400).send("Missing ?input= param"); return; }

    const mode = q.mode || "scramble";
    const size = parseInt(q.size, 10) || 400;
    const padPct = parseInt(q.pad, 10) || 28;
    const gap = parseInt(q.gap, 10) || 100;
    const layer = q.layer || "both";
    const fmt = (q.fmt || "png").toLowerCase();
    const isVert = q.orient === "vertical";

    const hex = inputToHex(String(q.input), mode);
    const sc = Math.round(size * (220 / 400));
    const exportPad = Math.round(sc * padPct / 100);

    let svg;
    if (layer !== "both") {
      svg = renderSquare1LayerSVG(hex, { size, showSlice: true, layer, exportPad });
    } else {
      const html = renderSquare1SVG(hex, { size, ringDistance: gap, isVertical: isVert, showSlice: true, exportPad });
      svg = combineLayers(html, sc, gap, isVert);
    }

    if (fmt === "svg") {
      res.set("Content-Type", "image/svg+xml");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(svg);
      return;
    }

    const png = new Resvg(svg, { fitTo: { mode: "original" } }).render().asPng();
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=3600"); // Sheets refetches on every recalc
    res.send(png);
  } catch (err) {
    console.error("drawApi error:", err);
    res.status(400).send(String(err.message || err));
  }
});
