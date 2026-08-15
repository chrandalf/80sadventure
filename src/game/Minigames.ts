import { audio } from '../engine/Audio';
import { font } from '../engine/BitmapFont';
import type { Input } from '../engine/Input';
import { Colors, ramp } from '../engine/Palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/Screen';
import { outline, rect, rng, staticScreen } from './paint';
import {
  BOOM, BUNKER, CAR_ENEMY, CAR_PLAYER, EXIT_DOOR, EXPLORER,
  INVADER_A, INVADER_B, INVADER_C, MONSTER, SHIP, drawSpriteCentred,
} from './arcadeSprites';
import type { Action } from './types';

/** The playfield sits inside a drawn cabinet bezel. */
const VX = 120;
const VY = 44;
const VW = 400;
const VH = 216;

interface Entity {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  alive: boolean;
  /** Which invader rank this is, for its sprite. */
  rank?: number;
  /** Counts down while a death burst plays, then the entity is removed. */
  boom?: number;
  /** Shots the invaders drop, told apart from the player's by direction. */
  bomb?: boolean;
  /** Bunkers take several hits before they go. */
  hp?: number;
}

/**
 * The playable arcade cabinets (spec s.13).
 *
 * Small on purpose - they are texture, not the game. Each returns a script when
 * it ends, so a good score can set a flag and change dialogue elsewhere without
 * the minigames knowing anything about the story.
 */
export class Minigames {
  private id: string | null = null;
  private t = 0;
  private score = 0;
  private best = 0;
  private over = false;
  private overTimer = 0;
  private result: Action[] | null = null;

  private player = { x: VX + VW / 2, y: VY + VH - 14 };
  private entities: Entity[] = [];
  private spawnTimer = 0;
  private rand = rng(1);
  /** SPACE WARS: the formation marches as one, so its state lives here. */
  private marchDir = 1;
  private marchStep = 0;
  private marchTimer = 0;
  private bunkers: Entity[] = [];

  /** ONE MORE CREDIT: the machine records you, then plays you back. */
  private recording: { x: number; y: number }[] = [];
  private playback = false;
  private playbackIndex = 0;

  get isOpen(): boolean {
    return this.id !== null;
  }

  takeResult(): Action[] | null {
    const r = this.result;
    this.result = null;
    return r;
  }

  open(id: string): void {
    this.id = id;
    this.t = 0;
    this.score = 0;
    this.over = false;
    this.overTimer = 0;
    this.entities = [];
    this.spawnTimer = 0;
    this.rand = rng(id.length * 7919 + 13);
    this.player = { x: VX + VW / 2, y: VY + VH - 14 };
    this.recording = [];
    this.playback = false;
    this.playbackIndex = 0;
    this.marchDir = 1;
    this.marchStep = 0;
    this.marchTimer = 0;
    this.bunkers = [];
    if (id === 'space') this.startSpace();
    if (id === 'manor') this.startManor();
    audio.sfx('credit');
  }

  private close(): void {
    const id = this.id;
    this.id = null;
    this.best = Math.max(this.best, this.score);

    // A genuinely good score is what unlocks Kevin's disbelief (spec s.13).
    const beat = this.score >= this.targetScore(id ?? '');
    this.result = [
      ['jack', beat ? this.winLine(id ?? '') : this.loseLine(id ?? '')],
      ...(beat ? ([['flag', 'kevinBeaten'], ['score', 5, `arcade:${id}`]] as Action[]) : []),
    ];
  }

  private targetScore(id: string): number {
    switch (id) {
      case 'turbo': return 900;
      case 'space': return 12;
      case 'manor': return 1;
      default: return 1;
    }
  }

  private winLine(id: string): string {
    switch (id) {
      case 'turbo': return 'A personal best. Nobody saw it. That is the arcade experience.';
      case 'space': return 'Twelve asteroids. I am basically an astronaut.';
      case 'manor': return 'Out. The monsters were, on reflection, four pixels each.';
      default: return 'It played me back to myself. I liked it better the first time.';
    }
  }

