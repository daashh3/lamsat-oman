import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Raycaster, Vector3 } from 'three';
import { PotteryChapter } from '../chapters/PotteryChapter.js';
import { createVase, updateVase } from '../objects/OmaniVase.js';
import { createPotteryWheel } from '../objects/PotteryWheel.js';
import { createFort } from '../objects/NizwaFort.js';
import { createGate } from '../objects/OmaniGate.js';
import { createEngravingPatterns } from '../chapters/EngravingPatterns.js';
import { ResourceManager } from '../core/ResourceManager.js';

const tick = (chapter, seconds) => {
  for (let t = 0; t < seconds - 1e-9; t += 0.05) chapter.update(0.05);
};
const shapeVase = (chapter) => {
  chapter.input('drop', { id: 'clay', position: [0, 0.18, 0.18] });
  chapter.input('shape', { height: 0.3, width: 0.98 });
  tick(chapter, 1.2);
};

test('pottery requires three decorations and deliberate kiln ignition before firing', () => {
  const events = [];
  let completions = 0;
  const chapter = new PotteryChapter({
    emit: (event) => events.push(event),
    complete: () => completions++,
  });
  assert.equal(chapter.input('light-kiln'), false);
  assert.equal(chapter.input('decorate', { id: 0 }), false);
  shapeVase(chapter);
  assert.equal(chapter.input('light-kiln'), false);
  assert.equal(chapter.stage, 'DECORATE');
  tick(chapter, 20);
  assert.equal(
    chapter.stage,
    'DECORATE',
    'elapsed time cannot decorate the pot',
  );
  for (const id of [-1, 3, 0.5, '0', NaN])
    assert.equal(chapter.input('decorate', { id }), false);
  assert.equal(chapter.input('decorate', { id: 1 }), true);
  assert.equal(chapter.input('decorate', { id: 1 }), false);
  assert.equal(chapter.input('decorate', { id: 2 }), true);
  assert.equal(chapter.stage, 'DECORATE');
  assert.equal(chapter.input('light-kiln'), false);
  assert.equal(chapter.input('decorate', { id: 0 }), true);
  assert.equal(chapter.stage, 'IGNITE_KILN');
  assert.equal(chapter.snapshot().decorationCount, 3);
  tick(chapter, 20);
  chapter.interrupt();
  assert.equal(chapter.stage, 'IGNITE_KILN');
  assert.equal(chapter.firing, 0);
  assert.equal(events.filter((event) => event.type === 'kiln-start').length, 0);
  assert.equal(chapter.input('light-kiln'), true);
  assert.equal(chapter.stage, 'FIRING');
  assert.equal(chapter.input('light-kiln'), false);
  assert.equal(events.filter((event) => event.type === 'kiln-start').length, 1);
  tick(chapter, 2.4);
  assert.equal(chapter.completed, true);
  assert.equal(completions, 1);
  assert.equal(chapter.input('decorate', { id: 0 }), false);
  assert.equal(chapter.input('light-kiln'), false);
  tick(chapter, 10);
  assert.equal(completions, 1);
});

test('kiln ignition control is reachable from the front and heat appears only after ignition', () => {
  const workshop = createPotteryWheel();
  try {
    const {
      kilnIgniter,
      kilnIgnitionCenter,
      kilnGlow,
      kilnFlames,
      setKilnState,
    } = workshop.userData;
    workshop.updateMatrixWorld(true);
    assert.ok(
      kilnIgnitionCenter.distanceTo(
        kilnIgniter.getWorldPosition(new Vector3()),
      ) < 1e-8,
    );
    const ray = new Raycaster(
      kilnIgnitionCenter.clone().add(new Vector3(0, 0, 1)),
      new Vector3(0, 0, -1),
    );
    assert.equal(ray.intersectObject(workshop, true)[0].object, kilnIgniter);
    for (const stage of ['PLACE_CLAY', 'SHAPE', 'DECORATE', 'IGNITE_KILN']) {
      setKilnState(stage);
      assert.equal(kilnGlow.visible, false);
      assert.equal(kilnFlames.visible, false);
    }
    assert.ok(kilnIgniter.material.emissiveIntensity > 0);
    for (const stage of ['FIRING', 'COMPLETE']) {
      setKilnState(stage);
      assert.equal(kilnGlow.visible, true);
      assert.equal(kilnFlames.visible, true);
    }
    setKilnState('PLACE_CLAY');
    assert.equal(kilnFlames.visible, false);
    assert.equal(kilnIgniter.material.emissiveIntensity, 0);
  } finally {
    new ResourceManager().dispose(workshop);
  }
});

