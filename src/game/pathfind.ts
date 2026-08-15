import { isWalkable } from './Actor';

/**
 * Walking round things.
 *
 * Movement used to be a straight line at the target, with a slide along one
 * axis if that was blocked and a dead stop if both were. Any obstacle between
 * the character and where he was told to go - a desk, a counter, the coin
 * pusher - therefore stopped him where he stood, with nothing on screen to
 * explain why. Clicking USE on something across the room simply did nothing.
 *
 * So the walkable area is turned into a coarse grid once per room and searched
 * properly. The grid is deliberately rough: at this size a character occupies
 * several cells, and a finer grid would find paths through gaps too narrow to
 * walk down.
 */

/** World pixels per cell. */
const CELL = 8;

export interface NavGrid {
  cols: number;
  rows: number;
  /** 1 = standable. */
  open: Uint8Array;
}

export function buildNavGrid(
  width: number,
  height: number,
  boxes: number[][] | undefined,
  blockers: number[][] | undefined,
): NavGrid {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const open = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      open[r * cols + c] = isWalkable(boxes, x, y, blockers) ? 1 : 0;
    }
  }
  return { cols, rows, open };
}

const cellOf = (v: number) => Math.floor(v / CELL);
const centre = (c: number) => c * CELL + CELL / 2;

function isOpen(g: NavGrid, c: number, r: number): boolean {
  return c >= 0 && r >= 0 && c < g.cols && r < g.rows && g.open[r * g.cols + c] === 1;
}

/** Nearest standable cell to one that is not, searched outwards. */
function nearestOpen(g: NavGrid, c0: number, r0: number): [number, number] | null {
  if (isOpen(g, c0, r0)) return [c0, r0];
  for (let radius = 1; radius < Math.max(g.cols, g.rows); radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== radius) continue;
        if (isOpen(g, c0 + dc, r0 + dr)) return [c0 + dc, r0 + dr];
      }
    }
  }
  return null;
}

/** True when a straight walk between two points never leaves the open cells. */
function clearLine(g: NavGrid, ax: number, ay: number, bx: number, by: number): boolean {
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / (CELL / 2));
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    if (!isOpen(g, cellOf(ax + (bx - ax) * t), cellOf(ay + (by - ay) * t))) return false;
  }
  return true;
}

/**
 * A route from one point to another, as world-space waypoints.
 *
 * Returns the straight line when there is one, so ordinary walking across an
 * empty room costs nothing. An unreachable target walks to the closest place
 * that can be stood in instead of refusing to move - being left in the wrong
 * place is recoverable, being ignored is not.
 */
export function findPath(
  g: NavGrid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): [number, number][] {
  if (clearLine(g, fromX, fromY, toX, toY)) return [[toX, toY]];

  const start = nearestOpen(g, cellOf(fromX), cellOf(fromY));
  const goal = nearestOpen(g, cellOf(toX), cellOf(toY));
  if (!start || !goal) return [[toX, toY]];

  const size = g.cols * g.rows;
  const idx = (c: number, r: number) => r * g.cols + c;
  const gScore = new Float32Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const startI = idx(start[0], start[1]);
  const goalI = idx(goal[0], goal[1]);
  gScore[startI] = 0;

  // A binary heap is overkill for a grid this small; a sorted-insert frontier
  // of a few hundred cells is simpler and fast enough at 8px resolution.
  const frontier: { i: number; f: number }[] = [{ i: startI, f: 0 }];
  const done = new Uint8Array(size);
  const h = (i: number) =>
    Math.hypot((i % g.cols) - goal[0], Math.floor(i / g.cols) - goal[1]);

  while (frontier.length) {
    frontier.sort((a, b) => a.f - b.f);
    const { i: cur } = frontier.shift()!;
    if (cur === goalI) break;
    if (done[cur]) continue;
    done[cur] = 1;

    const cc = cur % g.cols;
    const cr = Math.floor(cur / g.cols);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        const nc = cc + dc;
        const nr = cr + dr;
        if (!isOpen(g, nc, nr)) continue;
        // No cutting a diagonal past a corner both of whose sides are blocked.
        if (dc && dr && !(isOpen(g, cc + dc, cr) && isOpen(g, cc, cr + dr))) continue;
        const ni = idx(nc, nr);
        const step = dc && dr ? Math.SQRT2 : 1;
        const tentative = gScore[cur] + step;
        if (tentative >= gScore[ni]) continue;
        gScore[ni] = tentative;
        came[ni] = cur;
        frontier.push({ i: ni, f: tentative + h(ni) });
      }
    }
  }

  if (came[goalI] === -1 && goalI !== startI) return [[toX, toY]];

  const cells: number[] = [];
  for (let i = goalI; i !== -1 && i !== startI; i = came[i]) cells.push(i);
  cells.reverse();

  const points: [number, number][] = cells.map((i) => [
    centre(i % g.cols),
    centre(Math.floor(i / g.cols)),
  ]);
  points.push([toX, toY]);

  return smooth(g, fromX, fromY, points);
}

/**
 * Drop waypoints that can be skipped without leaving the open cells.
 *
 * Straight off the grid a route is a staircase of eight-pixel steps, which
 * reads as a character shuffling diagonally rather than walking.
 */
function smooth(
  g: NavGrid,
  fromX: number,
  fromY: number,
  points: [number, number][],
): [number, number][] {
  const out: [number, number][] = [];
  let ax = fromX;
  let ay = fromY;
  let i = 0;
  while (i < points.length) {
    let furthest = i;
    for (let j = points.length - 1; j > i; j--) {
      if (clearLine(g, ax, ay, points[j][0], points[j][1])) { furthest = j; break; }
    }
    out.push(points[furthest]);
    [ax, ay] = points[furthest];
    i = furthest + 1;
  }
  return out;
}