  private loseLine(id: string): string {
    switch (id) {
      case 'turbo': return 'I have driven better. I have also driven worse, in real life.';
      case 'space': return 'The asteroids won. They usually do.';
      case 'manor': return 'Lost in a maze the size of a beer mat. Excellent work.';
      default: return 'I have no idea what just happened, and it knew my name.';
    }
  }

  update(dt: number, input: Input): void {
    if (!this.id) return;
    this.t += dt;

    if (input.wasPressed('Escape')) {
      this.close();
      return;
    }

    if (this.over) {
      this.overTimer -= dt;
      if (this.overTimer <= 0 || input.wasPressed('Space')) this.close();
      return;
    }

    switch (this.id) {
      case 'turbo': this.updateTurbo(dt, input); break;
      case 'space': this.updateSpace(dt, input); break;
      case 'manor': this.updateManor(dt, input); break;
      default: this.updateCredit(dt, input); break;
    }
  }

  private endGame(): void {
    this.over = true;
    this.overTimer = 2.5;
    audio.sfx('die');
  }

  private steer(dt: number, input: Input, speed: number): void {
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) this.player.x -= speed * dt;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) this.player.x += speed * dt;
    this.player.x = Math.max(VX + 6, Math.min(VX + VW - 6, this.player.x));
  }

  // TURBO RACER: dodge oncoming traffic.
  private updateTurbo(dt: number, input: Input): void {
    this.steer(dt, input, 110);
    this.score += Math.round(dt * 60);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.42 - Math.min(0.24, this.t * 0.012);
      this.entities.push({
        x: VX + 10 + this.rand() * (VW - 20),
        y: VY - 8,
        vy: 60 + this.t * 2.2,
        alive: true,
      });
    }
    for (const e of this.entities) {
      e.y += (e.vy ?? 0) * dt;
      if (e.y > VY + VH) e.alive = false;
      if (Math.abs(e.x - this.player.x) < 9 && Math.abs(e.y - this.player.y) < 11) this.endGame();
    }
    this.entities = this.entities.filter((e) => e.alive);
  }

  /**
   * SPACE WARS: a formation of invaders marches down at you.
   *
   * It was falling rocks, which is a screensaver rather than a game. A
   * formation gives it the thing the originals had: the march speeds up as
   * you thin it out, so clearing the screen makes the last few frightening.
   */
  private startSpace(): void {
    const cols = 8;
    const rowsOf = [INVADER_C, INVADER_B, INVADER_B, INVADER_A, INVADER_A];
    rowsOf.forEach((_, row) => {
      for (let col = 0; col < cols; col++) {
        this.entities.push({
          x: VX + 54 + col * 38,
          y: VY + 22 + row * 24,
          rank: row === 0 ? 2 : row < 3 ? 1 : 0,
          alive: true,
        });
      }
    });
    // Four blocks to hide behind, which both sides can chip away.
    for (let i = 0; i < 4; i++) {
      this.bunkers.push({ x: VX + 62 + i * 92, y: VY + VH - 46, hp: 6, alive: true });
    }
  }

  private updateSpace(dt: number, input: Input): void {
    this.steer(dt, input, 120);

    const invaders = this.entities.filter((e) => e.rank !== undefined && !e.boom);
    const shots = this.entities.filter((e) => e.rank === undefined && !e.boom);

    // One shot on screen at a time, as the cabinets always did - it is what
    // makes each press a decision rather than a stream.
    if (input.wasPressed('Space') && !shots.some((b) => !b.bomb)) {
      this.entities.push({ x: this.player.x, y: this.player.y - 8, vy: -190, alive: true });
      audio.sfx('button');
    }

    // The march: one step every so often, faster as the ranks thin.
    const pace = Math.max(0.09, 0.62 - (40 - invaders.length) * 0.013);
    this.marchTimer -= dt;
    if (this.marchTimer <= 0 && invaders.length) {
      this.marchTimer = pace;
      this.marchStep++;
      const edgeL = Math.min(...invaders.map((e) => e.x));
      const edgeR = Math.max(...invaders.map((e) => e.x));
      if ((this.marchDir > 0 && edgeR > VX + VW - 26) || (this.marchDir < 0 && edgeL < VX + 26)) {
        this.marchDir *= -1;
        for (const e of invaders) e.y += 12;
      } else {
        for (const e of invaders) e.x += 10 * this.marchDir;
      }
      audio.sfx('button');
    }

    // Somebody on the bottom row drops a bomb now and then.
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && invaders.length) {
      this.spawnTimer = 0.7 + this.rand() * 1.1;
      const shooter = invaders[Math.floor(this.rand() * invaders.length)];
      this.entities.push({ x: shooter.x, y: shooter.y + 6, vy: 105, bomb: true, alive: true });
    }

    for (const e of this.entities) {
      if (e.boom !== undefined) { e.boom -= dt; if (e.boom <= 0) e.alive = false; continue; }
      e.x += (e.vx ?? 0) * dt;
      e.y += (e.vy ?? 0) * dt;
      if (e.rank === undefined && (e.y < VY - 8 || e.y > VY + VH)) e.alive = false;
    }

    const burst = (e: Entity) => { e.boom = 0.28; e.vx = 0; e.vy = 0; };

    for (const b of shots.filter((e) => !e.bomb)) {
      for (const inv of invaders) {
        if (b.alive && !inv.boom && Math.abs(b.x - inv.x) < 7 && Math.abs(b.y - inv.y) < 6) {
          b.alive = false;
          burst(inv);
          this.score++;
          audio.sfx('zap');
        }
      }
    }

    // Bunkers erode from either side.
    for (const bunker of this.bunkers) {
      for (const shot of shots) {
        if (!shot.alive || !bunker.alive) continue;
        if (Math.abs(shot.x - bunker.x) < 11 && Math.abs(shot.y - bunker.y) < 6) {
          shot.alive = false;
          bunker.hp = (bunker.hp ?? 1) - 1;
          if (bunker.hp <= 0) bunker.alive = false;
        }
      }
    }
    this.bunkers = this.bunkers.filter((b) => b.alive);

    for (const bomb of shots.filter((e) => e.bomb)) {
      if (bomb.alive && Math.abs(bomb.x - this.player.x) < 8 && Math.abs(bomb.y - this.player.y) < 8) {
        this.endGame();
      }
    }
    // Reaching the floor is the same as shooting you.
    if (invaders.some((e) => e.y > this.player.y - 14)) this.endGame();
    // Clear the screen and a fresh wave drops in, one row lower.
    if (!invaders.length && !this.over) {
      this.startSpace();
      for (const e of this.entities) if (e.rank !== undefined) e.y += 10;
    }

    this.entities = this.entities.filter((e) => e.alive);
  }

  // MONSTER MANOR: reach the far corner of a tiny maze.
  /** Two things wander the maze. Reaching the exit with neither on you wins. */
  private startManor(): void {
    this.player = { x: VX + 10, y: VY + 10 };
    this.entities = [
      { x: VX + VW - 40, y: VY + 30, vx: -30, vy: 0, alive: true },
      { x: VX + 60, y: VY + VH - 40, vx: 0, vy: -30, alive: true },
    ];
  }

  private updateManor(dt: number, input: Input): void {
    const speed = 52;
    let nx = this.player.x;
    let ny = this.player.y;
    if (input.isDown('ArrowLeft')) nx -= speed * dt;
    if (input.isDown('ArrowRight')) nx += speed * dt;
    if (input.isDown('ArrowUp')) ny -= speed * dt;
    if (input.isDown('ArrowDown')) ny += speed * dt;

    if (!this.manorWall(nx, this.player.y)) this.player.x = nx;
    if (!this.manorWall(this.player.x, ny)) this.player.y = ny;
    this.player.x = Math.max(VX + 4, Math.min(VX + VW - 4, this.player.x));
    this.player.y = Math.max(VY + 4, Math.min(VY + VH - 4, this.player.y));

    // The monsters drift until a wall stops them, then pick a new direction -
    // enough to make the maze a chase rather than a stroll, without becoming
    // a game anyone is expected to take seriously.
    for (const m of this.entities) {
      const mx = m.x + (m.vx ?? 0) * dt;
      const my = m.y + (m.vy ?? 0) * dt;
      const blocked = this.manorWall(mx, my)
        || mx < VX + 6 || mx > VX + VW - 6 || my < VY + 6 || my > VY + VH - 6;
      if (blocked) {
        const turn = this.rand();
        m.vx = turn < 0.5 ? (turn < 0.25 ? -34 : 34) : 0;
        m.vy = m.vx === 0 ? (turn < 0.75 ? -34 : 34) : 0;
      } else {
        m.x = mx;
        m.y = my;
      }
      if (Math.hypot(m.x - this.player.x, m.y - this.player.y) < 9) this.endGame();
    }

    if (this.player.x > VX + VW - 16 && this.player.y > VY + VH - 16) {
      this.score = 1;
      this.over = true;
      this.overTimer = 2;
      audio.sfx('powerup');
    }
  }

  /** Maze walls as a fixed grid of blocks; cheap and readable at this size. */
  private manorWall(x: number, y: number): boolean {
    const gx = Math.floor((x - VX) / 20);
    const gy = Math.floor((y - VY) / 18);
    const maze = [
      '0000000000',
      '0110111010',
      '0100000010',
      '0101110110',
      '0100010000',
      '0111010110',
    ];
    const row = maze[gy];
    if (!row) return false;
    return row[gx] === '1';
  }

  // ONE MORE CREDIT: it records five seconds of you, then plays you back.
  private updateCredit(dt: number, input: Input): void {
    if (!this.playback) {
      if (input.isDown('ArrowLeft')) this.player.x -= 70 * dt;
      if (input.isDown('ArrowRight')) this.player.x += 70 * dt;
      if (input.isDown('ArrowUp')) this.player.y -= 70 * dt;
      if (input.isDown('ArrowDown')) this.player.y += 70 * dt;
      this.player.x = Math.max(VX + 4, Math.min(VX + VW - 4, this.player.x));
      this.player.y = Math.max(VY + 4, Math.min(VY + VH - 4, this.player.y));
      this.recording.push({ ...this.player });

      if (this.t > 5) {
        this.playback = true;
        this.playbackIndex = 0;
        audio.sfx('rewind');
      }
      return;
    }

    this.playbackIndex += Math.round(dt * 60);
    if (this.playbackIndex >= this.recording.length) {
      this.score = 1;
      this.over = true;
      this.overTimer = 3;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.id) return;

    // Cabinet bezel around the playfield.
    ctx.fillStyle = Colors.ink;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    rect(ctx, VX - 8, VY - 12, VW + 16, VH + 34, ramp('neutral', 1));
    outline(ctx, VX - 8, VY - 12, VW + 16, VH + 34, ramp('violet', 1));
    rect(ctx, VX, VY, VW, VH, Colors.ink);

    const title = { turbo: 'TURBO RACER', space: 'SPACE WARS', manor: 'MONSTER MANOR' }[this.id]
      ?? 'ONE MORE CREDIT';
    font.draw(ctx, title, GAME_WIDTH / 2, VY - 10, { color: ramp('amber', 3), align: 'center' });
    font.draw(ctx, `SCORE ${this.score}`, VX, VY + VH + 4, { color: ramp('cyan', 2) });
    font.draw(ctx, 'ESC TO QUIT', VX + VW, VY + VH + 4, { color: ramp('neutral', 3), align: 'right' });

    switch (this.id) {
      case 'turbo': this.drawTurbo(ctx); break;
      case 'space': this.drawSpace(ctx); break;
      case 'manor': this.drawManor(ctx); break;
      default: this.drawCredit(ctx); break;
    }

    if (this.over) {
      rect(ctx, VX + 30, VY + 44, VW - 60, 22, Colors.ink);
      outline(ctx, VX + 30, VY + 44, VW - 60, 22, ramp('red', 2));
      font.draw(ctx, this.score >= this.targetScore(this.id) ? 'WELL DONE' : 'GAME OVER',
        GAME_WIDTH / 2, VY + 51, { color: Colors.danger, align: 'center' });
    }
  }

  private drawTurbo(ctx: CanvasRenderingContext2D): void {
    // Scrolling road markings.
    for (let i = 0; i < 8; i++) {
      const y = VY + ((i * 18 + this.t * 90) % VH);
      rect(ctx, VX + VW / 2 - 1, y, 2, 8, ramp('neutral', 3));
    }
    rect(ctx, VX, VY, 4, VH, ramp('phosphor', 1));
    rect(ctx, VX + VW - 4, VY, 4, VH, ramp('phosphor', 1));
    for (const e of this.entities) drawSpriteCentred(ctx, CAR_ENEMY, e.x, e.y, 2);
    drawSpriteCentred(ctx, CAR_PLAYER, this.player.x, this.player.y, 2);
  }

  private drawSpace(ctx: CanvasRenderingContext2D): void {
    const r = rng(5);
    for (let i = 0; i < 40; i++) {
      rect(ctx, VX + Math.floor(r() * VW), VY + Math.floor(r() * VH), 1, 1, ramp('neutral', 3));
    }
    const RANKS = [INVADER_A, INVADER_B, INVADER_C];
    // Every invader swaps frame on the same step, so the whole formation
    // shuffles in time - the detail that makes a wall of sprites feel alive.
    const frame = this.marchStep % 2;
    for (const e of this.entities) {
      if (e.boom !== undefined) {
        const stage = Math.min(2, Math.floor((0.28 - e.boom) / 0.1));
        drawSpriteCentred(ctx, BOOM[stage], e.x, e.y, 1.5);
      } else if (e.rank !== undefined) {
        drawSpriteCentred(ctx, RANKS[e.rank][frame], e.x, e.y, 1.6);
      } else if (e.bomb) {
        rect(ctx, e.x, e.y, 2, 5, ramp('red', 3));
      } else {
        rect(ctx, e.x, e.y - 4, 2, 6, ramp('amber', 3));
      }
    }
    for (const b of this.bunkers) {
      ctx.globalAlpha = Math.max(0.25, (b.hp ?? 1) / 6);
      drawSpriteCentred(ctx, BUNKER, b.x, b.y, 2);
      ctx.globalAlpha = 1;
    }
    drawSpriteCentred(ctx, SHIP, this.player.x, this.player.y, 1.6);
  }

  private drawManor(ctx: CanvasRenderingContext2D): void {
    const maze = [
      '0000000000', '0110111010', '0100000010', '0101110110', '0100010000', '0111010110',
    ];
    maze.forEach((row, gy) => {
      [...row].forEach((cell, gx) => {
        if (cell === '1') rect(ctx, VX + gx * 20, VY + gy * 18, 20, 18, ramp('violet', 1));
      });
    });
    drawSpriteCentred(ctx, EXIT_DOOR, VX + VW - 12, VY + VH - 12, 2);
    for (const e of this.entities) {
      drawSpriteCentred(ctx, MONSTER[Math.floor(this.t * 4) % 2], e.x, e.y, 2);
    }
    drawSpriteCentred(ctx, EXPLORER, this.player.x, this.player.y, 2);
  }

  private drawCredit(ctx: CanvasRenderingContext2D): void {
    staticScreen(ctx, VX, VY, VW, VH, 4242);
    ctx.globalAlpha = 0.75;
    rect(ctx, VX, VY, VW, VH, Colors.ink);
    ctx.globalAlpha = 1;

    if (!this.playback) {
      font.draw(ctx, 'MOVE', GAME_WIDTH / 2, VY + 8, { color: ramp('phosphor', 2), align: 'center' });
      rect(ctx, this.player.x - 2, this.player.y - 2, 4, 4, ramp('phosphor', 3));
      // Faint trail of where you have already been.
      for (const p of this.recording) rect(ctx, p.x, p.y, 1, 1, ramp('phosphor', 0));
    } else {
      font.draw(ctx, 'NOW WATCH', GAME_WIDTH / 2, VY + 8, { color: ramp('magenta', 3), align: 'center' });
      const upTo = Math.min(this.playbackIndex, this.recording.length - 1);
      for (let i = 0; i <= upTo; i++) {
        const p = this.recording[i];
        rect(ctx, p.x, p.y, 1, 1, ramp('magenta', 1));
      }
      const head = this.recording[upTo];
      if (head) rect(ctx, head.x - 2, head.y - 2, 4, 4, ramp('magenta', 3));
      font.draw(ctx, 'THIS ALREADY HAPPENED', GAME_WIDTH / 2, VY + VH - 12, {
        color: ramp('neutral', 4), align: 'center',
      });
    }
  }
}
