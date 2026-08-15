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
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  if (i < 0) return d;
  const v = args[i + 1];
  // `--budget` with nothing after it, or followed by another flag, is a typo.
  // Silently treating the next flag as the value is how --price --budget
  // became price="--budget" and budget=NaN - and a NaN budget fails every
  // comparison, which switches the spending cap off without saying so.
  if (v === undefined || v.startsWith('--')) {
    console.error(c.red(`--${n} needs a value`));
    process.exit(2);
  }
  return v;
};

/** A budget or price that is not a positive number must never be assumed. */
const numeric = (name, raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(c.red(`--${name} must be a positive number, got "${raw}"`));
    process.exit(2);
  }
  return n;
};

const [jsonl, outDir] = positional;

/**
 * --provider xai (default) hits api.x.ai directly; --provider openrouter
 * hits OpenRouter's unified image API, which fronts the same xAI models
 * plus ByteDance, Google, BFL and others under one key and one bill.
 * The request shape differs slightly (OpenRouter takes `resolution: "1K"`
 * and `aspect_ratio`); the budget, ordering and resume logic do not care.
 */
const provider = flag('provider', 'xai');
const PROVIDERS = {
  xai: {
    url: 'https://api.x.ai/v1/images/generations',
    env: 'XAI_API_KEY',
    defaultModel: 'grok-imagine-image-2.0',
    defaultResolution: '1k',
    body: (model, prompt, resolution) => ({
      model, prompt, n: 1, response_format: 'b64_json', resolution: resolution.toLowerCase(),
    }),
  },
  /**
   * OpenRouter, via chat completions with image modalities.
   *
   * Not the unified /api/v1/images route, deliberately. That route works and
   * is cheap, but Seedream answers it with `media_type: image/jpeg`, and the
   * whole ingest chain decodes PNG only - so every image would have been paid
   * for and then rejected. This route returns a `data:image/png;base64,...`
   * URL, and its default model is the one that holds a character's face and
   * clothes steady across six separate generations, which is the thing six
   * poses of one person actually depend on.
   */
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    env: 'OPENROUTER_API_KEY',
    defaultModel: 'google/gemini-2.5-flash-image',
    defaultResolution: 'auto',
    body: (model, prompt) => ({
      model,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
    }),
  },
}[provider];
if (!PROVIDERS) {
  console.error(c.red(`unknown provider "${provider}" - use xai or openrouter`));
  process.exit(2);
}

// --url points the same logic at an OpenAI-compatible proxy, or at a local
// stub when testing the budget arithmetic without spending anything.
const endpoint = flag('url', PROVIDERS.url);
const model = flag('model', PROVIDERS.defaultModel);
const resolution = flag('resolution', PROVIDERS.defaultResolution ?? '1k');
const budget = numeric('budget', flag('budget', '2.80'));
const limit = Number(flag('limit', 'Infinity'));
/**
 * How many images to have in flight. One image takes tens of seconds, so a
 * hundred of them one after another is most of an hour of watching a cursor.
 * Six is comfortably inside both providers' rate limits; 429s back off and
 * retry anyway.
 */
const concurrency = numeric('concurrency', flag('concurrency', '6'));

// Per-image price for the ledger. The xAI numbers are the console's
// published flat rates; on OpenRouter the price is per model (Seedream 4.5
// is $0.04 flat), so pass --price to match whatever model you chose.
const PRICE = numeric('price', flag('price',
  { '1k': '0.04', '2k': '0.06' }[resolution.toLowerCase()] ?? '0.04'));

if (!jsonl || !outDir) {
  console.error(`usage: ${PROVIDERS.env}=... node tools/run-grok-images.mjs <file.jsonl> <out-dir> [--provider xai|openrouter] [--budget 2.80]`);
  process.exit(2);
}
// A dry run talks to nobody, so it must not demand a key - being told to go
// and find one before you are allowed to ask what something costs is exactly
// backwards.
const key = process.env[PROVIDERS.env];
if (!key && !args.includes('--dry')) {
  console.error(c.red(`${PROVIDERS.env} is not set`));
  process.exit(2);
}

const dir = resolve(process.cwd(), outDir);
mkdirSync(dir, { recursive: true });
const errLog = join(dir, '_errors.log');

