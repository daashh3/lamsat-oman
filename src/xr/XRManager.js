import {
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  Quaternion,
  Ray,
  Vector3,
} from 'three';
import { HandTrackingManager } from './HandTracking.js';
import { HitTestPlacement } from './HitTestPlacement.js';
import { Locomotion } from './Locomotion.js';
import { FaceTrackingAdapter } from './FaceTrackingAdapter.js';

/** Owns exactly one AR or VR session; both modes share placement and input. */
export class XRManager extends EventTarget {
  constructor({
    renderer,
    scene,
    camera,
    content,
    overlay,
    onStatus = () => {},
    onInput = () => {},
    onSession = () => {},
    onViewerPose = () => {},
  }) {
    super();
    Object.assign(this, {
      renderer,
      scene,
      camera,
      content,
      overlay,
      onStatus,
      onInput,
      onSession,
      onViewerPose,
    });
    this.session = null;
    this.mode = null;
    this.referenceSpace = null;
    this.referenceSpaceType = null;
    this.entering = false;
    this.support = {
      supported: false,
      secure: globalThis.isSecureContext === true,
      reason: 'لم يتم الفحص بعد',
    };
    this.vrSupport = {
      supported: false,
      secure: globalThis.isSecureContext === true,
      reason: 'لم يتم فحص VR بعد',
    };
    this.controllers = new Map();
    this.nextControllerId = 0;
    this.hiddenObjects = [];
    this.renderer.xr.enabled = true;
    this.renderer.xr.setFramebufferScaleFactor(0.85);
    this.handTracking = new HandTrackingManager({
      renderer,
      scene,
      onInput: (event) => this.emitHand(event),
      onTracking: (count) =>
        this.onStatus({
          kind: 'tracking',
          count,
          message: count
            ? `تتبع اليدين نشط · ${count}`
            : 'ضع يديك أمام النظارة أو استخدم وحدات التحكم',
        }),
    });
    this.placement = new HitTestPlacement({ content, onStatus });
    this.locomotion = new Locomotion({ scene, camera, onStatus });
    this.faceTracking = new FaceTrackingAdapter();
    this.boundEnd = (event) => {
      if (event.target === this.session) this.cleanupSession();
    };
    this.boundSelectStart = (event) => {
      if (!event.inputSource.hand)
        this.controllerState(event.inputSource).selected = true;
    };
    this.boundSelectEnd = (event) => {
      if (!event.inputSource.hand)
        this.controllerState(event.inputSource).selected = false;
    };
    this.boundVisibility = () => {
      const visible = this.session?.visibilityState === 'visible';
      if (!visible) {
        this.cancelInputs();
        this.locomotion.suspend();
      }
      this.onStatus({
        kind: 'visibility',
        visible,
        message: visible
          ? 'التجربة نشطة'
          : 'التجربة متوقفة مؤقتاً أثناء ظهور واجهة النظام',
      });
    };
    this.boundReferenceReset = () => this.recenter();
    // Do not allow a DOM-overlay button press to also activate the exhibit behind it.
    this.boundBeforeXRSelect = (event) => {
      if (
        event.target?.closest?.(
          'button, input, select, dialog, [role="button"]',
        )
      )
        event.preventDefault();
    };
    overlay?.addEventListener('beforexrselect', this.boundBeforeXRSelect);
  }

  get active() {
    return !!this.session;
  }
  get hands() {
    const hands = this.handTracking.hands;
    if (!this.locomotion.active) return hands;
    // Third-person hand rays use the same manipulation path as controllers.
    // Suppress direct two-hand shaping behind the avatar in that view.
    if (this.locomotion.thirdPerson) return [];
    return hands.map((hand) => {
      const world = { ...hand };
      for (const key of [
        'wrist',
        'palm',
        'thumb',
        'index',
        'middle',
        'midpoint',
      ])
        world[key] = this.locomotion.worldPosition(hand[key]);
      world.quaternion = this.locomotion.worldQuaternion(hand.quaternion);
      world.uiRay = this.worldRay(hand.uiRay);
      return world;
    });
  }
  get domOverlay() {
    return !!this.session?.domOverlayState;
  }

  worldRay(ray) {
    if (!ray) return null;
    const result = ray.clone();
    if (this.locomotion.active) {
      this.locomotion.worldPosition(ray.origin, result.origin);
      result.direction.applyQuaternion(this.locomotion.rotation).normalize();
    }
    return result;
  }

