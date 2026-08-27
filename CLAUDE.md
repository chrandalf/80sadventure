# ONE MORE CREDIT

A 1987-set British point-and-click comedy adventure. TypeScript + Vite + a
hand-rolled HTML5 canvas engine, 640x400 internal resolution, nearest-neighbour
upscale. No game framework, no React, no state library.

This file is the briefing for whoever picks the project up next. The long-form
docs are in `docs/`; this is the part you need before touching anything.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc --noEmit && vite build - must stay green
npm run validate     # content/geometry validator - must stay green
```

Two checks gate every change: `npm run build` and `npm run validate`. Run both
before committing. The validator catches the class of bug that is invisible
until someone plays the room - an entry point inside a wall, an exit that
overlaps another exit, a patrol route off the walkable area, a dialogue
condition naming a character that does not exist.

Jump straight to a room while developing: `http://localhost:5173/?room=hotel_bar`.

Prototypes (not part of the game, safe to break):
`/office3d.html`, `/office_hybrid.html`, `/office_depth.html`.

---

## The shape of the thing

Roughly half the code is data and half is rendering, and the split is
deliberate - the content layer knows nothing about canvas, so it survives a
change of renderer.

```
src/content/   ~7,900 lines   scenes, dialogue, items, characters, endings
src/engine/    ~2,000 lines   screen, sprites, palette, bitmap font, audio
src/game/      ~6,300 lines   actors, pathfinding, UI, dialogue runner, minigames
src/proto/                    three.js experiments, not wired into the game
tools/                        asset pipeline, validators, one-off fixers
public/assets/                painted plates, character sheets, audio, depth maps
```

`src/content/scenes/{arcade,town,story,hotel}.ts` hold 32 rooms, merged into one
flat map by `scenes/index.ts`. 34 painted plates live in
`public/assets/backgrounds/`.

### Coordinates

Rooms were originally authored at 320x200 and the world is now 640x400.
`src/game/normalizeScene.ts` doubles everything on load. A room opts out by
declaring `space: 'world'`, and then its numbers are taken as-is. **If you add a
new positional field to a scene, add it to the normaliser too** - patrol routes
were silently half-scale for a while because of exactly this.

### Depth: occluders vs blockers

Two different jobs, easy to confuse:

- **Blocker** - a polygon subtracted from the walkable area. The character
  cannot path there. Use this for the footprint of solid furniture.
- **Occluder** - a polygon clipped out of the plate's own pixels and redrawn
  *in front of* the actor, sorted by baseline y. Use this for things the
  character walks behind.

The lesson from the office: if a character can walk somewhere they visibly
should not be, fix it with a blocker, not by hand-tuning an occluder. Arthur's
desk is a blocker with no occluder at all, and that ended a long-running
ghosting bug.

`src/proto/officeDepth.ts` is the experiment meant to replace hand-traced
occluders entirely - see the GPU section below.

### Characters

Ten poses per character, assembled into a 6x5 sheet by `tools/ingest-assets.mjs`.
Two rules that were learned the hard way:

- The sheet scale is derived from **height alone**, never
  `min(fh/tallest, fw/widest)`. One wide pose once shrank a whole character to
  two-thirds size.
- Backgrounds key on **flat magenta**, alpha is binary, resampling is
  premultiplied.

**What is actually in git:** the 34 room plates, and the generated originals in
`incoming/`. Character sheets are *not* - they are built on your machine by
`npm run assets:ingest` from whatever source art you hold, and the per-pose
cache under `public/assets/characters/poses/` is ignored on purpose. A fresh
clone therefore renders characters as labelled placeholders until you ingest.
That is working as intended, not a broken checkout.

Idle fidgets and patrols are in `src/game/Actor.ts`. The constants are
calibrated, not arbitrary: 55-150s between fidgets, 2.6-4.2s holds, 7s settle.
They were tuned down from something that read as "a nervous breakdown". If you
touch them, err slower. Standing still should look like standing still.

---

## Content rules - these are not negotiable

1. **Everything original.** No copyrighted characters, artwork, dialogue, music
   or assets. The arcade cabinets are deliberately *not* the games they evoke -
   see `src/game/arcadeSprites.ts`, which is hand-authored pixel data.
2. **Do not rebuild the game from scratch**, and do not rewrite functionality
   that already works. Changes are surgical.
