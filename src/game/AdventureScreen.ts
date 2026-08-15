import { audio } from '../engine/Audio';
import { font } from '../engine/BitmapFont';
import type { Input } from '../engine/Input';
import type { AssetStore } from '../engine/Loader';
import { Colors, ramp } from '../engine/Palette';
import { GAME_WIDTH } from '../engine/Screen';
import { CHARACTERS, speakerColor } from '../content/characters';
import { DIALOGUE } from '../content/dialogue';
import { ENDINGS } from '../content/endings';
import { DEFAULT_REFUSALS, ITEM_NAMES, ITEM_REFUSALS, ITEM_USE_GAGS, ITEMS } from '../content/items';
import { OBJECTIVES } from '../content/hints';
import { SCENES } from '../content/scenes';
import { VISIONS } from '../content/visions';
import { ActionRunner, type RunnerHost } from './ActionRunner';
import { Actor, clampToWalkable, depthScale, isWalkable } from './Actor';
import { hotspotContains } from './normalizeScene';
import { buildNavGrid, findPath, type NavGrid } from './pathfind';
import { drawArtBadge, SceneArtStore } from '../engine/SceneArtStore';
import { BACKGROUNDS } from '../content/backgrounds';
import { sceneArtFor } from '../content/sceneArt';
import { DialogueUi } from './DialogueUi';
import { Minigames } from './Minigames';
import { rect, outline } from './paint';
import { Speech } from './Speech';
import {
  autosave, evalCond, formatClock, newGameState, type GameState,
} from './state';
import {
  BAR_Y, drawCursor, drawPanel, inventorySlotAt, INV_VISIBLE, isOverPanel, newUiState,
  PLAY_HEIGHT, scrollArrowAt, verbAt, type UiState,
} from './Ui';
import type { Exit, Hotspot, Scene, Verb } from './types';

/** How long the player must be idle before Jack starts nudging (spec s.27). */
const NUDGE_INTERVAL = 300;
const NUDGES = [
  'I am fairly sure I am missing something.',
  'Perhaps I should look around.',
  'There is absolutely no shame in using the hint system.',
];

export type ScreenExit = { kind: 'ending'; id: string } | { kind: 'menu' };

/**
 * The game itself: one room at a time, with the verb interface, inventory,
 * dialogue, scripting and everything the player actually touches.
 *
 * Implements RunnerHost so that hotspot responses, cutscenes, dialogue results
 * and endings all execute through the same action interpreter.
 */
/** How close two characters may stand, in world pixels. */
const ACTOR_WIDTH = 22;
/** Beyond this difference in y they are at different depths and cannot touch. */
const ACTOR_DEPTH_TOLERANCE = 14;

export class AdventureScreen implements RunnerHost {
  state: GameState;
  ui: UiState = newUiState();

  /** Character sheets, from /assets/characters. */
  private readonly assets: AssetStore;
  /** Inventory icons and scene props, from /assets/objects. */
  private readonly objectAssets: AssetStore;
  private readonly art = new SceneArtStore();
  private readonly runner: ActionRunner;
  /**
   * Actions produced *by* a conversation run here rather than on the main
   * runner. The main runner is blocked waiting for the dialogue to close, so
   * anything queued on it during a conversation would deadlock: the dialogue
   * would be waiting for the runner and the runner for the dialogue.
   */
  private readonly dialogueRunner: ActionRunner;
  private readonly speech = new Speech();
  private readonly dialogue = new DialogueUi(DIALOGUE);
  private readonly minigames: Minigames;

  private scene: Scene;
  private jack: Actor;
  private npcs: Actor[] = [];
  /** Scenery that depth-sorts against characters. */
  private objects: Actor[] = [];
  /** Walkable grid for the current room, rebuilt when the room changes. */
  private nav: NavGrid | null = null;
  private navSceneId = '';

  /** Set true to draw hotspot polygons and walkboxes. Toggled with F1. */
  private debugOverlay = false;
  /** Characters hidden by script, beyond their scene `visibleIf`. */
  private hidden = new Set<string>();

  private fadeAlpha = 0;
  private fadeTarget = 0;
  private fadeSpeed = 2;
  private shakeTime = 0;
  private shakeMag = 0;

  private visionId: string | null = null;
  private pendingExit: ScreenExit | null = null;
  /** Set once an ending script starts; the score screen follows it. */
  private endingId: string | null = null;

  private idleTime = 0;
  private nudgeIndex = 0;
  private hintLevel = 0;
  private hintText: string | null = null;
  private hintTimer = 0;

  private ambienceTimer = 0;
  private clockAccumulator = 0;
  /** Interaction queued behind Jack's walk to the hotspot. */
  private pendingInteraction: (() => void) | null = null;

