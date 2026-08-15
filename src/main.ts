import { audio } from './engine/Audio';
import { font } from './engine/BitmapFont';
import { Input } from './engine/Input';
import { AssetStore } from './engine/Loader';
import { Colors, ramp } from './engine/Palette';
import { GAME_HEIGHT, GAME_WIDTH, Screen } from './engine/Screen';
import { validateContent, validateGeometry } from './content/validate';
import { Shell } from './game/Shell';

/**
 * Entry point: build the screen, load the sprite manifest, then run a fixed
 * update loop.
 *
 * The loop clamps dt so that tabbing away and coming back does not teleport
 * Jack across the room or fast-forward the evening.
 */
async function main(): Promise<void> {
  const mount = document.getElementById('app');
  if (!mount) throw new Error('#app not found');

  const screen = new Screen(mount);
  const input = new Input(screen);
  const assets = new AssetStore('assets/characters/');
  const objectAssets = new AssetStore('assets/objects/');

  // Audio cannot start until the player interacts; hook the first of anything.
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  let progress = 0;
  let total = 1;
  let ready = false;

  const drawLoading = () => {
    const c = screen.ctx;
    screen.clear();
    font.draw(c, 'STARLIGHT SOFTWARE', GAME_WIDTH / 2, 78, {
      color: ramp('magenta', 2), align: 'center',
    });
    font.draw(c, 'LOADING', GAME_WIDTH / 2, 96, { color: Colors.paper, align: 'center' });
    const w = 160;
    const x = (GAME_WIDTH - w) / 2;
    c.fillStyle = ramp('neutral', 2);
    c.fillRect(x, 110, w, 5);
    c.fillStyle = ramp('cyan', 2);
    c.fillRect(x, 110, Math.round((w * progress) / Math.max(1, total)), 5);
    screen.present();
  };
  drawLoading();

  try {
    await Promise.all([assets.loadManifest(), objectAssets.loadManifest()]);
    total = assets.spriteIds.length + objectAssets.spriteIds.length;
    let done = 0;
    const step = () => {
      progress = ++done;
      drawLoading();
    };
    await Promise.all([assets.loadAll(step), objectAssets.loadAll(step)]);
  } catch (err) {
    console.error('[boot] asset load failed', err);
    const c = screen.ctx;
    screen.clear();
    font.drawWrapped(c, `ASSET LOAD FAILED: ${String(err)}`, 20, 80, GAME_WIDTH - 40, {
      color: Colors.danger,
    });
    screen.present();
    return;
  }

  // Content sanity check - a dangling reference is a soft-lock, not a crash,
  // so it has to be found here rather than by playing for forty minutes.
  const problems = [
    ...validateContent(new Set([...assets.spriteIds, ...objectAssets.spriteIds])),
    ...validateGeometry(),
  ];
  if (problems.length) {
    console.warn(`[content] ${problems.length} problem(s):\n  ` + problems.join('\n  '));
  } else {
    console.info('[content] all references check out');
  }
  (window as unknown as Record<string, unknown>).__contentProblems = problems;

  const shell = new Shell(assets, objectAssets);
  ready = true;

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (ready) {
      input.update(dt);
      screen.update(dt);
      shell.update(dt, input);

      screen.clear();
      shell.draw(screen.ctx, input);
      screen.present();

      input.endFrame();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Expose a little for debugging without opening the bundle.
  Object.assign(window as unknown as Record<string, unknown>, {
    __omc: {
      screen, assets, objectAssets, shell,
      missingArt: () => [...assets.missingArt, ...objectAssets.missingArt],
    },
  });

  void GAME_HEIGHT;
}

void main();
