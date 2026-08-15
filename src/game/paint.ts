import { font } from '../engine/BitmapFont';
import { Colors, ramp, shade, snapImageData } from '../engine/Palette';

/**
 * Pixel-art drawing primitives for the procedurally painted backgrounds.
 *
 * Three techniques carry the visual load:
 *
 * 1. **Draw smooth, snap afterwards.** Painters use the full canvas API -
 *    curves, ellipses, gradients - and `snapToPalette` forces the result onto
 *    the locked palette at the end. Without this the art has to be built from
 *    axis-aligned rectangles, which is exactly what reads as "blocky".
 * 2. **Cel shading.** Flat tones with a hard edge between lit and shadow face,
 *    plus a dark contour. This is how cartoon animation describes a volume;
 *    gradients look airbrushed and wrong for the style.
 * 3. **Deterministic noise.** Every scene seeds its own PRNG, so the "random"
 *    grime, stars and crowd detail are identical on every load. Backgrounds
 *    are stable across saves, screenshots and reloads.
 */

export type Ctx = CanvasRenderingContext2D;

/** 4x4 ordered dither matrix, values 0-15. */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function bayer(x: number, y: number): number {
  return BAYER4[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)] / 16;
}

/** Small, fast, seedable PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rect(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function outline(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  c.fillStyle = color;
  c.fillRect(x, y, w, 1);
  c.fillRect(x, y + h - 1, w, 1);
  c.fillRect(x, y, 1, h);
  c.fillRect(x + w - 1, y, 1, h);
}

export function hline(c: Ctx, x: number, y: number, w: number, color: string): void {
  rect(c, x, y, w, 1, color);
}

export function vline(c: Ctx, x: number, y: number, h: number, color: string): void {
  rect(c, x, y, 1, h, color);
}

/** Linear-light interpolation between two sRGB colours. */
function mixHex(a: string, b: string, t: number): string {
  const toLin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const toSrgb = (v: number) => {
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(s * 255)));
  };
  const pa = [1, 3, 5].map((i) => toLin(parseInt(a.slice(i, i + 2), 16)));
  const pb = [1, 3, 5].map((i) => toLin(parseInt(b.slice(i, i + 2), 16)));
  return (
    '#' +
    pa
      .map((v, i) => toSrgb(v + (pb[i] - v) * t).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Vertical gradient across a colour ramp.
 *
 * This used to dither between adjacent palette entries, and that visible 4x4
 * checkerboard was the single biggest cause of the art reading as "blocky".
 * Now that the palette expands each ramp to 16 smooth shades, the gradient is
 * interpolated exactly and the final `snapToPalette` pass lands it on legal
 * colours - so a sky is a sky rather than a mesh.
 *
 * `power` bends the ramp: below 1 holds the first colour longer, which is what
 * a real sky does - most of it one shade, the transition crowded at the horizon.
 */
export function gradientV(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: readonly string[],
  power = 1,
): void {
  if (colors.length === 1) return rect(c, x, y, w, h, colors[0]);
  for (let py = 0; py < h; py++) {
    const t = Math.pow(h <= 1 ? 0 : py / (h - 1), power);
    const pos = t * (colors.length - 1);
    const i = Math.min(colors.length - 2, Math.floor(pos));
    c.fillStyle = mixHex(colors[i], colors[i + 1], pos - i);
    c.fillRect(x, y + py, w, 1);
  }
}

/** Vertical gradient down a named ramp, from shade `t0` to shade `t1`. */
export function rampGradient(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
  t0: number,
  t1: number,
  power = 1,
): void {
  for (let py = 0; py < h; py++) {
    const t = Math.pow(h <= 1 ? 0 : py / (h - 1), power);
    c.fillStyle = shade(name, t0 + (t1 - t0) * t);
    c.fillRect(x, y + py, w, 1);
  }
}

/** Flat blend of two colours. Was a dither; now a straight mix. */
export function ditherFill(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  a: string,
  b: string,
  mix: number,
): void {
  c.fillStyle = mixHex(a, b, mix);
  c.fillRect(x, y, w, h);
}

/** Speckled grime/texture. `density` is the fraction of pixels touched. */
export function speckle(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  density: number,
  seed: number,
): void {
  const r = rng(seed);
  const count = Math.floor(w * h * density);
  c.fillStyle = color;
  for (let i = 0; i < count; i++) {
    c.fillRect(x + Math.floor(r() * w), y + Math.floor(r() * h), 1, 1);
  }
}

/** A brick wall, with slightly varied brick shades. */
export function bricks(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  alt: string,
  mortar: string,
  seed = 1,
): void {
  rect(c, x, y, w, h, mortar);
  const bw = 12;
  const bh = 5;
  const r = rng(seed);
  for (let row = 0; row * bh < h; row++) {
    const offset = row % 2 === 0 ? 0 : -bw / 2;
    for (let col = -1; col * bw + offset < w; col++) {
      const bx = x + col * bw + offset;
      const by = y + row * bh;
      const bwClamped = Math.min(bw - 1, x + w - bx);
      if (bwClamped <= 0 || bx + bwClamped < x) continue;
      rect(
        c,
        Math.max(x, bx),
        by,
        Math.min(bwClamped, bx + bwClamped - Math.max(x, bx)),
        Math.min(bh - 1, y + h - by),
        r() > 0.75 ? alt : base,
      );
    }
  }
}

/** Floorboards or decking, running horizontally with a vanishing-point squeeze. */
export function boards(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  line: string,
  seed = 2,
): void {
  rect(c, x, y, w, h, base);
  const r = rng(seed);
  let py = y;
  let gap = 2;
  while (py < y + h) {
    hline(c, x, Math.round(py), w, line);
    // Gaps widen towards the bottom of the screen, faking perspective.
    gap += 0.55;
    py += gap;
    if (r() > 0.7) speckle(c, x, Math.round(py), w, 2, line, 0.08, seed + py);
  }
}

/** Chequerboard lino, the floor of every British seaside arcade. */
export function checker(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  a: string,
  b: string,
  size = 8,
): void {
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const on = (Math.floor(px / size) + Math.floor(py / size)) % 2 === 0;
      c.fillStyle = on ? a : b;
      c.fillRect(x + px, y + py, 1, 1);
    }
  }
}