/**
 * Money runs out on icons, not on the player character - and within the
 * cast, on a background walk-on rather than on Jack. When the budget cuts
 * the run short, what is missing should be the least-seen art in the game.
 */
const CAST = ['jack', 'maggie', 'arthur', 'kevin', 'brenda', 'valerie', 'derek', 'graham', 'guest', 'drvale', 'punter'];
const castRank = (id) => {
  const who = id.split('.')[1] ?? '';
  const i = CAST.indexOf(who);
  return i === -1 ? CAST.length : i;
};
const rank = (id) => {
  if (id.startsWith('char.') && id.split('.').length > 2) return 0; // poses
  if (id.startsWith('char.')) return 1;
  if (id.startsWith('portrait.')) return 2;
  if (id.startsWith('prop.')) return 3;
  if (id.startsWith('fx.') || id.startsWith('effect.')) return 4;
  if (id.startsWith('bg.')) return 5;
  return 6; // items / icons
};

/**
 * --only / --skip take a regular expression matched against the asset id, so
 * one JSONL can be split across providers without regenerating it. The point
 * is the cheeky assets: Google's and OpenAI's image models will not draw them,
 * so they go to a model whose mature mode will, while the other hundred
 * innocent sprites go wherever they are cheapest and most consistent.
 */
const only = flag('only', null);
const skip = flag('skip', null);

const requests = readFileSync(resolve(process.cwd(), jsonl), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l))
  .filter((r) => (!only || new RegExp(only, 'i').test(r.custom_id))
    && (!skip || !new RegExp(skip, 'i').test(r.custom_id)))
  .sort((a, b) =>
    rank(a.custom_id) - rank(b.custom_id)
    || castRank(a.custom_id) - castRank(b.custom_id)
    || a.custom_id.localeCompare(b.custom_id));

/**
 * --dry: say what this lane would generate and what it would cost, and stop.
 *
 * With two providers, two balances and a filter deciding which assets go
 * where, the useful question before running anything is "how much is this
 * one?" - and the honest answer needs the same filtering, skipping and
 * pricing the real run uses, not a sum done by hand.
 */
if (args.includes('--dry')) {
  const todo = requests.filter((r) => !existsSync(join(dir, `${r.custom_id}.png`)));
  const have = requests.length - todo.length;
  const affordable = Math.min(todo.length, Math.floor((budget + 1e-9) / PRICE));
  console.log(`\n${c.bold(`${provider}: ${model}`)}`);
  console.log(`  ${requests.length} in scope, ${have} already on disk, ${todo.length} to generate`);
  console.log(`  ${affordable} affordable at $${PRICE.toFixed(2)} within $${budget.toFixed(2)}`
    + `  =  ${c.bold(`$${(affordable * PRICE).toFixed(2)}`)}`);
  if (affordable < todo.length) {
    console.log(c.yellow(`  ${todo.length - affordable} would be left over - raise --budget or run the rest elsewhere`));
  }
  const preview = todo.slice(0, affordable).map((r) => r.custom_id);
  const subjects = [...new Set(preview.map((id) => id.split('.').slice(0, 2).join('.')))];
  console.log(c.dim(`  subjects: ${subjects.join(', ') || '(none)'}`));
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Set once, so a wrong-format model says so once rather than per image. */
let warnedFormat = false;

/**
 * Pull the image out of whichever response shape came back.
 *
 * Three are in play: OpenAI-style `data[0].b64_json`, the same with a
 * `media_type` beside it, and chat-completions image modalities, where the
 * image arrives as a `data:image/png;base64,...` URL inside the message.
 */
function extractImage(data) {
  const direct = data?.data?.[0];
  if (direct?.b64_json) return { b64: direct.b64_json, mime: direct.media_type ?? null };

  const parts = data?.choices?.[0]?.message?.images ?? data?.images ?? [];
  for (const part of parts) {
    const url = part?.image_url?.url ?? part?.url ?? (typeof part === 'string' ? part : null);
    const m = url && /^data:([^;]+);base64,(.+)$/s.exec(url);
    if (m) return { b64: m[2], mime: m[1] };
  }
  return null;
}

/**
 * Money committed to requests that are in flight or finished.
 *
 * The budget is checked against this, not against completed spend, and it is
 * incremented *before* a request goes out. A worker that cannot reserve the
 * price of one image stops. That is what lets several images run at once
 * without the cap becoming a race: with N in flight, N prices are already
 * reserved, so the ceiling holds no matter how the responses interleave.
 */
let reserved = 0;
let done = 0;
let skipped = 0;
let failed = 0;
let stopped = false;

/** Shared cursor into the request list; workers take the next unclaimed one. */
let cursor = 0;

async function generate(req, dest) {
  // The JSONL was written for OpenAI; keep the prompt, rebuild the body in
  // whatever shape this provider wants.
  const prompt = req.body.prompt ?? req.body.input;
  const body = PROVIDERS.body(model, prompt, resolution);

  for (let attempt = 0; attempt <= 2; attempt++) {
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt === 2) appendFileSync(errLog, `${req.custom_id}\tnetwork\t${e.message}\n`);
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    // Rate limits are expected when several run at once: back off and retry
    // rather than counting it as a failure.
    if (res.status === 429 || res.status >= 500) {
      await sleep(3000 * 2 ** attempt);
      continue;
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      appendFileSync(errLog, `${req.custom_id}\t${res.status}\t${JSON.stringify(data?.error ?? data).slice(0, 300)}\n`);
      return false;
    }
    const img = extractImage(data);
    if (!img) {
      appendFileSync(errLog, `${req.custom_id}\tno-image\t${JSON.stringify(data).slice(0, 300)}\n`);
      return false;
    }
    // A JPEG here is not a wasted image but it is a wasted download: ingest
    // decodes PNG only. Say so once, plainly, rather than letting it surface
    // as thirty "not a PNG" lines at ingest time.
    if (img.mime && !/png/i.test(img.mime)) {
      appendFileSync(errLog, `${req.custom_id}\tnot-png\t${img.mime} - ingest decodes PNG only\n`);
      if (!warnedFormat) {
        warnedFormat = true;
        console.log(c.yellow(`\n  ${model} is returning ${img.mime}, and ingest decodes PNG only.`));
        console.log(c.yellow('  Stop and pick a model that returns PNG (google/gemini-2.5-flash-image does).\n'));
      }
      return false;
    }
    writeFileSync(dest, Buffer.from(img.b64, 'base64'));
    return true;
  }
  return false;
}