test('pottery shape matching is interrupted by pause and ignores nonfinite dimensions', () => {
  const chapter = new PotteryChapter();
  chapter.input('drop', { id: 'clay', position: [0, 0.18, 0.18] });
  assert.equal(
    chapter.input('shape', { height: Infinity, width: 0.98 }),
    false,
  );
  chapter.input('shape', { height: 0.3, width: 0.98 });
  tick(chapter, 1);
  chapter.interrupt();
  tick(chapter, 0.3);
  assert.equal(chapter.stage, 'SHAPE');
  tick(chapter, 0.9);
  assert.equal(chapter.stage, 'DECORATE');
});

test('decoration follows real pottery dimensions and reveals only painted bands', () => {
  const vase = createVase();
  assert.equal(vase.userData.decoration.visible, false);
  vase.userData.setDecoration([2]);
  assert.deepEqual(
    vase.userData.bands.map((band) => band.visible),
    [false, false, true],
  );
  updateVase(vase, 0.32, 0.21);
  assert.ok(
    Math.abs(vase.userData.decorationTargets[2].position[1] - 0.32 * 0.65) <
      1e-8,
  );
  const size = new Box3()
    .setFromObject(vase.userData.body)
    .getSize(new Vector3());
  assert.ok(Math.abs(size.y - 0.32) < 1e-7);
  assert.ok(Math.abs(size.x - 0.21) < 1e-7);
  vase.userData.setDecoration([]);
  assert.equal(vase.userData.decoration.visible, false);
  new ResourceManager().dispose(vase);
});

test('workshop kiln fits a full-size vessel and enlarged fort retains finite geometry', () => {
  const workshop = createPotteryWheel(),
    fort = createFort();
  assert.ok(workshop.userData.kilnOpening.width > 0.21);
  assert.ok(workshop.userData.kilnOpening.height > 0.33);
  assert.ok(workshop.userData.kilnOpening.depth > 0.21);
  const size = new Box3().setFromObject(fort).getSize(new Vector3());
  assert.ok(size.y > 0.8);
  assert.ok(size.x > 0.65);
  const resources = new ResourceManager();
  resources.dispose(workshop);
  resources.dispose(fort);
});

test('gate stone covers fit their door leaves and follow their hinges', () => {
  const gate = createGate(),
    stone = gate.userData.surfaces[0].cover;
  gate.updateMatrixWorld(true);
  const ray = new Raycaster(
    gate.userData.patternToGate([-0.12475, 0.342, 1], 'star'),
    new Vector3(0, 0, -1),
  );
  const hit = ray.intersectObject(stone, true)[0];
  assert.ok(hit);
  assert.ok(Math.abs(hit.point.z - 0.004) < 1e-7);
  assert.equal(hit.object.material.metalness, 0);
  assert.ok(hit.object.material.roughness > 0.9);
  const before = stone.matrixWorld.clone();
  gate.userData.leftDoor.rotation.y = -1.4;
  gate.userData.rightDoor.rotation.y = 1.4;
  gate.updateMatrixWorld(true);
  assert.notDeepEqual(stone.matrixWorld.elements, before.elements);
  new ResourceManager().dispose(gate);
});

