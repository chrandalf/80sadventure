import type { Cond } from '../game/types';

/**
 * The scene art manifest.
 *
 * This is the contract between the artist and the engine. A scene names the
 * image files it wants; it says nothing about what is *in* them, and the
 * artwork contains no interaction logic. Hotspots are defined separately as
 * invisible polygons, so an illustrator can completely redraw a room without a
 * programmer touching the scene.
 *
 * Nothing here needs to exist on disk. Any missing file renders as a clearly
 * labelled ARTWORK PLACEHOLDER card, so it is immediately obvious which scenes
 * are still awaiting art and the game always runs.
 */

/** Which plane a layer is composited on, relative to the characters. */
export type LayerPlane = 'midground' | 'foreground' | 'effects';

export interface SceneLayer {
  src: string;
  /**
   * midground  - behind characters, in front of the background
   * foreground - always in front of characters (near-camera scenery)
   * effects    - in front of everything (rain, dust, light shafts)
   */
  plane: LayerPlane;
  /** Layer is only composited when this holds. Lets art react to story state. */
  showIf?: Cond;
  /** Multiplied into the layer's alpha. */
  opacity?: number;
}

export interface SceneArt {
  id: string;
  /** Base plate. Should be exactly `width` x `height`. */
  background: string;
  width: number;
  height: number;
  layers?: SceneLayer[];
}

export const ART_WIDTH = 640;
export const ART_HEIGHT = 400;

export const SCENE_ART: Record<string, SceneArt> = {
  /**
   * The first converted scene. Drop a 640x400 image at the path below and it
   * appears in game on the next visit - no code change, no rebuild.
   */
  starlight_arcade: {
    id: 'starlight_arcade',
    background: '/assets/backgrounds/starlight_arcade.webp',
    width: ART_WIDTH,
    height: ART_HEIGHT,
    layers: [
      {
        // Optional. The near edge of the arcade floor and the corner of the
        // nearest cabinet, so Jack can walk *behind* it. Omit the file and the
        // scene simply renders without it.
        src: '/assets/backgrounds/starlight_arcade_foreground.webp',
        plane: 'foreground',
      },
    ],
  },
};

/**
 * Art entry for a scene.
 *
 * Every scene looks for `/assets/backgrounds/<id>.webp` by convention, whether
 * or not it appears above. The map is an *override* - for rooms that need
 * layers, or a path that is not the scene id - not a gate on whether artwork is
 * looked for at all. Registering each room by hand meant dropping thirty-three
 * finished backgrounds into the right folder and still seeing the placeholders,
 * because the engine had only been told about one of them.
 *
 * A file that is not there fails to load and the room keeps its painter, which
 * is what an unconverted room did before.
 */
export function sceneArtFor(sceneId: string): SceneArt {
  return SCENE_ART[sceneId] ?? {
    id: sceneId,
    background: `/assets/backgrounds/${sceneId}.webp`,
    width: ART_WIDTH,
    height: ART_HEIGHT,
  };
}
