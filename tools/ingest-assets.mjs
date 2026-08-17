/**
 * Ingest externally generated artwork into the game.
 *
 *   node tools/ingest-assets.mjs <incoming-dir> [--dry] [--force]
 *
 * Generative image APIs return whatever size and aspect they feel like, with
 * soft alpha and generous padding. The game wants exact dimensions, binary
 * alpha and a specific file path. This bridges the two so nobody hand-crops
 * ninety-two images.
 *
 * Matching: a file is matched to an asset by its basename, tried as the asset
 * id (`bg.starlight_arcade.png`), the id with dots as underscores, or the
 * basename of the asset's declared path (`starlight_arcade.png`).
 *
 * Fitting depends on what the asset is:
 *   - full-screen plates (640x400)  cover-crop, then area-average downscale
 *   - sprites, icons, portraits     trim to the alpha bounding box, then fit
 *                                   inside the frame, anchored to the bottom
 *   - character sheets              see buildStillSheet() below
 *
 * Input must be PNG - pngjs cannot decode WebP or JPEG. Ask the generator for
 * `output_format: "png"`.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';
import { PNG } from 'pngjs';

/**
 * JPEG support is optional, and loaded rather than imported.
 *
 * A static import makes the package mandatory: someone who pulls the repo and
 * runs ingest before `npm install` gets a module-not-found crash and no
 * artwork at all - including the PNG work that never needed the decoder. A
 * missing optional package should cost the one format it decodes, nothing
 * more.
 */
let jpeg = null;
try {
  jpeg = (await import('jpeg-js')).default;
} catch {
  /* Reported at the point a JPEG is actually found, where it means something. */
}
import { ROOT, c } from './lib.mjs';

const ASSETS_JSON = resolve(ROOT, 'public/assets/assets.json');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const force = args.includes('--force');
const incoming = args.find((a) => !a.startsWith('--'));

if (!incoming) {
  console.error('usage: node tools/ingest-assets.mjs <incoming-dir> [--dry] [--force]');
  process.exit(2);
}

/* ------------------------------------------------------------------ pixels */