/**
 * A glowing neon tube. Drawn as a bright core with a dimmer halo, which the
 * screen's bloom pass then blows out further.
 */
export function neonLine(
  c: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  core: string,
  halo: string,
): void {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  for (let i = 0; i <= steps; i++) {
    const px = Math.round(x1 + ((x2 - x1) * i) / steps);
    const py = Math.round(y1 + ((y2 - y1) * i) / steps);
    c.fillStyle = halo;
    c.fillRect(px - 1, py, 3, 1);
    c.fillRect(px, py - 1, 1, 3);
    c.fillStyle = core;
    c.fillRect(px, py, 1, 1);
  }
}

/** Neon text, for shopfronts and the arcade sign. */
export function neonText(
  c: Ctx,
  text: string,
  x: number,
  y: number,
  core: string,
  halo: string,
  align: 'left' | 'center' = 'center',
): void {
  font.draw(c, text, x, y, { color: halo, outline: halo, align });
  font.draw(c, text, x, y, { color: core, align });
}

/** A lit window: warm interior with a mullion cross. */
export function windowPane(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  glass: string,
  frame: string,
): void {
  rect(c, x, y, w, h, glass);
  outline(c, x, y, w, h, frame);
  vline(c, x + Math.floor(w / 2), y, h, frame);
  hline(c, x, y + Math.floor(h / 2), w, frame);
}

/**
 * A generic upright arcade cabinet - the single most reused object in the game.
 * `on` lights the screen and the marquee.
 */