  constructor(
    assets: AssetStore,
    objectAssets: AssetStore,
    state: GameState = newGameState(),
  ) {
    this.assets = assets;
    this.objectAssets = objectAssets;
    this.state = state;
    this.runner = new ActionRunner(this);
    this.dialogueRunner = new ActionRunner(this);
    this.minigames = new Minigames();

    this.scene = SCENES[state.currentScene] ?? Object.values(SCENES)[0];
    this.jack = new Actor('jack', assets.get('char.jack'), state.jack.x, state.jack.y);
    this.jack.facing = state.jack.facing;
    this.enterScene(this.scene.id, undefined, true);
  }

  /** Set when the game is over or the player asked for the menu. */
  takeExit(): ScreenExit | null {
    const e = this.pendingExit;
    this.pendingExit = null;
    return e;
  }

  // ------------------------------------------------------------ scene setup

  private enterScene(id: string, entry?: string, initial = false): void {
    const scene = SCENES[id];
    if (!scene) {
      console.warn(`[scenes] unknown scene "${id}"`);
      return;
    }
    const firstVisit = !this.state.visited[id];
    this.scene = scene;
    this.state.currentScene = id;
    this.state.visited[id] = true;
    this.hidden.clear();

    // Place Jack at the named entry, else keep him where he was.
    const spot = scene.entries?.[entry ?? 'default'] ?? scene.entries?.default;
    if (spot) {
      this.jack.place(spot.x, spot.y);
      if (spot.facing) this.jack.face(spot.facing);
    } else if (initial) {
      this.jack.place(this.state.jack.x, this.state.jack.y);
    }
    this.jack.visible = !scene.hideJack;

    this.buildNpcs();
    this.buildObjects();

    if (scene.music) audio.playMusic(scene.music);
    this.ambienceTimer = 3 + Math.random() * 4;

    // Autosave at the top of each act (spec s.23) - detected by act change.
    if (firstVisit) autosave(this.state, scene.name);

    this.runner.run(scene.onEnter);
    if (firstVisit) this.runner.run(scene.onFirstEnter);
  }

  private buildNpcs(): void {
    this.npcs = [];
    for (const def of this.scene.characters ?? []) {
      if (!evalCond(this.state, def.visibleIf)) continue;
      const actor = new Actor(def.id, this.assets.get(def.sprite), def.x, def.y);
      if (def.facing) actor.facing = def.facing;
      if (def.anim) actor.play(def.anim);
      if (def.scale !== undefined) actor.fixedScale = def.scale;
      actor.foreground = !!def.foreground;
      this.npcs.push(actor);
    }
  }

  /**
   * Scene props are built as Actors so they share the depth-sorting and
   * animation path with characters - a crate and a person are the same problem.
   */
  private buildObjects(): void {
    this.objects = [];
    for (const def of this.scene.objects ?? []) {
      if (!evalCond(this.state, def.visibleIf)) continue;
      if (!this.objectAssets.has(def.sprite)) {
        console.warn(`[scenes] ${this.scene.id}: unknown object sprite "${def.sprite}"`);
        continue;
      }
      const actor = new Actor(def.id, this.objectAssets.get(def.sprite), def.x, def.y);
      if (def.anim) actor.play(def.anim);
      if (def.scale !== undefined) actor.fixedScale = def.scale;
      this.objects.push(actor);
    }
  }

  private findActor(id: string): Actor | null {
    if (id === 'jack') return this.jack;
    return this.npcs.find((a) => a.id === id) ?? null;
  }

  // ---------------------------------------------------------------- update

  update(dt: number, input: Input): void {
    this.updateFade(dt);
    if (this.shakeTime > 0) this.shakeTime -= dt;

    // Modal layers, outermost first.
    if (this.minigames.isOpen) {
      this.minigames.update(dt, input);
      if (!this.minigames.isOpen) this.runner.run(this.minigames.takeResult() ?? undefined);
      return;
    }

    if (this.visionId) {
      if (this.consumeAdvance(input)) this.visionId = null;
      return;
    }

    const skip = this.consumeAdvance(input);
    const consumed = this.speech.update(dt, skip);

    // Drive the conversation whenever the speech box and its own runner are free.
    if (this.dialogue.isOpen && !this.speech.blocking && !this.dialogueRunner.busy) {
      const actions = this.dialogue.advance(this.state, (who, text) => this.say(who, text));
      if (actions) this.dialogueRunner.run(actions);
    }

    this.dialogueRunner.update(dt);
    this.runner.update(dt);

    // The clock only runs while the player is actually free to act, so a long
    // cutscene never eats the evening.
    if (!this.runner.busy && !this.speech.blocking) {
      this.clockAccumulator += dt;
      while (this.clockAccumulator >= 6) {
        this.clockAccumulator -= 6;
        this.state.time += 1;
      }
    }
    this.state.playTime += dt;

    this.jack.update(dt, this.scene.walkboxes, this.scene.depth, this.scene.blockers);
    for (const npc of this.npcs) npc.update(dt, undefined, this.scene.depth);
    this.separateActors();

    // Fire the queued interaction once Jack has finished walking over.
    if (this.pendingInteraction && !this.jack.isWalking) {
      const run = this.pendingInteraction;
      this.pendingInteraction = null;
      run();
    }

    // The ending script owns the screen until it finishes.
    if (this.endingId) {
      if (!this.runner.busy && !this.dialogueRunner.busy && !this.speech.blocking && !this.visionId) {
        this.pendingExit = { kind: 'ending', id: this.endingId };
        this.endingId = null;
      }
      return;
    }

    this.updateAmbience(dt);
    this.updateHints(dt, input);

    if (!consumed) this.handleInput(input);
    this.syncJackState();
  }

