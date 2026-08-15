import { normalizeScene } from '../../game/normalizeScene';
import type { DepthBand, Scene } from '../../game/types';
import FLOORS from '../floors.json';
import { ARCADE_SCENES } from './arcade';
import { HOTEL_SCENES } from './hotel';
import { STORY_SCENES } from './story';
import { TOWN_SCENES } from './town';

/**
 * The whole world, in one lookup.
 *
 * Split by area purely so the files stay readable - the runtime only ever sees
 * this flat map, and adding a location means adding one object here.
 */
const AUTHORED: Record<string, Scene> = {
  ...ARCADE_SCENES,
  ...TOWN_SCENES,
  ...STORY_SCENES,
  ...HOTEL_SCENES,
};

/**
 * Every scene, in world (640x400) coordinates.
 *
 * Scenes still authored in the old 320x200 space are converted here, so a room
 * can be migrated to world coordinates by adding `space: 'world'` to it and
 * nothing else in the engine has to care.
 */
export const SCENES: Record<string, Scene> = Object.fromEntries(
  Object.entries(AUTHORED).map(([id, scene]) => [id, withFloor(normalizeScene(scene))]),
);

/**
 * Give a room the floor measured off its own artwork.
 *
 * Every scene was blocked out with a generic band across the bottom of a
 * 320x200 screen, which no longer agrees with a painted room: characters stand
 * in the wall, or hover above the carpet, or shrink to nothing over forty
 * pixels of lino. `tools/fit-floors.mjs` finds the wall-floor join in each
 * plate and `src/content/floors.json` records it.
 *
 * A room that has been fitted by hand says `space: 'world'` and keeps its own,
 * because a detector reads a dado rail or a row of cabinet bases as the floor
 * often enough that measured-by-eye has to win.
 */
function withFloor(scene: Scene): Scene {
  if (scene.space === 'world') return scene;
  const fitted = (FLOORS.floors as Record<string, { walkboxes: number[][]; depth: DepthBand }>)[scene.id];
  if (!fitted) return scene;
  return { ...scene, walkboxes: fitted.walkboxes, depth: fitted.depth };
}

/** Sanity check run once at startup: every exit must point at a real scene. */
export function validateScenes(): string[] {
  const problems: string[] = [];
  for (const scene of Object.values(SCENES)) {
    for (const exit of scene.exits ?? []) {
      if (!SCENES[exit.to]) {
        problems.push(`${scene.id}: exit "${exit.id}" points at unknown scene "${exit.to}"`);
      } else if (exit.entry && !SCENES[exit.to].entries?.[exit.entry]) {
        problems.push(
          `${scene.id}: exit "${exit.id}" wants entry "${exit.entry}" which ${exit.to} does not define`,
        );
      }
    }
  }
  return problems;
}
