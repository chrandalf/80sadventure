/**
 * Headless content check: `npm run validate`.
 *
 * Runs the same reference and geometry validators the game runs at boot, but
 * in Node, so a dangling id or an unreachable walkTo fails before anyone has
 * to play their way to it. Sprite ids come straight from the two manifests the
 * browser loader would fetch.
 */
import { readFileSync } from 'node:fs';
import { validateContent, validateGeometry } from '../src/content/validate';

const spriteIds = new Set<string>();
for (const path of ['public/assets/characters/manifest.json', 'public/assets/objects/manifest.json']) {
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as { sprites: Record<string, unknown> };
  for (const id of Object.keys(manifest.sprites)) spriteIds.add(id);
}

const problems = [...validateContent(spriteIds), ...validateGeometry()];

if (problems.length) {
  console.error(`${problems.length} content problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('content: all references and geometry check out');
