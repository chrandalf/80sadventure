/**
 * Turn assets.json into an OpenAI Batch API .jsonl of image requests.
 *
 *   node tools/gen-openai-batch.mjs [--endpoint images|responses]
 *                                   [--only p0,p1] [--type background,portrait]
 *                                   [--missing] [--chroma|--alpha]
 *                                   [--model gpt-image-1] [--out <file>]
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

/**
 * `/v1/responses` cannot return an alpha channel, so anything needing one is
 * chroma-keyed instead. `--chroma` forces it on the images endpoint too, and
 * `--alpha` forces real transparency if a model ever supports it there.
 */
const useChroma = argv.includes('--chroma')
  || (endpointKind === 'responses' && !argv.includes('--alpha'));
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
  if (full) return '1536x1024';
  // A standing figure is far taller than it is wide; a square frame spends most
  // of itself on empty background either side.
  if (asset.type === 'character-pose' || asset.type === 'character-sheet') return '1024x1536';
  return '1024x1024';
}

/**
 * Quality costs real money, and detail smaller than the destination cell is
 * thrown away by ingest before it is ever seen.
 *
 * A background is displayed at 640x400 and is worth paying for. A character
 * pose ends up in a 48x80 cell and an inventory icon in a 16x16 one; asking for
 * high quality there buys nothing but the bill. Sixty poses at high quality is
 * what emptied an account mid-run.
 */
function qualityFor(asset) {
  const px = asset.dimensions.width * asset.dimensions.height;
  if (px <= 32 * 32) return 'low';                                   // inventory icons
  if (px >= res.width * res.height) return 'high';                   // full-screen plates
  return 'medium';                                                   // poses, portraits, props
}

const STYLE = [
  art.era,
  art.reference,
  `Setting: ${art.setting}`,
  'Original artwork only. Do not reference or reproduce any existing commercial game, film, character or brand.',
  'No text, no lettering, no signature, no watermark, no logo, no user interface anywhere in the image.',
].join(' ');

/**
 * How to describe "nothing behind the subject". These must agree with the
 * chroma-key paragraph: asking for transparency and a magenta fill in the same
 * prompt is a contradiction, and a contradicted prompt is what made gpt-5
 * reason about the Far Beach instead of drawing it.
 */
const EMPTY_BG = () => (useChroma ? 'a flat magenta background' : 'a fully transparent background');

/** Extra direction per asset type, including how the image will be cut down. */
function framing(asset) {
  const full = asset.dimensions.width === res.width && asset.dimensions.height === res.height;
  switch (asset.type) {
    case 'background':
    case 'ui':
      return [
        'A single flat illustrated backdrop plate for a point-and-click adventure room, drawn as one continuous painted scene from a fixed camera at standing eye level.',
        // Not "empty of people": some rooms list a figure among the objects the
        // plate must contain, and a blanket ban contradicts that list. gpt-5
        // stopped to reason about the conflict rather than draw anything.
        'The only figures in the plate are any listed below as objects to depict; those are scenery. No other people or animals.',
        'The image will be centre-cropped to a slightly wider frame, so keep everything important away from the extreme top and bottom edges.',
      ].join(' ');
    case 'background-layer':
    case 'effect':
      return [
        full ? 'A full-frame overlay layer.' : 'An overlay layer.',
        useChroma
          ? 'Everything that is not the effect itself must be flat pure magenta.'
          : 'Everything that is not the subject must be fully transparent, not white and not black.',
        'The image will be centre-cropped slightly, so let the effect run past all four edges.',
      ].join(' ');
    case 'character-pose':
      return [
        'One single figure, alone, in the pose described below, the whole body visible from the top of the head to the soles of the shoes with clear space above and below.',
        `Isolated on ${EMPTY_BG()} - no floor, no cast shadow, no scenery, no second figure.`,
        'Do not draw a grid, a contact sheet or several poses side by side: one picture, one pose.',
      ].join(' ');
    case 'character-sheet':
      return [
        'One single full-length standing figure, alone, facing the camera, arms relaxed at the sides, feet together, whole body visible from the top of the head to the soles of the shoes with clear space around it.',
        `Isolated on ${EMPTY_BG()} - no floor, no shadow, no scenery, no second figure.`,
        'Do not draw a grid, a contact sheet, multiple poses or an animation strip.',
      ].join(' ');
    case 'portrait':
      return `Head and shoulders only, one person, isolated on ${EMPTY_BG()}, no border and no frame.`;
    case 'prop':
    case 'inventory-icon':
      return `One single object, centred, isolated on ${EMPTY_BG()}, no shadow, no floor, no scenery, no hand holding it.`;
    default:
      return '';
  }
}

