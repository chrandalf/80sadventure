import { font } from '../engine/BitmapFont';
import type { AssetStore } from '../engine/Loader';
import { Colors, ramp } from '../engine/Palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/Screen';
import { formatClock, MAX_SCORE, type GameState } from './state';
import { rect, outline, hline } from './paint';
import { VERBS, type Verb } from './types';

/**
 * The bottom interface (spec s.38): eight verbs, an inventory, a status line.
 *
 * Everything is drawn from flat colour and the bitmap font - no gradients, no
 * rounded corners, no icons that could not have existed in 1987. The layout is
 * fixed rather than responsive because the whole screen is only 320x200; the
 * outer frame scales, the interface never reflows.
 */

export const PLAY_HEIGHT = 288;
export const BAR_Y = PLAY_HEIGHT;
export const BAR_H = 18;
export const PANEL_Y = PLAY_HEIGHT + BAR_H + 1;

const VERB_COLS = 4;
const VERB_W = 72;
const VERB_H = 28;
const VERB_X = 8;
const VERB_Y = PANEL_Y + 4;

const INV_X = 312;
const INV_Y = PANEL_Y + 2;
const SLOT = 40;
const INV_COLS = 7;
const INV_ROWS = 2;
export const INV_VISIBLE = INV_COLS * INV_ROWS;

const ARROW_X = INV_X + INV_COLS * SLOT;

export interface UiState {
  verb: Verb;
  /** Item picked up from the inventory, awaiting a target. */
  heldItem: string | null;
  /** Scroll offset into the inventory, in whole rows. */
  invScroll: number;
  /** What the cursor is currently over, already formatted. */
  statusText: string;
}

export function newUiState(): UiState {
  return { verb: 'LOOK', heldItem: null, invScroll: 0, statusText: '' };
}

/** Which verb button, if any, is at this point. */
export function verbAt(x: number, y: number): Verb | null {
  if (x < VERB_X || y < VERB_Y) return null;
  const col = Math.floor((x - VERB_X) / VERB_W);
  const row = Math.floor((y - VERB_Y) / VERB_H);
  if (col < 0 || col >= VERB_COLS || row < 0 || row > 1) return null;
  const idx = row * VERB_COLS + col;
  return idx < VERBS.length ? VERBS[idx] : null;
}

/** Which inventory slot index (absolute, accounting for scroll) is at this point. */
export function inventorySlotAt(x: number, y: number, scroll: number): number | null {
  if (x < INV_X || x >= INV_X + INV_COLS * SLOT || y < INV_Y || y >= INV_Y + INV_ROWS * SLOT) {
    return null;
  }
  const col = Math.floor((x - INV_X) / SLOT);
  const row = Math.floor((y - INV_Y) / SLOT);
  return (row + scroll) * INV_COLS + col;
}

export function scrollArrowAt(x: number, y: number): 'up' | 'down' | null {
  if (x < ARROW_X || x >= ARROW_X + SLOT) return null;
  if (y >= INV_Y && y < INV_Y + SLOT) return 'up';
  if (y >= INV_Y + SLOT && y < INV_Y + SLOT * 2) return 'down';
  return null;
}

