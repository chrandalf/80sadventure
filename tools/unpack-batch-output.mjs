/**
 * Turn a completed Batch API output file into PNGs that ingest can read.
 *
 *   node tools/unpack-batch-output.mjs batch_output.jsonl ./incoming
 *
 * The batch returns one .jsonl of base64, not files. Each line carries the
 * custom_id it was sent with, which is the asset id, so this writes
 * <out-dir>/<custom_id>.png and the round trip closes:
 *
 *   assets:batch -> upload -> batches.create -> download -> unpack -> ingest
 *
 * The file is large - a hundred-odd images inlined as base64 runs to hundreds
 * of megabytes - so it is read as a stream, one line at a time, and each image
 * is decoded and written before the next line is touched. Memory stays flat
 * regardless of how big the file is. Do not open it in an editor.
 *
 * Handles both request shapes: /v1/images/generations puts the image in
 * body.data[0].b64_json, /v1/responses puts it in the image_generation_call
 * entry of body.output.
 */
import { createReadStream, mkdirSync, writeFileSync, appendFileSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, join } from 'node:path';
import { c } from './lib.mjs';

const argv = process.argv.slice(2);
const [input, outDir] = argv.filter((a) => !a.startsWith('--'));
if (!input || !outDir) {
  console.error('usage: node tools/unpack-batch-output.mjs <batch_output.jsonl> <out-dir>');
  process.exit(2);
}

const src = resolve(process.cwd(), input);
const dir = resolve(process.cwd(), outDir);
mkdirSync(dir, { recursive: true });
const errLog = join(dir, '_errors.log');

const totalBytes = statSync(src).size;
console.log(`\n${c.bold('unpack')}  ${src}  ${c.dim(`${(totalBytes / 1024 / 1024).toFixed(0)} MB`)}\n`);

let ok = 0;
let bad = 0;
let seen = 0;

const rl = createInterface({
  input: createReadStream(src, { encoding: 'utf8' }),
  crlfDelay: Infinity, // a file downloaded on Windows may carry \r\n
});

for await (const raw of rl) {
  const line = raw.trim();
  if (!line) continue;
  seen++;

  let row;
  try {
    row = JSON.parse(line);
  } catch {
    bad++;
    appendFileSync(errLog, `line ${seen}\tunparseable JSON\n`);
    console.log(`  ${c.red('x')} ${`line ${seen}`.padEnd(28)} ${c.dim('unparseable JSON')}`);
    continue;
  }

  const id = row.custom_id ?? `line-${seen}`;

  if (row.error) {
    bad++;
    appendFileSync(errLog, `${id}\t${JSON.stringify(row.error)}\n`);
    console.log(`  ${c.red('x')} ${id.padEnd(28)} ${c.dim(row.error.message ?? 'error')}`);
    continue;
  }

  const body = row.response?.body ?? row.body ?? row;
  const b64 = body?.data?.[0]?.b64_json
    ?? body?.output?.find((o) => o.type === 'image_generation_call')?.result;

  if (!b64) {
    bad++;
    const status = row.response?.status_code ?? '';
    // Truncate: a failed line can still carry a great deal of text, and the
    // point of the log is to be readable.
    appendFileSync(errLog, `${id}\tno image ${status}\t${JSON.stringify(body)?.slice(0, 400)}\n`);
    console.log(`  ${c.red('x')} ${id.padEnd(28)} ${c.dim(`no image in response ${status}`)}`);
    continue;
  }

  const buf = Buffer.from(b64, 'base64');
  writeFileSync(join(dir, `${id}.png`), buf);
  ok++;
  console.log(`  ${c.green('+')} ${id.padEnd(28)} ${c.dim(`${(buf.length / 1024).toFixed(0)} KB`)}`);
}

console.log(`\n  ${c.green(`${ok} written`)}  ${(bad ? c.red : c.dim)(`${bad} failed`)}  ${c.dim(`${seen} lines`)}`);
if (bad) console.log(c.dim(`  see ${errLog}`));
console.log(c.dim(`\n  next: node tools/ingest-assets.mjs ${outDir}\n`));
