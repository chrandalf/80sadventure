import { audio } from '../engine/Audio';
import { evalCond, type GameState } from './state';
import type { Action, Facing } from './types';

/**
 * Everything the runner needs the game to do on its behalf. Keeping this as an
 * interface means the action DSL can be unit-tested, and cutscenes, dialogue
 * and hotspot responses all run through one code path.
 */
export interface RunnerHost {
  state: GameState;
  say(who: string, text: string): void;
  caption(text: string): void;
  card(title: string, subtitle?: string): void;
  isTextBlocking(): boolean;
  goToScene(sceneId: string, entry?: string): void;
  startDialogue(nodeId: string): void;
  isDialogueOpen(): boolean;
  walkJack(x: number, y: number): void;
  isJackWalking(): boolean;
  faceJack(dir: Facing): void;
  placeJack(x: number, y: number): void;
  setAnim(actorId: string, anim: string): void;
  fade(dir: 'out' | 'in', dur: number): void;
  isFading(): boolean;
  shake(amount: number): void;
  die(text: string): void;
  triggerEnding(id: string): void;
  showVision(id: string): void;
  isVisionOpen(): boolean;
  startMinigame(id: string): void;
  isMinigameOpen(): boolean;
  showHint(text: string): void;
  setCharVisible(id: string, visible: boolean): void;
  onScore(points: number): void;
  onCheeky(): void;
}

/**
 * Sequential interpreter for the action DSL.
 *
 * Actions execute one at a time; anything that takes wall-clock time installs a
 * blocker predicate and the runner idles until it clears. That gives content
 * authors ordinary-looking scripts - say, wait, walk, say - without callbacks,
 * promises or a state machine per scene.
 */
export class ActionRunner {
  private queue: Action[] = [];
  private waiting = 0;
  private blocker: (() => boolean) | null = null;
  private readonly host: RunnerHost;

  constructor(host: RunnerHost) {
    this.host = host;
  }

  /** True while a script is mid-flight. The player cannot act during one. */
  get busy(): boolean {
    return this.queue.length > 0 || this.waiting > 0 || this.blocker !== null;
  }

  /** Queue a script to run after anything already pending. */
  run(actions: Action[] | undefined): void {
    if (actions && actions.length) this.queue.push(...actions);
  }

  /** Queue a script to run *before* anything pending - used by `if` branches. */
  runNext(actions: Action[] | undefined): void {
    if (actions && actions.length) this.queue.unshift(...actions);
  }

  clear(): void {
    this.queue.length = 0;
    this.waiting = 0;
    this.blocker = null;
  }

  update(dt: number): void {
    if (this.blocker) {
      if (this.blocker()) return;
      this.blocker = null;
    }
    if (this.waiting > 0) {
      this.waiting -= dt;
      if (this.waiting > 0) return;
      this.waiting = 0;
    }

    // Drain until something blocks, so a run of instant actions (flags, score,
    // sfx) all resolve in the same frame.
    let guard = 0;
    while (this.queue.length) {
      if (guard++ > 512) {
        console.warn('[actions] runaway script, aborting the rest of this queue');
        this.queue.length = 0;
        break;
      }
      const action = this.queue.shift()!;
      this.exec(action);
      if (this.blocker || this.waiting > 0) return;
    }
  }

  private exec(action: Action): void {
    const h = this.host;
    const s = h.state;

    switch (action[0]) {
      case 'say':
        h.say(action[1], action[2]);
        this.blocker = () => h.isTextBlocking();
        break;

      case 'jack':
        h.say('jack', action[1]);
        this.blocker = () => h.isTextBlocking();
        break;

      case 'caption':
        h.caption(action[1]);
        this.blocker = () => h.isTextBlocking();
        break;

      case 'card':
        h.card(action[1], action[2]);
        this.blocker = () => h.isTextBlocking();
        break;

      case 'wait':
        this.waiting = action[1];
        break;

      case 'flag':
        s.flags[action[1]] = true;
        break;

      case 'unflag':
        delete s.flags[action[1]];
        break;

      case 'give':
        if (!s.inventory.includes(action[1])) {
          s.inventory.push(action[1]);
          audio.sfx('pickup');
        }
        break;

      case 'take':
        s.inventory = s.inventory.filter((i) => i !== action[1]);
        break;

      case 'score': {
        const key = `score:${action[2]}`;
        if (!s.awarded[key]) {
          s.awarded[key] = true;
          s.score += action[1];
          h.onScore(action[1]);
        }
        break;
      }

      case 'cheeky': {
        const key = `cheeky:${action[1]}`;
        if (!s.awarded[key]) {
          s.awarded[key] = true;
          s.cheeky += 1;
          s.score += 1;
          h.onCheeky();
        }
        break;
      }

      case 'goto':
        h.goToScene(action[1], action[2]);
        break;

      case 'dialogue':
        h.startDialogue(action[1]);
        this.blocker = () => h.isDialogueOpen();
        break;

      case 'sfx':
        audio.sfx(action[1]);
        break;

      case 'music':
        audio.playMusic(action[1]);
        break;

      case 'stopmusic':
        audio.stopMusic();
        break;

      case 'anim':
        h.setAnim(action[1], action[2]);
        break;

      case 'face':
        h.faceJack(action[1]);
        break;

      case 'walk':
        h.walkJack(action[1], action[2]);
        this.blocker = () => h.isJackWalking();
        break;

      case 'place':
        h.placeJack(action[1], action[2]);
        break;

      case 'if':
        this.runNext(evalCond(s, action[1]) ? action[2] : action[3]);
        break;

      case 'act':
        s.act = action[1];
        break;

      case 'fade':
        h.fade(action[1], action[2] ?? 0.5);
        this.blocker = () => h.isFading();
        break;

      case 'shake':
        h.shake(action[1]);
        break;

      case 'die':
        h.die(action[1]);
        this.blocker = () => h.isTextBlocking();
        break;

      case 'ending':
        h.triggerEnding(action[1]);
        break;

      case 'setdialogue':
        s.dialogueState[action[1]] = action[2];
        break;

      case 'hint':
        h.showHint(action[1]);
        break;

      case 'clock':
        s.time += action[1];
        break;

      case 'hide':
        h.setCharVisible(action[1], false);
        break;

      case 'show':
        h.setCharVisible(action[1], true);
        break;

      case 'minigame':
        h.startMinigame(action[1]);
        this.blocker = () => h.isMinigameOpen();
        break;

      case 'vision':
        h.showVision(action[1]);
        this.blocker = () => h.isVisionOpen();
        break;

      case 'noop':
        break;

      default: {
        // Exhaustiveness guard: a new Action arm without a case lands here.
        const never: never = action;
        console.warn('[actions] unhandled action', never);
      }
    }
  }
}