async function worker() {
  while (!stopped) {
    const req = requests[cursor++];
    if (!req) return;
    if (done + failed >= limit) return;

    const dest = join(dir, `${req.custom_id}.png`);
    if (existsSync(dest)) { skipped++; continue; }

    // Reserve before dispatching. JS runs this check-and-increment without
    // interleaving, so the reservation is atomic even with workers in flight.
    if (reserved + PRICE > budget + 1e-9) {
      if (!stopped) {
        stopped = true;
        console.log(c.yellow(`\nbudget: $${reserved.toFixed(2)} committed, next image would pass $${budget.toFixed(2)} - stopping here.`));
      }
      return;
    }
    // Counted as spent whatever happens - a refused request may still have
    // been billed, and guessing low is how a balance goes negative.
    reserved += PRICE;

    const ok = await generate(req, dest);
    if (ok) {
      done++;
      console.log(`${c.green('+')} ${req.custom_id}  ($${reserved.toFixed(2)} of $${budget.toFixed(2)})`);
    } else {
      failed++;
      console.log(`${c.red('x')} ${req.custom_id}  (see _errors.log)`);
      // Three failures and nothing working means the model name or the key is
      // wrong, not the prompts. Stop before the ledger fills with billed-but-
      // useless attempts.
      if (failed >= 3 && done === 0) {
        stopped = true;
        console.error(c.red('\nthree failures and no successes - the model name or key is likely wrong.'));
        console.error(c.red(`check ${errLog}, then retry (already-written files are skipped).`));
        return;
      }
    }
  }
}

await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
const spent = reserved;

console.log(`\n${done} written, ${skipped} already present, ${failed} failed`);
if (only || skip) console.log(c.dim(`  (filtered: ${requests.length} of the file's assets were in scope)`));
console.log(`estimated spend this run: $${spent.toFixed(2)} at $${PRICE.toFixed(2)}/image (${model}, ${resolution})`);
console.log(c.dim(`next: node tools/ingest-assets.mjs ${outDir}`));
if (failed) console.log(c.yellow(`failures are itemised in ${errLog} - re-run to retry only what is missing`));
