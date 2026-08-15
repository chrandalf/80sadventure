import { font } from '../engine/BitmapFont';
import { GAME_WIDTH } from '../engine/Screen';
import {
  Colors, type Ctx, ditherFill, gradientV, hline, lightPool, outline, ramp, rect, rng,
  silhouette, staticScreen, vline,
} from '../game/paint';

const H = 144;

/**
 * Full-screen stills: what the arcade machines display, what the photograph
 * shows, what the film contains.
 *
 * These carry the mystery's biggest beats, so they are drawn as deliberate
 * compositions rather than text on black - the player should feel they are
 * looking at a real object through a CRT.
 */

/** Shared CRT dressing: scanlines, a green tint and rounded corners. */
function crt(c: Ctx, draw: () => void, tint = ramp('phosphor', 2)): void {
  rect(c, 0, 0, GAME_WIDTH, H, Colors.ink);
  rect(c, 20, 10, GAME_WIDTH - 40, H - 28, ramp('neutral', 0));
  outline(c, 20, 10, GAME_WIDTH - 40, H - 28, ramp('neutral', 2));
  draw();
  // Scanlines inside the screen area only.
  for (let y = 12; y < H - 20; y += 2) {
    ditherFill(c, 22, y, GAME_WIDTH - 44, 1, ramp('neutral', 0), Colors.ink, 0.55);
  }
  lightPool(c, GAME_WIDTH / 2, H / 2 - 6, 130, 60, tint, 0.12);
}

/** A photograph: white border, slightly off-centre, with a printed timestamp. */
function photo(c: Ctx, draw: () => void, stamp: string): void {
  rect(c, 0, 0, GAME_WIDTH, H, Colors.ink);
  rect(c, 56, 14, 208, 116, ramp('paper', 0));
  rect(c, 62, 20, 196, 92, ramp('neutral', 1));
  c.save();
  c.beginPath();
  c.rect(62, 20, 196, 92);
  c.clip();
  draw();
  c.restore();
  font.draw(c, stamp, 160, 118, { color: ramp('amber', 2), align: 'center' });
}

