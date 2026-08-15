#!/usr/bin/env node
/**
 * Check every art file against the manifest, and the palette.
 *
 * This is the safety net that makes art swappable with confidence: it tells you
 * exactly what is wrong with a replacement PNG before you find out in-game.
 *
 *   npm run assets:validate
 *   npm run assets:validate -- --strict     (exit 1 on warnings too)
 */
import { resolve } from 'node:path';
import {
  BG_DIR, c, exists, GAME_HEIGHT, GAME_WIDTH, getPixel, loadPalette, readPng,
  resolvedSprites, rgbToHex, SPRITE_DIR,
} from './lib.mjs';

const strict = process.argv.includes('--strict');
const palette = loadPalette();

let errors = 0;
let warnings = 0;
let checked = 0;
let placeholders = 0;

const err = (id, msg) => {
  console.log(`${c.red('FAIL')} ${c.bold(id)}\n     ${msg}`);
  errors++;
};
const warn = (id, msg) => {
  console.log(`${c.yellow('WARN')} ${c.bold(id)}\n     ${msg}`);
  warnings++;
};

/**
 * Scan an image for colours outside the palette.
 * Returns the offenders with counts, worst first, plus any partial alpha.
 */
function paletteReport(png) {
  const offenders = new Map();
  let partialAlpha = 0;
  let opaque = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const [r, g, b, a] = getPixel(png, x, y);
      if (a === 0) continue;
      if (a !== 255) partialAlpha++;
      opaque++;
      const hex = rgbToHex([r, g, b]);
      if (!palette.set.has(hex)) offenders.set(hex, (offenders.get(hex) ?? 0) + 1);
    }
  }
  return {
    offenders: [...offenders.entries()].sort((a, b) => b[1] - a[1]),
    partialAlpha,
    opaque,
  };
}

console.log(c.bold(`\nAsset validation - palette "${palette.name}" (${palette.hex.length} colours)\n`));

// ------------------------------------------------------------------ sprites

for (const [id, def] of resolvedSprites()) {
  const expectedW = def.columns * def.frameWidth;
  const expectedH = def.rows * def.frameHeight;
  const path = resolve(SPRITE_DIR, def.file ?? '');

  if (!def.file) {
    err(id, 'manifest entry has no "file"');
    continue;
  }
  if (!def.frameWidth || !def.frameHeight || !def.columns || !def.rows) {
    err(id, 'manifest entry is missing frameWidth/frameHeight/columns/rows (and no template supplied them)');
    continue;
  }

  if (!exists(path)) {
    // Not an error: the game generates a placeholder. Just report the shape
    // the artist needs to hit.
    placeholders++;
    console.log(
      `${c.dim('----')} ${id}\n     ${c.dim(`no art yet - needs ${def.file} at ${expectedW}x${expectedH} ` +
        `(${def.columns}x${def.rows} frames of ${def.frameWidth}x${def.frameHeight})`)}`,
    );
    continue;
  }

  checked++;
  let png;
  try {
    png = readPng(path);
  } catch (e) {
    err(id, `${def.file} could not be read as a PNG: ${e.message}`);
    continue;
  }

  if (png.width !== expectedW || png.height !== expectedH) {
    err(
      id,
      `${def.file} is ${png.width}x${png.height} but the manifest declares ${expectedW}x${expectedH}.\n` +
        `     Either resize the PNG, or change frameWidth/frameHeight/columns/rows for "${id}" in manifest.json.`,
    );
    continue;
  }

  const { offenders, partialAlpha, opaque } = paletteReport(png);
  if (offenders.length) {
    const shown = offenders.slice(0, 6).map(([hex, n]) => `${hex} (${n}px)`).join(', ');
    err(
      id,
      `${def.file} uses ${offenders.length} colour(s) outside the palette: ${shown}` +
        `${offenders.length > 6 ? ', ...' : ''}\n` +
        `     Fix with:  node tools/quantize.mjs "${path}" --in-place`,
    );
  }
  if (partialAlpha) {
    warn(
      id,
      `${def.file} has ${partialAlpha}px of partial transparency. Alpha must be 0 or 255 - ` +
        `soft edges produce halos when the image is scaled up.`,
    );
  }
  if (opaque === 0) {
    warn(id, `${def.file} is entirely transparent.`);
  }

  // Frame-level check: an empty frame usually means a miscounted grid.
  const emptyFrames = [];
  for (let row = 0; row < def.rows; row++) {
    for (let col = 0; col < def.columns; col++) {
      let any = false;
      for (let y = 0; y < def.frameHeight && !any; y++) {
        for (let x = 0; x < def.frameWidth; x++) {
          if (getPixel(png, col * def.frameWidth + x, row * def.frameHeight + y)[3] !== 0) {
            any = true;
            break;
          }
        }
      }
      if (!any) emptyFrames.push(row * def.columns + col);
    }
  }
  // Frames referenced by an animation must not be empty.
  const used = new Set();
  for (const anim of Object.values(def.animations ?? {})) {
    if (anim.frames) anim.frames.forEach((f) => used.add(f));
    else if (anim.row !== undefined) {
      for (let i = 0; i < def.columns; i++) used.add(anim.row * def.columns + i);
    }
  }
  const usedButEmpty = emptyFrames.filter((f) => used.has(f));
  if (usedButEmpty.length) {
    warn(
      id,
      `frames [${usedButEmpty.join(', ')}] are blank but are used by an animation. ` +
        `Check the frame grid is ${def.columns} across by ${def.rows} down.`,
    );
  }

  if (!offenders.length && !partialAlpha && !usedButEmpty.length) {
    console.log(`${c.green(' OK ')} ${id} ${c.dim(`${def.file} ${png.width}x${png.height}`)}`);
  }
}

// -------------------------------------------------------------- backgrounds

console.log(c.bold('\nBackground overrides\n'));
const { BACKGROUND_IDS } = await import('./background-ids.mjs');
let bgOverrides = 0;
for (const id of BACKGROUND_IDS) {
  const path = resolve(BG_DIR, `${id}.png`);
  if (!exists(path)) continue;
  bgOverrides++;
  checked++;
  const png = readPng(path);
  if (png.width !== GAME_WIDTH || png.height !== GAME_HEIGHT) {
    err(`bg:${id}`, `${id}.png is ${png.width}x${png.height}; backgrounds must be exactly ${GAME_WIDTH}x${GAME_HEIGHT}`);
    continue;
  }
  const { offenders } = paletteReport(png);
  if (offenders.length) {
    err(
      `bg:${id}`,
      `${id}.png uses ${offenders.length} colour(s) outside the palette.\n` +
        `     Fix with:  node tools/quantize.mjs "${path}" --in-place`,
    );
  } else {
    console.log(`${c.green(' OK ')} bg:${id}`);
  }
}
if (bgOverrides === 0) {
  console.log(c.dim('     none - every room is using its code painter (this is fine)'));
}

// ------------------------------------------------------------------ summary

console.log(
  `\n${c.bold('Summary')}  ` +
    `${c.green(`${checked} checked`)}  ` +
    `${c.dim(`${placeholders} awaiting art`)}  ` +
    `${warnings ? c.yellow(`${warnings} warnings`) : '0 warnings'}  ` +
    `${errors ? c.red(`${errors} errors`) : c.green('0 errors')}\n`,
);

process.exit(errors > 0 || (strict && warnings > 0) ? 1 : 0);
