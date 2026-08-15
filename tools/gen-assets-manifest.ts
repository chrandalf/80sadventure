/**
 * Generate `public/assets/assets.json` - the complete art requirements for the
 * game, in a form an external asset-generation pipeline can consume.
 *
 * This is generated from the live game data rather than hand-written, so it
 * cannot drift: every scene, character, item, prop and hotspot in
 * `src/content/` is walked and turned into an asset request. Add a room and the
 * manifest gains its background on the next run.
 *
 *   npm run assets:manifest
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHARACTERS } from '../src/content/characters';
import { ITEMS } from '../src/content/items';
import { SCENES } from '../src/content/scenes';
import { SCENE_ART } from '../src/content/sceneArt';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/engine/Screen';
import { hotspotCentre } from '../src/game/normalizeScene';
import { PLAY_HEIGHT } from '../src/game/Ui';
import type { Hotspot, Scene } from '../src/game/types';

type AssetType =
  | 'background'
  | 'background-layer'
  | 'character-sheet'
  | 'portrait'
  | 'prop'
  | 'inventory-icon'
  | 'effect'
  | 'ui';

interface HotspotSpec {
  id: string;
  name: string;
  /** Bounding box in world pixels; what the art must actually depict there. */
  bounds: { x: number; y: number; w: number; h: number };
  centre: [number, number];
  /** Verbs the player can use on it, as a hint to how prominent it must be. */
  verbs: string[];
  /** True when the object is only present under some story condition. */
  conditional: boolean;
  /**
   * True when this region is a character rather than scenery. Characters are
   * supplied as separate sprite sheets and must NOT be painted into the
   * background, so these are excluded from the "must depict" list.
   */
  isCharacter: boolean;
}

interface AssetSpec {
  id: string;
  scene: string | null;
  type: AssetType;
  path: string;
  dimensions: { width: number; height: number };
  transparency: 'opaque' | 'alpha-required';
  animation: {
    animated: boolean;
    frameWidth?: number;
    frameHeight?: number;
    columns?: number;
    rows?: number;
    sheetWidth?: number;
    sheetHeight?: number;
    states?: string[];
    layout?: string;
  };
  characters: string[];
  hotspots: HotspotSpec[];
  layering: {
    plane: 'background' | 'midground' | 'foreground' | 'effects' | 'ui';
    /** Rows below this are covered by the interface panel during play. */
    safeArea?: { x: number; y: number; w: number; h: number };
    depthSorted?: boolean;
    notes?: string;
  };
  description: string;
  priority: 'p0' | 'p1' | 'p2';
}

const OUT = resolve(process.cwd(), 'public/assets/assets.json');

