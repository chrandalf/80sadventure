import { Colors } from './Palette';

/**
 * Internal render resolution. Everything in the game is authored, positioned
 * and drawn in this coordinate space - never in window pixels.
 *
 * 320x200 is the VGA mode 13h canvas that Sierra and Lucasfilm Games shipped on
 * (spec s.6). Keeping it means Jack is ~40px tall, so a full walk cycle is a few
 * hundred meaningful pixels rather than a few hundred thousand. That is the
 * difference between art you can finish and art you can't.
 */
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 200;

/**
 * Mode 13h pixels were not square: 320x200 filled a 4:3 monitor, so each pixel
 * was 1.2x taller than wide. Reproducing that is why the art reads as period
 * rather than as modern 16:10 pixel art, and the spec asks for a 4:3 viewport.
 */
export const PIXEL_ASPECT = 1.2;

export type AspectMode = 'crt43' | 'square';

export interface ScreenOptions {
  /** 'crt43' reproduces 1.2 tall pixels; 'square' is modern 16:10. */
  aspect: AspectMode;
  /** Additive glow on bright pixels. Sells neon and CRT bloom. */
  bloom: boolean;
  bloomRadius: number;
  bloomStrength: number;
  /** Horizontal dark lines at output resolution, CRT style. */
  scanlines: boolean;
  scanlineStrength: number;
  /** Red/blue fringing at the screen edges (spec s.6). */
  chromaticAberration: boolean;
  /** Darkened corners. */
  vignette: boolean;
  /** Occasional brightness flicker (spec s.6). */
  flicker: boolean;
}

export const DEFAULT_SCREEN_OPTIONS: ScreenOptions = {
  aspect: 'crt43',
  bloom: true,
  bloomRadius: 2.5,
  bloomStrength: 0.5,
  scanlines: true,
  scanlineStrength: 0.16,
  chromaticAberration: true,
  vignette: true,
  flicker: true,
};

/**
 * Owns the two-stage render: the game draws into a fixed 320x200 buffer, then
 * that buffer is blown up to the window with the CRT treatment applied on the
 * way out. Game code never knows the window size.
 */
export class Screen {
  /** The buffer all game drawing targets. 320x200, always. */
  readonly buffer: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  /** The visible canvas, sized to the window. */
  readonly output: HTMLCanvasElement;
  private readonly outCtx: CanvasRenderingContext2D;

  private readonly brightPass: HTMLCanvasElement;
  private readonly brightCtx: CanvasRenderingContext2D;

  private overlay: HTMLCanvasElement | null = null;
  private overlayKey = '';

  options: ScreenOptions;

  /** Whole-number pixel dimensions, so art never lands between pixels. */
  scaleX = 1;
  scaleY = 1;

  private flickerAmount = 0;
  private flickerTimer = 0;

  constructor(mount: HTMLElement, options: Partial<ScreenOptions> = {}) {
    this.options = { ...DEFAULT_SCREEN_OPTIONS, ...options };

    this.buffer = makeCanvas(GAME_WIDTH, GAME_HEIGHT);
    this.ctx = get2d(this.buffer);

    this.brightPass = makeCanvas(GAME_WIDTH, GAME_HEIGHT);
    this.brightCtx = get2d(this.brightPass);

    this.output = makeCanvas(GAME_WIDTH, GAME_HEIGHT);
    this.output.id = 'game-canvas';
    this.output.style.display = 'block';
    this.output.style.imageRendering = 'pixelated';
    this.output.style.touchAction = 'none';
    this.outCtx = get2d(this.output);

    mount.appendChild(this.output);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  get cssWidth(): number {
    return GAME_WIDTH * this.scaleX;
  }

  get cssHeight(): number {
    return GAME_HEIGHT * this.scaleY;
  }

  /**
   * Fit the window using integer pixel sizes on both axes.
   *
   * Both scales stay whole numbers so every game pixel is an identical block -
   * fractional scaling is what makes pixel art shimmer and look cheap. In crt43
   * mode the vertical scale is the horizontal one times 1.2, rounded; at scaleX
   * 5 that lands on 6, which is exactly 4:3 (1600x1200).
   */
  resize(): void {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    const ratio = this.options.aspect === 'crt43' ? PIXEL_ASPECT : 1;

    // Largest integer scaleX whose implied height still fits.
    let sx = Math.max(1, Math.floor(availW / GAME_WIDTH));
    while (sx > 1 && GAME_HEIGHT * Math.max(1, Math.round(sx * ratio)) > availH) sx--;

    this.scaleX = sx;
    this.scaleY = Math.max(1, Math.round(sx * ratio));

    const cssW = this.cssWidth;
    const cssH = this.cssHeight;

    this.output.style.width = `${cssW}px`;
    this.output.style.height = `${cssH}px`;
    this.output.width = cssW * dpr;
    this.output.height = cssH * dpr;

    this.outCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.outCtx.imageSmoothingEnabled = false;
    this.overlay = null;
  }

  /** Convert a window/client coordinate into game-space pixels. */
  toGameCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.output.getBoundingClientRect();
    return {
      x: Math.floor((clientX - rect.left) / this.scaleX),
      y: Math.floor((clientY - rect.top) / this.scaleY),
    };
  }

