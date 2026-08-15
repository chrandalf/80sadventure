import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './lib.mjs';

/**
 * The list of background ids, read straight out of the painter module.
 *
 * Parsing the source keeps this list from drifting: the tools cannot import the
 * TypeScript directly (it depends on the DOM), and a hand-maintained copy would
 * silently rot the first time somebody adds a room.
 */
function extractIds() {
  const src = readFileSync(resolve(ROOT, 'src/content/backgrounds.ts'), 'utf8');
  const start = src.indexOf('export const BACKGROUNDS');
  if (start < 0) return [];
  const body = src.slice(start);
  const ids = [];
  // Top-level entries are exactly two spaces in and take the form `name(c) {`.
  for (const m of body.matchAll(/^ {2}(\w+)\(c\)\s*\{/gm)) ids.push(m[1]);
  return ids;
}

export const BACKGROUND_IDS = extractIds();
