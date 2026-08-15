import { audio } from '../engine/Audio';
import { font } from '../engine/BitmapFont';
import { Colors, ramp } from '../engine/Palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/Screen';

export type SpeechKind = 'speech' | 'caption' | 'card' | 'death';

interface Pending {
  kind: SpeechKind;
  text: string;
  subtitle?: string;
  color: string;
  /** Where the speaker is, in game pixels. Text floats above them. */
  anchorX?: number;
  anchorY?: number;
  /** Wrapped lines, split into screenfuls. Never empty. */
  pages: string[][];
  page: number;
}

const CHARS_PER_SEC = 46;

/**
 * Speech is a column above a character's head, so it is deliberately narrower
 * than a caption spanning the screen. Both leave room for the block to be
 * centred on an off-centre speaker without running past the frame.
 */
const WRAP_WIDTH: Record<SpeechKind, number> = {
  speech: 340,
  caption: 440,
  card: 480,
  death: 480,
};

/** Beyond this, a line becomes a second page rather than a taller block. */
const LINES_PER_PAGE = 3;

/** Space between the text and the edge of its backing panel. */
const PAD_X = 8;
const PAD_Y = 5;

/** Space between that panel and the edge of the screen. */
const SCREEN_MARGIN = 8;

/** Rows below this are behind the interface panel. */
const PLAYFIELD_H = 288;

/**
 * On-screen text: character-by-character reveal, SPACE to finish the current
 * page instantly, SPACE again for the next page (spec s.6, s.24).
 *
 * Speech floats above whoever is talking and is coloured per character, so the
 * player can tell who is speaking without a name label - the convention every
 * LucasArts game used. Long lines are broken into pages instead of growing a
 * wall of text over the scene, and every block sits on a dimmed panel so it
 * stays readable over busy artwork.
 */
export class Speech {
  private current: Pending | null = null;
  private revealed = 0;
  private dwell = 0;
  private finished = false;
  private sfxAccumulator = 0;

  get blocking(): boolean {
    return this.current !== null;
  }

  get kind(): SpeechKind | null {
    return this.current?.kind ?? null;
  }

  show(
    text: string,
    color: string,
    kind: SpeechKind = 'speech',
    anchor?: { x: number; y: number },
    subtitle?: string,
  ): void {
    const lines = font.wrap(text, WRAP_WIDTH[kind]);
    const perPage = kind === 'card' || kind === 'death' ? lines.length : LINES_PER_PAGE;
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
    if (!pages.length) pages.push(['']);

    this.current = {
      kind,
      text,
      subtitle,
      color,
      anchorX: anchor?.x,
      anchorY: anchor?.y,
      pages,
      page: 0,
    };
    this.beginPage();
  }

  dismiss(): void {
    this.current = null;
  }

  /** Reset the reveal for whichever page is now current. */
  private beginPage(): void {
    const cur = this.current;
    if (!cur) return;
    this.revealed = 0;
    this.finished = false;
    this.sfxAccumulator = 0;
    // Cards and deaths sit for a fixed beat; speech scales with its length.
    const chars = this.pageText().length;
    this.dwell = cur.kind === 'card' || cur.kind === 'death' ? 2.2 : 0.7 + chars * 0.035;
  }

  private pageText(): string {
    const cur = this.current;
    if (!cur) return '';
    return cur.pages[cur.page].join(' ');
  }

  private get hasMorePages(): boolean {
    const cur = this.current;
    return !!cur && cur.page < cur.pages.length - 1;
  }

  /**
   * @param skip  player pressed SPACE / clicked this frame
   * @returns true if this input was consumed, so the caller does not also
   *          treat the click as a world interaction
   */
  update(dt: number, skip: boolean): boolean {
    const cur = this.current;
    if (!cur) return false;

    const total = this.pageText().length;

    if (!this.finished) {
      if (skip) {
        // First press completes the page rather than skipping it entirely -
        // otherwise a fast clicker misses text they meant to read.
        this.revealed = total;
        this.finished = true;
        return true;
      }
      this.revealed += CHARS_PER_SEC * dt;
      // A soft key-click per few characters, like a 1987 text crawl.
      this.sfxAccumulator += CHARS_PER_SEC * dt;
      while (this.sfxAccumulator >= 3) {
        this.sfxAccumulator -= 3;
        if (cur.kind !== 'caption') audio.sfx('typewriter');
      }
      if (this.revealed >= total) {
        this.revealed = total;
        this.finished = true;
      }
      return false;
    }

    if (skip) {
      this.advance();
      return true;
    }
    this.dwell -= dt;
    if (this.dwell <= 0) this.advance();
    return false;
  }

