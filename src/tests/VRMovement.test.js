import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Group,
  PerspectiveCamera,
  Quaternion,
  Ray,
  Scene,
  Vector3,
} from 'three';
import { Locomotion } from '../xr/Locomotion.js';
import { XRManager } from '../xr/XRManager.js';
const pose = (x = 0, y = 1.6, z = 0, yaw = 0) => ({
  position: new Vector3(x, y, z),
  orientation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
});
const stick = (handedness, x = 0, y = 0) => ({
  handedness,
  gamepad: {
    axes: [0, 0, x, y],
    buttons: [{ pressed: false }, { pressed: false }],
  },
  targetRaySpace: {},
});
function fixture() {
  const scene = new Scene(),
    camera = new PerspectiveCamera(),
    hand = new Group(),
    events = [];
  scene.add(camera, hand);
  const movement = new Locomotion({
    scene,
    camera,
    onStatus: (e) => events.push(e),
  });
  movement.start([hand]);
  movement.update(pose(), [], 1 / 72);
  return { scene, camera, hand, movement, events };
}

test('Quest left stick translates head-relative on the floor with deadzone, bounded speed and no camera rotation', () => {
  const f = fixture(),
    m = f.movement;
  try {
    m.update(pose(), [stick('left', 0.1, -0.1)], 0.05);
    assert.equal(m.translation.length(), 0);
    for (let i = 0; i < 144; i++)
      m.update(pose(0, 1.6, 0, Math.PI / 2), [stick('left', 0, -1)], 1 / 72);
    assert.ok(m.translation.x < -1.4 && m.translation.x > -1.61);
    assert.ok(Math.abs(m.translation.z) < 1e-8);
    assert.equal(m.translation.y, 0);
    assert.equal(f.camera.quaternion.angleTo(new Quaternion()), 0);
    const before = m.translation.clone();
    m.update(pose(), [stick('left', 0, -1)], 100);
    assert.ok(before.distanceTo(m.translation) <= 0.04 + 1e-8);
    assert.ok(f.events.some((e) => e.kind === 'locomotion-step'));
  } finally {
    m.dispose();
  }
});

test('snap turn is exactly 30 degrees per stick excursion and preserves actual eye position in both views', () => {
  const f = fixture(),
    m = f.movement,
    head = pose(0.31, 1.6, -0.16);
  try {
    m.update(head, [], 0.02);
    for (const thirdPerson of [false, true]) {
      m.setThirdPerson(thirdPerson);
      m.update(head, [], 0.02);
      const position = m.worldPosition(head.position),
        yaw = m.yaw;
      for (let i = 0; i < 20; i++) m.update(head, [stick('right', 1, 0)], 0.02);
      assert.ok(Math.abs(m.yaw - yaw + Math.PI / 6) < 1e-8);
      assert.ok(position.distanceTo(m.worldPosition(head.position)) < 1e-8);
      m.update(head, [stick('right', 0, 0)], 0.02);
      m.update(head, [stick('right', -1, 0)], 0.02);
      assert.ok(Math.abs(m.yaw - yaw) < 1e-8);
      assert.ok(position.distanceTo(m.worldPosition(head.position)) < 1e-8);
    }
  } finally {
    m.dispose();
  }
});

test('pause, pose loss and mode changes stop drift and require a centered stick before resuming', () => {
  const f = fixture(),
    m = f.movement,
    input = [stick('left', 0, -1)];
  try {
    m.update(pose(), input, 0.05);
    const before = m.translation.clone();
    m.setEnabled(false);
    for (let i = 0; i < 20; i++) m.update(pose(), input, 0.05);
    assert.ok(m.translation.equals(before));
    assert.equal(m.moveStep('forward'), false);
    m.setEnabled(true);
    m.update(pose(), input, 0.05);
    assert.ok(m.translation.equals(before));
    m.update(pose(), [], 0.02);
    m.update(pose(), input, 0.05);
    assert.ok(!m.translation.equals(before));
    m.update(null, input, 0.02);
    assert.equal(m.moveStep('forward'), false);
    const lost = m.translation.clone();
    m.update(pose(), input, 0.02);
    assert.ok(m.translation.equals(lost));
    m.update(pose(), [], 0.02);
    assert.equal(m.moveStep('forward'), true);
    const invalid = pose();
    invalid.position.x = NaN;
    m.update(invalid, [], 0.02);
    assert.ok(m.rig.position.toArray().every(Number.isFinite));
  } finally {
    m.dispose();
  }
});

