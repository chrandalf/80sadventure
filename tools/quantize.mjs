#!/usr/bin/env node
/**
 * Turn any image into palette-locked pixel art at the game's resolution.
 *
 * This is the bridge for art that did not start out as pixel art - AI
 * generations, photographs, scans, high-res paintings. It box-downsamples to
 * the target size first (averaging every source pixel that lands in a target
 * pixel), then snaps to the locked palette with optional dithering.
 *
 * Doing it in that order is the whole trick. Shrinking a finished high-res
 * image with a normal image editor leaves anti-aliased edges and thousands of
 * intermediate colours, which is exactly what makes "retro" art look like a
 * shrunken photo instead of pixel art.
 *
 *   node tools/quantize.mjs in.png --sprite char.jack
 *   node tools/quantize.mjs in.png --background --out public/assets/backgrounds/pier.png
 *   node tools/quantize.mjs art.png --size 24x40
 *   node tools/quantize.mjs public/assets/sprites/jack.png --in-place --no-resize
 *
 * Options:
 *   --sprite <id>     size from the manifest entry (whole sheet)
 *   --background      size to 320x200
 *   --size WxH        explicit target size
 *   --no-resize       keep the current size, only fix the colours
 *   --dither <mode>   floyd (default) | ordered | none
 *   --out <path>      where to write
 *   --in-place        overwrite the input
 */
import { resolve } from 'node:path';
import {
  bayer, BG_DIR, c, GAME_HEIGHT, GAME_WIDTH, getPixel, loadPalette, nearest, newPng, readPng,
  resolvedSprites, setPixel, SPRITE_DIR, writePng,
} from './lib.mjs';

const argv = process.argv.slice(2);
const input = argv.find((a) => !a.startsWith('--'));
if (!input) {
  console.error('usage: node tools/quantize.mjs <image.png> [--sprite <id>|--background|--size WxH] [--out <path>]');
  process.exit(1);
}
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const palette = loadPalette();
const src = readPng(resolve(input));

// ------------------------------------------------------------- target size

let targetW = src.width;
let targetH = src.height;
let outPath = opt('out');

if (flag('background')) {
  targetW = GAME_WIDTH;
  targetH = GAME_HEIGHT;
} else if (opt('sprite')) {
  const id = opt('sprite');
  const entry = resolvedSprites().find(([sid]) => sid === id);
  if (!entry) {
    console.error(`Unknown sprite id "${id}". Check public/assets/sprites/manifest.json.`);
    process.exit(1);
  }
  const def = entry[1];
  targetW = def.columns * def.frameWidth;
  targetH = def.rows * def.frameHeight;
  outPath ??= resolve(SPRITE_DIR, def.file);
  console.log(c.dim(`sprite ${id}: ${def.columns}x${def.rows} frames of ${def.frameWidth}x${def.frameHeight}`));
} else if (opt('size')) {
  const m = /^(\d+)x(\d+)$/.exec(opt('size'));
  if (!m) {
    console.error('--size must look like 24x40');
    process.exit(1);
  }
  targetW = +m[1];
  targetH = +m[2];
}
if (flag('no-resize')) {
  targetW = src.width;
  targetH = src.height;
}
if (flag('in-place')) outPath = resolve(input);
if (flag('background') && !outPath) outPath = resolve(BG_DIR, 'quantised.png');
outPath ??= resolve(input).replace(/\.png$/i, '.quantised.png');

// ------------------------------------------------------------- downsample

/**
 * Box filter: average every source pixel falling inside each target pixel.
 *
 * Alpha is averaged too and thresholded afterwards, so a soft edge becomes a
 * hard one at the halfway point rather than a fringe of semi-transparency.
 */
function boxResize(png, w, h) {
  const out = newPng(w, h);
  const sxScale = png.width / w;
  const syScale = png.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * syScale);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * syScale));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sxScale);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sxScale));
      let r = 0, g = 0, b = 0, a = 0, n = 0, aSum = 0;
      for (let sy = y0; sy < y1 && sy < png.height; sy++) {
        for (let sx = x0; sx < x1 && sx < png.width; sx++) {
          const [pr, pg, pb, pa] = getPixel(png, sx, sy);
          // Weight colour by alpha so transparent pixels do not drag the
          // average towards black.
          const wgt = pa / 255;
          r += pr * wgt;
          g += pg * wgt;
          b += pb * wgt;
          aSum += wgt;
          a += pa;
          n++;
        }
      }
      if (!n) continue;
      const denom = aSum || 1;
      setPixel(out, x, y, [r / denom, g / denom, b / denom].map(Math.round), a / n);
    }
  }
  return out;
}

const resized = targetW === src.width && targetH === src.height ? src : boxResize(src, targetW, targetH);

// -------------------------------------------------------------- quantise

const mode = opt('dither') ?? 'floyd';
const out = newPng(targetW, targetH);

// Working buffer in floats so Floyd-Steinberg can push error into neighbours.
const buf = new Float32Array(targetW * targetH * 3);
const alpha = new Uint8Array(targetW * targetH);
for (let y = 0; y < targetH; y++) {
  for (let x = 0; x < targetW; x++) {
    const [r, g, b, a] = getPixel(resized, x, y);
    const i = y * targetW + x;
    buf[i * 3] = r;
    buf[i * 3 + 1] = g;
    buf[i * 3 + 2] = b;
    // Binary alpha: the palette rule forbids partial transparency.
    alpha[i] = a >= 128 ? 255 : 0;
  }
}

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

for (let y = 0; y < targetH; y++) {
  for (let x = 0; x < targetW; x++) {
    const i = y * targetW + x;
    if (alpha[i] === 0) continue;

    let r = buf[i * 3];
    let g = buf[i * 3 + 1];
    let b = buf[i * 3 + 2];

    if (mode === 'ordered') {
      // Nudge by the dither matrix before snapping, which spreads banding
      // across a fixed pattern instead of pushing error around.
      const n = bayer(x, y) * 26;
      r = clamp(r + n);
      g = clamp(g + n);
      b = clamp(b + n);
    }

    const picked = nearest(palette, clamp(r), clamp(g), clamp(b));
    setPixel(out, x, y, picked, 255);

    if (mode === 'floyd') {
      const er = r - picked[0];
      const eg = g - picked[1];
      const eb = b - picked[2];
      const push = (px, py, f) => {
        if (px < 0 || px >= targetW || py >= targetH) return;
        const j = py * targetW + px;
        if (alpha[j] === 0) return;
        buf[j * 3] += er * f;
        buf[j * 3 + 1] += eg * f;
        buf[j * 3 + 2] += eb * f;
      };
      push(x + 1, y, 7 / 16);
      push(x - 1, y + 1, 3 / 16);
      push(x, y + 1, 5 / 16);
      push(x + 1, y + 1, 1 / 16);
    }
  }
}

writePng(outPath, out);

// A quick report on how much the palette had to work.
const used = new Set();
for (let y = 0; y < targetH; y++) {
  for (let x = 0; x < targetW; x++) {
    const [r, g, b, a] = getPixel(out, x, y);
    if (a) used.add(`${r},${g},${b}`);
  }
}
console.log(
  `${c.green('Wrote')} ${outPath}\n` +
    `  ${src.width}x${src.height} -> ${targetW}x${targetH}, dither: ${mode}, ` +
    `${used.size}/${palette.hex.length} palette colours used\n`,
);
