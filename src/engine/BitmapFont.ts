import { FONT_HEIGHT, FONT_WIDTH, GLYPHS, MISSING_GLYPH } from './font5x7';
import { Colors } from './Palette';

export interface TextStyle {
  color?: string;
  /** 1px outline in this colour. Adventure games need it - text sits directly
   *  over busy backgrounds and would otherwise be unreadable. */
  outline?: string | null;
  /** Extra pixels between glyphs. */
  tracking?: number;
  /** Extra pixels between wrapped lines. */
  leading?: number;
  align?: 'left' | 'center' | 'right';
}

const CHAR_ADVANCE = FONT_WIDTH + 1; // 5px glyph + 1px gap
const LINE_ADVANCE = FONT_HEIGHT + 2;

/**
 * Renders the 5x7 bitmap font.
 *
 * Glyphs are baked into a per-colour atlas the first time that colour is used,
 * then blitted with drawImage. Rendering pixel-by-pixel with fillRect would
 * mean ~35 fill calls per character; with dialogue on screen most frames, the
 * atlas keeps text effectively free.
 */
export class BitmapFont {
  private atlases = new Map<string, HTMLCanvasElement>();
  /** Index of each character within the atlas, in insertion order. */
  private readonly order: string[];
  private readonly indexOf: Map<string, number>;

  constructor() {
    this.order = Object.keys(GLYPHS);
    this.indexOf = new Map(this.order.map((ch, i) => [ch, i]));
  }

  charWidth(): number {
    return FONT_WIDTH;
  }

  lineHeight(leading = 0): number {
    return LINE_ADVANCE + leading;
  }

  measure(text: string, tracking = 0): number {
    if (!text.length) return 0;
    return text.length * (CHAR_ADVANCE + tracking) - (1 + tracking);
  }

  /** Greedy word wrap to a pixel width. Words longer than the line are split. */
  wrap(text: string, maxWidth: number, tracking = 0): string[] {
    const out: string[] = [];
    for (const paragraph of text.split('\n')) {
      if (paragraph === '') {
        out.push('');
        continue;
      }
      let line = '';
      for (const word of paragraph.split(' ')) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.measure(candidate, tracking) <= maxWidth) {
          line = candidate;
          continue;
        }
        if (line) out.push(line);
        // A single word too wide for the line gets hard-broken.
        if (this.measure(word, tracking) > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (this.measure(chunk + ch, tracking) > maxWidth) {
              out.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          line = chunk;
        } else {
          line = word;
        }
      }
      out.push(line);
    }
    return out;
  }

  /** Draw a single line. Returns the width drawn. */
  draw(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    style: TextStyle = {},
  ): number {
    const color = style.color ?? Colors.uiText;
    const tracking = style.tracking ?? 0;
    const width = this.measure(text, tracking);

    let px = Math.round(x);
    if (style.align === 'center') px = Math.round(x - width / 2);
    else if (style.align === 'right') px = Math.round(x - width);
    const py = Math.round(y);

    if (style.outline) {
      const outlineAtlas = this.atlas(style.outline);
      // Eight-way outline: a four-way one leaves diagonal gaps that let
      // background detail bleed through the letterforms.
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          this.blit(ctx, outlineAtlas, text, px + dx, py + dy, tracking);
        }
      }
    }

    this.blit(ctx, this.atlas(color), text, px, py, tracking);
    return width;
  }

  /** Draw wrapped, multi-line text. Returns total height drawn. */
  drawWrapped(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    style: TextStyle = {},
  ): number {
    const tracking = style.tracking ?? 0;
    const lines = this.wrap(text, maxWidth, tracking);
    const lh = this.lineHeight(style.leading ?? 0);
    lines.forEach((line, i) => this.draw(ctx, line, x, y + i * lh, style));
    return lines.length * lh;
  }

  private blit(
    ctx: CanvasRenderingContext2D,
    atlas: HTMLCanvasElement,
    text: string,
    x: number,
    y: number,
    tracking: number,
  ): void {
    let cx = x;
    for (const ch of text) {
      if (ch !== ' ') {
        const idx = this.indexOf.get(ch);
        const sx = (idx === undefined ? this.order.length : idx) * FONT_WIDTH;
        ctx.drawImage(atlas, sx, 0, FONT_WIDTH, FONT_HEIGHT, cx, y, FONT_WIDTH, FONT_HEIGHT);
      }
      cx += CHAR_ADVANCE + tracking;
    }
  }

  /** Build (and cache) every glyph rendered in one colour, side by side. */
  private atlas(color: string): HTMLCanvasElement {
    const cached = this.atlases.get(color);
    if (cached) return cached;

    // One extra slot on the end holds the missing-glyph box.
    const cv = document.createElement('canvas');
    cv.width = (this.order.length + 1) * FONT_WIDTH;
    cv.height = FONT_HEIGHT;
    const c = cv.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.fillStyle = color;

    const paint = (rows: number[], originX: number) => {
      for (let r = 0; r < FONT_HEIGHT; r++) {
        const bits = rows[r] ?? 0;
        if (!bits) continue;
        // Collapse horizontal runs of set bits into single fillRects.
        let runStart = -1;
        for (let col = 0; col <= FONT_WIDTH; col++) {
          const on = col < FONT_WIDTH && (bits & (1 << (FONT_WIDTH - 1 - col))) !== 0;
          if (on && runStart < 0) runStart = col;
          else if (!on && runStart >= 0) {
            c.fillRect(originX + runStart, r, col - runStart, 1);
            runStart = -1;
          }
        }
      }
    };

    this.order.forEach((ch, i) => paint(GLYPHS[ch], i * FONT_WIDTH));
    paint(MISSING_GLYPH, this.order.length * FONT_WIDTH);

    this.atlases.set(color, cv);
    return cv;
  }
}

/** Shared instance - the atlas cache is worth reusing across every screen. */
export const font = new BitmapFont();
