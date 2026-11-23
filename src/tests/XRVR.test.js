import test from 'node:test';
import assert from 'node:assert/strict';
import { Color, Group, PerspectiveCamera, Scene } from 'three';
import { XRManager } from '../xr/XRManager.js';
import { createVRSessionButton } from '../xr/VRSessionButton.js';

class Element extends EventTarget {
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.style = {};
    this.dataset = {};
    this.attributes = new Map();
    this.classList = { add() {} };
  }
  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  remove() {
    this.removed = true;
  }
  click() {
    const event = new Event('click', { cancelable: true });
    this.dispatchEvent(event);
    // Real DOM capture dispatch prevents the native onclick below.
    if (!event.defaultPrevented) this.onclick?.(event);
  }
}

class Session extends EventTarget {
  constructor() {
    super();
    this.inputSources = [];
    this.enabledFeatures = [];
    this.ended = 0;
    this.spaces = [];
  }
  async requestReferenceSpace(type) {
    this.spaces.push(type);
    if (type === 'local-floor') throw new Error('Optional floor unavailable.');
    return new EventTarget();
  }
  async requestHitTestSource() {
    throw new Error('VR must not request real-world hit tests.');
  }
  async end() {
    if (!this.ended++) this.dispatchEvent(new Event('end'));
  }
}

function setGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, value });
  return () =>
    previous
      ? Object.defineProperty(globalThis, name, previous)
      : delete globalThis[name];
}

function fixture({
  reject = false,
  failRenderer = false,
  offer = false,
  vrSupported = true,
} = {}) {
  const session = new Session(),
    requests = [],
    handObjects = [new Group(), new Group()];
  const xr = new EventTarget();
  xr.isSessionSupported = async (mode) =>
    mode === 'immersive-vr' ? vrSupported : true;
  xr.requestSession = async (mode, options) => {
    requests.push({ mode, options });
    if (reject) throw new DOMException('User declined.', 'NotAllowedError');
    return session;
  };
  if (offer)
    xr.offerSession = async (mode, options) => {
      requests.push({ mode, options, offered: true });
      return session;
    };
  const restores = [
    setGlobal('navigator', { xr, userAgent: 'test' }),
    setGlobal('isSecureContext', true),
    setGlobal('window', { isSecureContext: true }),
    setGlobal('document', {
      createElement: (tag) => new Element(tag),
      location: { href: 'https://localhost/' },
    }),
  ];
  const renderer = {
    alpha: 0,
    color: new Color(0),
    binds: 0,
    xr: {
      getHand: (i) => handObjects[i],
      setFramebufferScaleFactor() {},
      setReferenceSpaceType(type) {
        this.type = type;
      },
      async setSession(value) {
        renderer.binds++;
        if (failRenderer) throw new Error('WebGL attach failed.');
        this.session = value;
      },
      setReferenceSpace(value) {
        this.referenceSpace = value;
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
  const scene = new Scene(),
    camera = new PerspectiveCamera(),
    content = new Group(),
    events = [];
  content.position.set(2, 1, -3);
  camera.position.set(1, 2, 3);
  const manager = new XRManager({
    renderer,
    scene,
    camera,
    content,
    onSession: (active, info) => events.push({ active, info }),
  });
  return {
    manager,
    renderer,
    scene,
    camera,
    content,
    session,
    requests,
    events,
    async dispose() {
      await manager.exit();
      manager.dispose();
      for (const restore of restores.reverse()) restore();
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 12));

test('actual VRButton click requests one VR session and binds renderer exactly once', async () => {
  const f = fixture(),
    order = [],
    errors = [];
  f.camera.fov = 38;
  f.camera.zoom = 1.2;
  f.camera.scale.set(1.1, 1.2, 1.3);
  f.camera.updateProjectionMatrix();
  const desktopProjection = f.camera.projectionMatrix.clone();
  const button = createVRSessionButton({
    xrManager: f.manager,
    onGesture: () => order.push('gesture'),
    onBeforeEnter: () => order.push('before'),
    onError: (error) => errors.push(error),
  });
  try {
    await button.ready;
    assert.equal(
      button.element.id,
      'VRButton',
      'element came from the Three.js factory',
    );
    assert.equal(
      typeof button.element.onclick,
      'function',
      'factory installed its normal handler',
    );
    button.element.click();
    await settle();
    assert.deepEqual(order, ['gesture', 'before']);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].mode, 'immersive-vr');
    assert.equal(f.renderer.binds, 1);
    assert.equal(f.requests[0].options.requiredFeatures, undefined);
    assert.ok(f.requests[0].options.optionalFeatures.includes('hand-tracking'));
    assert.equal(
      f.requests[0].options.optionalFeatures.includes('hit-test'),
      false,
    );
    assert.equal(f.manager.mode, 'immersive-vr');
    assert.equal(f.manager.referenceSpaceType, 'local');
    assert.equal(f.renderer.alpha, 1);
    assert.equal(f.scene.background.getHex(), 0x102127);
    assert.equal(f.events.at(-1).info.mode, 'immersive-vr');
    assert.equal(f.events.at(-1).info.hitTest, false);
    assert.equal(button.element.textContent, 'الخروج من VR');
    assert.deepEqual(errors, []);
    // Simulate WebXRManager.updateUserCamera overwriting the normal camera.
    f.camera.position.set(0.1, 1.6, -0.2);
    f.camera.fov = 92;
    f.camera.zoom = 1;
    f.camera.scale.set(1, 1, 1);
    f.camera.updateProjectionMatrix();
    button.element.click();
    await settle();
    assert.equal(f.manager.active, false);
    assert.equal(f.scene.background, null);
    assert.equal(f.renderer.alpha, 0);
    assert.deepEqual(f.content.position.toArray(), [2, 1, -3]);
    assert.deepEqual(f.camera.position.toArray(), [1, 2, 3]);
    assert.equal(f.camera.fov, 38);
    assert.equal(f.camera.zoom, 1.2);
    assert.deepEqual(f.camera.scale.toArray(), [1.1, 1.2, 1.3]);
    assert.deepEqual(
      f.camera.projectionMatrix.elements,
      desktopProjection.elements,
    );
    assert.equal(button.element.textContent, 'الدخول إلى VR');
  } finally {
    button.dispose();
    await f.dispose();
  }
});

test('VR permission denial is caught, restores the button, and never mutates the desktop scene', async () => {
  const f = fixture({ reject: true }),
    errors = [];
  const button = createVRSessionButton({
    xrManager: f.manager,
    onError: (error) => errors.push(error),
  });
  try {
    await button.ready;
    button.element.click();
    await settle();
    assert.equal(errors.length, 1);
    assert.equal(errors[0].name, 'NotAllowedError');
    assert.equal(f.renderer.binds, 0);
    assert.equal(f.manager.entering, false);
    assert.equal(f.manager.active, false);
    assert.equal(f.scene.background, null);
    assert.deepEqual(f.content.position.toArray(), [2, 1, -3]);
    assert.equal(f.events.filter((e) => e.active).length, 0);
    assert.equal(button.element.disabled, false);
  } finally {
    button.dispose();
    await f.dispose();
  }
});

test('VRButton browser-offered session uses the same adapter without a second renderer binding', async () => {
  const f = fixture({ offer: true }),
    errors = [];
  const button = createVRSessionButton({
    xrManager: f.manager,
    onError: (error) => errors.push(error),
  });
  try {
    await button.ready;
    await settle();
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].offered, true);
    assert.equal(f.renderer.binds, 1);
    assert.equal(f.manager.mode, 'immersive-vr');
    assert.deepEqual(errors, []);
    assert.equal(button.element.textContent, 'الخروج من VR');
    await f.manager.exit();
    await settle();
    assert.equal(f.manager.active, false);
  } finally {
    button.dispose();
    await f.dispose();
  }
});

