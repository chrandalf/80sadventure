#!/usr/bin/env node
/**
 * Emit a drawing template for every sprite in the manifest.
 *
 * Templates go to art-templates/ (NOT the live sprite folder), so they are
 * never mistaken for finished art. Each one is the exact final pixel size with
 * the frame grid marked, plus a palette strip along the bottom of the contact
 * sheet - open one in Aseprite, draw over the guides, delete the guide layer,
 * and save it into public/assets/sprites/ under the filename the manifest
 * expects.
 *
 *   npm run assets:placeholders
 */
import { resolve } from 'node:path';
import {
  c, GAME_HEIGHT, GAME_WIDTH, hexToRgb, loadPalette, newPng, resolvedSprites, ROOT, setPixel,
  writePng,
} from './lib.mjs';

const OUT = resolve(ROOT, 'art-templates');
const palette = loadPalette();

const GUIDE = hexToRgb('#33244d');
const GUIDE_BRIGHT = hexToRgb('#7a4de8');
const ANCHOR = hexToRgb('#e0349e');

function drawGrid(png, def) {
  // Frame boundaries: a dotted line so it never hides a real edge pixel.
  for (let col = 0; col <= def.columns; col++) {
    const x = Math.min(col * def.frameWidth, png.width - 1);
    for (let y = 0; y < png.height; y++) {
      if (y % 2 === 0) setPixel(png, x, y, col === 0 || col === def.columns ? GUIDE_BRIGHT : GUIDE);
    }
  }
  for (let row = 0; row <= def.rows; row++) {
    const y = Math.min(row * def.frameHeight, png.height - 1);
    for (let x = 0; x < png.width; x++) {
      if (x % 2 === 0) setPixel(png, x, y, row === 0 || row === def.rows ? GUIDE_BRIGHT : GUIDE);
    }
  }
  // Anchor cross in every frame, so the artist knows where the sprite's
  // origin sits - get this wrong and the character floats or sinks.
  const ax = def.anchorX ?? Math.floor(def.frameWidth / 2);
  const ay = (def.anchorY ?? def.frameHeight) - 1;
  for (let row = 0; row < def.rows; row++) {
    for (let col = 0; col < def.columns; col++) {
      const ox = col * def.frameWidth + ax;
      const oy = row * def.frameHeight + ay;
      for (let d = -2; d <= 2; d++) {
        setPixel(png, ox + d, oy, ANCHOR);
        setPixel(png, ox, oy + d, ANCHOR);
      }
    }
  }
}

let count = 0;
for (const [id, def] of resolvedSprites()) {
  if (!def.frameWidth || !def.columns) continue;
  const w = def.columns * def.frameWidth;
  const h = def.rows * def.frameHeight;
  const png = newPng(w, h);
  drawGrid(png, def);
  const name = (def.file ?? `${id}.png`).replace(/\.png$/, '') + '.template.png';
  writePng(resolve(OUT, name), png);
  count++;
}

// A palette swatch sheet, one 8x8 block per legal colour, to load as a
// palette in any pixel editor.
{
  const cols = 8;
  const rows = Math.ceil(palette.rgb.length / cols);
  const png = newPng(cols * 8, rows * 8);
  palette.rgb.forEach((rgb, i) => {
    const cx = (i % cols) * 8;
    const cy = Math.floor(i / cols) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) setPixel(png, cx + x, cy + y, rgb);
  });
  writePng(resolve(OUT, '_palette.png'), png);
}

// A blank, correctly sized background template.
{
  const png = newPng(GAME_WIDTH, GAME_HEIGHT);
  for (let y = 0; y < GAME_HEIGHT; y++) {
    for (let x = 0; x < GAME_WIDTH; x++) {
      // Mark the 144px line where the interface panel starts covering the room.
      if (y === 144) setPixel(png, x, y, ANCHOR);
      else if (x % 16 === 0 || y % 16 === 0) setPixel(png, x, y, GUIDE);
    }
  }
  writePng(resolve(OUT, '_background.template.png'), png);
}

console.log(
  `\n${c.green(`Wrote ${count} sprite templates`)} + palette + background template\n` +
    `  ${c.dim(OUT)}\n\n` +
    `  ${c.bold('Workflow:')}\n` +
    `  1. Open a .template.png in your editor. Magenta crosses are the sprite anchor;\n` +
    `     purple dots are frame boundaries. Load _palette.png as your palette.\n` +
    `  2. Draw. Delete the guide pixels.\n` +
    `  3. Save into public/assets/sprites/ under the manifest filename\n` +
    `     (drop the ".template" from the name).\n` +
    `  4. ${c.cyan('npm run assets:validate')}\n`,
);