test('taller door preserves square inlay proportions, template reach and reversible trace coordinates', () => {
  const shapes = createEngravingPatterns(() => 0.5);
  const gate = createGate({ shapes });
  const resources = new ResourceManager();
  try {
    const size = new Box3()
      .setFromObject(gate.userData.architecture)
      .getSize(new Vector3());
    assert.ok(size.x > 0.7 && size.x < 0.72);
    assert.ok(size.y > 0.97 && size.y < 0.99);
    assert.ok(
      size.z >= 0.18,
      'The timber frame has a real threshold and side depth',
    );
    assert.deepEqual(gate.userData.architecture.scale.toArray(), [1, 1, 1]);
    gate.updateMatrixWorld(true);
    const headHit = new Raycaster(
      new Vector3(0, 0.77, 1),
      new Vector3(0, 0, -1),
    ).intersectObject(gate.userData.architecture, true)[0];
    assert.ok(headHit, 'The arch has a fitted cover above the two door leaves');
    assert.ok(Math.abs(headHit.point.z - 0.018) < 1e-7);
    assert.ok(
      size.y / size.x > 1.35,
      'The doorway is visibly taller than it is wide',
    );
    for (let i = 0; i < gate.userData.slots.length; i++) {
      const slot = gate.userData.slots[i];
      assert.deepEqual(slot.object.position.toArray(), [
        (i - 1) * 0.205,
        0.08,
        0.3,
      ]);
      assert.deepEqual(slot.object.scale.toArray(), [1, 1, 1]);
      assert.equal(slot.object.parent, gate);
    }
    const square = shapes.find((shape) => shape.id === 'square');
    const corners = square.outline.map(([x, y]) =>
      gate.userData.patternToGate(
        [square.center[0] + x, square.center[1] + y, square.center[2]],
        square.id,
      ),
    );
    const width = corners[1].distanceTo(corners[2]);
    const height = corners[0].distanceTo(corners[1]);
    assert.ok(
      Math.abs(width - height) < 1e-9,
      'Architectural scaling cannot stretch the square',
    );
    gate.position.set(0.4, 0.6, -1.1);
    gate.rotation.y = 0.7;
    gate.scale.setScalar(0.8);
    const output = new Vector3();
    for (const angle of [0, -0.8]) {
      gate.userData.leftDoor.rotation.y = angle;
      for (const shape of shapes)
        for (const point of shape.path) {
          const visual = gate.userData.patternToGate(point, shape.id);
          assert.equal(
            gate.userData.gateToPattern(visual, shape.id, output),
            output,
          );
          assert.ok(output.distanceTo(new Vector3(...point)) < 1e-8);
          // Every cut remains attached to the same fitted cover under its hinge.
          const surface = gate.userData.surfaces.find(
            (item) => item.id === shape.id,
          );
          const onInlay = surface.object.localToWorld(
            new Vector3(
              point[0] - shape.center[0],
              point[1] - shape.center[1],
              0,
            ),
          );
          assert.ok(gate.localToWorld(visual).distanceTo(onInlay) < 1e-8);
        }
    }
  } finally {
    resources.dispose(gate);
  }
});

test('opening hinges preserve rigid leaf dimensions and matching seam handles', () => {
  const gate = createGate();
  try {
    const leaves = [gate.userData.leftDoor, gate.userData.rightDoor];
    const handles = leaves.map((leaf) =>
      leaf.userData.handle.getWorldPosition(new Vector3()),
    );
    assert.ok(Math.abs(handles[0].x + 0.029) < 1e-9);
    assert.ok(Math.abs(handles[1].x - 0.029) < 1e-9);
    assert.ok(Math.abs(handles[0].y - handles[1].y) < 1e-9);
    assert.ok(Math.abs(handles[0].z - handles[1].z) < 1e-9);
    for (const [side, leaf] of leaves.entries()) {
      const probes = [
        new Vector3(),
        new Vector3(side ? -0.2 : 0.2, 0.3, 0.04),
        new Vector3(side ? -0.1 : 0.1, 0.62, -0.02),
      ];
      const distances = [
        probes[0].distanceTo(probes[1]),
        probes[1].distanceTo(probes[2]),
      ];
      for (const angle of [0, 0.4, 0.9, 1.45]) {
        leaf.rotation.y = side ? angle : -angle;
        const world = probes.map((point) => leaf.localToWorld(point.clone()));
        assert.ok(
          Math.abs(world[0].distanceTo(world[1]) - distances[0]) < 1e-9,
        );
        assert.ok(
          Math.abs(world[1].distanceTo(world[2]) - distances[1]) < 1e-9,
        );
        assert.ok(
          leaf.getWorldScale(new Vector3()).distanceTo(new Vector3(1, 1, 1)) <
            1e-8,
        );
      }
    }
  } finally {
    new ResourceManager().dispose(gate);
  }
});
