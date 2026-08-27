/**
 * Procedural materials for the 3D prototype.
 *
 * Boxes with flat colours look like boxes. Grain, weave and a bit of dirt are
 * most of what separates "a room" from "some geometry", and generating them in
 * a canvas costs nothing to ship and nothing to download - which matters when
 * the whole point of the experiment is whether 3D can look as good as a
 * painting without the painting.
 */
import * as THREE from 'three';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return [cv, cv.getContext('2d')!];
}

function finish(cv: HTMLCanvasElement, repeat: [number, number]): THREE.Texture {
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Floorboards: long planks, each one a slightly different shade. */
export function woodFloor(repeat: [number, number] = [4, 4]): THREE.Texture {
  const [cv, g] = canvas(512, 512);
  const planks = 8;
  const ph = 512 / planks;
  for (let i = 0; i < planks; i++) {
    const shade = 44 + Math.random() * 26;
    g.fillStyle = `rgb(${shade + 22}, ${shade * 0.66}, ${shade * 0.38})`;
    g.fillRect(0, i * ph, 512, ph);
    // Grain: long thin strokes along the plank.
    for (let s = 0; s < 90; s++) {
      const y = i * ph + Math.random() * ph;
      g.strokeStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.06})`;
      g.lineWidth = 0.6 + Math.random();
      g.beginPath();
      const x0 = Math.random() * 512;
      g.moveTo(x0, y);
      g.bezierCurveTo(x0 + 60, y + 1.5, x0 + 130, y - 1.5, x0 + 210, y);
      g.stroke();
    }
    // The dark line between boards is what reads as "planks" at any distance.
    g.fillStyle = 'rgba(0,0,0,0.42)';
    g.fillRect(0, i * ph, 512, 1.5);
  }
  return finish(cv, repeat);
}

/** Desk and door timber: darker, tighter grain, a little polish. */
export function darkWood(repeat: [number, number] = [1, 1]): THREE.Texture {
  const [cv, g] = canvas(256, 256);
  g.fillStyle = 'rgb(74,44,24)';
  g.fillRect(0, 0, 256, 256);
  for (let s = 0; s < 260; s++) {
    const y = Math.random() * 256;
    g.strokeStyle = `rgba(${20 + Math.random() * 40},${10 + Math.random() * 20},0,${0.05 + Math.random() * 0.12})`;
    g.lineWidth = 0.5 + Math.random() * 1.6;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(70, y + 3, 170, y - 3, 256, y);
    g.stroke();
  }
  return finish(cv, repeat);
}

/** Period wallpaper: a warm ground with a faint repeating motif. */
export function wallpaper(repeat: [number, number] = [3, 2]): THREE.Texture {
  const [cv, g] = canvas(256, 256);
  g.fillStyle = 'rgb(96,80,58)';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(140,116,80,0.30)';
  g.lineWidth = 1.2;
  for (let y = 16; y < 256; y += 32) {
    for (let x = 16; x < 256; x += 32) {
      g.beginPath();
      g.ellipse(x, y, 7, 11, Math.PI / 4, 0, Math.PI * 2);
      g.stroke();
    }
  }
  // Age it, so the flat fill does not read as plastic.
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  return finish(cv, repeat);
}

/** The checkerboard corridor beyond the door. */
export function checkerFloor(repeat: [number, number] = [6, 6]): THREE.Texture {
  const [cv, g] = canvas(128, 128);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? 'rgb(150,150,146)' : 'rgb(46,50,54)';
      g.fillRect(x * 32, y * 32, 32, 32);
    }
  }
  return finish(cv, repeat);
}

/** Rain on glass, for the window: streaks with the town behind them. */
export function nightWindow(): THREE.Texture {
  const [cv, g] = canvas(256, 256);
  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, 'rgb(14,20,44)');
  sky.addColorStop(0.62, 'rgb(24,34,66)');
  sky.addColorStop(1, 'rgb(10,14,30)');
  g.fillStyle = sky;
  g.fillRect(0, 0, 256, 256);
  // Distant promenade lights.
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = 150 + Math.random() * 40;
    g.fillStyle = `rgba(255,${180 + Math.random() * 60},120,${0.4 + Math.random() * 0.5})`;
    g.fillRect(x, y, 1.6, 1.6);
  }
  // Rain.
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    g.strokeStyle = `rgba(190,215,255,${0.06 + Math.random() * 0.14})`;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 2, y + 9 + Math.random() * 8);
    g.stroke();
  }
  return finish(cv, [1, 1]);
}
