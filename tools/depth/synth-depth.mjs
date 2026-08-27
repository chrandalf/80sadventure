/**
 * A stand-in depth map, built from geometry rather than predicted.
 *
 *   node tools/depth/synth-depth.mjs
 *
 * The real maps come from estimate_depth.py on a GPU. This exists so the
 * renderer that consumes them can be built and checked without one: it casts a
 * ray per pixel through the same camera the hybrid prototype fitted, against
 * the same handful of boxes, and writes the distances out in the same format.
 *
 * It is deliberately crude - boxes have hard edges and a painting does not -
 * which makes it a fair test of the machinery and a poor substitute for the
 * model. Swapping in the predicted map should visibly improve the silhouettes
 * it occludes along.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { ROOT, c } from '../lib.mjs';

const W = 640;
const H = 400;
const FOV = 33;
const CAM = [0, 2.15, 7.9];
const LOOK = [0, 1.0, -1.2];
const NEAR = 3.0;
const FAR = 11.5;

/** Axis-aligned boxes: [cx, cy, cz, sx, sy, sz], matching officeHybrid. */
const BOXES = [
  [0.44, 0.4, -0.4, 3.82, 0.8, 1.6],       // desk
  [-4.24, 0.87, -2.9, 1.02, 1.75, 0.8],    // filing cabinet
  [3.48, 0.5, -1.64, 1.08, 1.0, 0.8],      // safe
];
/** The back wall, so the far end of the room is not infinitely distant. */
const WALL_Z = -3.4;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v) => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
];

// Camera basis.
const fwd = norm(sub(LOOK, CAM));
const right = norm(cross(fwd, [0, 1, 0]));
const up = cross(right, fwd);
const tanY = Math.tan((FOV * Math.PI) / 360);
const tanX = tanY * (W / H);

/** Slab test. Returns the nearest positive hit distance, or Infinity. */
function hitBox(o, d, [cx, cy, cz, sx, sy, sz]) {
  const lo = [cx - sx / 2, cy - sy / 2, cz - sz / 2];
  const hi = [cx + sx / 2, cy + sy / 2, cz + sz / 2];
  let tmin = -Infinity;
  let tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return Infinity;
      continue;
    }
    let t1 = (lo[i] - o[i]) / d[i];
    let t2 = (hi[i] - o[i]) / d[i];
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin > 0 ? tmin : Infinity;
}

const img = new PNG({ width: W, height: H });
let nearest = Infinity;
let furthest = 0;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Ray through the pixel centre.
    const px = ((x + 0.5) / W) * 2 - 1;
    const py = 1 - ((y + 0.5) / H) * 2;
    const d = norm([
      fwd[0] + right[0] * px * tanX + up[0] * py * tanY,
      fwd[1] + right[1] * px * tanX + up[1] * py * tanY,
      fwd[2] + right[2] * px * tanX + up[2] * py * tanY,
    ]);

    let t = Infinity;
    // Floor.
    if (d[1] < -1e-9) {
      const tf = -CAM[1] / d[1];
      if (tf > 0) t = Math.min(t, tf);
    }
    // Back wall.
    if (d[2] < -1e-9) {
      const tw = (WALL_Z - CAM[2]) / d[2];
      if (tw > 0) t = Math.min(t, tw);
    }
    for (const b of BOXES) t = Math.min(t, hitBox(CAM, d, b));
    if (!Number.isFinite(t)) t = FAR;

    nearest = Math.min(nearest, t);
    furthest = Math.max(furthest, t);
    // White is near, matching what the depth model produces.
    const v = Math.round(255 * (1 - Math.min(1, Math.max(0, (t - NEAR) / (FAR - NEAR)))));
    const i = (y * W + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
}

const dir = resolve(ROOT, 'public/assets/depth');
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'arcade_office.png'), PNG.sync.write(img));
console.log(`${c.green('+')} public/assets/depth/arcade_office.png`);
console.log(`  distances ${nearest.toFixed(2)}m .. ${furthest.toFixed(2)}m, mapped over ${NEAR}..${FAR}`);
console.log(c.dim('  a stand-in: run tools/depth/estimate_depth.py on a GPU for the real thing'));
