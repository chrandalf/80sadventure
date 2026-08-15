import type { Scene } from '../../game/types';
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
export const SCENES: Record<string, Scene> = {
  ...ARCADE_SCENES,
  ...TOWN_SCENES,
  ...STORY_SCENES,
  ...HOTEL_SCENES,
};

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
