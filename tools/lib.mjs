import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SPRITE_DIR = resolve(ROOT, 'public/assets/sprites');
export const BG_DIR = resolve(ROOT, 'public/assets/backgrounds');
export const MANIFEST = resolve(SPRITE_DIR, 'manifest.json');
export const PALETTE_FILE = resolve(ROOT, 'src/content/palette.json');

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 200;

/** The locked palette, flattened to RGB triples, straight from the game's own file. */
export function loadPalette() {
  const data = JSON.parse(readFileSync(PALETTE_FILE, 'utf8'));
  const hex = [];
  for (const ramp of Object.values(data.ramps)) {
    for (const c of ramp) if (!hex.includes(c.toLowerCase())) hex.push(c.toLowerCase());
  }
  return {
    name: data.name,
    hex,
    rgb: hex.map((h) => [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ]),
    set: new Set(hex),
  };
}

export function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

/**
 * Merge a sprite entry with its template. Mirrors resolveSpriteDef() in
 * src/engine/Sprite.ts - the tools and the game must never disagree about
 * what geometry a sprite is supposed to have.
 */
export function resolveDef(def, templates) {
  if (!def.template || !templates) return def;
  const base = templates[def.template];
  if (!base) return def;
  return { ...base, ...def, animations: { ...base.animations, ...def.animations } };
}

/** Every sprite id in the manifest, with its template already applied. */
export function resolvedSprites() {
  const m = loadManifest();
  return Object.entries(m.sprites).map(([id, def]) => [id, resolveDef(def, m.templates)]);
}

export function readPng(path) {
  return PNG.sync.read(readFileSync(path));
}

export function writePng(path, png) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}

export function newPng(width, height) {
  const png = new PNG({ width, height });
  png.data.fill(0);
  return png;
}

export function setPixel(png, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (png.width * (y | 0) + (x | 0)) << 2;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

export function getPixel(png, x, y) {
  const i = (png.width * y + x) << 2;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}

export function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Nearest palette colour, weighted for perceived luminance. The same weights
 * the runtime uses, so quantised art matches what the game would pick.
 */
export function nearest(palette, r, g, b) {
  let best = palette.rgb[0];
  let bestDist = Infinity;
  for (const c of palette.rgb) {
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const d = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x, y) {
  return BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
}

export const exists = existsSync;

export function fmtBytes(n) {
  return n < 1024 ? `${n}B` : `${(n / 1024).toFixed(1)}KB`;
}

/** Console colours, because a wall of monochrome validator output is unreadable. */
export const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};
