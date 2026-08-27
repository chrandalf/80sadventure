# ONE MORE CREDIT

A 1980s point-and-click comedy adventure, built as a browser game.

> Friday, 18 September 1987. Brighton Vale. Tonight is the last night of the
> Starlight Arcade before it is demolished. At 11:17 PM every machine in the
> building switches on at once and shows the same photograph: the arcade,
> tomorrow, still standing — with you in the doorway.

```bash
npm install
npm run dev      # http://localhost:5173
```

No build step is needed to play, no backend, no accounts, no network calls.

---

> **Playing or testing it?** **[`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md)** is
> every step in order, with what to check in each room.
>
> **Working on this?** Start with **[`docs/PROGRESS.md`](docs/PROGRESS.md)** —
> current status, architecture, art-direction history, known gaps and next steps.
> The design brief the game was built against is **[`docs/SPEC.md`](docs/SPEC.md)**.

## What this is

A complete adventure-game engine and the game built on it:

- **640 × 400** internal resolution, integer-scaled, with a subtle and fully
  optional CRT post-process (the game is built to look right with it disabled)
- Eight-verb interface — LOOK, TAKE, USE, TALK, PUSH, PULL, OPEN, CLOSE
- Walkboxes with perspective scaling, hotspots, exits, inventory
- Branching dialogue with per-character conversation states
- A data-driven action DSL — no puzzle or line of dialogue is hard-coded
- Save anywhere: 5 slots plus an autosave, in `localStorage`
- Three-level hint system that tracks what you are actually stuck on
- Four endings, four playable arcade cabinets, 1000-point score
- Original synthesised soundtrack and sound effects — no audio files
- An external asset pipeline: illustrated backgrounds, character sprite sheets
  and props drop in as image files with no code change and no rebuild

All audio is generated from source in this repository. Nothing is sampled,
traced or copied.

---

## Controls

| | |
|---|---|
| Left click | Interact using the selected verb |
| Right click | Examine |
| Arrow keys | Move the cursor (keyboard-only play) |
| Enter | Select |
| Space | Finish the current line, then dismiss it |
| Escape | Pause menu / cancel a held item |
| H | Hint (three escalating levels) |
| F5 / F9 | Save / load |
| L T U K P O C | Verb shortcuts |

---

## Graphics

The engine is **completely separated from the artwork**. Scenes name image files;
the artwork contains no interaction logic, and interaction is defined by
invisible polygons in the game data. An illustrator can redraw a room end to end
without a programmer touching the scene.

Each scene resolves its backdrop in this order:

1. **External artwork** at the manifest path — always wins, loads
   asynchronously and swaps in live
2. **A procedural painter** — a fallback kept only until real art replaces it
3. **A labelled `ARTWORK PLACEHOLDER` card** — if a scene has neither

Drop a 640 × 400 image at `public/assets/backgrounds/<scene>.webp` and it
appears on the next visit to that room. Same for
`public/assets/characters/<id>.png`. Press **F1** in game to draw the hotspot
polygons and walkboxes over the art and check they agree.

**`public/assets/assets.json`** is the complete art requirements specification —
92 assets with dimensions, transparency, animation layout, layering plane,
hotspot pixel coordinates and a written brief for each. It is *generated* from
the live game data (`npm run assets:manifest`), so it cannot drift.

> The procedural painters in `src/content/backgrounds.ts` are a fallback, not the
> art direction. See [`docs/PROGRESS.md`](docs/PROGRESS.md) for that history.

**→ [`docs/GENERATING-ART.md`](docs/GENERATING-ART.md)** is the three-command
pipeline for generating the art and getting it into the game.
**→ [`docs/ASSETS.md`](docs/ASSETS.md)** covers the sprite contract, sheet
layouts and the validator.
**→ [`docs/RUNNING-LOCALLY.md`](docs/RUNNING-LOCALLY.md)** is the setup for
running this on your own machine with a GPU, which the depth tooling wants.

```bash
npm run assets:manifest       # regenerate assets.json from the game data
npm run assets:batch          # build the image-request .jsonl from assets.json
npm run assets:generate       # run it against the API (or use the Batch API)
npm run assets:unpack         # turn Batch API output back into PNG files
npm run assets:ingest         # crop, resize, binarise alpha, file it correctly
npm run assets:validate       # check art against the manifests
npm run assets:placeholders   # drawing templates at the exact final sizes
```

---

## Layout

```
src/engine/     Reusable: screen, palette, sprites, bitmap font, input, audio
src/game/       Adventure systems: verbs, walkboxes, dialogue, actions, UI, saves
src/content/    The game itself, as data: scenes, dialogue, items, hints, endings
tools/          Asset pipeline (Node, no browser)
public/assets/  backgrounds/ characters/ portraits/ objects/ effects/ ui/ audio/
                plus assets.json, the generated art specification
```

The split matters: `src/engine` knows nothing about Brighton Vale, and
`src/content` contains no logic. Adding a room means adding one object to
`src/content/scenes/`; adding a joke means adding one line of data.

---

## Scripts

| | |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Types only |
| `npm run assets:manifest` | Regenerate `assets.json` from the game data |
| `npm run assets:batch` | Build the image-request `.jsonl` |
| `npm run assets:generate` | Run it against the image API |
| `npm run assets:unpack` | Batch API output back into PNG files |
| `npm run assets:ingest` | Fit, crop and file generated art correctly |
| `npm run assets:validate` | Check all art against the manifests |
| `npm run assets:placeholders` | Regenerate drawing templates |

`dist/` is fully static — it will run from GitHub Pages, itch.io, or a folder.

---

## Content note

The game includes optional comedy in the seaside-postcard tradition: suggestive,
non-graphic, and staged entirely through silhouettes, frosted glass, obscuring
objects and hard cuts away. Nothing explicit is drawn or animated, all
characters are adults, and every one of these scenes is skippable without
affecting the main story. They are tracked separately as CHEEKY MOMENTS on the
score screen.