  emitHand(event) {
    if (!this.locomotion?.active) {
      this.onInput(event);
      return;
    }
    const world = {
      ...event,
      position: this.locomotion.worldPosition(event.position),
      indexPosition: this.locomotion.worldPosition(event.indexPosition),
      quaternion: this.locomotion.worldQuaternion(event.quaternion),
      uiRay: this.worldRay(event.uiRay),
    };
    if (this.locomotion.thirdPerson && world.uiRay) {
      world.ray = world.uiRay;
      world.source = 'controller';
      world.originalSource = 'hand';
    }
    this.onInput(world);
  }

  setLocomotionEnabled(enabled) {
    this.locomotion.setEnabled(enabled);
  }

  setThirdPerson(enabled) {
    if (this.mode !== 'immersive-vr' || !this.session || this.placement.pending)
      return false;
    this.cancelInputs();
    return this.locomotion.setThirdPerson(enabled);
  }

  toggleThirdPerson() {
    return this.setThirdPerson(!this.locomotion.thirdPerson);
  }

  moveStep(direction) {
    if (this.mode !== 'immersive-vr' || this.placement.pending) return false;
    return this.locomotion.moveStep(direction);
  }

  turnStep(direction) {
    if (this.mode !== 'immersive-vr' || this.placement.pending) return false;
    return this.locomotion.turnStep(direction);
  }

  notifySession(active, info) {
    this.onSession(active, info);
    this.dispatchEvent(new Event('sessionchange'));
  }

  /** Test VR independently: support for AR does not imply support for VR. */
  async checkVRSupport() {
    const secure = globalThis.isSecureContext === true;
    let supported = false,
      reason = 'الواقع الافتراضي غير متاح في هذا المتصفح';
    if (!secure) reason = 'يتطلب الواقع الافتراضي رابط HTTPS آمناً';
    else if (globalThis.navigator?.xr?.isSessionSupported) {
      try {
        supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (supported) reason = 'الواقع الافتراضي جاهز';
      } catch (error) {
        reason = `تعذّر فحص الواقع الافتراضي: ${error.message}`;
      }
    }
    this.vrSupport = { supported, secure, reason };
    this.onStatus({ kind: 'vr-support', ...this.vrSupport, message: reason });
    return this.vrSupport;
  }

  async checkSupport() {
    const secure = globalThis.isSecureContext === true;
    if (!secure)
      this.support = {
        supported: false,
        secure,
        reason: 'يحتاج الواقع المختلط إلى رابط HTTPS آمن',
      };
    else if (!globalThis.navigator?.xr?.isSessionSupported) {
      this.support = {
        supported: false,
        secure,
        reason: 'استمتع بنسخة المتصفح، أو افتح الرابط على Meta Quest',
      };
    } else {
      try {
        const supported = await navigator.xr.isSessionSupported('immersive-ar');
        this.support = {
          supported,
          secure,
          reason: supported
            ? 'الواقع المختلط متاح'
            : 'الواقع المختلط غير متاح في هذا المتصفح',
        };
      } catch (error) {
        this.support = {
          supported: false,
          secure,
          reason: 'تعذّر فحص الواقع المختلط',
          error: error.message,
        };
      }
    }
    this.onStatus({
      kind: 'support',
      ...this.support,
      message: this.support.reason,
    });
    return this.support;
  }

  sessionOptions(mode = 'immersive-ar') {
    const options = { optionalFeatures: ['local-floor', 'hand-tracking'] };
    if (mode === 'immersive-ar') options.optionalFeatures.push('hit-test');
    if (this.overlay) {
      options.optionalFeatures.push('dom-overlay');
      options.domOverlay = { root: this.overlay };
    }
    return options;
  }

  enter() {
    return this.enterMode('immersive-ar');
  }
  enterVR() {
    return this.enterMode('immersive-vr');
  }

