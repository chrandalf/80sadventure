/**
 * Say what image files really are, by their bytes rather than their names.
 *
 *   node tools/inspect-images.mjs grok-output
 *   node tools/inspect-images.mjs grok-output/char.guest.front_stand.png
 *
 * A generator that answers with JPEG, or with a base64 data URL that has been
 * decoded as if it were raw base64, produces a file with a .png name that no
 * PNG decoder will touch - and the failure only shows up at ingest, long after
 * the image was paid for. This reports the real format, the size, and the
 * first bytes, so the fix is obvious instead of guessed at.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { c } from './lib.mjs';

const target = resolve(process.cwd(), process.argv[2] ?? '.');
const files = statSync(target).isDirectory()
  ? readdirSync(target).filter((f) => !f.startsWith('_')).map((f) => join(target, f))
  : [target];

/** Identify by magic bytes - the only thing that is actually load-bearing. */
function identify(buf) {
  if (buf.length < 8) return 'empty or truncated';
  const hex = buf.subarray(0, 4).toString('hex');
  if (hex === '89504e47') return 'PNG';
  if (hex.startsWith('ffd8ff')) return 'JPEG';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF'
    && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'WEBP';
  if (buf.subarray(0, 6).toString('ascii').startsWith('GIF8')) return 'GIF';
  const head = buf.subarray(0, 64).toString('utf8');
  if (head.startsWith('data:')) return 'a base64 data URL, written verbatim';
  if (head.trimStart().startsWith('{')) return 'JSON - probably an error the runner stored as an image';
  if (/^[A-Za-z0-9+/=\s]+$/.test(head)) return 'base64 text that was never decoded';
  return `unknown (starts ${hex})`;
}

/** A valid PNG ends with an IEND chunk; anything after it upsets decoders. */
function pngTail(buf) {
  const iend = buf.lastIndexOf(Buffer.from('IEND'));
  if (iend < 0) return 'no IEND - the file is truncated';
  const trailing = buf.length - (iend + 8);
  return trailing > 0 ? `${trailing} stray bytes after IEND` : 'ends cleanly';
}

const counts = new Map();
for (const f of files) {
  let buf;
  try {
    buf = readFileSync(f);
  } catch (e) {
    console.log(`${c.red('?')} ${f}: ${e.message}`);
    continue;
  }
  const kind = identify(buf);
  counts.set(kind, (counts.get(kind) ?? 0) + 1);
  const extra = kind === 'PNG' ? pngTail(buf) : buf.subarray(0, 24).toString('utf8').replace(/[^\x20-\x7e]/g, '.');
  const ok = kind === 'PNG' && extra === 'ends cleanly';
  console.log(`${ok ? c.green('+') : c.red('x')} ${f.split(/[\\/]/).pop().padEnd(34)} ${String(buf.length).padStart(8)} B  ${kind}  ${c.dim(extra)}`);
}

console.log('');
for (const [kind, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${kind}`);
if (counts.has('JPEG')) {
  console.log(c.yellow('\n  JPEG files cannot be ingested. Regenerate those ids on a provider that returns PNG.'));
}
