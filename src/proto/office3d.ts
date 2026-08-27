/**
 * Arthur's office, in three dimensions.
 *
 * A prototype, deliberately standalone: it shares no code with the game and
 * changes nothing in it. The question it exists to answer is whether a room
 * built from geometry can look as good as the painted plate while solving the
 * thing the plate cannot - depth. There are no occluder polygons here and
 * never will be. The desk hides Jack because it is in front of him.
 *
 * Two decisions carry the look:
 *
 * 1. It renders at the game's own 640x400 and is upscaled with no smoothing,
 *    so it keeps the chunky pixel grain rather than looking like a modern
 *    phone game. Bloom and vignette are applied before that reduction, which
 *    is what stops the lamps looking like flat discs.
 * 2. Everything is lit by practical lights that exist in the room - a desk
 *    lamp, a wall sconce, the corridor beyond the door, the streetlight
 *    through the rain. Nothing is lit by a generic key light, because that is
 *    what makes 3D rooms look like showrooms.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { checkerFloor, darkWood, nightWindow, wallpaper, woodFloor } from './textures';
import { createJack } from './actor3d';

const W = 640;
const H = 400;

/** Room dimensions in metres, so the numbers mean something. */
const ROOM = { w: 7.2, d: 5.4, h: 3.0 };

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
const view = document.getElementById('view') as HTMLDivElement;
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);
// Fog does most of the work of making a small room feel like it has air in it.
scene.fog = new THREE.Fog(0x131a2c, 9, 26);

/*
 * A long lens from across the room, which is what the painted plates imply:
 * an observer standing in the doorway rather than a camera on the floor.
 */
const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 60);
camera.position.set(0.0, 2.35, 6.9);
camera.lookAt(0, 1.15, -1.15);

// ------------------------------------------------------------------- shell

const floorTex = woodFloor([3, 2.4]);
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM.w, ROOM.d),
  new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.55, metalness: 0.05 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ map: wallpaper([2.4, 1.2]), roughness: 0.95 });
const back = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.w, ROOM.h), wallMat);
back.position.set(0, ROOM.h / 2, -ROOM.d / 2);
back.receiveShadow = true;
scene.add(back);

const left = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.d, ROOM.h), wallMat);
left.rotation.y = Math.PI / 2;
left.position.set(-ROOM.w / 2, ROOM.h / 2, 0);
left.receiveShadow = true;
scene.add(left);

const right = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.d, ROOM.h), wallMat);
right.rotation.y = -Math.PI / 2;
right.position.set(ROOM.w / 2, ROOM.h / 2, 0);
right.receiveShadow = true;
scene.add(right);

const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(ROOM.w, ROOM.d),
  new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 1 }),
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = ROOM.h;
scene.add(ceiling);

/** Dado rail and skirting: two thin strips that instantly date a room. */
const trimMat = new THREE.MeshStandardMaterial({ map: darkWood([6, 1]), roughness: 0.6 });
for (const [y, h] of [[0.09, 0.18], [1.02, 0.09]] as const) {
  const strip = new THREE.Mesh(new THREE.BoxGeometry(ROOM.w, h, 0.05), trimMat);
  strip.position.set(0, y, -ROOM.d / 2 + 0.03);
  scene.add(strip);
}

// -------------------------------------------------------------------- desk

const deskWood = new THREE.MeshStandardMaterial({ map: darkWood([2, 1]), roughness: 0.32, metalness: 0.04 });
const desk = new THREE.Group();
const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.09, 1.35), deskWood);
deskTop.position.y = 0.76;
const pedestal = (x: number) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.72, 1.2), deskWood);
  m.position.set(x, 0.36, 0);
  return m;
};
for (const part of [deskTop, pedestal(-0.95), pedestal(0.95)]) {
  part.castShadow = true;
  part.receiveShadow = true;
  desk.add(part);
}
desk.position.set(0.55, 0, -0.75);
scene.add(desk);

