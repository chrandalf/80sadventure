/**
 * Sprite sheets and animation playback.
 *
 * The contract that makes art swappable: game code NEVER names a file. It asks
 * the asset store for a logical id (`actor.player`) and plays a named animation
 * (`walk.east`). The mapping from id -> file -> frame grid lives entirely in
 * `assets/sprites/manifest.json`. Replacing art is therefore a file drop, and
 * changing a sprite's dimensions is a one-line manifest edit. See docs/ASSETS.md.
 */

/** How a single animation reads frames out of the sheet. */
export interface AnimDef {
  /** Flat, row-major frame indices. Wins over `row` if both are present. */
  frames?: number[];
  /** Shorthand: use every column of this row, left to right. */
  row?: number;
  fps?: number;
  loop?: boolean;
  /** Horizontally mirror the frames. Lets one east-facing sheet serve west too. */
  flipX?: boolean;
}

/** Procedural stand-in drawn when the real PNG is absent. */
export interface PlaceholderHint {
  kind?: 'humanoid' | 'object' | 'prop' | 'panel' | 'blob';
  primary?: string;
  secondary?: string;
  label?: string;
}

/** One entry in the sprite manifest. */
export interface SpriteDef {
  file: string;
  /** Inherit geometry and animations from a named entry in `templates`.
   *  Anything set directly on the sprite overrides the template. */
  template?: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  /** Origin within a frame. Defaults to bottom-centre, correct for anything
   *  that stands on the ground. */
  anchorX?: number;
  anchorY?: number;
  /**
   * Multiplier applied when drawing. Sheets cut for the old 320x200 screen use
   * 2; art authored natively for 640x400 uses 1. Lets both live in the game at
   * once during the art migration.
   */
  renderScale?: number;
  animations?: Record<string, AnimDef>;
  placeholder?: PlaceholderHint;
  /** Free-text note for whoever draws the replacement. Surfaced by the validator. */
  description?: string;
}

export interface SpriteManifest {
  /** Reusable geometry/animation sets. Every human character shares one. */
  templates?: Record<string, Partial<SpriteDef>>;
  sprites: Record<string, SpriteDef>;
}

/**
 * Resolve a sprite entry against its template.
 *
 * Shared by the runtime loader and the offline asset tools, so the validator
 * and the game can never disagree about what geometry a sprite is supposed to
 * have - which is the whole point of having a single manifest.
 */
export function resolveSpriteDef(
  def: SpriteDef,
  templates: Record<string, Partial<SpriteDef>> | undefined,
): SpriteDef {
  if (!def.template || !templates) return def;
  const base = templates[def.template];
  if (!base) {
    console.warn(`[assets] unknown template "${def.template}"`);
    return def;
  }
  return {
    ...base,
    ...def,
    // Animations merge rather than replace, so one sprite can add a bespoke
    // animation without restating the whole shared set.
    animations: { ...base.animations, ...def.animations },
  } as SpriteDef;
}

const DEFAULT_FPS = 8;

/**
 * A loaded sheet: the image plus the geometry needed to cut frames out of it.
 * Holds no playback state, so one sheet can back any number of actors.
 */
export class SpriteSheet {
  readonly id: string;
  readonly image: CanvasImageSource;
  readonly def: SpriteDef;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;
  readonly rows: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly frameCount: number;
  /** True when this is a generated stand-in rather than the authored art. */
  readonly isPlaceholder: boolean;
  /** Multiplier baked into every draw of this sheet. */
  readonly renderScale: number;

  /** Lazily-built horizontally mirrored copy, for `flipX` animations. */
  private mirrored: HTMLCanvasElement | null = null;
  /** Cached answer to "is every cell on this sheet the same picture?" */
  private still: boolean | null = null;

  constructor(id: string, image: CanvasImageSource, def: SpriteDef, isPlaceholder = false) {
    this.id = id;
    this.image = image;
    this.def = def;
    this.frameWidth = def.frameWidth;
    this.frameHeight = def.frameHeight;
    this.columns = Math.max(1, def.columns);
    this.rows = Math.max(1, def.rows);
    this.anchorX = def.anchorX ?? Math.floor(def.frameWidth / 2);
    this.anchorY = def.anchorY ?? def.frameHeight;
    this.frameCount = this.columns * this.rows;
    this.isPlaceholder = isPlaceholder;
    this.renderScale = def.renderScale ?? 1;
  }

