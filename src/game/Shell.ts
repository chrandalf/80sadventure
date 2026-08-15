import { audio } from '../engine/Audio';
import { font } from '../engine/BitmapFont';
import type { Input } from '../engine/Input';
import type { AssetStore } from '../engine/Loader';
import { Colors, ramp } from '../engine/Palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/Screen';
import { ENDINGS } from '../content/endings';
import { AdventureScreen } from './AdventureScreen';
import { BackgroundStore } from './BackgroundStore';
import { ditherFill, neonText, outline, rect, rng, staticScreen } from './paint';
import {
  cheekyVerdict, deleteSave, loadGame, MAX_CHEEKY, MAX_SCORE, newGameState, saveGame,
  saveSlots, scoreVerdict, slotInfo,
} from './state';

type Mode = 'intro' | 'title' | 'game' | 'pause' | 'slots' | 'score' | 'credits';

interface MenuItem {
  label: string;
  action: () => void;
  enabled?: boolean;
}

/**
 * Everything around the game: the opening title sequence (spec s.30), the main
 * menu, save slots, the score screen (s.28, s.55) and the final screen (s.31).
 *
 * Owns the AdventureScreen and swaps it in and out, so restarting is simply
 * throwing the old one away.
 */
export class Shell {
  private mode: Mode = 'intro';
  private game: AdventureScreen | null = null;
  private readonly assets: AssetStore;
  private readonly backgrounds = new BackgroundStore();

  private t = 0;
  private cursor = 0;
  private menu: MenuItem[] = [];
  private slotMode: 'save' | 'load' = 'load';
  private endingId: string | null = null;
  /** Set once the player has finished at least once (spec s.31). */
  private seenEnding = false;

  constructor(assets: AssetStore) {
    this.assets = assets;
  }

  // ------------------------------------------------------------------ update

  update(dt: number, input: Input): void {
    this.t += dt;

    switch (this.mode) {
      case 'intro': return this.updateIntro(input);
      case 'title': return this.updateMenu(input);
      case 'game': return this.updateGame(dt, input);
      case 'pause': return this.updateMenu(input);
      case 'slots': return this.updateSlots(input);
      case 'score': return this.updateScore(input);
      case 'credits': return this.updateCredits(input);
    }
  }

  private updateIntro(input: Input): void {
    const skipped = input.wasPressed('Space') || input.takeClicks().length > 0;
    if (this.t > 1.2 && this.t < 1.3) audio.playMusic('title');
    if (this.t > 8.2) audio.sfx('coin');
    if (skipped || this.t > 11) {
      audio.unlock();
      audio.playMusic('title');
      this.openTitle();
    }
  }

  private openTitle(): void {
    this.mode = 'title';
    this.cursor = 0;
    const hasSave = saveSlots().some((s) => slotInfo(s) !== null);
    this.menu = [
      { label: 'NEW GAME', action: () => this.startNewGame() },
      {
        label: 'CONTINUE',
        enabled: hasSave,
        action: () => {
          const slot = saveSlots().find((s) => slotInfo(s) !== null);
          if (slot) this.loadInto(slot);
        },
      },
      { label: 'LOAD GAME', enabled: hasSave, action: () => this.openSlots('load') },
      { label: 'CREDITS', action: () => { this.mode = 'credits'; this.t = 0; } },
    ];
  }

  private openPause(): void {
    this.mode = 'pause';
    this.cursor = 0;
    this.menu = [
      { label: 'RESUME', action: () => { this.mode = 'game'; } },
      { label: 'SAVE GAME', action: () => this.openSlots('save') },
      { label: 'LOAD GAME', action: () => this.openSlots('load') },
      {
        label: audio.isMuted ? 'SOUND: OFF' : 'SOUND: ON',
        action: () => { audio.setMuted(!audio.isMuted); this.openPause(); },
      },
      { label: 'RESTART', action: () => this.startNewGame() },
      { label: 'QUIT TO TITLE', action: () => { audio.playMusic('title'); this.openTitle(); } },
    ];
  }