/** Straight-alpha RGBA at a pixel. */
function px(img, x, y) {
  const i = (y * img.width + x) << 2;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

/**
 * Area-average resample, done in premultiplied alpha.
 *
 * Averaging straight RGB across a transparent edge drags the colour of
 * whatever the generator left in the invisible pixels into the visible ones,
 * which is where dark halos around sprites come from.
 */
/**
 * Decode an image by its bytes rather than its file extension.
 *
 * Generators do not agree on format: one answers with PNG, another with JPEG
 * regardless of what was asked for, and a file's name says nothing about
 * either. Rejecting on extension meant an entire paid-for run of a provider
 * that returns JPEG was unusable. JPEG has no alpha, which is fine here -
 * every cut-out asset is chroma-keyed off a flat magenta field during ingest
 * anyway, and that key works the same on either format.
 */
function decodeImage(buf) {
  const magic = buf.subarray(0, 4).toString('hex');
  if (magic === '89504e47') return PNG.sync.read(buf);
  if (magic.startsWith('ffd8ff')) {
    if (!jpeg) throw new Error('a JPEG, and the jpeg-js decoder is not installed - run `npm install`');
    const raw = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    const img = new PNG({ width: raw.width, height: raw.height });
    img.data.set(raw.data);
    return img;
  }
  const head = buf.subarray(0, 5).toString('utf8');
  if (head.startsWith('data:')) {
    throw new Error('a base64 data URL saved verbatim, not an image');
  }
  if (head.trimStart().startsWith('{')) {
    throw new Error('JSON - the generator returned an error, not an image');
  }
  throw new Error(`unrecognised format (starts ${magic})`);
}

function resample(src, sx, sy, sw, sh, dw, dh) {
  const out = new PNG({ width: dw, height: dh });
  for (let y = 0; y < dh; y++) {
    const y0 = sy + (y * sh) / dh;
    const y1 = sy + ((y + 1) * sh) / dh;
    for (let x = 0; x < dw; x++) {
      const x0 = sx + (x * sw) / dw;
      const x1 = sx + ((x + 1) * sw) / dw;
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const yi0 = Math.floor(y0), yi1 = Math.max(yi0 + 1, Math.ceil(y1));
      const xi0 = Math.floor(x0), xi1 = Math.max(xi0 + 1, Math.ceil(x1));
      for (let yy = yi0; yy < yi1; yy++) {
        if (yy < 0 || yy >= src.height) continue;
        for (let xx = xi0; xx < xi1; xx++) {
          if (xx < 0 || xx >= src.width) continue;
          const [pr, pg, pb, pa] = px(src, xx, yy);
          const m = pa / 255;
          r += pr * m; g += pg * m; b += pb * m; a += pa; n++;
        }
      }
      const i = (y * dw + x) << 2;
      if (!n || a === 0) { out.data[i] = out.data[i + 1] = out.data[i + 2] = out.data[i + 3] = 0; continue; }
      const am = a / n / 255;
      out.data[i] = Math.round(r / n / am);
      out.data[i + 1] = Math.round(g / n / am);
      out.data[i + 2] = Math.round(b / n / am);
      out.data[i + 3] = Math.round(a / n);
    }
  }
  return out;
}

/** Bounding box of pixels above the alpha threshold, or null if fully clear. */
function alphaBounds(img, threshold = 16) {
  let minX = img.width, minY = img.height, maxX = -1, maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[((y * img.width + x) << 2) + 3] < threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Some generators return an opaque checkerboard or flat backdrop instead of
 * real transparency. Detect a uniform border and knock it out, so a sprite that
 * was asked for with alpha still ends up with alpha.
 */
function keyOutFlatBorder(img, tolerance = 12) {
  const corners = [
    px(img, 0, 0), px(img, img.width - 1, 0),
    px(img, 0, img.height - 1), px(img, img.width - 1, img.height - 1),
  ];
  if (corners.some((p) => p[3] < 250)) return false; // already has alpha
  const [r0, g0, b0] = corners[0];

  /*
   * A deliberate chroma key is a saturated colour nothing in the artwork uses,
   * so it can be keyed generously; an incidental flat backdrop (a white or grey
   * studio sweep) sits close to real subject colours and must not be. Widen the
   * tolerance only for the former, which also eats the anti-aliased fringe the
   * renderer leaves around the silhouette.
   */
  const saturation = Math.max(r0, g0, b0) - Math.min(r0, g0, b0);
  const tol = saturation > 100 ? Math.max(tolerance, 72) : tolerance;

  const near = (p) => Math.abs(p[0] - r0) <= tol && Math.abs(p[1] - g0) <= tol && Math.abs(p[2] - b0) <= tol;
  if (!corners.every(near)) return false;

  // Flood from the border only, so a same-coloured region inside stays opaque.
  const seen = new Uint8Array(img.width * img.height);
  const stack = [];
  for (let x = 0; x < img.width; x++) { stack.push([x, 0], [x, img.height - 1]); }
  for (let y = 0; y < img.height; y++) { stack.push([0, y], [img.width - 1, y]); }
  let cleared = 0;
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
    const k = y * img.width + x;
    if (seen[k]) continue;
    seen[k] = 1;
    if (!near(px(img, x, y))) continue;
    img.data[(k << 2) + 3] = 0;
    cleared++;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  if (cleared && saturation > 100) cleared += erodeKeyFringe(img, [r0, g0, b0]);
  return cleared > 0;
}

/**
 * Remove the rim where the subject's outline was blended into the key colour.
 *
 * Those pixels are a mix of the two, so they fall outside the flood's tolerance
 * and survive it - as a purple halo once the key colour is gone. Anything still
 * pulled towards the key and touching transparency is part of that rim, so it
 * goes too. Two passes, because the blend is rarely wider than that and eating
 * further would start taking the outline itself.
 */
function erodeKeyFringe(img, [kr, kg, kb], passes = 2) {
  const { width: w, height: h } = img;
  let removed = 0;
  for (let pass = 0; pass < passes; pass++) {
    const doomed = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = y * w + x;
        if (img.data[(k << 2) + 3] === 0) continue;
        const touchesClear =
          (x > 0 && img.data[((k - 1) << 2) + 3] === 0) ||
          (x < w - 1 && img.data[((k + 1) << 2) + 3] === 0) ||
          (y > 0 && img.data[((k - w) << 2) + 3] === 0) ||
          (y < h - 1 && img.data[((k + w) << 2) + 3] === 0);
        if (!touchesClear) continue;
        const [r, g, b] = px(img, x, y);
        // Halfway to the key colour or closer, in the direction the key pulls.
        const pull = (c, kc) => (kc > 127 ? c > (kc + 96) / 2 : c < kc + 64);
        if (pull(r, kr) && pull(g, kg) && pull(b, kb)) doomed.push(k);
      }
    }
    if (!doomed.length) break;
    for (const k of doomed) img.data[(k << 2) + 3] = 0;
    removed += doomed.length;
  }
  return removed;
}

