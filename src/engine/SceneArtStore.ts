import { font } from './BitmapFont';
import { Colors, ramp } from './Palette';
import { GAME_HEIGHT, GAME_WIDTH, LEGACY_HEIGHT, LEGACY_WIDTH } from './Screen';

/** How a scene's base plate was satisfied, for reporting and for the badge. */
export type ArtSource = 'artwork' | 'painter' | 'placeholder';

export interface LoadedLayer {
  image: CanvasImageSource;
  plane: string;
  opacity: number;
  showIfKey: unknown;
}

/** A painter written against the legacy 320x200 space. */
export type LegacyPainter = (ctx: CanvasRenderingContext2D) => void;

export interface SceneArtRequest {
  sceneId: string;
  /** Path to the finished artwork, if this scene has been converted. */
  background?: string;
  /** Fallback painter, kept until real artwork replaces it. */
  painter?: LegacyPainter;
  /** Human-readable name for the placeholder card. */
  displayName: string;
}

/**
 * Supplies each scene's base plate as a ready-to-blit 640x400 canvas.
 *
 * Resolution order:
 *   1. **External artwork** at the manifest path. Always wins.
 *   2. **The existing procedural painter**, rendered at its native 320x200 and
 *      integer-upscaled. Keeps the game coherent while real art arrives room by
 *      room, rather than turning 30-odd scenes into blank cards overnight.
 *   3. **A labelled placeholder card**, if a scene has neither.
 *
 * Artwork loads asynchronously and swaps in when ready, so dropping a file into
 * `public/assets/backgrounds/` shows up on the next visit to that room with no
 * rebuild and no code change.
 */
export class SceneArtStore {
  private plates = new Map<string, HTMLCanvasElement>();
  private source = new Map<string, ArtSource>();
  private requested = new Set<string>();
  private layerCache = new Map<string, HTMLImageElement | null>();

  /** Scenes still waiting on real artwork, for the startup report. */
  get awaitingArtwork(): string[] {
    return [...this.source.entries()].filter(([, s]) => s !== 'artwork').map(([id]) => id);
  }

  sourceFor(sceneId: string): ArtSource {
    return this.source.get(sceneId) ?? 'placeholder';
  }

  /** The base plate for a scene. Never null - always something drawable. */
  plate(req: SceneArtRequest): HTMLCanvasElement {
    const cached = this.plates.get(req.sceneId);
    if (cached) {
      this.tryArtwork(req);
      return cached;
    }

    const cv = document.createElement('canvas');
    cv.width = GAME_WIDTH;
    cv.height = GAME_HEIGHT;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    if (req.painter) {
      this.paintLegacy(ctx, req.painter);
      this.source.set(req.sceneId, 'painter');
    } else {
      drawPlaceholderCard(ctx, req.displayName, req.background);
      this.source.set(req.sceneId, 'placeholder');
    }

    this.plates.set(req.sceneId, cv);
    this.tryArtwork(req);
    return cv;
  }