test('failed renderer setup from a browser-offered VR session ends safely after VRButton initialization', async () => {
  const f = fixture({ offer: true, failRenderer: true }),
    errors = [];
  const button = createVRSessionButton({
    xrManager: f.manager,
    onError: (error) => errors.push(error),
  });
  try {
    await button.ready;
    await settle();
    await settle();
    assert.equal(errors.length, 1);
    assert.equal(f.renderer.binds, 1);
    assert.equal(f.session.ended, 1);
    assert.equal(f.manager.active, false);
    assert.equal(f.manager.entering, false);
    assert.equal(f.scene.background, null);
    assert.equal(f.events.filter((e) => e.active).length, 0);
  } finally {
    button.dispose();
    await f.dispose();
  }
});

test('an active VR session excludes AR startup; ending it restores AR availability', async () => {
  const f = fixture();
  try {
    await f.manager.enterVR();
    await assert.rejects(f.manager.enter());
    assert.equal(f.requests.length, 1);
    assert.equal(f.renderer.binds, 1);
    await f.manager.exit();
    assert.equal(f.manager.mode, null);
  } finally {
    await f.dispose();
  }
});

test('AR and VR support checks are independent and unavailable VR cannot dispatch a request', async () => {
  const f = fixture({ vrSupported: false });
  const button = createVRSessionButton({ xrManager: f.manager });
  try {
    await button.ready;
    const ar = await f.manager.checkSupport();
    assert.equal(ar.supported, true);
    assert.equal(f.manager.vrSupport.supported, false);
    assert.equal(button.element.disabled, true);
    button.element.click();
    await settle();
    assert.equal(f.requests.length, 0);
  } finally {
    button.dispose();
    await f.dispose();
  }
});
