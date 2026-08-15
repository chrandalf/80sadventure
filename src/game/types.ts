/**
 * The content schema.
 *
 * Per spec s.32, the game is data-driven: no puzzle, line of dialogue or
 * interaction is hard-coded into a component. Everything below is authored as
 * plain data in src/content/, and the runtime in ActionRunner/AdventureScreen
 * interprets it. Adding a room or a joke never means touching engine code.
 */

/** The eight-verb interface from spec s.6 / s.38. */
export const VERBS = ['LOOK', 'TAKE', 'USE', 'TALK', 'PUSH', 'PULL', 'OPEN', 'CLOSE'] as const;
export type Verb = (typeof VERBS)[number];

export type Facing = 'north' | 'south' | 'east' | 'west';

// --------------------------------------------------------------- conditions

export type Cond =
  | ['flag', string]
  | ['noflag', string]
  | ['has', string]
  | ['nothas', string]
  | ['act', number]
  | ['actAtLeast', number]
  | ['score', number]
  | ['cassettes', number]
  | ['visited', string]
  | ['dialogueAtLeast', string, number]
  | ['and', ...Cond[]]
  | ['or', ...Cond[]]
  | ['not', Cond];

// ------------------------------------------------------------------ actions

/**
 * The action DSL. Tuple-tagged so content stays terse and readable as JSON-ish
 * literals, while TypeScript still checks every arm.
 */
export type Action =
  /** Speech. `who` is a character id; the runtime looks up their display name. */
  | ['say', string, string]
  /** Jack's own narration - the most common action in the whole game. */
  | ['jack', string]
  /** On-screen caption with no speaker, e.g. what a machine displays. */
  | ['caption', string]
  /** Full-screen text card, e.g. "JACK HAS MADE A POOR DECISION." */
  | ['card', string, string?]
  | ['wait', number]
  | ['flag', string]
  | ['unflag', string]
  | ['give', string]
  | ['take', string]
  /** Award points once, keyed so replays cannot farm the same points twice. */
  | ['score', number, string]
  /** +1 CHEEKY MOMENT (spec s.55), keyed for the same reason. */
  | ['cheeky', string]
  | ['goto', string, string?]
  | ['dialogue', string]
  | ['sfx', string]
  | ['music', string]
  | ['stopmusic']
  | ['anim', string, string]
  | ['face', Facing]
  | ['walk', number, number]
  /** Teleport Jack without a walk animation, for cut-aways. */
  | ['place', number, number]
  | ['if', Cond, Action[], Action[]?]
  | ['act', number]
  | ['fade', 'out' | 'in', number?]
  | ['shake', number]
  /** A funny, reversible death (spec s.29). */
  | ['die', string]
  | ['ending', string]
  | ['setdialogue', string, number]
  | ['hint', string]
  /** Advance the in-game clock, in minutes. */
  | ['clock', number]
  | ['hide', string]
  | ['show', string]
  | ['minigame', string]
  /** Show a full-screen still (a photograph, a film frame, a machine screen). */
  | ['vision', string]
  | ['noop'];

// ------------------------------------------------------------------- scenes

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hotspot {
  id: string;
  /** Shown in the status line, e.g. "LOOK AT COIN PUSHER". */
  name: string;
  /**
   * Axis-aligned bounds. Kept for legacy scenes; `polygon` wins where both are
   * given. At least one is required.
   */
  rect?: Rect;
  /**
   * An invisible interaction polygon in world coordinates, as [x, y] pairs.
   *
   * This is never drawn, and the artwork knows nothing about it. That
   * separation is the point: an illustrator can completely redraw a room and
   * the only thing that needs updating is this list of points.
   */
  polygon?: [number, number][];
  /** Where Jack stands to interact. Omit if he needn't approach. */
  walkTo?: [number, number];
  facing?: Facing;
  /** Per-verb responses. Anything unlisted falls back to a generic refusal. */
  verbs?: Partial<Record<Verb, Action[]>>;
  /** USE <item> WITH this hotspot. Key is the item id. */
  useWith?: Record<string, Action[]>;
  /** Verb applied on a plain left click. Defaults to LOOK. */
  defaultVerb?: Verb;
  /** Hotspot only exists when this is true. */
  visibleIf?: Cond;
  /** Hidden from the cursor until discovered, for things Jack must find first. */
  hiddenUntil?: Cond;
}