  async enterMode(mode) {
    if (this.active || this.entering)
      throw new Error('أغلق جلسة الواقع الحالية قبل بدء جلسة أخرى.');
    if (
      !globalThis.isSecureContext ||
      !globalThis.navigator?.xr?.requestSession
    ) {
      throw new Error(
        'يلزم متصفح يدعم WebXR ورابط HTTPS آمن. يمكنك متابعة الرحلة على الشاشة.',
      );
    }
    this.entering = true;
    this.dispatchEvent(new Event('sessionchange'));
    this.onStatus({
      kind: 'session',
      mode,
      entering: true,
      message: 'جارٍ بدء التجربة الغامرة…',
    });
    let session;
    try {
      // No awaited support check before requestSession: preserve the click activation.
      session = await navigator.xr.requestSession(
        mode,
        this.sessionOptions(mode),
      );
      return await this.adoptSession(session, mode, { fromRequest: true });
    } catch (error) {
      // adoptSession owns cleanup once a session exists. A denied request has no
      // renderer state to undo and must not be reported as a successful entry.
      if (!session) this.reportEntryError(error);
      throw error;
    } finally {
      this.entering = false;
      this.dispatchEvent(new Event('sessionchange'));
    }
  }

  reportEntryError(error) {
    this.onStatus({
      kind: 'error',
      message:
        error.name === 'NotAllowedError' || error.name === 'SecurityError'
          ? 'لم يُسمح ببدء التجربة الغامرة. يمكنك المتابعة على الشاشة أو المحاولة مجدداً.'
          : `تعذّر بدء التجربة الغامرة: ${error.message}`,
    });
  }

  /**
   * Attach a browser session exactly once. VRButton's renderer adapter also uses
   * this path when the browser offers a session through its own XR interface.
   */
  async adoptSession(
    session,
    mode,
    { fromRequest = false, endOnFailure = true } = {},
  ) {
    if (this.session === session) return session;
    if (this.active || (this.entering && !fromRequest))
      throw new Error('توجد جلسة غامرة قيد التشغيل أو الإعداد.');
    if (!['immersive-ar', 'immersive-vr'].includes(mode))
      throw new Error('Unsupported immersive session mode.');
    const ownsEntering = !this.entering;
    if (ownsEntering) this.entering = true;
    try {
      this.session = session;
      this.mode = mode;
      session.addEventListener('end', this.boundEnd);
      session.addEventListener('selectstart', this.boundSelectStart);
      session.addEventListener('selectend', this.boundSelectEnd);
      session.addEventListener('visibilitychange', this.boundVisibility);
      this.desktopState = {
        background: this.scene.background,
        clearColor: this.renderer.getClearColor(new Color()).clone(),
        clearAlpha: this.renderer.getClearAlpha(),
        contentPosition: this.content.position.clone(),
        contentQuaternion: this.content.quaternion.clone(),
        contentScale: this.content.scale.clone(),
        contentVisible: this.content.visible,
        cameraPosition: this.camera.position.clone(),
        cameraQuaternion: this.camera.quaternion.clone(),
        cameraScale: this.camera.scale.clone(),
        cameraFov: this.camera.fov,
        cameraZoom: this.camera.zoom,
      };
      // AR remains transparent. VR gets a quiet opaque exhibition background.
      this.scene.background =
        mode === 'immersive-ar' ? null : new Color(0x102127);
      this.renderer.setClearColor(
        mode === 'immersive-ar' ? 0x000000 : 0x102127,
        mode === 'immersive-ar' ? 0 : 1,
      );
      this.scene.traverse((object) => {
        if (object.userData.xrDesktopOnly) {
          this.hiddenObjects.push({ object, visible: object.visible });
          object.visible = false;
        }
      });
      this.content.visible = false;
      try {
        this.referenceSpace =
          await session.requestReferenceSpace('local-floor');
        this.referenceSpaceType = 'local-floor';
      } catch {
        this.referenceSpace = await session.requestReferenceSpace('local');
        this.referenceSpaceType = 'local';
      }
      if (this.session !== session)
        throw new DOMException('Session ended during setup.', 'AbortError');
      this.renderer.xr.setReferenceSpaceType(this.referenceSpaceType);
      await this.renderer.xr.setSession(session);
      if (this.session !== session)
        throw new DOMException('Session ended during setup.', 'AbortError');
      this.renderer.xr.setReferenceSpace(this.referenceSpace);
      this.referenceSpace.addEventListener('reset', this.boundReferenceReset);
      this.renderer.xr.setFoveation?.(0.5);
      if (mode === 'immersive-vr')
        this.locomotion.start(
          this.handTracking.handModels.map(({ hand }) => hand),
        );
      // Hit test setup cannot block a playable, stable viewer-relative placement.
      const hitTest =
        mode === 'immersive-ar' ? await this.placement.init(session) : false;
      if (mode === 'immersive-vr') {
        this.placement.dispose();
        this.placement.recenter();
      }
      if (this.session !== session) return null;
      const info = {
        mode,
        domOverlay: this.domOverlay,
        referenceSpace: this.referenceSpaceType,
        hitTest,
        features: session.enabledFeatures
          ? Array.from(session.enabledFeatures)
          : [],
      };
      this.notifySession(true, info);
      this.onStatus({
        kind: 'session',
        active: true,
        message: 'انظر أمامك لاختيار موضع المعرض',
        ...info,
      });
      return session;
    } catch (error) {
      if (endOnFailure) {
        try {
          await session.end();
        } catch {
          /* Already ended during setup. */
        }
      }
      if (this.session === session) this.cleanupSession();
      this.reportEntryError(error);
      throw error;
    } finally {
      if (ownsEntering) this.entering = false;
      this.dispatchEvent(new Event('sessionchange'));
    }
  }

