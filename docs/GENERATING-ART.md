# Generating the artwork

Three commands: build the request file, run it, ingest the results.

```bash
npm run assets:batch                                    # -> one-more-credit-images.jsonl
OPENAI_API_KEY=sk-... npm run assets:generate -- one-more-credit-images.jsonl ./incoming
npm run assets:ingest -- ./incoming
```

Then `npm run dev` and walk into a room. Nothing else needs changing — no
rebuild, no manifest edit, no code.

---

## Why the batch failed

> `The URL provided for this request does not match the batch endpoint`
> — on every line, `0 completed, 0 failed of 0 total requests`

The `url` field on every line of the `.jsonl` must be character-for-character
identical to the `endpoint` the batch was **created** with. A batch created as
`/v1/chat/completions` cannot carry image requests: it rejects the file at parse
time, before a single request runs, which is why the total is zero rather than
ninety-two failures.

`npm run assets:batch` prints the endpoint to create the batch with. Use that
exact string:

```python
batch = client.batches.create(
    input_file_id=uploaded.id,
    endpoint="/v1/images/generations",   # must equal the url on every line
    completion_window="24h",
)
```

If your account's Batch API does not accept that endpoint, generate against
`/v1/responses` instead, which routes image generation through a tool call:

```bash
npm run assets:batch -- --endpoint responses
```

Or skip batching altogether. Ninety-two images is small; `npm run
assets:generate` calls the API directly, four at a time, and gives you a
per-asset error instead of one opaque failed job. It skips files that already
exist, so rerunning fills the gaps rather than paying twice.

---

## What the generator is asked for, and why it is not the final size

`gpt-image-1` renders at `1024x1024`, `1536x1024` or `1024x1536` and nothing
else. None of those is 640×400. So the request asks for the nearest useful shape
and `assets:ingest` does the real fitting:

| Asset | Asked for | Becomes | How |
|---|---|---|---|
| Backgrounds, title, effects | `1536x1024` | 640×400 | centre-crop 3:2 → 8:5, area-average downscale |
| Portraits | `1024x1024` | 128×128 | trim to alpha bounds, fit inside |
| Props, inventory icons | `1024x1024` | 64×64, 16×16 | trim to alpha bounds, fit inside |
| Character sheets | `1024x1024` | 144×160 | see below |

The crop costs about 3% off the top and bottom of every background, which is why
the prompts say to keep important content away from those edges. The hotspot
coordinates baked into each prompt assume the final 640×400 frame.

Downscaling is area-averaged in **premultiplied** alpha. Averaging straight RGB
across a transparent edge drags whatever colour the generator left in the
invisible pixels into the visible ones — that is where dark halos around sprites
come from.

Alpha is then forced to binary, fully opaque or fully clear. Soft edges fringe
badly once the game scales the frame up.

### Characters arrive as one figure, not a sheet

A `char.*` asset is a 6×4 grid of 24×40 frames: a walk cycle in three
directions, a talk loop and six expressions, with the same person in all
twenty-four cells. No image model produces that. It produces something that
*looks* like a sprite sheet and animates like a flip-book of different people.

So the prompt asks for **one full-length standing figure** on transparent
background, and ingest copies that single pose into all 24 cells. The character
then loads, stands, faces, talks and gets depth-sorted correctly — it just does
not move its legs yet. Drop a genuine 144×160 sheet in later and ingest detects
it (exact size, or an exact integer multiple) and slices it properly instead.

That is a deliberate trade: a static character that is right beats an animated
one that changes face every frame.

---

## Round trip

`custom_id` is the asset id, so nothing needs tracking between the three steps.
Save each returned image as `<custom_id>.png` and ingest matches it — by id
(`bg.starlight_arcade.png`), by id with underscores, or by the basename of the
asset's declared path (`starlight_arcade.png`).

Ingest reports what landed, what it rejected and what is still outstanding,
naming any `p0` assets still missing.

```
  + bg.starlight_arcade    1536x1024 -> 640x400 cover
  + char.jack              1024x1024 -> 144x160 still x24
  x item.lighter.jpg       not a PNG - regenerate with output_format: "png"
  ? not_an_asset.png       no asset with that id
```

Existing files are left alone unless you pass `--force`, so a partial rerun
cannot silently overwrite art you have already accepted. `--dry` shows the plan
without writing.

**Input must be PNG.** The toolchain decodes PNG only, and `background:
"transparent"` is only honoured for PNG and WebP output anyway.

---

## Filtering

```bash
npm run assets:batch -- --only p0                       # the two critical assets
npm run assets:batch -- --type background               # all 33 rooms
npm run assets:batch -- --type portrait,inventory-icon
```

Start with `--only p0`. That is `bg.starlight_arcade` and `char.jack` — the one
converted room and the player. Look at them in the game before spending on the
other ninety.

---

## After ingest

Press **F1** in game to draw the hotspot polygons over the artwork. The polygons
are the truth; if they land in the wrong place, the art disagrees with the
manifest coordinates. Move the polygons in `src/content/scenes/`, not the art —
they are cheap to change and the art is not.

`npm run assets:validate` checks everything on disk against the sprite manifests.

## Two things ingest cannot fix

- **Composition.** If a generated arcade puts the unmarked machine on the left
  when the manifest says x≈398, the hotspot will sit on the wrong cabinet.
  Regenerate or move the polygon.
- **Style drift.** Ninety-two independent generations will not share a palette
  or a light direction. `npm run assets:quantize` can force conformance to the
  game palette, which helps consistency at the cost of some subtlety. Judge it
  on a handful of rooms first.
