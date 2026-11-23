import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGate } from '../objects/OmaniGate.js';
import { ResourceManager } from '../core/ResourceManager.js';

globalThis.location = { search: '' };
const { HUD } = await import('../ui/HUD.js');

// Exercise real meshes and interaction code; only canvas rasterization is stubbed.
function fixture(options = {}) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      const context = new Proxy(
        {
          font: '16px sans-serif',
          measureText(text) {
            const fontSize = Number(this.font.match(/([\d.]+)px/)?.[1] || 16);
            return { width: [...text].length * fontSize * 0.52 };
          },
        },
        { get: (target, key) => (key in target ? target[key] : () => {}) },
      );
      return { getContext: () => context };
    },
  };
  const parent = new THREE.Group();
  const actions = [];
  const hud = new HUD(parent, (action) => actions.push(action), options);
  hud.root.visible = true;
  return {
    hud,
    parent,
    actions,
    dispose() {
      hud.dispose();
      globalThis.document = previousDocument;
    },
  };
}

const snapshot = (state, chapter = {}, paused = false) => ({
  state,
  paused,
  progress: { count: 2 },
  chapter: {
    instruction: 'اقرأ التعليمات واختر الأداة المناسبة لإكمال هذه المحطة',
    ...chapter,
  },
});

function localBounds(mesh) {
  mesh.geometry.computeBoundingBox();
  mesh.updateMatrix();
  return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
}

function assertBoardLayout(hud, state) {
  hud.update(state);
  const board = localBounds(hud.furniture[0]);
  assert.ok(Math.abs(board.max.x - board.min.x - 0.69) < 1e-6);
  assert.ok(Math.abs(board.max.y - board.min.y - 0.97) < 1e-6);
  assert.ok(Math.abs((board.min.y + board.max.y) / 2 + 0.025) < 1e-6);
  const visibleButtons = hud.buttons.filter((button) => button.visible);
  assert.ok(
    visibleButtons.length <= 8,
    `${state.state}: no more than eight controls`,
  );
  const panels = [hud.panel, hud.story, ...visibleButtons].filter(
    (panel) => panel.visible,
  );
  const rectangles = panels.map((panel) => ({
    panel,
    bounds: localBounds(panel),
  }));
  for (const { panel, bounds } of rectangles) {
    const label = panel.userData.action || 'text';
    assert.ok(
      bounds.min.x >= board.min.x && bounds.max.x <= board.max.x,
      `${state.state}/${label} fits board width`,
    );
    assert.ok(
      bounds.min.y >= board.min.y && bounds.max.y <= board.max.y,
      `${state.state}/${label} fits board height`,
    );
  }
  for (let i = 0; i < rectangles.length; i++) {
    for (let j = i + 1; j < rectangles.length; j++) {
      const a = rectangles[i].bounds,
        b = rectangles[j].bounds;
      const overlapX = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
      const overlapY = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
      assert.ok(
        overlapX <= 0 || overlapY <= 0,
        `${state.state}: visible text/control rectangles do not overlap`,
      );
    }
  }
  return visibleButtons.map((button) => button.userData.action);
}

function buttonRay(hud, action, fromFront = true) {
  hud.root.updateWorldMatrix(true, true);
  const button = hud.buttons.find((item) => item.userData.action === action);
  const center = button.getWorldPosition(new THREE.Vector3());
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(
    button.getWorldQuaternion(new THREE.Quaternion()),
  );
  return new THREE.Ray(
    center.clone().addScaledVector(normal, fromFront ? 0.75 : -0.75),
    normal.multiplyScalar(fromFront ? -1 : 1),
  );
}

test('fixed board is placed once about 1.25 metres away, faces the viewer, and moves only after explicit reset', () => {
  const f = fixture();
  try {
    f.parent.position.set(1.7, 0.4, -2.1);
    f.parent.rotation.y = 0.6;
    const viewer = f.parent.localToWorld(new THREE.Vector3(0, 0.6, 0.65));
    f.hud.place(viewer);
    assert.equal(f.hud.needsPlacement, false);
    assert.ok(f.hud.root.position.x >= 0.86);
    const position = f.hud.root.getWorldPosition(new THREE.Vector3());
    const orientation = f.hud.root.getWorldQuaternion(new THREE.Quaternion());
    const distance = position.distanceTo(viewer);
    assert.ok(distance > 1.15 && distance < 1.45);
    const towardViewer = viewer.clone().sub(position).normalize();
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation);
    assert.ok(
      normal.dot(towardViewer) > 0.99,
      'The front of the reading board faces the viewer',
    );
    const movedViewer = viewer.clone().add(new THREE.Vector3(0.7, 0.05, -0.4));
    f.hud.place(movedViewer);
    f.hud.update(snapshot('COFFEE', { cupHeld: true }));
    assert.ok(
      f.hud.root.getWorldPosition(new THREE.Vector3()).distanceTo(position) <
        1e-8,
    );
    assert.ok(
      f.hud.root
        .getWorldQuaternion(new THREE.Quaternion())
        .angleTo(orientation) < 1e-7,
    );
    f.hud.needsPlacement = true;
    f.hud.place(movedViewer);
    assert.ok(
      f.hud.root.getWorldPosition(new THREE.Vector3()).distanceTo(position) >
        0.2,
    );
  } finally {
    f.dispose();
  }
});