  controllerState(source) {
    let state = this.controllers.get(source);
    if (!state) {
      const line = new Line(
        new BufferGeometry().setFromPoints([
          new Vector3(),
          new Vector3(0, 0, -0.7),
        ]),
        new LineBasicMaterial({
          color: 0x78e5d1,
          transparent: true,
          opacity: 0.65,
          depthTest: false,
        }),
      );
      line.frustumCulled = false;
      line.visible = false;
      this.scene.add(line);
      state = {
        id: `controller-${this.nextControllerId++}`,
        selected: false,
        pressed: false,
        mustRelease: false,
        position: new Vector3(),
        quaternion: new Quaternion(),
        ray: new Ray(),
        line,
        tracked: false,
      };
      this.controllers.set(source, state);
    }
    return state;
  }

  emitController(state, phase, dt = 0) {
    this.onInput({
      type: 'pointer',
      id: state.id,
      phase,
      source: 'controller',
      position: state.position.clone(),
      quaternion: state.quaternion.clone(),
      ray: state.ray.clone(),
      pinching: state.pressed,
      dt,
    });
  }

  controllerPose(frame, source) {
    try {
      const pose = frame.getPose(source.targetRaySpace, this.referenceSpace);
      const p = pose?.transform?.position,
        q = pose?.transform?.orientation;
      return p &&
        q &&
        [p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(Number.isFinite) &&
        q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w > 1e-9
        ? pose
        : null;
    } catch {
      return null;
    }
  }

  updateControllers(frame, dt) {
    const seen = new Set();
    for (const source of this.session.inputSources) {
      if (source.hand) continue;
      const state = this.controllerState(source);
      seen.add(source);
      const pose = this.controllerPose(frame, source);
      if (!pose) {
        if (state.pressed) this.emitController(state, 'cancel');
        state.pressed = false;
        state.mustRelease = true;
        state.tracked = false;
        state.line.visible = false;
        continue;
      }
      state.tracked = true;
      state.quaternion.copy(pose.transform.orientation);
      state.ray.origin.copy(pose.transform.position);
      if (this.locomotion.active) {
        this.locomotion.worldPosition(state.ray.origin, state.ray.origin);
        this.locomotion.worldQuaternion(state.quaternion, state.quaternion);
      }
      state.ray.direction
        .set(0, 0, -1)
        .applyQuaternion(state.quaternion)
        .normalize();
      state.ray.at(0.45, state.position);
      state.line.position.copy(state.ray.origin);
      state.line.quaternion.copy(state.quaternion);
      state.line.visible = true;
      const button = source.gamepad?.buttons?.[0];
      const selected =
        state.selected ||
        !!button?.pressed ||
        !!source.gamepad?.buttons?.[1]?.pressed;
      if (!selected) state.mustRelease = false;
      const wasPressed = state.pressed;
      state.pressed = selected && !state.mustRelease;
      if (!wasPressed && state.pressed) this.emitController(state, 'start', dt);
      else if (wasPressed && !state.pressed)
        this.emitController(state, 'end', dt);
      else this.emitController(state, state.pressed ? 'move' : 'hover', dt);
    }
    for (const [source, state] of this.controllers) {
      if (!seen.has(source)) {
        if (state.pressed) this.emitController(state, 'cancel');
        this.removeController(source, state);
      }
    }
  }

  removeController(source, state) {
    this.scene.remove(state.line);
    state.line.geometry.dispose();
    state.line.material.dispose();
    this.controllers.delete(source);
  }

  update(frame, dt = 1 / 72) {
    if (!this.session || !frame || !this.referenceSpace) return;
    if (['hidden', 'visible-blurred'].includes(this.session.visibilityState)) {
      this.locomotion.suspend();
      return;
    }
    dt = Math.max(0.001, Math.min(dt, 0.05));
    const viewerPose = frame.getViewerPose?.(this.referenceSpace);
    if (this.locomotion.active) {
      this.locomotion.update(
        viewerPose?.transform,
        this.placement.pending ? [] : this.session.inputSources,
        dt,
        [...this.session.inputSources].every(
          (source) =>
            source.hand ||
            !source.gamepad ||
            this.controllerPose(frame, source),
        ),
      );
      if (!viewerPose) {
        this.cancelInputs();
        return;
      }
    }
    const worldPose =
      viewerPose && this.locomotion.active
        ? { transform: this.locomotion.worldPose(viewerPose.transform) }
        : viewerPose;
    // Placement remains world-fixed; recenter explicitly uses the moved viewer.
    const placementFrame = this.locomotion.active
      ? { getViewerPose: () => worldPose }
      : frame;
    this.placement.update(placementFrame, this.referenceSpace, dt);
    if (this.placement.pending) {
      this.locomotion.suspend();
      return;
    }
    this.content.visible = true;
    if (worldPose) this.onViewerPose(worldPose.transform);
    this.handTracking.update(frame, this.referenceSpace, dt);
    this.updateControllers(frame, dt);
  }

  recenter() {
    if (!this.session) return;
    this.cancelInputs();
    this.placement.recenter();
    this.onStatus({
      kind: 'placement',
      placed: false,
      message: 'انظر إلى المساحة المريحة أمامك',
    });
  }

  setComfort(options) {
    this.placement.setComfort(options);
  }

  cancelInputs() {
    this.handTracking.cancelAll();
    for (const state of this.controllers.values()) {
      if (state.pressed) this.emitController(state, 'cancel');
      state.pressed = false;
      state.mustRelease = true;
    }
  }

  async exit() {
    if (this.session) await this.session.end();
  }

  cleanupSession() {
    const wasActive = !!this.session || !!this.desktopState;
    const session = this.session;
    const mode = this.mode;
    this.session = null;
    this.mode = null;
    session?.removeEventListener('end', this.boundEnd);
    session?.removeEventListener('selectstart', this.boundSelectStart);
    session?.removeEventListener('selectend', this.boundSelectEnd);
    session?.removeEventListener('visibilitychange', this.boundVisibility);
    this.referenceSpace?.removeEventListener('reset', this.boundReferenceReset);
    this.referenceSpace = null;
    this.cancelInputs();
    this.locomotion.stop();
    this.placement.dispose();
    for (const [source, state] of this.controllers)
      this.removeController(source, state);
    if (this.desktopState) {
      const previous = this.desktopState;
      this.scene.background = previous.background;
      this.renderer.setClearColor(previous.clearColor, previous.clearAlpha);
      this.content.position.copy(previous.contentPosition);
      this.content.quaternion.copy(previous.contentQuaternion);
      this.content.scale.copy(previous.contentScale);
      this.content.visible = previous.contentVisible;
      this.camera.position.copy(previous.cameraPosition);
      this.camera.quaternion.copy(previous.cameraQuaternion);
      this.camera.scale.copy(previous.cameraScale);
      // Three's WebXRManager replaces the user camera's FOV/zoom each frame.
      // Restore its desktop lens as well as its transform before rebuilding it.
      this.camera.fov = previous.cameraFov;
      this.camera.zoom = previous.cameraZoom;
      this.camera.updateProjectionMatrix();
      this.desktopState = null;
    }
    for (const { object, visible } of this.hiddenObjects)
      object.visible = visible;
    this.hiddenObjects.length = 0;
    if (wasActive) {
      this.notifySession(false, {
        mode,
        domOverlay: false,
        referenceSpace: null,
        hitTest: false,
      });
      this.onStatus({
        kind: 'session',
        active: false,
        message: 'تم الرجوع إلى نسخة الشاشة',
      });
    }
  }

  dispose() {
    this.exit().catch(() => this.cleanupSession());
    this.overlay?.removeEventListener(
      'beforexrselect',
      this.boundBeforeXRSelect,
    );
    this.locomotion.dispose();
    this.handTracking.dispose();
  }
}

export default XRManager;
