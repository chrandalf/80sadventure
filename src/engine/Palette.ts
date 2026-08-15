import paletteData from '../content/palette.json';

export type RGB = readonly [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: RGB): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The colour system.
 *
 * The JSON holds a small set of hand-picked **key colours** per ramp. At load
 * those are interpolated up to `stepsPerRamp` shades each, producing a ~224
 * colour VGA-era palette. That matters for the art direction: with 32 colours
 * you must dither every gradient, and the visible 4x4 checkerboard is what
 * reads as "blocky". With smooth ramps a gradient is just a gradient.
 *
 * Two accessors, deliberately separate:
 *   - `ramp(name, i)`  - key colour by index. Stable, used by existing art.
 *   - `shade(name, t)` - the smooth expansion, t from 0 (darkest) to 1.
 */
export const PALETTE_NAME: string = paletteData.name;

const STEPS: number = paletteData.stepsPerRamp ?? 16;

export const RAMPS: Readonly<Record<string, readonly string[]>> = paletteData.ramps;

/** Semantic names, so game code says `Colors.uiBorder` rather than `#7a4de8`. */
export const Colors: Readonly<Record<string, string>> = paletteData.roles;

/**
 * Interpolate a ramp's key colours up to `steps` shades.
 *
 * Interpolation happens in linear-light space rather than straight on the sRGB
 * byte values. Blending sRGB directly makes midtones muddy and desaturated -
 * the classic "grey smear" between two saturated colours - which is exactly
 * what a shading ramp must not do.
 */
function expandRamp(keys: readonly string[], steps: number): string[] {
  if (keys.length === 0) return [];
  if (keys.length === 1) return Array.from({ length: steps }, () => keys[0]);

  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const toSrgb = (v: number) => {
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(s * 255)));
  };

  const lin = keys.map((k) => hexToRgb(k).map(toLinear) as [number, number, number]);
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / (steps - 1)) * (lin.length - 1);
    const lo = Math.min(lin.length - 2, Math.floor(t));
    const f = t - lo;
    const a = lin[lo];
    const b = lin[lo + 1];
    out.push(rgbToHex([
      toSrgb(a[0] + (b[0] - a[0]) * f),
      toSrgb(a[1] + (b[1] - a[1]) * f),
      toSrgb(a[2] + (b[2] - a[2]) * f),
    ]));
  }
  return out;
}

/** Every ramp, expanded. This is the palette the art actually draws from. */
export const SHADES: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  Object.entries(paletteData.ramps).map(([name, keys]) => [name, expandRamp(keys, STEPS)]),
);

/** Flat list of every legal colour, deduplicated. */
export const PALETTE_HEX: readonly string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of Object.values(SHADES)) {
    for (const hex of list) {
      const key = hex.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  }
  return out;
})();

export const PALETTE_RGB: readonly RGB[] = PALETTE_HEX.map(hexToRgb);

const HEX_SET: ReadonlySet<string> = new Set(PALETTE_HEX);

export function isPaletteColor(hex: string): boolean {
  return HEX_SET.has(hex.toLowerCase());
}

/**
 * A key colour by index. Negative counts from the light end. Unchanged
 * behaviour, so existing painters keep the exact colours they were written
 * against.
 */
export function ramp(name: string, index: number): string {
  const r = RAMPS[name];
  if (!r || r.length === 0) return Colors.paper;
  const i = index < 0 ? r.length + index : index;
  return r[Math.max(0, Math.min(r.length - 1, i))];
}

/**
 * A smooth shade from a ramp. `t` runs 0 (darkest) to 1 (lightest) and is
 * clamped. This is what new art should use - it is the whole reason gradients
 * no longer need dithering.
 */
export function shade(name: string, t: number): string {
  const list = SHADES[name];
  if (!list || list.length === 0) return Colors.paper;
  const i = Math.round(Math.max(0, Math.min(1, t)) * (list.length - 1));
  return list[i];
}

/** Number of shades a ramp expands to. */
export const RAMP_STEPS = STEPS;

/**
 * Nearest palette colour by weighted RGB distance, with the weights
 * approximating human luminance sensitivity.
 */
export function nearestPaletteColor(r: number, g: number, b: number): RGB {
  let best = PALETTE_RGB[0];
  let bestDist = Infinity;
  for (const c of PALETTE_RGB) {
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const dist = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

/**
 * A 15-bit lookup table (5 bits per channel) mapping any colour to its nearest
 * palette entry.
 *
 * This is what makes the whole approach viable: painters can use canvas curves,
 * anti-aliased fills and real gradients - none of which respect a palette - and
 * the finished image gets snapped afterwards. Doing that with a linear search
 * over 224 colours would be ~14 million comparisons per background; the table
 * makes it one array read per pixel. Built once, lazily.
 */
let snapLut: Uint8Array | null = null;

function buildLut(): Uint8Array {
  const lut = new Uint8Array(32768 * 3);
  for (let r5 = 0; r5 < 32; r5++) {
    // Expand 5-bit back to the centre of its 8-bit bucket for a fairer match.
    const r = (r5 << 3) | (r5 >> 2);
    for (let g5 = 0; g5 < 32; g5++) {
      const g = (g5 << 3) | (g5 >> 2);
      for (let b5 = 0; b5 < 32; b5++) {
        const b = (b5 << 3) | (b5 >> 2);
        const [pr, pg, pb] = nearestPaletteColor(r, g, b);
        const i = ((r5 << 10) | (g5 << 5) | b5) * 3;
        lut[i] = pr;
        lut[i + 1] = pg;
        lut[i + 2] = pb;
      }
    }
  }
  return lut;
}

/**
 * Snap an ImageData buffer in place to the palette.
 *
 * Alpha is forced binary at the same time, because anti-aliased path edges
 * produce partial alpha that would halo when the frame is scaled up.
 */
export function snapImageData(data: Uint8ClampedArray): void {
  snapLut ??= buildLut();
  const lut = snapLut;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = 255;
    const key = (((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3)) * 3;
    data[i] = lut[key];
    data[i + 1] = lut[key + 1];
    data[i + 2] = lut[key + 2];
  }
}
