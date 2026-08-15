/**
 * Ask OpenRouter what it actually accepts, before spending anything.
 *
 *   OPENROUTER_API_KEY=sk-or-... node tools/probe-openrouter.mjs
 *
 * Lists the image-capable models on the account, then tries one tiny
 * generation against each candidate request shape and prints the raw reply.
 * The models listing is free; each generation attempt that succeeds costs one
 * image, so this is capped at three attempts.
 *
 * Exists because the unified image API and the chat-with-image-modalities
 * path have different bodies and different response shapes, and picking the
 * wrong one fails every request in a run.
 */
const key = process.env.OPENROUTER_API_KEY;
if (!key) {
  console.error('OPENROUTER_API_KEY is not set');
  process.exit(2);
}
const auth = { authorization: `Bearer ${key}`, 'content-type': 'application/json' };

console.log('--- image-capable models on this account ---');
try {
  const res = await fetch('https://openrouter.ai/api/v1/models', { headers: auth });
  const { data } = await res.json();
  const image = (data ?? []).filter((m) =>
    m.architecture?.output_modalities?.includes('image')
    || /image|imagen|flux|seedream|banana/i.test(m.id));
  for (const m of image.slice(0, 25)) {
    const p = m.pricing ?? {};
    console.log(`  ${m.id.padEnd(44)} out:${p.image ?? p.completion ?? '?'}`);
  }
  if (!image.length) console.log('  (none reported - printing first 5 ids as a sanity check)',
    (data ?? []).slice(0, 5).map((m) => m.id).join(', '));
} catch (e) {
  console.error('  models listing failed:', e.message);
}

const PROMPT = 'A red rubber duck on a plain flat magenta background.';

/** The two shapes OpenRouter documents, plus the chat fallback. */
const SHAPES = [
  {
    name: 'POST /api/v1/images (unified image API)',
    url: 'https://openrouter.ai/api/v1/images',
    body: { model: 'bytedance-seed/seedream-4.5', prompt: PROMPT, resolution: '1K', aspect_ratio: '1:1' },
  },
  {
    name: 'POST /api/v1/images/generations (OpenAI-compatible)',
    url: 'https://openrouter.ai/api/v1/images/generations',
    body: { model: 'bytedance-seed/seedream-4.5', prompt: PROMPT, n: 1 },
  },
  {
    name: 'POST /api/v1/chat/completions (modalities)',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    body: {
      model: 'google/gemini-2.5-flash-image',
      messages: [{ role: 'user', content: PROMPT }],
      modalities: ['image', 'text'],
    },
  },
];

for (const shape of SHAPES) {
  console.log(`\n--- ${shape.name} ---`);
  try {
    const res = await fetch(shape.url, { method: 'POST', headers: auth, body: JSON.stringify(shape.body) });
    const text = await res.text();
    console.log(`  HTTP ${res.status}`);
    // Base64 payloads are enormous; show the structure, not the pixels.
    const redacted = text.replace(/"([A-Za-z0-9+/]{200,}={0,2})"/g, (m, b) => `"<base64 ${b.length} chars>"`);
    console.log('  ' + redacted.slice(0, 900));
  } catch (e) {
    console.log('  request failed:', e.message);
  }
}
