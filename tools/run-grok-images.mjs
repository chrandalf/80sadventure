/**
 * Run the generated .jsonl against xAI's Grok Imagine image API, with a hard
 * budget cap.
 *
 *   XAI_API_KEY=xai-... node tools/run-grok-images.mjs \
 *       one-more-credit-images.jsonl <out-dir> [--budget 2.80] \
 *       [--model grok-imagine-image-2.0] [--resolution 1k] [--limit N]
 *
 * Differences from the OpenAI runner, all deliberate:
 *
 * - **The budget is a ceiling, not a target.** Cost is counted per attempted
 *   generation at the flat per-image price for the chosen tier, and the run
 *   stops BEFORE the request that would cross the cap. Failed requests are
 *   counted as spent anyway - the API may still have billed the attempt, and
 *   over-counting is the error direction that cannot overdraw the account.
 *
 * - **Priority order, not file order.** Character poses first (they are what
 *   makes the game animate), then portraits, props and effects, icons last -
 *   so if the money runs out, it ran out on the cheapest, least visible art.
 *
 * - **xAI's request shape.** The endpoint is OpenAI-compatible in URL only:
 *   it takes `prompt`, `model`, `response_format`, `aspect_ratio` and
 *   `resolution`, and does NOT accept OpenAI's `size`, `quality` or
 *   `output_format`. Those are stripped from the JSONL bodies here rather
 *   than regenerating the file.
 *
 * Writes <out-dir>/<custom_id>.png - exactly what tools/ingest-assets.mjs
 * expects. Already-written files are skipped and cost nothing, so re-running
 * after a top-up only fills the gaps.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { c } from './lib.mjs';

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const [jsonl, outDir] = positional;
const model = flag('model', 'grok-imagine-image-2.0');
const resolution = flag('resolution', '1k');
const budget = Number(flag('budget', '2.80'));
const limit = Number(flag('limit', 'Infinity'));

// The console's published flat rates per generated image. If xAI changes
// them, --price overrides without a code change.
const PRICE = Number(flag('price',
  { '1k': '0.04', '2k': '0.06' }[resolution.toLowerCase()] ?? '0.04'));

if (!jsonl || !outDir) {
  console.error('usage: XAI_API_KEY=... node tools/run-grok-images.mjs <file.jsonl> <out-dir> [--budget 2.80]');
  process.exit(2);
}
const key = process.env.XAI_API_KEY;
if (!key) {
  console.error(c.red('XAI_API_KEY is not set - it is on https://console.x.ai under API keys'));
  process.exit(2);
}

const dir = resolve(process.cwd(), outDir);
mkdirSync(dir, { recursive: true });
const errLog = join(dir, '_errors.log');

/** Money runs out on icons, not on the player character. */
const PRIORITY = ['character-pose', 'character-sheet', 'portrait', 'prop', 'effect', 'background', 'inventory-icon'];
const rank = (id) => {
  if (id.startsWith('char.') && id.split('.').length > 2) return 0; // poses
  if (id.startsWith('char.')) return 1;
  if (id.startsWith('portrait.')) return 2;
  if (id.startsWith('prop.')) return 3;
  if (id.startsWith('fx.') || id.startsWith('effect.')) return 4;
  if (id.startsWith('bg.')) return 5;
  return 6; // items / icons
};

const requests = readFileSync(resolve(process.cwd(), jsonl), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l))
  .sort((a, b) => rank(a.custom_id) - rank(b.custom_id) || a.custom_id.localeCompare(b.custom_id));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let spent = 0;
let done = 0;
let skipped = 0;
let failed = 0;
/**
 * Consecutive hard failures. Three in a row with zero successes means the
 * model name or the key is wrong, not the prompts - abort before the ledger
 * fills up with billed-but-useless attempts.
 */
let streak = 0;

// Sequential on purpose: the budget check must see every previous attempt.
for (const req of requests) {
  if (done + failed >= limit) break;
  const dest = join(dir, `${req.custom_id}.png`);
  if (existsSync(dest)) { skipped++; continue; }

  if (spent + PRICE > budget + 1e-9) {
    console.log(c.yellow(`\nbudget: $${spent.toFixed(2)} spent, next image would pass $${budget.toFixed(2)} - stopping here.`));
    break;
  }

  // The JSONL was written for OpenAI; keep the prompt, drop what xAI rejects.
  const prompt = req.body.prompt ?? req.body.input;
  const body = { model, prompt, n: 1, response_format: 'b64_json', resolution };

  let outcome = 'fail';
  for (let attempt = 0; attempt <= 2; attempt++) {
    let res;
    try {
      res = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt === 2) appendFileSync(errLog, `${req.custom_id}\tnetwork\t${e.message}\n`);
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      await sleep(3000 * 2 ** attempt);
      continue;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      appendFileSync(errLog, `${req.custom_id}\t${res.status}\t${JSON.stringify(data?.error ?? data).slice(0, 300)}\n`);
      break;
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      appendFileSync(errLog, `${req.custom_id}\tno-image\t${JSON.stringify(data).slice(0, 300)}\n`);
      break;
    }
    writeFileSync(dest, Buffer.from(b64, 'base64'));
    outcome = 'ok';
    break;
  }

  // Count the attempt as spent either way - a refused request may still have
  // been billed, and guessing low is how a $2.82 balance goes negative.
  spent += PRICE;
  if (outcome === 'ok') {
    done++;
    streak = 0;
    console.log(`${c.green('+')} ${req.custom_id}  ($${spent.toFixed(2)} of $${budget.toFixed(2)})`);
  } else {
    failed++;
    streak++;
    console.log(`${c.red('x')} ${req.custom_id}  (see _errors.log)`);
    if (streak >= 3 && done === 0) {
      console.error(c.red('\nthree failures and no successes - the model name or key is wrong.'));
      console.error(c.red(`check ${errLog}, then retry (already-written files are skipped). Try --model grok-2-image.`));
      break;
    }
  }
}

console.log(`\n${done} written, ${skipped} already present, ${failed} failed`);
console.log(`estimated spend this run: $${spent.toFixed(2)} at $${PRICE.toFixed(2)}/image (${model}, ${resolution})`);
console.log(c.dim(`next: node tools/ingest-assets.mjs ${outDir}`));
if (failed) console.log(c.yellow(`failures are itemised in ${errLog} - re-run to retry only what is missing`));