  private startNewGame(): void {
    this.game = new AdventureScreen(this.assets, newGameState());
    this.mode = 'game';
  }

  private loadInto(slot: string): void {
    const state = loadGame(slot);
    if (!state) return;
    this.game = new AdventureScreen(this.assets, state);
    this.mode = 'game';
  }

  private openSlots(mode: 'save' | 'load'): void {
    this.slotMode = mode;
    this.mode = 'slots';
    this.cursor = 0;
  }

  private updateGame(dt: number, input: Input): void {
    const game = this.game;
    if (!game) return this.openTitle();

    // Save/load hotkeys (spec s.24).
    if (input.wasPressed('F5')) return this.openSlots('save');
    if (input.wasPressed('F9')) return this.openSlots('load');

    game.update(dt, input);

    const exit = game.takeExit();
    if (!exit) return;
    if (exit.kind === 'menu') {
      this.openPause();
    } else {
      this.endingId = exit.id;
      this.seenEnding = true;
      this.mode = 'score';
      this.t = 0;
      audio.playMusic('ending');
    }
  }

  private updateMenu(input: Input): void {
    const usable = () => this.menu.filter((m) => m.enabled !== false);
    if (usable().length === 0) return;

    if (input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) {
      this.moveCursor(-1);
      audio.sfx('button');
    }
    if (input.wasPressed('ArrowDown') || input.wasPressed('KeyS')) {
      this.moveCursor(1);
      audio.sfx('button');
    }
    if (input.wasPressed('Escape') && this.mode === 'pause') {
      this.mode = 'game';
      return;
    }

    // Mouse hover, but only once the player has actually moved the mouse.
    const hit = this.menuIndexAt(input.y);
    if (input.usingMouse && hit >= 0) this.cursor = hit;
    const clicked = input.takeClicks().length > 0;

    if (clicked || input.wasPressed('Enter') || input.wasPressed('Space')) {
      audio.unlock();
      const item = this.menu[this.cursor];
      if (item && item.enabled !== false) {
        audio.sfx('select');
        item.action();
      }
    }
  }

  private moveCursor(dir: number): void {
    for (let i = 0; i < this.menu.length; i++) {
      this.cursor = (this.cursor + dir + this.menu.length) % this.menu.length;
      if (this.menu[this.cursor].enabled !== false) return;
    }
  }

  private menuTop(): number {
    return GAME_HEIGHT / 2 - (this.menu.length * 12) / 2 + 14;
  }

  private menuIndexAt(y: number): number {
    const i = Math.floor((y - this.menuTop() + 3) / 12);
    return i >= 0 && i < this.menu.length ? i : -1;
  }

  private updateSlots(input: Input): void {
    const slots = saveSlots();
    if (input.wasPressed('ArrowUp')) this.cursor = (this.cursor + slots.length - 1) % slots.length;
    if (input.wasPressed('ArrowDown')) this.cursor = (this.cursor + 1) % slots.length;
    if (input.wasPressed('Escape')) {
      this.mode = this.game ? 'pause' : 'title';
      if (this.mode === 'pause') this.openPause();
      else this.openTitle();
      return;
    }
    if (input.wasPressed('Delete') || input.wasPressed('KeyX')) {
      deleteSave(slots[this.cursor]);
      audio.sfx('deny');
      return;
    }

    const hit = Math.floor((input.y - 40) / 14);
    if (input.usingMouse && hit >= 0 && hit < slots.length) this.cursor = hit;
    const clicked = input.takeClicks().length > 0;

    if (clicked || input.wasPressed('Enter') || input.wasPressed('Space')) {
      const slot = slots[this.cursor];
      if (this.slotMode === 'save' && this.game) {
        saveGame(slot, this.game.state, this.game.sceneName);
        audio.sfx('select');
        this.openPause();
      } else if (slotInfo(slot)) {
        audio.sfx('select');
        this.loadInto(slot);
      } else {
        audio.sfx('deny');
      }
    }
  }