/** Alpha must be all-or-nothing; soft edges halo badly under integer scaling. */
function binarise(img, threshold = 128) {
  for (let i = 3; i < img.data.length; i += 4) {
    img.data[i] = img.data[i] >= threshold ? 255 : 0;
  }
}

function opaque(img) {
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
}

function blank(w, h) {
  const p = new PNG({ width: w, height: h });
  p.data.fill(0);
  return p;
}

/** Centre-crop an image to a width, for a gesture that overruns its cell. */
function cropWidth(src, w) {
  const out = blank(w, src.height);
  const sx = Math.floor((src.width - w) / 2);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * src.width + (sx + x)) << 2;
      const d = (y * w + x) << 2;
      out.data[d] = src.data[s];
      out.data[d + 1] = src.data[s + 1];
      out.data[d + 2] = src.data[s + 2];
      out.data[d + 3] = src.data[s + 3];
    }
  }
  return out;
}

function blit(dst, src, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dst.width) continue;
      const s = (y * src.width + x) << 2;
      if (src.data[s + 3] === 0) continue;
      const d = (ty * dst.width + tx) << 2;
      dst.data[d] = src.data[s];
      dst.data[d + 1] = src.data[s + 1];
      dst.data[d + 2] = src.data[s + 2];
      dst.data[d + 3] = src.data[s + 3];
    }
  }
}

/* ------------------------------------------------------------------- fits */

/** Fill the frame edge to edge, cropping the overflow. For opaque plates. */
function fitCover(src, w, h) {
  const scale = Math.max(w / src.width, h / src.height);
  const cw = Math.min(src.width, Math.round(w / scale));
  const ch = Math.min(src.height, Math.round(h / scale));
  return resample(src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch, w, h);
}

/**
 * Trim the padding, then fit the whole subject inside the frame without
 * cropping, sitting it on the bottom edge - sprites are anchored at their feet,
 * so vertical centring would make characters hover.
 */
function fitContain(src, w, h, { bottom = true } = {}) {
  const b = alphaBounds(src) ?? { x: 0, y: 0, w: src.width, h: src.height };
  const scale = Math.min(w / b.w, h / b.h);
  const dw = Math.max(1, Math.round(b.w * scale));
  const dh = Math.max(1, Math.round(b.h * scale));
  const shrunk = resample(src, b.x, b.y, b.w, b.h, dw, dh);
  const out = blank(w, h);
  blit(out, shrunk, Math.round((w - dw) / 2), bottom ? h - dh : Math.round((h - dh) / 2));
  return out;
}

