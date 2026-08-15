import type { Cond, Facing } from './types';

export const MAX_SCORE = 1000;
export const MAX_CHEEKY = 12;
/** Hidden cassettes required for the secret ending (spec s.8). */
export const TOTAL_CASSETTES = 6;

/** Game start: Friday 18 September 1987, 19:00 (spec s.5). */
export const START_MINUTES = 19 * 60;

export interface GameState {
  currentScene: string;
  inventory: string[];
  flags: Record<string, boolean>;
  score: number;
  cheeky: number;
  /** Minutes past midnight, in-game. Runs 19:00 -> 00:00. */
  time: number;
  act: number;
  dialogueState: Record<string, number>;
  visited: Record<string, boolean>;
  /** Keys of one-time score/cheeky awards, so points can't be farmed. */
  awarded: Record<string, boolean>;
  jack: { x: number; y: number; facing: Facing };
  /** Real seconds played, for the save-slot display. */
  playTime: number;
  version: number;
}

export const SAVE_VERSION = 1;

export function newGameState(): GameState {
  return {
    currentScene: 'arcade_lobby',
    inventory: [],
    flags: {},
    score: 0,
    cheeky: 0,
    time: START_MINUTES,
    act: 1,
    dialogueState: {},
    visited: {},
    awarded: {},
    jack: { x: 60, y: 168, facing: 'east' },
    playTime: 0,
    version: SAVE_VERSION,
  };
}

/** "19:03" style clock, wrapping past midnight. */
export function formatClock(minutes: number): string {
  const m = ((Math.floor(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Evaluate a content condition against the current state.
 *
 * Kept total and side-effect free: an unknown condition shape returns false
 * rather than throwing, so a typo in content data hides a hotspot instead of
 * killing the run.
 */
export function evalCond(state: GameState, cond: Cond | undefined): boolean {
  if (!cond) return true;
  switch (cond[0]) {
    case 'flag':
      return !!state.flags[cond[1]];
    case 'noflag':
      return !state.flags[cond[1]];
    case 'has':
      return state.inventory.includes(cond[1]);
    case 'nothas':
      return !state.inventory.includes(cond[1]);
    case 'act':
      return state.act === cond[1];
    case 'actAtLeast':
      return state.act >= cond[1];
    case 'score':
      return state.score >= cond[1];
    case 'cassettes':
      return countCassettes(state) >= cond[1];
    case 'visited':
      return !!state.visited[cond[1]];
    case 'dialogueAtLeast':
      return (state.dialogueState[cond[1]] ?? 0) >= cond[2];
    case 'and':
      return cond.slice(1).every((c) => evalCond(state, c as Cond));
    case 'or':
      return cond.slice(1).some((c) => evalCond(state, c as Cond));
    case 'not':
      return !evalCond(state, cond[1]);
    default:
      return false;
  }
}

export function countCassettes(state: GameState): number {
  return state.inventory.filter((i) => i.startsWith('cassette_')).length;
}

// ------------------------------------------------------------------- saves

const SLOT_PREFIX = 'omc.save.';
const AUTO_SLOT = 'auto';

export interface SlotInfo {
  slot: string;
  label: string;
  act: number;
  score: number;
  clock: string;
  scene: string;
  savedAt: number;
}

export function saveSlots(): string[] {
  return [AUTO_SLOT, '1', '2', '3', '4', '5'];
}

export function saveGame(slot: string, state: GameState, sceneName: string): void {
  try {
    const payload = { state, sceneName, savedAt: Date.now() };
    localStorage.setItem(SLOT_PREFIX + slot, JSON.stringify(payload));
  } catch (err) {
    // Private browsing or a full quota. The game must not die over a save.
    console.warn('[save] could not write slot', slot, err);
  }
}

export function loadGame(slot: string): GameState | null {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + slot);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: GameState };
    if (!parsed.state || parsed.state.version !== SAVE_VERSION) return null;
    // Merge over a fresh state so saves written before a field existed still load.
    return { ...newGameState(), ...parsed.state };
  } catch (err) {
    console.warn('[save] could not read slot', slot, err);
    return null;
  }
}

export function slotInfo(slot: string): SlotInfo | null {
  try {
    const raw = localStorage.getItem(SLOT_PREFIX + slot);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state: GameState; sceneName: string; savedAt: number };
    if (!parsed.state) return null;
    return {
      slot,
      label: slot === AUTO_SLOT ? 'AUTO' : slot,
      act: parsed.state.act,
      score: parsed.state.score,
      clock: formatClock(parsed.state.time),
      scene: parsed.sceneName ?? parsed.state.currentScene,
      savedAt: parsed.savedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export function deleteSave(slot: string): void {
  try {
    localStorage.removeItem(SLOT_PREFIX + slot);
  } catch {
    /* nothing sensible to do */
  }
}

export function autosave(state: GameState, sceneName: string): void {
  saveGame(AUTO_SLOT, state, sceneName);
}

// ------------------------------------------------------------ score bands

/** Spec s.28. */
export function scoreVerdict(score: number): string {
  if (score >= MAX_SCORE) return 'Okay. You have officially ruined 1987.';
  if (score >= 800) return 'Almost everything.';
  if (score >= 600) return 'Very impressive.';
  if (score >= 400) return 'Respectable.';
  if (score >= 200) return 'Technically an adventure.';
  return 'Did you actually play the game?';
}

/** Spec s.55. */
export function cheekyVerdict(cheeky: number): string {
  if (cheeky >= 12) return "You really clicked everything, didn't you?";
  if (cheeky >= 8) return 'You investigated thoroughly.';
  if (cheeky >= 4) return 'Questionable.';
  return 'You behaved yourself.';
}