  private updateScore(input: Input): void {
    if (this.t < 0.6) {
      input.takeClicks();
      return;
    }
    if (input.wasPressed('Space') || input.wasPressed('Enter') || input.takeClicks().length > 0) {
      this.mode = 'credits';
      this.t = 0;
    }
  }

  private updateCredits(input: Input): void {
    if (this.t < 0.5) {
      input.takeClicks();
      return;
    }
    if (input.wasPressed('Space') || input.wasPressed('Escape') || input.takeClicks().length > 0) {
      audio.playMusic('title');
      this.openTitle();
    }
  }

  // -------------------------------------------------------------------- draw

  draw(ctx: CanvasRenderingContext2D, input: Input): void {
    switch (this.mode) {
      case 'intro': this.drawIntro(ctx); break;
      case 'title': this.drawTitle(ctx); break;
      case 'game': this.game?.draw(ctx); break;
      case 'pause':
        this.game?.draw(ctx);
        this.drawMenuPanel(ctx, 'PAUSED');
        break;
      case 'slots':
        if (this.game) this.game.draw(ctx);
        else this.drawTitleBackdrop(ctx);
        this.drawSlots(ctx);
        break;
      case 'score': this.drawScore(ctx); break;
      case 'credits': this.drawCredits(ctx); break;
    }

    // The software cursor, over everything.
    if (this.mode === 'game' && this.game) this.game.drawCursorAt(ctx, input.x, input.y);
  }

  /** Spec s.30: black, then the date, then the arcade slowly revealed. */
  private drawIntro(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const lines: [string, number, string][] = [
      ['BRIGHTON VALE', 0.6, ramp('paper', 0)],
      ['FRIDAY', 2.2, ramp('neutral', 4)],
      ['18 SEPTEMBER 1987', 3.4, ramp('neutral', 4)],
      ['19:03', 4.8, ramp('cyan', 2)],
    ];
    lines.forEach(([text, at, color], i) => {
      if (this.t < at) return;
      const age = Math.min(1, (this.t - at) / 0.5);
      ctx.globalAlpha = age * (this.t > 6.4 ? Math.max(0, 1 - (this.t - 6.4) / 0.8) : 1);
      font.draw(ctx, text, GAME_WIDTH / 2, 52 + i * 14, { color, align: 'center' });
      ctx.globalAlpha = 1;
    });

    // The arcade fades up underneath from 7s.
    if (this.t > 7) {
      const reveal = Math.min(1, (this.t - 7) / 2.6);
      ctx.globalAlpha = reveal;
      ctx.drawImage(this.backgrounds.get('arcade_floor'), 0, 0);
      ctx.globalAlpha = 1;
      // Dark wash that lifts as it reveals.
      ditherFill(ctx, 0, 0, GAME_WIDTH, GAME_HEIGHT, Colors.ink, Colors.ink, 0);
      ctx.globalAlpha = 1 - reveal;
      ctx.fillStyle = Colors.ink;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.globalAlpha = 1;
    }

    if (this.t > 8.4) {
      const pop = Math.min(1, (this.t - 8.4) / 0.6);
      ctx.globalAlpha = pop;
      this.drawLogo(ctx, 88);
      ctx.globalAlpha = 1;
    }

    if (this.t > 10) {
      font.draw(ctx, 'PRESS SPACE', GAME_WIDTH / 2, GAME_HEIGHT - 20, {
        color: ramp('neutral', 3), align: 'center',
      });
    }
  }

  private drawLogo(ctx: CanvasRenderingContext2D, y: number): void {
    neonText(ctx, 'ONE MORE CREDIT', GAME_WIDTH / 2, y, ramp('magenta', 3), ramp('magenta', 1));
    font.draw(ctx, 'A BRIGHTON VALE MYSTERY', GAME_WIDTH / 2, y + 12, {
      color: ramp('cyan', 2), outline: Colors.ink, align: 'center',
    });
  }