  /** SPACE, Enter or a click all advance text. */
  private consumeAdvance(input: Input): boolean {
    return input.wasPressed('Space');
  }

  private updateFade(dt: number): void {
    if (this.fadeAlpha < this.fadeTarget) {
      this.fadeAlpha = Math.min(this.fadeTarget, this.fadeAlpha + this.fadeSpeed * dt);
    } else if (this.fadeAlpha > this.fadeTarget) {
      this.fadeAlpha = Math.max(this.fadeTarget, this.fadeAlpha - this.fadeSpeed * dt);
    }
  }

  private updateAmbience(dt: number): void {
    if (!this.scene.ambience?.length) return;
    this.ambienceTimer -= dt;
    if (this.ambienceTimer > 0) return;
    const pick = this.scene.ambience[Math.floor(Math.random() * this.scene.ambience.length)];
    audio.sfx(pick.sfx);
    this.ambienceTimer = pick.everyMin + Math.random() * (pick.everyMax - pick.everyMin);
  }

  /**
   * Idle nudges and the three-level hint system (spec s.27). The hint is chosen
   * from the first objective the player has not yet satisfied, so it is always
   * about what they are actually stuck on.
   */
  private updateHints(dt: number, input: Input): void {
    if (this.hintTimer > 0) this.hintTimer -= dt;

    if (this.runner.busy || this.speech.blocking || this.dialogue.isOpen) {
      this.idleTime = 0;
    } else {
      this.idleTime += dt;
      if (this.idleTime > NUDGE_INTERVAL && this.nudgeIndex < NUDGES.length) {
        this.say('jack', NUDGES[this.nudgeIndex++]);
        this.idleTime = 0;
      }
    }

    if (input.wasPressed('F1')) this.debugOverlay = !this.debugOverlay;

    if (input.wasPressed('KeyH')) {
      const objective = OBJECTIVES.find((o) => !evalCond(this.state, o.done));
      if (!objective) {
        this.hintText = 'Nothing left to hint at. Finish it.';
      } else {
        const hints = objective.hints;
        this.hintText = hints[Math.min(this.hintLevel, hints.length - 1)];
        this.hintLevel = Math.min(this.hintLevel + 1, hints.length - 1);
      }
      this.hintTimer = 6;
      audio.sfx('button');
    }
  }

  /** Reset the escalating hint level whenever the player makes progress. */
  private syncJackState(): void {
    this.state.jack.x = Math.round(this.jack.x);
    this.state.jack.y = Math.round(this.jack.y);
    this.state.jack.facing = this.jack.facing;
  }

  // ----------------------------------------------------------------- input

  private handleInput(input: Input): void {
    const busy =
      this.runner.busy || this.dialogueRunner.busy || this.speech.blocking || this.dialogue.isOpen;

    // Verb shortcuts, always live.
    if (!busy && !this.dialogue.showingChoices) {
      const keyVerbs: [string, Verb][] = [
        ['KeyL', 'LOOK'], ['KeyT', 'TAKE'], ['KeyU', 'USE'], ['KeyK', 'TALK'],
        ['KeyP', 'PUSH'], ['KeyO', 'OPEN'], ['KeyC', 'CLOSE'],
      ];
      for (const [code, verb] of keyVerbs) {
        if (input.wasPressed(code)) {
          this.ui.verb = verb;
          this.ui.heldItem = null;
          audio.sfx('button');
        }
      }
    }

    if (input.wasPressed('Escape')) {
      if (this.ui.heldItem) {
        this.ui.heldItem = null;
      } else if (this.dialogue.isOpen) {
        this.dialogue.close();
      } else {
        this.pendingExit = { kind: 'menu' };
      }
      return;
    }

    if (this.dialogue.showingChoices) {
      this.dialogue.hover(input.x, input.y);
      for (let i = 0; i < 6; i++) {
        if (input.wasPressed(`Digit${i + 1}`)) {
          const actions = this.dialogue.click(0, 0, i);
          if (actions) this.dialogueRunner.run(actions);
          return;
        }
      }
    }

    this.updateStatusText(input);

    for (const click of input.takeClicks()) {
      audio.unlock();
      if (this.dialogue.showingChoices) {
        const actions = this.dialogue.click(click.x, click.y);
        if (actions) this.dialogueRunner.run(actions);
        continue;
      }
      if (busy) {
        // A click during text just advances it.
        this.speech.update(0, true);
        continue;
      }
      this.onClick(click.x, click.y, click.button);
    }
  }