/**
 * Build a sprite sheet from a single standing figure.
 *
 * No image model produces a frame-accurate 6x4 animation grid with a
 * consistent character across all 24 cells - it produces something that looks
 * like a sprite sheet and animates like a flip-book of different people. So
 * when the delivered file is not already a real sheet, the one good pose is
 * copied into every cell. The character renders correctly, stands, turns and
 * talks; it just does not yet move its legs. Replace the file with a genuine
 * sheet later and nothing else has to change.
 */
function buildStillSheet(src, anim) {
  const { frameWidth: fw, frameHeight: fh, columns, rows } = anim;
  const frame = fitContain(src, fw, fh);
  const sheet = blank(fw * columns, fh * rows);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < columns; col++) blit(sheet, frame, col * fw, r * fh);
  }
  return sheet;
}

/** An already-authored sheet: exact size, or an exact integer multiple of it. */
function isRealSheet(src, w, h) {
  if (src.width === w && src.height === h) return true;
  const k = src.width / w;
  return k >= 2 && Number.isInteger(k) && src.height === h * k;
}

/* ------------------------------------------------------------------- main */

const manifest = JSON.parse(readFileSync(ASSETS_JSON, 'utf8'));

/** Every name an asset may reasonably arrive under. */
function aliases(asset) {
  const fromPath = basename(asset.path).replace(/\.\w+$/, '');
  return new Set([asset.id, asset.id.replace(/\./g, '_'), asset.id.replace(/\./g, '-'), fromPath]);
}

const byAlias = new Map();
for (const asset of manifest.assets) {
  for (const a of aliases(asset)) {
    if (!byAlias.has(a)) byAlias.set(a, asset);
  }
}

const dir = resolve(process.cwd(), incoming);
if (!existsSync(dir)) {
  console.error(c.red(`no such directory: ${dir}`));
  process.exit(2);
}

// Skip dotfiles and the unpacker's own _errors.log, which would otherwise be
// reported as an unrecognised asset every single run.
const files = readdirSync(dir).filter((f) => !f.startsWith('.') && !f.startsWith('_'));
const written = [];
const skipped = [];
const unmatched = [];
const failed = [];

/** Poses waiting to be folded into a sheet, keyed by the sheet they belong to. */
const poseSets = new Map();

for (const file of files) {
  const stem = basename(file, extname(file));
  const asset = byAlias.get(stem);
  if (!asset) { unmatched.push(file); continue; }

  let src;
  try {
    src = decodeImage(readFileSync(resolve(dir, file)));
  } catch (e) {
    failed.push([file, `unreadable: ${e.message}`]);
    continue;
  }

  // A pose is not an asset on its own - it is one cell of a sheet. Hold it and
  // assemble once every pose of that character has been read.
  if (asset.type === 'character-pose' && asset.assemble) {
    keyOutFlatBorder(src);
    const set = poseSets.get(asset.assemble.sheet) ?? { asset, poses: [] };
    set.poses.push({ id: asset.id, img: src, cells: asset.assemble.cells });
    poseSets.set(asset.assemble.sheet, set);
    continue;
  }

  const { width: w, height: h } = asset.dimensions;
  const wantsAlpha = asset.transparency === 'alpha-required';
  const fullScreen = w === manifest.renderResolution.width && h === manifest.renderResolution.height;

  let out;
  let how;
  if (asset.type === 'character-sheet') {
    if (isRealSheet(src, w, h)) {
      out = src.width === w ? src : resample(src, 0, 0, src.width, src.height, w, h);
      how = 'sheet';
    } else {
      if (wantsAlpha) keyOutFlatBorder(src);
      out = buildStillSheet(src, asset.animation);
      how = `still x${asset.animation.columns * asset.animation.rows}`;
    }
  } else if (fullScreen) {
    // Rain, dust and glow span the whole frame; letterboxing them would leave
    // transparent bands across the screen. Crop rather than contain.
    if (wantsAlpha) keyOutFlatBorder(src);
    out = fitCover(src, w, h);
    how = 'cover';
  } else {
    if (wantsAlpha) keyOutFlatBorder(src);
    out = wantsAlpha ? fitContain(src, w, h, { bottom: asset.type !== 'portrait' }) : fitCover(src, w, h);
    how = wantsAlpha ? 'trim+contain' : 'cover';
  }

  if (wantsAlpha) binarise(out); else opaque(out);

  // The loader tries .png before the .webp named in the manifest, so writing
  // PNG here needs no manifest edit and no rebuild.
  const dest = resolve(ROOT, 'public' + asset.path.replace(/\.(webp|jpe?g)$/i, '.png'));
  if (existsSync(dest) && !force) { skipped.push([asset.id, 'exists, use --force']); continue; }

  if (!dry) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, PNG.sync.write(out));
  }
  written.push([asset.id, `${src.width}x${src.height} -> ${w}x${h} ${how}`]);
}