export function isOverPanel(y: number): boolean {
  return y >= BAR_Y;
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  ui: UiState,
  assets: AssetStore,
  itemNames: Record<string, string>,
): void {
  // --- top bar: clock, status, score
  rect(ctx, 0, BAR_Y, GAME_WIDTH, BAR_H, Colors.uiPanel);
  hline(ctx, 0, BAR_Y, GAME_WIDTH, ramp('violet', 1));

  font.draw(ctx, formatClock(state.time), 8, BAR_Y + 3, { color: ramp('cyan', 2) });
  font.draw(ctx, `${state.score}/${MAX_SCORE}`, GAME_WIDTH - 8, BAR_Y + 3, {
    color: ramp('amber', 2),
    align: 'right',
  });
  if (ui.statusText) {
    font.draw(ctx, ui.statusText, GAME_WIDTH / 2, BAR_Y + 3, {
      color: Colors.uiText,
      align: 'center',
    });
  }

  // --- panel body
  rect(ctx, 0, PANEL_Y - 1, GAME_WIDTH, GAME_HEIGHT - PANEL_Y + 1, Colors.uiPanel);
  hline(ctx, 0, PANEL_Y - 1, GAME_WIDTH, ramp('neutral', 2));

  // --- verbs
  VERBS.forEach((verb, i) => {
    const col = i % VERB_COLS;
    const row = Math.floor(i / VERB_COLS);
    const x = VERB_X + col * VERB_W;
    const y = VERB_Y + row * VERB_H;
    const active = ui.verb === verb && !ui.heldItem;

    rect(ctx, x, y, VERB_W - 4, VERB_H - 4, active ? ramp('violet', 1) : Colors.uiPanelLight);
    outline(ctx, x, y, VERB_W - 4, VERB_H - 4, active ? ramp('cyan', 2) : ramp('neutral', 2));
    font.draw(ctx, verb, x + (VERB_W - 4) / 2, y + 7, {
      color: active ? Colors.paper : ramp('neutral', 4),
      align: 'center',
    });
  });

  // --- inventory
  const maxScroll = Math.max(0, Math.ceil(state.inventory.length / INV_COLS) - INV_ROWS);
  const scroll = Math.min(ui.invScroll, maxScroll);
  for (let row = 0; row < INV_ROWS; row++) {
    for (let col = 0; col < INV_COLS; col++) {
      const x = INV_X + col * SLOT;
      const y = INV_Y + row * SLOT;
      const idx = (row + scroll) * INV_COLS + col;
      const itemId = state.inventory[idx];

      rect(ctx, x, y, SLOT - 2, SLOT - 2, Colors.uiPanelLight);
      outline(ctx, x, y, SLOT - 2, SLOT - 2, ramp('neutral', 2));
      if (!itemId) continue;

      const held = ui.heldItem === itemId;
      if (held) {
        rect(ctx, x + 2, y + 2, SLOT - 6, SLOT - 6, ramp('violet', 1));
        outline(ctx, x, y, SLOT - 2, SLOT - 2, ramp('cyan', 2));
      }
      drawItemIcon(ctx, assets, itemId, x, y);
    }
  }

  // --- scroll arrows, only when they do something
  const upActive = scroll > 0;
  const downActive = scroll < maxScroll;
  drawArrow(ctx, ARROW_X, INV_Y, 'up', upActive);
  drawArrow(ctx, ARROW_X, INV_Y + SLOT, 'down', downActive);

  // --- held-item reminder, so USE X WITH Y is never ambiguous
  if (ui.heldItem) {
    const name = itemNames[ui.heldItem] ?? ui.heldItem;
    font.draw(ctx, `USE ${name.toUpperCase()} WITH...`, GAME_WIDTH / 2, GAME_HEIGHT - 18, {
      color: ramp('amber', 2),
      align: 'center',
    });
  }
}

/** Inventory icons come from the sprite store, so they are swappable like everything else. */
export function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  assets: AssetStore,
  itemId: string,
  x: number,
  y: number,
): void {
  const spriteId = itemId.startsWith('cassette_') ? itemId : `item.${itemId}`;
  if (!assets.has(spriteId)) return;
  const sheet = assets.get(spriteId);

  /*
   * Icons are anchored bottom-centre like every other sprite, so the anchor has
   * to be pushed down and right to land the picture's top-left corner on the
   * slot. That offset must be in *drawn* pixels, not source pixels: a sheet with
   * renderScale 2 draws a 16px icon at 32px, and offsetting by the unscaled
   * anchor put every icon half its own height above its slot - straddling the
   * status bar and covering the score.
   *
   * Centred in the slot rather than corner-aligned, so icons of different sizes
   * sit consistently.
   */
  const s = sheet.renderScale;
  const w = sheet.frameWidth * s;
  const h = sheet.frameHeight * s;
  const cx = x + (SLOT - 2 - w) / 2;
  const cy = y + (SLOT - 2 - h) / 2;
  sheet.drawFrame(ctx, 0, cx + sheet.anchorX * s, cy + sheet.anchorY * s);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 'up' | 'down',
  active: boolean,
): void {
  rect(ctx, x, y, SLOT - 2, SLOT - 2, Colors.uiPanelLight);
  outline(ctx, x, y, SLOT - 2, SLOT - 2, ramp('neutral', 2));
  const color = active ? ramp('cyan', 2) : ramp('neutral', 2);
  const cx = x + Math.floor((SLOT - 1) / 2);
  const cy = y + Math.floor((SLOT - 1) / 2);
  for (let i = 0; i < 5; i++) {
    const w = 1 + i * 2;
    const py = dir === 'up' ? cy + 2 - i : cy - 2 + i;
    rect(ctx, cx - Math.floor(w / 2), py, w, 1, color);
  }
}

/** The mouse pointer. Drawn last, over everything. */
export function drawCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  overHotspot: boolean,
): void {
  const px = Math.round(x);
  const py = Math.round(y);
  const color = overHotspot ? Colors.uiHighlight : Colors.paper;

  // A crosshair with a dark outline so it stays visible on any background.
  ctx.fillStyle = Colors.ink;
  ctx.fillRect(px - 5, py - 1, 11, 3);
  ctx.fillRect(px - 1, py - 5, 3, 11);
  ctx.fillStyle = color;
  ctx.fillRect(px - 4, py, 9, 1);
  ctx.fillRect(px, py - 4, 1, 9);
  if (overHotspot) {
    ctx.fillStyle = color;
    ctx.fillRect(px - 4, py - 4, 2, 1);
    ctx.fillRect(px + 3, py - 4, 2, 1);
    ctx.fillRect(px - 4, py + 4, 2, 1);
    ctx.fillRect(px + 3, py + 4, 2, 1);
  }
}