  private onClick(x: number, y: number, button: 'left' | 'right'): void {
    this.idleTime = 0;

    if (isOverPanel(y)) {
      this.clickPanel(x, y);
      return;
    }

    // Right click always examines, per spec s.24.
    const verb: Verb = button === 'right' ? 'LOOK' : this.ui.verb;

    const exit = this.exitAt(x, y);
    const hotspot = this.hotspotAt(x, y);
    const npc = this.npcAt(x, y);

    if (hotspot) {
      this.approachThen(hotspot.walkTo, hotspot.facing, () => this.interact(hotspot, verb));
      return;
    }
    if (npc) {
      const spot = this.scene.characters?.find((c) => c.id === npc.id);
      this.approachThen(
        spot ? [spot.x - 24, spot.y] : undefined,
        undefined,
        () => this.interactCharacter(npc.id, verb),
      );
      return;
    }
    if (exit) {
      this.useExit(exit);
      return;
    }

    if (this.ui.heldItem) {
      this.jackSays(this.refusalFor(this.ui.heldItem));
      this.ui.heldItem = null;
      return;
    }

    // Empty floor: walk there, round anything in the way.
    this.routeJack(x, Math.min(y, PLAY_HEIGHT - 4));
  }

  /** Walk to a spot first if one is given, then run the interaction. */
  private approachThen(
    walkTo: [number, number] | undefined,
    facing: Hotspot['facing'],
    run: () => void,
  ): void {
    if (!walkTo || this.scene.hideJack) {
      run();
      return;
    }
    const dist = Math.hypot(this.jack.x - walkTo[0], this.jack.y - walkTo[1]);
    if (dist < 6) {
      if (facing) this.jack.face(facing);
      run();
      return;
    }
    this.routeJack(walkTo[0], walkTo[1]);
    this.pendingInteraction = () => {
      if (facing) this.jack.face(facing);
      run();
    };
  }

  private clickPanel(x: number, y: number): void {
    const verb = verbAt(x, y);
    if (verb) {
      this.ui.verb = verb;
      this.ui.heldItem = null;
      audio.sfx('button');
      return;
    }

    const arrow = scrollArrowAt(x, y);
    if (arrow) {
      const maxScroll = Math.max(0, Math.ceil(this.state.inventory.length / 7) - 2);
      this.ui.invScroll = Math.max(
        0,
        Math.min(maxScroll, this.ui.invScroll + (arrow === 'up' ? -1 : 1)),
      );
      audio.sfx('button');
      return;
    }

    const slot = inventorySlotAt(x, y, this.ui.invScroll);
    if (slot === null) return;
    const itemId = this.state.inventory[slot];
    if (!itemId) return;

    audio.sfx('select');
    if (this.ui.verb === 'LOOK') {
      this.jackSays(ITEMS[itemId]?.look ?? 'It is what it looks like.');
      return;
    }
    if (this.ui.heldItem && this.ui.heldItem !== itemId) {
      this.combineItems(this.ui.heldItem, itemId);
      this.ui.heldItem = null;
      return;
    }
    this.ui.heldItem = this.ui.heldItem === itemId ? null : itemId;
  }

  private combineItems(a: string, b: string): void {
    const forward = ITEMS[a]?.combine?.[b];
    const backward = ITEMS[b]?.combine?.[a];
    const actions = forward ?? backward;
    if (actions) {
      this.runner.run(actions);
      return;
    }
    this.jackSays(this.refusalFor(a));
  }

  // ---------------------------------------------------------- interactions

  private interact(hotspot: Hotspot, verb: Verb): void {
    // USE <item> WITH <hotspot> takes priority over the plain verb.
    if (this.ui.heldItem) {
      const item = this.ui.heldItem;
      this.ui.heldItem = null;
      const gag = ITEM_USE_GAGS[`${item}:${hotspot.id}`];
      const specific = hotspot.useWith?.[item];
      if (specific) return void this.runner.run(specific);
      if (gag) return void this.runner.run(gag);
      return this.jackSays(this.refusalFor(item));
    }

    const actions = hotspot.verbs?.[verb];
    if (actions) {
      this.runner.run(actions);
      return;
    }
    this.jackSays(this.genericRefusal(verb, hotspot.name));
  }

