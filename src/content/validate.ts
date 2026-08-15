import type { Action, Cond, Scene } from '../game/types';
import { isWalkable } from '../game/Actor';
import { TUNES } from '../engine/Audio';
import { CHARACTERS } from './characters';
import { DIALOGUE } from './dialogue';
import { ENDINGS } from './endings';
import { ITEMS } from './items';
import { SCENES } from './scenes';
import { VISIONS } from './visions';
import { BACKGROUNDS } from './backgrounds';

/**
 * Cross-check every reference in the content data.
 *
 * In an adventure game a mistyped id is not a crash - it is a silent soft-lock
 * forty minutes in, where a door never opens or a conversation never starts.
 * This walks the whole content graph at startup and reports anything dangling,
 * which is far cheaper than finding it by playing.
 */
export function validateContent(spriteIds: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const at = (where: string, msg: string) => problems.push(`${where}: ${msg}`);

  const checkAction = (where: string, action: Action): void => {
    switch (action[0]) {
      case 'goto':
        if (!SCENES[action[1]]) at(where, `goto unknown scene "${action[1]}"`);
        else if (action[2] && !SCENES[action[1]].entries?.[action[2]]) {
          at(where, `goto "${action[1]}" wants entry "${action[2]}" which does not exist`);
        }
        break;
      case 'dialogue':
        if (!DIALOGUE[action[1]]) at(where, `dialogue unknown node "${action[1]}"`);
        break;
      case 'give':
      case 'take':
        if (!ITEMS[action[1]]) at(where, `references unknown item "${action[1]}"`);
        break;
      case 'say':
        if (!CHARACTERS[action[1]]) at(where, `unknown speaker "${action[1]}"`);
        break;
      case 'music':
        if (!TUNES[action[1]]) at(where, `unknown tune "${action[1]}"`);
        break;
      case 'vision':
        if (!VISIONS[action[1]]) at(where, `unknown vision "${action[1]}"`);
        break;
      case 'ending':
        if (!ENDINGS[action[1]]) at(where, `unknown ending "${action[1]}"`);
        break;
      case 'if':
        checkCond(where, action[1]);
        action[2].forEach((a) => checkAction(where, a));
        action[3]?.forEach((a) => checkAction(where, a));
        break;
      default:
        break;
    }
  };

  const checkCond = (where: string, cond: Cond | undefined): void => {
    if (!cond) return;
    if (cond[0] === 'has' || cond[0] === 'nothas') {
      if (!ITEMS[cond[1]]) at(where, `condition references unknown item "${cond[1]}"`);
    } else if (cond[0] === 'visited') {
      if (!SCENES[cond[1]]) at(where, `condition references unknown scene "${cond[1]}"`);
    } else if (cond[0] === 'talked' || cond[0] === 'nottalked' || cond[0] === 'dialogueAtLeast') {
      if (!DIALOGUE[cond[1]]) at(where, `condition references unknown dialogue node "${cond[1]}"`);
    } else if (cond[0] === 'chance') {
      if (!(cond[1] > 0 && cond[1] < 1)) at(where, `chance ${cond[1]} is not between 0 and 1`);
    } else if (cond[0] === 'and' || cond[0] === 'or') {
      cond.slice(1).forEach((c) => checkCond(where, c as Cond));
    } else if (cond[0] === 'not') {
      checkCond(where, cond[1]);
    }
  };

  const checkScene = (scene: Scene): void => {
    const w = `scene ${scene.id}`;
    if (!BACKGROUNDS[scene.background]) at(w, `unknown background "${scene.background}"`);
    if (scene.music && !TUNES[scene.music]) at(w, `unknown music "${scene.music}"`);

    for (const ch of scene.characters ?? []) {
      if (!spriteIds.has(ch.sprite)) at(w, `character "${ch.id}" uses unknown sprite "${ch.sprite}"`);
      if (!CHARACTERS[ch.id]) at(w, `character "${ch.id}" is not defined in characters.ts`);
      checkCond(w, ch.visibleIf);
    }

    for (const h of scene.hotspots ?? []) {
      const hw = `${w} hotspot ${h.id}`;
      checkCond(hw, h.visibleIf);
      checkCond(hw, h.hiddenUntil);
      for (const actions of Object.values(h.verbs ?? {})) {
        actions?.forEach((a) => checkAction(hw, a));
      }
      for (const [item, actions] of Object.entries(h.useWith ?? {})) {
        if (!ITEMS[item]) at(hw, `useWith references unknown item "${item}"`);
        actions.forEach((a) => checkAction(hw, a));
      }
      // A hotspot with no responses at all is almost certainly unfinished.
      if (!h.verbs && !h.useWith) at(hw, 'has no verbs and no useWith - it does nothing');
    }

    for (const e of scene.exits ?? []) {
      const ew = `${w} exit ${e.id}`;
      if (!SCENES[e.to]) at(ew, `points at unknown scene "${e.to}"`);
      else if (e.entry && !SCENES[e.to].entries?.[e.entry]) {
        at(ew, `wants entry "${e.entry}" which ${e.to} does not define`);
      }
      checkCond(ew, e.requires);
      checkCond(ew, e.visibleIf);
    }

    scene.onEnter?.forEach((a) => checkAction(`${w} onEnter`, a));
    scene.onFirstEnter?.forEach((a) => checkAction(`${w} onFirstEnter`, a));
  };

  Object.values(SCENES).forEach(checkScene);

  // Dialogue graph.
  for (const node of Object.values(DIALOGUE)) {
    const w = `dialogue ${node.id}`;
    for (const group of node.intro ?? []) {
      for (const line of group) {
        if (!CHARACTERS[line.who]) at(w, `unknown speaker "${line.who}" in intro`);
        checkCond(w, line.showIf);
        line.actions?.forEach((a) => checkAction(w, a));
      }
    }
    for (const line of node.lines ?? []) {
      if (!CHARACTERS[line.who]) at(w, `unknown speaker "${line.who}"`);
      checkCond(w, line.showIf);
      line.actions?.forEach((a) => checkAction(w, a));
    }
    for (const choice of node.choices ?? []) {
      if (choice.goto && !DIALOGUE[choice.goto]) at(w, `choice goes to unknown node "${choice.goto}"`);
      checkCond(w, choice.showIf);
      choice.actions?.forEach((a) => checkAction(w, a));
      // A choice with neither goto nor actions is the intended way to write
      // "end the conversation", so it is not flagged.
    }
    node.onEnd?.forEach((a) => checkAction(`${w} onEnd`, a));
  }

  // Characters' talk routing.
  for (const def of Object.values(CHARACTERS)) {
    for (const entry of def.talk ?? []) {
      if (!DIALOGUE[entry.node]) at(`character ${def.id}`, `talk points at unknown node "${entry.node}"`);
      checkCond(`character ${def.id}`, entry.showIf);
    }
    if (def.sprite && !spriteIds.has(def.sprite)) {
      at(`character ${def.id}`, `unknown sprite "${def.sprite}"`);
    }
  }

  // Endings.
  for (const ending of Object.values(ENDINGS)) {
    ending.script.forEach((a) => checkAction(`ending ${ending.id}`, a));
  }

  // Every item should have an inventory icon declared in the manifest.
  for (const item of Object.values(ITEMS)) {
    const spriteId = item.id.startsWith('cassette_') ? item.id : `item.${item.id}`;
    if (!spriteIds.has(spriteId)) {
      at(`item ${item.id}`, `no manifest sprite "${spriteId}" - it will have no inventory icon`);
    }
  }

  return problems;
}

