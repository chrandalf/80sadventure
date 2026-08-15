/**
 * Work out where the floor starts in every background, and write it out.
 *
 *   node tools/fit-floors.mjs [--report]
 *
 * Every room needs a standing band: the strip of floor a character may walk on,
 * with the perspective scale that goes with it. Thirty-three of them measured by
 * eye is slow, inconsistent, and has to be redone whenever a plate is
 * regenerated. The line where the back wall meets the floor is a strong
 * horizontal edge, so it can be found instead.
 *
 * The result is a starting point, not gospel. A room whose floor the detector
 * gets wrong is fixed by declaring `walkboxes` on the scene, which always wins.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { ROOT, c } from './lib.mjs';

const report = process.argv.includes('--report');

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'public/assets/assets.json'), 'utf8'));
const { width: W, height: H } = manifest.renderResolution;
const PLAY_H = manifest.playfield.height;

/** Rows below the first and above the last are never a floor line. */
const SEARCH_TOP = Math.round(H * 0.34);
const SEARCH_BOTTOM = Math.round(PLAY_H * 0.82);

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * The strongest horizontal edge in the middle of the frame.
 *
 * Averaged across the row, so a picture frame or a window ledge spanning part of
 * the width loses to the wall-floor join spanning all of it. Rows are scored
 * with a mild preference for lower ones: an interior often has a second strong
 * edge where the wall meets a dado rail, and the floor is always the lower.
 */
function floorLine(img) {
  let best = { y: Math.round(PLAY_H * 0.62), score: -1 };
  for (let y = SEARCH_TOP; y < SEARCH_BOTTOM; y++) {
    let sum = 0;
    for (let x = 0; x < img.width; x++) {
      const a = (y * img.width + x) << 2;
      const b = ((y + 2) * img.width + x) << 2;
      sum += Math.abs(
        luma(img.data[a], img.data[a + 1], img.data[a + 2]) -
        luma(img.data[b], img.data[b + 1], img.data[b + 2]),
      );
    }
    const mean = sum / img.width;
    const depthBias = 1 + 0.55 * ((y - SEARCH_TOP) / (SEARCH_BOTTOM - SEARCH_TOP));
    const score = mean * depthBias;
    if (score > best.score) best = { y, score };
  }
  return best;
}

/**
 * How much smaller a character is at the back of the band than the front.
 *
 * A shallow band is a room seen almost side-on and barely foreshortens; a deep
 * one recedes hard. Tying it to the band's depth stops a narrow strip of floor
 * shrinking someone to nothing over forty pixels.
 */
function farScale(bandDepth) {
  const t = Math.min(1, Math.max(0, (bandDepth - 30) / 90));
  return Number((0.86 - 0.24 * t).toFixed(2));
}

const floors = {};
const rows = [];

for (const asset of manifest.assets) {
  if (asset.type !== 'background' || !asset.scene) continue;
  const file = resolve(ROOT, 'public' + asset.path.replace(/\.(webp|jpe?g)$/i, '.png'));
  if (!existsSync(file)) { rows.push([asset.scene, 'no artwork', '']); continue; }

  let img;
  try {
    img = PNG.sync.read(readFileSync(file));
  } catch (e) {
    rows.push([asset.scene, `unreadable: ${e.message}`, '']);
    continue;
  }
  if (img.width !== W || img.height !== H) {
    rows.push([asset.scene, `${img.width}x${img.height}, expected ${W}x${H}`, '']);
    continue;
  }

  const { y } = floorLine(img);
  // Stand clear of the join itself, and stop short of the interface panel.
  const top = Math.min(y + 8, PLAY_H - 34);
  const bottom = PLAY_H - 2;

  floors[asset.scene] = {
    walkboxes: [[24, top, W - 24, top, W - 8, bottom, 8, bottom]],
    depth: { yNear: bottom, yFar: top, scaleNear: 1, scaleFar: farScale(bottom - top) },
  };
  rows.push([asset.scene, `floor at y=${top}`, `band ${bottom - top}px, far ${farScale(bottom - top)}`]);
}

const out = resolve(ROOT, 'src/content/floors.json');
if (!report) {
  writeFileSync(out, `${JSON.stringify({
    _generated: 'by tools/fit-floors.mjs - run it again after regenerating backgrounds',
    _note: 'A starting point per room. A scene that declares its own walkboxes overrides this entirely.',
    floors,
  }, null, 2)}\n`);
}

for (const [scene, a, b] of rows) {
  console.log(`  ${scene.padEnd(22)} ${a.padEnd(18)} ${c.dim(b)}`);
}
console.log(`\n  ${Object.keys(floors).length} of ${rows.length} rooms fitted`);
if (!report) console.log(c.dim(`  -> ${out}\n`));