/** The lamp: the room's main source, and the reason bloom is here at all. */
const lampGroup = new THREE.Group();
const brass = new THREE.MeshStandardMaterial({ color: 0x8a6a2e, roughness: 0.35, metalness: 0.85 });
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.04, 16), brass);
const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 10), brass);
lampStem.position.y = 0.22;
const shade = new THREE.Mesh(
  new THREE.CylinderGeometry(0.1, 0.21, 0.2, 20, 1, true),
  new THREE.MeshStandardMaterial({ color: 0x1f6b4a, roughness: 0.5, side: THREE.DoubleSide }),
);
shade.position.y = 0.5;
shade.rotation.z = 0.24;
// The glowing element inside, which the bloom pass picks up.
const bulb = new THREE.Mesh(
  new THREE.SphereGeometry(0.055, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
);
bulb.position.set(0.02, 0.44, 0);
lampGroup.add(lampBase, lampStem, shade, bulb);
lampGroup.position.set(1.45, 0.8, -0.75);
scene.add(lampGroup);

const lampLight = new THREE.PointLight(0xffb765, 26, 13, 1.7);
lampLight.position.set(1.45, 1.22, -0.6);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(1024, 1024);
lampLight.shadow.bias = -0.0025;
scene.add(lampLight);

// Desk clutter, because an empty desk reads as a table.
const paper = new THREE.Mesh(
  new THREE.BoxGeometry(0.46, 0.012, 0.34),
  new THREE.MeshStandardMaterial({ color: 0xd8cfae, roughness: 0.95 }),
);
paper.position.set(0.55, 0.81, -0.72);
paper.rotation.y = 0.14;
paper.castShadow = true;
scene.add(paper);

const phone = new THREE.Group();
const phoneBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.32, 0.1, 0.24),
  new THREE.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.55 }),
);
const handset = new THREE.Mesh(
  new THREE.BoxGeometry(0.34, 0.08, 0.09),
  new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.5 }),
);
handset.position.y = 0.09;
phone.add(phoneBody, handset);
phone.position.set(-0.55, 0.86, -0.7);
phone.children.forEach((c) => { (c as THREE.Mesh).castShadow = true; });
scene.add(phone);

// ------------------------------------------------------ door and corridor

const doorway = new THREE.Group();
const jamb = new THREE.MeshStandardMaterial({ map: darkWood([1, 2]), roughness: 0.6 });
const doorH = 2.15;
const doorW = 1.0;
for (const x of [-doorW / 2 - 0.06, doorW / 2 + 0.06]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, doorH, 0.16), jamb);
  post.position.set(x, doorH / 2, 0);
  doorway.add(post);
}
const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.24, 0.14, 0.16), jamb);
lintel.position.y = doorH + 0.07;
doorway.add(lintel);

// The corridor: a shallow box behind the wall with its own light in it, so
// the doorway reads as somewhere rather than as a hole.
const corridor = new THREE.Mesh(
  new THREE.BoxGeometry(2.4, 2.6, 2.4),
  new THREE.MeshStandardMaterial({ color: 0x7d8a86, roughness: 0.9, side: THREE.BackSide }),
);
corridor.position.set(0, 1.3, -1.4);
doorway.add(corridor);
const corridorFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(2.4, 2.4),
  new THREE.MeshStandardMaterial({ map: checkerFloor([3, 3]), roughness: 0.5 }),
);
corridorFloor.rotation.x = -Math.PI / 2;
corridorFloor.position.set(0, 0.01, -1.4);
doorway.add(corridorFloor);
const corridorLight = new THREE.PointLight(0xbfe6f2, 16, 9, 1.6);
corridorLight.position.set(0, 1.9, -1.5);
doorway.add(corridorLight);

// The door itself, standing open into the room.
const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), jamb);
doorPanel.position.set(doorW / 2 - 0.02, doorH / 2, 0.35);
doorPanel.rotation.y = -1.15;
doorPanel.castShadow = true;
doorway.add(doorPanel);

doorway.position.set(-1.85, 0, -ROOM.d / 2 + 0.02);
scene.add(doorway);

// ------------------------------------------------------------ window wall

const windowGroup = new THREE.Group();
const glass = new THREE.Mesh(
  new THREE.PlaneGeometry(2.0, 1.25),
  new THREE.MeshBasicMaterial({ map: nightWindow() }),
);
windowGroup.add(glass);
const windowFrame = new THREE.MeshStandardMaterial({ map: darkWood([1, 1]), roughness: 0.7 });
for (const [w, h, x, y] of [[2.16, 0.09, 0, 0.67], [2.16, 0.09, 0, -0.67],
  [0.09, 1.34, -1.04, 0], [0.09, 1.34, 1.04, 0], [0.05, 1.25, 0, 0]] as const) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), windowFrame);
  bar.position.set(x, y, 0.02);
  windowGroup.add(bar);
}
windowGroup.position.set(1.1, 1.72, -ROOM.d / 2 + 0.04);
scene.add(windowGroup);

// Cold light spilling in, opposite the lamp's warmth. The contrast between
// the two is most of the mood.
const streetLight = new THREE.SpotLight(0x7fa4e0, 30, 16, 0.8, 0.55, 1.6);
streetLight.position.set(1.6, 2.9, -3.2);
streetLight.target.position.set(0.2, 0, 1.4);
streetLight.castShadow = true;
streetLight.shadow.mapSize.set(1024, 1024);
streetLight.shadow.bias = -0.003;
scene.add(streetLight, streetLight.target);

// ------------------------------------------------------------- furniture

