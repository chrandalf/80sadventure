/**
 * Turn assets.json into an OpenAI Batch API .jsonl of image requests.
 *
 *   node tools/gen-openai-batch.mjs [--endpoint images|responses]
 *                                   [--only p0,p1] [--type background,portrait]
 *                                   [--missing] [--model gpt-image-1] [--out <file>]
 *
 * THE ONE RULE THAT BREAKS BATCHES: the `url` on every line must be character
 * for character the same as the endpoint the batch is created with. A file full
 * of image requests uploaded against `/v1/chat/completions` fails every line
 * with "The URL provided for this request does not match the batch endpoint"
 * and parses zero requests. Create the batch with the endpoint printed at the
 * end of this script's output.
 *
 * `custom_id` is the asset id, which is what tools/ingest-assets.mjs matches
 * on, so the round trip needs no bookkeeping: generate, save each image as
 * <custom_id>.png, ingest.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, c } from './lib.mjs';

const argv = process.argv.slice(2);
const args = argv;
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const endpointKind = flag('endpoint', 'images');
const model = flag('model', endpointKind === 'responses' ? 'gpt-5' : 'gpt-image-1');
const only = flag('only', '')?.split(',').filter(Boolean);
const types = flag('type', '')?.split(',').filter(Boolean);
const out = resolve(process.cwd(), flag('out', 'one-more-credit-images.jsonl'));

const URL_FOR = {
  images: '/v1/images/generations',
  responses: '/v1/responses',
};
if (!URL_FOR[endpointKind]) {
  console.error(`--endpoint must be one of: ${Object.keys(URL_FOR).join(', ')}`);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'public/assets/assets.json'), 'utf8'));
const { artDirection: art, renderResolution: res } = manifest;

/**
 * gpt-image-1 renders 1024x1024, 1536x1024 or 1024x1536 and nothing else, so
 * nothing here is the game's real size. Full-screen plates are asked for in
 * landscape and centre-cropped from 3:2 to the game's 8:5 during ingest;
 * everything else is asked for square and trimmed to its alpha bounds. That is
 * why the prompts below say to keep content clear of the top and bottom edges.
 */
function sizeFor(asset) {
  const full = asset.dimensions.width === res.width && asset.dimensions.height === res.height;
  return full ? '1536x1024' : '1024x1024';
}

function qualityFor(asset) {
  if (asset.type === 'inventory-icon') return 'medium'; // 16x16 final - detail is wasted
  return 'high';
}

const STYLE = [
  art.era,
  art.reference,
  `Setting: ${art.setting}`,
  'Original artwork only. Do not reference or reproduce any existing commercial game, film, character or brand.',
  'No text, no lettering, no signature, no watermark, no logo, no user interface anywhere in the image.',
].join(' ');

/** Extra direction per asset type, including how the image will be cut down. */
function framing(asset) {
  const full = asset.dimensions.width === res.width && asset.dimensions.height === res.height;
  switch (asset.type) {
    case 'background':
    case 'ui':
      return [
        'A single flat illustrated backdrop plate for a point-and-click adventure room, drawn as one continuous painted scene from a fixed camera at standing eye level.',
        'Completely empty of people and animals.',
        'The image will be centre-cropped to a slightly wider frame, so keep everything important away from the extreme top and bottom edges.',
      ].join(' ');
    case 'background-layer':
    case 'effect':
      return [
        full ? 'A full-frame overlay layer.' : 'An overlay layer.',
        'Everything that is not the subject must be fully transparent, not white and not black.',
        'The image will be centre-cropped slightly, so let the effect run past all four edges.',
      ].join(' ');
    case 'character-sheet':
      return [
        'One single full-length standing figure, alone, facing the camera, arms relaxed at the sides, feet together, whole body visible from the top of the head to the soles of the shoes with clear space around it.',
        'Isolated on a fully transparent background - no floor, no shadow, no scenery, no second figure.',
        'Do not draw a grid, a contact sheet, multiple poses or an animation strip.',
      ].join(' ');
    case 'portrait':
      return 'Head and shoulders only, one person, isolated on a fully transparent background, no border and no frame.';
    case 'prop':
    case 'inventory-icon':
      return 'One single object, centred, isolated on a fully transparent background, no shadow, no floor, no scenery, no hand holding it.';
    default:
      return '';
  }
}