export function cabinet(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  rampName: string,
  screen: string,
  on = true,
  seed = 5,
  lean = 1.5,
): void {
  groundShadow(c, x + w / 2, y + h + 1, w * 0.62, 4);

  // The body leans back slightly and tapers, so it reads as a solid object
  // seen from just below rather than a flat coloured rectangle.
  celQuad(c, [
    [x + lean, y],
    [x + w - lean, y],
    [x + w, y + h],
    [x, y + h],
  ], rampName, { base: 0.66, shadow: 0.28, highlight: 0.16, light: [-3, -2] });

  // Marquee.
  const marqueeH = Math.max(4, Math.floor(h * 0.14));
  celQuad(c, [
    [x + lean + 1, y + 1],
    [x + w - lean - 1, y + 1],
    [x + w - 2, y + marqueeH],
    [x + 2, y + marqueeH],
  ], on ? 'gold' : 'neutral', { base: on ? 0.86 : 0.3, shadow: 0.2, outlineWidth: 1 });

  // Screen, recessed behind a dark bezel.
  const sy = y + marqueeH + 4;
  const sh = Math.floor(h * 0.34);
  celQuad(c, [
    [x + 3, sy], [x + w - 3, sy], [x + w - 4, sy + sh], [x + 4, sy + sh],
  ], 'neutral', { base: 0.06, shadow: 0.04, outlineWidth: 1 });
  if (on) {
    c.save();
    c.beginPath();
    c.moveTo(x + 5, sy + 2);
    c.lineTo(x + w - 5, sy + 2);
    c.lineTo(x + w - 6, sy + sh - 2);
    c.lineTo(x + 6, sy + sh - 2);
    c.closePath();
    c.clip();
    c.fillStyle = screen;
    c.fillRect(x, sy, w, sh);
    const r = rng(seed);
    c.fillStyle = Colors.paper;
    for (let i = 0; i < 6; i++) {
      c.fillRect(x + 5 + r() * (w - 11), sy + 3 + r() * (sh - 6), 2, 2);
    }
    c.restore();
  }

  // Control panel, sloping towards the player.
  const cpY = sy + sh + 2;
  celQuad(c, [
    [x + 2, cpY], [x + w - 2, cpY], [x + w, cpY + 6], [x, cpY + 6],
  ], rampName, { base: 0.44, shadow: 0.2, outlineWidth: 1 });
  celEllipse(c, x + 7, cpY + 3, 2.5, 2.5, 'red', { base: 0.78, outlineWidth: 1 });
  celEllipse(c, x + 14, cpY + 3, 2.5, 2.5, 'teal', { base: 0.78, outlineWidth: 1 });

  // Coin door.
  celQuad(c, [
    [x + w / 2 - 5, y + h - 10], [x + w / 2 + 5, y + h - 10],
    [x + w / 2 + 5, y + h - 3], [x + w / 2 - 5, y + h - 3],
  ], 'neutral', { base: 0.22, shadow: 0.1, outlineWidth: 1 });
  rect(c, x + w / 2 - 3, y + h - 8, 6, 1, shade('gold', 0.7));
}

/** Sea with dithered bands and a few horizontal glints. */
export function sea(c: Ctx, x: number, y: number, w: number, h: number, seed = 9): void {
  gradientV(c, x, y, w, h, [ramp('blue', 0), ramp('cyan', 0), ramp('violet', 0)], 0.7);
  const r = rng(seed);
  for (let i = 0; i < h * 1.6; i++) {
    const py = y + Math.floor(r() * h);
    const px = x + Math.floor(r() * w);
    const len = 1 + Math.floor(r() * 4);
    hline(c, px, py, len, r() > 0.6 ? ramp('cyan', 2) : ramp('cyan', 1));
  }
}

/** Night sky with stars and an optional moon. */
export function nightSky(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  seed = 11,
  moon?: { x: number; y: number; r: number },
): void {
  gradientV(c, x, y, w, h, [ramp('neutral', 0), ramp('violet', 0), ramp('magenta', 0)], 1.6);
  const r = rng(seed);
  for (let i = 0; i < 70; i++) {
    const px = x + Math.floor(r() * w);
    const py = y + Math.floor(r() * h * 0.8);
    const v = r();
    c.fillStyle = v > 0.85 ? Colors.paper : v > 0.5 ? ramp('neutral', 4) : ramp('neutral', 3);
    c.fillRect(px, py, 1, 1);
  }
  if (moon) {
    c.fillStyle = ramp('amber', 3);
    c.beginPath();
    c.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ramp('amber', 2);
    c.beginPath();
    c.arc(moon.x - 1, moon.y + 1, moon.r * 0.55, 0, Math.PI * 2);
    c.fill();
  }
}