/**
 * The seaside-postcard scenes are non-graphic by design (spec s.49, s.54): the
 * comedy is in the staging, never in what is shown. Saying so plainly keeps the
 * generator from either refusing or overreaching - both of which are wrong.
 */
const CLARIFY = {
  'char.guest': 'Fully covered and non-explicit: an ordinary adult in a bath towel as seen in a broad television sitcom. No nudity.',
  'portrait.guest': 'Fully covered and non-explicit: an ordinary adult in a bath towel as seen in a broad television sitcom. No nudity.',
  'bg.nudist_beach': [
    'A moonlit shingle beach. This is the naturist end of the beach and the joke is a seaside postcard, so the bathers are implied rather than shown.',
    'Stage it entirely through things in the way: two or three bathers behind the striped windbreak, visible only as heads and shoulders above its top edge; one pair of feet sticking out past the far end of it; a neatly folded pile of clothes and a pair of shoes on the towel beside the umbrella.',
    'Nothing below the shoulders of any figure is visible at any point. No torsos, no anatomy, no bare skin beyond faces, necks and feet. The windbreak, the umbrella and the bank of shingle do all of the concealing.',
    'Coy and comic in the manner of a 1970s British seaside postcard, never explicit.',
  ].join(' '),
  'bg.pool_cabins': 'Closed wooden changing cabins beside an empty pool at night. Doors shut, nobody visible. Nothing explicit and no nudity.',
};

/**
 * Chroma key, for models that cannot return alpha.
 *
 * `/v1/responses` rejects `background: "transparent"` outright - "Transparent
 * background is not supported for this model" - which failed every sprite,
 * portrait and icon in a run while the one opaque request succeeded. So the
 * subject is asked for on a flat magenta field and ingest floods it out. That
 * works on any model, which makes it the safer default rather than a fallback.
 *
 * Magenta because nothing in a 1987 seaside arcade is legitimately this colour,
 * so keying it cannot eat part of the subject.
 */
const CHROMA = [
  'Place the subject on a completely flat, uniform, pure magenta background, RGB 255 0 255, filling the entire frame behind it.',
  'That magenta must be one solid colour edge to edge: no gradient, no vignette, no shadow, no texture, no reflection and no glow spilling onto it.',
  'Do not use magenta, pink or violet anywhere in the subject itself, since the magenta is removed afterwards and anything matching it would be removed too.',
  'Keep the outline of the subject crisp and hard-edged against it.',
].join(' ');

/**
 * assets.json writes "transparent background" into the descriptions themselves,
 * because that is what the asset genuinely requires of a finished file. When we
 * are chroma-keying, the generator must not be told both things at once, so
 * those phrases come out of the description here rather than out of the spec.
 */
function scrubTransparency(text) {
  if (!useChroma || !text) return text;
  return text
    // Drop whole sentences that mention transparency, including the effects'
    // "mostly transparent", rather than only the exact phrase.
    .replace(/[^.]*\btransparen\w*\b[^.]*\.\s*/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;])/g, '$1')
    .trim();
}

