import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Ray, Vector3 } from 'three';
import { ChapterManager } from '../core/ChapterManager.js';
import { DhowChapter } from '../chapters/DhowChapter.js';
import { DHOW_CORDS } from '../chapters/DhowWeaving.js';

function fixture() {
  let scene;
  const events = [],
    sounds = [];
  const chapter = new DhowChapter({
    emit: (event) => {
      events.push(event);
      scene?.event(event);
    },
  });
  const game = {
    chapter,
    paused: false,
    input: (action, payload) => chapter.input(action, payload),
  };
  const content = new Group();
  // Interaction must remain valid after exhibit placement and player locomotion.
  content.position.set(-0.4, 0.85, -1.3);
  content.rotation.y = 0.42;
  content.scale.setScalar(0.85);
  scene = new ChapterManager({
    content,
    game,
    audio: { effect: (type) => sounds.push(type) },
  });
  scene.build('DHOW');
  scene.update(0.6);
  const world = (point) =>
    scene.models.dhow.localToWorld(new Vector3(...point));
  const target = (id) => scene.targets.find((item) => item.id === id);
  const hand = (phase, point, id = 'left-hand') =>
    scene.pointer({ id, phase, source: 'hand', position: point });
  return { scene, chapter, game, events, sounds, world, target, hand };
}

test('hand grips weave four cord routes in transformed exhibits; unheld movement cannot mount them', () => {
  const f = fixture();
  try {
    const rope = f.target('rope');
    assert.equal(f.scene.eligible(rope), false);
    f.scene.assistStart('pull');
    f.scene.update(0.1);
    f.scene.assistEnd();
    assert.equal(
      f.chapter.pulled,
      0,
      'hoist is unavailable until mounting is complete',
    );
    for (const cord of DHOW_CORDS) {
      f.hand('hover', f.world(cord.path[0]));
      f.hand('move', f.world(cord.path[0]));
      assert.equal(f.chapter.cordProgress[cord.id], 0);
      const contactOffset = new Vector3(0.008, 0, 0);
      f.hand(
        'start',
        f
          .target(cord.id)
          .object.getWorldPosition(new Vector3())
          .add(contactOffset),
      );
      assert.equal(f.scene.grabs.get('left-hand')?.target.id, cord.id);
      f.hand('move', f.world(cord.path.at(-1)).add(contactOffset));
      assert.equal(
        f.chapter.cordProgress[cord.id],
        0,
        'end cleat cannot bypass the guides',
      );
      for (let index = 0; index < cord.path.length; index++) {
        f.hand('move', f.world(cord.path[index]).add(contactOffset));
        assert.equal(f.chapter.cordProgress[cord.id], index + 1);
      }
      f.scene.update(0.02);
      assert.equal(
        f.scene.grabs.has('left-hand'),
        false,
        'mounted ends release ownership',
      );
      assert.equal(f.target(cord.id).object.visible, false);
      assert.equal(f.scene.eligible(f.target(cord.id)), false);
    }
    assert.equal(f.chapter.stage, 'HOIST');
    assert.equal(f.scene.eligible(rope), true);
    assert.equal(rope.object.visible, true);
    assert.equal(
      f.events.filter((event) => event.type === 'cord-mounted').length,
      4,
    );
    assert.ok(f.sounds.includes('rope-rub'));
    assert.ok(f.sounds.includes('cord-mounted'));
  } finally {
    f.scene.dispose();
  }
});

test('release and cancellation retain the accepted guide checkpoint without accepting later movement', () => {
  const f = fixture(),
    cord = DHOW_CORDS[0];
  try {
    const target = f.target(cord.id);
    f.hand('start', target.object.getWorldPosition(new Vector3()));
    f.hand('move', f.world(cord.path[0]));
    f.hand('cancel', f.world(cord.path[0]));
    assert.deepEqual(target.home.toArray(), cord.path[0]);
    assert.deepEqual(target.object.position.toArray(), cord.path[0]);
    assert.equal(f.scene.grabs.size, 0);
    f.hand('move', f.world(cord.path[1]));
    assert.equal(f.chapter.cordProgress[cord.id], 1);
    f.hand('start', target.object.getWorldPosition(new Vector3()));
    f.hand('move', f.world(cord.path[1]));
    assert.equal(f.chapter.cordProgress[cord.id], 2);
    f.hand('move', f.world([0.01, 0.45, 0.21]));
    f.hand('end', target.object.getWorldPosition(new Vector3()));
    f.scene.update(0.5);
    assert.deepEqual(target.home.toArray(), cord.path[1]);
    assert.ok(
      target.object.position.distanceTo(new Vector3(...cord.path[1])) < 1e-8,
    );
    f.hand('move', f.world(cord.path[2]));
    assert.equal(f.chapter.cordProgress[cord.id], 2);
    f.hand('start', target.object.getWorldPosition(new Vector3()));
    f.scene.cancelAll();
    assert.equal(f.chapter.cordProgress[cord.id], 2);
    assert.equal(f.scene.grabs.size, 0);
    assert.equal(target.owner, null);
  } finally {
    f.scene.dispose();
  }
});

for (const source of ['controller', 'desktop']) {
  test(`${source} ray projection follows the next weaving depth and mounts through every guide`, () => {
    const f = fixture(),
      id = `${source}-ray`;
    try {
      const normal = new Vector3(0, 0, 1).transformDirection(
        f.scene.root.matrixWorld,
      );
      const rayAt = (point) => {
        const origin = point
          .clone()
          .addScaledVector(normal, 1)
          .add(new Vector3(0.13, 0.08, 0));
        return new Ray(origin, point.clone().sub(origin).normalize());
      };
      for (const cord of DHOW_CORDS) {
        const start = f.target(cord.id).object.getWorldPosition(new Vector3());
        const startRay = rayAt(start);
        const position = f.scene.desktopPlane(startRay, id, f.chapter.stage);
        assert.ok(position);
        f.scene.pointer({
          id,
          source,
          phase: 'start',
          position,
          ray: startRay,
        });
        assert.equal(f.scene.grabs.get(id)?.target.id, cord.id);
        for (let index = 0; index < cord.path.length; index++) {
          const destination = f.world(cord.path[index]),
            ray = rayAt(destination);
          const projected = f.scene.desktopPlane(ray, id, f.chapter.stage);
          assert.ok(
            projected.distanceTo(destination) < 1e-7,
            'projection follows alternating front/back depth',
          );
          f.scene.pointer({ id, source, phase: 'move', position: projected });
          assert.equal(f.chapter.cordProgress[cord.id], index + 1);
        }
        f.scene.update(0.02);
        assert.equal(f.scene.grabs.has(id), false);
      }
      assert.equal(f.chapter.stage, 'HOIST');
      assert.equal(f.chapter.pulled, 0);
    } finally {
      f.scene.dispose();
    }
  });
}