/** Reduce needless refusals on the two deliberately non-explicit comedy assets. */
const CLARIFY = new Set(['char.guest', 'portrait.guest']);

function promptFor(asset) {
  const parts = [STYLE, framing(asset), asset.description];
  if (CLARIFY.has(asset.id)) {
    parts.push('Fully covered and non-explicit: an ordinary adult in a bath towel as seen in a broad television sitcom. No nudity.');
  }
  if (asset.transparency === 'alpha-required') {
    parts.push('The background must be genuine transparency (alpha), not a white, black or chequerboard fill. Hard edges, no soft feathering or glow at the silhouette.');
  }
  return parts.filter(Boolean).join('\n\n');
}

function bodyFor(asset) {
  const prompt = promptFor(asset);
  const size = sizeFor(asset);
  const transparent = asset.transparency === 'alpha-required';

  if (endpointKind === 'responses') {
    const body = {
      model,
      // The Responses API takes an instruction, not a bare image prompt. Say
      // outright that the only wanted output is the picture, so this still
      // produces an image if tool_choice is dropped or unsupported.
      input: `Generate this image. Return the image only - no commentary, no description, no text in the picture.\n\n${prompt}`,
      tools: [{
        type: 'image_generation',
        size,
        quality: qualityFor(asset),
        output_format: 'png',
        background: transparent ? 'transparent' : 'opaque',
      }],
    };
    if (!args.includes('--no-tool-choice')) body.tool_choice = { type: 'image_generation' };
    return body;
  }

  return {
    model,
    prompt,
    n: 1,
    size,
    quality: qualityFor(asset),
    output_format: 'png',
    // `transparent` is only honoured for png/webp output.
    background: transparent ? 'transparent' : 'opaque',
  };
}

let assets = manifest.assets;
if (only.length) assets = assets.filter((a) => only.includes(a.priority));
if (types.length) assets = assets.filter((a) => types.includes(a.type));

// --missing: only ask for what is not already in the game. A partly successful
// run is the normal case - refusals and per-asset errors are expected - so the
// retry should cost only what actually failed.
if (argv.includes('--missing')) {
  const before = assets.length;
  assets = assets.filter((a) => {
    const asNamed = resolve(ROOT, 'public' + a.path);
    const asPng = resolve(ROOT, 'public' + a.path.replace(/\.(webp|jpe?g)$/i, '.png'));
    return !existsSync(asNamed) && !existsSync(asPng);
  });
  console.log(c.dim(`\n  --missing: ${before - assets.length} already in the game, asking for ${assets.length}`));
}

const lines = assets.map((a) => JSON.stringify({
  custom_id: a.id,
  method: 'POST',
  url: URL_FOR[endpointKind],
  body: bodyFor(a),
}));

writeFileSync(out, lines.join('\n') + '\n');

const bytes = Buffer.byteLength(lines.join('\n'), 'utf8');
const counts = {};
for (const a of assets) counts[a.type] = (counts[a.type] ?? 0) + 1;

console.log(`\n${c.bold(out)}`);
console.log(`  ${lines.length} requests, ${(bytes / 1024).toFixed(0)} KiB`);
console.log(`  ${Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(', ')}`);
console.log(c.yellow(`\n  create the batch with endpoint ${URL_FOR[endpointKind]} - it must match the url on every line`));
console.log(c.dim(`\n  openai.batches.create(input_file_id=..., endpoint="${URL_FOR[endpointKind]}", completion_window="24h")`));
console.log(c.dim(`  then save each result as <custom_id>.png and run: node tools/ingest-assets.mjs <dir>\n`));
