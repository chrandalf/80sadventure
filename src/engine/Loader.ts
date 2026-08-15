import { Colors, ramp } from './Palette';
import {
  resolveSpriteDef, SpriteSheet,
  type PlaceholderHint, type SpriteDef, type SpriteManifest,
} from './Sprite';

/**
 * Loads sprite sheets described by `assets/sprites/manifest.json`.
 *
 * The important property: a missing PNG is NOT an error. The loader builds a
 * palette-correct, correctly-sized, actually-animating stand-in from the
 * manifest entry's `placeholder` hint. The game is fully playable with zero art
 * on disk, and each finished sprite can be dropped in one at a time without a
 * code change or even a restart of the content work.
 */
export class AssetStore {
  private sheets = new Map<string, SpriteSheet>();
  private manifest: SpriteManifest = { sprites: {} };
  private missing: string[] = [];
  private baseUrl: string;

  constructor(baseUrl = 'assets/sprites/') {
    this.baseUrl = baseUrl;
  }

  /** Every sprite id that fell back to a generated placeholder. */
  get missingArt(): readonly string[] {
    return this.missing;
  }

  get spriteIds(): string[] {
    return Object.keys(this.manifest.sprites);
  }

  async loadManifest(url = `${this.baseUrl}manifest.json`): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Cannot load sprite manifest at ${url} (${res.status})`);
    this.manifest = (await res.json()) as SpriteManifest;
  }

  /** Load every sprite in the manifest, in parallel. Never rejects on a missing file. */
  async loadAll(onProgress?: (done: number, total: number) => void): Promise<void> {
    const ids = this.spriteIds;
    let done = 0;
    await Promise.all(
      ids.map(async (id) => {
        await this.load(id);
        done++;
        onProgress?.(done, ids.length);
      }),
    );
    if (this.missing.length) {
      console.warn(
        `[assets] ${this.missing.length}/${ids.length} sprites are placeholders:\n  ` +
          this.missing.join('\n  ') +
          `\nDrop the real PNGs into ${this.baseUrl} and run \`npm run assets:validate\`.`,
      );
    }
  }

  private async load(id: string): Promise<SpriteSheet> {
    const cached = this.sheets.get(id);
    if (cached) return cached;

    const raw = this.manifest.sprites[id];
    const def = raw ? resolveSpriteDef(raw, this.manifest.templates) : undefined;
    if (!def) {
      // Unknown id - still return something drawable so one typo in content
      // data cannot take the whole game down mid-scene.
      const fallback = new SpriteSheet(
        id,
        buildPlaceholder(id, { frameWidth: 16, frameHeight: 16, columns: 1, rows: 1, file: '' }),
        { file: '', frameWidth: 16, frameHeight: 16, columns: 1, rows: 1 },
        true,
      );
      this.sheets.set(id, fallback);
      this.missing.push(`${id} (not in manifest)`);
      return fallback;
    }

    let sheet: SpriteSheet;
    const img = def.file ? await tryLoadImage(this.baseUrl + def.file) : null;

    if (img && dimensionsMatch(img, def)) {
      sheet = new SpriteSheet(id, img, def);
    } else {
      if (img) {
        console.warn(
          `[assets] ${id}: ${def.file} is ${img.width}x${img.height} but the manifest ` +
            `declares ${def.columns * def.frameWidth}x${def.rows * def.frameHeight} ` +
            `(${def.columns}x${def.rows} frames of ${def.frameWidth}x${def.frameHeight}). ` +
            `Using a placeholder. Fix the PNG or the manifest entry.`,
        );
      }
      sheet = new SpriteSheet(id, buildPlaceholder(id, def), def, true);
      this.missing.push(`${id} -> ${def.file || '(no file)'}`);
    }

    this.sheets.set(id, sheet);
    return sheet;
  }

  /** Get a loaded sheet. Throws only if `loadAll` was never run. */
  get(id: string): SpriteSheet {
    const s = this.sheets.get(id);
    if (!s) throw new Error(`Sprite "${id}" was not loaded. Call loadAll() first.`);
    return s;
  }

  has(id: string): boolean {
    return this.sheets.has(id);
  }
}

function dimensionsMatch(img: HTMLImageElement, def: SpriteDef): boolean {
  return (
    img.width === def.columns * def.frameWidth && img.height === def.rows * def.frameHeight
  );
}

function tryLoadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Draw a stand-in sheet at exactly the declared frame geometry.
 *
 * These are deliberately readable rather than pretty: correct silhouette size,
 * palette colours, and per-frame motion so timing and staging can be tuned
 * before any real art exists.
 */
