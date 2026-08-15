import { LEGACY_SCALE } from '../engine/Screen';
import type { Hotspot, Rect, Scene, SceneCharacter, SceneObject } from './types';

/**
 * Bring a scene into world coordinates (640x400).
 *
 * Scenes authored before the resolution change carry `space: 'legacy320'`
 * (the default) and are scaled by 2 here; converted scenes declare
 * `space: 'world'` and pass through untouched.
 *
 * Normalising in one place means the runtime only ever sees world coordinates,
 * so hit tests, walkboxes and depth bands need no idea that two authoring
 * spaces exist. It also means scenes can be migrated one at a time rather than
 * in a single sweep that would have to be right first go across 33 rooms.
 */
export function normalizeScene(scene: Scene): Scene {
  if (scene.space === 'world') return scene;
  const k = LEGACY_SCALE;

  const rect = (r: Rect | undefined): Rect | undefined =>
    r && { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k };

  const pair = (p: [number, number] | undefined): [number, number] | undefined =>
    p && [p[0] * k, p[1] * k];

  const hotspot = (h: Hotspot): Hotspot => ({
    ...h,
    rect: rect(h.rect),
    polygon: h.polygon?.map(([x, y]) => [x * k, y * k] as [number, number]),
    walkTo: pair(h.walkTo),
  });

  /** A flat [x,y,x,y,...] point list, as walkboxes and blockers use. */
  const points = (poly: number[]): number[] => poly.map((v) => v * k);

  const character = (c: SceneCharacter): SceneCharacter => ({ ...c, x: c.x * k, y: c.y * k });
  const object = (o: SceneObject): SceneObject => ({ ...o, x: o.x * k, y: o.y * k });

  return {
    ...scene,
    space: 'world',
    walkboxes: scene.walkboxes?.map((poly) => poly.map((v) => v * k)),
    depth: scene.depth && {
      yNear: scene.depth.yNear * k,
      yFar: scene.depth.yFar * k,
      // Scale factors are ratios, not lengths - they must not be multiplied.
      scaleNear: scene.depth.scaleNear,
      scaleFar: scene.depth.scaleFar,
    },
    entries: scene.entries
      ? Object.fromEntries(
          Object.entries(scene.entries).map(([name, e]) => [
            name,
            { ...e, x: e.x * k, y: e.y * k },
          ]),
        )
      : undefined,
    hotspots: scene.hotspots?.map(hotspot),
    exits: scene.exits?.map((e) => ({ ...e, rect: rect(e.rect)!, walkTo: pair(e.walkTo) })),
    blockers: scene.blockers?.map(points),
    occluders: scene.occluders?.map((o) => ({ polygon: points(o.polygon), y: o.y * k })),
    characters: scene.characters?.map(character),
    objects: scene.objects?.map(object),
  };
}

/** Point-in-polygon for a [x, y] pair list, even-odd rule. */
export function pointInPointList(poly: readonly [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Does this point hit the hotspot?
 *
 * A polygon always wins over a rect, so a scene can be upgraded to precise
 * interaction shapes without removing its old bounds.
 */
export function hotspotContains(h: Hotspot, x: number, y: number): boolean {
  if (h.polygon && h.polygon.length >= 3) return pointInPointList(h.polygon, x, y);
  const r = h.rect;
  if (!r) return false;
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** Centre of a hotspot, for status-line anchoring and debug overlays. */
export function hotspotCentre(h: Hotspot): [number, number] {
  if (h.polygon && h.polygon.length) {
    let sx = 0;
    let sy = 0;
    for (const [px, py] of h.polygon) {
      sx += px;
      sy += py;
    }
    return [sx / h.polygon.length, sy / h.polygon.length];
  }
  const r = h.rect;
  return r ? [r.x + r.w / 2, r.y + r.h / 2] : [0, 0];
}
