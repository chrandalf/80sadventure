# Walkthrough / test script

Every step in order, with what should happen. Used as a test pass, it exercises
the whole game: all four acts, both arcade rooms, the town, the cinema chain,
the basement, and one of the four endings.

Score is out of 1000. The numbers below are checkpoints, not exact totals — the
optional jokes vary how much you pick up on the way.

**Controls.** Click a verb then a thing, or right-click to examine. `H` for a
hint (three levels, and it knows what you are actually stuck on). `F5`/`F9` save
and load. `Escape` for the pause menu. **`F1`** draws the interaction geometry:
walkboxes green, hotspots amber, blockers red, occluders violet.

---

## What to watch for while testing

Independently of the puzzles, these are the things most likely to be wrong in
any given room, and worth glancing at every time you enter one:

- **Does Jack stand on the floor**, rather than in the wall or hovering above it?
- **Does he shrink as he walks upstage**, and by a believable amount?
- **Does he walk behind the furniture** he should, and in front of what is
  nearer the camera?
- **Do the hotspots sit on the objects they name?** Press F1 and look.
- **Is the text on screen and readable** over the artwork?
- **Is the `PLACEHOLDER ART` badge gone?** If it is showing, that room is still
  on the fallback painter.

---

## Act I — the debt

Starts in **Starlight Arcade - Lobby**, 19:00, score 10.

1. Watch the opening conversation with Arthur. He wants £2.40 before he hands
   over the arcade key.
2. Go through the **archway** (↑) to the **Arcade Floor**.
3. **LOOK** at the **Coin Pusher**, then **TAKE** the coin wedged behind the
   mechanism. → 20p.
4. Back in the lobby, **USE** the 20p **WITH** the **vending machine**.
   → chocolate. You have now spent your only coin, which is the point.
5. On the arcade floor, **USE CHOCOLATE WITH Kevin**. *Only now* will he lend
   you anything — asking without it gets "What is in it for me?" and nothing
   else, however many times you ask.
6. **TALK** to **Kevin** → *Can you lend me two pounds?* → £2.20 as
   `kevin_money`.
7. Get the second 20p: change falls under the **cigarette machine** in the
   lobby. Kevin mentions this if you ask him about anything strange.
8. **USE** the money **WITH Arthur**, then the 20p as well.
   → arcade key, score ~95.

> Kevin's loan is gated on having fed him, not on how you ask. That is why the
> chocolate detour exists: your one coin has to be spent before it can be
> earned back twelve times over.
>
> The two halves of the £2.40 are deliberately separate items. Handing over only
> one is refused with a line, not silently accepted.

## Act II — the office

6. In the lobby, **LOOK** at the **Space Wars poster**, then **PULL** it.
   → office key behind it.
7. **OPEN** the **office door** with it.
8. In the office: **TAKE** the **screwdriver** from the desk, and **LOOK** at the
   **framed photograph**. Do not skip this — looking at it is what tells Jack the
   arcade opened in **1974**, and the safe in this room will not open until he
   knows that. It is the single easiest step to miss and it blocks the ending.

> The office is the room to check occlusion in. Walk behind the desk: Jack
> should be cut off at the waist. Walk to the left of it: he should be whole.

9. Back on the arcade floor at **20:15**, every machine flickers at once and
   shows the same photograph. This is the inciting incident and fires on entry.

## Act III — the town

10. Leave the lobby by the **glass doors** (←) to the **Seafront**.
11. **Pier**: **LOOK** at the photo booth, **TAKE** the **photograph** from the
    slot.
12. **Chip Shop**: get the **butter**.
13. **Back Alley**: get the **coat hanger**.
14. **Cinema**: **USE BUTTER WITH** the jammed door, then **USE COAT HANGER
    WITH** it. **TAKE** the **fuse**.
15. **USE FUSE WITH** the projector. → the film reel.
16. **TV Repair Shop**: **TALK** to **Derek** about the film reel.

## Act IV — the predictions

17. Back at the arcade, **USE** the 20p (or a token) **WITH** each of **Turbo
    Racer**, **Monster Manor** and **Galactic Raiders** in turn. Each shows a
    different moment of tomorrow.
