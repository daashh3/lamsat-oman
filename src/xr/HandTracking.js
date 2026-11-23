import { Quaternion, Ray, Vector3 } from 'three';
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

const JOINTS = {
  wrist: 'wrist',
  palm: 'middle-finger-metacarpal',
  thumb: 'thumb-tip',
  index: 'index-finger-tip',
  middle: 'middle-finger-tip',
};

const finitePosition = (p) => p && [p.x, p.y, p.z].every(Number.isFinite);
const validOrientation = (q) =>
  q &&
  [q.x, q.y, q.z, q.w].every(Number.isFinite) &&
  q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w > 1e-12;

/** Real articulated WebXR input. All returned positions are in renderer reference space. */
export class HandTrackingManager {
  constructor({ renderer, scene, onInput = () => {}, onTracking = () => {} }) {
    this.renderer = renderer;
    this.scene = scene;
    this.onInput = onInput;
    this.onTracking = onTracking;
    this.states = new Map();
    this.handModels = [];
    this.previousCount = 0;
    this.mustOpenHands = new Set();
    const factory = new XRHandModelFactory();
    for (let i = 0; i < 2; i++) {
      const hand = renderer.xr.getHand(i);
      // The spheres profile is procedural and needs no remote model files.
      const model = factory.createHandModel(hand, 'spheres');
      hand.add(model);
      scene.add(hand);
      this.handModels.push({ hand, model });
    }
  }

  get hands() {
    return [...this.states.values()].filter((hand) => hand.tracked);
  }

  createState(source) {
    const key = source.handedness || 'none';
    const state = {
      id: `hand-${key}`,
      handedness: key,
      source,
      wrist: new Vector3(),
      palm: new Vector3(),
      thumb: new Vector3(),
      index: new Vector3(),
      middle: new Vector3(),
      midpoint: new Vector3(),
      quaternion: new Quaternion(),
      tracked: false,
      pinching: false,
      uiRay: null,
      lostTime: 0,
      initialized: false,
      mustOpen: this.mustOpenHands.has(key),
    };
    this.states.set(source, state);
    return state;
  }

  emit(state, phase, dt = 0) {
    this.onInput({
      type: 'pointer',
      id: state.id,
      phase,
      source: 'hand',
      handedness: state.handedness,
      pinching: state.pinching,
      position: (phase === 'hover' ? state.index : state.midpoint).clone(),
      indexPosition: state.index.clone(),
      quaternion: state.quaternion.clone(),
      dt,
      // UI aiming is separate from direct hand positions used to grab exhibits.
      uiRay: state.uiRay?.clone() ?? null,
    });
  }

  lose(state, dt, immediate = false) {
    state.lostTime += Number.isFinite(dt) && dt > 0 ? dt : 0;
    state.tracked = false;
    state.uiRay = null;
    // Never interpolate through unobserved space after even a brief pose gap.
    state.initialized = false;
    if (immediate || state.lostTime > 0.16) {
      if (state.pinching) this.emit(state, 'cancel');
      state.pinching = false;
      state.initialized = false;
      // Require an open pinch before reacquiring; a lost grip must never auto-grab.
      state.mustOpen = true;
      this.mustOpenHands.add(state.handedness);
    }
  }

  readUIRay(source, frame, referenceSpace) {
    if (!source.targetRaySpace || typeof frame.getPose !== 'function')
      return null;
    try {
      const pose = frame.getPose(source.targetRaySpace, referenceSpace);
      const transform = pose?.transform;
      if (
        !finitePosition(transform?.position) ||
        !validOrientation(transform?.orientation)
      )
        return null;
      const orientation = new Quaternion()
        .copy(transform.orientation)
        .normalize();
      return new Ray(
        new Vector3().copy(transform.position),
        new Vector3(0, 0, -1).applyQuaternion(orientation).normalize(),
      );
    } catch {
      // An unavailable aim pose must not interrupt tracked fingertip input.
      return null;
    }
  }

  update(frame, referenceSpace, dt) {
    // Invalid/stale time cannot produce an interpolation factor or gesture.
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) {
      for (const state of this.states.values()) this.lose(state, 0, true);
      if (this.previousCount) this.onTracking(0);
      this.previousCount = 0;
      return;
    }
    const sources = frame?.session?.inputSources;
    if (
      !sources ||
      !referenceSpace ||
      typeof frame.getJointPose !== 'function'
    ) {
      this.cancelAll();
      return;
    }
    const seen = new Set();
    for (const source of sources) {
      if (!source.hand) continue;
      const state = this.states.get(source) || this.createState(source);
      seen.add(source);
      const poses = {};
      try {
        for (const [name, jointName] of Object.entries(JOINTS)) {
          const joint = source.hand.get(jointName);
          poses[name] = joint
            ? frame.getJointPose(joint, referenceSpace)
            : null;
          if (!finitePosition(poses[name]?.transform?.position))
            poses[name] = null;
        }
      } catch {
        this.lose(state, dt);
        continue;
      }
      if (
        !poses.index ||
        !poses.thumb ||
        !poses.wrist ||
        !validOrientation(poses.wrist.transform.orientation)
      ) {
        this.lose(state, dt);
        continue;
      }
      const alpha = state.initialized ? 1 - Math.exp(-30 * dt) : 1;
      for (const [name, pose] of Object.entries(poses)) {
        if (!pose) continue;
        const p = pose.transform.position;
        state[name].lerp(new Vector3(p.x, p.y, p.z), alpha);
      }
      if (!poses.palm) state.palm.copy(state.wrist).lerp(state.index, 0.4);
      if (!poses.middle) state.middle.copy(state.index);
      const orientation = poses.wrist.transform.orientation;
      state.quaternion.slerp(
        new Quaternion(
          orientation.x,
          orientation.y,
          orientation.z,
          orientation.w,
        ).normalize(),
        alpha,
      );
      state.midpoint.copy(state.thumb).add(state.index).multiplyScalar(0.5);
      state.tracked = true;
      state.initialized = true;
      state.lostTime = 0;
      state.uiRay = this.readUIRay(source, frame, referenceSpace);
      const distance = state.thumb.distanceTo(state.index);
      if (distance > 0.034) {
        state.mustOpen = false;
        this.mustOpenHands.delete(state.handedness);
      }
      const wasPinching = state.pinching;
      state.pinching =
        !state.mustOpen && distance < (wasPinching ? 0.034 : 0.022);
      if (!wasPinching && state.pinching) this.emit(state, 'start', dt);
      else if (wasPinching && !state.pinching) this.emit(state, 'end', dt);
      else if (state.pinching) this.emit(state, 'move', dt);
      else this.emit(state, 'hover', dt);
    }
    for (const [source, state] of this.states) {
      if (!seen.has(source)) {
        this.lose(state, dt, true);
        this.states.delete(source);
      }
    }
    const count = this.hands.length;
    if (count !== this.previousCount) {
      this.previousCount = count;
      this.onTracking(count);
    }
  }

  cancelAll() {
    for (const state of this.states.values()) this.lose(state, 1, true);
    this.states.clear();
    if (this.previousCount) this.onTracking(0);
    this.previousCount = 0;
  }

  dispose() {
    this.cancelAll();
    const geometries = new Set(),
      materials = new Set();
    for (const { hand, model } of this.handModels) {
      model.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (material) materials.add(material);
        }
      });
      hand.remove(model);
      this.scene.remove(hand);
    }
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
}

export default HandTrackingManager;
