/**
 * The character, shared by both prototypes.
 *
 * Both experiments have to use the same body and the same walk, or a
 * comparison between them is really a comparison between two characters. He is
 * deliberately simple - the question on the table is about rooms, not about
 * modelling - but he is the right height, the right colours, and he casts a
 * shadow, which is the part that interacts with the room.
 */
import * as THREE from 'three';

export interface Walker {
  group: THREE.Group;
  /** Where he is heading, in world space. */
  target: THREE.Vector3;
  update(dt: number, t: number): void;
}

export function createJack(): Walker {
  const group = new THREE.Group();

  const jacket = new THREE.MeshStandardMaterial({ color: 0x2c3550, roughness: 0.8 });
  const jeans = new THREE.MeshStandardMaterial({ color: 0x35507e, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc79b74, roughness: 0.7 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.185, 0.40, 4, 12), jacket);
  torso.position.y = 1.20;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 14), skin);
  head.position.y = 1.60;
  const fringe = new THREE.Mesh(
    new THREE.SphereGeometry(0.132, 16, 12, 0, Math.PI * 2, 0, 1.45), hair,
  );
  fringe.position.y = 1.615;

  // Separate legs, so the walk can actually swing them rather than bobbing a
  // single capsule up and down.
  const legGeo = new THREE.CapsuleGeometry(0.075, 0.44, 4, 10);
  const legL = new THREE.Mesh(legGeo, jeans);
  const legR = new THREE.Mesh(legGeo, jeans);
  legL.position.set(-0.095, 0.44, 0);
  legR.position.set(0.095, 0.44, 0);

  const armGeo = new THREE.CapsuleGeometry(0.055, 0.34, 4, 10);
  const armL = new THREE.Mesh(armGeo, jacket);
  const armR = new THREE.Mesh(armGeo, jacket);
  armL.position.set(-0.235, 1.22, 0);
  armR.position.set(0.235, 1.22, 0);

  const shoeGeo = new THREE.BoxGeometry(0.12, 0.07, 0.24);
  const shoeL = new THREE.Mesh(shoeGeo, shoe);
  const shoeR = new THREE.Mesh(shoeGeo, shoe);
  shoeL.position.set(-0.095, 0.035, 0.03);
  shoeR.position.set(0.095, 0.035, 0.03);

  for (const part of [torso, head, fringe, legL, legR, armL, armR, shoeL, shoeR]) {
    part.castShadow = true;
    group.add(part);
  }

  const target = new THREE.Vector3();
  let phase = 0;

  return {
    group,
    target,
    update(dt: number) {
      const to = target.clone().sub(group.position);
      to.y = 0;
      const dist = to.length();
      const walking = dist > 0.06;

      if (walking) {
        to.normalize();
        group.position.addScaledVector(to, Math.min(dist, dt * 2.0));
        // Turn towards travel rather than snapping, so corners read as turns.
        const want = Math.atan2(to.x, to.z);
        let diff = want - group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.rotation.y += diff * Math.min(1, dt * 9);
        phase += dt * 7.5;
      } else {
        // Settle the stride rather than freezing mid-step.
        phase += dt * 2;
      }

      const swing = walking ? 0.55 : 0.04;
      const s = Math.sin(phase);
      legL.rotation.x = s * swing;
      legR.rotation.x = -s * swing;
      shoeL.rotation.x = s * swing;
      shoeR.rotation.x = -s * swing;
      armL.rotation.x = -s * swing * 0.75;
      armR.rotation.x = s * swing * 0.75;
      // A small vertical bounce on each footfall.
      group.position.y = walking ? Math.abs(Math.cos(phase)) * 0.028 : group.position.y * 0.85;
      torso.rotation.z = walking ? Math.sin(phase * 2) * 0.02 : 0;
    },
  };
}
