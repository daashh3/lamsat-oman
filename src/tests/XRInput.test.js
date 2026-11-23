import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BoxGeometry,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
} from 'three';
import { HandTrackingManager } from '../xr/HandTracking.js';
import { GrabSystem } from '../xr/GrabSystem.js';
import { TouchDetector } from '../xr/TouchDetector.js';
import { HitTestPlacement } from '../xr/HitTestPlacement.js';
import { XRManager } from '../xr/XRManager.js';

const identity = { x: 0, y: 0, z: 0, w: 1 };

test('invalid XR samples never poison poses; reacquisition needs an open grip after cancellation', () => {
  const source = mockedHand(),
    events = [];
  const manager = new HandTrackingManager({
    renderer: mockRenderer(),
    scene: new Scene(),
    onInput: (event) => events.push(event),
  });
  let x = 0,
    gap = 0.012,
    missing = false;
  const frame = {
    session: { inputSources: [source] },
    getJointPose(joint) {
      if (missing) return null;
      return {
        transform: {
          position: { x: x + (joint === 'thumb-tip' ? gap : 0), y: 1, z: -0.4 },
          orientation: identity,
        },
      };
    },
  };
  try {
    manager.update(frame, {}, 1 / 72);
    assert.equal(events.at(-1).phase, 'start');
    manager.update(frame, {}, NaN);
    assert.equal(events.at(-1).phase, 'cancel');
    x = 0.2;
    manager.update(frame, {}, 1 / 72);
    assert.equal(events.at(-1).phase, 'hover');
    assert.equal(manager.hands[0].index.x, 0.2);
    gap = 0.08;
    for (let i = 0; i < 15; i++) manager.update(frame, {}, 1 / 72);
    gap = 0.012;
    for (let i = 0; i < 15; i++) manager.update(frame, {}, 1 / 72);
    assert.equal(manager.hands[0].pinching, true);
    missing = true;
    manager.update(frame, {}, 0.02);
    missing = false;
    x = 0.35;
    manager.update(frame, {}, 0.02);
    assert.equal(
      manager.hands[0].index.x,
      0.35,
      'A recovered pose does not interpolate through unobserved space',
    );
    x = Infinity;
    manager.update(frame, {}, 0.2);
    assert.equal(manager.hands.length, 0);
    assert.ok(events.every((e) => e.position.toArray().every(Number.isFinite)));
  } finally {
    manager.dispose();
  }
});
function mockRenderer() {
  const hands = [new Group(), new Group()];
  const renderer = {
    alpha: 1,
    color: new Color(0x123456),
    xr: {
      getHand: (i) => hands[i],
      setFramebufferScaleFactor() {},
      setReferenceSpaceType(type) {
        this.type = type;
      },
      async setSession(session) {
        this.session = session;
      },
      setReferenceSpace(space) {
        this.referenceSpace = space;
      },
      setFoveation() {},
    },
    getClearColor(target) {
      return target.copy(this.color);
    },
    getClearAlpha() {
      return this.alpha;
    },
    setClearColor(color, alpha) {
      this.color.set(color);
      this.alpha = alpha;
    },
  };
  return renderer;
}

function mockedHand(handedness = 'left') {
  const source = { handedness, hand: new Map() };
  for (const name of [
    'wrist',
    'middle-finger-metacarpal',
    'thumb-tip',
    'index-finger-tip',
    'middle-finger-tip',
  ])
    source.hand.set(name, name);
  return source;
}

test('joint poses drive pinch edges; loss cancels once and closed reacquisition does not grab', () => {
  const source = mockedHand();
  const events = [];
  const manager = new HandTrackingManager({
    renderer: mockRenderer(),
    scene: new Scene(),
    onInput: (event) => events.push(event),
  });
  let distance = 0.06,
    missing = false;
  const frame = {
    session: { inputSources: [source] },
    getJointPose(joint) {
      if (missing) return null;
      return {
        transform: {
          position: { x: joint === 'thumb-tip' ? distance : 0, y: 1, z: -0.4 },
          orientation: identity,
        },
      };
    },
  };
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) manager.update(frame, {}, 1 / 72);
  };
  tick();
  assert.equal(manager.hands.length, 1);
  assert.equal(events.at(-1).phase, 'hover');
  distance = 0.012;
  tick(18);
  assert.equal(events.filter((event) => event.phase === 'start').length, 1);
  assert.equal(manager.hands[0].pinching, true);
  assert.equal(events.at(-1).source, 'hand');
  missing = true;
  tick(24);
  assert.equal(manager.hands.length, 0);
  assert.equal(events.filter((event) => event.phase === 'cancel').length, 1);
  missing = false;
  tick(10);
  assert.equal(manager.hands[0].pinching, false);
  assert.equal(events.filter((event) => event.phase === 'start').length, 1);
  distance = 0.06;
  tick(18);
  distance = 0.012;
  tick(18);
  assert.equal(events.filter((event) => event.phase === 'start').length, 2);
  distance = 0.06;
  tick(18);
  assert.equal(events.filter((event) => event.phase === 'end').length, 1);
  manager.dispose();
});

