import { GAME_HEIGHT, GAME_WIDTH } from '../engine/Screen';
import {
  boards, bricks, cabinet, celEllipse, celQuad, celShape, checker, Colors, type Ctx,
  ditherFill, font, gradientV, groundShadow, hline, lightPool, neonLine, neonText, nightSky,
  outline, ramp, rampGradient, rect, rng, sea, shade, silhouette, speckle, staticScreen,
  vline, windowPane,
} from '../game/paint';

/**
 * Every background in the game, painted in code at 320x200 against the locked
 * palette (spec s.36, s.40: "create simple pixel-art placeholders
 * programmatically that preserve the correct composition and lighting").
 *
 * These are real artwork, not grey boxes - each one composes a specific space
 * with its own light source and colour key. Any of them can be replaced by
 * dropping `assets/backgrounds/<id>.png` into place; the loader prefers the
 * file and falls back to the painter. See docs/ASSETS.md.
 */

/** The room occupies the top 144 rows; the verb/inventory panel overlays the rest. */
export const PLAY_HEIGHT = 144;
const W = GAME_WIDTH;

/** Shared: a flat interior wall with skirting and a floor. */
function room(
  c: Ctx,
  wallTop: string,
  wallBottom: string,
  floorA: string,
  floorB: string,
  horizon = 96,
): void {
  gradientV(c, 0, 0, W, horizon, [wallTop, wallBottom], 0.8);
  rect(c, 0, horizon - 3, W, 3, ramp('neutral', 1));
  checker(c, 0, horizon, W, GAME_HEIGHT - horizon, floorA, floorB, 10);
  // Darken the floor towards the bottom of frame so it recedes.
  ditherFill(c, 0, GAME_HEIGHT - 40, W, 40, floorA, Colors.ink, 0.25);
}

/** Shared: fluorescent strip light with the pool it casts. */
function striplight(c: Ctx, x: number, y: number, w: number, color = ramp('cyan', 3)): void {
  rect(c, x, y, w, 2, color);
  rect(c, x - 1, y - 1, w + 2, 1, ramp('neutral', 2));
  lightPool(c, x + w / 2, y + 26, w * 0.8, 22, color, 0.3);
}

