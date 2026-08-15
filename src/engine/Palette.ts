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

/**
 * The locked colour set. Every pixel the game ever draws should come from here.
 *
 * This is not decoration - it is the mechanism that makes art from different
 * sources (hand-drawn, AI-generated, procedurally built placeholders) look like
 * it belongs to one game. Art that doesn't conform gets caught by
 * `npm run assets:validate` before it ever ships.
 */
export const PALETTE_NAME: string = paletteData.name;

export const RAMPS: Readonly<Record<string, readonly string[]>> = paletteData.ramps;

/** Semantic names, so game code says `Colors.uiBorder` rather than `#7a4de8`. */
export const Colors: Readonly<Record<string, string>> = paletteData.roles;

/** Flat list of every legal colour, deduplicated, in ramp order. */
export const PALETTE_HEX: readonly string[] = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ramp of Object.values(paletteData.ramps)) {
    for (const hex of ramp) {
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
 * Pick a colour from a named ramp by index. Negative indices count from the
 * light end, so `ramp('cyan', -1)` is the brightest cyan regardless of how many
 * steps the ramp gains later.
 */
export function ramp(name: keyof typeof RAMPS | string, index: number): string {
  const r = RAMPS[name];
  if (!r || r.length === 0) return Colors.paper;
  const i = index < 0 ? r.length + index : index;
  return r[Math.max(0, Math.min(r.length - 1, i))];
}

/**
 * Nearest palette colour by weighted RGB distance. The weights approximate
 * human luminance sensitivity, which keeps skin tones and dark detail from
 * collapsing the way a naive Euclidean match does.
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
