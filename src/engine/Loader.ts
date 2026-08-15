import { font } from './BitmapFont';
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

  const label = hint.label ?? id.split('.').pop() ?? id;
  const ax = def.anchorX ?? Math.floor(fw / 2);
  const ay = def.anchorY ?? fh;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      c.save();
      c.translate(col * fw, r * fh);
      drawPlaceholderFrame(c, kind, fw, fh, col, r, primary, secondary, label, ax, ay);
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

/**
 * Draw one placeholder frame.
 *
 * Deliberately not an attempt at the character. The brief is explicit that
 * missing art must be an obvious labelled placeholder rather than programmer-art
 * standing in for a person: a dashed box, the sprite's label, the frame index
 * and a marker at the anchor point so staging can still be checked. It should
 * be impossible to mistake this for artwork.
 */
function drawPlaceholderFrame(
  c: CanvasRenderingContext2D,
  kind: NonNullable<PlaceholderHint['kind']>,
  w: number,
  h: number,
  col: number,
  row: number,
  primary: string,
  secondary: string,
  label: string,
  anchorX: number,
  anchorY: number,
): void {
  // Translucent fill so the background stays readable behind it.
  c.globalAlpha = 0.34;
  c.fillStyle = primary;
  c.fillRect(1, 1, w - 2, h - 2);
  c.globalAlpha = 1;

  // Dashed border.
  c.fillStyle = secondary;
  for (let x = 0; x < w; x += 3) {
    c.fillRect(x, 0, 2, 1);
    c.fillRect(x, h - 1, 2, 1);
  }
  for (let y = 0; y < h; y += 3) {
    c.fillRect(0, y, 1, 2);
    c.fillRect(w - 1, y, 1, 2);
  }

  // Anchor marker - where this sprite meets the floor.
  c.fillStyle = ramp('magenta', 2);
  c.fillRect(anchorX - 2, Math.min(h - 1, anchorY - 1), 5, 1);
  c.fillRect(anchorX, Math.min(h - 1, anchorY - 3), 1, 3);

  // Label, only where there is room for it.
  if (w >= 20 && h >= 16) {
    font.draw(c, label.slice(0, Math.max(1, Math.floor(w / 6))), Math.floor(w / 2), 2, {
      color: Colors.paper,
      align: 'center',
    });
    font.draw(c, `${row}:${col}`, Math.floor(w / 2), h - 10, {
      color: ramp('amber', 2),
      align: 'center',
    });
  }
  void kind;
}