/** Bounding box of a hotspot, whether it is a rect or a polygon. */
function bounds(h: Hotspot) {
  if (h.polygon?.length) {
    const xs = h.polygon.map((p) => p[0]);
    const ys = h.polygon.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  const r = h.rect!;
  return { x: r.x, y: r.y, w: r.w, h: r.h };
}

function hotspotSpecs(scene: Scene): HotspotSpec[] {
  const out: HotspotSpec[] = [];
  for (const h of scene.hotspots ?? []) {
    out.push({
      id: h.id,
      name: h.name,
      bounds: bounds(h),
      centre: hotspotCentre(h).map(Math.round) as [number, number],
      verbs: Object.keys(h.verbs ?? {}),
      conditional: !!(h.visibleIf || h.hiddenUntil),
      isCharacter: !!CHARACTERS[h.id],
    });
  }
  for (const e of scene.exits ?? []) {
    out.push({
      id: e.id,
      name: e.name,
      bounds: { x: e.rect.x, y: e.rect.y, w: e.rect.w, h: e.rect.h },
      centre: [Math.round(e.rect.x + e.rect.w / 2), Math.round(e.rect.y + e.rect.h / 2)],
      verbs: ['EXIT'],
      conditional: !!(e.requires || e.visibleIf),
      isCharacter: false,
    });
  }
  return out;
}

/** A prose brief for the illustrator, assembled from what the room contains. */
function describeScene(scene: Scene, spots: HotspotSpec[]): string {
  // Characters are separate sprite sheets, so they are deliberately excluded
  // from what the background plate must contain.
  const named = spots
    .filter((s) => s.verbs[0] !== 'EXIT' && !s.isCharacter)
    .map((s) => `${s.name} (around x${s.centre[0]}, y${s.centre[1]})`);
  const exits = spots.filter((s) => s.verbs[0] === 'EXIT').map((s) => s.name);
  const cast = (scene.characters ?? []).map((c) => CHARACTERS[c.id]?.name ?? c.id);

  const parts = [
    `${scene.name}. Interior/exterior of a fictional British seaside town, Brighton Vale, on the night of Friday 18 September 1987.`,
    'Late-1980s/early-1990s VGA point-and-click adventure background: hand-illustrated, richly detailed, painterly, warm practical light sources, strong readable composition.',
  ];
  if (named.length) {
    parts.push(`Must clearly depict, positioned so these screen coordinates land on the object: ${named.join('; ')}.`);
  }
  if (exits.length) parts.push(`Visible ways out: ${exits.join('; ')}.`);
  if (cast.length) parts.push(`Characters stand in this room (drawn separately, not in the background): ${cast.join(', ')}.`);
  parts.push(
    // "No characters" flatly contradicts a must-depict list that names a
    // figure, and a contradicted prompt gets reasoned about rather than drawn.
    // What is meant is that the cast are sprites, not painted into the plate.
    'None of the named characters are painted into the plate - they are supplied separately as sprites. No text, no UI, no watermark.',
    `Compose the important content in the top ${PLAY_HEIGHT} rows; the bottom ${GAME_HEIGHT - PLAY_HEIGHT} rows sit behind the interface panel during play.`,
  );
  return parts.join(' ');
}

const assets: AssetSpec[] = [];

// ------------------------------------------------------------- backgrounds
for (const scene of Object.values(SCENES)) {
  const spots = hotspotSpecs(scene);
  const art = SCENE_ART[scene.id];
  assets.push({
    id: `bg.${scene.id}`,
    scene: scene.id,
    type: 'background',
    path: art?.background ?? `/assets/backgrounds/${scene.id}.webp`,
    dimensions: { width: GAME_WIDTH, height: GAME_HEIGHT },
    transparency: 'opaque',
    animation: { animated: false },
    characters: (scene.characters ?? []).map((c) => c.id),
    hotspots: spots,
    layering: {
      plane: 'background',
      safeArea: { x: 0, y: 0, w: GAME_WIDTH, h: PLAY_HEIGHT },
      notes: `Rows ${PLAY_HEIGHT}-${GAME_HEIGHT} are covered by the verb/inventory panel in normal play.`,
    },
    description: describeScene(scene, spots),
    priority: scene.id === 'starlight_arcade' ? 'p0' : 'p1',
  });

  for (const layer of art?.layers ?? []) {
    assets.push({
      id: `bg.${scene.id}.${layer.plane}`,
      scene: scene.id,
      type: 'background-layer',
      path: layer.src,
      dimensions: { width: GAME_WIDTH, height: GAME_HEIGHT },
      transparency: 'alpha-required',
      animation: { animated: false },
      characters: [],
      hotspots: [],
      layering: {
        plane: layer.plane,
        notes:
          layer.plane === 'foreground'
            ? 'Near-camera scenery, composited over characters. Everything not part of that scenery must be fully transparent.'
            : 'Composited between the background plate and the characters.',
      },
      description:
        `Optional ${layer.plane} layer for ${scene.name}, aligned pixel-for-pixel with the background plate. ` +
        (layer.plane === 'foreground'
          ? 'Only the objects nearest the camera, which characters should be able to walk behind. Everything else transparent.'
          : 'Scenery sitting behind characters but in front of the base plate.'),
      priority: 'p2',
    });
  }
}

// --------------------------------------------------------------- characters

/**
 * Frame geometry comes from the sprite manifest, which is where the game reads
 * it too. It used to be repeated here, so changing the cell size in one place
 * silently left the art spec describing the other.
 */
const CHARACTER_MANIFEST = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/assets/characters/manifest.json'), 'utf8'),
) as { templates: Record<string, { frameWidth: number; frameHeight: number; columns: number; rows: number }> };

const PERSON = {
  ...CHARACTER_MANIFEST.templates.person,
  layout:
    'Row 0 = facing camera, row 1 = facing right, row 2 = facing away, row 3 = expressions. ' +
    'Left-facing is generated by mirroring row 1, so do not draw it. Columns 0-3 of rows 0-2 are ' +
    'the walk cycle (column 0 doubles as the standing pose); columns 4-5 are a two-frame talk loop. ' +
    'Row 3 columns 0-5 are: surprised, annoyed, happy, frightened, worried, smug. ' +
    'Anchor is bottom-centre of each frame - the character stands on that point.',
  states: ['idle', 'walk', 'talk', 'surprised', 'annoyed', 'happy', 'frightened', 'worried', 'smug'],
};