function buildPlaceholder(id: string, def: SpriteDef): HTMLCanvasElement {
  const hint: PlaceholderHint = def.placeholder ?? {};
  const kind = hint.kind ?? guessKind(def);
  const primary = hint.primary ?? pickColor(id, 0);
  const secondary = hint.secondary ?? pickColor(id, 1);

  const fw = def.frameWidth;
  const fh = def.frameHeight;
  const cols = Math.max(1, def.columns);
  const rows = Math.max(1, def.rows);

  const cv = document.createElement('canvas');
  cv.width = fw * cols;
  cv.height = fh * rows;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      c.save();
      c.translate(col * fw, r * fh);
      drawPlaceholderFrame(c, kind, fw, fh, col, r, primary, secondary);
      c.restore();
    }
  }
  return cv;
}

function guessKind(def: SpriteDef): NonNullable<PlaceholderHint['kind']> {
  if (def.frameHeight >= 24 && def.frameHeight > def.frameWidth * 1.3) return 'humanoid';
  if (def.frameWidth >= 64 || def.frameHeight >= 64) return 'panel';
  return 'object';
}

/** Deterministic colour choice from the id, so a given sprite always looks the same. */
function pickColor(id: string, offset: number): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const names = ['magenta', 'cyan', 'violet', 'amber', 'phosphor', 'blue'];
  const name = names[(h + offset * 3) % names.length];
  return ramp(name, offset === 0 ? 2 : 1);
}

function drawPlaceholderFrame(
  c: CanvasRenderingContext2D,
  kind: NonNullable<PlaceholderHint['kind']>,
  w: number,
  h: number,
  col: number,
  row: number,
  primary: string,
  secondary: string,
): void {
  // Every placeholder gets a dashed-looking border so it reads instantly as
  // "art not final" even in a screenshot.
  const border = () => {
    c.fillStyle = secondary;
    for (let x = 0; x < w; x += 2) {
      c.fillRect(x, 0, 1, 1);
      c.fillRect(x, h - 1, 1, 1);
    }
    for (let y = 0; y < h; y += 2) {
      c.fillRect(0, y, 1, 1);
      c.fillRect(w - 1, y, 1, 1);
    }
  };

  if (kind === 'humanoid') {
    const bob = col % 2 === 0 ? 0 : 1;
    const headR = Math.max(2, Math.floor(w * 0.28));
    const cx = Math.floor(w / 2);

    // Legs - offset per frame so the walk cycle visibly animates.
    const legSpread = (col % 4 === 1 ? 2 : col % 4 === 3 ? -2 : 0);
    c.fillStyle = secondary;
    c.fillRect(cx - 3 + legSpread, h - Math.floor(h * 0.3), 2, Math.floor(h * 0.3) - 1);
    c.fillRect(cx + 1 - legSpread, h - Math.floor(h * 0.3), 2, Math.floor(h * 0.3) - 1);

    // Torso
    c.fillStyle = primary;
    const torsoTop = headR * 2 + 1 + bob;
    c.fillRect(cx - Math.floor(w * 0.25), torsoTop, Math.floor(w * 0.5), h - Math.floor(h * 0.3) - torsoTop);

    // Head
    c.fillStyle = Colors.paper;
    c.beginPath();
    c.arc(cx, headR + 1 + bob, headR, 0, Math.PI * 2);
    c.fill();

    // Facing pip - which way this row looks, so direction rows are tellable apart.
    c.fillStyle = Colors.ink;
    const pipX = row === 1 ? cx + headR - 2 : row === 3 ? cx - headR + 1 : cx;
    if (row !== 2) c.fillRect(pipX, headR + bob, 1, 1);

    border();
    return;
  }

  if (kind === 'panel') {
    c.fillStyle = Colors.uiPanel;
    c.fillRect(0, 0, w, h);
    c.fillStyle = primary;
    // Diagonal hatching reads clearly as a placeholder backdrop.
    for (let d = -h; d < w; d += 8) {
      for (let y = 0; y < h; y++) {
        const x = d + y;
        if (x >= 0 && x < w) c.fillRect(x, y, 1, 1);
      }
    }
    border();
    return;
  }

  if (kind === 'blob') {
    c.fillStyle = primary;
    c.beginPath();
    c.ellipse(w / 2, h / 2, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
    c.fill();
    border();
    return;
  }

  // 'object' / 'prop': a solid block with a highlight corner.
  c.fillStyle = primary;
  c.fillRect(1, 1, w - 2, h - 2);
  c.fillStyle = secondary;
  c.fillRect(1, 1, Math.max(1, Math.floor(w / 3)), Math.max(1, Math.floor(h / 3)));
  border();
}