export interface Exit {
  id: string;
  name: string;
  rect: Rect;
  to: string;
  entry?: string;
  walkTo?: [number, number];
  /** Blocked until this holds; `lockedText` explains why. */
  requires?: Cond;
  lockedText?: string;
  visibleIf?: Cond;
  /** Arrow drawn on the edge of the screen. */
  arrow?: 'left' | 'right' | 'up' | 'down';
}

export interface SceneCharacter {
  id: string;
  sprite: string;
  x: number;
  y: number;
  anim?: string;
  facing?: Facing;
  scale?: number;
  visibleIf?: Cond;
  /** Drawn in front of Jack regardless of y-order (foreground props). */
  foreground?: boolean;
}

/**
 * A piece of scenery that participates in depth sorting.
 *
 * Use these for objects a character can pass both in front of and behind. Flat
 * scenery that is always in front belongs in a `foreground` art layer instead;
 * scenery that is always behind belongs in the background plate.
 */
export interface SceneObject {
  id: string;
  /** Sprite id from the objects manifest. */
  sprite: string;
  /** World position. `y` is the object's baseline - what it is sorted on. */
  x: number;
  y: number;
  scale?: number;
  anim?: string;
  visibleIf?: Cond;
}

/** Perspective: Jack shrinks as he walks upstage (spec-standard adventure tech). */
export interface DepthBand {
  yNear: number;
  yFar: number;
  scaleNear: number;
  scaleFar: number;
}

export interface Scene {
  id: string;
  /** Shown briefly on entry and in the save-slot summary. */
  name: string;
  /**
   * Coordinate space this scene's data is authored in.
   *
   * 'legacy320' (the default) means the numbers were written for the old
   * 320x200 screen and are doubled at load. 'world' means they are already in
   * 640x400 space. This is what lets scenes be migrated one at a time instead
   * of in a single risky sweep.
   */
  space?: 'legacy320' | 'world';
  /** Fallback painter id, used until external artwork exists for this scene. */
  background: string;
  /** Objects that depth-sort against characters. */
  objects?: SceneObject[];
  music?: string;
  /** Walkable polygons, as flat [x,y,x,y,...] point lists. */
  walkboxes?: number[][];
  depth?: DepthBand;
  entries?: Record<string, { x: number; y: number; facing?: Facing }>;
  hotspots?: Hotspot[];
  exits?: Exit[];
  characters?: SceneCharacter[];
  /** Runs every time Jack enters. */
  onEnter?: Action[];
  /** Runs only the first time, after onEnter. */
  onFirstEnter?: Action[];
  /** Random atmospheric one-shots, e.g. seagulls on the seafront. */
  ambience?: { sfx: string; everyMin: number; everyMax: number }[];
  /** Jack is not drawn (cutscene rooms, the phone box interior). */
  hideJack?: boolean;
  /** Overrides the default dark backdrop behind the background. */
  clear?: string;
}

// -------------------------------------------------------------------- items

export interface Item {
  id: string;
  name: string;
  /** Inventory icon sprite id. Falls back to a generated placeholder. */
  sprite?: string;
  /** LOOK response while it is in the inventory. */
  look: string;
  /** USE with no target. */
  use?: Action[];
  /** Combining two inventory items. Key is the other item's id. */
  combine?: Record<string, Action[]>;
}

// ----------------------------------------------------------------- dialogue

export interface DialogueLine {
  who: string;
  text: string;
  /** Emotion animation to play on that character's sprite while speaking. */
  anim?: string;
  showIf?: Cond;
  actions?: Action[];
}

export interface DialogueChoice {
  text: string;
  /** Node to jump to. Omit to end the conversation after `actions`. */
  goto?: string;
  actions?: Action[];
  showIf?: Cond;
  /** Disappears once chosen. */
  once?: boolean;
}

export interface DialogueNode {
  id: string;
  /** Who the player is talking to, for the portrait and for TALK routing. */
  who?: string;
  lines?: DialogueLine[];
  choices?: DialogueChoice[];
  onEnd?: Action[];
}

// ------------------------------------------------------------- characters

export interface CharacterDef {
  id: string;
  name: string;
  /** Speech colour, so the player can tell who is talking at a glance. */
  color: string;
  sprite?: string;
  /** Dialogue node to open on TALK, chosen by the first matching condition. */
  talk?: { showIf?: Cond; node: string }[];
}

// ---------------------------------------------------------------- endings

export interface Ending {
  id: string;
  title: string;
  /** Played as a sequence of actions, then the score screen. */
  script: Action[];
}
