/** Finite, frame-rate independent pose transitions, advanced by the main loop. */
export class PoseTransitions {
  constructor() {
    this.items = new Map();
  }
  move(object, position, quaternion, duration = 0.3) {
    this.items.set(object, {
      start: object.position.clone(),
      rotation: object.quaternion.clone(),
      end: position.clone(),
      endRotation: quaternion.clone(),
      elapsed: 0,
      duration: Math.max(0.01, duration),
    });
  }
  cancel(object) {
    this.items.delete(object);
  }
  clear() {
    this.items.clear();
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (const [object, pose] of this.items) {
      pose.elapsed = Math.min(pose.duration, pose.elapsed + dt);
      const fraction = pose.elapsed / pose.duration;
      const t = fraction * fraction * (3 - 2 * fraction);
      object.position.lerpVectors(pose.start, pose.end, t);
      object.quaternion.slerpQuaternions(pose.rotation, pose.endRotation, t);
      object.updateMatrixWorld(true);
      if (fraction === 1) this.items.delete(object);
    }
  }
}
