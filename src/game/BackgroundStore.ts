import { GAME_HEIGHT, GAME_WIDTH } from '../engine/Screen';
import { BACKGROUNDS, paintUnknown } from '../content/backgrounds';
import { snapToPalette } from './paint';

/**
 * Supplies each scene's backdrop, cached as a ready-to-blit canvas.
 *
 * Resolution order, per background id:
 *   1. `assets/backgrounds/<id>.png` if it exists  - hand-drawn art wins
 *   2. the code painter in content/backgrounds.ts  - always available
 *   3. a loud "NO BACKGROUND" grid                 - so a typo is obvious
 *
 * The painter runs immediately so the scene is never blank, and the PNG swaps
 * in when it finishes loading. That means an artist can drop a finished
 * background into the folder and see it in the running game on the next visit
 * to that room, with no rebuild and no code change.
 */
export class BackgroundStore {
  private cache = new Map<string, HTMLCanvasElement>();
  private pngChecked = new Set<string>();
  private baseUrl: string;
  /** Ids that resolved to a real PNG rather than the painter. */
  readonly overridden = new Set<string>();

  constructor(baseUrl = 'assets/backgrounds/') {
    this.baseUrl = baseUrl;
  }

  get(id: string): HTMLCanvasElement {
    const cached = this.cache.get(id);
    if (cached) {
      this.maybeLoadPng(id);
      return cached;
    }

    const cv = document.createElement('canvas');
    cv.width = GAME_WIDTH;
    cv.height = GAME_HEIGHT;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const painter = BACKGROUNDS[id];
    if (painter) painter(ctx);
    else paintUnknown(ctx, id);

    // Painters may use curves, gradients and anti-aliased fills; this is what
    // brings the result back onto the locked palette.
    snapToPalette(ctx);

    this.cache.set(id, cv);
    this.maybeLoadPng(id);
    return cv;
  }

  /** Try the PNG override exactly once per id, in the background. */
  private maybeLoadPng(id: string): void {
    if (this.pngChecked.has(id)) return;
    this.pngChecked.add(id);

    const img = new Image();
    img.onload = () => {
      if (img.width !== GAME_WIDTH || img.height !== GAME_HEIGHT) {
        console.warn(
          `[backgrounds] ${id}.png is ${img.width}x${img.height}; backgrounds must be ` +
            `exactly ${GAME_WIDTH}x${GAME_HEIGHT}. Keeping the painted version.`,
        );
        return;
      }
      const cv = this.cache.get(id);
      if (!cv) return;
      const ctx = cv.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.drawImage(img, 0, 0);
      this.overridden.add(id);
    };
    img.onerror = () => {
      /* No PNG for this room. The painter already covered it. */
    };
    img.src = `${this.baseUrl}${id}.png`;
  }

  /** Force a repaint, e.g. after a scene's state changes its lighting. */
  invalidate(id: string): void {
    this.cache.delete(id);
    this.pngChecked.delete(id);
  }
}
