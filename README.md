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

> **Working on this?** Start with **[`docs/PROGRESS.md`](docs/PROGRESS.md)** —
> current status, architecture, art-direction history, known gaps and next steps.
> Note that the original design specification lives only in chat history and is
> not yet in this repository.

## What this is

A complete adventure-game engine and the game built on it:

- **320 × 200** internal resolution, integer-scaled, with a 4:3 CRT presentation
  (1.2 tall pixels, scanlines, bloom, chromatic aberration, occasional flicker)
- Eight-verb interface — LOOK, TAKE, USE, TALK, PUSH, PULL, OPEN, CLOSE
- Walkboxes with perspective scaling, hotspots, exits, inventory
- Branching dialogue with per-character conversation states
- A data-driven action DSL — no puzzle or line of dialogue is hard-coded
- Save anywhere: 5 slots plus an autosave, in `localStorage`
- Three-level hint system that tracks what you are actually stuck on
- Four endings, four playable arcade cabinets, 1000-point score
- Original synthesised soundtrack and sound effects — no audio files
- **33 hand-composed pixel-art backgrounds, painted in code**

Everything visual and audible is generated from source in this repository.
Nothing is sampled, traced or copied.

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

The look comes from three decisions, in order of importance:

1. **A locked 32-colour palette** (`src/content/palette.json`). Every pixel the
   game draws comes from it. This is what makes art from different sources cohere.
2. **Authoring at 320 × 200.** A character is 24 × 40 — a few hundred meaningful
   pixels, not a few hundred thousand. It is the difference between art you can
   finish and art you cannot.
3. **Ordered dithering.** You cannot draw a smooth sky in 32 colours, so the
   painters interleave two palette colours in a 4 × 4 pattern and let the eye
   blend them, exactly as artists did on EGA and early VGA hardware.

Every background and sprite is **replaceable by dropping a PNG in**, with no
code change and no rebuild. Missing art is not an error — the engine generates a
correctly-sized, palette-correct, animating placeholder, so the game is fully
playable with zero art files on disk.

**→ [`docs/ASSETS.md`](docs/ASSETS.md) is the full art guide**: the sprite
contract, sheet layouts, the validator, and the quantiser that turns high-res or
generated images into palette-locked pixel art.

```bash
npm run assets:placeholders   # drawing templates at the exact final sizes
npm run assets:validate       # check art against the manifest and palette
node tools/quantize.mjs img.png --sprite char.jack
```

---

## Layout

```
src/engine/     Reusable: screen, palette, sprites, bitmap font, input, audio
src/game/       Adventure systems: verbs, walkboxes, dialogue, actions, UI, saves
src/content/    The game itself, as data: scenes, dialogue, items, hints, endings
tools/          Asset pipeline (Node, no browser)
public/assets/  Sprite manifest and any art overrides
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
| `npm run assets:validate` | Check all art against the manifest |
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
