import { Matrix4, Quaternion, Vector3 } from 'three';

/** One-shot stable placement. Hit testing is optional; viewer pose is always the fallback. */
export class HitTestPlacement {
  constructor({ content, onStatus = () => {} }) {
    this.content = content;
    this.onStatus = onStatus;
    this.source = null;
    this.pending = true;
    this.elapsed = 0;
    this.distance = 0.65;
    this.heightOffset = -0.6;
    this.seated = false;
    this.lastViewerPose = null;
    this.generation = 0;
  }

  async init(session) {
    const generation = ++this.generation;
    this.pending = true;
    this.elapsed = 0;
    if (typeof session.requestHitTestSource !== 'function') return false;
    if (session.enabledFeatures && !session.enabledFeatures.includes('hit-test')) return false;
    try {
      const viewer = await session.requestReferenceSpace('viewer');
      const options = { space: viewer, entityTypes: ['plane'] };
      if (typeof globalThis.XRRay === 'function') {
        options.offsetRay = new XRRay({ x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: -0.75, z: -1, w: 0 });
      }
      const source = await session.requestHitTestSource(options);
      if (generation !== this.generation) { source.cancel(); return false; }
      this.source = source;
      return true;
    } catch {
      this.onStatus({ kind: 'placement', message: 'تم اختيار موضع مريح أمامك', hitTest: false });
      return false;
    }
  }

  recenter() { this.pending = true; this.elapsed = 0; }

  setComfort({ seated, distance, heightOffset } = {}) {
    if (typeof seated === 'boolean') this.seated = seated;
    if (Number.isFinite(distance)) this.distance = Math.min(0.95, Math.max(0.45, distance));
    if (Number.isFinite(heightOffset)) this.heightOffset = Math.min(-0.35, Math.max(-0.85, heightOffset));
    this.recenter();
  }

  update(frame, referenceSpace, dt) {
    if (!this.pending) return false;
    const pose = frame.getViewerPose(referenceSpace);
    if (!pose) return false;
    this.lastViewerPose = pose;
    this.elapsed += dt;
    const viewerPosition = new Vector3().copy(pose.transform.position);
    const viewerRotation = new Quaternion().copy(pose.transform.orientation);
    const forward = new Vector3(0, 0, -1).applyQuaternion(viewerRotation);
    forward.y = 0;
    if (forward.lengthSq() < 0.01) forward.set(0, 0, -1); else forward.normalize();
    let hitPosition = null;
    if (this.source && typeof frame.getHitTestResults === 'function') {
      try {
        for (const hit of frame.getHitTestResults(this.source)) {
          const hitPose = hit.getPose(referenceSpace);
          if (!hitPose) continue;
          const transform = new Matrix4().fromArray(hitPose.transform.matrix);
          const normal = new Vector3(0, 1, 0).transformDirection(transform);
          const p = new Vector3().setFromMatrixPosition(transform);
          const horizontal = new Vector3(p.x - viewerPosition.x, 0, p.z - viewerPosition.z);
          const distance = horizontal.length();
          if (normal.y > 0.85 && distance >= 0.35 && distance <= 1.1 && horizontal.normalize().dot(forward) > 0.6) {
            hitPosition = p;
            break;
          }
        }
      } catch { this.source.cancel(); this.source = null; }
    }
    // Never chase the user's gaze after placement. Recenter is an explicit action.
    if (!hitPosition && this.elapsed < 0.65) return false;
    const target = viewerPosition.clone().addScaledVector(forward, this.distance);
    target.y = viewerPosition.y + this.heightOffset;
    if (hitPosition) {
      // Anchor the display above the detected surface while keeping the active objects reachable.
      target.x = hitPosition.x;
      target.z = hitPosition.z;
      target.y = Math.max(viewerPosition.y - 0.75,
        Math.min(viewerPosition.y - 0.42, hitPosition.y + (this.seated ? 0.55 : 0.85)));
    }
    if (this.content.parent) this.content.parent.worldToLocal(target);
    this.content.position.copy(target);
    // The front of every museum model is +Z and faces back toward the viewer.
    this.content.rotation.set(0, Math.atan2(-forward.x, -forward.z), 0);
    this.content.updateMatrixWorld(true);
    this.pending = false;
    this.onStatus({ kind: 'placement', message: hitPosition ? 'تم تثبيت المعرض فوق سطح مناسب' : 'تم تثبيت المعرض أمامك', hitTest: !!hitPosition, placed: true });
    return true;
  }

  dispose() {
    this.generation++;
    this.source?.cancel();
    this.source = null;
    this.lastViewerPose = null;
    this.pending = true;
  }
}

export default HitTestPlacement;
