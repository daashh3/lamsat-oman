import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { CoffeeChapter } from '../chapters/CoffeeChapter.js';
import { HalwaChapter } from '../chapters/HalwaChapter.js';
import { createCoffeeSet } from '../objects/OmaniCoffeeSet.js';
import { createHalwaSet } from '../objects/HalwaCookingSet.js';
import { DallahPourAnimator } from '../objects/DallahPourAnimator.js';

function pour(chapter, frames = 70) {
  for (let i = 0; i < frames; i++)
    chapter.input('pour', { angle: 1, aligned: true, dt: 0.05 });
}
function tick(chapter, frames = 12) {
  for (let i = 0; i < frames; i++) chapter.update(0.05);
}
function readyHalwa() {
  const chapter = new HalwaChapter();
  for (const id of ['sugar', 'saffron', 'nuts'])
    chapter.input('drop', { id, position: [0, 0.22, 0] });
  for (let i = 0; i < 300 && chapter.stage === 'STIR'; i++)
    chapter.input('stir', { angle: i * 0.1, radius: 0.1, dt: 0.05 });
  assert.equal(chapter.stage, 'FAN_FIRE');
  return chapter;
}
function fan(chapter, start = 0) {
  for (let i = 0; i < 40; i++)
    chapter.input('fan', {
      position: [Math.sin(i * 0.4) * 0.12, 0.12, 0.24],
      time: start + i * 0.05,
    });
}

test('pouring cannot fill or complete a cup until the player actually holds it', () => {
  const chapter = new CoffeeChapter();
  pour(chapter, 100);
  chapter.input('stop-pour');
  tick(chapter);
  assert.equal(chapter.fillLevel, 0);
  assert.equal(chapter.completed, false);
  assert.equal(chapter.input('cup-held', { held: 'true' }), false);
  assert.equal(chapter.input('cup-held', { held: true }), true);
  pour(chapter);
  chapter.input('stop-pour');
  tick(chapter);
  assert.equal(chapter.completed, true);
  assert.equal(chapter.snapshot().cupHeld, true);
});

test('releasing a held cup during settling cannot award a perfect pour', () => {
  const chapter = new CoffeeChapter();
  chapter.input('cup-held', { held: true });
  pour(chapter);
  chapter.input('stop-pour');
  tick(chapter, 4);
  chapter.input('cup-held', { held: false });
  tick(chapter, 40);
  assert.equal(chapter.completed, false);
  assert.equal(chapter.isPouring, false);
  assert.equal(chapter.stage, 'POUR');
  assert.ok(Math.abs(chapter.fillLevel - 0.7) < 1e-9);
  chapter.input('cup-held', { held: true });
  chapter.input('stop-pour');
  tick(chapter);
  assert.equal(chapter.completed, true);
});

test('a moving held cup has a child mouth marker and the assisted pot follows smoothly', () => {
  const set = createCoffeeSet();
  const { dallah, spout, cup, cupMouth, cupGrip } = set.userData;
  assert.equal(cup, set.userData.cups[0]);
  assert.equal(cupMouth.parent, cup);
  assert.equal(cup.userData.grabbable, true);
  assert.deepEqual(cupGrip.toArray(), [0, 0.045, 0]);
  set.position.set(0.4, 0.6, -1.3);
  set.rotation.y = 0.7;
  set.scale.setScalar(1.3);
  const animator = new DallahPourAnimator(dallah, { spout });
  animator.start({ manualStop: true });
  animator.update(1.5);
  cup.position.set(0.32, 0.16, 0.1);
  set.updateMatrixWorld(true);
  const mouth = set.worldToLocal(cupMouth.getWorldPosition(new Vector3()));
  const before = dallah.position.clone();
  assert.equal(animator.setCupPosition(mouth), true);
  assert.deepEqual(
    dallah.position.toArray(),
    before.toArray(),
    'Changing a target must not teleport the pot',
  );
  assert.equal(animator.setCupPosition(new Vector3(NaN, 0, 0)), false);
  animator.update(1 / 72);
  assert.ok(dallah.position.distanceTo(before) < 0.04);
  for (let i = 0; i < 144; i++) animator.update(1 / 72);
  const outlet = set.worldToLocal(spout.getWorldPosition(new Vector3()));
  const expected = mouth.clone().add(new Vector3(0, 0.16, 0));
  assert.ok(outlet.distanceTo(expected) < 1e-8);
  const stopped = dallah.position.clone();
  animator.stop();
  animator.setCupPosition(new Vector3(-1, 1, 1));
  animator.update(0.1);
  assert.deepEqual(
    dallah.position.toArray(),
    stopped.toArray(),
    'Stopping freezes the current base before returning',
  );
});

test('bare-hand fire fanning never counts, and putting down the mahafa clears motion continuity', () => {
  const chapter = readyHalwa();
  fan(chapter);
  assert.equal(chapter.snapshot().fanStrokes, 0);
  assert.equal(chapter.input('fan-held', { held: true }), true);
  fan(chapter, 3);
  const previous = chapter.snapshot().fanStrokes;
  assert.ok(previous > 0);
  chapter.input('fan-held', { held: false });
  fan(chapter, 6);
  assert.equal(chapter.snapshot().fanStrokes, previous);
  chapter.input('fan-held', { held: true });
  fan(chapter, 9);
  assert.equal(chapter.completed, true);
});

test('mahafa is independently grabbable and appropriately sized for a hand', () => {
  const set = createHalwaSet();
  const { fan: mahafa } = set.userData;
  assert.equal(mahafa.parent, set);
  assert.equal(mahafa.userData.grabbable, true);
  assert.deepEqual(mahafa.userData.grip.toArray(), [0, 0, 0]);
  const size = new Box3().setFromObject(mahafa).getSize(new Vector3());
  assert.ok(size.x > 0.16 && size.x < 0.2);
  assert.ok(size.y > 0.3 && size.y < 0.36);
  let meshes = 0;
  mahafa.traverse((object) => {
    if (object.isMesh) meshes++;
  });
  assert.ok(
    meshes <= 5,
    'Static weave should be batched for headset rendering',
  );
  const early = new HalwaChapter();
  assert.equal(early.input('fan-held', { held: true }), false);
});
