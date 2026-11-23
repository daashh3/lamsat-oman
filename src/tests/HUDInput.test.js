import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
globalThis.location = { search: '' };
const { HUD } = await import('../ui/HUD.js');

// Test spatial routing independently of canvas font rasterization and WebGL.
function fixture() {
  const hud = Object.create(HUD.prototype),
    actions = [],
    spoken = [];
  hud.root = new THREE.Group();
  hud.panel = new THREE.Object3D();
  hud.panel.visible = false;
  hud.story = new THREE.Object3D();
  hud.story.visible = false;
  const button = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.1),
    new THREE.MeshBasicMaterial(),
  );
  button.position.set(1, 0, -1);
  button.userData = {
    panelWidth: 0.3,
    panelHeight: 0.1,
    action: 'pause',
    speech: 'إيقاف',
  };
  hud.root.add(button);
  hud.root.updateMatrixWorld(true);
  // Hidden panels still participate in highlight clearing in the real HUD.
  hud.panel.material = new THREE.MeshBasicMaterial();
  hud.story.material = new THREE.MeshBasicMaterial();
  hud.buttons = [button];
  hud.contacts = new Map();
  hud.hovered = new Map();
  hud.cooldowns = new Map([['hand-right', -1000]]);
  hud.raycaster = new THREE.Raycaster();
  hud.onAction = (action) => actions.push(action);
  hud.onSpeak = (text) => spoken.push(text);
  const event = {
    id: 'hand-right',
    source: 'hand',
    phase: 'hover',
    position: new THREE.Vector3(),
    uiRay: new THREE.Ray(
      new THREE.Vector3(),
      new THREE.Vector3(1, 0, -1).normalize(),
    ),
  };
  return { hud, event, actions, spoken };
}

test('a distant hand ray highlights silently and requires a pinch to activate the sidebar', () => {
  const { hud, event, actions, spoken } = fixture();
  assert.equal(hud.interact(event), true);
  assert.deepEqual(actions, []);
  assert.deepEqual(spoken, []);
  hud.interact({ ...event, phase: 'start' });
  assert.deepEqual(actions, ['pause']);
  hud.interact({ ...event, phase: 'move' });
  hud.interact({ ...event, phase: 'start' });
  assert.deepEqual(
    actions,
    ['pause'],
    'A held gesture does not repeatedly toggle pause',
  );
  assert.deepEqual(
    spoken,
    [],
    'Neither hovering nor selecting requests speech',
  );
});

test('direct fingertip touch remains usable without a target-ray pose', () => {
  const { hud, event, actions } = fixture();
  event.uiRay = null;
  event.position.set(1, 0, -1);
  assert.equal(hud.interact(event), true);
  assert.deepEqual(actions, ['pause']);
});

test('an off-panel hand ray is not consumed and clears hover', () => {
  const { hud, event, actions } = fixture();
  hud.interact(event);
  event.uiRay.direction.set(0, 1, 0);
  assert.equal(hud.interact({ ...event, phase: 'start' }), false);
  assert.equal(hud.hovered.size, 0);
  assert.deepEqual(actions, []);
});

test('the reading lectern remains fixed beside the exhibit when the viewer moves and content updates', () => {
  const context = new Proxy(
    { measureText: (text) => ({ width: text.length * 24 }) },
    { get: (object, key) => object[key] || (() => {}) },
  );
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({ getContext: () => context }),
  };
  const parent = new THREE.Group(),
    viewer = new THREE.PerspectiveCamera();
  parent.position.set(2, 0.4, -3);
  parent.rotation.y = 0.7;
  parent.scale.setScalar(0.8);
  const hud = new HUD(parent, () => {});
  try {
    hud.root.visible = true;
    const before = hud.root.getWorldPosition(new THREE.Vector3());
    const orientation = hud.root.getWorldQuaternion(new THREE.Quaternion());
    for (const yaw of [0, 0.7, 1.5, -1.2]) {
      viewer.position.set(yaw, 1.6, -0.1);
      viewer.rotation.y = yaw;
      hud.update({
        state: 'FRANKINCENSE',
        progress: { count: 0 },
        chapter: { stage: 'LIGHT_COAL', instruction: 'أشعل الفحم' },
      });
      assert.ok(
        hud.root.getWorldPosition(new THREE.Vector3()).distanceTo(before) <
          1e-8,
      );
      assert.ok(
        hud.root
          .getWorldQuaternion(new THREE.Quaternion())
          .angleTo(orientation) < 1e-7,
      );
    }
    assert.equal(hud.root.parent, parent);
    assert.equal(hud.furniture.length, 2);
  } finally {
    hud.dispose();
    globalThis.document = previousDocument;
  }
});
