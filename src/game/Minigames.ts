import { audio } from '../engine/Audio';
import { font } from '../engine/BitmapFont';
import type { Input } from '../engine/Input';
import { Colors, ramp } from '../engine/Palette';
import { GAME_HEIGHT, GAME_WIDTH } from '../engine/Screen';
import { outline, rect, rng, staticScreen } from './paint';
import type { Action } from './types';

/** The playfield sits inside a drawn cabinet bezel. */
const VX = 60;
const VY = 22;
const VW = 200;
const VH = 108;

interface Entity {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  alive: boolean;
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

  // SPACE WARS: shoot the asteroids.
  private updateSpace(dt: number, input: Input): void {
    this.steer(dt, input, 120);

    if (input.wasPressed('Space')) {
      this.entities.push({ x: this.player.x, y: this.player.y - 6, vy: -150, alive: true });
      audio.sfx('button');
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 0.8;
      this.entities.push({
        x: VX + 10 + this.rand() * (VW - 20),
        y: VY - 6,
        vy: 26 + this.rand() * 16,
        vx: (this.rand() - 0.5) * 20,
        alive: true,
      });
    }

    const bullets = this.entities.filter((e) => (e.vy ?? 0) < 0);
    const rocks = this.entities.filter((e) => (e.vy ?? 0) > 0);
    for (const e of this.entities) {
      e.x += (e.vx ?? 0) * dt;
      e.y += (e.vy ?? 0) * dt;
      if (e.y < VY - 10 || e.y > VY + VH) e.alive = false;
    }
    for (const b of bullets) {
      for (const r of rocks) {
        if (b.alive && r.alive && Math.hypot(b.x - r.x, b.y - r.y) < 7) {
          b.alive = false;
          r.alive = false;
          this.score++;
          audio.sfx('zap');
        }
      }
    }
    for (const r of rocks) {
      if (r.alive && Math.hypot(r.x - this.player.x, r.y - this.player.y) < 8) this.endGame();
    }
    this.entities = this.entities.filter((e) => e.alive);
  }

  // MONSTER MANOR: reach the far corner of a tiny maze.
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
    for (const e of this.entities) rect(ctx, e.x - 6, e.y - 8, 12, 16, ramp('red', 1));
    rect(ctx, this.player.x - 6, this.player.y - 8, 12, 16, ramp('cyan', 2));
    rect(ctx, this.player.x - 4, this.player.y - 5, 8, 4, ramp('cyan', 3));
  }

  private drawSpace(ctx: CanvasRenderingContext2D): void {
    const r = rng(5);
    for (let i = 0; i < 40; i++) {
      rect(ctx, VX + Math.floor(r() * VW), VY + Math.floor(r() * VH), 1, 1, ramp('neutral', 3));
    }
    for (const e of this.entities) {
      if ((e.vy ?? 0) < 0) rect(ctx, e.x, e.y, 1, 4, ramp('amber', 3));
      else rect(ctx, e.x - 4, e.y - 4, 8, 8, ramp('neutral', 4));
    }
    // Ship.
    rect(ctx, this.player.x - 1, this.player.y - 6, 3, 6, ramp('cyan', 3));
    rect(ctx, this.player.x - 5, this.player.y, 11, 4, ramp('cyan', 2));
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
    rect(ctx, VX + VW - 16, VY + VH - 16, 14, 14, ramp('phosphor', 2));
    rect(ctx, this.player.x - 3, this.player.y - 3, 6, 6, ramp('amber', 3));
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
