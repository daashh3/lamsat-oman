import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TriviaManager } from '../core/TriviaManager.js';

test('three distinct physical keepsakes reveal facts only on click/select, preserve discovery and reset', () => {
  const parent = new THREE.Group(),
    events = [];
  const trivia = new TriviaManager(parent, {
    onDiscover: (fact, state) => events.push({ fact, state }),
  });
  trivia.root.visible = true;
  try {
    for (const item of trivia.items) {
      const p = item.position.clone().add(new THREE.Vector3(0, 0.04, 0));
      const event = {
        phase: 'hover',
        ray: new THREE.Ray(
          p.clone().add(new THREE.Vector3(0, 0, 0.4)),
          new THREE.Vector3(0, 0, -1),
        ),
      };
      assert.equal(trivia.interact(event), true);
      assert.equal(events.length, trivia.found.size);
      assert.equal(trivia.interact({ ...event, phase: 'start' }), true);
    }
    assert.equal(trivia.snapshot().count, 3);
    assert.equal(new Set(events.map((event) => event.fact.id)).size, 3);
    trivia.discover(events[0].fact.id);
    assert.equal(trivia.snapshot().count, 3);
    assert.equal(events.at(-1).state.first, false);
    const snapshot = trivia.snapshot();
    snapshot.found.length = 0;
    assert.equal(trivia.snapshot().count, 3);
    trivia.reset();
    assert.equal(trivia.snapshot().count, 0);
  } finally {
    trivia.dispose();
  }
  assert.equal(parent.children.length, 0);
});

test('real scene occlusion prevents clicking hidden objects through another mesh', () => {
  const parent = new THREE.Group(),
    obstacle = new THREE.Group();
  parent.add(obstacle);
  const trivia = new TriviaManager(parent, { occluders: () => [obstacle] });
  trivia.root.visible = true;
  const point = trivia.items[0].position
    .clone()
    .add(new THREE.Vector3(0, 0.04, 0));
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.02),
    new THREE.MeshBasicMaterial(),
  );
  wall.position.copy(point).add(new THREE.Vector3(0, 0, 0.15));
  obstacle.add(wall);
  const event = {
    phase: 'start',
    uiRay: new THREE.Ray(
      point.clone().add(new THREE.Vector3(0, 0, 0.4)),
      new THREE.Vector3(0, 0, -1),
    ),
  };
  assert.equal(trivia.interact(event), false);
  assert.equal(trivia.snapshot().count, 0);
  wall.visible = false;
  assert.equal(trivia.interact(event), true);
  assert.equal(trivia.snapshot().count, 1);
  trivia.root.visible = false;
  assert.equal(trivia.interact(event), false);
  trivia.dispose();
  wall.geometry.dispose();
  wall.material.dispose();
});