test('third-person avatar uses a deliberate offset while hands and camera share the rig; stopping restores parents', () => {
  const f = fixture(),
    m = f.movement;
  try {
    assert.equal(m.setThirdPerson(true), true);
    assert.equal(m.avatar.visible, true);
    assert.ok(m.rig.position.z > 1);
    assert.ok(m.rig.position.x > 0.3);
    assert.equal(f.camera.parent, m.rig);
    assert.equal(f.hand.parent, m.rig);
    const before = m.rig.position.clone();
    m.update(pose(0, 1.6, 0, 0.8), [], 0.02);
    assert.ok(
      m.rig.position.equals(before),
      'looking around never forces the chase camera to orbit',
    );
    m.moveStep('left');
    m.turnStep(-1);
    const local = new Vector3(0.2, 1.1, -0.4);
    assert.ok(
      m.worldPosition(local).distanceTo(m.rig.localToWorld(local.clone())) <
        1e-8,
    );
    m.setThirdPerson(false);
    assert.equal(m.avatar.visible, false);
    assert.equal(m.chase.length(), 0);
    m.stop();
    assert.equal(f.camera.parent, f.scene);
    assert.equal(f.hand.parent, f.scene);
    assert.equal(m.rig.position.length(), 0);
  } finally {
    m.dispose();
  }
});

test('XR controller rays, grips and hand joint positions follow player transforms; third-person hand rays retain tool manipulation', () => {
  const scene = new Scene(),
    camera = new PerspectiveCamera(),
    content = new Group(),
    inputs = [];
  const hands = [new Group(), new Group()];
  scene.add(camera, content);
  const renderer = {
    xr: {
      enabled: false,
      getHand: (i) => hands[i],
      setFramebufferScaleFactor() {},
    },
  };
  const manager = new XRManager({
    renderer,
    scene,
    camera,
    content,
    onInput: (e) => inputs.push(e),
  });
  const source = stick('right');
  manager.session = { visibilityState: 'visible', inputSources: [source] };
  manager.mode = 'immersive-vr';
  manager.referenceSpace = {};
  manager.placement.pending = false;
  const controllerPose = pose(0.2, 1.2, -0.4);
  const frame = {
    session: manager.session,
    getViewerPose: () => ({ transform: pose() }),
    getPose: () => ({ transform: controllerPose }),
  };
  try {
    manager.locomotion.start(hands);
    manager.update(frame, 0.02);
    manager.moveStep('left');
    manager.turnStep(1);
    source.gamepad.buttons[1].pressed = true;
    manager.update(frame, 0.02);
    const event = inputs.at(-1);
    assert.equal(event.phase, 'start', 'grip button starts manipulation');
    assert.ok(
      event.ray.origin.distanceTo(
        manager.locomotion.worldPosition(controllerPose.position),
      ) < 1e-8,
    );
    assert.ok(
      event.quaternion.angleTo(
        manager.locomotion.worldQuaternion(controllerPose.orientation),
      ) < 1e-7,
    );
    manager.emitHand({
      id: 'hand-left',
      source: 'hand',
      phase: 'start',
      position: controllerPose.position,
      indexPosition: controllerPose.position,
      quaternion: controllerPose.orientation,
      uiRay: new Ray(controllerPose.position, new Vector3(0, 0, -1)),
    });
    assert.equal(inputs.at(-1).source, 'hand');
    assert.ok(
      inputs
        .at(-1)
        .position.distanceTo(
          manager.locomotion.worldPosition(controllerPose.position),
        ) < 1e-8,
    );
    manager.setThirdPerson(true);
    manager.emitHand({
      id: 'hand-left',
      source: 'hand',
      phase: 'start',
      position: controllerPose.position,
      indexPosition: controllerPose.position,
      quaternion: controllerPose.orientation,
      uiRay: new Ray(controllerPose.position, new Vector3(0, 0, -1)),
    });
    assert.equal(inputs.at(-1).source, 'controller');
    assert.equal(inputs.at(-1).originalSource, 'hand');
    assert.ok(inputs.at(-1).ray);
    const before = manager.locomotion.rig.position.clone();
    const readPose = frame.getPose;
    frame.getPose = () => null;
    source.gamepad.axes = [0, 0, 1, 0];
    manager.update(frame, 0.05);
    assert.ok(manager.locomotion.rig.position.equals(before));
    const yaw = manager.locomotion.yaw;
    frame.getPose = readPose;
    manager.update(frame, 0.05);
    assert.equal(
      manager.locomotion.yaw,
      yaw,
      'tracking recovery needs a neutral stick',
    );
    source.gamepad.axes = [0, 0, 0, 0];
    manager.update(frame, 0.02);
    manager.session.visibilityState = 'visible-blurred';
    source.gamepad.axes = [0, 0, 1, 0];
    manager.update(frame, 0.05);
    assert.ok(manager.locomotion.rig.position.equals(before));
  } finally {
    manager.session = null;
    manager.dispose();
  }
});