  clear(color: string = Colors.void): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = color;
    c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  update(dt: number): void {
    if (!this.options.flicker) {
      this.flickerAmount = 0;
      return;
    }
    this.flickerTimer -= dt;
    if (this.flickerTimer <= 0) {
      // Long quiet stretches punctuated by a brief dip, like a tired tube.
      this.flickerTimer = 2 + Math.random() * 7;
      this.flickerAmount = 0.05 + Math.random() * 0.07;
    } else {
      this.flickerAmount *= 0.82;
    }
  }

  /** Blit the game buffer to the window with the CRT treatment. */
  present(): void {
    const o = this.outCtx;
    const w = this.cssWidth;
    const h = this.cssHeight;

    o.imageSmoothingEnabled = false;
    o.globalCompositeOperation = 'source-over';
    o.globalAlpha = 1;
    o.clearRect(0, 0, w, h);

    if (this.options.chromaticAberration) {
      this.drawWithFringing(w, h);
    } else {
      o.drawImage(this.buffer, 0, 0, w, h);
    }

    if (this.options.bloom) this.drawBloom(w, h);

    if (this.options.scanlines || this.options.vignette) {
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = 1;
      o.drawImage(this.ensureOverlay(w, h), 0, 0, w, h);
    }

    if (this.flickerAmount > 0.004) {
      o.globalCompositeOperation = 'source-over';
      o.globalAlpha = this.flickerAmount;
      o.fillStyle = '#000000';
      o.fillRect(0, 0, w, h);
      o.globalAlpha = 1;
    }
  }

  /**
   * Chromatic aberration: draw the frame three times, nudging the red and blue
   * channels apart by a pixel. `screen` compositing recombines them without the
   * darkening a plain alpha blend would cause.
   */
  private drawWithFringing(w: number, h: number): void {
    const o = this.outCtx;
    const off = Math.max(1, Math.round(this.scaleX * 0.28));

    o.drawImage(this.buffer, 0, 0, w, h);

    o.save();
    o.globalCompositeOperation = 'screen';
    o.globalAlpha = 0.22;
    o.filter = 'url(#none)';
    o.filter = 'none';
    // Red pulled left, blue pulled right - the classic misconverged-tube look.
    o.drawImage(this.buffer, -off, 0, w, h);
    o.drawImage(this.buffer, off, 0, w, h);
    o.restore();
  }

  /**
   * Cheap bloom: isolate bright pixels, blur them, add them back.
   *
   * `color-dodge` against mid-grey knocks out everything that isn't already
   * bright, so only highlights glow. Done at game resolution, so the blur cost
   * is fixed no matter how large the window is.
   */
  private drawBloom(w: number, h: number): void {
    const b = this.brightCtx;
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = 'source-over';
    b.globalAlpha = 1;
    b.filter = 'none';
    b.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    b.drawImage(this.buffer, 0, 0);
    b.globalCompositeOperation = 'color-dodge';
    b.fillStyle = '#383838';
    b.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    b.globalCompositeOperation = 'source-over';

    const o = this.outCtx;
    o.save();
    o.globalCompositeOperation = 'lighter';
    o.globalAlpha = this.options.bloomStrength;
    o.filter = `blur(${this.options.bloomRadius * this.scaleX}px)`;
    o.imageSmoothingEnabled = true;
    o.drawImage(this.brightPass, 0, 0, w, h);
    o.restore();
    o.filter = 'none';
    o.imageSmoothingEnabled = false;
  }

  /** Scanlines and vignette baked into one cached layer. */
  private ensureOverlay(w: number, h: number): HTMLCanvasElement {
    const key = `${w}x${h}:${this.options.scanlines}:${this.options.scanlineStrength}:${this.options.vignette}`;
    if (this.overlay && this.overlayKey === key) return this.overlay;

    const cv = makeCanvas(w, h);
    const c = get2d(cv);

    if (this.options.scanlines && this.scaleY >= 2) {
      c.fillStyle = `rgba(0,0,0,${this.options.scanlineStrength})`;
      // One dark line per *game* pixel row, so density follows the art rather
      // than the window size.
      const lineH = Math.max(1, Math.floor(this.scaleY / 3));
      for (let y = 0; y < h; y += this.scaleY) {
        c.fillRect(0, y + this.scaleY - lineH, w, lineH);
      }
    }

    if (this.options.vignette) {
      const g = c.createRadialGradient(
        w / 2, h / 2, Math.min(w, h) * 0.34,
        w / 2, h / 2, Math.max(w, h) * 0.72,
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.5)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }

    this.overlay = cv;
    this.overlayKey = key;
    return cv;
  }
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
