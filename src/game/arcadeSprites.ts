import { ramp } from '../engine/Palette';

/**
 * Pixel art for the arcade cabinets, authored a pixel at a time.
 *
 * Deliberately not generated. These sprites are eight to sixteen pixels
 * across; an image model renders at a thousand and the reduction turns any
 * render into three grey smudges. At this size the pixels *are* the drawing,
 * so they are written out by hand as strings - which also makes them
 * unambiguously original work rather than something that half-remembers a
 * cabinet from 1978.
 *
 * A row is one pixel per character. A space is transparent; every other
 * character is an index into the sprite's colour list.
 */
export interface PixelSprite {
  rows: string[];
  /** Colours keyed by the character used in `rows`. */
  colors: Record<string, string>;
  width: number;
  height: number;
}

function sprite(rows: string[], colors: Record<string, string>): PixelSprite {
  return {
    rows,
    colors,
    width: Math.max(...rows.map((r) => r.length)),
    height: rows.length,
  };
}

export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  s: PixelSprite,
  x: number,
  y: number,
  scale = 1,
): void {
  const px = Math.round(x);
  const py = Math.round(y);
  for (let r = 0; r < s.rows.length; r++) {
    const row = s.rows[r];
    for (let cIdx = 0; cIdx < row.length; cIdx++) {
      const ch = row[cIdx];
      if (ch === ' ') continue;
      const col = s.colors[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(px + cIdx * scale, py + r * scale, scale, scale);
    }
  }
}

/** Centre a sprite on a point, which is how every entity stores its position. */
export function drawSpriteCentred(
  ctx: CanvasRenderingContext2D,
  s: PixelSprite,
  cx: number,
  cy: number,
  scale = 1,
): void {
  drawPixelSprite(ctx, s, cx - (s.width * scale) / 2, cy - (s.height * scale) / 2, scale);
}

// --------------------------------------------------------------- SPACE WARS

const GREEN = { '#': ramp('phosphor', 3), '.': ramp('phosphor', 2) };
const CYAN = { '#': ramp('cyan', 3), '.': ramp('cyan', 2) };
const AMBER = { '#': ramp('amber', 3), '.': ramp('amber', 2) };
const RED = { '#': ramp('red', 3), '.': ramp('red', 2) };

/**
 * Three ranks of invader, two frames each. The shapes are mine: a
 * long-eared hopper, a horned beetle and a one-eyed drifter. They animate by
 * swapping frames on the march, which is what makes a formation feel alive.
 */
export const INVADER_A = [
  sprite([
    '  #    #  ',
    '   #  #   ',
    '  ######  ',
    ' ## ## ## ',
    '##########',
    '#.########',
    '#.#    #.#',
    '   ##  ## ',
  ], GREEN),
  sprite([
    '  #    #  ',
    '#  #  #  #',
    '# ###### #',
    '### ## ###',
    '##########',
    ' ######## ',
    '  #    #  ',
    ' ##    ## ',
  ], GREEN),
];

export const INVADER_B = [
  sprite([
    '   ####   ',
    ' ######## ',
    '##########',
    '### ## ###',
    '##########',
    '  ##  ##  ',
    ' ##  ## # ',
    '#        #',
  ], CYAN),
  sprite([
    '   ####   ',
    ' ######## ',
    '##########',
    '### ## ###',
    '##########',
    ' # ####  #',
    '#  #  #   ',
    '    ##    ',
  ], CYAN),
];

export const INVADER_C = [
  sprite([
    '    ##    ',
    '   ####   ',
    '  ######  ',
    ' ## ## ## ',
    ' ######## ',
    '   #  #   ',
    '  #.  .#  ',
    ' #      # ',
  ], AMBER),
  sprite([
    '    ##    ',
    '   ####   ',
    '  ######  ',
    ' ## ## ## ',
    ' ######## ',
    '  #    #  ',
    ' #  ##  # ',
    '  #    #  ',
  ], AMBER),
];

/** The player's ship: a squat lander with a raised cannon. */
export const SHIP = sprite([
  '    ##    ',
  '    ##    ',
  '   ####   ',
  '  ######  ',
  ' ######## ',
  '##########',
  '##.####.##',
  '#.      .#',
], CYAN);

/** A three-stage burst, played as an entity dies. */
export const BOOM = [
  sprite([
    '  #  #  ',
    '   ##   ',
    ' ###### ',
    '   ##   ',
    '  #  #  ',
  ], AMBER),
  sprite([
    '# .  . #',
    ' # ## # ',
    '.  ##  .',
    ' # ## # ',
    '# .  . #',
  ], AMBER),
  sprite([
    '.      .',
    '  .  .  ',
    '        ',
    '  .  .  ',
    '.      .',
  ], AMBER),
];

/** The shield blocks the invaders shoot away, four to a screen. */
export const BUNKER = sprite([
  ' ######## ',
  '##########',
  '##########',
  '###    ###',
  '##      ##',
], GREEN);

// -------------------------------------------------------------- TURBO RACER

/** Seen from behind: the player's car, with brake lights. */
export const CAR_PLAYER = sprite([
  '  ####  ',
  ' ###### ',
  '  ####  ',
  ' ###### ',
  '########',
  '#.####.#',
  '########',
  '#.    .#',
], RED);

/** Oncoming traffic, headlights towards the camera. */
export const CAR_ENEMY = sprite([
  '#.    .#',
  '########',
  '#.####.#',
  '########',
  ' ###### ',
  '  ####  ',
  ' ###### ',
  '  ####  ',
], CYAN);

// ------------------------------------------------------------- MONSTER MANOR

/** The thing in the maze. Two frames, so it shuffles as it hunts. */
export const MONSTER = [
  sprite([
    ' ###### ',
    '########',
    '##.##.##',
    '########',
    '########',
    '# #  # #',
  ], GREEN),
  sprite([
    ' ###### ',
    '########',
    '##.##.##',
    '########',
    '########',
    ' ## ##  ',
  ], GREEN),
];

/** The player, in a maze seen from above. */
export const EXPLORER = sprite([
  '  ####  ',
  ' ###### ',
  ' #.##.# ',
  ' ###### ',
  '  ####  ',
  ' ##  ## ',
], AMBER);

/** The way out. */
export const EXIT_DOOR = sprite([
  '########',
  '#......#',
  '#.####.#',
  '#.#  #.#',
  '#.#  #.#',
  '#.#  #.#',
], CYAN);
