/**
 * Mirror one or more PNGs in place.
 *
 *   node tools/flip-image.mjs grok-output/char.jack.side_walk_a.png [...]
 *
 * The engine draws west-facing characters by flipping the east-facing sheet,
 * so the artwork only ever needs one direction - but every side pose in a set
 * has to face the same way or the character snaps backwards mid-stride. When a
 * generator draws one of six facing the wrong way, flipping it costs nothing
 * and regenerating it costs an image.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { c } from './lib.mjs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('usage: node tools/flip-image.mjs <file.png> [more.png ...]');
  process.exit(2);
}

for (const f of files) {
  const path = resolve(process.cwd(), f);
  try {
    const img = PNG.sync.read(readFileSync(path));
    const out = new PNG({ width: img.width, height: img.height });
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const s = (y * img.width + x) * 4;
        const d = (y * img.width + (img.width - 1 - x)) * 4;
        out.data[d] = img.data[s];
        out.data[d + 1] = img.data[s + 1];
        out.data[d + 2] = img.data[s + 2];
        out.data[d + 3] = img.data[s + 3];
      }
    }
    writeFileSync(path, PNG.sync.write(out));
    console.log(`${c.green('flipped')} ${f}`);
  } catch (e) {
    console.error(`${c.red('failed')} ${f}: ${e.message}`);
  }
}