  /**
   * Render a 320x200 painter and scale it up by a whole number.
   *
   * Done via an intermediate buffer rather than by scaling the context, because
   * a scaled context would also scale line widths and text, and the painters
   * were written assuming 1:1 pixels.
   */
  private paintLegacy(ctx: CanvasRenderingContext2D, painter: LegacyPainter): void {
    const small = document.createElement('canvas');
    small.width = LEGACY_WIDTH;
    small.height = LEGACY_HEIGHT;
    const sctx = small.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    painter(sctx);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  /** Attempt the external artwork exactly once per scene, in the background. */
  private tryArtwork(req: SceneArtRequest): void {
    if (!req.background || this.requested.has(req.sceneId)) return;
    this.requested.add(req.sceneId);

    loadImage(req.background).then((img) => {
      if (!img) return;
      const cv = this.plates.get(req.sceneId);
      if (!cv) return;
      if (img.naturalWidth !== GAME_WIDTH || img.naturalHeight !== GAME_HEIGHT) {
        console.warn(
          `[art] ${req.background} is ${img.naturalWidth}x${img.naturalHeight}; ` +
            `backgrounds must be exactly ${GAME_WIDTH}x${GAME_HEIGHT}. Ignoring it.`,
        );
        return;
      }
      const ctx = cv.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.drawImage(img, 0, 0);
      this.source.set(req.sceneId, 'artwork');
      console.info(`[art] ${req.sceneId}: using artwork ${req.background}`);
    });
  }

  /**
   * A scene layer. Returns null while loading or if absent - layers are
   * entirely optional and a missing one is never an error.
   */
  layer(src: string): HTMLImageElement | null {
    if (this.layerCache.has(src)) return this.layerCache.get(src) ?? null;
    this.layerCache.set(src, null);
    loadImage(src).then((img) => {
      if (img) this.layerCache.set(src, img);
    });
    return null;
  }

  /** Force a scene to be rebuilt, e.g. after art is hot-swapped. */
  invalidate(sceneId: string): void {
    this.plates.delete(sceneId);
    this.requested.delete(sceneId);
  }
}

function loadOne(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Load an image, trying sensible alternative extensions.
 *
 * The manifest names a .webp, but an artist may reasonably deliver .png. Rather
 * than making that a silent blank screen, try the declared path first and fall
 * back through the other formats we can display.
 */
async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const direct = await loadOne(src);
  if (direct) return direct;
  const base = src.replace(/\.(webp|png|jpg|jpeg)$/i, '');
  for (const ext of ['.png', '.webp', '.jpg']) {
    const alt = base + ext;
    if (alt === src) continue;
    const img = await loadOne(alt);
    if (img) {
      console.info(`[art] ${src} not found; using ${alt}`);
      return img;
    }
  }
  return null;
}

/**
 * The "this room has no art yet" card.
 *
 * Deliberately not decorative: a flat ground, a diagonal hatch and the exact
 * file path the engine is looking for. It must never be mistaken for artwork.
 */
export function drawPlaceholderCard(
  ctx: CanvasRenderingContext2D,
  displayName: string,
  expectedPath?: string,
): void {
  ctx.fillStyle = ramp('neutral', 1);
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.strokeStyle = ramp('neutral', 2);
  ctx.lineWidth = 2;
  for (let x = -GAME_HEIGHT; x < GAME_WIDTH; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + GAME_HEIGHT, GAME_HEIGHT);
    ctx.stroke();
  }

  const boxW = 460;
  const boxH = 128;
  const bx = (GAME_WIDTH - boxW) / 2;
  const by = (GAME_HEIGHT - boxH) / 2 - 20;
  ctx.fillStyle = Colors.ink;
  ctx.fillRect(bx, by, boxW, boxH);
  ctx.strokeStyle = ramp('amber', 2);
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, boxW, boxH);

  font.draw(ctx, displayName.toUpperCase(), GAME_WIDTH / 2, by + 20, {
    color: Colors.paper,
    align: 'center',
  });
  font.draw(ctx, 'ARTWORK PLACEHOLDER', GAME_WIDTH / 2, by + 52, {
    color: ramp('amber', 2),
    align: 'center',
  });
  font.draw(ctx, `${GAME_WIDTH} x ${GAME_HEIGHT}`, GAME_WIDTH / 2, by + 76, {
    color: ramp('neutral', 4),
    align: 'center',
  });
  if (expectedPath) {
    font.draw(ctx, expectedPath, GAME_WIDTH / 2, by + 100, {
      color: ramp('cyan', 2),
      align: 'center',
    });
  }
}

/** Small corner badge marking a room that is still on fallback art. */
export function drawArtBadge(ctx: CanvasRenderingContext2D, source: ArtSource): void {
  if (source === 'artwork') return;
  const label = source === 'painter' ? 'PLACEHOLDER ART' : 'NO ARTWORK';
  const w = font.measure(label) + 12;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = Colors.ink;
  ctx.fillRect(GAME_WIDTH - w - 6, 6, w, 22);
  ctx.globalAlpha = 1;
  font.draw(ctx, label, GAME_WIDTH - w / 2 - 6, 13, {
    color: ramp('amber', 2),
    align: 'center',
  });
}