  private interactCharacter(id: string, verb: Verb): void {
    if (this.ui.heldItem) {
      const item = this.ui.heldItem;
      this.ui.heldItem = null;
      const gag = ITEM_USE_GAGS[`${item}:${id}`];
      if (gag) return void this.runner.run(gag);
      return this.jackSays(this.refusalFor(item));
    }

    const def = CHARACTERS[id];
    if (verb === 'TALK' && def?.talk) {
      const entry = def.talk.find((t) => evalCond(this.state, t.showIf));
      if (entry) return void this.runner.run([['dialogue', entry.node]]);
    }
    if (verb === 'LOOK') {
      const spot = this.scene.hotspots?.find((h) => h.id === id);
      const look = spot?.verbs?.LOOK;
      if (look) return void this.runner.run(look);
      return this.jackSays(`It is ${def?.name ?? 'someone'}.`);
    }
    if (verb === 'TALK') return this.jackSays('They are not in a talking mood.');
    this.jackSays(this.genericRefusal(verb, def?.name ?? 'them'));
  }

  private genericRefusal(verb: Verb, name: string): string {
    const lower = name.toLowerCase();
    switch (verb) {
      case 'TAKE':
        return `I cannot carry ${lower} around with me. Physically or legally.`;
      case 'OPEN':
        return `${name} does not open. I have checked.`;
      case 'CLOSE':
        return `It is already as closed as it gets.`;
      case 'PUSH':
        return `I push ${lower}. Nothing happens, which is at least consistent.`;
      case 'PULL':
        return `I pull ${lower}. It stays exactly where it is.`;
      case 'TALK':
        return `${name} has nothing to say. Neither do I, now I think about it.`;
      case 'USE':
        return `I cannot think of a single use for ${lower}.`;
      default:
        return 'Nothing worth mentioning.';
    }
  }

  private refusalFor(itemId: string): string {
    const list = ITEM_REFUSALS[itemId] ?? DEFAULT_REFUSALS;
    return list[Math.floor(Math.random() * list.length)];
  }

  private useExit(exit: Exit): void {
    if (exit.requires && !evalCond(this.state, exit.requires)) {
      this.jackSays(exit.lockedText ?? 'That way is closed.');
      return;
    }
    const walkTo = exit.walkTo;
    const go = () => {
      audio.sfx('door');
      this.runner.run([
        ['fade', 'out', 0.35],
        ['goto', exit.to, exit.entry],
        ['fade', 'in', 0.35],
      ]);
    };
    this.approachThen(walkTo, undefined, go);
  }

  // ------------------------------------------------------------- hit tests

  private hotspotAt(x: number, y: number): Hotspot | null {
    for (const h of this.scene.hotspots ?? []) {
      if (!evalCond(this.state, h.visibleIf)) continue;
      if (h.hiddenUntil && !evalCond(this.state, h.hiddenUntil)) continue;
      if (hotspotContains(h, x, y)) return h;
    }
    return null;
  }

  /**
   * Nudge overlapping characters apart.
   *
   * Nobody paths around anybody - Jack walks to where he was told and the NPCs
   * stand where the scene puts them - so without this they simply occupy the
   * same spot and the one drawn second wins. A shove along x, proportional to
   * how far they overlap, keeps them side by side without either of them
   * needing to know the other exists. Only along x: pushing on y would change
   * their depth order and make them swap in front of each other.
   */
  private separateActors(): void {
    const actors = [this.jack, ...this.npcs.filter((n) => n.visible && !this.hidden.has(n.id))];
    for (let i = 0; i < actors.length; i++) {
      for (let j = i + 1; j < actors.length; j++) {
        const a = actors[i];
        const b = actors[j];
        // Only characters standing at much the same depth can collide.
        if (Math.abs(a.y - b.y) > ACTOR_DEPTH_TOLERANCE) continue;
        const dx = b.x - a.x;
        const gap = Math.abs(dx);
        if (gap >= ACTOR_WIDTH) continue;
        // Only tidy up characters at rest. Pushing someone who is walking makes
        // them either bulldoze the other across the room or come to a dead stop
        // behind them, and a standing NPC that cannot be walked past is a wall.
        // So they pass through each other in motion, as they always did in this
        // kind of game, and settle apart once they stop.
        if (a.isWalking || b.isWalking) continue;

        const dir = gap < 0.01 ? 1 : Math.sign(dx);
        const boxes = this.scene.walkboxes;
        const blockers = this.scene.blockers;
        const push = (ACTOR_WIDTH - gap) / 2;
        const ax = a.x - push * dir;
        const bx = b.x + push * dir;
        if (isWalkable(boxes, ax, a.y, blockers)) a.x = ax;
        if (isWalkable(boxes, bx, b.y, blockers)) b.x = bx;
      }
    }
  }

  private exitAt(x: number, y: number): Exit | null {
    for (const e of this.scene.exits ?? []) {
      if (!evalCond(this.state, e.visibleIf)) continue;
      const r = e.rect;
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return e;
    }
    return null;
  }