test('both hands expose separate indices, palms and quaternions; removed input cancels held grip', () => {
  const left = mockedHand('left'),
    right = mockedHand('right');
  const events = [];
  const manager = new HandTrackingManager({
    renderer: mockRenderer(),
    scene: new Scene(),
    onInput: (event) => events.push(event),
  });
  const frame = {
    session: { inputSources: [left, right] },
    getJointPose() {
      return {
        transform: {
          position: { x: 0.1, y: 1, z: -0.5 },
          orientation: identity,
        },
      };
    },
  };
  manager.update(frame, {}, 0.02);
  assert.deepEqual(
    manager.hands.map((hand) => hand.id),
    ['hand-left', 'hand-right'],
  );
  assert.ok(
    manager.hands.every(
      (hand) => hand.palm.isVector3 && hand.quaternion.isQuaternion,
    ),
  );
  frame.session.inputSources = [left];
  manager.update(frame, {}, 0.02);
  assert.equal(
    events.filter(
      (event) => event.id === 'hand-right' && event.phase === 'cancel',
    ).length,
    1,
  );
  manager.dispose();
});

test('hand UI rays use target-ray space without replacing direct fingertip input and clear on tracking loss', () => {
  const source = mockedHand('right');
  source.targetRaySpace = {};
  const referenceSpace = {},
    events = [];
  const manager = new HandTrackingManager({
    renderer: mockRenderer(),
    scene: new Scene(),
    onInput: (event) => events.push(event),
  });
  const orientation = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI / 2,
  );
  let rayMissing = false,
    rayFailed = false,
    jointsMissing = false;
  const frame = {
    session: { inputSources: [source] },
    getJointPose() {
      return jointsMissing
        ? null
        : {
            transform: {
              position: { x: 0.12, y: 1.2, z: -0.4 },
              orientation: identity,
            },
          };
    },
    getPose(space, baseSpace) {
      assert.equal(space, source.targetRaySpace);
      assert.equal(baseSpace, referenceSpace);
      if (rayFailed) throw new Error('Aim tracking unavailable.');
      return rayMissing
        ? null
        : { transform: { position: { x: 0.2, y: 0.9, z: -0.3 }, orientation } };
    },
  };
  try {
    manager.update(frame, referenceSpace, 0.02);
    const first = events.at(-1);
    assert.equal(first.phase, 'start');
    assert.deepEqual(first.position.toArray(), [0.12, 1.2, -0.4]);
    assert.deepEqual(first.indexPosition.toArray(), [0.12, 1.2, -0.4]);
    assert.equal(
      first.ray,
      undefined,
      'hand aiming must not change direct exhibit grab routing',
    );
    assert.deepEqual(first.uiRay.origin.toArray(), [0.2, 0.9, -0.3]);
    assert.ok(first.uiRay.direction.distanceTo(new Vector3(-1, 0, 0)) < 1e-10);
    assert.ok(Math.abs(first.uiRay.direction.length() - 1) < 1e-10);
    first.uiRay.origin.x = 99;
    assert.equal(
      manager.hands[0].uiRay.origin.x,
      0.2,
      'event payload must not mutate tracked aim state',
    );

    rayMissing = true;
    manager.update(frame, referenceSpace, 0.02);
    assert.equal(events.at(-1).uiRay, null);
    assert.equal(events.at(-1).phase, 'move');
    rayMissing = false;
    rayFailed = true;
    manager.update(frame, referenceSpace, 0.02);
    assert.equal(events.at(-1).uiRay, null);
    assert.equal(
      manager.hands.length,
      1,
      'failed aim poses keep valid joint tracking',
    );
    rayFailed = false;
    manager.update(frame, referenceSpace, 0.02);
    assert.ok(events.at(-1).uiRay);
    jointsMissing = true;
    manager.update(frame, referenceSpace, 0.2);
    assert.equal(events.at(-1).phase, 'cancel');
    assert.equal(
      events.at(-1).uiRay,
      null,
      'lost hand tracking must never retain an old aim ray',
    );
    assert.equal(manager.hands.length, 0);
  } finally {
    manager.dispose();
  }
});