export const BACKGROUNDS: Record<string, (c: Ctx) => void> = {
  // ----------------------------------------------------------- the arcade

  arcade_floor(c) {
    // Dark room, everything lit by the machines themselves.
    gradientV(c, 0, 0, W, 74, [ramp('violet', 0), ramp('neutral', 1)], 0.9);
    rect(c, 0, 70, W, 4, ramp('neutral', 1));
    checker(c, 0, 74, W, GAME_HEIGHT - 74, ramp('violet', 0), ramp('neutral', 1), 10);
    ditherFill(c, 0, 74, W, 70, ramp('violet', 0), Colors.ink, 0.3);

    striplight(c, 60, 6, 60, ramp('cyan', 2));
    striplight(c, 200, 6, 60, ramp('cyan', 2));

    // The basement door, stage left. Locked until Jack has the arcade key.
    rect(c, 4, 34, 26, 54, Colors.ink);
    outline(c, 4, 34, 26, 54, ramp('amber', 0));
    rect(c, 25, 60, 3, 4, ramp('amber', 2));
    font.draw(c, 'STAFF', 17, 26, { color: ramp('neutral', 3), align: 'center' });

    // Four named cabinets along the back wall.
    const machines: [number, string][] = [
      [40, 'magenta'], [74, 'teal'], [108, 'amber'], [142, 'phosphor'],
    ];
    machines.forEach(([x, rampName], i) => {
      cabinet(c, x, 26, 30, 62, rampName, shade(rampName, 0.28), true, 30 + i, 1.5);
      lightPool(c, x + 15, 94, 22, 9, shade(rampName, 0.7), 0.45);
      // Cabinet numbers on the coin doors - the clue for the fuse-box order.
      font.draw(c, String([3, 1, 4, 2][i]), x + 15, 80, { color: shade('gold', 0.92), align: 'center' });
    });

    // ONE MORE CREDIT: the odd one out. No marquee, no colour, screen off.
    const mx = 182;
    rect(c, mx, 24, 34, 66, ramp('neutral', 1));
    vline(c, mx, 24, 66, ramp('neutral', 2));
    rect(c, mx + 32, 24, 2, 66, Colors.ink);
    rect(c, mx + 3, 34, 28, 24, Colors.ink);
    staticScreen(c, mx + 4, 35, 26, 22, 77);
    rect(c, mx + 2, 62, 30, 5, ramp('neutral', 2));
    rect(c, mx + 15, 63, 4, 3, Colors.danger);
    lightPool(c, mx + 17, 92, 14, 6, Colors.danger, 0.25);

    // The coin pusher: low, glass-topped, full of other people's money.
    const px = 230;
    rect(c, px, 52, 46, 36, ramp('blue', 1));
    outline(c, px, 52, 46, 36, ramp('blue', 2));
    rect(c, px + 3, 44, 40, 10, ramp('neutral', 0));
    ditherFill(c, px + 4, 45, 38, 8, ramp('neutral', 0), ramp('cyan', 1), 0.4);
    // A drift of 2p pieces behind the glass.
    for (let i = 0; i < 26; i++) {
      const r = rng(600 + i);
      rect(c, px + 5 + r() * 36, 58 + r() * 22, 3, 2, r() > 0.5 ? ramp('amber', 2) : ramp('amber', 1));
    }
    font.draw(c, 'PUSHER', px + 23, 90, { color: ramp('cyan', 2), align: 'center' });

    // Archway through to the lobby, stage right.
    rect(c, 288, 30, 32, 58, Colors.ink);
    ditherFill(c, 290, 32, 28, 54, Colors.ink, ramp('amber', 1), 0.35);

    neonText(c, 'STARLIGHT', 160, 12, ramp('magenta', 3), ramp('magenta', 1));
  },

  arcade_lobby(c) {
    gradientV(c, 0, 0, W, 76, [ramp('amber', 0), ramp('neutral', 1)], 0.9);
    rect(c, 0, 72, W, 4, ramp('neutral', 1));
    checker(c, 0, 76, W, GAME_HEIGHT - 76, ramp('amber', 0), ramp('neutral', 1), 10);
    ditherFill(c, 0, 76, W, 68, ramp('amber', 0), Colors.ink, 0.28);
    striplight(c, 120, 4, 80, ramp('paper', 0));

    // Archway back to the machines, stage left.
    rect(c, 0, 28, 30, 60, Colors.ink);
    ditherFill(c, 2, 30, 26, 56, Colors.ink, ramp('magenta', 1), 0.35);

    // Vending machine.
    rect(c, 42, 26, 30, 62, ramp('red', 0));
    outline(c, 42, 26, 30, 62, ramp('red', 1));
    rect(c, 45, 32, 24, 34, Colors.ink);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        rect(c, 47 + col * 8, 34 + row * 8, 6, 6, [ramp('amber', 1), ramp('magenta', 1), ramp('phosphor', 1)][col]);
      }
    }
    rect(c, 45, 70, 24, 8, ramp('neutral', 0));
    font.draw(c, '20p', 57, 80, { color: ramp('amber', 3), align: 'center' });

    // Cigarette machine, with a gap underneath where change collects.
    rect(c, 82, 30, 26, 54, ramp('neutral', 2));
    outline(c, 82, 30, 26, 54, ramp('neutral', 3));
    for (let i = 0; i < 5; i++) rect(c, 85, 34 + i * 8, 20, 6, ramp('amber', 0));
    rect(c, 82, 84, 26, 4, Colors.ink);

    // The Space Wars poster - the office key hangs behind it.
    rect(c, 126, 24, 34, 46, ramp('magenta', 1));
    outline(c, 126, 24, 34, 46, ramp('magenta', 2));
    font.draw(c, 'SPACE', 143, 34, { color: ramp('cyan', 3), align: 'center' });
    font.draw(c, 'WARS', 143, 44, { color: ramp('cyan', 3), align: 'center' });
    for (let i = 0; i < 12; i++) {
      const r = rng(700 + i);
      rect(c, 128 + r() * 30, 52 + r() * 14, 1, 1, ramp('paper', 0));
    }

    // Office door.
    rect(c, 172, 28, 30, 60, ramp('amber', 1));
    outline(c, 172, 28, 30, 60, ramp('amber', 0));
    rect(c, 196, 58, 3, 4, ramp('neutral', 3));
    rect(c, 178, 34, 18, 10, ramp('neutral', 0));
    font.draw(c, 'OFFICE', 187, 36, { color: ramp('amber', 3), align: 'center' });

    // The change counter.
    rect(c, 214, 60, 62, 8, ramp('amber', 1));
    rect(c, 214, 68, 62, 24, ramp('amber', 0));
    outline(c, 214, 60, 62, 32, ramp('neutral', 1));
    font.draw(c, 'CHANGE', 245, 52, { color: ramp('amber', 3), align: 'center' });

    // Front doors out to the seafront.
    rect(c, 286, 26, 34, 62, Colors.ink);
    outline(c, 286, 26, 34, 62, ramp('cyan', 1));
    ditherFill(c, 288, 28, 30, 58, Colors.ink, ramp('violet', 0), 0.4);
    vline(c, 303, 26, 62, ramp('cyan', 1));
    lightPool(c, 303, 92, 24, 12, ramp('cyan', 1), 0.3);
  },

  arcade_exterior(c) {
    nightSky(c, 0, 0, W, 78, 21, { x: 268, y: 20, r: 7 });
    // Promenade railings and the sea beyond, stage left.
    sea(c, 0, 70, 96, 16, 31);
    rect(c, 0, 86, W, GAME_HEIGHT - 86, ramp('neutral', 1));
    speckle(c, 0, 86, W, 58, ramp('neutral', 2), 0.05, 41);

    // The building.
    bricks(c, 84, 22, 168, 64, ramp('red', 0), ramp('neutral', 1), ramp('neutral', 0), 7);
    rect(c, 84, 20, 168, 4, ramp('neutral', 2));

    // Doorway, warm light spilling out.
    rect(c, 148, 52, 34, 34, Colors.ink);
    rect(c, 150, 54, 30, 32, ramp('amber', 1));
    lightPool(c, 165, 92, 30, 12, ramp('amber', 2), 0.5);

    // Windows either side.
    windowPane(c, 100, 40, 26, 20, ramp('cyan', 1), ramp('neutral', 1));
    windowPane(c, 208, 40, 26, 20, ramp('magenta', 1), ramp('neutral', 1));

    // The sign - the thing you can see from the pier.
    rect(c, 108, 24, 120, 16, Colors.ink);
    outline(c, 108, 24, 120, 16, ramp('magenta', 1));
    neonText(c, 'STARLIGHT', 168, 28, ramp('magenta', 3), ramp('magenta', 2));
    neonLine(c, 112, 38, 224, 38, ramp('cyan', 2), ramp('cyan', 1));

    // Demolition notice nailed to the wall.
    rect(c, 258, 58, 18, 14, ramp('paper', 0));
    hline(c, 260, 62, 14, ramp('neutral', 2));
    hline(c, 260, 65, 14, ramp('neutral', 2));
    hline(c, 260, 68, 10, ramp('neutral', 2));
  },

  arcade_office(c) {
    room(c, ramp('amber', 0), ramp('neutral', 1), ramp('amber', 0), ramp('neutral', 1), 92);
    striplight(c, 130, 4, 60, ramp('amber', 3));

    // Desk with a rotary telephone and a calculator.
    rect(c, 96, 92, 92, 6, ramp('amber', 1));
    rect(c, 100, 98, 6, 30, ramp('amber', 0));
    rect(c, 178, 98, 6, 30, ramp('amber', 0));
    rect(c, 112, 84, 16, 8, ramp('neutral', 1)); // telephone
    rect(c, 114, 82, 12, 3, ramp('neutral', 2));
    rect(c, 146, 86, 12, 6, ramp('neutral', 2)); // calculator
    hline(c, 148, 88, 8, ramp('phosphor', 2));

    // Filing cabinet.
    rect(c, 16, 52, 34, 60, ramp('neutral', 2));
    for (let i = 0; i < 3; i++) {
      outline(c, 18, 56 + i * 18, 30, 16, ramp('neutral', 1));
      rect(c, 30, 62 + i * 18, 6, 2, ramp('neutral', 3));
    }

    // Safe, low and heavy.
    rect(c, 250, 82, 40, 34, ramp('neutral', 1));
    outline(c, 250, 82, 40, 34, ramp('neutral', 3));
    c.fillStyle = ramp('amber', 2);
    c.beginPath();
    c.arc(270, 99, 6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ramp('neutral', 0);
    c.beginPath();
    c.arc(270, 99, 3, 0, Math.PI * 2);
    c.fill();

    // The framed photograph: Arthur and a man whose face is scratched out.
    rect(c, 206, 30, 40, 30, ramp('amber', 1));
    rect(c, 209, 33, 34, 24, ramp('neutral', 3));
    silhouette(c, 219, 55, 18, ramp('neutral', 1));
    silhouette(c, 232, 55, 18, ramp('neutral', 1));
    // The scratch.
    c.fillStyle = ramp('paper', 0);
    for (let i = 0; i < 9; i++) c.fillRect(228 + i, 38 + Math.floor(i * 0.4), 1, 1);
    font.draw(c, '1974', 226, 52, { color: ramp('neutral', 0), align: 'center' });

    // Key hook and the poster that hides it.
    rect(c, 62, 34, 26, 36, ramp('magenta', 1));
    font.draw(c, 'SPACE', 75, 44, { color: ramp('cyan', 3), align: 'center' });
    font.draw(c, 'WARS', 75, 52, { color: ramp('cyan', 3), align: 'center' });

    // Television in the corner, off.
    rect(c, 288, 40, 28, 26, ramp('neutral', 1));
    rect(c, 291, 43, 22, 17, Colors.ink);
    outline(c, 288, 40, 28, 26, ramp('neutral', 2));
  },

  arcade_basement(c) {
    gradientV(c, 0, 0, W, 100, [Colors.ink, ramp('neutral', 1)], 1.4);
    rect(c, 0, 100, W, GAME_HEIGHT - 100, ramp('neutral', 1));
    speckle(c, 0, 100, W, 44, Colors.ink, 0.12, 55);

    // A single bare bulb.
    vline(c, 160, 0, 16, ramp('neutral', 2));
    c.fillStyle = ramp('amber', 3);
    c.beginPath();
    c.arc(160, 19, 3, 0, Math.PI * 2);
    c.fill();
    lightPool(c, 160, 70, 90, 60, ramp('amber', 1), 0.4);

    // Pipes along the ceiling.
    rect(c, 0, 8, W, 3, ramp('neutral', 2));
    rect(c, 0, 14, W, 2, ramp('neutral', 1));
    for (let x = 20; x < W; x += 48) rect(c, x, 6, 4, 12, ramp('neutral', 1));

    // Stacked broken cabinets under dust sheets.
    for (let i = 0; i < 3; i++) {
      const x = 18 + i * 34;
      rect(c, x, 58, 28, 46, ramp('neutral', 1));
      rect(c, x - 2, 54, 32, 8, ramp('neutral', 3));
      ditherFill(c, x - 2, 54, 32, 8, ramp('neutral', 3), ramp('neutral', 2), 0.4);
    }

    // Fuse box on the wall, incorrectly labelled (Act V power puzzle).
    rect(c, 226, 44, 40, 30, ramp('neutral', 2));
    outline(c, 226, 44, 40, 30, ramp('neutral', 3));
    for (let i = 0; i < 4; i++) {
      rect(c, 231 + i * 9, 52, 5, 12, ramp('amber', 1));
      rect(c, 232 + i * 9, 54, 3, 4, ramp('neutral', 0));
    }

    // The hatch down to the machine room.
    rect(c, 132, 112, 56, 20, Colors.ink);
    outline(c, 132, 112, 56, 20, ramp('cyan', 1));
    ditherFill(c, 134, 114, 52, 16, Colors.ink, ramp('cyan', 0), 0.4);
  },

  arcade_machineroom(c) {
    // Everything here glows. The machine is the only light source.
    rect(c, 0, 0, W, GAME_HEIGHT, Colors.ink);
    lightPool(c, 160, 70, 150, 90, ramp('cyan', 0), 0.55);

    // MEMORY MASTER 3000: an arcade cabinet crossed with a telephone exchange.
    const bx = 96;
    rect(c, bx, 20, 128, 96, ramp('neutral', 1));
    outline(c, bx, 20, 128, 96, ramp('cyan', 1));

    // Reel-to-reel decks.
    for (const rx of [bx + 12, bx + 44]) {
      c.fillStyle = ramp('neutral', 2);
      c.beginPath();
      c.arc(rx + 10, 40, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = ramp('neutral', 0);
      c.beginPath();
      c.arc(rx + 10, 40, 3, 0, Math.PI * 2);
      c.fill();
    }

    // The screen.
    rect(c, bx + 76, 28, 40, 30, Colors.ink);
    staticScreen(c, bx + 77, 29, 38, 28, 91);
    outline(c, bx + 76, 28, 40, 30, ramp('cyan', 2));

    // Patch bay - the three connections the player must make.
    rect(c, bx + 8, 60, 112, 26, ramp('neutral', 0));
    const labels = ['POWER', 'SIGNAL', 'MEMORY'];
    labels.forEach((label, i) => {
      // Spaced so the words never touch - at 5px per glyph, MEMORY is 35px wide.
      const px = bx + 18 + i * 42;
      c.fillStyle = ramp('neutral', 2);
      c.beginPath();
      c.arc(px, 70, 4, 0, Math.PI * 2);
      c.fill();
      font.draw(c, label, px, 78, { color: ramp('cyan', 2), align: 'center' });
    });

    // Blinking relay bank.
    for (let i = 0; i < 12; i++) {
      rect(c, bx + 10 + i * 9, 90, 6, 4, i % 3 === 0 ? ramp('amber', 2) : ramp('neutral', 2));
    }

    font.draw(c, 'MEMORY MASTER 3000', 160, 108, { color: ramp('amber', 3), align: 'center' });

    // Cabling snaking across the floor.
    c.fillStyle = ramp('violet', 1);
    for (let x = 0; x < W; x++) {
      c.fillRect(x, 128 + Math.round(Math.sin(x * 0.09) * 3), 1, 2);
      c.fillRect(x, 136 + Math.round(Math.cos(x * 0.07) * 2), 1, 1);
    }
  },

  arcade_roof(c) {
    nightSky(c, 0, 0, W, 96, 61, { x: 40, y: 22, r: 8 });
    // Town lights on the horizon.
    const r = rng(71);
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * W);
      rect(c, x, 88 + Math.floor(r() * 6), 1, 1, ramp('amber', 2));
    }
    rect(c, 0, 96, W, GAME_HEIGHT - 96, ramp('neutral', 1));
    speckle(c, 0, 96, W, 48, ramp('neutral', 0), 0.14, 81);

    // Parapet.
    rect(c, 0, 90, W, 8, ramp('neutral', 2));
    for (let x = 0; x < W; x += 16) rect(c, x, 86, 10, 6, ramp('neutral', 2));

    // The television aerial - Act V signal puzzle.
    vline(c, 244, 26, 74, ramp('neutral', 3));
    for (let i = 0; i < 6; i++) hline(c, 236, 32 + i * 8, 17, ramp('neutral', 3));

    // Roof access hatch.
    rect(c, 60, 108, 40, 16, Colors.ink);
    outline(c, 60, 108, 40, 16, ramp('amber', 1));

    // The arcade's neon sign seen from behind, leaking light over the edge.
    lightPool(c, 160, 96, 80, 14, ramp('magenta', 1), 0.4);
  },

  // ------------------------------------------------------------- the town

  seafront(c) {
    // A parade of shopfronts across the back and the promenade in front. The
    // sea is behind the camera here - it gets its own frame at the pier.
    nightSky(c, 0, 0, W, 30, 101, { x: 288, y: 12, r: 5 });
    rect(c, 0, 82, W, GAME_HEIGHT - 82, ramp('neutral', 1));
    hline(c, 0, 82, W, ramp('neutral', 2));
    speckle(c, 0, 84, W, 60, ramp('neutral', 2), 0.04, 121);
    // Paving joints, widening downstage.
    for (let i = 0, y = 92; y < GAME_HEIGHT; i++, y += 6 + i) {
      hline(c, 0, y, W, ramp('neutral', 0));
    }

    // The parade itself.
    bricks(c, 0, 24, W, 58, ramp('neutral', 1), ramp('neutral', 0), Colors.ink, 117);
    rect(c, 0, 22, W, 4, ramp('neutral', 2));

    // Chip shop, stage left.
    rect(c, 4, 40, 62, 42, ramp('amber', 0));
    windowPane(c, 8, 50, 24, 26, ramp('amber', 2), ramp('neutral', 0));
    rect(c, 38, 50, 24, 32, ramp('amber', 1));
    neonText(c, 'CHIPS', 34, 30, ramp('amber', 3), ramp('amber', 1));
    lightPool(c, 34, 88, 34, 14, ramp('amber', 1), 0.4);

    // The alley mouth: a black gap between buildings.
    rect(c, 72, 34, 26, 48, Colors.ink);
    ditherFill(c, 74, 36, 22, 44, Colors.ink, ramp('neutral', 1), 0.25);

    // Lido gates.
    rect(c, 106, 38, 62, 44, ramp('cyan', 0));
    for (let x = 110; x < 166; x += 7) vline(c, x, 46, 36, ramp('cyan', 2));
    hline(c, 108, 46, 58, ramp('cyan', 2));
    rect(c, 106, 28, 62, 10, ramp('neutral', 0));
    font.draw(c, 'LIDO', 137, 30, { color: ramp('cyan', 3), align: 'center' });

    // A closed shop nobody has rented since 1979.
    rect(c, 176, 40, 56, 42, ramp('neutral', 0));
    for (let i = 0; i < 5; i++) rect(c, 178, 46 + i * 7, 52, 5, ramp('amber', 0));
    rect(c, 186, 28, 38, 9, ramp('neutral', 0));
    font.draw(c, 'TO LET', 205, 30, { color: ramp('neutral', 3), align: 'center' });

    // Starlight Arcade, stage right - warm light spilling onto the pavement.
    rect(c, 240, 34, 80, 48, ramp('violet', 0));
    rect(c, 248, 48, 64, 34, Colors.ink);
    rect(c, 250, 50, 60, 32, ramp('amber', 1));
    neonText(c, 'STARLIGHT', 280, 26, ramp('magenta', 3), ramp('magenta', 1));
    lightPool(c, 280, 90, 44, 16, ramp('amber', 2), 0.5);

    // Lamp posts.
    for (const lx of [70, 172, 234]) {
      vline(c, lx, 40, 44, ramp('neutral', 2));
      rect(c, lx - 3, 38, 7, 4, ramp('amber', 3));
      lightPool(c, lx, 100, 24, 16, ramp('amber', 1), 0.4);
    }

    // Railings along the seaward edge, downstage, in front of the player.
    hline(c, 0, 136, W, ramp('neutral', 2));
    hline(c, 0, 141, W, ramp('neutral', 2));
    for (let x = 4; x < W; x += 14) vline(c, x, 134, 10, ramp('neutral', 2));
  },

  pier(c) {
    nightSky(c, 0, 0, W, 66, 131);
    sea(c, 0, 60, W, 22, 141);
    boards(c, 0, 78, W, GAME_HEIGHT - 78, ramp('amber', 0), ramp('neutral', 0), 151);

    // Railings running down both sides in perspective.
    for (let i = 0; i < 14; i++) {
      const y = 80 + i * 4;
      const inset = 30 - i * 2;
      if (inset < 0) break;
      vline(c, inset, y, 5, ramp('neutral', 2));
      vline(c, W - inset, y, 5, ramp('neutral', 2));
    }
    hline(c, 0, 82, W, ramp('neutral', 2));

    // Festoon lighting strung overhead - the signature pier image.
    for (let x = 8; x < W; x += 20) {
      const sag = Math.round(Math.sin(x * 0.05) * 3);
      const col = [ramp('magenta', 2), ramp('cyan', 2), ramp('amber', 2), ramp('phosphor', 2)][
        (x / 20) % 4 | 0
      ];
      rect(c, x, 14 + sag, 2, 2, col);
      lightPool(c, x + 1, 15 + sag, 4, 4, col, 0.5);
    }
    c.fillStyle = ramp('neutral', 2);
    for (let x = 0; x < W; x++) c.fillRect(x, 13 + Math.round(Math.sin(x * 0.05) * 3), 1, 1);

    // The photographic booth at the end of the pier.
    rect(c, 234, 34, 40, 50, ramp('blue', 1));
    outline(c, 234, 34, 40, 50, ramp('blue', 2));
    rect(c, 238, 40, 32, 24, Colors.ink);
    rect(c, 240, 42, 28, 20, ramp('cyan', 0));
    font.draw(c, 'PHOTO', 254, 68, { color: ramp('paper', 0), align: 'center' });
    rect(c, 246, 76, 16, 8, Colors.ink); // the slot

    // Distant lighthouse, blinking.
    rect(c, 20, 40, 8, 24, ramp('neutral', 3));
    rect(c, 19, 36, 10, 5, ramp('amber', 3));
  },

  pier_cafe(c) {
    room(c, ramp('cyan', 0), ramp('neutral', 1), ramp('paper', 0), ramp('red', 0), 88);
    striplight(c, 116, 4, 88);

    // Counter with an urn and a glass case.
    rect(c, 20, 76, 110, 8, ramp('paper', 0));
    rect(c, 20, 84, 110, 26, ramp('cyan', 1));
    rect(c, 34, 60, 18, 18, ramp('neutral', 3)); // tea urn
    rect(c, 37, 57, 12, 4, ramp('neutral', 2));
    rect(c, 80, 62, 34, 16, ramp('neutral', 2));
    rect(c, 82, 64, 30, 12, ramp('amber', 1));

    // Formica tables.
    for (const tx of [180, 250]) {
      rect(c, tx, 86, 40, 4, ramp('paper', 0));
      rect(c, tx + 17, 90, 6, 22, ramp('neutral', 2));
      rect(c, tx + 8, 112, 24, 3, ramp('neutral', 2));
    }

    // Window onto the black sea.
    rect(c, 168, 24, 132, 40, Colors.ink);
    outline(c, 168, 24, 132, 40, ramp('neutral', 2));
    sea(c, 170, 46, 128, 16, 161);
    ditherFill(c, 170, 26, 128, 20, Colors.ink, ramp('violet', 0), 0.3);

    // Menu board.
    rect(c, 20, 20, 60, 34, ramp('neutral', 0));
    font.draw(c, 'TEA    20p', 26, 26, { color: ramp('amber', 3) });
    font.draw(c, 'COFFEE 25p', 26, 34, { color: ramp('amber', 3) });
    font.draw(c, 'ROLL   45p', 26, 42, { color: ramp('amber', 3) });
  },

  chip_shop(c) {
    room(c, ramp('amber', 0), ramp('neutral', 1), ramp('paper', 0), ramp('neutral', 1), 90);
    striplight(c, 90, 4, 140, ramp('paper', 0));

    // The fryers - big, stainless, the brightest thing in the room.
    rect(c, 40, 66, 150, 26, ramp('neutral', 3));
    rect(c, 40, 92, 150, 24, ramp('neutral', 2));
    for (let i = 0; i < 3; i++) {
      rect(c, 48 + i * 48, 70, 38, 18, ramp('neutral', 1));
      ditherFill(c, 50 + i * 48, 72, 34, 14, ramp('amber', 2), ramp('amber', 3), 0.5);
    }
    // Heat haze above the fryers.
    ditherFill(c, 40, 54, 150, 12, ramp('neutral', 1), ramp('amber', 1), 0.2);

    // Warming lamp.
    rect(c, 100, 40, 60, 3, ramp('red', 1));
    lightPool(c, 130, 60, 40, 20, ramp('red', 2), 0.35);

    // Price list.
    rect(c, 210, 24, 84, 46, ramp('neutral', 0));
    font.draw(c, 'COD      95p', 216, 30, { color: ramp('paper', 0) });
    font.draw(c, 'CHIPS    45p', 216, 38, { color: ramp('paper', 0) });
    font.draw(c, 'SAUSAGE  60p', 216, 46, { color: ramp('paper', 0) });
    font.draw(c, 'CURRY    30p', 216, 54, { color: ramp('paper', 0) });
    font.draw(c, 'BUTTER    5p', 216, 62, { color: ramp('amber', 3) });
  },

  video_shop(c) {
    room(c, ramp('violet', 0), ramp('neutral', 1), ramp('neutral', 1), ramp('violet', 0), 92);
    striplight(c, 40, 4, 100, ramp('paper', 0));
    striplight(c, 190, 4, 100, ramp('paper', 0));

    // Wall of VHS cases - the defining image of 1987 retail.
    for (let row = 0; row < 4; row++) {
      const y = 26 + row * 17;
      rect(c, 8, y + 13, 180, 3, ramp('neutral', 2));
      for (let i = 0; i < 22; i++) {
        const x = 10 + i * 8;
        const cols = [ramp('magenta', 1), ramp('cyan', 1), ramp('amber', 1), ramp('blue', 1), ramp('phosphor', 1)];
        rect(c, x, y, 7, 13, cols[(row * 7 + i) % cols.length]);
        vline(c, x, y, 13, ramp('neutral', 0));
      }
    }

    // Counter and till.
    rect(c, 208, 82, 100, 8, ramp('amber', 1));
    rect(c, 208, 90, 100, 26, ramp('amber', 0));
    rect(c, 240, 66, 26, 16, ramp('neutral', 2));
    rect(c, 243, 69, 20, 6, ramp('phosphor', 2));

    // Beaded curtain to the back section.
    rect(c, 286, 24, 34, 56, Colors.ink);
    for (let i = 0; i < 8; i++) {
      vline(c, 288 + i * 4, 24, 56, i % 2 ? ramp('amber', 1) : ramp('amber', 0));
    }
    font.draw(c, 'BACK', 303, 84, { color: ramp('red', 2), align: 'center' });
  },

  video_shop_back(c) {
    // Small, red-lit, deeply unglamorous. The joke is the decor, not the shelf.
    room(c, ramp('red', 0), Colors.ink, ramp('neutral', 0), ramp('red', 0), 96);
    lightPool(c, 160, 40, 90, 40, ramp('red', 1), 0.4);

    rect(c, 40, 40, 240, 4, ramp('neutral', 2));
    rect(c, 40, 74, 240, 4, ramp('neutral', 2));
    // Rows of identically dull cases, deliberately unreadable at this size.
    for (const y of [26, 60]) {
      for (let i = 0; i < 28; i++) {
        rect(c, 42 + i * 8, y, 7, 14, i % 3 ? ramp('neutral', 2) : ramp('red', 1));
        vline(c, 42 + i * 8, y, 14, ramp('neutral', 0));
      }
    }
    rect(c, 108, 84, 104, 12, ramp('neutral', 0));
    font.draw(c, 'OVER 18 ONLY', 160, 86, { color: ramp('red', 2), align: 'center' });
    // Door back through to the shop.
    rect(c, 4, 46, 22, 50, Colors.ink);
    outline(c, 4, 46, 22, 50, ramp('amber', 1));
  },

  graham_office(c) {
    room(c, ramp('amber', 0), ramp('neutral', 1), ramp('neutral', 1), ramp('amber', 0), 94);
    striplight(c, 130, 4, 60, ramp('paper', 0));

    // Desk buried in paperwork.
    rect(c, 60, 94, 110, 6, ramp('amber', 1));
    rect(c, 64, 100, 6, 28, ramp('amber', 0));
    rect(c, 160, 100, 6, 28, ramp('amber', 0));
    for (let i = 0; i < 5; i++) {
      rect(c, 70 + i * 18, 88 - (i % 2) * 2, 16, 6, ramp('paper', 0));
    }

    // The 1987 calendar. The gag is the frame; the puzzle is the numbers.
    rect(c, 208, 28, 56, 62, ramp('paper', 0));
    outline(c, 208, 28, 56, 62, ramp('neutral', 2));
    font.draw(c, '1987', 236, 31, { color: ramp('red', 1), align: 'center' });
    // The photograph area, kept as a flat silhouette against a sunset.
    gradientV(c, 211, 40, 50, 30, [ramp('amber', 2), ramp('magenta', 2), ramp('violet', 1)], 1);
    silhouette(c, 236, 70, 26, ramp('neutral', 0), 1);
    // The month strip - this is the actual clue.
    rect(c, 211, 72, 50, 15, ramp('paper', 0));
    font.draw(c, 'J F M A M J', 236, 74, { color: ramp('neutral', 1), align: 'center' });
    font.draw(c, '3 1 4 1 5 9', 236, 81, { color: ramp('neutral', 1), align: 'center' });

    // Filing cabinet and a dead pot plant.
    rect(c, 12, 56, 30, 56, ramp('neutral', 2));
    outline(c, 14, 60, 26, 22, ramp('neutral', 1));
    outline(c, 14, 84, 26, 22, ramp('neutral', 1));
    rect(c, 286, 92, 16, 20, ramp('red', 0));
    for (let i = 0; i < 5; i++) vline(c, 290 + i * 3, 78, 14, ramp('phosphor', 0));
  },

  tv_shop(c) {
    // A wall of televisions, all showing static. Lit entirely by them.
    rect(c, 0, 0, W, GAME_HEIGHT, ramp('neutral', 0));
    rect(c, 0, 100, W, GAME_HEIGHT - 100, ramp('neutral', 1));

    let seed = 200;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const x = 12 + col * 50;
        const y = 12 + row * 30;
        rect(c, x, y, 44, 26, ramp('neutral', 1));
        outline(c, x, y, 44, 26, ramp('neutral', 2));
        rect(c, x + 3, y + 3, 32, 20, Colors.ink);
        staticScreen(c, x + 4, y + 4, 30, 18, seed++);
        // Tuning dials down the right of each set.
        rect(c, x + 37, y + 5, 4, 4, ramp('neutral', 3));
        rect(c, x + 37, y + 12, 4, 4, ramp('neutral', 3));
        lightPool(c, x + 19, y + 13, 26, 16, ramp('cyan', 0), 0.25);
      }
    }

    // Workbench strewn with valves and a soldering iron.
    rect(c, 0, 104, W, 8, ramp('amber', 0));
    for (let i = 0; i < 14; i++) {
      rect(c, 10 + i * 22, 98, 4, 7, i % 3 ? ramp('neutral', 2) : ramp('amber', 2));
    }
    rect(c, 250, 98, 30, 4, ramp('red', 1));
  },

  bus_station(c) {
    nightSky(c, 0, 0, W, 50, 211);
    // Concrete canopy.
    rect(c, 0, 40, W, 12, ramp('neutral', 2));
    rect(c, 0, 52, W, 3, ramp('neutral', 1));
    for (const px of [30, 150, 270]) rect(c, px, 55, 8, 50, ramp('neutral', 2));

    rect(c, 0, 96, W, GAME_HEIGHT - 96, ramp('neutral', 1));
    hline(c, 0, 96, W, ramp('neutral', 2));
    speckle(c, 0, 98, W, 46, ramp('neutral', 0), 0.06, 221);
    // Bay markings.
    for (let x = 10; x < W; x += 40) rect(c, x, 120, 20, 2, ramp('amber', 1));

    striplight(c, 60, 44, 40, ramp('paper', 0));
    striplight(c, 200, 44, 40, ramp('paper', 0));

    // Timetable board and a shelter bench.
    rect(c, 190, 58, 70, 40, ramp('neutral', 0));
    outline(c, 190, 58, 70, 40, ramp('neutral', 3));
    for (let i = 0; i < 6; i++) {
      hline(c, 194, 64 + i * 6, 62, i === 3 ? ramp('amber', 2) : ramp('neutral', 2));
    }
    rect(c, 50, 86, 60, 4, ramp('amber', 0));
    rect(c, 54, 90, 4, 14, ramp('neutral', 2));
    rect(c, 102, 90, 4, 14, ramp('neutral', 2));
  },

  phone_box(c) {
    // Interior of a red K6 box: cramped, warm, glass on three sides.
    rect(c, 0, 0, W, GAME_HEIGHT, ramp('red', 0));
    // Glass panes looking out at the night.
    for (let col = 0; col < 3; col++) {
      const x = 30 + col * 88;
      rect(c, x, 14, 76, 86, ramp('neutral', 1));
      ditherFill(c, x, 14, 76, 86, ramp('neutral', 1), ramp('violet', 0), 0.35);
      outline(c, x, 14, 76, 86, ramp('red', 1));
      for (let i = 1; i < 5; i++) hline(c, x, 14 + i * 17, 76, ramp('red', 1));
    }
    rect(c, 0, 100, W, GAME_HEIGHT - 100, ramp('red', 0));
    ditherFill(c, 0, 100, W, 44, ramp('red', 0), Colors.ink, 0.4);

    // The telephone itself, mounted centre.
    rect(c, 128, 40, 64, 54, ramp('neutral', 1));
    outline(c, 128, 40, 64, 54, ramp('neutral', 2));
    rect(c, 134, 44, 52, 12, ramp('neutral', 2)); // handset cradle
    rect(c, 138, 60, 44, 28, ramp('neutral', 0));
    // Dial.
    c.fillStyle = ramp('neutral', 3);
    c.beginPath();
    c.arc(160, 74, 11, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ramp('neutral', 0);
    c.beginPath();
    c.arc(160, 74, 4, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - 1.9;
      c.fillStyle = ramp('paper', 0);
      c.fillRect(Math.round(160 + Math.cos(a) * 8), Math.round(74 + Math.sin(a) * 8), 1, 1);
    }
    // Coin slot and the little instruction card.
    rect(c, 196, 44, 20, 30, ramp('neutral', 2));
    hline(c, 200, 50, 12, Colors.ink);
    rect(c, 100, 44, 22, 16, ramp('paper', 0));
  },

  amusement_park(c) {
    nightSky(c, 0, 0, W, 70, 231);
    rect(c, 0, 92, W, GAME_HEIGHT - 92, ramp('neutral', 1));
    speckle(c, 0, 94, W, 50, ramp('neutral', 2), 0.05, 241);

    // Big wheel, stage left, picked out in bulbs.
    const cx = 66;
    const cy = 56;
    // Rim drawn as pixels rather than ctx.stroke - stroke would use the default
    // black, which is not in the palette and would fail asset validation.
    c.fillStyle = ramp('neutral', 2);
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      c.fillRect(Math.round(cx + Math.cos(rad) * 42), Math.round(cy + Math.sin(rad) * 42), 1, 1);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const px = Math.round(cx + Math.cos(a) * 42);
      const py = Math.round(cy + Math.sin(a) * 42);
      const col = i % 2 ? ramp('magenta', 2) : ramp('amber', 2);
      rect(c, px - 1, py - 1, 3, 3, col);
      // Spokes.
      c.fillStyle = ramp('neutral', 2);
      for (let t = 0.2; t < 1; t += 0.12) {
        c.fillRect(Math.round(cx + Math.cos(a) * 42 * t), Math.round(cy + Math.sin(a) * 42 * t), 1, 1);
      }
    }
    vline(c, cx, cy, 40, ramp('neutral', 2));

    // Kiosk - Brenda's domain.
    rect(c, 180, 52, 92, 44, ramp('amber', 0));
    rect(c, 176, 46, 100, 8, ramp('red', 1));
    rect(c, 186, 62, 80, 22, Colors.ink);
    rect(c, 188, 64, 76, 18, ramp('amber', 1));
    neonText(c, 'KIOSK', 226, 48, ramp('paper', 0), ramp('red', 2));
    // Bunting.
    for (let x = 176; x < 276; x += 10) {
      c.fillStyle = ((x / 10) | 0) % 2 ? ramp('cyan', 2) : ramp('magenta', 2);
      c.fillRect(x, 44, 4, 3);
    }
    lightPool(c, 226, 96, 50, 14, ramp('amber', 1), 0.35);

    // Haunted house entrance, stage right, deliberately unwelcoming.
    rect(c, 288, 40, 32, 56, ramp('violet', 0));
    rect(c, 294, 60, 20, 36, Colors.ink);
    font.draw(c, 'HAUNTED', 304, 44, { color: ramp('phosphor', 2), align: 'center' });
  },

  haunted_house(c) {
    rect(c, 0, 0, W, GAME_HEIGHT, Colors.ink);
    // A dark corridor with a few badly-maintained scares.
    ditherFill(c, 0, 0, W, GAME_HEIGHT, Colors.ink, ramp('violet', 0), 0.25);
    boards(c, 0, 104, W, 40, ramp('neutral', 0), Colors.ink, 251);

    // Perspective walls converging on a far door.
    for (let i = 0; i < 10; i++) {
      const inset = i * 14;
      const y = 20 + i * 5;
      vline(c, inset, y, 104 - y + 20, ramp('violet', 0));
      vline(c, W - inset, y, 104 - y + 20, ramp('violet', 0));
    }
    rect(c, 140, 62, 40, 44, ramp('neutral', 0));
    ditherFill(c, 142, 64, 36, 40, ramp('neutral', 0), ramp('phosphor', 0), 0.4);

    // A skeleton on a rail, and a plastic ghost that has seen better decades.
    silhouette(c, 70, 104, 40, ramp('neutral', 2));
    c.fillStyle = ramp('paper', 0);
    c.beginPath();
    c.arc(240, 56, 10, 0, Math.PI * 2);
    c.fill();
    rect(c, 232, 56, 17, 22, ramp('paper', 0));
    c.fillStyle = Colors.ink;
    c.fillRect(236, 53, 2, 2);
    c.fillRect(243, 53, 2, 2);
    lightPool(c, 240, 62, 22, 22, ramp('phosphor', 1), 0.3);
  },

  cinema_exterior(c) {
    nightSky(c, 0, 0, W, 46, 261);
    rect(c, 0, 100, W, GAME_HEIGHT - 100, ramp('neutral', 1));
    bricks(c, 0, 20, W, 82, ramp('neutral', 1), ramp('neutral', 0), Colors.ink, 271);

    // Dead marquee - most of the bulbs have gone.
    rect(c, 44, 30, 232, 30, ramp('neutral', 0));
    outline(c, 44, 30, 232, 30, ramp('amber', 0));
    const r = rng(281);
    for (let x = 48; x < 272; x += 8) {
      const alive = r() > 0.72;
      rect(c, x, 33, 3, 3, alive ? ramp('amber', 3) : ramp('neutral', 1));
      if (alive) lightPool(c, x + 1, 34, 4, 4, ramp('amber', 2), 0.5);
    }
    font.draw(c, 'THE REGAL', 160, 42, { color: ramp('amber', 2), align: 'center' });
    font.draw(c, 'CLOSED', 160, 51, { color: ramp('neutral', 3), align: 'center' });

    // Boarded doors and a torn poster case.
    rect(c, 130, 66, 60, 36, Colors.ink);
    for (let i = 0; i < 5; i++) {
      rect(c, 128, 70 + i * 7, 64, 4, ramp('amber', 0));
    }
    rect(c, 214, 62, 30, 40, ramp('neutral', 0));
    outline(c, 214, 62, 30, 40, ramp('neutral', 2));
    ditherFill(c, 216, 64, 26, 36, ramp('neutral', 0), ramp('magenta', 0), 0.35);
  },

  cinema_lobby(c) {
    room(c, ramp('red', 0), Colors.ink, ramp('red', 0), ramp('neutral', 0), 92);
    // A single working bulb; everything else is dust and shadow.
    lightPool(c, 160, 40, 80, 44, ramp('amber', 1), 0.35);
    speckle(c, 0, 0, W, GAME_HEIGHT, ramp('neutral', 1), 0.02, 291);

    // Ticket booth.
    rect(c, 116, 46, 76, 46, ramp('amber', 0));
    rect(c, 122, 52, 64, 26, Colors.ink);
    ditherFill(c, 124, 54, 60, 22, Colors.ink, ramp('neutral', 1), 0.3);
    rect(c, 140, 80, 28, 6, ramp('neutral', 2));

    // Rope barriers, one collapsed.
    for (const bx of [40, 80]) {
      rect(c, bx, 78, 4, 22, ramp('amber', 1));
      rect(c, bx - 2, 74, 8, 4, ramp('amber', 2));
    }
    hline(c, 44, 80, 36, ramp('red', 1));
    rect(c, 250, 96, 22, 4, ramp('amber', 1)); // fallen post

    // Carpet, patterned and filthy.
    for (let x = 0; x < W; x += 16) {
      for (let y = 92; y < GAME_HEIGHT; y += 12) {
        rect(c, x + 4, y + 4, 8, 4, ramp('red', 1));
      }
    }
    // Stairs up to the projection room.
    rect(c, 268, 44, 52, 48, ramp('neutral', 0));
    for (let i = 0; i < 6; i++) rect(c, 268, 82 - i * 6, 52 - i * 4, 3, ramp('neutral', 2));
  },

  cinema_projection(c) {
    rect(c, 0, 0, W, GAME_HEIGHT, ramp('neutral', 0));
    ditherFill(c, 0, 0, W, 100, ramp('neutral', 0), Colors.ink, 0.4);
    boards(c, 0, 100, W, 44, ramp('amber', 0), Colors.ink, 301);

    // The projector, dominating stage left, beam cutting across the room.
    rect(c, 24, 56, 74, 34, ramp('neutral', 2));
    outline(c, 24, 56, 74, 34, ramp('neutral', 3));
    for (const rx of [38, 76]) {
      c.fillStyle = ramp('neutral', 1);
      c.beginPath();
      c.arc(rx, 44, 13, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = ramp('neutral', 3);
      c.beginPath();
      c.arc(rx, 44, 4, 0, Math.PI * 2);
      c.fill();
    }
    rect(c, 98, 66, 12, 12, ramp('neutral', 3)); // lens
    // Dusty beam.
    for (let x = 110; x < 300; x++) {
      const spread = (x - 110) * 0.11;
      ditherFill(c, x, Math.round(72 - spread), 1, Math.round(spread * 2) + 2, ramp('neutral', 0), ramp('amber', 2), 0.22);
    }

    // Projection window onto the auditorium.
    rect(c, 286, 54, 34, 26, Colors.ink);
    outline(c, 286, 54, 34, 26, ramp('neutral', 2));

    // Film cans stacked on the floor.
    for (let i = 0; i < 4; i++) {
      const x = 140 + i * 22;
      c.fillStyle = ramp('neutral', 2);
      c.beginPath();
      c.ellipse(x, 118 - i, 10, 4, 0, 0, Math.PI * 2);
      c.fill();
    }

    // The poster on the back wall, hiding the loose brick (s.53).
    rect(c, 194, 20, 44, 56, ramp('neutral', 1));
    gradientV(c, 196, 22, 40, 40, [ramp('amber', 2), ramp('magenta', 2), ramp('violet', 1)], 1);
    silhouette(c, 216, 60, 34, ramp('neutral', 0), 2);
    rect(c, 196, 64, 40, 10, ramp('neutral', 0));
    font.draw(c, 'SUMMER 84', 216, 66, { color: ramp('amber', 3), align: 'center' });
  },

  clock_tower_ext(c) {
    nightSky(c, 0, 0, W, 110, 311, { x: 46, y: 24, r: 5 });
    rect(c, 0, 110, W, GAME_HEIGHT - 110, ramp('neutral', 1));

    // The tower, tall and narrow, filling the centre.
    bricks(c, 120, 6, 80, 106, ramp('neutral', 1), ramp('neutral', 2), Colors.ink, 321);
    rect(c, 116, 4, 88, 6, ramp('neutral', 2));

    // The clock face, permanently at 11:17.
    c.fillStyle = ramp('paper', 0);
    c.beginPath();
    c.arc(160, 44, 24, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ramp('neutral', 1);
    c.beginPath();
    c.arc(160, 44, 21, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ramp('neutral', 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.fillRect(Math.round(160 + Math.cos(a) * 17), Math.round(44 + Math.sin(a) * 17), 2, 2);
    }
    // Hands: 11:17.
    drawHand(c, 160, 44, -Math.PI / 2 + (11 / 12) * Math.PI * 2 + (17 / 60) * (Math.PI / 6), 10, ramp('neutral', 0));
    drawHand(c, 160, 44, -Math.PI / 2 + (17 / 60) * Math.PI * 2, 16, ramp('neutral', 0));
    lightPool(c, 160, 44, 32, 32, ramp('amber', 0), 0.2);

    // Maintenance panel at the base - where the brass key fits.
    rect(c, 146, 92, 28, 20, ramp('neutral', 2));
    outline(c, 146, 92, 28, 20, ramp('neutral', 3));
    rect(c, 168, 100, 3, 4, ramp('amber', 2));

    // Bare trees either side.
    for (const tx of [40, 280]) {
      rect(c, tx, 74, 4, 38, ramp('neutral', 0));
      for (let i = 0; i < 5; i++) {
        const a = -0.9 - i * 0.3;
        c.fillStyle = ramp('neutral', 0);
        for (let t = 0; t < 12; t++) {
          c.fillRect(Math.round(tx + 2 + Math.cos(a) * t), Math.round(76 + Math.sin(a) * t), 1, 1);
        }
      }
    }
  },

  clock_tower_int(c) {
    rect(c, 0, 0, W, GAME_HEIGHT, ramp('neutral', 0));
    ditherFill(c, 0, 0, W, GAME_HEIGHT, ramp('neutral', 0), Colors.ink, 0.35);
    boards(c, 0, 108, W, 36, ramp('amber', 0), Colors.ink, 331);

    // The back of the clock face, glowing from the street lights outside.
    c.fillStyle = ramp('amber', 1);
    c.beginPath();
    c.arc(160, 52, 40, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ramp('amber', 0);
    c.beginPath();
    c.arc(160, 52, 36, 0, Math.PI * 2);
    c.fill();
    ditherFill(c, 120, 12, 80, 80, ramp('amber', 0), ramp('amber', 2), 0.3);
    // Silhouetted hands, still at 11:17.
    drawHand(c, 160, 52, -Math.PI / 2 + (11 / 12) * Math.PI * 2 + (17 / 60) * (Math.PI / 6), 18, Colors.ink, 3);
    drawHand(c, 160, 52, -Math.PI / 2 + (17 / 60) * Math.PI * 2, 30, Colors.ink, 2);

    // The mechanism: cogs, stopped.
    for (const [gx, gy, gr] of [[70, 74, 20], [104, 92, 13], [240, 80, 17]] as const) {
      c.fillStyle = ramp('neutral', 2);
      c.beginPath();
      c.arc(gx, gy, gr, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = ramp('neutral', 1);
      c.beginPath();
      c.arc(gx, gy, gr - 4, 0, Math.PI * 2);
      c.fill();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        c.fillStyle = ramp('neutral', 3);
        c.fillRect(Math.round(gx + Math.cos(a) * gr), Math.round(gy + Math.sin(a) * gr), 2, 2);
      }
    }
    // Ladder up.
    for (let i = 0; i < 9; i++) hline(c, 288, 20 + i * 11, 20, ramp('neutral', 2));
    vline(c, 288, 20, 100, ramp('neutral', 2));
    vline(c, 307, 20, 100, ramp('neutral', 2));
  },

  lighthouse_ext(c) {
    nightSky(c, 0, 0, W, 96, 341);
    sea(c, 0, 88, W, 22, 351);
    rect(c, 0, 106, W, GAME_HEIGHT - 106, ramp('neutral', 1));
    speckle(c, 0, 108, W, 36, ramp('neutral', 0), 0.16, 361);

    // The tower, tapering, with its banded paint.
    for (let y = 14; y < 108; y++) {
      const t = (y - 14) / 94;
      const halfW = 9 + t * 9;
      const band = Math.floor((y - 14) / 14) % 2 === 0;
      rect(c, 226 - halfW, y, halfW * 2, 1, band ? ramp('paper', 0) : ramp('red', 1));
    }
    // Lamp room.
    rect(c, 214, 4, 24, 12, ramp('neutral', 2));
    rect(c, 217, 6, 18, 8, ramp('amber', 3));
    // The beam, sweeping out to sea.
    for (let x = 0; x < 214; x++) {
      const spread = (214 - x) * 0.09;
      ditherFill(c, x, Math.round(10 - spread * 0.3), 1, Math.round(spread) + 2, Colors.ink, ramp('amber', 2), 0.16);
    }
    lightPool(c, 226, 10, 30, 20, ramp('amber', 3), 0.5);

    // Rocks at the base.
    const r = rng(371);
    for (let i = 0; i < 16; i++) {
      const rx = Math.floor(r() * W);
      const ry = 104 + Math.floor(r() * 20);
      c.fillStyle = r() > 0.5 ? ramp('neutral', 1) : ramp('neutral', 0);
      c.beginPath();
      c.ellipse(rx, ry, 4 + r() * 7, 3 + r() * 4, 0, 0, Math.PI * 2);
      c.fill();
    }
  },

  lighthouse_int(c) {
    rect(c, 0, 0, W, GAME_HEIGHT, ramp('neutral', 0));
    // Curved wall, lit from the lamp above.
    gradientV(c, 0, 0, W, GAME_HEIGHT, [ramp('amber', 0), ramp('neutral', 0), Colors.ink], 0.9);
    lightPool(c, 160, 10, 70, 40, ramp('amber', 2), 0.4);

    // Spiral stair hugging the wall.
    for (let i = 0; i < 12; i++) {
      const y = 20 + i * 9;
      const w = 60 + Math.round(Math.sin(i * 0.6) * 26);
      rect(c, 160 - w / 2, y, w, 3, ramp('neutral', 2));
      rect(c, 160 - w / 2, y + 3, 3, 6, ramp('neutral', 1));
    }
    // Central column.
    rect(c, 152, 0, 16, GAME_HEIGHT, ramp('neutral', 1));
    vline(c, 152, 0, GAME_HEIGHT, ramp('neutral', 2));

    // A porthole onto the black sea.
    c.fillStyle = ramp('neutral', 2);
    c.beginPath();
    c.arc(56, 60, 17, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = Colors.ink;
    c.beginPath();
    c.arc(56, 60, 13, 0, Math.PI * 2);
    c.fill();
    ditherFill(c, 46, 56, 20, 12, Colors.ink, ramp('blue', 1), 0.3);
    boards(c, 0, 116, W, 28, ramp('neutral', 1), Colors.ink, 381);
  },

  town_hall(c) {
    nightSky(c, 0, 0, W, 40, 391);
    rect(c, 0, 104, W, GAME_HEIGHT - 104, ramp('neutral', 1));
    // Municipal, symmetrical, entirely unloved.
    rect(c, 20, 18, 280, 88, ramp('neutral', 2));
    rect(c, 16, 14, 288, 6, ramp('neutral', 3));
    // Portico columns.
    for (let i = 0; i < 6; i++) {
      const x = 44 + i * 46;
      rect(c, x, 30, 12, 74, ramp('paper', 0));
      rect(c, x - 2, 28, 16, 4, ramp('neutral', 3));
      rect(c, x - 2, 102, 16, 4, ramp('neutral', 3));
      vline(c, x + 3, 32, 70, ramp('neutral', 3));
      vline(c, x + 8, 32, 70, ramp('neutral', 3));
    }
    // Doors and steps.
    rect(c, 138, 62, 44, 44, ramp('amber', 0));
    outline(c, 138, 62, 44, 44, ramp('amber', 1));
    vline(c, 160, 62, 44, ramp('amber', 1));
    for (let i = 0; i < 4; i++) rect(c, 128 - i * 4, 106 + i * 3, 64 + i * 8, 3, ramp('neutral', 2));
    // Notice board with the demolition order.
    rect(c, 250, 54, 40, 30, ramp('neutral', 0));
    outline(c, 250, 54, 40, 30, ramp('amber', 1));
    for (let i = 0; i < 4; i++) hline(c, 254, 60 + i * 6, 32, ramp('neutral', 3));
    lightPool(c, 160, 104, 60, 16, ramp('amber', 1), 0.3);
  },

  police_station(c) {
    room(c, ramp('blue', 0), ramp('neutral', 1), ramp('neutral', 1), ramp('blue', 0), 90);
    striplight(c, 110, 4, 100, ramp('paper', 0));
    // Front desk, unattended, with a bell.
    rect(c, 60, 84, 140, 8, ramp('amber', 1));
    rect(c, 60, 92, 140, 28, ramp('amber', 0));
    c.fillStyle = ramp('neutral', 3);
    c.beginPath();
    c.arc(176, 80, 5, Math.PI, 0);
    c.fill();
    rect(c, 171, 80, 10, 2, ramp('neutral', 2));
    // Missing-person posters - one of them matters.
    for (let i = 0; i < 3; i++) {
      const x = 226 + (i % 2) * 44;
      const y = 26 + Math.floor(i / 2) * 40;
      rect(c, x, y, 38, 34, ramp('paper', 0));
      rect(c, x + 12, y + 4, 14, 14, ramp('neutral', 3));
      silhouette(c, x + 19, y + 18, 12, ramp('neutral', 1));
      hline(c, x + 4, y + 22, 30, ramp('neutral', 2));
      hline(c, x + 4, y + 26, 30, ramp('neutral', 2));
      font.draw(c, 'MISSING', x + 19, y + 29, { color: ramp('red', 1), align: 'center' });
    }
    // Blue lamp glow through the door.
    rect(c, 8, 40, 34, 50, Colors.ink);
    ditherFill(c, 10, 42, 30, 46, Colors.ink, ramp('blue', 2), 0.3);
  },

  back_alley(c) {
    rect(c, 0, 0, W, GAME_HEIGHT, Colors.ink);
    // Two walls converging, one weak light above a fire door.
    bricks(c, 0, 0, 90, 130, ramp('neutral', 1), ramp('neutral', 0), Colors.ink, 401);
    bricks(c, 230, 0, 90, 130, ramp('neutral', 1), ramp('neutral', 0), Colors.ink, 411);
    gradientV(c, 90, 20, 140, 90, [ramp('neutral', 1), Colors.ink], 1.2);
    rect(c, 0, 118, W, GAME_HEIGHT - 118, ramp('neutral', 0));
    speckle(c, 0, 118, W, 26, ramp('neutral', 1), 0.1, 421);

    // Fire door and its light.
    rect(c, 40, 62, 30, 58, ramp('phosphor', 0));
    outline(c, 40, 62, 30, 58, ramp('phosphor', 1));
    rect(c, 48, 54, 14, 5, ramp('amber', 3));
    lightPool(c, 55, 74, 26, 30, ramp('amber', 1), 0.35);

    // Bins, crates, a puddle reflecting the light.
    rect(c, 250, 88, 26, 32, ramp('phosphor', 0));
    rect(c, 248, 84, 30, 5, ramp('neutral', 2));
    rect(c, 282, 96, 22, 24, ramp('amber', 0));
    for (let i = 0; i < 3; i++) hline(c, 282, 100 + i * 7, 22, ramp('amber', 1));
    ditherFill(c, 96, 126, 48, 10, ramp('neutral', 0), ramp('cyan', 1), 0.3);

    // Downpipe.
    vline(c, 214, 0, 120, ramp('neutral', 2));
    vline(c, 215, 0, 120, ramp('neutral', 1));
  },

  // ------------------------------------------------- the seaside hotel (s.46)

  hotel_reception(c) {
    room(c, ramp('amber', 0), ramp('neutral', 1), ramp('red', 0), ramp('amber', 0), 92);
    striplight(c, 120, 4, 80, ramp('amber', 3));

    // Reception desk with pigeonholes behind - Room 12's key hangs there.
    rect(c, 90, 86, 140, 8, ramp('amber', 1));
    rect(c, 90, 94, 140, 30, ramp('amber', 0));
    rect(c, 96, 30, 128, 52, ramp('amber', 0));
    outline(c, 96, 30, 128, 52, ramp('amber', 1));
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        const x = 100 + col * 15;
        const y = 34 + row * 16;
        rect(c, x, y, 13, 14, ramp('neutral', 0));
        // A few keys still on their hooks.
        if ((row * 8 + col) % 5 === 2) rect(c, x + 5, y + 4, 3, 7, ramp('amber', 2));
      }
    }
    // Desk bell and register.
    c.fillStyle = ramp('neutral', 3);
    c.beginPath();
    c.arc(112, 82, 5, Math.PI, 0);
    c.fill();
    rect(c, 180, 80, 26, 6, ramp('paper', 0));

    // Potted palm, aspidistra, general seaside-boarding-house energy.
    rect(c, 20, 96, 18, 26, ramp('red', 0));
    for (let i = 0; i < 7; i++) {
      const a = -2.6 + i * 0.36;
      c.fillStyle = ramp('phosphor', 1);
      for (let t = 0; t < 16; t++) {
        c.fillRect(Math.round(29 + Math.cos(a) * t), Math.round(94 + Math.sin(a) * t * 0.8), 1, 1);
      }
    }
    neonText(c, 'GOLDEN SANDS', 160, 14, ramp('amber', 3), ramp('amber', 1));
    // Stairs up.
    rect(c, 268, 40, 52, 84, ramp('neutral', 0));
    for (let i = 0; i < 8; i++) rect(c, 268, 114 - i * 9, 52 - i * 3, 4, ramp('red', 0));
  },

  hotel_corridor(c) {
    // Long, narrow, patterned carpet, too many doors.
    gradientV(c, 0, 0, W, 108, [ramp('amber', 0), ramp('neutral', 1)], 1);
    rect(c, 0, 104, W, GAME_HEIGHT - 104, ramp('red', 0));
    for (let x = 0; x < W; x += 14) {
      for (let y = 106; y < GAME_HEIGHT; y += 10) rect(c, x + 3, y + 3, 7, 3, ramp('red', 1));
    }
    // Doors receding.
    const doors: [number, number, number, string][] = [
      [10, 40, 30, '10'],
      [70, 36, 34, '11'],
      [150, 32, 38, '12'],
      [244, 36, 34, '14'],
    ];
    for (const [x, y, h, num] of doors) {
      rect(c, x, y, 30, h + 28, ramp('amber', 1));
      outline(c, x, y, 30, h + 28, ramp('amber', 0));
      rect(c, x + 24, y + h * 0.6, 3, 3, ramp('neutral', 3));
      rect(c, x + 9, y + 6, 12, 9, ramp('neutral', 0));
      font.draw(c, num, x + 15, y + 8, { color: ramp('amber', 3), align: 'center' });
    }
    // Wall lights.
    for (const lx of [50, 130, 220, 300]) {
      rect(c, lx - 3, 24, 7, 5, ramp('amber', 3));
      lightPool(c, lx, 44, 16, 22, ramp('amber', 1), 0.3);
    }
  },

  hotel_room12(c) {
    room(c, ramp('cyan', 0), ramp('neutral', 1), ramp('amber', 0), ramp('red', 0), 96);
    // Bed, made, undisturbed.
    rect(c, 30, 84, 90, 8, ramp('amber', 1));
    rect(c, 30, 92, 90, 26, ramp('neutral', 2));
    rect(c, 30, 76, 12, 20, ramp('amber', 0));
    rect(c, 36, 80, 30, 10, ramp('paper', 0)); // pillow
    // Window onto the black sea.
    rect(c, 150, 26, 74, 46, Colors.ink);
    outline(c, 150, 26, 74, 46, ramp('neutral', 2));
    sea(c, 152, 52, 70, 18, 431);
    ditherFill(c, 152, 28, 70, 24, Colors.ink, ramp('violet', 0), 0.3);
    vline(c, 187, 26, 46, ramp('neutral', 2));
    // Dressing table.
    rect(c, 244, 82, 56, 6, ramp('amber', 1));
    rect(c, 248, 88, 6, 26, ramp('amber', 0));
    rect(c, 290, 88, 6, 26, ramp('amber', 0));
    rect(c, 258, 54, 30, 28, ramp('neutral', 3));
    ditherFill(c, 260, 56, 26, 24, ramp('neutral', 3), ramp('neutral', 2), 0.3);

    // The bathroom door: frosted glass, light behind it, shower running.
    rect(c, 96, 30, 44, 66, ramp('neutral', 1));
    outline(c, 96, 30, 44, 66, ramp('neutral', 2));
    // Frosted panel - deliberately unreadable, which is the entire gag (s.56).
    ditherFill(c, 100, 34, 36, 46, ramp('cyan', 1), ramp('paper', 0), 0.45);
    for (let y = 34; y < 80; y += 3) hline(c, 100, y, 36, ramp('cyan', 2));
    lightPool(c, 118, 88, 22, 14, ramp('cyan', 1), 0.3);
    rect(c, 132, 62, 3, 6, ramp('neutral', 3));
  },

  pool_cabins(c) {
    rampGradient(c, 0, 0, W, 30, 'violet', 0.06, 0.34, 1.3);

    // Tiled surround, drawn in perspective so the floor recedes.
    rampGradient(c, 0, 28, W, GAME_HEIGHT - 28, 'neutral', 0.86, 0.6, 0.9);
    c.strokeStyle = shade('teal', 0.42);
    c.lineWidth = 1;
    for (let i = 0; i <= 12; i++) {
      c.beginPath();
      c.moveTo(160 + (i - 6) * 14, 100);
      c.lineTo(160 + (i - 6) * 44, GAME_HEIGHT);
      c.stroke();
    }
    for (let y = 102, gap = 5; y < GAME_HEIGHT; gap += 2.4, y += gap) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }

    // The pool: a curved basin, not a rectangle, with a lit lip.
    celShape(c, (ctx) => {
      ctx.beginPath();
      ctx.ellipse(52, 78, 66, 26, -0.06, 0, Math.PI * 2);
    }, 'teal', { base: 0.44, shadow: 0.2, light: [-3, -3], outlineWidth: 2 });
    c.save();
    c.beginPath();
    c.ellipse(52, 78, 62, 22, -0.06, 0, Math.PI * 2);
    c.clip();
    for (let i = 0; i < 22; i++) {
      const r = rng(451 + i);
      c.fillStyle = shade('teal', 0.72 + r() * 0.2);
      c.fillRect(-10 + r() * 130, 58 + r() * 40, 5 + r() * 8, 1);
    }
    c.restore();

    // Four changing cabins, each leaning slightly, with striped curtain wedges.
    for (let i = 0; i < 4; i++) {
      const x = 138 + i * 44;
      const lean = (i - 1.5) * 2;
      groundShadow(c, x + 20, 104, 22, 5);
      // Body.
      celQuad(c, [
        [x + lean, 34], [x + 40 + lean, 34], [x + 40, 102], [x, 102],
      ], 'neutral', { base: 0.68, shadow: 0.24, light: [-3, -2] });
      // Scalloped valance.
      for (let k = 0; k < 5; k++) {
        celEllipse(c, x + 5 + k * 8 + lean, 34, 5, 4, 'red',
          { base: 0.72, shadow: 0.18, outlineWidth: 1 });
      }
      // Curtain: alternating vertical panels, one hanging open.
      const open = i === 1 ? 10 : 0;
      for (let sIdx = 0; sIdx < 5; sIdx++) {
        const sx = x + 3 + sIdx * 7 + open;
        if (sx > x + 37) break;
        celQuad(c, [
          [sx + lean * 0.6, 42], [sx + 7 + lean * 0.6, 42],
          [sx + 7 + Math.sin(sIdx) * 1.5, 100], [sx + Math.sin(sIdx) * 1.5, 100],
        ], sIdx % 2 ? 'teal' : 'neutral', {
          base: sIdx % 2 ? 0.72 : 0.94, shadow: 0.16, outlineWidth: 1, outline: null,
        });
      }
      c.strokeStyle = Colors.ink;
      c.lineWidth = 1;
      c.strokeRect(x + 2, 42, 38, 58);
      font.draw(c, String(i + 1), x + 20 + lean, 26, { color: shade('gold', 0.9), align: 'center' });
    }

    // Stacked deckchairs and the sign nobody obeys.
    celQuad(c, [[16, 112], [58, 108], [58, 116], [16, 120]], 'wood', { base: 0.5 });
    celQuad(c, [[20, 118], [26, 118], [26, 136], [20, 136]], 'wood', { base: 0.4, outlineWidth: 1 });
    celQuad(c, [[48, 116], [54, 116], [54, 134], [48, 134]], 'wood', { base: 0.4, outlineWidth: 1 });
    celQuad(c, [[262, 104], [312, 100], [312, 120], [262, 124]], 'neutral', { base: 0.94, shadow: 0.2 });
    font.draw(c, 'NO PETTING', 287, 109, { color: shade('red', 0.55), align: 'center' });
  },

  nudist_beach(c) {
    // Per spec s.49 and s.56 the entire composition exists to obstruct. Every
    // sightline is blocked by a parasol, a windbreak, a towel or a deckchair,
    // positioned with a precision the game itself comments on. The figures are
    // distant, tiny and completely covered; the joke is the staging.
    // Night, like the rest of the game. Moonlight on wet sand, not sunshine.
    rampGradient(c, 0, 0, W, 40, 'violet', 0.02, 0.3, 1.6);
    const r0 = rng(4711);
    for (let i = 0; i < 50; i++) {
      rect(c, r0() * W, r0() * 34, 1, 1, shade('neutral', 0.55 + r0() * 0.4));
    }
    celEllipse(c, 274, 16, 8, 8, 'gold', { base: 0.94, shadow: 0.1, outline: null });
    lightPool(c, 274, 16, 30, 30, shade('gold', 0.8), 0.22);

    rampGradient(c, 0, 34, W, 26, 'blue', 0.06, 0.24, 1);
    rampGradient(c, 0, 56, W, GAME_HEIGHT - 56, 'gold', 0.2, 0.1, 0.8);

    // A lazy shoreline curve rather than a hard horizontal edge, catching the
    // moon along its crest.
    c.fillStyle = shade('blue', 0.34);
    c.beginPath();
    c.moveTo(0, 62);
    c.bezierCurveTo(90, 54, 210, 70, W, 58);
    c.lineTo(W, 48);
    c.lineTo(0, 48);
    c.closePath();
    c.fill();
    c.strokeStyle = shade('teal', 0.62);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 62);
    c.bezierCurveTo(90, 54, 210, 70, W, 58);
    c.stroke();
    lightPool(c, 274, 58, 60, 10, shade('gold', 0.7), 0.18);

    speckle(c, 0, 64, W, 80, shade('gold', 0.34), 0.03, 481);

    // Distant bathers: flat silhouettes, drawn first so everything else covers
    // them. None is more than a few pixels of shoulder and a head.
    for (const [fx, fh] of [[68, 15], [150, 13], [232, 16]] as const) {
      silhouette(c, fx, 82, fh, shade('neutral', 0.16));
    }
    // A raised arm and a sunhat poking past the canopies, so the player can
    // see that something is being blocked. That is the entire joke.
    celEllipse(c, 96, 60, 7, 3, 'neutral', { base: 0.12, outline: null });
    c.strokeStyle = shade('neutral', 0.16);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(196, 74);
    c.quadraticCurveTo(202, 62, 199, 54);
    c.stroke();

    // Parasols. Proper cone-shaped canopies with alternating panels, a
    // scalloped hem and a leaning pole - the "strategically positioned" gag.
    const parasol = (px: number, py: number, r: number, a: string, b: string, lean: number) => {
      groundShadow(c, px + lean, 92, r * 0.8, r * 0.22);
      // Pole first, so the canopy sits over it.
      celQuad(c, [
        [px + lean - 1.5, py],
        [px + lean + 1.5, py],
        [px + 1.5, 96],
        [px - 1.5, 96],
      ], 'wood', { base: 0.5, outline: Colors.ink, outlineWidth: 1 });

      // Canopy panels radiating from the apex.
      const panels = 8;
      for (let i = 0; i < panels; i++) {
        const a0 = Math.PI + (i / panels) * Math.PI;
        const a1 = Math.PI + ((i + 1) / panels) * Math.PI;
        celShape(c, (ctx) => {
          ctx.beginPath();
          ctx.moveTo(px + lean, py);
          ctx.lineTo(px + lean + Math.cos(a0) * r, py - Math.sin(a0) * r * 0.42 + r * 0.30);
          ctx.quadraticCurveTo(
            px + lean + Math.cos((a0 + a1) / 2) * r * 1.06,
            py - Math.sin((a0 + a1) / 2) * r * 0.42 + r * 0.40,
            px + lean + Math.cos(a1) * r, py - Math.sin(a1) * r * 0.42 + r * 0.30,
          );
          ctx.closePath();
        }, i % 2 ? a : b, { base: i % 2 ? 0.66 : 0.86, shadow: 0.2, light: [-1, -2], outlineWidth: 1 });
      }
    };
    parasol(66, 48, 34, 'red', 'neutral', -3);
    parasol(152, 44, 32, 'teal', 'neutral', 2);
    parasol(238, 50, 33, 'gold', 'neutral', -2);

    // Deckchairs: triangular frames with striped canvas.
    const deckchair = (dx: number, dy: number, flip: number) => {
      groundShadow(c, dx, dy + 16, 20, 5);
      celQuad(c, [
        [dx - 18 * flip, dy + 16], [dx - 12 * flip, dy - 12],
        [dx - 9 * flip, dy - 12], [dx - 15 * flip, dy + 16],
      ], 'wood', { base: 0.42, outlineWidth: 1 });
      celQuad(c, [
        [dx + 16 * flip, dy + 16], [dx + 4 * flip, dy - 2],
        [dx + 8 * flip, dy - 2], [dx + 20 * flip, dy + 16],
      ], 'wood', { base: 0.42, outlineWidth: 1 });
      // Canvas sling.
      celQuad(c, [
        [dx - 12 * flip, dy - 11], [dx + 6 * flip, dy - 1],
        [dx + 6 * flip, dy + 4], [dx - 12 * flip, dy - 6],
      ], 'teal', { base: 0.72, shadow: 0.18, outlineWidth: 1 });
    };
    deckchair(28, 84, 1);
    deckchair(292, 80, -1);

    // Towels laid out in the mid-ground, each one squarely in the way.
    const towel = (tx: number, ty: number, rampName: string, tilt: number) => {
      celQuad(c, [
        [tx, ty], [tx + 46, ty - tilt], [tx + 44, ty + 13 - tilt], [tx - 2, ty + 13],
      ], rampName, { base: 0.78, shadow: 0.2, outlineWidth: 1 });
      c.save();
      c.beginPath();
      c.moveTo(tx, ty); c.lineTo(tx + 46, ty - tilt);
      c.lineTo(tx + 44, ty + 13 - tilt); c.lineTo(tx - 2, ty + 13);
      c.closePath(); c.clip();
      for (let sx = 0; sx < 48; sx += 9) {
        c.fillStyle = shade('neutral', 0.92);
        c.fillRect(tx + sx, ty - 4, 4, 20);
      }
      c.restore();
    };
    towel(96, 96, 'magenta', 3);
    towel(178, 100, 'phosphor', -2);

    // The windbreak across the foreground: angled panels on canes, the final
    // and most absurd layer of obstruction.
    for (let i = 0; i < 6; i++) {
      const bx = 40 + i * 44;
      const sway = Math.sin(i * 1.3) * 3;
      celQuad(c, [
        [bx + sway, 104], [bx + 44 - sway, 102],
        [bx + 44, 138], [bx, 138],
      ], i % 2 ? 'red' : 'neutral', { base: i % 2 ? 0.7 : 0.9, shadow: 0.22, light: [-2, -1], outlineWidth: 1 });
      celQuad(c, [
        [bx - 1.5 + sway, 98], [bx + 1.5 + sway, 98], [bx + 1.5, 142], [bx - 1.5, 142],
      ], 'wood', { base: 0.46, outlineWidth: 1 });
    }
  },
};

/** Clock hand helper. */
function drawHand(
  c: Ctx,
  cx: number,
  cy: number,
  angle: number,
  len: number,
  color: string,
  thickness = 1,
): void {
  c.fillStyle = color;
  for (let t = 0; t < len; t++) {
    c.fillRect(
      Math.round(cx + Math.cos(angle) * t),
      Math.round(cy + Math.sin(angle) * t),
      thickness,
      thickness,
    );
  }
}

/** Drawn for any scene whose background id has no painter yet. */
export function paintUnknown(c: Ctx, id: string): void {
  rect(c, 0, 0, W, GAME_HEIGHT, ramp('neutral', 1));
  for (let y = 0; y < GAME_HEIGHT; y += 8) {
    for (let x = 0; x < W; x += 8) {
      if (((x + y) / 8) % 2 === 0) rect(c, x, y, 8, 8, ramp('violet', 0));
    }
  }
  font.draw(c, 'NO BACKGROUND', 160, 88, { color: Colors.paper, outline: Colors.ink, align: 'center' });
  font.draw(c, id, 160, 100, { color: ramp('amber', 3), outline: Colors.ink, align: 'center' });
}