  private drawTitleBackdrop(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.backgrounds.get('arcade_floor'), 0, 0);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;
  }

  private drawTitle(ctx: CanvasRenderingContext2D): void {
    this.drawTitleBackdrop(ctx);

    // Spec s.31: after finishing once, Jack is standing in the title art.
    if (this.seenEnding) {
      const sheet = this.assets.get('char.jack');
      sheet.drawFrame(ctx, 0, 262, 132);
    }

    // A dark band behind the logo so it never fights the cabinets behind it.
    ditherFill(ctx, 0, 18, GAME_WIDTH, 32, Colors.ink, Colors.ink, 1);
    this.drawLogo(ctx, 22);

    const top = this.menuTop();
    ditherFill(ctx, 96, top - 8, 128, this.menu.length * 12 + 12, Colors.ink, Colors.uiPanel, 0.5);
    this.menu.forEach((item, i) => {
      const on = i === this.cursor;
      const disabled = item.enabled === false;
      const color = disabled ? ramp('neutral', 2) : on ? Colors.paper : ramp('neutral', 4);
      if (on && !disabled) {
        font.draw(ctx, '>', GAME_WIDTH / 2 - 62, top + i * 12, { color: ramp('cyan', 3) });
      }
      font.draw(ctx, item.label, GAME_WIDTH / 2, top + i * 12, {
        color, outline: Colors.ink, align: 'center',
      });
    });

    font.draw(ctx, '(C) 1987 STARLIGHT SOFTWARE', GAME_WIDTH / 2, GAME_HEIGHT - 14, {
      color: ramp('neutral', 3), outline: Colors.ink, align: 'center',
    });
  }

  private drawMenuPanel(ctx: CanvasRenderingContext2D, title: string): void {
    const h = this.menu.length * 12 + 26;
    const w = 150;
    const x = GAME_WIDTH / 2 - w / 2;
    const y = GAME_HEIGHT / 2 - h / 2 - 6;

    ctx.globalAlpha = 0.75;
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;

    rect(ctx, x, y, w, h, Colors.uiPanel);
    outline(ctx, x, y, w, h, ramp('violet', 2));
    font.draw(ctx, title, GAME_WIDTH / 2, y + 5, { color: ramp('cyan', 3), align: 'center' });

    const top = this.menuTop();
    this.menu.forEach((item, i) => {
      const on = i === this.cursor;
      font.draw(ctx, item.label, GAME_WIDTH / 2, top + i * 12, {
        color: item.enabled === false ? ramp('neutral', 2) : on ? Colors.paper : ramp('neutral', 4),
        align: 'center',
      });
    });
  }

  private drawSlots(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;

    const slots = saveSlots();
    rect(ctx, 24, 24, GAME_WIDTH - 48, 24 + slots.length * 14, Colors.uiPanel);
    outline(ctx, 24, 24, GAME_WIDTH - 48, 24 + slots.length * 14, ramp('violet', 2));
    font.draw(ctx, this.slotMode === 'save' ? 'SAVE GAME' : 'LOAD GAME', GAME_WIDTH / 2, 29, {
      color: ramp('cyan', 3), align: 'center',
    });

    slots.forEach((slot, i) => {
      const y = 40 + i * 14;
      const on = i === this.cursor;
      if (on) rect(ctx, 28, y - 2, GAME_WIDTH - 56, 13, ramp('violet', 1));
      const info = slotInfo(slot);
      const label = slot === 'auto' ? 'AUTO' : `SLOT ${slot}`;
      font.draw(ctx, label, 34, y, { color: on ? Colors.paper : ramp('neutral', 4) });
      font.draw(
        ctx,
        info ? `ACT ${info.act}  ${info.clock}  ${info.score}pt` : '- empty -',
        GAME_WIDTH - 34,
        y,
        { color: info ? ramp('amber', 2) : ramp('neutral', 2), align: 'right' },
      );
      if (info) {
        font.draw(ctx, info.scene.slice(0, 22), 90, y, {
          color: on ? ramp('cyan', 2) : ramp('neutral', 3),
        });
      }
    });

    font.draw(ctx, 'ENTER SELECT   X DELETE   ESC BACK', GAME_WIDTH / 2, GAME_HEIGHT - 16, {
      color: ramp('neutral', 3), align: 'center',
    });
  }

  /** Spec s.28 and s.55. */
  private drawScore(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const state = this.game?.state ?? newGameState();
    const ending = this.endingId ? ENDINGS[this.endingId] : null;

    font.draw(ctx, ending?.title ?? 'THE END', GAME_WIDTH / 2, 18, {
      color: ramp('magenta', 3), align: 'center',
    });

    font.draw(ctx, `SCORE: ${state.score} / ${MAX_SCORE}`, GAME_WIDTH / 2, 44, {
      color: ramp('amber', 3), align: 'center',
    });
    font.draw(ctx, scoreVerdict(state.score), GAME_WIDTH / 2, 56, {
      color: Colors.paper, align: 'center',
    });

    font.draw(ctx, 'CHEEKY MOMENTS FOUND', GAME_WIDTH / 2, 78, {
      color: ramp('cyan', 2), align: 'center',
    });
    font.draw(ctx, `${state.cheeky} / ${MAX_CHEEKY}`, GAME_WIDTH / 2, 90, {
      color: ramp('amber', 3), align: 'center',
    });
    font.draw(ctx, cheekyVerdict(state.cheeky), GAME_WIDTH / 2, 102, {
      color: Colors.paper, align: 'center',
    });

    const cassettes = state.inventory.filter((i) => i.startsWith('cassette_')).length;
    font.draw(ctx, `CASSETTES RECOVERED: ${cassettes}`, GAME_WIDTH / 2, 122, {
      color: ramp('neutral', 4), align: 'center',
    });

    if (this.t > 1.4) {
      font.draw(ctx, 'PRESS SPACE', GAME_WIDTH / 2, GAME_HEIGHT - 20, {
        color: ramp('neutral', 3), align: 'center',
      });
    }
  }

  /** Spec s.31: the final screen, and the flicker at the end of it. */
  private drawCredits(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (this.t < 3) {
      font.draw(ctx, 'THANK YOU FOR PLAYING.', GAME_WIDTH / 2, 90, {
        color: Colors.paper, align: 'center',
      });
      return;
    }
    if (this.t < 6.4) {
      font.draw(ctx, 'SOME MEMORIES ARE BETTER', GAME_WIDTH / 2, 84, {
        color: Colors.paper, align: 'center',
      });
      font.draw(ctx, 'LEFT UNCHANGED.', GAME_WIDTH / 2, 96, {
        color: Colors.paper, align: 'center',
      });
      return;
    }
    if (this.t < 7.1) {
      // The screen flickers.
      staticScreen(ctx, 0, 0, GAME_WIDTH, GAME_HEIGHT, Math.floor(this.t * 30));
      return;
    }

    font.draw(ctx, 'CREDIT 1', GAME_WIDTH / 2, 90, { color: ramp('phosphor', 3), align: 'center' });
    if (this.t > 8.4) {
      const r = rng(7);
      for (let i = 0; i < 3; i++) {
        font.draw(ctx, ['ONE MORE CREDIT', 'BRIGHTON VALE, 1987', 'PRESS SPACE'][i],
          GAME_WIDTH / 2, 116 + i * 12, {
            color: [ramp('magenta', 2), ramp('neutral', 3), ramp('neutral', 3)][i],
            align: 'center',
          });
      }
      void r;
    }
  }
}