/* --------------------------------------------------------------- assemble */

for (const [sheetId, set] of poseSets) {
  const sheetAsset = manifest.assets.find((a) => a.id === sheetId);
  if (!sheetAsset) {
    failed.push([sheetId, 'poses supplied for a sheet that is not in the manifest']);
    continue;
  }
  const { frameWidth: fw, frameHeight: fh, columns, rows } = sheetAsset.animation;

  const trimmed = set.poses.map((pose) => {
    const b = alphaBounds(pose.img) ?? { x: 0, y: 0, w: pose.img.width, h: pose.img.height };
    return { ...pose, bounds: b };
  });

  /*
   * One scale for the whole set, taken from the tallest pose.
   *
   * Scaling each pose to fill its own cell would make the character grow and
   * shrink between frames, because a walking figure's bounding box is a
   * different shape from a standing one. Sizing them all together keeps the
   * head at a constant height and the feet on the ground.
   */
  /*
   * Height alone decides the scale.
   *
   * It used to be `min(fh / tallest, fw / widest)`, so one pose drawn with the
   * arms out - hands on hips, a raised hand mid-sentence - made the whole set
   * scale down to fit that width, and the character then stood a head shorter
   * than everyone else in the game for the rest of the run. Width belongs to
   * one gesture; height is the person. A gesture that overflows its cell is
   * cropped at the edges instead, which costs a few pixels of fingertip and is
   * invisible next to a character two thirds the size of their friends.
   */
  const tallest = Math.max(...trimmed.map((t) => t.bounds.h));
  const scale = fh / tallest;
  let cropped = 0;

  const sheet = blank(fw * columns, fh * rows);
  const filled = new Set();
  let standing = null;

  for (const pose of trimmed) {
    const dw = Math.max(1, Math.round(pose.bounds.w * scale));
    const dh = Math.max(1, Math.round(pose.bounds.h * scale));
    let cell = resample(pose.img, pose.bounds.x, pose.bounds.y, pose.bounds.w, pose.bounds.h, dw, dh);
    binarise(cell);
    // A gesture wider than its cell is trimmed evenly from both sides: blit
    // clips against the sheet rather than the cell, so an overwide pose would
    // otherwise spill into the neighbouring frame.
    if (cell.width > fw) {
      cell = cropWidth(cell, fw);
      cropped++;
    }
    // Bottom-centred: the anchor is the soles of the feet.
    const ox = Math.round((fw - cell.width) / 2);
    const oy = fh - dh;
    for (const { row, col } of pose.cells) {
      blit(sheet, cell, col * fw + ox, row * fh + oy);
      filled.add(`${row},${col}`);
    }
    if (pose.id.endsWith('front_stand')) standing = { cell, ox, oy };

    /*
     * Keep the fitted pose at the path the manifest gives it.
     *
     * Poses are consumed rather than installed, so without this there is no
     * record on disk that one arrived - and `--missing` would ask for all sixty
     * again after a run that only failed forty. It also means the sheet can be
     * rebuilt later, after a cell-size change, without the originals.
     */
    const poseAsset = manifest.assets.find((a) => a.id === pose.id);
    if (poseAsset && !dry) {
      const kept = blank(fw, fh);
      blit(kept, cell, ox, oy);
      const at = resolve(ROOT, 'public' + poseAsset.path.replace(/\.(webp|jpe?g)$/i, '.png'));
      mkdirSync(dirname(at), { recursive: true });
      writeFileSync(at, PNG.sync.write(kept));
    }
  }

  // Any cell no supplied pose claims falls back to standing, so a pose that
  // failed to generate costs that movement rather than the whole character.
  const fallback = standing ?? (() => {
    const first = trimmed[0];
    if (!first) return null;
    const dw = Math.max(1, Math.round(first.bounds.w * scale));
    const dh = Math.max(1, Math.round(first.bounds.h * scale));
    const cell = resample(first.img, first.bounds.x, first.bounds.y, first.bounds.w, first.bounds.h, dw, dh);
    binarise(cell);
    return { cell, ox: Math.round((fw - dw) / 2), oy: fh - dh };
  })();

  let gaps = 0;
  if (fallback) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if (filled.has(`${row},${col}`)) continue;
        blit(sheet, fallback.cell, col * fw + fallback.ox, row * fh + fallback.oy);
        gaps++;
      }
    }
  }

  const dest = resolve(ROOT, 'public' + sheetAsset.path.replace(/\.(webp|jpe?g)$/i, '.png'));
  if (existsSync(dest) && !force) {
    skipped.push([sheetId, `assembled from ${set.poses.length} poses, but a sheet exists - use --force`]);
    continue;
  }
  if (!dry) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, PNG.sync.write(sheet));
  }
  written.push([sheetId, `${set.poses.length} poses -> ${fw * columns}x${fh * rows}${cropped ? `, ${cropped} wide poses cropped` : ''}${gaps ? `, ${gaps} cells filled from the standing pose` : ''}`]);
}

