import { ramp } from '../engine/Palette';
import type { CharacterDef } from '../game/types';

/**
 * The cast (spec s.4). Speech colour is per character so the player can tell
 * who is talking without a name tag - the convention LucasArts used throughout.
 *
 * `talk` is an ordered list: the first entry whose condition passes is the
 * conversation that opens. That is how every NPC gets the multiple dialogue
 * states spec s.12 asks for, without any branching code.
 */
export const CHARACTERS: Record<string, CharacterDef> = {
  jack: {
    id: 'jack',
    name: 'Jack',
    color: ramp('cyan', 3),
    sprite: 'char.jack',
  },

  maggie: {
    id: 'maggie',
    name: 'Maggie',
    color: ramp('red', 2),
    sprite: 'char.maggie',
    talk: [
      { showIf: ['flag', 'valeRevealed'], node: 'maggie_father' },
      { showIf: ['flag', 'machineFound'], node: 'maggie_machine' },
      { showIf: ['flag', 'cassetteJackPlayed'], node: 'maggie_confession' },
      { showIf: ['flag', 'futurePhotoFound'], node: 'maggie_worried' },
      { node: 'maggie_first' },
    ],
  },

  arthur: {
    id: 'arthur',
    name: 'Arthur',
    color: ramp('amber', 3),
    sprite: 'char.arthur',
    talk: [
      { showIf: ['flag', 'valeRevealed'], node: 'arthur_vale' },
      { showIf: ['flag', 'machineFound'], node: 'arthur_defensive' },
      { showIf: ['flag', 'hasArcadeKey'], node: 'arthur_afterkey' },
      { node: 'arthur_first' },
    ],
  },

  derek: {
    id: 'derek',
    name: 'Derek',
    color: ramp('phosphor', 2),
    sprite: 'char.derek',
    talk: [
      { showIf: ['flag', 'derekGaveAntenna'], node: 'derek_antenna_done' },
      { showIf: ['flag', 'filmShown'], node: 'derek_film' },
      { node: 'derek_first' },
    ],
  },

  kevin: {
    id: 'kevin',
    name: 'Kevin',
    color: ramp('magenta', 3),
    sprite: 'char.kevin',
    talk: [
      { showIf: ['flag', 'kevinBeaten'], node: 'kevin_beaten' },
      { showIf: ['flag', 'kevinFed'], node: 'kevin_friendly' },
      { node: 'kevin_first' },
    ],
  },

  brenda: {
    id: 'brenda',
    name: 'Brenda',
    color: ramp('violet', 3),
    sprite: 'char.brenda',
    talk: [
      { showIf: ['flag', 'brendaBought'], node: 'brenda_talks' },
      { node: 'brenda_first' },
    ],
  },

  valerie: {
    id: 'valerie',
    name: 'Valerie',
    color: ramp('amber', 2),
    sprite: 'char.valerie',
    talk: [
      { showIf: ['flag', 'hasRoom12Key'], node: 'valerie_after' },
      { node: 'valerie_reception' },
    ],
  },

  graham: {
    id: 'graham',
    name: 'Graham',
    color: ramp('cyan', 2),
    sprite: 'char.graham',
    talk: [
      { showIf: ['flag', 'grahamShelf'], node: 'graham_educational' },
      { node: 'graham_first' },
    ],
  },

  vale: {
    id: 'vale',
    name: 'Dr Vale',
    color: ramp('paper', 0),
    sprite: 'char.drvale',
  },

  guest: {
    id: 'guest',
    name: 'Guest',
    color: ramp('neutral', 4),
    sprite: 'char.guest',
  },

  machine: {
    id: 'machine',
    name: 'The Machine',
    color: ramp('phosphor', 2),
  },

  voice: {
    id: 'voice',
    name: 'A Voice',
    color: ramp('neutral', 4),
  },

  narrator: {
    id: 'narrator',
    name: '',
    color: ramp('neutral', 4),
  },
};

export function speakerColor(id: string): string {
  return CHARACTERS[id]?.color ?? ramp('neutral', 4);
}

export function speakerName(id: string): string {
  return CHARACTERS[id]?.name ?? id;
}
