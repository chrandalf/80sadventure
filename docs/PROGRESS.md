# ONE MORE CREDIT — project status & handover

**Branch:** `claude/video-game-graphics-hhp0rl`
**Last commit:** `d603ccb` — Refactor rendering onto an external asset pipeline
**State:** Playable start-to-finish. Engine complete. Awaiting real artwork.

---

## ⚠️ Read this first

**The original design specification is not in this repository.** It was pasted
into a chat session in two parts:

1. The main spec — premise, mechanic, six acts, characters, 20 locations,
   puzzles, endings, scoring, build instructions (numbered sections 1–45).
2. An expansion — "Cheeky 1980s adult comedy scenes" (numbered sections 46–56).

Everything below refers to those section numbers, and the code comments cite
them (`spec s.27`, `spec s.56`). **Re-add the spec to `docs/SPEC.md` before
doing further content work**, or that traceability is lost. A condensed canon
summary is in [Story bible](#story-bible) below, but it is not a substitute.

---

## What this is

A complete 1987-set British point-and-click comedy adventure, built as a browser
game — engine and content both written from scratch.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

---

## Current state

### Working and verified

| Area | Status |
|---|---|
| Adventure engine | Complete |
| Eight-verb interface, hotspots, inventory | Complete |
| Walkboxes, perspective scaling, depth sorting | Complete |
| Branching dialogue, per-character states | Complete |
| Action DSL (all content is data) | Complete |
| Save/load — 5 slots + autosave | Complete |
| Three-level hint system | Complete |
| Scoring (1000pt) + CHEEKY MOMENTS (0/12) | Complete |
| 4 endings incl. secret all-cassettes ending | Complete |
| 4 playable arcade minigames | Complete |
| Synthesised soundtrack + ~25 SFX (no audio files) | Complete |
| 33 scenes, six acts, full puzzle chain | Complete |
| External asset pipeline | Complete |
| `assets.json` art spec (92 assets) | Complete |

Last full verification run: **13/13** on the refactor checklist — polygon
hotspot hit tests, LOOK, inventory, dialogue, movement, save/load round trip,
missing-artwork fallback, supplied-artwork swap, zero runtime errors, zero
content-graph problems.

### Not done

- **Artwork.** No real art exists. Every scene renders a procedural fallback;
  every character renders a labelled placeholder. This is the main outstanding
  work and the reason `assets.json` exists.
- **Scene conversion.** Only `starlight_arcade` is converted to world (640×400)
  coordinates with polygon hotspots. The other **32 scenes are still authored in
  legacy 320×200** and auto-scaled at load. Deliberate — the brief said convert
  one scene first.
- **Optional jokes.** Spec s.16 asks for ~50; roughly 25 are written. The rest
  are pure data additions, no code needed.
- **Dialogue depth.** Rich for Arthur, Maggie, Derek, Kevin. Thinner for Brenda.
- **UI redesign.** Deferred by explicit instruction ("we will redesign the UI
  later").

---

## Architecture

```
src/engine/     Reusable. Knows nothing about Brighton Vale.
  Screen.ts         640x400 render target, integer scaling, optional CRT
  Palette.ts        ~224-colour palette interpolated from 32 key colours
  BitmapFont.ts     Hand-cut 5x7 font, drawn at 2x
  Sprite.ts         Sheets, animation, renderScale
  Loader.ts         AssetStore - manifest-driven sprite loading
  SceneArtStore.ts  Scene plates: artwork -> painter -> placeholder
  Input.ts, Audio.ts

src/game/       Adventure systems. No story content.
  AdventureScreen.ts  The main screen; implements RunnerHost
  ActionRunner.ts     Interprets the action DSL
  DialogueUi.ts       Conversation trees
  normalizeScene.ts   Legacy 320 -> world 640; polygon hit tests
  Actor.ts, Ui.ts, Speech.ts, Shell.ts, Minigames.ts, state.ts, paint.ts

src/content/    The game, as data. No logic.
  scenes/         33 scenes across arcade/town/story/hotel
  dialogue.ts     Every conversation
  items.ts        Inventory + bespoke comedy responses
  characters.ts   Cast, speech colours, talk routing
  endings.ts, hints.ts, visions.ts, backgrounds.ts, sceneArt.ts
  validate.ts     Startup content-graph checker

tools/          Node. No browser.
public/assets/  backgrounds/ characters/ portraits/ objects/ effects/ ui/ audio/
```

**The split is load-bearing.** Adding a room = one object in `src/content/scenes/`.
Adding a joke = one line of data. Neither touches engine code.

### Key mechanisms worth knowing

**Action DSL.** All content is tuple-tagged data interpreted by `ActionRunner`:

```ts
['jack', "That's reassuring."]
['if', ['has', 'butter'], [['flag', 'doorGreased']], [['jack', 'Not without grease.']]]
```

**Two action runners.** Conversations run on `dialogueRunner`; everything else on
`runner`. This is not incidental — a single runner **deadlocks**: the main runner
blocks waiting for the dialogue to close, so any action produced *by* a dialogue
line could never execute. That bug froze the game on the very first conversation
and only surfaced when actually running it.

**Scene normalisation.** `normalizeScene()` converts legacy scenes to world
coordinates at load. The runtime only ever sees 640×400. To migrate a scene: add
`space: 'world'` and double its numbers.

**Art resolution order** (`SceneArtStore`):
1. External artwork at the manifest path — wins, loads async, swaps in live
2. The procedural painter, upscaled — the coalescing fallback
3. A labelled `ARTWORK PLACEHOLDER` card

**Content validator.** `validateContent()` walks the whole content graph at
startup for dangling references. In an adventure game a typo is a *silent
soft-lock*, not a crash. It caught 6 real issues when introduced. Currently 0.

**F1** toggles a debug overlay drawing walkboxes, hotspot polygons and object
baselines over the art.

---

## Art direction — how we got here

This changed direction several times. The history matters, because the repo
contains artefacts from each phase.

1. **Procedural pixel art, 320×200, 32-colour palette.** 33 backgrounds painted
   in code. Worked, shipped, looked coherent.
2. **"Too blocky, more like Day of the Tentacle."** Diagnosed: everything was
   built from `rect()` calls, and ordered dithering left a visible 4×4
   checkerboard. Fixed by expanding the palette to ~224 interpolated shades
   (killing the need to dither) and adding `snapToPalette` so painters could use
   real curves and gradients. Added cel-shading primitives with dark contours.
3. **"Stop programmatic artwork entirely — external asset pipeline."** The
   current direction. Engine refactored to consume external images at 640×400.
4. **"Keep the art you've done until it's replaced."** So the painters remain as
   the fallback rather than showing bare placeholder cards.

**Consequence:** `src/content/backgrounds.ts` and the cel-shading half of
`src/game/paint.ts` are now *fallback-only*. They are not the direction. Do not
invest in them further. They can be deleted in one commit once artwork lands.

---

## Next steps, in order

1. **Restore `docs/SPEC.md`** from the chat history.
2. **Generate artwork** from `public/assets/assets.json`. Start with the `p0`
   assets: `bg.starlight_arcade` and `char.jack`.
3. **Drop art in and check it.** `public/assets/backgrounds/starlight_arcade.webp`
   (640×400) and `public/assets/characters/jack.png` (144×160). No rebuild
   needed. Press **F1** to confirm hotspot polygons land on the painted objects.
4. **Adjust polygons, not art.** If they disagree, edit the polygon in
   `src/content/scenes/arcade.ts` — that is the whole point of the separation.
5. **Convert the remaining 32 scenes** once the first proves out. Add
   `space: 'world'`, double the coordinates, add polygons.
6. Then: remaining optional jokes, Brenda's dialogue, UI redesign.

---

## Commands

| | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + build |
| `npm run assets:manifest` | Regenerate `assets.json` from live game data |
| `npm run assets:validate` | Check art against manifests and palette |
| `npm run assets:placeholders` | Drawing templates at exact final sizes |

`assets.json` is **generated, never hand-edited** — it walks `SCENES`,
`CHARACTERS` and `ITEMS`, so it cannot drift. Add a room, re-run it, and the
manifest gains that background with its hotspot coordinates.

---

## assets.json

92 assets. Per asset: id, scene, type, path, dimensions, transparency,
animation layout, characters required, interaction hotspots **with pixel
coordinates**, layering plane, prose description, priority.

| Type | Count |
|---|---|
| background | 33 |
| inventory-icon | 33 |
| character-sheet | 10 |
| portrait | 10 |
| effect | 3 |
| background-layer / prop / ui | 1 each |

The coordinate list in each background brief is the important bit — it keeps
generated art aligned with the invisible hotspots.

**Character sheet layout** (144×160, 6×4 frames of 24×40): row 0 faces camera,
row 1 faces right, row 2 faces away, row 3 is six expressions. Left-facing is
mirrored from row 1 automatically — never draw it. Anchor is bottom-centre.

---

## Story bible

Condensed canon, for orientation only. **Not a replacement for the spec.**

**Premise.** Friday 18 September 1987, Brighton Vale, a fictional British
seaside town. Jack Mercer, 20, trainee arcade technician, is closing up
Starlight Arcade on its last night before demolition. At 23:17 every machine
switches on and shows a photograph of the arcade *tomorrow* — still standing,
with Jack in the doorway.

**Central mechanic.** The arcade remembers. Machines replay "memories from
tomorrow". Someone built a machine that can record and replay an entire day.

**The twist.** Arthur is not a villain. He is trying to *save* the town by
preserving Friday forever. The man scratched out of the 1974 photograph is
Dr Elliot Vale, Maggie's father, who did not abandon her — he went into the
machine at 11:17 on a Tuesday in 1974. Every clock in town has read 11:17 since.

**The theme (spec s.44).** If you could preserve one perfect day forever, would
you? Arthur says yes, Maggie says no. The correct answer is neither destroy nor
preserve, but **record something new**.

**Cast.** Jack Mercer (20, dry, usually wrong). Maggie Vale (19, guarded,
explicitly *not* a romantic prize). Arthur Bell (57, moustache, cardigan).
Derek Piper (32, TV repairman, conspiracy theorist, occasionally correct).
Brenda Holt (46, kiosk, ~700 rules). Kevin (16, arcade kid, lying about his high
scores). Valerie Price (28, hotel receptionist). Graham (34, video shop).
Dr Elliot Vale (white shirt, black tie, face unreadable).

**Critical path.** £2.40 debt → arcade key → poster → office key → screwdriver →
first strange event → pier photo booth → red coat → cinema (butter + coat hanger
→ fuse → projector → film) → Derek explains → three machine predictions → clock
tower brass key → cassette JACK → Maggie's confession → basement → machine room →
POWER (fuse box order 3,1,4,2, clued by cabinet numbers) + SIGNAL (Derek's
antenna, cut, on the roof) + MEMORY (safe, combination 1974, clued by the
photograph) → final choice.

**Endings.** `record` (intended), `destroy`, `preserve` (loops), `secret` (all
six cassettes).

**Tone.** 60% dry British comedy, 20% absurdity, 15% nostalgia, 5% genuinely
unsettling. It should occasionally go quiet.

---

## Content boundary on sections 46–56

The adult-comedy material is implemented exactly as the spec mandates: staged
through silhouettes, frosted glass, obscuring objects and hard cuts away.
Nothing explicit is drawn or animated, all characters are adults, and every one
of these scenes is optional except the projection-room poster, which spec s.53
deliberately makes load-bearing.

There was a later request to push it further, toward *Porky's*-style content.
The line held: **tone pushed hard toward 80s sex-comedy farce, rendering kept
non-explicit** — and specifically no peep-hole/voyeurism framing, where the
gag is covertly watching people who don't know you're there. A *Woman in Red*
homage was added instead, hung on the red-coated woman already in the plot.

The asset briefs in `assets.json` carry the same constraint (see `char.guest`
and `char.cabin`), so it survives into the art pipeline.

---

## Known risks

- **Only one scene is converted.** The legacy-coordinate path is a migration
  shim. It works and is tested, but two authoring spaces existing at once is
  temporary complexity that should be paid down.
- **4:3 ambiguity.** The brief asked for 4:3, but 640×400 is 8:5. True 4:3 needs
  1.2× vertical stretch, which distorts supplied artwork. Defaulted to square
  pixels (artwork shown as painted); `aspect: 'crt43'` is a one-word opt-in.
  Flagged, not silently decided.
- **Save compatibility.** `SAVE_VERSION` is 1 and the scene id `arcade_floor`
  was renamed to `starlight_arcade`. Old saves fall back to the first scene
  rather than crashing, but bump `SAVE_VERSION` if that becomes user-visible.