test('all contextual layouts and paused controls fit the fixed board without overlap', () => {
  const f = fixture();
  try {
    const gate = assertBoardLayout(
      f.hud,
      snapshot('GATE', { selectedShape: 'square', finishedShapes: ['star'] }),
    );
    assert.equal(gate.length, 8);
    assert.deepEqual(gate.slice(0, 3), [
      'shape-slot-star',
      'shape-slot-square',
      'shape-slot-random',
    ]);
    const incense = assertBoardLayout(
      f.hud,
      snapshot('FRANKINCENSE', { stage: 'LIGHT_COAL' }),
    );
    assert.equal(incense.length, 6);
    assert.ok(incense.includes('light-coal'));
    const pottery = assertBoardLayout(
      f.hud,
      snapshot('POTTERY', { stage: 'DECORATE', decorations: [1] }),
    );
    assert.deepEqual(pottery.slice(0, 3), [
      'decorate-0',
      'decorate-1',
      'decorate-2',
    ]);
    const coffee = assertBoardLayout(
      f.hud,
      snapshot('COFFEE', { cupHeld: true, fillLevel: 0.64 }),
    );
    assert.deepEqual(coffee.slice(0, 3), [
      'hold-cup',
      'pour-coffee',
      'stop-pour',
    ]);
    const paused = assertBoardLayout(
      f.hud,
      snapshot('COFFEE', { cupHeld: true }, true),
    );
    assert.deepEqual(paused, [
      'pause',
      'recenter',
      'effects',
      'restart',
      'exit',
    ]);
    f.hud.subtitles = false;
    assertBoardLayout(f.hud, snapshot('GATE'));
    assert.equal(f.hud.story.visible, false);
  } finally {
    f.dispose();
  }
});

test('finished shape and decoration controls and pouring without a held cup remain inert', () => {
  const f = fixture();
  try {
    f.hud.update(snapshot('GATE', { finishedShapes: ['star'] }));
    assert.equal(
      f.hud.buttons.find(
        (button) => button.userData.action === 'shape-slot-star',
      ).userData.disabled,
      true,
    );
    assert.equal(
      f.hud.interact({
        id: 'star',
        phase: 'start',
        source: 'controller',
        ray: buttonRay(f.hud, 'shape-slot-star'),
      }),
      true,
    );
    f.hud.update(snapshot('POTTERY', { stage: 'DECORATE', decorations: [1] }));
    assert.equal(
      f.hud.interact({
        id: 'paint',
        phase: 'start',
        source: 'controller',
        ray: buttonRay(f.hud, 'decorate-1'),
      }),
      true,
    );
    f.hud.update(snapshot('COFFEE', { cupHeld: false }));
    assert.equal(
      f.hud.interact({
        id: 'empty',
        phase: 'start',
        source: 'controller',
        ray: buttonRay(f.hud, 'pour-coffee'),
      }),
      true,
    );
    assert.deepEqual(f.actions, []);
    f.hud.update(snapshot('COFFEE', { cupHeld: true }));
    f.hud.interact({
      id: 'held',
      phase: 'start',
      source: 'controller',
      ray: buttonRay(f.hud, 'pour-coffee'),
    });
    assert.deepEqual(f.actions, ['pour-coffee']);
  } finally {
    f.dispose();
  }
});

test('panel rays work from the front only and solid exhibits block controls behind them', () => {
  const occluders = [];
  const f = fixture({ occluders: () => occluders });
  const obstacle = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.08),
    new THREE.MeshBasicMaterial(),
  );
  try {
    f.hud.update(snapshot('FRANKINCENSE', { stage: 'SCRAPE_TREE' }));
    for (const panel of [f.hud.panel, f.hud.story, ...f.hud.buttons]) {
      assert.equal(panel.material.side, THREE.FrontSide);
      assert.equal(panel.material.depthTest, true);
    }
    assert.equal(
      f.hud.interact({
        id: 'back',
        phase: 'start',
        source: 'controller',
        ray: buttonRay(f.hud, 'effects', false),
      }),
      false,
    );
    assert.deepEqual(f.actions, []);
    const ray = buttonRay(f.hud, 'effects');
    obstacle.position.copy(ray.at(0.35, new THREE.Vector3()));
    obstacle.quaternion.copy(
      f.hud.root.getWorldQuaternion(new THREE.Quaternion()),
    );
    obstacle.updateMatrixWorld(true);
    occluders.push(obstacle);
    assert.equal(
      f.hud.interact({
        id: 'blocked',
        phase: 'start',
        source: 'controller',
        ray,
      }),
      false,
    );
    obstacle.visible = false;
    assert.equal(
      f.hud.interact({
        id: 'front',
        phase: 'start',
        source: 'controller',
        ray,
      }),
      true,
    );
    assert.deepEqual(f.actions, ['effects']);
  } finally {
    obstacle.geometry.dispose();
    obstacle.material.dispose();
    f.dispose();
  }
});

