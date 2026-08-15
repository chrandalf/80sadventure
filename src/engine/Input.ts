import { GAME_HEIGHT, GAME_WIDTH, type Screen } from './Screen';

export type MouseButton = 'left' | 'right';

export interface ClickEvent {
  x: number;
  y: number;
  button: MouseButton;
}

/**
 * Mouse, touch and keyboard, all normalised into game-space pixels.
 *
 * Per spec s.24: left click interacts, right click examines, arrow keys drive a
 * virtual cursor for keyboard-only play, Enter selects, Escape opens inventory,
 * Space skips the typewriter effect, F5/F9 save and load.
 */
export class Input {
  /** Cursor position in game pixels. Driven by mouse or by arrow keys. */
  x = GAME_WIDTH / 2;
  y = GAME_HEIGHT / 2;

  /** True once the player has actually moved the physical mouse. Until then we
   *  keep the software cursor visible for keyboard players. */
  usingMouse = false;

  private clicks: ClickEvent[] = [];
  private keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  private keyRepeat = new Map<string, number>();

  private readonly screen: Screen;

  constructor(screen: Screen, target: HTMLElement = screen.output) {
    this.screen = screen;

    target.addEventListener('contextmenu', (e) => e.preventDefault());

    target.addEventListener('mousemove', (e) => {
      const p = this.screen.toGameCoords(e.clientX, e.clientY);
      this.x = clamp(p.x, 0, GAME_WIDTH - 1);
      this.y = clamp(p.y, 0, GAME_HEIGHT - 1);
      this.usingMouse = true;
    });

    target.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const p = this.screen.toGameCoords(e.clientX, e.clientY);
      this.x = clamp(p.x, 0, GAME_WIDTH - 1);
      this.y = clamp(p.y, 0, GAME_HEIGHT - 1);
      this.usingMouse = true;
      this.clicks.push({ x: this.x, y: this.y, button: e.button === 2 ? 'right' : 'left' });
    });

    // Touch: a tap is a left click. Long-press would be the natural "examine"
    // but it fights the browser's own gesture handling, so instead the verb bar
    // stays the way touch players choose a verb.
    target.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        if (!t) return;
        const p = this.screen.toGameCoords(t.clientX, t.clientY);
        this.x = clamp(p.x, 0, GAME_WIDTH - 1);
        this.y = clamp(p.y, 0, GAME_HEIGHT - 1);
        this.clicks.push({ x: this.x, y: this.y, button: 'left' });
      },
      { passive: false },
    );

    window.addEventListener('keydown', (e) => {
      // Let the browser keep refresh and devtools; claim everything else the
      // game binds so the page never scrolls under the canvas.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F5', 'F9'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keysDown.has(e.code)) this.keysPressed.add(e.code);
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      this.keyRepeat.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.keyRepeat.clear();
    });
  }

  /** Move the virtual cursor with the arrow keys, for keyboard-only play. */
  update(dt: number): void {
    const speed = this.isDown('ShiftLeft') || this.isDown('ShiftRight') ? 220 : 90;
    let dx = 0;
    let dy = 0;
    if (this.isDown('ArrowLeft')) dx -= 1;
    if (this.isDown('ArrowRight')) dx += 1;
    if (this.isDown('ArrowUp')) dy -= 1;
    if (this.isDown('ArrowDown')) dy += 1;
    if (dx || dy) {
      this.x = clamp(this.x + dx * speed * dt, 0, GAME_WIDTH - 1);
      this.y = clamp(this.y + dy * speed * dt, 0, GAME_HEIGHT - 1);
      this.usingMouse = false;
    }
    if (this.wasPressed('Enter') || this.wasPressed('NumpadEnter')) {
      this.clicks.push({ x: Math.round(this.x), y: Math.round(this.y), button: 'left' });
    }
  }

  /** Drain the click queue. Call once per frame, after update. */
  takeClicks(): ClickEvent[] {
    const out = this.clicks;
    this.clicks = [];
    return out;
  }

  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  wasPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  /** True on first press and then at a repeating interval while held. */
  isRepeating(code: string, dt: number, interval = 0.14, delay = 0.35): boolean {
    if (!this.keysDown.has(code)) return false;
    if (this.keysPressed.has(code)) {
      this.keyRepeat.set(code, -delay);
      return true;
    }
    const t = (this.keyRepeat.get(code) ?? 0) + dt;
    if (t >= interval) {
      this.keyRepeat.set(code, t - interval);
      return true;
    }
    this.keyRepeat.set(code, t);
    return false;
  }

  /** Clear one-frame state. Call at the very end of the frame. */
  endFrame(): void {
    this.keysPressed.clear();
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