/** Which scenes each character appears in, for context in the brief. */
const appearsIn = new Map<string, string[]>();
for (const scene of Object.values(SCENES)) {
  for (const c of scene.characters ?? []) {
    if (!appearsIn.has(c.id)) appearsIn.set(c.id, []);
    appearsIn.get(c.id)!.push(scene.id);
  }
}

const CHARACTER_BRIEFS: Record<string, string> = {
  jack: 'Jack Mercer, 20, male. Trainee arcade-machine technician and the player character. Cheap dark bomber jacket over a band t-shirt, jeans, trainers, unfortunate 1987 hair. Wiry, slightly slouched, permanently unimpressed.',
  maggie: 'Margaret "Maggie" Vale, 19, female. Works at the arcade. Practical and guarded, never styled as a romantic prize. Denim jacket, dark red top, jeans, boots. Stands like someone who knows more than she is saying.',
  arthur: 'Arthur Bell, 57, male. Owns the arcade. Enormous grey moustache, permanent mustard cardigan over shirt and tie, slacks. Slightly stooped, hands often in cardigan pockets.',
  derek: 'Derek Piper, 32, male. Television repairman and conspiracy theorist. Brown shop coat over a shirt, wild hair, oversized square glasses. Always mid-gesture, mid-explanation.',
  kevin: 'Kevin, 16, male. Arcade kid. Shell suit in colours that should not co-exist, trainers, pockets sagging with ten-pence pieces. Permanently smug posture.',
  brenda: 'Brenda Holt, 46, female. Runs the amusement-park kiosk. Tabard over a blouse, immovable set hair, arms folded as a default stance.',
  valerie: 'Valerie Price, 28, female. Receptionist at the Golden Sands Hotel. Glamorous and sardonic; sharp 1987 shoulders, gold earrings, immaculate. Bored expression as a resting state.',
  graham: 'Graham, 34, male. Owns the video rental shop. Slightly-too-tight polo shirt, moustache, the unhurried patience of a man who has heard every excuse twice.',
  vale: 'Dr Elliot Vale. White shirt, dark trousers, black tie - always exactly this. Row 3 holds his three states instead of expressions: 0 = full black silhouette with no facial detail at all, 1 = normal and fully rendered, 2 = distorted, as though torn by scanlines. His face must be unreadable in state 0.',
  guest: 'A hotel guest, adult male, seen for one comic beat wrapped in a bath towel from the waist down. Drawn from the chest up in near-silhouette against a bright doorway; no explicit detail. He is calm and dignified; the joke is entirely Jack\'s reaction.',
  cabin: 'A changing-cabin occupant, adult woman, seen for a single frame behind a half-drawn striped curtain before the scene cuts away. Flat, featureless silhouette only - no anatomical or facial detail whatsoever. Staged so the curtain and cabin frame obscure the figure.',
  crowd: 'A generic arcade punter, recoloured per instance to populate the early-evening arcade. Ordinary British 1987 casual clothing, nothing distinctive.',
};

/**
 * The poses each character is generated in, and which cells of the sheet each
 * one fills.
 *
 * A model cannot draw twenty-four consistent frames, but it can draw six
 * separate pictures of the same person. Ingest assembles them, scaling the
 * whole set by one factor so nobody changes height between frames. Cells no
 * pose claims fall back to the standing pose, so a missing generation costs
 * that movement rather than the character.
 */
const POSES = [
  {
    key: 'front_stand',
    cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5]],
    brief: 'Standing still, facing the camera, arms relaxed at the sides, feet together, weight even.',
  },
  {
    key: 'front_talk',
    cells: [[0, 5]],
    brief: 'Facing the camera mid-sentence: mouth open, chin slightly raised, one hand lifted a little as if explaining something. Same stance and same feet as the standing pose.',
  },
  {
    key: 'side_stand',
    cells: [[1, 0], [1, 2], [1, 4], [1, 5]],
    brief: 'In full profile facing to the right, standing still, arms at the sides, feet together.',
  },
  {
    key: 'side_walk_a',
    cells: [[1, 1]],
    brief: 'In full profile facing to the right, mid-stride: near leg forward and bent at the knee, far arm swung forward, body leaning very slightly into the step.',
  },
  {
    key: 'side_walk_b',
    cells: [[1, 3]],
    brief: 'In full profile facing to the right, mid-stride on the opposite foot to the other walking pose: far leg forward, near arm swung forward.',
  },
  {
    key: 'back_stand',
    cells: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5]],
    brief: 'Seen from directly behind, facing away from the camera, arms at the sides. No face visible.',
  },
] as const;

