import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { createCoffeeSet } from '../objects/OmaniCoffeeSet.js';
import { createMabkhara } from '../objects/OmaniMabkhara.js';
import { DallahPourAnimator } from '../objects/DallahPourAnimator.js';

function setup() {
  const set = createCoffeeSet(),
    { dallah, spout, cupCenter } = set.userData;
  return {
    set,
    dallah,
    spout,
    animator: new DallahPourAnimator(dallah, { spout, cupPosition: cupCenter }),
  };
}
function run(animator, duration, step) {
  let elapsed = 0;
  while (elapsed < duration) {
    const dt = Math.min(step, duration - elapsed);
    animator.update(dt);
    elapsed += dt;
  }
}

test('the explicit dallah pivot is at its base and the spout is attached to it', () => {
  const { set, dallah, spout } = setup();
  set.updateMatrixWorld(true);
  assert.equal(set.userData.dallahPivot, dallah);
  assert.equal(dallah.userData.pivotAtBase, true);
  assert.equal(spout.parent, dallah);
  assert.deepEqual(set.userData.baseMarker.position.toArray(), [0, 0, 0]);
  const bounds = new Box3().setFromObject(dallah);
  assert.ok(
    Math.abs(bounds.min.y - dallah.position.y) < 1e-6,
    'lowest vessel vertices meet the pivot plane',
  );
});

test('starting the pour does not teleport and tilting leaves the bottom pivot stationary', () => {
  const { dallah, animator } = setup(),
    home = dallah.position.clone();
  assert.equal(animator.start(), true);
  assert.deepEqual(dallah.position.toArray(), home.toArray());
  animator.update(0.01);
  assert.ok(dallah.position.distanceTo(home) < 0.001);
  animator.update(0.69);
  assert.equal(animator.phase, 'tilting');
  const base = dallah.position.clone();
  animator.update(0.4);
  assert.deepEqual(dallah.position.toArray(), base.toArray());
  assert.ok(
    Math.abs(dallah.rotation.z) > 0 &&
      Math.abs(dallah.rotation.z) < Math.PI / 3,
  );
});

test('actual transformed spout stays aligned over the cup for the sustained pour', () => {
  const { set, dallah, spout, animator } = setup();
  set.rotation.y = 0.63;
  set.position.set(1, 0.4, -2);
  animator.start();
  animator.update(1.5);
  assert.equal(animator.isPouring, true);
  const expected = set.localToWorld(new Vector3(0.25, 0.26, 0.08));
  const actual = spout.getWorldPosition(new Vector3());
  assert.ok(actual.distanceTo(expected) < 1e-8);
  const angle = Math.acos(
    new Vector3(0, 1, 0).applyQuaternion(dallah.quaternion).y,
  );
  assert.ok(angle > 0.6 && angle < 1.6);
  animator.update(2.9);
  assert.equal(animator.isPouring, true);
  assert.ok(spout.getWorldPosition(new Vector3()).distanceTo(expected) < 1e-8);
});

test('pour animation follows the same timeline at 30 and 72 frames per second', () => {
  const slow = setup(),
    fast = setup();
  slow.animator.start();
  fast.animator.start();
  run(slow.animator, 1.12, 1 / 30);
  run(fast.animator, 1.12, 1 / 72);
  assert.ok(slow.dallah.position.distanceTo(fast.dallah.position) < 1e-8);
  assert.ok(slow.dallah.quaternion.angleTo(fast.dallah.quaternion) < 1e-7);
  run(slow.animator, 5.08, 1 / 30);
  run(fast.animator, 5.08, 1 / 72);
  assert.equal(slow.animator.active, false);
  assert.equal(fast.animator.active, false);
  assert.deepEqual(
    slow.dallah.position.toArray(),
    slow.animator.homePosition.toArray(),
  );
});

test('duplicate activation, interrupted grabs and chapter reset do not leave a tilted pot', () => {
  const { dallah, animator } = setup();
  animator.start();
  animator.update(1.8);
  assert.equal(animator.start(), false);
  const interruptedPosition = dallah.position.clone(),
    interruptedQuaternion = dallah.quaternion.clone();
  animator.cancel({ restore: false });
  animator.update(2);
  assert.deepEqual(dallah.position.toArray(), interruptedPosition.toArray());
  assert.ok(dallah.quaternion.angleTo(interruptedQuaternion) < 1e-7);
  animator.start();
  animator.update(0.2);
  animator.cancel();
  assert.deepEqual(dallah.position.toArray(), animator.homePosition.toArray());
  assert.ok(dallah.quaternion.angleTo(animator.homeQuaternion) < 1e-7);
  assert.equal(animator.active, false);
});

test('player-controlled pouring holds indefinitely and stop returns smoothly from the current pose', () => {
  const { dallah, animator } = setup();
  animator.start({ manualStop: true });
  animator.update(10);
  assert.equal(animator.phase, 'pouring');
  const before = dallah.quaternion.clone();
  assert.equal(animator.stop(), true);
  assert.ok(
    dallah.quaternion.angleTo(before) < 1e-7,
    'Stop itself must not snap the rotation',
  );
  animator.update(0.02);
  assert.ok(dallah.quaternion.angleTo(before) < 0.01);
  animator.update(2);
  assert.equal(animator.active, false);
  assert.deepEqual(dallah.position.toArray(), animator.homePosition.toArray());
  animator.start({ manualStop: true });
  animator.update(0.3);
  const lifting = dallah.position.clone();
  animator.stop();
  animator.update(0.01);
  assert.ok(
    dallah.position.distanceTo(lifting) < 1e-8,
    'Early stop straightens at the current base before returning',
  );
});

test('mabkhara retains the exact drop zone with physically based brass and a separate open liner', () => {
  const burner = createMabkhara(),
    { materials, bowl, charcoal } = burner.userData;
  assert.deepEqual(burner.userData.bowlCenter.toArray(), [0, 0.47, 0]);
  assert.equal(burner.userData.bowlRadius, 0.12);
  assert.ok(
    materials.brass.isMeshStandardMaterial &&
      materials.polished.isMeshStandardMaterial,
  );
  assert.ok(
    materials.brass.metalness > 0.8 && materials.brass.roughness > 0.25,
  );
  assert.ok(materials.brass.bumpMap?.isTexture);
  assert.ok(materials.polished.roughness < materials.brass.roughness);
  assert.notEqual(bowl.material, materials.brass);
  assert.equal(charcoal.length, 10);
});
