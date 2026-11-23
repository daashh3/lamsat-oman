import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { DhowChapter } from '../chapters/DhowChapter.js';
import { DHOW_CORDS, DHOW_WEAVE_RADIUS } from '../chapters/DhowWeaving.js';
import { createDhow, setSailProgress } from '../objects/OmaniDhow.js';
import { ResourceManager } from '../core/ResourceManager.js';

test('four cords require ordered physical threading and mounting before hoisting', () => {
  const events = [];
  let completions = 0;
  const chapter = new DhowChapter({
    emit: (event) => events.push(event),
    complete: () => completions++,
  });
  assert.equal(chapter.input('pull', { distance: 0.12 }), false);
  for (const cord of DHOW_CORDS) {
    assert.equal(
      chapter.input('weave', { id: cord.id, position: cord.path.at(-1) }),
      false,
      'mounting cannot skip weaving',
    );
    for (const point of cord.path) {
      assert.equal(
        chapter.input('weave', { id: cord.id, position: point }),
        true,
      );
      assert.equal(
        chapter.input('weave', { id: cord.id, position: point }),
        false,
        'repeated samples cannot advance',
      );
    }
  }
  assert.equal(chapter.stage, 'HOIST');
  assert.equal(chapter.progress, 0.6);
  assert.equal(chapter.hoistProgress, 0);
  assert.equal(
    events.filter((event) => event.type === 'cord-threaded').length,
    12,
  );
  assert.equal(
    events.filter((event) => event.type === 'cord-mounted').length,
    4,
  );
  for (let i = 0; i < 4; i++)
    assert.equal(chapter.input('pull', { distance: 0.12 }), true);
  assert.equal(chapter.completed, true);
  assert.equal(completions, 1);
  assert.equal(chapter.hoistProgress, 1);
  assert.equal(chapter.input('pull', { distance: 0.12 }), false);
});

test('weaving rejects nonfinite, wrong, distant and out-of-order samples without losing accepted work', () => {
  const chapter = new DhowChapter(),
    cord = DHOW_CORDS[0];
  for (const data of [
    {},
    { id: 'invalid', position: cord.path[0] },
    { id: cord.id, position: [NaN, 0, 0] },
    { id: cord.id, position: [0, Infinity, 0] },
    { id: cord.id, position: [0, 0] },
    { id: cord.id, position: [0, 0, 0] },
  ])
    assert.equal(chapter.input('weave', data), false);
  assert.equal(
    chapter.input('weave', { id: cord.id, position: cord.path[0] }),
    true,
  );
  chapter.interrupt();
  chapter.update(30);
  assert.equal(chapter.cordProgress[cord.id], 1);
  assert.equal(
    chapter.input('weave', { id: cord.id, position: cord.path[2] }),
    false,
  );
  assert.equal(
    chapter.input('weave', { id: cord.id, position: cord.path[1] }),
    true,
  );
  const copy = chapter.snapshot();
  copy.cordProgress[cord.id] = 0;
  copy.mountedCords.push(cord.id);
  assert.equal(chapter.cordProgress[cord.id], 2);
  assert.deepEqual(chapter.mountedCords, []);
});

test('VR guides have separated hit regions and alternating front/back passes', () => {
  assert.equal(DHOW_CORDS.length, 4);
  for (const cord of DHOW_CORDS) {
    for (let i = 1; i < cord.path.length; i++) {
      assert.ok(
        new Vector3(...cord.path[i]).distanceTo(
          new Vector3(...cord.path[i - 1]),
        ) >
          DHOW_WEAVE_RADIUS * 2,
      );
      assert.ok(Math.abs(cord.path[i][2] - cord.path[i - 1][2]) >= 0.08);
    }
  }
});

test('rig meshes retain held tip pose and geometry while revealing completed mounting', () => {
  const ship = createDhow(),
    chapter = new DhowChapter();
  try {
    const { cords, ropeHandle, rope, setRigProgress } = ship.userData;
    assert.equal(cords.length, 4);
    assert.equal(ropeHandle.visible, false);
    assert.equal(rope.visible, false);
    const geometries = new Set();
    ship.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
    });
    for (const cord of cords) {
      cord.object.position.set(0.04, 0.36, 0.11);
      const held = cord.object.position.clone();
      setRigProgress(chapter.snapshot());
      assert.ok(
        cord.object.position.equals(held),
        'animation cannot overwrite the owning hand',
      );
      for (const point of cord.definition.path) {
        chapter.input('weave', { id: cord.id, position: point });
        setRigProgress(chapter.snapshot());
      }
      assert.equal(cord.object.visible, false);
      assert.deepEqual(
        cord.guides.map((guide) => guide.visible),
        [false, false, false, true],
      );
      assert.ok(
        Array.from(cord.segments.instanceMatrix.array).every(Number.isFinite),
      );
    }
    assert.equal(ropeHandle.visible, true);
    assert.equal(rope.visible, true);
    const after = new Set();
    ship.traverse((object) => {
      if (object.geometry) after.add(object.geometry);
    });
    assert.deepEqual(after, geometries);
    setSailProgress(ship, 1);
    assert.equal(ship.userData.sailProgress, 1);
  } finally {
    new ResourceManager().dispose(ship);
  }
});