/**
 * A pool of light cast on the floor by a lamp or a doorway.
 *
 * Drawn as a real radial gradient rather than a dither. The old dot-screen
 * version was the most visible remaining source of "blockiness" - a halo made
 * of a visible 4x4 grid reads as a mesh, not as light.
 */
export function lightPool(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  strength = 0.5,
): void {
  c.save();
  c.translate(cx, cy);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(0.55, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalAlpha = strength;
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, rx, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.globalAlpha = 1;
}

/** A CRT screen showing static, for televisions and dead arcade monitors. */
export function staticScreen(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  seed = 3,
): void {
  const r = rng(seed);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const v = r();
      c.fillStyle =
        v > 0.85 ? Colors.paper : v > 0.6 ? ramp('neutral', 4) : v > 0.3 ? ramp('neutral', 2) : Colors.ink;
      c.fillRect(x + px, y + py, 1, 1);
    }
  }
}

/** Rounded-corner mask, so CRT screens aren't perfect rectangles. */
export function crtCorners(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  c.fillStyle = color;
  for (const [cx, cy] of [
    [x, y],
    [x + w - 1, y],
    [x, y + h - 1],
    [x + w - 1, y + h - 1],
  ]) {
    c.fillRect(cx, cy, 1, 1);
  }
}

/** Simple silhouetted figure - used for crowds, and for the tasteful gags. */
export function silhouette(
  c: Ctx,
  x: number,
  y: number,
  h: number,
  color: string,
  lean = 0,
): void {
  const headR = Math.max(1, Math.round(h * 0.13));
  const bodyH = Math.round(h * 0.52);
  const legH = h - bodyH - headR * 2;
  c.fillStyle = color;
  // Head
  c.beginPath();
  c.arc(x + lean, y - h + headR, headR, 0, Math.PI * 2);
  c.fill();
  // Torso
  c.fillRect(Math.round(x - headR + lean * 0.6), y - h + headR * 2, headR * 2, bodyH);
  // Legs
  c.fillRect(Math.round(x - headR), y - legH, headR - 0.4, legH);
  c.fillRect(Math.round(x + 0.6), y - legH, headR - 0.4, legH);
}

export { Colors, ramp, shade, font };

// ---------------------------------------------------------------------------
// Cel shading, curves and palette snapping
//
// These are the primitives the Day of the Tentacle direction needs. The key
// idea is `snapToPalette`: painters draw with the full canvas API - bezier
// curves, ellipses, anti-aliased fills, real gradients, none of which respect a
// palette - and the finished image is snapped afterwards. That removes the
// constraint that pushed the earlier art into axis-aligned rectangles, which is
// what made it read as blocky.
// ---------------------------------------------------------------------------

/**
 * Force a region onto the palette and to binary alpha.
 *
 * Call once at the end of a painter. Everything before it can be as smooth and
 * as curved as you like.
 */
export function snapToPalette(c: Ctx, x = 0, y = 0, w?: number, h?: number): void {
  const width = w ?? c.canvas.width - x;
  const height = h ?? c.canvas.height - y;
  if (width <= 0 || height <= 0) return;
  const img = c.getImageData(x, y, width, height);
  snapImageData(img.data);
  c.putImageData(img, x, y);
}

/** Build a closed path through points, smoothed with quadratic curves. */
export function curvePath(c: Ctx, pts: readonly (readonly [number, number])[]): void {
  if (pts.length < 3) return;
  c.beginPath();
  // Start at the midpoint of the closing edge so every corner gets smoothed.
  const mid = (a: readonly [number, number], b: readonly [number, number]) =>
    [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  let prev = mid(pts[pts.length - 1], pts[0]);
  c.moveTo(prev[0], prev[1]);
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m = mid(cur, next);
    c.quadraticCurveTo(cur[0], cur[1], m[0], m[1]);
    prev = m;
  }
  c.closePath();
}