18. **Clock Tower**, after **22:32**: **TAKE** the **brass key** from the ground,
    **USE BRASS KEY WITH** the maintenance panel, **TAKE** the cassette inside.
19. **USE** the **cassette recorder WITH** the **JACK** cassette to play it.
20. Return to the arcade and **TALK** to **Maggie**.

## Act V — the basement

21. With the arcade key, **OPEN** the **staff door** on the arcade floor.
22. In the basement, **OPEN** the **hatch** in the floor. → the machine room.
23. **POWER**: **LOOK** at the **fuse box** in the basement first — Jack has to
    notice it is mislabelled before he will touch it. Then **USE** the fuse box.
    He sets them to 3, 1, 4, 2 himself, from the numbers on the cabinets' coin
    doors.
24. While in the basement, **LOOK** under the **dust sheets** → **bolt cutters**.
    Nothing else gives you these, and the SIGNAL puzzle cannot be finished
    without them.
25. **SIGNAL**: get the **antenna** from the stock in the **TV Repair Shop**,
    **USE BOLT CUTTERS WITH ANTENNA** to cut it down to size, then take it to the
    **Arcade Roof** and **USE ANTENNA WITH** the aerial mast.
26. **MEMORY**: back in the **office**, **OPEN** the **safe** — it takes 1974,
    which Jack only knows if he looked at the framed photograph in step 8.
    **TAKE** the cassette and **USE** it **WITH** the **MEMORY** socket.

> There is no cable to find. The `cable` item exists but nothing in the game
> gives it out, and the POWER socket only ever says the fuses come first — so
> hunting for one is a dead end. Same for `gum`, `extension` and `cartridge`:
> defined in `items.ts`, obtainable nowhere, referenced by nothing. They are
> harmless but they are not puzzles.

## Act VI — the ending

At **23:17** the machine is ready. Four endings:

| Ending | How |
|---|---|
| **ONE MORE CREDIT** | **USE** the **blank cassette WITH** the machine and record something new. *The intended ending.* |
| **A TECHNICALLY CORRECT SOLUTION** | Destroy the machine. |
| **FRIDAY** | Preserve 1987. |
| **SOME THINGS SHOULD NOT BE FORGOTTEN** | The secret ending. |

For a full test pass, take **ONE MORE CREDIT** — it needs the blank cassette,
which exercises the most of the game.

---

## Systems worth testing separately

These are not on the critical path, so they are easy to leave broken.

**Save and load.** `F5` mid-game, keep playing, `F9`. Score, inventory,
position and flags should all come back, and you should land straight back in
play rather than in a menu.

**Hints.** Press `H` three times at any point. The three levels should escalate
from a nudge to the explicit solution, and should be about what you are
*currently* stuck on rather than a generic tip.

**The four cabinets.** Turbo Racer, Space Wars, Monster Manor and Galactic
Raiders are all playable. Each is reachable with a coin or a token.

**Dialogue.** Long lines should page three at a time with a small chevron
showing there is more. Choices should be one per row and legible over the art.

**Repeat conversations.** Talk to the same person three or four times in a
row. The opening should change from the second conversation onward and rotate
after that — Brenda invents new rules, Maggie starts keeping count, Arthur
worries that people will talk. Word-for-word repetition of the first greeting
is a bug now, not the expected behaviour.

**Cabin one at the Lido** is almost always empty. Roughly one game in seven it
is not — a shriek and a hard cut, no visual, once per playthrough. Do not
expect to see it on any given run; do report it if it fires twice.

**The optional seaside-postcard scenes** (spec s.46–56) are entirely skippable
and tracked separately as CHEEKY MOMENTS on the score screen. The hotel, the
pool cabins and the Far Beach are all off the critical path — except the blank
cassette, which has a second source on the critical path in the clock tower so
the intended ending is never gated behind optional content.

**Deaths.** There are a small number, all signposted. Each should show a card
and return you to play rather than ending the session.

---

## If something is in the wrong place

The artwork and the interaction geometry are separate on purpose. If a hotspot
does not sit on the thing it names, **the polygon is what moves** — it is in
`src/content/scenes/`, it costs nothing to change, and the art is the expensive
half. Same for a floor band that puts Jack in the wall: see
[`GENERATING-ART.md`](GENERATING-ART.md).
