/**
 * Arthur's office, the hybrid way: the painting, with depth added.
 *
 * The plate is the same 640x400 image the 2D game uses, drawn as the
 * background and never lit. In front of it sits geometry that is never seen -
 * a floor, the desk, the cabinet, the safe - matched to the painting's own
 * perspective. That geometry writes depth and receives shadow but draws no
 * colour, so the character is occluded by the desk exactly, and throws a
 * shadow onto the painted floor, while every brushstroke in the artwork
 * survives untouched.
 *
 * The whole difficulty of the technique is in one place: the camera has to
 * agree with the vanishing point the artist used. Get that wrong and the
 * proxies drift away from the objects they stand for. Press D to see them.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { createJack } from './actor3d';

const W = 640;
const H = 400;

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
(document.getElementById('view') as HTMLDivElement).appendChild(renderer.domElement);

// Exposed so a calibration script can do the perspective fit in-page.
(window as unknown as { THREE_FOR_SOLVE: unknown }).THREE_FOR_SOLVE = THREE;

const scene = new THREE.Scene();

/*
 * The plate, as a background rather than as geometry.
 *
 * scene.background draws it filling the frame with no perspective of its own,
 * which is right: it is the photograph the camera is looking at, not an object
 * in the room.
 */
new THREE.TextureLoader().load('/assets/backgrounds/arcade_office.png', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
});

/*
 * The camera that matches the painting.
 *
 * Found by putting a grid on the floor and adjusting until its lines ran along
 * the painted floorboards and the desk proxy sat on the painted desk. This is
 * the real cost of the hybrid: every room needs this done once, by eye.
 */
const camera = new THREE.PerspectiveCamera(33, W / H, 0.1, 60);
camera.position.set(0.0, 2.15, 7.9);
camera.lookAt(0, 1.0, -1.2);

/** Geometry that is present to depth and shadow, but never drawn. */
function invisible(): THREE.Material {
  const m = new THREE.MeshStandardMaterial();
  m.colorWrite = false;
  return m;
}

/*
 * A metre grid on the floor, for matching the camera to the painting.
 *
 * This is the calibration step the technique lives or dies on: the grid lines
 * have to run along the painted floorboards and the wall line has to fall
 * where the artist put it. Toggled with G, and it stays in the file because
 * every room would need it done again.
 */
const grid = new THREE.GridHelper(14, 14, 0x35ff9e, 0x1f8f5c);
grid.position.y = 0.01;
grid.visible = false;
scene.add(grid);
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'g') grid.visible = !grid.visible;
});

const proxies: THREE.Mesh[] = [];
function proxy(geo: THREE.BufferGeometry, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, invisible());
  m.position.set(x, y, z);
  m.receiveShadow = true;
  m.castShadow = true;
  scene.add(m);
  proxies.push(m);
  return m;
}

/*
 * The floor is the exception: it uses a shadow-only material rather than a
 * hidden one, so the character's shadow lands on the painted floorboards. A
 * figure with no shadow floats however good the occlusion is.
 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.42 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

/*
 * The desk, the cabinet and the safe, placed by solving the painting rather
 * than by eye: for each one, the screen coordinates of its painted edges were
 * fed back through the fitted camera to recover where it stands in the room.
 * Nudging boxes about until they look right is how the first attempt was done
 * and it was wrong in every axis.
 */
/*
 * Note the height: 0.8m, not the 1.12m that matching the desk's painted
 * screen extent suggested. That taller figure covers the front face plus the
 * foreshortened top surface, and a proxy that tall swallows a character whole
 * when he should be visible from the chest up. The proxy has to be the desk's
 * real height, and the painting's silhouette is not it.
 */
proxy(new THREE.BoxGeometry(3.82, 0.8, 1.6), 0.44, 0.4, -0.4);
proxy(new THREE.BoxGeometry(1.02, 1.75, 0.8), -4.24, 0.87, -2.9);
proxy(new THREE.BoxGeometry(1.08, 1.0, 0.8), 3.48, 0.5, -1.64);

/*
 * Lighting exists only to light the character: the plate is already lit, and
 * lighting it again would double every highlight the artist painted. Warm from
 * the desk lamp, cool from the window, so he picks up the room's own colours
 * as he crosses it.
 */
scene.add(new THREE.AmbientLight(0x8593b5, 1.5));
const lamp = new THREE.PointLight(0xffb765, 22, 9, 1.8);
lamp.position.set(1.9, 1.5, -0.55);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
lamp.shadow.bias = -0.0025;
scene.add(lamp);
const windowLight = new THREE.DirectionalLight(0x7fa4e0, 1.1);
windowLight.position.set(1.4, 3.2, -2.4);
scene.add(windowLight);
const doorSpill = new THREE.PointLight(0xbfe6f2, 7, 6, 1.8);
doorSpill.position.set(-1.9, 1.6, -2.2);
scene.add(doorSpill);

const jack = createJack();
jack.group.position.set(-1.7, 0, 0.6);
jack.target.copy(jack.group.position);
scene.add(jack.group);

// ------------------------------------------------------------------ post

const composer = new EffectComposer(renderer);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
// Gentler than the full-3D version: the plate already has its own glow
// painted in, and blooming it again turns the room to soup.
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.22, 0.5, 0.88));
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb *= 1.0 - 0.03 * step(0.5, fract(vUv.y * 200.0));
      gl_FragColor = c;
    }`,
}));

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

/** D reveals the proxies, which is the only way to check the alignment. */
let showProxies = false;
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'd') return;
  showProxies = !showProxies;
  for (const m of proxies) {
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.colorWrite = showProxies;
    mat.wireframe = showProxies;
    mat.color.set(0xff3b8e);
    mat.needsUpdate = true;
  }
});

const hook = window as unknown as { walkTo: (x: number, z: number) => void; toggle: () => void };
hook.walkTo = (x, z) => { jack.group.position.set(x, 0, z); jack.target.set(x, 0, z); };
hook.toggle = () => dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
(window as unknown as { grid: () => void }).grid =
  () => dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
(window as unknown as { setCam: (y: number, z: number, ly: number, lz: number, fov: number) => void })
  .setCam = (y, z, ly, lz, fov) => {
    camera.position.set(0, y, z);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.lookAt(0, ly, lz);
  };

const clock = new THREE.Clock();
function frame(): void {
  const dt = Math.min(0.05, clock.getDelta());
  jack.update(dt, clock.elapsedTime);
  lamp.intensity = 22 + Math.sin(clock.elapsedTime * 2.7) * 0.6;
  composer.render();
  requestAnimationFrame(frame);
}
frame();