  private npcAt(x: number, y: number): Actor | null {
    for (const npc of this.npcs) {
      if (!npc.visible || this.hidden.has(npc.id)) continue;
      const scale = npc.fixedScale ?? depthScale(this.scene.depth, npc.y);
      const w = npc.anim.sheet.frameWidth * scale;
      const h = npc.anim.sheet.frameHeight * scale;
      if (x >= npc.x - w / 2 && x <= npc.x + w / 2 && y >= npc.y - h && y <= npc.y) return npc;
    }
    return null;
  }

  private updateStatusText(input: Input): void {
    const x = input.x;
    const y = input.y;
    if (isOverPanel(y)) {
      this.ui.statusText = '';
      return;
    }
    const hotspot = this.hotspotAt(x, y);
    const npc = this.npcAt(x, y);
    const exit = this.exitAt(x, y);
    const targetName =
      hotspot?.name ?? (npc ? CHARACTERS[npc.id]?.name ?? npc.id : undefined) ?? exit?.name;

    if (!targetName) {
      this.ui.statusText = this.ui.heldItem
        ? `USE ${ITEM_NAMES[this.ui.heldItem]?.toUpperCase() ?? ''} WITH...`
        : '';
      return;
    }
    if (this.ui.heldItem) {
      const item = ITEM_NAMES[this.ui.heldItem]?.toUpperCase() ?? '';
      this.ui.statusText = `USE ${item} WITH ${targetName.toUpperCase()}`;
    } else if (exit && !hotspot && !npc) {
      this.ui.statusText = `GO TO ${targetName.toUpperCase()}`;
    } else {
      this.ui.statusText = `${this.ui.verb} ${targetName.toUpperCase()}`;
    }
  }

  // ------------------------------------------------------------ RunnerHost

  say(who: string, text: string): void {
    const actor = this.findActor(who);
    const anchor = actor && actor.visible
      ? { x: actor.x, y: actor.y - actor.anim.sheet.frameHeight * 0.2 }
      : undefined;
    if (actor) actor.play('talk');
    this.speech.show(text, speakerColor(who), 'speech', anchor);
  }

  caption(text: string): void {
    this.speech.show(text, ramp('neutral', 4), 'caption');
  }

  card(title: string, subtitle?: string): void {
    this.speech.show(title, Colors.paper, 'card', undefined, subtitle);
  }

  isTextBlocking(): boolean {
    return this.speech.blocking;
  }

  goToScene(sceneId: string, entry?: string): void {
    this.enterScene(sceneId, entry);
  }

  startDialogue(nodeId: string): void {
    this.dialogue.open(nodeId);
  }

  isDialogueOpen(): boolean {
    return this.dialogue.isOpen;
  }

  walkJack(x: number, y: number): void {
    this.routeJack(x, y);
  }

  /**
   * Send Jack to a point, going round whatever is in the way.
   *
   * The nav grid is per room and only worth building once, so it is cached
   * until the scene changes. Blockers and walkboxes are fixed for a room, so
   * nothing invalidates it mid-scene.
   */
  private routeJack(x: number, y: number): void {
    const target = clampToWalkable(
      this.scene.walkboxes, x, Math.min(y, PLAY_HEIGHT - 4), this.scene.blockers,
    );
    if (this.navSceneId !== this.scene.id || !this.nav) {
      this.nav = buildNavGrid(GAME_WIDTH, PLAY_HEIGHT, this.scene.walkboxes, this.scene.blockers);
      this.navSceneId = this.scene.id;
    }
    this.jack.followPath(findPath(this.nav, this.jack.x, this.jack.y, target.x, target.y));
  }

  isJackWalking(): boolean {
    return this.jack.isWalking;
  }

  faceJack(dir: Parameters<Actor['face']>[0]): void {
    this.jack.face(dir);
  }

  placeJack(x: number, y: number): void {
    this.jack.place(x, y);
  }

  setAnim(actorId: string, anim: string): void {
    this.findActor(actorId)?.play(anim);
  }

  fade(dir: 'out' | 'in', dur: number): void {
    this.fadeTarget = dir === 'out' ? 1 : 0;
    this.fadeSpeed = dur > 0 ? 1 / dur : 100;
  }

  isFading(): boolean {
    return Math.abs(this.fadeAlpha - this.fadeTarget) > 0.01;
  }

  shake(amount: number): void {
    this.shakeMag = amount;
    this.shakeTime = 0.4;
  }

  die(text: string): void {
    audio.sfx('die');
    this.speech.show(text, Colors.danger, 'death', undefined, 'JACK HAS MADE A POOR DECISION.');
    // Deaths are never punishing (spec s.29): put him back where he was safe.
    const spot = this.scene.entries?.default;
    if (spot) this.jack.place(spot.x, spot.y);
  }

  triggerEnding(id: string): void {
    const ending = ENDINGS[id];
    this.endingId = id;
    // Closing the dialogue releases the main runner's blocker so the ending
    // script can actually start.
    this.dialogue.close();
    this.dialogueRunner.clear();
    this.runner.clear();
    if (ending) this.runner.run(ending.script);
  }

