import { font } from '../engine/BitmapFont';
import { Colors, ramp } from '../engine/Palette';

/**
 * Pixel-art drawing primitives for the procedurally painted backgrounds.
 *
 * Two techniques carry most of the visual load:
 *
 * 1. **Ordered (Bayer) dithering.** With 32 colours you cannot draw a smooth
 *    sky. Dithering interleaves two palette colours in a fixed 4x4 pattern so
 *    the eye blends them into intermediate shades - the same trick every
 *    artist used on EGA and early VGA hardware. It is the single biggest
 *    reason a locked palette can still look rich.
 * 2. **Deterministic noise.** Every scene seeds its own PRNG, so the "random"
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

/**
 * Vertical gradient across a colour ramp, dithered between adjacent steps.
 *
 * `power` bends the ramp: values below 1 hold the first colour longer, which is
 * what a real sky does - most of it is one shade with the transition crowded
 * near the horizon.
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
    const frac = pos - i;
    for (let px = 0; px < w; px++) {
      c.fillStyle = frac > bayer(x + px, y + py) ? colors[i + 1] : colors[i];
      c.fillRect(x + px, y + py, 1, 1);
    }
  }
}

/** Flat dithered blend of exactly two colours at a fixed mix. */
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
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      c.fillStyle = mix > bayer(x + px, y + py) ? b : a;
      c.fillRect(x + px, y + py, 1, 1);
    }
  }
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
  body: string,
  accent: string,
  screen: string,
  on = true,
  seed = 5,
): void {
  const shade = ramp('neutral', 1);

  // Body with a lit left edge and shaded right, so cabinets read as 3D.
  rect(c, x, y, w, h, body);
  vline(c, x, y, h, accent);
  rect(c, x + w - 2, y, 2, h, shade);

  // Marquee
  const marqueeH = Math.max(3, Math.floor(h * 0.13));
  rect(c, x + 1, y + 1, w - 3, marqueeH, on ? accent : shade);
  if (on) rect(c, x + 2, y + 2, w - 5, Math.max(1, marqueeH - 2), ramp('amber', 3));

  // Screen, recessed
  const sy = y + marqueeH + 3;
  const sh = Math.floor(h * 0.34);
  rect(c, x + 2, sy, w - 5, sh, Colors.ink);
  if (on) {
    rect(c, x + 3, sy + 1, w - 7, sh - 2, screen);
    // A couple of bright blobs read as "a game is happening" at this size.
    const r = rng(seed);
    c.fillStyle = ramp('paper', 0);
    for (let i = 0; i < 5; i++) {
      c.fillRect(x + 4 + Math.floor(r() * (w - 9)), sy + 2 + Math.floor(r() * (sh - 4)), 1, 1);
    }
  }

  // Control panel, angled
  const cpY = sy + sh + 2;
  rect(c, x + 1, cpY, w - 3, 4, accent);
  c.fillStyle = Colors.danger;
  c.fillRect(x + 4, cpY + 1, 2, 2);
  c.fillStyle = ramp('cyan', 2);
  c.fillRect(x + 8, cpY + 1, 2, 2);

  // Coin door
  rect(c, x + Math.floor(w / 2) - 3, y + h - 8, 6, 5, shade);
  hline(c, x + Math.floor(w / 2) - 2, y + h - 6, 4, ramp('amber', 2));
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

/** A pool of light cast on the floor by a lamp or a doorway. */
export function lightPool(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  strength = 0.5,
): void {
  for (let py = -ry; py <= ry; py++) {
    for (let px = -rx; px <= rx; px++) {
      const d = (px * px) / (rx * rx) + (py * py) / (ry * ry);
      if (d > 1) continue;
      if ((1 - d) * strength > bayer(cx + px, cy + py)) {
        c.fillStyle = color;
        c.fillRect(cx + px, cy + py, 1, 1);
      }
    }
  }
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

export { Colors, ramp, font };