const cabinet = new THREE.Group();
const steel = new THREE.MeshStandardMaterial({ color: 0x5a6468, roughness: 0.42, metalness: 0.6 });
const cabBody = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.62, 0.7), steel);
cabBody.position.y = 0.81;
cabBody.castShadow = true;
cabBody.receiveShadow = true;
cabinet.add(cabBody);
for (let i = 0; i < 4; i++) {
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.03), steel);
  drawer.position.set(0, 0.28 + i * 0.39, 0.36);
  cabinet.add(drawer);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.04), brass);
  handle.position.set(0, 0.28 + i * 0.39, 0.39);
  cabinet.add(handle);
}
cabinet.position.set(-3.05, 0, -1.9);
scene.add(cabinet);

/** The safe, which the plot turns on. */
const safe = new THREE.Group();
const safeBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.86, 0.86, 0.72),
  new THREE.MeshStandardMaterial({ color: 0x3d4448, roughness: 0.5, metalness: 0.55 }),
);
safeBody.castShadow = true;
safeBody.receiveShadow = true;
safe.add(safeBody);
const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20), brass);
dial.rotation.x = Math.PI / 2;
dial.position.z = 0.38;
safe.add(dial);
safe.position.set(2.85, 0.43, -1.7);
scene.add(safe);

/** Wall sconce on the right, and a radiator on the left. */
const sconceGlow = new THREE.Mesh(
  new THREE.SphereGeometry(0.06, 12, 12),
  new THREE.MeshBasicMaterial({ color: 0xffcf95 }),
);
sconceGlow.position.set(ROOM.w / 2 - 0.14, 2.15, -1.1);
scene.add(sconceGlow);
const sconce = new THREE.PointLight(0xffc47a, 15, 9, 1.7);
sconce.position.copy(sconceGlow.position);
scene.add(sconce);

const radiator = new THREE.Group();
for (let i = 0; i < 11; i++) {
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.62, 0.13), steel);
  fin.position.x = i * 0.07;
  fin.castShadow = true;
  radiator.add(fin);
}
radiator.position.set(-1.1, 0.34, -ROOM.d / 2 + 0.12);
scene.add(radiator);

// A very low ambient so shadows are dark but not black - a night interior,
// not a cave.
/*
 * A night interior still has to be legible. The ambient is deliberately blue
 * so the shadows read as moonlight rather than as underexposure, and it is
 * kept low enough that the warm lamp is still clearly the brightest thing in
 * the room - the contrast between the two is the whole mood.
 */
const ceilingFixture = new THREE.PointLight(0xcbd8e8, 9, 11, 1.8);
ceilingFixture.position.set(-1.4, 2.75, -0.4);
scene.add(ceilingFixture);
const fixtureGlow = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 10, 10),
  new THREE.MeshBasicMaterial({ color: 0xdfe9f5 }),
);
fixtureGlow.position.copy(ceilingFixture.position);
scene.add(fixtureGlow);

scene.add(new THREE.AmbientLight(0x3b4a6b, 1.5));
scene.add(new THREE.HemisphereLight(0x50648f, 0x1d150e, 1.0));

// ------------------------------------------------------------- character

/*
 * The same body and the same walk as the hybrid prototype, so that comparing
 * the two compares the rooms rather than two different characters.
 */
const jack = createJack();
jack.group.position.set(-1.7, 0, 0.9);
jack.target.copy(jack.group.position);
scene.add(jack.group);

// ------------------------------------------------------------------ post

const composer = new EffectComposer(renderer);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
// Restrained bloom: enough to make the lamps glow, not enough to fog the room.
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.55, 0.82));

/** Vignette and a faint scanline, so it sits with the rest of the game. */
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, amount: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      c.rgb *= smoothstep(1.15, 0.16, dot(d, d) * 1.35);     // vignette
      c.rgb *= 1.0 - 0.035 * step(0.5, fract(vUv.y * 200.0)); // scanline
      gl_FragColor = c;
    }`,
});
composer.addPass(grade);

// ----------------------------------------------------------------- input

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('pointerdown', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObject(floor)[0];
  if (hit) jack.target.copy(hit.point);
});

// ------------------------------------------------------------------ loop

/*
 * A handle on the character, for driving him from a screenshot script.
 * This is a prototype page that ships with nothing, so a debug hook here
 * costs nothing and is the only way to place him precisely for a comparison.
 */
(window as unknown as { walkTo: (x: number, z: number) => void }).walkTo = (x, z) => {
  jack.group.position.set(x, 0, z);
  jack.target.set(x, 0, z);
};

const clock = new THREE.Clock();
function frame(): void {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  jack.update(dt, t);

  // The lamp is a filament, not an LED: it should be almost, but not quite, steady.
  lampLight.intensity = 9 + Math.sin(t * 2.7) * 0.25 + Math.sin(t * 11.3) * 0.1;

  composer.render();
  requestAnimationFrame(frame);
}
frame();