  /**
   * True when every cell holds the same picture, so playing an animation would
   * show no movement at all.
   *
   * Generated character art arrives as one standing figure copied across the
   * sheet, because no image model produces a frame-accurate walk cycle. Knowing
   * that lets the actor fake a stride rather than glide along bolt upright.
   * Compared once, on the first ask, and remembered.
   */
  get isStill(): boolean {
    if (this.still !== null) return this.still;
    this.still = this.framesAreIdentical();
    return this.still;
  }

  private framesAreIdentical(): boolean {
    if (this.frameCount < 2) return true;
    const w = this.frameWidth;
    const h = this.frameHeight;
    try {
      const cv = document.createElement('canvas');
      cv.width = w * 2;
      cv.height = h;
      const c = cv.getContext('2d', { willReadFrequently: true })!;
      c.imageSmoothingEnabled = false;
      // Frame 0 beside frame 1: the walk cycle's first two cells.
      c.drawImage(this.image, 0, 0, w, h, 0, 0, w, h);
      c.drawImage(this.image, w, 0, w, h, w, 0, w, h);
      const a = c.getImageData(0, 0, w, h).data;
      const b = c.getImageData(w, 0, w, h).data;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
      return true;
    } catch {
      // A tainted or not-yet-decoded image: assume it animates and leave it be.
      return false;
    }
  }

  hasAnimation(name: string): boolean {
    return !!this.def.animations?.[name];
  }

  getAnimation(name: string): AnimDef | undefined {
    return this.def.animations?.[name];
  }

  /** Resolve an animation to the concrete frame indices it plays. */
  resolveFrames(name: string): number[] {
    const anim = this.getAnimation(name);
    if (!anim) return [0];
    if (anim.frames && anim.frames.length) return anim.frames;
    if (anim.row !== undefined) {
      const base = anim.row * this.columns;
      return Array.from({ length: this.columns }, (_, i) => base + i);
    }
    return [0];
  }

  /**
   * Draw one frame with its anchor placed at (x, y). Coordinates are rounded so
   * sprites always land on whole pixels - subpixel placement is the other
   * classic way to make pixel art look blurry.
   *
   * `scale` drives the perspective shrink as actors walk upstage. It is snapped
   * to eighths and the result to whole pixels, so a walking character steps
   * between a few discrete sizes rather than resampling continuously, which is
   * how Sierra and Lucasfilm did it and why it reads as period rather than as a
   * modern smooth transform.
   */
  drawFrame(
    ctx: CanvasRenderingContext2D,
    frame: number,
    x: number,
    y: number,
    flipX = false,
    scale = 1,
  ): void {
    const idx = ((frame % this.frameCount) + this.frameCount) % this.frameCount;
    const col = idx % this.columns;
    const row = Math.floor(idx / this.columns);

    const effective = scale * this.renderScale;
    const snapped = effective === 1 ? 1 : Math.max(0.125, Math.round(effective * 8) / 8);
    const dw = Math.max(1, Math.round(this.frameWidth * snapped));
    const dh = Math.max(1, Math.round(this.frameHeight * snapped));
    const dx = Math.round(x - this.anchorX * snapped);
    const dy = Math.round(y - this.anchorY * snapped);

    const src = flipX ? this.ensureMirrored() : this.image;
    // In the mirrored sheet the column order is reversed.
    const sCol = flipX ? this.columns - 1 - col : col;

    ctx.drawImage(
      src,
      sCol * this.frameWidth, row * this.frameHeight,
      this.frameWidth, this.frameHeight,
      dx, dy,
      dw, dh,
    );
  }

