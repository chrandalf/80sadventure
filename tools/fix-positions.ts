/**
 * Suggest standable replacements for every walkTo and entry the geometry
 * validator rejects.
 *
 * The snap is directional, not nearest-point: try straight down first, then a
 * short way up, then sideways, then a bounded radial search. In a room viewed
 * from a raked camera, "down" from a wall object is "in front of it", which is
 * where a character should stand - a nearest-point snap happily picks the far
 * side of a counter.
 *
 * Emits JSON; `tools/apply_positions.py` performs the file edits, so the
 * suggestions can be inspected between the two steps.
 */
import { isWalkable } from '../src/game/Actor';
import { SCENES } from '../src/content/scenes';

/** Scenes authored directly in 640x400; everything else halves on the page. */
const WORLD_AUTHORED = new Set(['arcade_lobby', 'starlight_arcade']);

interface Fix {
  scene: string;
  kind: 'hotspot' | 'exit' | 'entry';
  id: string;
  from: [number, number];
  to: [number, number];
  /** The numbers to write into the scene file, in its authoring space. */
  authoring: [number, number];
}

const fixes: Fix[] = [];
const stuck: string[] = [];

for (const scene of Object.values(SCENES)) {
  const legacy = !WORLD_AUTHORED.has(scene.id);
  const stand = (x: number, y: number) =>
    x >= 0 && x < 640 && y >= 100 && y <= 287
    && isWalkable(scene.walkboxes, x, y, scene.blockers);

  // A snapped point must survive the round-trip through authoring-space
  // rounding, or the validator rejects the "fix".
  const snap = (x0: number, y0: number): [number, number] | null => {
    const ok = (x: number, y: number): [number, number] | null => {
      if (!stand(x, y)) return null;
      const ax = legacy ? Math.round(x / 2) : x;
      const ay = legacy ? Math.round(y / 2) : y;
      const wx = legacy ? ax * 2 : ax;
      const wy = legacy ? ay * 2 : ay;
      return stand(wx, wy) ? [ax, ay] : null;
    };
    for (let k = 0; k <= 48; k += 2) { const p = ok(x0, y0 + k); if (p) return p; }
    for (let k = 2; k <= 24; k += 2) { const p = ok(x0, y0 - k); if (p) return p; }
    for (let k = 2; k <= 80; k += 2) {
      for (const sx of [x0 - k, x0 + k]) { const p = ok(sx, y0); if (p) return p; }
    }
    for (let r = 4; r <= 100; r += 4) {
      for (let a = 0; a < 16; a++) {
        const p = ok(
          Math.round(x0 + r * Math.cos((a / 16) * 2 * Math.PI)),
          Math.round(y0 + r * Math.sin((a / 16) * 2 * Math.PI)),
        );
        if (p) return p;
      }
    }
    return null;
  };

  const consider = (kind: Fix['kind'], id: string, x: number, y: number) => {
    if (stand(x, y)) return;
    const a = snap(x, y);
    if (!a) { stuck.push(`${scene.id} ${kind} ${id} (${x},${y})`); return; }
    const wx = legacy ? a[0] * 2 : a[0];
    const wy = legacy ? a[1] * 2 : a[1];
    fixes.push({ scene: scene.id, kind, id, from: [x, y], to: [wx, wy], authoring: a });
  };

  for (const [name, spot] of Object.entries(scene.entries ?? {})) consider('entry', name, spot.x, spot.y);
  for (const h of scene.hotspots ?? []) if (h.walkTo) consider('hotspot', h.id, h.walkTo[0], h.walkTo[1]);
  for (const e of scene.exits ?? []) if (e.walkTo) consider('exit', e.id, e.walkTo[0], e.walkTo[1]);
}

console.log(JSON.stringify({ fixes, stuck }, null, 2));