function promptFor(asset) {
  const parts = [STYLE, framing(asset), scrubTransparency(asset.description)];
  if (CLARIFY[asset.id]) {
    parts.push(CLARIFY[asset.id]);
  }
  if (asset.transparency === 'alpha-required') {
    parts.push(useChroma
      ? CHROMA
      : 'The background must be genuine transparency (alpha), not a white, black or chequerboard fill. Hard edges, no soft feathering or glow at the silhouette.');
  }
  return parts.filter(Boolean).join('\n\n');
}

function bodyFor(asset) {
  const prompt = promptFor(asset);
  const size = sizeFor(asset);
  const transparent = asset.transparency === 'alpha-required' && !useChroma;

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
/*
 * A character's poses and its single-figure sheet are two ways of producing the
 * same sprite sheet, and the poses win. Generating both means paying twice for
 * every character, so the sheet is only requested when nothing else will fill
 * it - or when it is asked for by name.
 */
if (!types.includes('character-sheet')) {
  const posed = new Set(
    assets.filter((a) => a.type === 'character-pose').map((a) => a.assemble?.sheet),
  );
  assets = assets.filter((a) => !(a.type === 'character-sheet' && posed.has(a.id)));
}

if (argv.includes('--missing')) {
  const before = assets.length;
  assets = assets.filter((a) => {
    const asNamed = resolve(ROOT, 'public' + a.path);
    const asPng = resolve(ROOT, 'public' + a.path.replace(/\.(webp|jpe?g)$/i, '.png'));
    return !existsSync(asNamed) && !existsSync(asPng);
  });
  console.log(c.dim(`\n  --missing: ${before - assets.length} already in the game, asking for ${assets.length}`));
}

// --md: instead of a batch file, write a brief sheet a human can work through
// in any generator's chat UI - Grok, mostly. One section per asset: the file
// name to save as, and the full prompt ready to paste.
if (args.includes('--md')) {
  const mdOut = out.replace(/\.jsonl$/i, '') + '.md';
  const byType = {};
  for (const a of assets) (byType[a.type] ??= []).push(a);
  const md = [
    '# Image briefs',
    '',
    `${assets.length} assets outstanding. For each one: paste the prompt into the`,
    'generator verbatim, save the result as the exact file name shown (PNG only),',
    'collect them all in one folder, then run:',
    '',
    '```bash',
    'node tools/ingest-assets.mjs <folder>',
    '```',
    '',
    'Ingest keys out the magenta, trims, scales and assembles sheets itself, and',
    'skips anything already in the game - so over-generating is harmless and',
    're-running is safe. Do not edit the prompts: the flat magenta background',
    'clause is what makes the cutout work, and the staging clauses on the cheeky',
    'assets are the certificate.',
    '',
  ];
  for (const [type, list] of Object.entries(byType)) {
    md.push(`## ${type} (${list.length})`, '');
    for (const a of list) {
      md.push(`### \`${a.id}.png\``, '', '```', promptFor(a), '```', '');
    }
  }
  writeFileSync(mdOut, md.join('\n'));
  console.log(`\n${c.bold(mdOut)}`);
  console.log(`  ${assets.length} briefs: ${Object.entries(byType).map(([t, l]) => `${t} ${l.length}`).join(', ')}`);
  console.log(c.dim('  paste each prompt, save as the shown file name, then: node tools/ingest-assets.mjs <folder>\n'));
  process.exit(0);
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
console.log(c.dim(`  cutouts: ${useChroma ? 'magenta chroma key, removed during ingest' : 'real alpha from the API'}`));
console.log(c.yellow(`\n  create the batch with endpoint ${URL_FOR[endpointKind]} - it must match the url on every line`));
console.log(c.dim(`\n  openai.batches.create(input_file_id=..., endpoint="${URL_FOR[endpointKind]}", completion_window="24h")`));
console.log(c.dim(`  then save each result as <custom_id>.png and run: node tools/ingest-assets.mjs <dir>\n`));