  /** Next page, or dismiss if that was the last one. */
  private advance(): void {
    const cur = this.current;
    if (!cur) return;
    if (this.hasMorePages) {
      cur.page++;
      this.beginPage();
      return;
    }
    this.current = null;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cur = this.current;
    if (!cur) return;

    if (cur.kind === 'card' || cur.kind === 'death') {
      this.drawCard(ctx, cur);
      return;
    }

    const lines = cur.pages[cur.page];
    const lh = font.lineHeight();
    const blockH = lines.length * lh;
    const halfW = Math.max(...lines.map((l) => font.measure(l))) / 2;

    // Centre on the speaker, then clamp using the block's real width. Clamping
    // to a fixed margin is what let long lines run off the right-hand edge.
    const limit = halfW + PAD_X + SCREEN_MARGIN;
    let cx = GAME_WIDTH / 2;
    let top = 24;
    if (cur.kind === 'speech' && cur.anchorX !== undefined && cur.anchorY !== undefined) {
      cx = cur.anchorX;
      top = cur.anchorY - 92 - blockH;
    } else if (cur.kind === 'caption') {
      top = PLAYFIELD_H - 64 - blockH;
    }
    cx = Math.max(limit, Math.min(GAME_WIDTH - limit, cx));
    top = Math.max(
      PAD_Y + SCREEN_MARGIN,
      Math.min(PLAYFIELD_H - blockH - PAD_Y - SCREEN_MARGIN, top),
    );

    // A dimmed plate behind the text. Artwork underneath is arbitrary, and an
    // outline alone does not survive a bright or busy background.
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(
      Math.round(cx - halfW - PAD_X),
      Math.round(top - PAD_Y),
      Math.round(halfW * 2 + PAD_X * 2),
      Math.round(blockH + PAD_Y * 2 - 2),
    );
    ctx.globalAlpha = 1;

    // Re-wrap only the revealed prefix so lines don't reflow as they type.
    let remaining = Math.floor(this.revealed);
    lines.forEach((line, i) => {
      if (remaining <= 0) return;
      const part = line.slice(0, remaining);
      remaining -= line.length + 1;
      font.draw(ctx, part, cx, top + i * lh, {
        color: cur.color,
        outline: Colors.ink,
        align: 'center',
      });
    });

    if (this.finished && this.hasMorePages) {
      drawMoreArrow(ctx, cx, top + blockH + PAD_Y - 3, cur.color);
    }
  }

  private drawCard(ctx: CanvasRenderingContext2D, cur: Pending): void {
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const isDeath = cur.kind === 'death';
    const color = isDeath ? Colors.danger : cur.color;
    const shown = this.pageText().slice(0, Math.floor(this.revealed));
    const lines = font.wrap(shown, WRAP_WIDTH[cur.kind]);
    const lh = font.lineHeight(3);
    const startY = GAME_HEIGHT / 2 - (lines.length * lh) / 2 - (cur.subtitle ? 8 : 0);

    lines.forEach((line, i) => {
      font.draw(ctx, line, GAME_WIDTH / 2, startY + i * lh, { color, align: 'center' });
    });

    if (cur.subtitle && this.finished) {
      font.draw(ctx, cur.subtitle, GAME_WIDTH / 2, startY + lines.length * lh + 10, {
        color: ramp('neutral', 4),
        align: 'center',
      });
    }

    if (this.finished) {
      font.draw(ctx, 'PRESS SPACE', GAME_WIDTH / 2, GAME_HEIGHT - 44, {
        color: ramp('neutral', 3),
        align: 'center',
      });
    }
  }
}

/**
 * A small triangle marking "there is more to read". Drawn as pixels rather than
 * a glyph so it does not depend on the 5x7 font carrying an arrow character.
 */
function drawMoreArrow(ctx: CanvasRenderingContext2D, cx: number, y: number, color: string): void {
  ctx.fillStyle = color;
  for (let row = 0; row < 3; row++) {
    const w = 5 - row * 2;
    ctx.fillRect(Math.round(cx - w / 2), y + row, w, 1);
  }
}