for (const [id, def] of Object.entries(CHARACTERS)) {
  if (!def.sprite) continue;
  const scenes = appearsIn.get(id) ?? [];
  assets.push({
    id: def.sprite,
    scene: scenes[0] ?? null,
    type: 'character-sheet',
    path: `/assets/characters/${id}.png`,
    dimensions: {
      width: PERSON.frameWidth * PERSON.columns,
      height: PERSON.frameHeight * PERSON.rows,
    },
    transparency: 'alpha-required',
    animation: {
      animated: true,
      frameWidth: PERSON.frameWidth,
      frameHeight: PERSON.frameHeight,
      columns: PERSON.columns,
      rows: PERSON.rows,
      sheetWidth: PERSON.frameWidth * PERSON.columns,
      sheetHeight: PERSON.frameHeight * PERSON.rows,
      states: PERSON.states,
      layout: PERSON.layout,
    },
    characters: [id],
    hotspots: [],
    layering: { plane: 'midground', depthSorted: true, notes: 'Sorted against other characters and props by baseline y.' },
    description:
      `${CHARACTER_BRIEFS[id] ?? def.name}. ` +
      'Sprite sheet for a late-1980s VGA point-and-click adventure: bold readable silhouette, thick dark contour, ' +
      'flat cel shading with two or three tones per surface, no gradients, no anti-aliased edges. ' +
      'Fully transparent background. Consistent proportions and colours across every frame on the sheet. ' +
      `Appears in: ${scenes.length ? scenes.join(', ') : 'cutscenes only'}.`,
    priority: id === 'jack' ? 'p0' : scenes.length ? 'p1' : 'p2',
  });

  for (const pose of POSES) {
    assets.push({
      id: `${def.sprite}.${pose.key}`,
      scene: scenes[0] ?? null,
      type: 'character-pose',
      path: `/assets/characters/poses/${id}.${pose.key}.png`,
      dimensions: { width: PERSON.frameWidth, height: PERSON.frameHeight },
      transparency: 'alpha-required',
      animation: { animated: false },
      // How ingest folds this picture into the sheet.
      assemble: {
        sheet: def.sprite,
        sheetPath: `/assets/characters/${id}.png`,
        cells: pose.cells.map(([row, col]) => ({ row, col })),
      },
      characters: [id],
      hotspots: [],
      layering: { plane: 'midground', depthSorted: true, notes: 'Assembled into the character sheet by assets:ingest.' },
      description:
        `${CHARACTER_BRIEFS[id] ?? def.name} ` +
        `POSE: ${pose.brief} ` +
        'One single full-length figure, whole body visible from the top of the head to the soles of the shoes, ' +
        'standing at the same height and the same distance from the camera in every pose of this set. ' +
        'Late-1980s VGA point-and-click adventure character art: bold readable silhouette, thick dark contour, ' +
        'flat cel shading with two or three tones per surface, no gradients. ' +
        'Exactly the same person as the other poses of this character: identical face, hair, build and clothing, in identical colours.',
      priority: id === 'jack' ? 'p0' : scenes.length ? 'p1' : 'p2',
    });
  }

  assets.push({
    id: `portrait.${id}`,
    scene: null,
    type: 'portrait',
    path: `/assets/portraits/${id}.png`,
    dimensions: { width: 128, height: 128 },
    transparency: 'alpha-required',
    animation: { animated: false },
    characters: [id],
    hotspots: [],
    layering: { plane: 'ui', notes: 'Optional. Shown beside dialogue if present; dialogue works without it.' },
    description:
      `Head-and-shoulders portrait of ${def.name} in the same style as the sprite sheet. ` +
      `${CHARACTER_BRIEFS[id] ?? ''} Neutral expression, facing slightly off-camera, transparent background.`,
    priority: 'p2',
  });
}

// --------------------------------------------------------- props and icons
const propScenes = new Map<string, { scene: string; id: string }>();
for (const scene of Object.values(SCENES)) {
  for (const o of scene.objects ?? []) propScenes.set(o.sprite, { scene: scene.id, id: o.id });
}
for (const [sprite, where] of propScenes) {
  assets.push({
    id: sprite,
    scene: where.scene,
    type: 'prop',
    path: `/assets/objects/${sprite.replace(/^prop\./, 'prop_')}.png`,
    dimensions: { width: 64, height: 64 },
    transparency: 'alpha-required',
    animation: { animated: true, frameWidth: 32, frameHeight: 32, columns: 2, rows: 1, states: ['idle', 'active'], layout: 'Frame 0 = resting, frame 1 = active/alternate. Anchor is bottom-centre.' },
    characters: [],
    hotspots: [],
    layering: { plane: 'midground', depthSorted: true, notes: 'Depth-sorts against characters by baseline y - characters pass both in front of and behind it.' },
    description: `Free-standing scene prop "${where.id}" in ${where.scene}. Same illustration style as the backgrounds, transparent background, lit to match the room.`,
    priority: 'p2',
  });
}

