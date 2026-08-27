/**
 * Arthur's office, occluded by a depth map.
 *
 * The hybrid prototype needed a box hand-placed for every object a character
 * could walk behind - about ten minutes a room, thirty-three rooms, and boxes
 * only ever approximate a shape. This does the same job from an image.
 *
 * The plate is drawn as a full-screen quad by a shader that, as well as
 * putting the painting on screen, writes a depth value per pixel taken from a
 * greyscale map of the same room. From that moment the depth buffer contains
 * the painting's own geometry, so anything drawn afterwards is occluded by it
 * for free - the desk, but also the radiator, the door frame, the chair back
 * and the edge of the filing cabinet, none of which anyone described.
 *
 * The map is produced by tools/depth/estimate_depth.py, which runs a monocular
 * depth model over every plate. Its output is relative - consistent within one
 * picture, with no absolute scale - so each room needs two numbers here saying
 * what its black and white ends mean in metres. Two numbers per room, against
 * a box per object.
 */
import * as THREE from 'three';
import { createJack } from './actor3d';

const W = 640;
const H = 400;
const NEAR = 0.1;
const FAR = 60;

/**
 * What the depth map's extremes mean, in metres from the camera.
 *
 * The only per-room calibration left. Read off two things in the painting: how
 * far away the nearest floor is, and how far the furthest wall is.
 */
const DEPTH_NEAR = 3.0;
const DEPTH_FAR = 11.5;

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
(document.getElementById('view') as HTMLDivElement).appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(33, W / H, NEAR, FAR);
camera.position.set(0, 2.15, 7.9);
camera.lookAt(0, 1.0, -1.2);

const loader = new THREE.TextureLoader();
const plate = loader.load('/assets/backgrounds/arcade_office.png');
plate.colorSpace = THREE.SRGBColorSpace;
const depthMap = loader.load('/assets/depth/arcade_office.png');
depthMap.minFilter = THREE.LinearFilter;
depthMap.magFilter = THREE.LinearFilter;

/*
 * The backdrop: a quad pinned to the frame that paints the plate and, more
 * importantly, sets gl_FragDepth from the map.
 *
 * gl_FragDepth is not linear - it is the perspective-divided value the depth
 * buffer actually stores - so the shader converts a distance in metres through
 * the same projection the camera uses. Getting this wrong does not look wrong,
 * it looks like objects sinking into the floor.
 */
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
    uniforms: {
      plate: { value: plate },
      depthMap: { value: depthMap },
      near: { value: NEAR },
      far: { value: FAR },
      dNear: { value: DEPTH_NEAR },
      dFar: { value: DEPTH_FAR },
      showDepth: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        // Already in clip space: this quad ignores the camera entirely.
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D plate;
      uniform sampler2D depthMap;
      uniform float near, far, dNear, dFar, showDepth;
      varying vec2 vUv;
      void main() {
        float d = texture2D(depthMap, vUv).r;      // 1 = near the camera
        float dist = mix(dFar, dNear, d);          // metres from the camera
        // Perspective depth, matching the projection matrix.
        float ndc = (far + near) / (far - near) - (2.0 * far * near) / ((far - near) * dist);
        gl_FragDepth = clamp(ndc * 0.5 + 0.5, 0.0, 1.0);
        vec4 art = texture2D(plate, vUv);
        gl_FragColor = mix(art, vec4(vec3(d), 1.0), showDepth);
      }`,
    depthTest: false,
    depthWrite: true,
  }),
);
backdrop.frustumCulled = false;
// Drawn before everything, so the rest of the scene tests against it.
backdrop.renderOrder = -1;
scene.add(backdrop);

/*
 * The floor still exists, but only to catch shadows and to be clicked on.
 * Nothing else in the room needs geometry at all.
 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.ShadowMaterial({ opacity: 0.4 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

scene.add(new THREE.AmbientLight(0x8593b5, 1.5));
const lamp = new THREE.PointLight(0xffb765, 22, 9, 1.8);
lamp.position.set(1.9, 1.5, -0.55);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
lamp.shadow.bias = -0.0025;
scene.add(lamp);
scene.add(new THREE.DirectionalLight(0x7fa4e0, 1.0).translateX(1.4));
const doorSpill = new THREE.PointLight(0xbfe6f2, 7, 6, 1.8);
doorSpill.position.set(-1.9, 1.6, -2.2);
scene.add(doorSpill);

const jack = createJack();
jack.group.position.set(-1.7, 0, 0.6);
jack.target.copy(jack.group.position);
scene.add(jack.group);

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

const mat = backdrop.material as THREE.ShaderMaterial;
addEventListener('keydown', (e) => {
  // V shows the depth map itself, which is the only way to see why an
  // occlusion is wrong when it is wrong.
  if (e.key.toLowerCase() === 'v') {
    mat.uniforms.showDepth.value = mat.uniforms.showDepth.value > 0.5 ? 0 : 1;
  }
});

const hook = window as unknown as {
  walkTo: (x: number, z: number) => void;
  depthView: () => void;
};
hook.walkTo = (x, z) => { jack.group.position.set(x, 0, z); jack.target.set(x, 0, z); };
hook.depthView = () => dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));

const clock = new THREE.Clock();
function frame(): void {
  jack.update(Math.min(0.05, clock.getDelta()), clock.elapsedTime);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
