/**
 * Lay every generated image out in one grid, grouped by character.
 *
 *   node tools/contact-sheet.mjs <dir> [--out sheet.png] [--cell 220]
 *
 * Six poses of one person are folded into a single walk cycle, so what
 * matters before ingesting is not whether each image is good on its own but
 * whether they are all obviously the same person - same face, same jacket,
 * same colours. That is invisible one file at a time and instant in a row.
 *
 * Rows are one character each, in the order the sheet assembler will use.
 * Magenta backgrounds are left as they are: seeing the key colour is part of
 * the check, since a gradient or a shadow in it is what makes a cutout ragged.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { PNG } from 'pngjs';
import { c } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const dir = resolve(process.cwd(), args.find((a) => !a.startsWith('--')) ?? '.');
const out = resolve(process.cwd(), flag('out', 'contact-sheet.png'));
const CELL = Number(flag('cell', '220'));

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png') && !f.startsWith('_'));
if (!files.length) {
  console.error(c.red(`no PNGs in ${dir}`));
  process.exit(2);
}

/** Group by subject: char.jack.side_walk_a -> jack, portrait.maggie -> maggie. */
const groups = new Map();
for (const f of files.sort()) {
  const parts = f.replace(/\.png$/i, '').split('.');
  const subject = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
  if (!groups.has(subject)) groups.set(subject, []);
  groups.get(subject).push(f);
}

const cols = Math.max(...[...groups.values()].map((g) => g.length));
const rows = groups.size;
const sheet = new PNG({ width: cols * CELL, height: rows * CELL });
// Mid grey, so both a magenta field and a white one read clearly against it.
for (let i = 0; i < sheet.data.length; i += 4) {
  sheet.data[i] = sheet.data[i + 1] = sheet.data[i + 2] = 40;
  sheet.data[i + 3] = 255;
}

/** Nearest-neighbour is fine here - this is a proof sheet, not an asset. */
function blit(src, cx, cy) {
  const scale = Math.min(CELL / src.width, CELL / src.height);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const ox = cx + ((CELL - w) >> 1);
  const oy = cy + ((CELL - h) >> 1);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, Math.floor(y / scale));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor(x / scale));
      const s = (sy * src.width + sx) * 4;
      const d = ((oy + y) * sheet.width + ox + x) * 4;
      const a = src.data[s + 3] / 255;
      sheet.data[d] = Math.round(src.data[s] * a + 40 * (1 - a));
      sheet.data[d + 1] = Math.round(src.data[s + 1] * a + 40 * (1 - a));
      sheet.data[d + 2] = Math.round(src.data[s + 2] * a + 40 * (1 - a));
      sheet.data[d + 3] = 255;
    }
  }
}

let row = 0;
const broken = [];
for (const [subject, list] of groups) {
  list.forEach((f, i) => {
    try {
      blit(PNG.sync.read(readFileSync(join(dir, f))), i * CELL, row * CELL);
    } catch (e) {
      broken.push(`${f}: ${e.message}`);
    }
  });
  console.log(`  ${String(list.length).padStart(2)}  ${subject}`);
  row++;
}

writeFileSync(out, PNG.sync.write(sheet));
console.log(`\n${c.bold(out)}  ${cols} x ${rows} cells`);
if (broken.length) {
  console.log(c.yellow(`\n${broken.length} file(s) would not decode - these will fail ingest too:`));
  for (const b of broken) console.log('  ' + b);
}