test('touch uses precise local regions and requires exit/reentry after debounce', () => {
  const object = new Group();
  object.position.set(2, 1, -3);
  const detector = new TouchDetector({ cooldown: 0.3 });
  const zone = {
    type: 'box',
    center: [0, 0.2, 0],
    halfSize: [0.04, 0.04, 0.02],
    tolerance: 0,
  };
  const point = new Vector3(2, 1.2, -3);
  assert.equal(detector.test('left', point, object, zone, 1).activated, true);
  assert.equal(detector.test('left', point, object, zone, 2).activated, false);
  assert.equal(
    detector.test('left', new Vector3(2.2, 1.2, -3), object, zone, 2.1).near,
    false,
  );
  assert.equal(detector.test('left', point, object, zone, 2.2).activated, true);
  assert.equal(
    TouchDetector.contains([0.2, 0, 0], {
      type: 'cylinder',
      center: [0, 0, 0],
      radius: 0.1,
      height: 0.2,
    }),
    false,
  );
});

test('grab ownership prevents two hands owning one item and cancellation restores the home transform', () => {
  const group = new Group();
  group.position.set(2, 1, -3);
  const object = new Mesh(
    new BoxGeometry(0.1, 0.1, 0.1),
    new MeshBasicMaterial(),
  );
  group.add(object);
  group.updateMatrixWorld(true);
  const grabs = new GrabSystem();
  grabs.register('resin', object);
  assert.equal(grabs.begin('left', new Vector3(2, 1, -3)).id, 'resin');
  assert.equal(grabs.begin('right', new Vector3(2, 1, -3)), null);
  grabs.move('left', new Vector3(2.3, 1.2, -3), new Quaternion(), 1);
  assert.ok(Math.abs(object.position.x - 0.3) < 1e-5);
  grabs.release('left', { cancelled: true });
  assert.deepEqual(object.position.toArray(), [0, 0, 0]);
  assert.equal(grabs.owners.size, 0);
  assert.ok(grabs.begin('right', new Vector3(2, 1, -3)));
  grabs.clear();
  object.geometry.dispose();
  object.material.dispose();
});

test('placement uses headset location and yaw, remains stable, and explicitly recenters', () => {
  const content = new Group();
  const placement = new HitTestPlacement({ content });
  let viewerX = 5;
  const q = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI / 2,
  );
  const frame = {
    getViewerPose: () => ({
      transform: { position: { x: viewerX, y: 1.65, z: 3 }, orientation: q },
    }),
  };
  placement.update(frame, {}, 1);
  assert.ok(Math.abs(content.position.x - 4.35) < 1e-8);
  assert.ok(Math.abs(content.position.y - 1.05) < 1e-8);
  const front = new Vector3(0, 0, 1).applyQuaternion(content.quaternion);
  assert.ok(front.x > 0.999, 'model front faces the viewer on the +X side');
  viewerX = 8;
  placement.update(frame, {}, 1);
  assert.ok(
    Math.abs(content.position.x - 4.35) < 1e-8,
    'content must not chase headset motion',
  );
  placement.recenter();
  placement.update(frame, {}, 1);
  assert.ok(Math.abs(content.position.x - 7.35) < 1e-8);
});

test('unavailable or denied hit test returns usable viewer-relative placement', async () => {
  const content = new Group();
  const placement = new HitTestPlacement({ content });
  assert.equal(await placement.init({}), false);
  assert.equal(
    await placement.init({
      enabledFeatures: [],
      requestHitTestSource() {
        throw new Error('must not call');
      },
    }),
    false,
  );
  assert.equal(
    await placement.init({
      async requestReferenceSpace() {
        return {};
      },
      async requestHitTestSource() {
        throw new Error('denied');
      },
    }),
    false,
  );
  placement.update(
    {
      getViewerPose: () => ({
        transform: { position: { x: 2, y: 1.6, z: 1 }, orientation: identity },
      }),
    },
    {},
    1,
  );
  assert.ok(Math.abs(content.position.z - 0.35) < 1e-8);
  placement.dispose();
});