/**
 * Cross-check every *position* in the content data against each room's
 * walkable geometry.
 *
 * References going stale is one failure mode; positions going stale is the
 * other, and it happens every time a room is refitted to new artwork. A
 * `walkTo` inside a blocker means clicking that hotspot walks Jack somewhere
 * he cannot stand - which the pathfinder resolves to "as close as it can get",
 * sometimes on the wrong side of a desk. An entry inside a blocker strands him
 * on arrival. Both have shipped; both are pure geometry, so a machine can
 * catch them.
 *
 * Characters are deliberately not checked: an NPC standing inside a blocker is
 * normal (Arthur lives behind his counter), and the actors only avoid each
 * other, not the scenery they are posed against.
 */
export function validateGeometry(): string[] {
  const problems: string[] = [];

  for (const scene of Object.values(SCENES)) {
    const stand = (x: number, y: number) => isWalkable(scene.walkboxes, x, y, scene.blockers);
    const w = `scene ${scene.id}`;

    for (const [name, spot] of Object.entries(scene.entries ?? {})) {
      if (!stand(spot.x, spot.y)) {
        problems.push(`${w}: entry "${name}" (${spot.x},${spot.y}) is not standable`);
      }
    }
    for (const h of scene.hotspots ?? []) {
      if (h.walkTo && !stand(h.walkTo[0], h.walkTo[1])) {
        problems.push(`${w}: hotspot "${h.id}" walkTo (${h.walkTo[0]},${h.walkTo[1]}) is not standable`);
      }
      if (h.tracks && !scene.characters?.some((ch) => ch.id === h.tracks)) {
        problems.push(`${w}: hotspot "${h.id}" tracks "${h.tracks}", who is not in this scene`);
      }
    }
    // A patrol point inside a blocker leaves a character walking on the spot
    // against the furniture forever, which is worse than not pacing at all.
    for (const ch of scene.characters ?? []) {
      (ch.patrol ?? []).forEach((p, i) => {
        if (!stand(p[0], p[1])) {
          problems.push(`${w}: character "${ch.id}" patrol point ${i} (${p[0]},${p[1]}) is not standable`);
        }
      });
      if (ch.patrol && ch.patrol.length < 2) {
        problems.push(`${w}: character "${ch.id}" has a patrol of one point - it will never move`);
      }
    }
    const exits = scene.exits ?? [];
    for (const e of exits) {
      if (e.walkTo && !stand(e.walkTo[0], e.walkTo[1])) {
        problems.push(`${w}: exit "${e.id}" walkTo (${e.walkTo[0]},${e.walkTo[1]}) is not standable`);
      }
    }
    // Two exits sharing screen space means the player cannot tell which one
    // they are about to click.
    for (let i = 0; i < exits.length; i++) {
      for (let j = i + 1; j < exits.length; j++) {
        const a = exits[i].rect;
        const b = exits[j].rect;
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
          problems.push(`${w}: exits "${exits[i].id}" and "${exits[j].id}" overlap`);
        }
      }
    }
  }

  return problems;
}
