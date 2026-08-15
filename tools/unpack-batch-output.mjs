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
 * Handles both request shapes: /v1/images/generations puts the image in
 * body.data[0].b64_json, /v1/responses puts it in the image_generation_call
 * entry of body.output.
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { c } from './lib.mjs';

const [input, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!input || !outDir) {
  console.error('usage: node tools/unpack-batch-output.mjs <batch_output.jsonl> <out-dir>');
  process.exit(2);
}

const dir = resolve(process.cwd(), outDir);
mkdirSync(dir, { recursive: true });
const errLog = join(dir, '_errors.log');

const lines = readFileSync(resolve(process.cwd(), input), 'utf8').split('\n').filter(Boolean);

let ok = 0;
let bad = 0;

for (const raw of lines) {
  let row;
  try {
    row = JSON.parse(raw);
  } catch {
    bad++;
    appendFileSync(errLog, `unparseable line\n`);
    continue;
  }

  const id = row.custom_id ?? 'unknown';

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
    appendFileSync(errLog, `${id}\tno image in response ${status}\t${JSON.stringify(body)?.slice(0, 400)}\n`);
    console.log(`  ${c.red('x')} ${id.padEnd(28)} ${c.dim(`no image in response ${status}`)}`);
    continue;
  }

  writeFileSync(join(dir, `${id}.png`), Buffer.from(b64, 'base64'));
  ok++;
  console.log(`  ${c.green('+')} ${id}`);
}

console.log(`\n  ${c.green(`${ok} written`)}  ${(bad ? c.red : c.dim)(`${bad} failed`)}`);
if (bad) console.log(c.dim(`  see ${errLog}`));
console.log(c.dim(`\n  next: node tools/ingest-assets.mjs ${outDir}\n`));