export const VISIONS: Record<string, (c: Ctx) => void> = {
  /** Act I: every machine in the building shows the same thing at once. */
  opening_message(c) {
    crt(c, () => {
      font.draw(c, 'ONE MORE CREDIT', GAME_WIDTH / 2, 56, {
        color: ramp('phosphor', 3),
        align: 'center',
      });
      font.draw(c, 'ONE MORE CREDIT', GAME_WIDTH / 2, 56, {
        color: ramp('phosphor', 1),
        align: 'center',
      });
      for (let i = 0; i < 6; i++) {
        hline(c, 24, 40 + i * 14, GAME_WIDTH - 48, ramp('phosphor', 0));
      }
    });
  },

  /** The photograph shown on every screen: the arcade, tomorrow, still standing. */
  photo_tomorrow(c) {
    photo(
      c,
      () => {
        gradientV(c, 62, 20, 196, 60, [ramp('neutral', 3), ramp('neutral', 4), ramp('paper', 0)], 1.2);
        // The building.
        rect(c, 96, 34, 128, 56, ramp('neutral', 2));
        rect(c, 96, 32, 128, 4, ramp('neutral', 3));
        rect(c, 112, 38, 96, 12, ramp('neutral', 1));
        font.draw(c, 'STARLIGHT', 160, 41, { color: ramp('neutral', 4), align: 'center' });
        // The doorway - and Jack standing in it.
        rect(c, 146, 60, 28, 30, ramp('neutral', 0));
        silhouette(c, 160, 90, 26, ramp('neutral', 1));
        rect(c, 62, 88, 196, 24, ramp('neutral', 3));
      },
      'SATURDAY 19 SEPTEMBER 1987',
    );
    font.draw(c, 'THE BUILDING IS STILL THERE.', 160, 136, {
      color: ramp('neutral', 4),
      align: 'center',
    });
  },

  /** Act I's first prediction: TOMORROW / 09:43 / PIER / RED COAT. */
  machine_pier(c) {
    crt(c, () => {
      const lines = ['TOMORROW', '09:43', 'PIER', 'RED COAT'];
      lines.forEach((line, i) => {
        font.draw(c, line, GAME_WIDTH / 2, 34 + i * 18, {
          color: i === 0 ? ramp('phosphor', 3) : ramp('phosphor', 2),
          align: 'center',
        });
      });
    });
  },

  machine_clock(c) {
    crt(c, () => {
      ['TOMORROW', '22:32', 'CLOCK TOWER', 'A KEY FALLS'].forEach((line, i) => {
        font.draw(c, line, GAME_WIDTH / 2, 34 + i * 18, {
          color: i === 0 ? ramp('amber', 3) : ramp('amber', 2),
          align: 'center',
        });
      });
    }, ramp('amber', 2));
  },

  machine_lighthouse(c) {
    crt(c, () => {
      ['TOMORROW', '23:05', 'LIGHTHOUSE', '"DO NOT TRUST ARTHUR"'].forEach((line, i) => {
        font.draw(c, line, GAME_WIDTH / 2, 34 + i * 18, {
          color: i === 3 ? ramp('red', 2) : ramp('cyan', 2),
          align: 'center',
        });
      });
    }, ramp('cyan', 2));
  },

  machine_arcade(c) {
    crt(c, () => {
      ['TOMORROW', '23:47', 'STARLIGHT ARCADE', '"IT HAS TO HAPPEN"'].forEach((line, i) => {
        font.draw(c, line, GAME_WIDTH / 2, 34 + i * 18, {
          color: i === 3 ? ramp('magenta', 3) : ramp('magenta', 2),
          align: 'center',
        });
      });
    }, ramp('magenta', 2));
  },

  /** The reel labelled SATURDAY: the town, and then the arcade coming down. */
  film_saturday(c) {
    rect(c, 0, 0, GAME_WIDTH, H, Colors.ink);
    // Sprocket holes down both sides, so it reads as film rather than video.
    for (let y = 4; y < H - 16; y += 12) {
      rect(c, 6, y, 8, 7, ramp('neutral', 2));
      rect(c, GAME_WIDTH - 14, y, 8, 7, ramp('neutral', 2));
    }
    rect(c, 24, 8, GAME_WIDTH - 48, H - 30, ramp('neutral', 1));
    gradientV(c, 24, 8, GAME_WIDTH - 48, 50, [ramp('neutral', 3), ramp('neutral', 4)], 1);
    // The arcade, mid-demolition.
    rect(c, 90, 42, 100, 46, ramp('neutral', 2));
    for (let i = 0; i < 30; i++) {
      const r = rng(900 + i);
      rect(c, 90 + r() * 100, 42 + r() * 46, 3, 3, ramp('neutral', 1));
    }
    rect(c, 196, 30, 12, 58, ramp('amber', 1)); // the crane arm
    rect(c, 190, 26, 30, 6, ramp('amber', 2));
    rect(c, 24, 88, GAME_WIDTH - 48, 22, ramp('neutral', 0));
    // Grain.
    for (let i = 0; i < 220; i++) {
      const r = rng(1300 + i);
      rect(c, 24 + r() * (GAME_WIDTH - 48), 8 + r() * (H - 30), 1, 1, ramp('neutral', 4));
    }
    font.draw(c, 'SATURDAY 19 SEPTEMBER 1987', 160, H - 16, {
      color: ramp('amber', 2), align: 'center',
    });
  },

  /** Act VI: the machine cycling through candidate years. */
  versions(c) {
    rect(c, 0, 0, GAME_WIDTH, H, Colors.ink);
    const years = ['1987', '1988', '1989', '1990', '1991'];
    years.forEach((year, i) => {
      const x = 20 + i * 58;
      rect(c, x, 34, 52, 62, ramp('neutral', 0));
      outline(c, x, 34, 52, 62, i === 0 ? ramp('magenta', 2) : ramp('neutral', 2));
      staticScreen(c, x + 2, 36, 48, 46, 700 + i * 31);
      // Each year a little emptier than the last.
      ditherFill(c, x + 2, 36, 48, 46, ramp('neutral', 0), Colors.ink, i * 0.18);
      font.draw(c, year, x + 26, 86, {
        color: i === 0 ? ramp('magenta', 3) : ramp('neutral', 3),
        align: 'center',
      });
    });
    font.draw(c, 'SELECT A DAY TO KEEP', 160, 16, { color: ramp('phosphor', 2), align: 'center' });
    font.draw(c, 'ALL OTHERS WILL BE ERASED', 160, 112, {
      color: ramp('red', 2), align: 'center',
    });
  },

  /** The reveal: the scratched man in the 1974 photograph, restored. */
  vale_reveal(c) {
    photo(
      c,
      () => {
        gradientV(c, 62, 20, 196, 92, [ramp('amber', 1), ramp('amber', 0), ramp('neutral', 1)], 1);
        rect(c, 62, 76, 196, 36, ramp('neutral', 2));
        // Arthur, younger, and beside him a man in a white shirt and black tie.
        silhouette(c, 130, 106, 46, ramp('amber', 0));
        silhouette(c, 186, 106, 46, ramp('neutral', 4));
        rect(c, 184, 74, 5, 22, Colors.ink); // the tie
        font.draw(c, 'STARLIGHT ARCADE', 160, 26, { color: ramp('neutral', 0), align: 'center' });
      },
      '1974',
    );
    font.draw(c, 'DR ELLIOT VALE', 160, 136, { color: Colors.paper, align: 'center' });
  },

  /** The cassette labelled JACK, in his own voice, recorded tomorrow. */
  cassette_playing(c) {
    rect(c, 0, 0, GAME_WIDTH, H, Colors.ink);
    // A cassette, filling the frame, spools turning.
    rect(c, 60, 34, 200, 76, ramp('neutral', 1));
    outline(c, 60, 34, 200, 76, ramp('neutral', 3));
    rect(c, 72, 44, 176, 30, ramp('paper', 0));
    font.draw(c, 'JACK', 160, 52, { color: ramp('neutral', 0), align: 'center' });
    for (const sx of [110, 210]) {
      c.fillStyle = ramp('neutral', 0);
      c.beginPath();
      c.arc(sx, 90, 14, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = ramp('neutral', 3);
      c.beginPath();
      c.arc(sx, 90, 5, 0, Math.PI * 2);
      c.fill();
    }
    rect(c, 124, 84, 72, 12, ramp('neutral', 0));
    for (let i = 0; i < 5; i++) vline(c, 100 + i * 5, 106, 4, ramp('neutral', 2));
    font.draw(c, 'PLAYING', 160, 122, { color: ramp('phosphor', 2), align: 'center' });
  },
};
