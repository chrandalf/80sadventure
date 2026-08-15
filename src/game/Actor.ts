import { AnimationPlayer, type SpriteSheet } from '../engine/Sprite';
import type { DepthBand, Facing } from './types';

/** Point-in-polygon, even-odd rule. Polygons are flat [x,y,x,y,...] lists. */
export function pointInPoly(poly: number[], x: number, y: number): boolean {
  let inside = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const yi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const yj = poly[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isWalkable(
  boxes: number[][] | undefined,
  x: number,
  y: number,
  blockers?: number[][],
): boolean {
  if (blockers?.some((p) => pointInPoly(p, x, y))) return false;
  // A scene with no walkboxes is entirely walkable - handy while blocking out
  // a new room before its geometry is drawn.
  if (!boxes || boxes.length === 0) return true;
  return boxes.some((p) => pointInPoly(p, x, y));
}

/** Nearest walkable point, so a click on scenery still moves Jack sensibly. */
export function clampToWalkable(
  boxes: number[][] | undefined,
  x: number,
  y: number,
  blockers?: number[][],
): { x: number; y: number } {
  if (isWalkable(boxes, x, y, blockers)) return { x, y };
  if (!boxes || boxes.length === 0) return { x, y };

  let best = { x, y };
  let bestDist = Infinity;
  // Sample each polygon edge; the closest point on the boundary is a good
  // enough target and avoids a full nearest-point-on-segment solve per edge.
  for (const poly of boxes) {
    const n = poly.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = poly[i * 2];
      const ay = poly[i * 2 + 1];
      const bx = poly[j * 2];
      const by = poly[j * 2 + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy || 1;
      let t = ((x - ax) * dx + (y - ay) * dy) / lenSq;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + dx * t;
      const py = ay + dy * t;
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < bestDist) {
        bestDist = d;
        best = { x: px, y: py };
      }
    }
  }
  // Nudge a pixel inward so the result is inside rather than exactly on the edge.
  const inx = best.x + Math.sign(x - best.x) * -1;
  const iny = best.y + Math.sign(y - best.y) * -1;
  return isWalkable(boxes, inx, iny, blockers) ? { x: inx, y: iny } : best;
}

/** Perspective scale for a given floor y. */
export function depthScale(depth: DepthBand | undefined, y: number): number {
  if (!depth) return 1;
  const { yNear, yFar, scaleNear, scaleFar } = depth;
  if (yNear === yFar) return scaleNear;
  const t = (y - yFar) / (yNear - yFar);
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return scaleFar + (scaleNear - scaleFar) * clamped;
}

const BASE_SPEED = 124; // world px/sec at full scale (640x400 space)

/**
 * A character on screen. Jack is one of these; so is every NPC, which keeps
 * NPC animation and depth sorting on the same code path as the player.
 */
/**
 * World pixels per complete two-step cycle. Tied to distance rather than time
 * so the stride stays in step with the feet however fast the actor is moving.
 */
const STRIDE_LENGTH = 26;

export class Actor {
  readonly id: string;
  anim: AnimationPlayer;
  x: number;
  y: number;
  facing: Facing = 'south';
  visible = true;
  /** Overrides depth scaling when set, for actors at a fixed size. */
  fixedScale: number | null = null;
  /** Drawn after (in front of) everything else regardless of y. */
  foreground = false;

  private targetX: number | null = null;
  private targetY: number | null = null;
  /** Ground covered on foot, which drives the synthetic stride. */
  private strideDistance = 0;
  /** Remaining waypoints after the current target. */
  private path: [number, number][] = [];
  /** Animation to return to once the current one-shot finishes. */
  private restAnim = 'idle';

  constructor(id: string, sheet: SpriteSheet, x: number, y: number) {
    this.id = id;
    this.anim = new AnimationPlayer(sheet);
    this.x = x;
    this.y = y;
    this.playIdle();
  }

  get isWalking(): boolean {
    return this.targetX !== null;
  }

  setSheet(sheet: SpriteSheet): void {
    this.anim.setSheet(sheet);
  }

  walkTo(x: number, y: number): void {
    this.path.length = 0;
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Walk a route, rather than straight at a point.
   *
   * The last waypoint is the destination; the rest are corners to get round
   * whatever is in the way.
   */
  followPath(points: [number, number][]): void {
    if (!points.length) return;
    this.path = points.slice(1);
    const [x, y] = points[0];
    this.targetX = x;
    this.targetY = y;
  }

  stop(): void {
    this.targetX = null;
    this.targetY = null;
    this.playIdle();
  }

  place(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = null;
    this.targetY = null;
  }

  face(dir: Facing): void {
    this.facing = dir;
    if (!this.isWalking) this.playIdle();
  }

  /**
   * Play a named state. Falls back down a chain - `talk.east` to `talk` to
   * `idle` - so a sprite sheet with only one animation still works and content
   * can ask for emotions before the art supports them.
   */
  play(state: string): void {
    this.restAnim = state;
    this.playDirectional(state);
  }

  private playIdle(): void {
    this.playDirectional(this.restAnim);
  }

  private playDirectional(state: string): void {
    const sheet = this.anim.sheet;
    // West reuses the east row mirrored, so sheets need three rows, not four.
    const dir = this.facing === 'west' ? 'east' : this.facing;
    for (const candidate of [`${state}.${this.facing}`, `${state}.${dir}`, state, 'idle']) {
      if (sheet.hasAnimation(candidate)) {
        this.anim.play(candidate);
        return;
      }
    }
    this.anim.play('idle');
  }

  /** True when Jack should be drawn mirrored (west-facing on an east sheet). */
  get flipped(): boolean {
    return this.facing === 'west' && !this.anim.sheet.hasAnimation(`${this.restAnim}.west`);
  }

  update(
    dt: number,
    boxes: number[][] | undefined,
    depth: DepthBand | undefined,
    blockers?: number[][],
  ): void {
    if (this.targetX !== null && this.targetY !== null) {
      const scale = this.fixedScale ?? depthScale(depth, this.y);
      const speed = BASE_SPEED * scale;
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 1.5) {
        this.x = this.targetX;
        this.y = this.targetY;
        const next = this.path.shift();
        if (next) {
          [this.targetX, this.targetY] = next;
        } else {
          this.targetX = null;
          this.targetY = null;
          this.playIdle();
        }
      } else {
        const stepLen = Math.min(dist, speed * dt);
        const nx = this.x + (dx / dist) * stepLen;
        const ny = this.y + (dy / dist) * stepLen;

        // Direct step, else slide along whichever axis is still walkable. This
        // gets Jack around furniture without a full pathfinder, and a scene
        // whose walkbox has a genuine dead end simply stops him at the wall.
        if (isWalkable(boxes, nx, ny, blockers)) {
          this.strideDistance += Math.hypot(nx - this.x, ny - this.y);
          this.x = nx;
          this.y = ny;
        } else if (isWalkable(boxes, nx, this.y, blockers)) {
          this.strideDistance += Math.abs(nx - this.x);
          this.x = nx;
        } else if (isWalkable(boxes, this.x, ny, blockers)) {
          this.strideDistance += Math.abs(ny - this.y);
          this.y = ny;
        } else {
          // Wedged. With a real route this should not happen, but if the
          // geometry has changed under us, take the next corner rather than
          // stopping dead where the player cannot see why.
          const next = this.path.shift();
          if (next) {
            [this.targetX, this.targetY] = next;
          } else {
            this.targetX = null;
            this.targetY = null;
            this.playIdle();
          }
        }

        // Face the dominant axis of travel. The vertical bias is deliberate:
        // side views read better, so only a clearly vertical walk turns Jack
        // away from the camera.
        if (this.targetX !== null) {
          if (Math.abs(dx) > Math.abs(dy) * 0.7) this.facing = dx < 0 ? 'west' : 'east';
          else this.facing = dy < 0 ? 'north' : 'south';
          this.playDirectional('walk');
        }
      }
    }

    this.anim.update(dt);
  }

  /** How far through one two-step cycle, 0..1. */
  get stridePhase(): number {
    return (this.strideDistance / STRIDE_LENGTH) % 1;
  }

  draw(ctx: CanvasRenderingContext2D, depth: DepthBand | undefined): void {
    if (!this.visible) return;
    const scale = this.fixedScale ?? depthScale(depth, this.y);

    // Generated character art is one standing pose repeated across the sheet,
    // so playing the walk animation moves nothing. Fake the stride instead.
    if (this.isWalking && this.anim.sheet.isStill) {
      this.anim.sheet.drawFrameWalking(
        ctx, this.anim.frame, this.x, this.y,
        this.anim.flippedWith(this.flipped), scale, this.stridePhase,
      );
      return;
    }
    this.anim.draw(ctx, this.x, this.y, this.flipped, scale);
  }
}
