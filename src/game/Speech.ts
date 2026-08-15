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
}

const CHARS_PER_SEC = 46;
const MAX_LINE_WIDTH = 460;

/**
 * On-screen text: character-by-character reveal, SPACE to finish the current
 * line instantly, click or SPACE again to dismiss (spec s.6, s.24).
 *
 * Speech floats above whoever is talking and is coloured per character, so the
 * player can tell who is speaking without a name label - the convention every
 * LucasArts game used.
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
    this.current = {
      kind,
      text,
      subtitle,
      color,
      anchorX: anchor?.x,
      anchorY: anchor?.y,
    };
    this.revealed = 0;
    this.finished = false;
    this.sfxAccumulator = 0;
    // Cards and deaths sit for a fixed beat; speech scales with its length.
    this.dwell = kind === 'card' || kind === 'death' ? 2.2 : 0.7 + text.length * 0.035;
  }

  dismiss(): void {
    this.current = null;
  }

  /**
   * @param skip  player pressed SPACE / clicked this frame
   * @returns true if this input was consumed, so the caller does not also
   *          treat the click as a world interaction
   */
  update(dt: number, skip: boolean): boolean {
    const cur = this.current;
    if (!cur) return false;

    if (!this.finished) {
      if (skip) {
        // First press completes the line rather than skipping it entirely -
        // otherwise a fast clicker misses text they meant to read.
        this.revealed = cur.text.length;
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
      if (this.revealed >= cur.text.length) {
        this.revealed = cur.text.length;
        this.finished = true;
      }
      return false;
    }

    if (skip) {
      this.current = null;
      return true;
    }
    this.dwell -= dt;
    if (this.dwell <= 0) this.current = null;
    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cur = this.current;
    if (!cur) return;
    const shown = cur.text.slice(0, Math.floor(this.revealed));

    if (cur.kind === 'card' || cur.kind === 'death') {
      this.drawCard(ctx, cur, shown);
      return;
    }

    const lines = font.wrap(cur.text, MAX_LINE_WIDTH);
    const lh = font.lineHeight();
    const blockH = lines.length * lh;

    // Position above the speaker, clamped on screen. Captions sit centre-low.
    let cx = GAME_WIDTH / 2;
    let top = 24;
    if (cur.kind === 'speech' && cur.anchorX !== undefined && cur.anchorY !== undefined) {
      cx = Math.max(120, Math.min(GAME_WIDTH - 120, cur.anchorX));
      top = Math.max(8, cur.anchorY - 92 - blockH);
    } else if (cur.kind === 'caption') {
      top = 200;
    }

    // Re-wrap only the revealed prefix so lines don't reflow as they type.
    let remaining = shown.length;
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
  }

  private drawCard(ctx: CanvasRenderingContext2D, cur: Pending, shown: string): void {
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const isDeath = cur.kind === 'death';
    const color = isDeath ? Colors.danger : cur.color;
    const lines = font.wrap(shown, 480);
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