  /**
   * Draw a frame as though it were mid-stride.
   *
   * With only one pose available, the movement has to come from how it is
   * drawn. The figure is cut at the hip and the two halves are offset against
   * each other by a pixel while the whole body rises and falls - the shoulders
   * roll one way as the legs swing the other. At this size that reads as
   * walking far better than any attempt to fake individual legs, which at
   * fourteen pixels across just looks broken.
   *
   * `phase` is 0..1 through one full two-step cycle.
   */
  drawFrameWalking(
    ctx: CanvasRenderingContext2D,
    frame: number,
    x: number,
    y: number,
    flipX = false,
    scale = 1,
    phase = 0,
  ): void {
    const idx = ((frame % this.frameCount) + this.frameCount) % this.frameCount;
    const col = idx % this.columns;
    const row = Math.floor(idx / this.columns);

    const effective = scale * this.renderScale;
    const snapped = effective === 1 ? 1 : Math.max(0.125, Math.round(effective * 8) / 8);
    const dw = Math.max(1, Math.round(this.frameWidth * snapped));
    const dx = Math.round(x - this.anchorX * snapped);
    const dy = Math.round(y - this.anchorY * snapped);

    const src = flipX ? this.ensureMirrored() : this.image;
    const sCol = flipX ? this.columns - 1 - col : col;
    const sx = sCol * this.frameWidth;
    const sy = row * this.frameHeight;

    const swing = Math.sin(phase * Math.PI * 2);
    // Two footfalls per cycle, so the body is lowest as each foot lands.
    const bob = Math.abs(Math.cos(phase * Math.PI * 2)) > 0.72 ? 0 : -1;
    const lean = swing > 0.4 ? 1 : swing < -0.4 ? -1 : 0;

    const hip = Math.round(this.frameHeight * 0.55);
    const topH = Math.max(1, Math.round(hip * snapped));
    const botSrcH = this.frameHeight - hip;
    const botH = Math.max(1, Math.round(botSrcH * snapped));

    ctx.drawImage(src, sx, sy, this.frameWidth, hip,
      dx + lean, dy + bob, dw, topH);
    ctx.drawImage(src, sx, sy + hip, this.frameWidth, botSrcH,
      dx - lean, dy + topH + bob, dw, botH);
  }

  /**
   * Build the flipped sheet once. Mirroring via ctx.scale(-1,1) at draw time
   * works but forces a save/restore per sprite; baking it is cheaper and keeps
   * the draw path branch-light.
   */
  private ensureMirrored(): HTMLCanvasElement {
    if (this.mirrored) return this.mirrored;
    const w = this.columns * this.frameWidth;
    const h = this.rows * this.frameHeight;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const c = cv.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.translate(w, 0);
    c.scale(-1, 1);
    c.drawImage(this.image, 0, 0);
    this.mirrored = cv;
    return cv;
  }
}

/**
 * Playback state for one actor. Separate from SpriteSheet so many actors can
 * share a sheet while animating independently.
 */
export class AnimationPlayer {
  sheet: SpriteSheet;
  private name = '';
  private frames: number[] = [0];
  private fps = DEFAULT_FPS;
  private loop = true;
  private flip = false;
  private index = 0;
  private acc = 0;
  private finished = false;

  constructor(sheet: SpriteSheet, initial?: string) {
    this.sheet = sheet;
    if (initial) this.play(initial);
  }

  get currentName(): string {
    return this.name;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** Swap the underlying sheet, keeping the current animation name if it exists. */
  setSheet(sheet: SpriteSheet): void {
    this.sheet = sheet;
    const want = this.name;
    this.name = '';
    if (want) this.play(want);
  }

  /** Start an animation. Re-playing the animation already running is a no-op,
   *  so callers can set state every frame without stuttering. */
  play(name: string, restart = false): void {
    if (this.name === name && !restart) return;
    const anim = this.sheet.getAnimation(name);
    this.name = name;
    this.frames = this.sheet.resolveFrames(name);
    this.fps = anim?.fps ?? DEFAULT_FPS;
    this.loop = anim?.loop ?? true;
    this.flip = anim?.flipX ?? false;
    this.index = 0;
    this.acc = 0;
    this.finished = false;
  }

  update(dt: number): void {
    if (this.finished || this.frames.length <= 1 || this.fps <= 0) return;
    this.acc += dt;
    const step = 1 / this.fps;
    while (this.acc >= step) {
      this.acc -= step;
      this.index++;
      if (this.index >= this.frames.length) {
        if (this.loop) {
          this.index = 0;
        } else {
          this.index = this.frames.length - 1;
          this.finished = true;
          break;
        }
      }
    }
  }

  /** The sheet cell currently showing. */
  get frame(): number {
    return this.frames[Math.min(this.index, this.frames.length - 1)];
  }

  /** True when the animation's own flip disagrees with the caller's. */
  flippedWith(extraFlip: boolean): boolean {
    return this.flip !== extraFlip;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    extraFlip = false,
    scale = 1,
  ): void {
    this.sheet.drawFrame(ctx, this.frame, x, y, this.flippedWith(extraFlip), scale);
  }
}