for (const item of Object.values(ITEMS)) {
  const spriteId = item.id.startsWith('cassette_') ? item.id : `item.${item.id}`;
  assets.push({
    id: spriteId,
    scene: null,
    type: 'inventory-icon',
    path: `/assets/objects/${spriteId.replace(/^item\./, 'item_')}.png`,
    dimensions: { width: 16, height: 16 },
    transparency: 'alpha-required',
    animation: { animated: false },
    characters: [],
    hotspots: [],
    layering: { plane: 'ui', notes: 'Drawn in an inventory slot at 2x. Keep one pixel of padding all round.' },
    description:
      `Inventory icon for "${item.name}". ${item.look} ` +
      'Single object centred on a fully transparent background, readable as a silhouette at 16x16, ' +
      'bold dark outline, flat cel shading, 1987 British period-appropriate.',
    priority: 'p1',
  });
}

// --------------------------------------------------------- ui and effects
assets.push({
  id: 'ui.title_background',
  scene: null,
  type: 'ui',
  path: '/assets/ui/title_background.webp',
  dimensions: { width: GAME_WIDTH, height: GAME_HEIGHT },
  transparency: 'opaque',
  animation: { animated: false },
  characters: [],
  hotspots: [],
  layering: { plane: 'ui', notes: 'Title screen plate. The logo and menu are drawn over it by the engine.' },
  description:
    'Title screen background: the interior of Starlight Arcade at night, seen down the row of cabinets, ' +
    'their screens the only light source. Deep shadow across the upper third so the logo reads over it. ' +
    'No text of any kind in the image.',
  priority: 'p1',
});

for (const [id, desc] of [
  ['effects.rain', 'Tileable rain overlay for exterior scenes: fine diagonal streaks, mostly transparent, no colour cast.'],
  ['effects.dust', 'Floating dust motes for interiors lit by a single source. Very sparse, soft, mostly transparent.'],
  ['effects.crt_glow', 'Soft additive glow to sit over arcade screens. Mostly transparent, warm centre falloff.'],
] as const) {
  assets.push({
    id,
    scene: null,
    type: 'effect',
    path: `/assets/effects/${id.split('.')[1]}.png`,
    dimensions: { width: GAME_WIDTH, height: GAME_HEIGHT },
    transparency: 'alpha-required',
    animation: { animated: false },
    characters: [],
    hotspots: [],
    layering: { plane: 'effects', notes: 'Composited over everything including characters.' },
    description: desc,
    priority: 'p2',
  });
}

// ------------------------------------------------------------------ output
const manifest = {
  $schema: 'https://one-more-credit.local/assets.schema.json',
  generated: 'by tools/gen-assets-manifest.ts - do not edit by hand, run `npm run assets:manifest`',
  game: 'ONE MORE CREDIT',
  renderResolution: { width: GAME_WIDTH, height: GAME_HEIGHT },
  playfield: { width: GAME_WIDTH, height: PLAY_HEIGHT, note: 'Rows below this are behind the interface panel.' },
  artDirection: {
    era: 'Late-1980s / early-1990s VGA point-and-click adventure (the 256-colour era, not the 16-colour EGA era).',
    reference: 'Hand-illustrated, painterly backgrounds with strong composition and warm practical lighting. Characters are cel-shaded with bold dark contours.',
    setting: 'Brighton Vale, a fictional British seaside town, over a single night: Friday 18 September 1987, 19:00 to midnight.',
    rules: [
      'Backgrounds contain no characters, no text, no UI and no watermarks.',
      'Characters and props are supplied separately with full alpha.',
      'Every background is exactly 640x400. Every sprite sheet is exactly the dimensions given.',
      'Alpha must be binary - fully opaque or fully transparent. Soft edges halo when the image is scaled.',
      'Interaction is defined by invisible polygons in the game data. Art must depict the listed hotspots at the stated pixel positions so the two agree.',
      'Nothing may reference or reproduce an existing commercial game, film or brand.',
    ],
  },
  counts: {
    total: assets.length,
    byType: assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.type] = (acc[a.type] ?? 0) + 1;
      return acc;
    }, {}),
    byPriority: assets.reduce<Record<string, number>>((acc, a) => {
      acc[a.priority] = (acc[a.priority] ?? 0) + 1;
      return acc;
    }, {}),
  },
  assets,
};

writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wrote ${OUT}`);
console.log(`  ${assets.length} assets`);
for (const [k, v] of Object.entries(manifest.counts.byType)) console.log(`    ${k}: ${v}`);