  showVision(id: string): void {
    this.visionId = id;
    audio.sfx('crt-on');
  }

  isVisionOpen(): boolean {
    return this.visionId !== null;
  }

  startMinigame(id: string): void {
    this.minigames.open(id);
  }

  isMinigameOpen(): boolean {
    return this.minigames.isOpen;
  }

  showHint(text: string): void {
    this.hintText = text;
    this.hintTimer = 6;
  }

  setCharVisible(id: string, visible: boolean): void {
    if (visible) this.hidden.delete(id);
    else this.hidden.add(id);
    const actor = this.findActor(id);
    if (actor) actor.visible = visible;
  }

  onScore(points: number): void {
    audio.sfx('score');
    this.hintLevel = 0;
    this.showFloatingScore(points);
  }

  onCheeky(): void {
    audio.sfx('score');
    this.showFloatingScore(1, 'CHEEKY');
  }

  private floatText: { text: string; life: number } | null = null;

  private showFloatingScore(points: number, label = 'SCORE'): void {
    this.floatText = { text: `${label} +${points}`, life: 2 };
  }

  private jackSays(text: string): void {
    this.runner.run([['jack', text]]);
  }

  // ------------------------------------------------------------------ draw

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.shakeTime > 0) {
      ctx.translate(
        Math.round((Math.random() - 0.5) * this.shakeMag * 8),
        Math.round((Math.random() - 0.5) * this.shakeMag * 8),
      );
    }

    const art = sceneArtFor(this.scene.id);
    ctx.drawImage(
      this.art.plate({
        sceneId: this.scene.id,
        background: art?.background,
        painter: BACKGROUNDS[this.scene.background],
        displayName: this.scene.name,
      }),
      0, 0,
    );

    this.drawLayers(ctx, 'midground');

    // Depth sort: characters and scene props interleave strictly by baseline y,
    // so a character walking up-stage of a cabinet is drawn behind it and one
    // walking down-stage is drawn in front. Anything that must always be in
    // front belongs in a foreground art layer instead.
    const drawables: { y: number; paint: () => void }[] = [
      ...this.npcs.filter((n) => n.visible && !this.hidden.has(n.id) && !n.foreground),
      ...this.objects,
      ...(this.jack.visible ? [this.jack] : []),
    ].map((actor) => ({ y: actor.y, paint: () => actor.draw(ctx, this.scene.depth) }));

    // Occluders sort into the same list. A character standing up-stage of the
    // desk is drawn first and the desk covers his legs; one standing down-stage
    // of it is drawn afterwards and walks in front. That is the whole trick -
    // the pixels are the background's own, clipped and drawn a second time.
    (this.scene.occluders ?? []).forEach((occ, i) => {
      drawables.push({
        y: occ.y,
        paint: () => {
          const cut = this.art.occluder(this.scene.id, i, occ.polygon);
          if (cut) ctx.drawImage(cut, 0, 0);
        },
      });
    });

    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.paint();
    for (const fg of this.npcs.filter((n) => n.foreground && n.visible)) {
      fg.draw(ctx, this.scene.depth);
    }

    this.drawLayers(ctx, 'foreground');
    this.drawLayers(ctx, 'effects');
    if (this.debugOverlay) this.drawDebugOverlay(ctx);

    // Exit arrows on the screen edge, so the player can see where the room leads.
    this.drawExitArrows(ctx);

    ctx.restore();

    if (this.visionId) this.drawVision(ctx);
    this.speech.draw(ctx);
    this.dialogue.draw(ctx);

    if (this.fadeAlpha > 0.001) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = Colors.ink;
      ctx.fillRect(0, 0, GAME_WIDTH, PLAY_HEIGHT);
      ctx.globalAlpha = 1;
    }

    drawPanel(ctx, this.state, this.ui, this.objectAssets, ITEM_NAMES);
    drawArtBadge(ctx, this.art.sourceFor(this.scene.id));
    this.drawOverlays(ctx);

    if (this.minigames.isOpen) this.minigames.draw(ctx);
  }

  /** Composite the scene's optional art layers for one plane. */
  private drawLayers(ctx: CanvasRenderingContext2D, plane: string): void {
    const art = sceneArtFor(this.scene.id);
    if (!art?.layers) return;
    for (const layer of art.layers) {
      if (layer.plane !== plane) continue;
      if (!evalCond(this.state, layer.showIf)) continue;
      const img = this.art.layer(layer.src);
      if (!img) continue;
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.drawImage(img, 0, 0, GAME_WIDTH, PLAY_HEIGHT + 0, 0, 0, GAME_WIDTH, PLAY_HEIGHT + 0);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Hotspot polygons, walkboxes and object baselines. Invisible in play - this
   * exists so interaction geometry can be checked against artwork it knows
   * nothing about.
   */
  private drawDebugOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = ramp('phosphor', 2);
    for (const box of this.scene.walkboxes ?? []) {
      ctx.beginPath();
      for (let i = 0; i < box.length; i += 2) {
        if (i === 0) ctx.moveTo(box[0], box[1]);
        else ctx.lineTo(box[i], box[i + 1]);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.strokeStyle = ramp('amber', 2);
    for (const h of this.scene.hotspots ?? []) {
      if (!evalCond(this.state, h.visibleIf)) continue;
      ctx.beginPath();
      if (h.polygon?.length) {
        h.polygon.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
      } else if (h.rect) {
        ctx.rect(h.rect.x, h.rect.y, h.rect.w, h.rect.h);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = ramp('cyan', 2);
    for (const o of this.objects) {
      ctx.beginPath();
      ctx.moveTo(o.x - 10, o.y);
      ctx.lineTo(o.x + 10, o.y);
      ctx.stroke();
    }

    // Blockers: floor that furniture is standing on.
    ctx.strokeStyle = ramp('red', 2);
    for (const b of this.scene.blockers ?? []) {
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 2) {
        if (i === 0) ctx.moveTo(b[0], b[1]);
        else ctx.lineTo(b[i], b[i + 1]);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Occluders, with the baseline that decides who is in front of them.
    ctx.strokeStyle = ramp('violet', 3);
    for (const o of this.scene.occluders ?? []) {
      ctx.beginPath();
      for (let i = 0; i < o.polygon.length; i += 2) {
        if (i === 0) ctx.moveTo(o.polygon[0], o.polygon[1]);
        else ctx.lineTo(o.polygon[i], o.polygon[i + 1]);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, o.y);
      ctx.lineTo(GAME_WIDTH, o.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawExitArrows(ctx: CanvasRenderingContext2D): void {
    for (const exit of this.scene.exits ?? []) {
      if (!exit.arrow) continue;
      if (!evalCond(this.state, exit.visibleIf)) continue;
      const locked = exit.requires && !evalCond(this.state, exit.requires);
      const color = locked ? ramp('neutral', 2) : ramp('cyan', 2);
      const glyph = { left: '←', right: '→', up: '↑', down: '↓' }[exit.arrow];
      font.draw(ctx, glyph, exit.rect.x + exit.rect.w / 2, exit.rect.y + exit.rect.h / 2 - 3, {
        color,
        outline: Colors.ink,
        align: 'center',
      });
    }
  }

  private drawVision(ctx: CanvasRenderingContext2D): void {
    const painter = VISIONS[this.visionId!];
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, PLAY_HEIGHT);
    if (painter) painter(ctx);
    else font.draw(ctx, this.visionId!, GAME_WIDTH / 2, 70, { color: Colors.paper, align: 'center' });
    font.draw(ctx, 'PRESS SPACE', GAME_WIDTH / 2, PLAY_HEIGHT - 12, {
      color: ramp('neutral', 3),
      outline: Colors.ink,
      align: 'center',
    });
  }

  private drawOverlays(ctx: CanvasRenderingContext2D): void {
    if (this.floatText) {
      this.floatText.life -= 1 / 60;
      if (this.floatText.life <= 0) this.floatText = null;
      else {
        font.draw(ctx, this.floatText.text, GAME_WIDTH - 6, BAR_Y - 12, {
          color: ramp('phosphor', 2),
          outline: Colors.ink,
          align: 'right',
        });
      }
    }

    if (this.hintText && this.hintTimer > 0) {
      const lines = font.wrap(this.hintText, 280);
      const h = lines.length * font.lineHeight() + 6;
      rect(ctx, 14, 6, GAME_WIDTH - 28, h, Colors.uiPanel);
      outline(ctx, 14, 6, GAME_WIDTH - 28, h, ramp('amber', 2));
      lines.forEach((line, i) => {
        font.draw(ctx, line, GAME_WIDTH / 2, 9 + i * font.lineHeight(), {
          color: ramp('amber', 3),
          align: 'center',
        });
      });
    }
  }

  /** Called by the host so the cursor draws over absolutely everything. */
  drawCursorAt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const over =
      !isOverPanel(y) && (!!this.hotspotAt(x, y) || !!this.exitAt(x, y) || !!this.npcAt(x, y));
    drawCursor(ctx, x, y, over);
  }

  /** Scene name, for save-slot summaries. */
  get sceneName(): string {
    return this.scene.name;
  }

  /** Clock string, for the pause menu. */
  get clock(): string {
    return formatClock(this.state.time);
  }

  /** Inventory scroll bounds, recomputed when items change. */
  clampInventoryScroll(): void {
    const maxScroll = Math.max(0, Math.ceil(this.state.inventory.length / (INV_VISIBLE / 2)) - 2);
    this.ui.invScroll = Math.max(0, Math.min(this.ui.invScroll, maxScroll));
  }
}