test('every reading panel and control is visible past the tall door at initial placement', () => {
  const gate = createGate();
  const f = fixture({ occluders: () => [gate] });
  f.parent.add(gate);
  try {
    const eye = new THREE.Vector3(0, 0.6, 0.65);
    f.hud.update(
      snapshot('GATE', { selectedShape: 'star', finishedShapes: [] }),
    );
    f.hud.place(eye);
    const obstacles = [];
    gate.traverseVisible((object) => {
      if (object.isMesh && object.material?.depthWrite !== false)
        obstacles.push(object);
    });
    const ray = new THREE.Raycaster();
    for (const panel of [f.hud.panel, f.hud.story, ...f.hud.buttons].filter(
      (panel) => panel.visible,
    )) {
      for (const x of [-0.5, 0, 0.5])
        for (const y of [-0.5, 0, 0.5]) {
          const point = panel.localToWorld(
            new THREE.Vector3(
              panel.userData.panelWidth * x,
              panel.userData.panelHeight * y,
              0,
            ),
          );
          const direction = point.sub(eye);
          ray.set(eye, direction.clone().normalize());
          ray.far = direction.length() - 0.005;
          assert.equal(
            ray.intersectObjects(obstacles, false).length,
            0,
            'Door must not obscure a label or button',
          );
        }
    }
  } finally {
    new ResourceManager().dispose(gate);
    f.dispose();
  }
});

test('a hand resting on the board cannot toggle a button again on release', () => {
  const f = fixture();
  try {
    f.hud.update(snapshot('GATE'));
    const button = f.hud.buttons.find(
      (button) => button.userData.action === 'effects',
    );
    const position = button.getWorldPosition(new THREE.Vector3());
    const event = { id: 'touch', source: 'hand', phase: 'hover', position };
    f.hud.interact(event);
    assert.deepEqual(f.actions, ['effects']);
    f.hud.releasePointer('touch');
    f.hud.cooldowns.set('touch', -1000);
    f.hud.interact(event);
    assert.deepEqual(f.actions, ['effects']);
    f.hud.interact({ ...event, position: new THREE.Vector3(10, 10, 10) });
    f.hud.interact(event);
    assert.deepEqual(f.actions, ['effects', 'effects']);
  } finally {
    f.dispose();
  }
});

test('VR movement page fits eight controls, keeps the board fixed, and gates movement while paused', () => {
  const f = fixture();
  try {
    f.hud.setVRState({ active: true, thirdPerson: false });
    f.hud.place(new THREE.Vector3(0, 1.6, 0.6));
    const position = f.hud.root.position.clone();
    f.hud.toggleMovementMenu();
    const actions = assertBoardLayout(
      f.hud,
      snapshot('DHOW', { stage: 'WEAVE' }),
    );
    for (const action of [
      'move-forward',
      'move-backward',
      'turn-left',
      'turn-right',
      'third-person',
    ])
      assert.ok(actions.includes(action));
    assert.equal(actions.length, 8);
    assert.equal(f.hud.story.userData.action, 'movement-menu');
    f.hud.interact({
      id: 'controller',
      phase: 'start',
      source: 'controller',
      ray: buttonRay(f.hud, 'third-person'),
    });
    assert.deepEqual(f.actions, ['third-person']);
    f.hud.releasePointer('controller');
    f.hud.setVRState({ thirdPerson: true });
    assertBoardLayout(f.hud, snapshot('DHOW', { stage: 'WEAVE' }, true));
    assert.ok(
      f.hud.buttons.find((b) => b.userData.action === 'move-forward').userData
        .disabled,
    );
    assert.ok(f.hud.root.position.equals(position));
    f.hud.toggleMovementMenu();
    const main = assertBoardLayout(
      f.hud,
      snapshot('POTTERY', { stage: 'IGNITE_KILN' }),
    );
    assert.ok(main.includes('light-kiln'));
    assert.ok(!main.includes('third-person'));
    f.hud.setVRState({ active: false });
    f.hud.update(snapshot('GATE'));
    assert.equal(f.hud.story.userData.action, null);
  } finally {
    f.dispose();
  }
});