/** An organic closed blob: an ellipse with per-vertex wobble. */
export function blobPath(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  wobble = 0.18,
  seed = 1,
  points = 9,
): void {
  const r = rng(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * wobble;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  curvePath(c, pts);
}

export interface CelOptions {
  /** Shade of the ramp for the lit face, 0 (dark) to 1 (light). */
  base?: number;
  /** How much darker the shadow side is, in shade units. */
  shadow?: number;
  /** Optional third, brightest tone. */
  highlight?: number;
  /** Light direction, in pixels of offset. */
  light?: [number, number];
  /** Contour colour. `null` disables the outline. */
  outline?: string | null;
  outlineWidth?: number;
}

/**
 * Fill a path with flat cel shading and a dark contour.
 *
 * Shading is done by filling the whole shape in shadow, clipping to it, then
 * re-filling the same path offset towards the light. The overlap becomes the
 * lit face and the sliver left behind becomes the shadow - two flat tones with
 * a hard edge between them, which is how cartoon animation shades a volume.
 * A gradient would look airbrushed and completely wrong for this style.
 */
export function celShape(
  c: Ctx,
  build: (ctx: Ctx) => void,
  rampName: string,
  opts: CelOptions = {},
): void {
  const base = opts.base ?? 0.62;
  const shadowDrop = opts.shadow ?? 0.26;
  const [lx, ly] = opts.light ?? [-2, -2];
  const outlineColor = opts.outline === undefined ? Colors.ink : opts.outline;
  const lw = opts.outlineWidth ?? 2;

  c.save();
  build(c);
  c.fillStyle = shade(rampName, Math.max(0, base - shadowDrop));
  c.fill();

  c.clip();
  c.save();
  c.translate(lx, ly);
  build(c);
  c.fillStyle = shade(rampName, base);
  c.fill();
  if (opts.highlight !== undefined) {
    c.translate(lx * 0.9, ly * 0.9);
    build(c);
    c.fillStyle = shade(rampName, Math.min(1, base + opts.highlight));
    c.fill();
  }
  c.restore();
  c.restore();

  if (outlineColor) {
    c.save();
    build(c);
    c.lineWidth = lw;
    c.lineJoin = 'round';
    c.strokeStyle = outlineColor;
    c.stroke();
    c.restore();
  }
}

/** Cel-shaded ellipse - the workhorse for cartoon props and body parts. */
export function celEllipse(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rampName: string,
  opts: CelOptions = {},
): void {
  celShape(c, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  }, rampName, opts);
}

/** Cel-shaded quad. Corners are given explicitly so nothing has to be square. */
export function celQuad(
  c: Ctx,
  pts: readonly [number, number][],
  rampName: string,
  opts: CelOptions = {},
): void {
  celShape(c, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }, rampName, opts);
}

/** Cel-shaded organic blob. */
export function celBlob(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rampName: string,
  opts: CelOptions & { wobble?: number; seed?: number } = {},
): void {
  celShape(
    c,
    (ctx) => blobPath(ctx, cx, cy, rx, ry, opts.wobble ?? 0.18, opts.seed ?? 1),
    rampName,
    opts,
  );
}

/** A rounded rectangle that leans, for architecture that is never quite square. */
export function skewRect(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  lean: number,
  rampName: string,
  opts: CelOptions = {},
): void {
  celQuad(
    c,
    [
      [x + lean, y],
      [x + w + lean, y],
      [x + w, y + h],
      [x, y + h],
    ],
    rampName,
    opts,
  );
}

/** A soft contact shadow on the floor beneath an object. */
export function groundShadow(c: Ctx, cx: number, cy: number, rx: number, ry = rx * 0.32): void {
  c.save();
  c.globalAlpha = 0.42;
  c.fillStyle = Colors.ink;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