test('horizontal hit placement rejects far/vertical hits and accepts nearby floor hit', async () => {
  const content = new Group();
  const placement = new HitTestPlacement({ content });
  let cancelled = false;
  await placement.init({
    async requestReferenceSpace() {
      return {};
    },
    async requestHitTestSource() {
      return {
        cancel() {
          cancelled = true;
        },
      };
    },
  });
  const matrix = new Matrix4().makeTranslation(0.1, 0, -0.6);
  const frame = {
    getViewerPose: () => ({
      transform: { position: { x: 0, y: 1.6, z: 0 }, orientation: identity },
    }),
    getHitTestResults: () => [
      { getPose: () => ({ transform: { matrix: matrix.toArray() } }) },
    ],
  };
  placement.update(frame, {}, 0.01);
  assert.equal(content.position.x, 0.1);
  assert.equal(content.position.z, -0.6);
  assert.ok(content.position.y >= 0.85 && content.position.y <= 1.18);
  placement.dispose();
  assert.equal(cancelled, true);
});

function setGlobal(name, value) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  return () => {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  };
}

test('denied session does not mutate desktop or report a successful session', async () => {
  const restoreSecure = setGlobal('isSecureContext', true);
  const restoreNavigator = setGlobal('navigator', {
    xr: {
      async requestSession() {
        throw new DOMException('denied', 'NotAllowedError');
      },
    },
  });
  const scene = new Scene();
  scene.background = new Color(0x111111);
  const originalBackground = scene.background;
  const content = new Group();
  content.position.set(2, 3, 4);
  const sessions = [];
  const manager = new XRManager({
    renderer: mockRenderer(),
    scene,
    camera: new PerspectiveCamera(),
    content,
    onSession: (active) => sessions.push(active),
  });
  try {
    await assert.rejects(manager.enter(), { name: 'NotAllowedError' });
    assert.equal(manager.active, false);
    assert.equal(manager.entering, false);
    assert.equal(scene.background, originalBackground);
    assert.deepEqual(content.position.toArray(), [2, 3, 4]);
    assert.equal(sessions.includes(true), false);
  } finally {
    manager.dispose();
    restoreSecure();
    restoreNavigator();
  }
});

test('optional feature fallback uses local space, transparent AR and restores desktop on end', async () => {
  class MockSession extends EventTarget {
    constructor() {
      super();
      this.inputSources = [];
      this.enabledFeatures = [];
    }
    async requestReferenceSpace(type) {
      if (type === 'local-floor') throw new Error('floor not supported');
      return new EventTarget();
    }
    async end() {
      this.dispatchEvent(new Event('end'));
    }
  }
  const session = new MockSession();
  let requestedOptions;
  const restoreSecure = setGlobal('isSecureContext', true);
  const restoreNavigator = setGlobal('navigator', {
    xr: {
      async requestSession(mode, options) {
        assert.equal(mode, 'immersive-ar');
        requestedOptions = options;
        return session;
      },
    },
  });
  const scene = new Scene();
  scene.background = new Color(0x111111);
  const background = scene.background;
  const ground = new Group();
  ground.userData.xrDesktopOnly = true;
  scene.add(ground);
  const content = new Group();
  content.position.set(1, 2, 3);
  const renderer = mockRenderer();
  const sessions = [];
  const manager = new XRManager({
    renderer,
    scene,
    camera: new PerspectiveCamera(),
    content,
    onSession: (active, info) => sessions.push({ active, info }),
  });
  try {
    await manager.enter();
    assert.equal(manager.referenceSpaceType, 'local');
    assert.equal(requestedOptions.requiredFeatures, undefined);
    assert.ok(requestedOptions.optionalFeatures.includes('hand-tracking'));
    assert.equal(
      requestedOptions.optionalFeatures.includes('face-tracking'),
      false,
    );
    assert.equal(scene.background, null);
    assert.equal(renderer.alpha, 0);
    assert.equal(ground.visible, false);
    assert.equal(sessions.at(-1).info.domOverlay, false);
    await manager.exit();
    assert.equal(manager.active, false);
    assert.equal(scene.background, background);
    assert.equal(renderer.alpha, 1);
    assert.equal(ground.visible, true);
    assert.deepEqual(content.position.toArray(), [1, 2, 3]);
  } finally {
    manager.dispose();
    restoreSecure();
    restoreNavigator();
  }
});