/* ----------------------------------------------------------------- report */

const have = new Set(written.map(([id]) => id));
const missing = manifest.assets.filter((a) => {
  if (have.has(a.id)) return false;
  const dest = resolve(ROOT, 'public' + a.path.replace(/\.(webp|jpe?g)$/i, '.png'));
  const asNamed = resolve(ROOT, 'public' + a.path);
  return !existsSync(dest) && !existsSync(asNamed);
});

const line = (n, label, paint) => console.log(`${paint(String(n).padStart(4))}  ${label}`);

console.log(`\n${c.bold('ingest')}  ${dir}${dry ? c.yellow('  (dry run, nothing written)') : ''}`);
console.log('');
for (const [id, note] of written) console.log(`  ${c.green('+')} ${id.padEnd(28)} ${c.dim(note)}`);
for (const [id, note] of skipped) console.log(`  ${c.yellow('=')} ${id.padEnd(28)} ${c.dim(note)}`);
for (const [f, note] of failed) console.log(`  ${c.red('x')} ${f.padEnd(28)} ${c.dim(note)}`);
for (const f of unmatched) console.log(`  ${c.red('?')} ${f.padEnd(28)} ${c.dim('no asset with that id')}`);

console.log('');
line(written.length, 'written', c.green);
line(skipped.length, 'skipped', c.yellow);
line(failed.length + unmatched.length, 'rejected', failed.length + unmatched.length ? c.red : c.dim);
line(missing.length, `still missing of ${manifest.assets.length}`, missing.length ? c.yellow : c.green);

if (missing.length) {
  const p0 = missing.filter((a) => a.priority === 'p0');
  if (p0.length) console.log(`\n  ${c.yellow('p0 outstanding:')} ${p0.map((a) => a.id).join(' ')}`);
}
console.log('');

process.exit(failed.length ? 1 : 0);
