import { audio } from '../engine/Audio';
import { font } from '../engine/BitmapFont';
import { Colors, ramp } from '../engine/Palette';
import { GAME_WIDTH } from '../engine/Screen';
import { rect, outline } from './paint';
import { evalCond, type GameState } from './state';
import type { Action, DialogueNode } from './types';

const MAX_CHOICES = 6;
const CHOICE_H = 9;

/**
 * Branching conversations (spec s.12, s.34).
 *
 * Lines play through the shared Speech box so NPC dialogue looks identical to
 * everything else on screen; choices then appear as a list. A node with no
 * choices simply ends, which makes one-shot exchanges and full trees the same
 * data structure.
 */
export class DialogueUi {
  private nodes: Record<string, DialogueNode>;
  private nodeId: string | null = null;
  private lineIndex = 0;
  private mode: 'lines' | 'choices' = 'lines';
  private visibleChoices: { text: string; index: number }[] = [];
  private hovered = -1;
  /** Choices already taken, for `once`. Keyed `node:index`. */
  private used = new Set<string>();

  constructor(nodes: Record<string, DialogueNode>) {
    this.nodes = nodes;
  }

  get isOpen(): boolean {
    return this.nodeId !== null;
  }

  get showingChoices(): boolean {
    return this.mode === 'choices';
  }

  get currentNode(): DialogueNode | null {
    return this.nodeId ? this.nodes[this.nodeId] ?? null : null;
  }

  open(nodeId: string): void {
    if (!this.nodes[nodeId]) {
      console.warn(`[dialogue] unknown node "${nodeId}"`);
      this.nodeId = null;
      return;
    }
    this.nodeId = nodeId;
    this.lineIndex = 0;
    this.mode = 'lines';
    this.hovered = -1;
  }

  close(): void {
    this.nodeId = null;
    this.mode = 'lines';
  }

  /** Reset per-playthrough state, so `once` choices come back on a new game. */
  reset(): void {
    this.used.clear();
    this.close();
  }

  /**
   * Advance the conversation. Called when the speech box is free.
   *
   * @returns actions to run, if this step produced any
   */
  advance(state: GameState, say: (who: string, text: string) => void): Action[] | null {
    const node = this.currentNode;
    if (!node) return null;

    if (this.mode === 'lines') {
      const lines = node.lines ?? [];
      // Skip lines whose condition fails, so one node can serve several states.
      while (this.lineIndex < lines.length && !evalCond(state, lines[this.lineIndex].showIf)) {
        this.lineIndex++;
      }
      if (this.lineIndex < lines.length) {
        const line = lines[this.lineIndex++];
        say(line.who, line.text);
        return line.actions ?? null;
      }
      // Lines exhausted: offer choices, or end.
      this.buildChoices(state);
      if (this.visibleChoices.length === 0) {
        const end = node.onEnd ?? null;
        this.close();
        return end;
      }
      this.mode = 'choices';
      return null;
    }
    return null;
  }

  private buildChoices(state: GameState): void {
    const node = this.currentNode;
    this.visibleChoices = [];
    if (!node?.choices) return;
    node.choices.forEach((choice, index) => {
      if (choice.once && this.used.has(`${node.id}:${index}`)) return;
      if (!evalCond(state, choice.showIf)) return;
      if (this.visibleChoices.length < MAX_CHOICES) {
        this.visibleChoices.push({ text: choice.text, index });
      }
    });
  }

  /** Mouse moved. `y` is in game pixels. */
  hover(x: number, y: number): void {
    if (this.mode !== 'choices') return;
    this.hovered = this.choiceAt(x, y);
  }

  private choiceAt(x: number, y: number): number {
    const top = this.choicesTop();
    if (x < 6 || x > GAME_WIDTH - 6) return -1;
    const i = Math.floor((y - top) / CHOICE_H);
    return i >= 0 && i < this.visibleChoices.length ? i : -1;
  }

  private choicesTop(): number {
    return 140 - this.visibleChoices.length * CHOICE_H;
  }

  /**
   * Player clicked. Returns the actions for the chosen line, or null.
   * Sets up the jump to the next node as a side effect.
   */
  click(x: number, y: number, keyIndex?: number): Action[] | null {
    if (this.mode !== 'choices') return null;
    const node = this.currentNode;
    if (!node) return null;

    const slot = keyIndex !== undefined ? keyIndex : this.choiceAt(x, y);
    if (slot < 0 || slot >= this.visibleChoices.length) return null;

    const { index } = this.visibleChoices[slot];
    const choice = node.choices![index];
    if (choice.once) this.used.add(`${node.id}:${index}`);
    audio.sfx('select');

    const actions = choice.actions ?? [];
    if (choice.goto) {
      this.open(choice.goto);
    } else {
      const end = node.onEnd ?? [];
      this.close();
      return [...actions, ...end];
    }
    return actions;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.mode !== 'choices' || this.visibleChoices.length === 0) return;
    const top = this.choicesTop();
    const h = this.visibleChoices.length * CHOICE_H + 2;

    rect(ctx, 4, top - 2, GAME_WIDTH - 8, h, Colors.uiPanel);
    outline(ctx, 4, top - 2, GAME_WIDTH - 8, h, ramp('violet', 1));

    this.visibleChoices.forEach((choice, i) => {
      const y = top + i * CHOICE_H;
      const on = i === this.hovered;
      if (on) rect(ctx, 6, y - 1, GAME_WIDTH - 12, CHOICE_H, ramp('violet', 1));
      font.draw(ctx, `${i + 1}.`, 9, y, { color: on ? ramp('cyan', 3) : ramp('neutral', 3) });
      font.draw(ctx, choice.text, 22, y, { color: on ? Colors.paper : ramp('neutral', 4) });
    });
  }
}
