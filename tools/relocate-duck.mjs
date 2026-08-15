/**
 * Lift the rubber duck out of the haunted house plate and re-seat it on
 * visible floor.
 *
 * The plate was composed for the full 640x400 frame, but in play the bottom
 * 112 rows sit under the verb panel - and the artist put the duck in a puddle
 * at y~330, so the game's one detective-film gag was invisible. The artwork is
 * not regenerated (and the plate is untouched): the duck's own pixels are
 * masked out by colour, given a soft shadow, and written as a small midground
 * layer that composites onto walkable floor beside the ticket booth.
 */
import fs from 'node:fs';
import { PNG } from 'pngjs';

const SRC = 'public/assets/backgrounds/haunted_house.png';
const OUT = 'public/assets/backgrounds/haunted_house_duck.png';

// Where to hunt for the duck, and where its feet land afterwards.
const HUNT = { x0: 250, x1: 345, y0: 295, y1: 370 };
const DEST_CENTRE_X = 428;
const DEST_BOTTOM_Y = 283;

const plate = PNG.sync.read(fs.readFileSync(SRC));
const at = (x, y) => (y * plate.width + x) * 4;

// A rubber duck is the one warm-yellow thing in a room of murk.
const isDuck = (x, y) => {
  const i = at(x, y);
  const [r, g, b] = [plate.data[i], plate.data[i + 1], plate.data[i + 2]];
  return r > 130 && g > 80 && r - b > 55 && g - b > 20;
};

const w = HUNT.x1 - HUNT.x0;
const h = HUNT.y1 - HUNT.y0;
const mask = new Uint8Array(w * h);
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++)
    if (isDuck(HUNT.x0 + x, HUNT.y0 + y)) mask[y * w + x] = 1;

// Close the shaded holes in the body: adopt pixels most of whose neighbours
// made the cut. Two passes reaches two pixels into the shading.
for (let pass = 0; pass < 2; pass++) {
  const next = mask.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (mask[y * w + x]) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) n += mask[(y + dy) * w + x + dx];
      if (n >= 5) next[y * w + x] = 1;
    }
  }
  mask.set(next);
}

// The puddle reflects the duck, and the reflection passes the colour test too.
// Keep only the largest connected patch - the duck itself.
{
  const label = new Int32Array(w * h).fill(-1);
  const sizes = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || label[i] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [i];
    label[i] = id;
    while (stack.length) {
      const p = stack.pop();
      size++;
      const px = p % w;
      const py = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (mask[n] && label[n] === -1) { label[n] = id; stack.push(n); }
        }
      }
    }
    sizes.push(size);
  }
  const biggest = sizes.indexOf(Math.max(...sizes));
  for (let i = 0; i < w * h; i++) if (mask[i] && label[i] !== biggest) mask[i] = 0;
}

let [bx0, by0, bx1, by1] = [w, h, 0, 0];
let count = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    count++;
    if (x < bx0) bx0 = x;
    if (y < by0) by0 = y;
    if (x > bx1) bx1 = x;
    if (y > by1) by1 = y;
  }
}
if (count < 200) {
  console.error(`Only ${count} duck-coloured pixels found; not writing a layer.`);
  process.exit(1);
}
const dw = bx1 - bx0 + 1;
const dh = by1 - by0 + 1;
console.log(`duck: ${count}px in ${dw}x${dh} at (${HUNT.x0 + bx0},${HUNT.y0 + by0})`);

const out = new PNG({ width: 640, height: 288 });
const dx0 = Math.round(DEST_CENTRE_X - dw / 2);
const dy0 = DEST_BOTTOM_Y - dh;

// A soft contact shadow first, so the duck sits on the boards instead of
// floating over them.
const cx = dx0 + dw / 2;
const cy = DEST_BOTTOM_Y - 1;
for (let y = 0; y < 288; y++) {
  for (let x = 0; x < 640; x++) {
    const nx = (x - cx) / (dw * 0.62);
    const ny = (y - cy) / 3.4;
    const d = nx * nx + ny * ny;
    if (d < 1) {
      const o = (y * 640 + x) * 4;
      out.data[o + 3] = Math.round(80 * (1 - d));
    }
  }
}

for (let y = by0; y <= by1; y++) {
  for (let x = bx0; x <= bx1; x++) {
    if (!mask[y * w + x]) continue;
    const s = at(HUNT.x0 + x, HUNT.y0 + y);
    const o = ((dy0 + y - by0) * 640 + (dx0 + x - bx0)) * 4;
    out.data[o] = plate.data[s];
    out.data[o + 1] = plate.data[s + 1];
    out.data[o + 2] = plate.data[s + 2];
    out.data[o + 3] = 255;
  }
}

fs.writeFileSync(OUT, PNG.sync.write(out));
console.log(`wrote ${OUT} (duck at x ${dx0}-${dx0 + dw}, bottom ${DEST_BOTTOM_Y})`);