3. **Do not generate fake artwork** - no placeholder rectangles committed as if
   they were art. This has happened; `public/assets/characters/poses/` is
   gitignored because of it. Never `git add -A` in this repo without reading
   the list first.
4. **Rating: 15.** Innuendo, seaside-postcard smut, slob physical comedy. The
   art tier that goes furthest is capped in every prompt: rear views at a
   distance, nothing frontal, no anatomical detail, adults only.
5. **Kevin is 16 and is excluded from all of that**, in dialogue and in art.
   No exceptions, no jokes that land on him.

---

## The GPU work queue

The project was built in a sandbox with no graphics card, which is the only
reason these are outstanding. `docs/RUNNING-LOCALLY.md` has the setup.

**1. Real depth maps.** `public/assets/depth/` currently holds *one* map, and it
is a ray-cast stand-in generated by `tools/depth/synth-depth.mjs` from the
hybrid prototype's boxes - not a prediction. Replace it:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu124   # match the driver
pip install -r tools/depth/requirements.txt
npm run assets:depth          # Depth Anything V2 over all 34 plates
```

Then open `/office_depth.html`, press **V** to flip between painting and depth,
and walk the character around the desk. The shader writes `gl_FragDepth` from
the map, so every painted edge occludes with no hand-traced polygon anywhere in
the rendering path. Scale is two numbers per room (`DEPTH_NEAR`/`DEPTH_FAR` in
`src/proto/officeDepth.ts`).

**2. The architecture decision that depends on it.** Three prototypes exist so
this can be judged by eye rather than argued about:

| | keeps the painted art | per-room cost | |
|---|---|---|---|
| `office3d.html` | no - rebuilt in 3D | high | loses the look |
| `office_hybrid.html` | yes | ~10 min of box calibration | works, tedious |
| `office_depth.html` | yes | two numbers | best, needs the GPU |

Nothing has been committed to. The game as shipped is still pure 2D and
untouched by any of it.

**3. Local image generation.** With torch installed, SDXL or Flux via ComfyUI
removes the per-image API cost that has been capping every art run, and lets a
room be re-rolled until one looks right. This is the bigger prize than depth.

---

## Also outstanding

- **The Bather has one pose.** She stands frozen while everyone around her
  fidgets. Nine more poses, ~36c through the paid pipeline or free locally.
- **Two hand-generated files are sitting on the author's machine**, not in the
  repo, and need renaming into `incoming/` before `npm run assets:ingest --
  --force` will pick them up: `guest_spicy_front.jpg` ->
  `char.guest.front_stand.jpg`, `guest_female_front.jpg` ->
  `char.cabin.front_stand.jpg`.
- **The walkthrough has never been played end-to-end in sequence.** Individual
  puzzles work; nobody has checked for an ordering trap that makes the game
  unwinnable. `docs/WALKTHROUGH.md` is the script to follow.
- **Revoke the old xAI and OpenRouter keys** if they still exist. They went
  through a chat transcript. New ones belong in an uncommitted `.env`.

---

## Traps that have already cost time

- A flag parser that accepted `--budget` with no value produced `NaN`, and
  because NaN fails every comparison the spending cap silently never fired.
  Validate numeric flags.
- OpenRouter's `/images/generations` returns JPEG, not PNG. The runner sniffs
  magic bytes and the ingest tool decodes both; do not assume the extension.
- Edit scripts that assert every replacement before writing will discard the
  whole batch on one failed assertion. Check the file actually changed.
- Screenshot-driven room audits that click a fixed point to dismiss dialogue
  will sometimes click an exit and photograph the wrong room. Drive with the
  keyboard.

---

## Documentation

| | |
|---|---|
| `docs/SPEC.md` | the original design brief the game was built against |
| `docs/PROGRESS.md` | what has been built, in order, and why |
| `docs/WALKTHROUGH.md` | the full solution - use it to test |
| `docs/GENERATING-ART.md` | the art pipeline, three commands |
| `docs/ASSETS.md` | sprite contract, sheet layout, the asset validator |
| `docs/RUNNING-LOCALLY.md` | GPU setup |

---

## House style

Prose in comments, not labels. Explain *why* a thing is the way it is, since
the *what* is already in the code below it. Match the surrounding density -
this codebase comments the reasoning behind a decision and says nothing about
an obvious loop. Same for commit messages: what changed and what problem it
solves, in sentences.
