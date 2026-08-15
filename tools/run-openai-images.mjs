/**
 * Run the generated .jsonl directly against the OpenAI API, without the Batch
 * API. Ninety-two images is small enough that the batch discount is not worth
 * a broken pipeline, and this path gives you an image and an error message per
 * asset instead of one failed job.
 *
 *   OPENAI_API_KEY=sk-... node tools/run-openai-images.mjs \
 *       one-more-credit-images.jsonl <out-dir> [--concurrency 4] [--retry 2]
 *
 * Writes <out-dir>/<custom_id>.png, which is exactly what
 * tools/ingest-assets.mjs expects. Already-written files are skipped, so a
 * rerun only fills the gaps and a refusal costs one image, not the run.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { c } from './lib.mjs';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const [jsonl, outDir] = positional;
const concurrency = Number(flag('concurrency', 4));
const retries = Number(flag('retry', 2));

if (!jsonl || !outDir) {
  console.error('usage: OPENAI_API_KEY=... node tools/run-openai-images.mjs <file.jsonl> <out-dir>');
  process.exit(2);
}
const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error(c.red('OPENAI_API_KEY is not set'));
  process.exit(2);
}

const dir = resolve(process.cwd(), outDir);
mkdirSync(dir, { recursive: true });
const errLog = join(dir, '_errors.log');

const requests = readFileSync(resolve(process.cwd(), jsonl), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function one(req) {
  const dest = join(dir, `${req.custom_id}.png`);
  if (existsSync(dest)) return 'skip';

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetch(`https://api.openai.com${req.url}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify(req.body),
      });
    } catch (e) {
      if (attempt === retries) { appendFileSync(errLog, `${req.custom_id}\tnetwork\t${e.message}\n`); return 'fail'; }
      await sleep(2000 * 2 ** attempt);
      continue;
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt === retries) { appendFileSync(errLog, `${req.custom_id}\thttp ${res.status}\n`); return 'fail'; }
      await sleep(2000 * 2 ** attempt);
      continue;
    }

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      // 400s are usually a content refusal or a bad parameter. Retrying an
      // unchanged prompt will not help, so record it and move on.
      appendFileSync(errLog, `${req.custom_id}\thttp ${res.status}\t${json?.error?.message ?? ''}\n`);
      return 'fail';
    }

    const b64 = json?.data?.[0]?.b64_json
      ?? json?.output?.find((o) => o.type === 'image_generation_call')?.result;
    if (!b64) {
      appendFileSync(errLog, `${req.custom_id}\tno image in response\n`);
      return 'fail';
    }
    writeFileSync(dest, Buffer.from(b64, 'base64'));
    return 'ok';
  }
  return 'fail';
}

const tally = { ok: 0, fail: 0, skip: 0 };
let next = 0;

async function worker() {
  while (next < requests.length) {
    const req = requests[next++];
    const r = await one(req);
    tally[r]++;
    const mark = r === 'ok' ? c.green('+') : r === 'skip' ? c.dim('=') : c.red('x');
    const done = tally.ok + tally.fail + tally.skip;
    console.log(`  ${mark} ${String(done).padStart(3)}/${requests.length}  ${req.custom_id}`);
  }
}

console.log(`\n${c.bold('generating')} ${requests.length} images -> ${dir}\n`);
await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

console.log(`\n  ${c.green(`${tally.ok} written`)}  ${c.dim(`${tally.skip} already present`)}  ${(tally.fail ? c.red : c.dim)(`${tally.fail} failed`)}`);
if (tally.fail) console.log(c.dim(`  see ${errLog}`));
console.log(c.dim(`\n  next: node tools/ingest-assets.mjs ${outDir}\n`));
