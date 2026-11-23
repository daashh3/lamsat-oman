import { Box3, Quaternion, Vector3 } from 'three';

/** Exclusive grab ownership and smoothed world-to-parent object motion. */
export class GrabSystem {
  constructor() {
    this.items = new Map();
    this.owners = new Map();
  }

  register(id, object, { padding = 0.025, rotate = false, onRelease = () => {} } = {}) {
    const entry = { id, object, padding, rotate, onRelease,
      home: object.position.clone(), homeQuaternion: object.quaternion.clone(), owner: null };
    this.items.set(id, entry);
    return () => this.unregister(id);
  }

  unregister(id) {
    const entry = this.items.get(id);
    if (entry?.owner) this.release(entry.owner, { cancelled: true });
    this.items.delete(id);
  }

  begin(pointerId, worldPoint, quaternion = new Quaternion(), requestedId) {
    if (this.owners.has(pointerId)) return null;
    const candidates = requestedId ? [this.items.get(requestedId)] : [...this.items.values()];
    let closest = null, distance = Infinity;
    for (const entry of candidates) {
      if (!entry || entry.owner || !entry.object.visible) continue;
      const bounds = new Box3().setFromObject(entry.object).expandByScalar(entry.padding);
      if (!bounds.containsPoint(worldPoint)) continue;
      const d = bounds.getCenter(new Vector3()).distanceToSquared(worldPoint);
      if (d < distance) { closest = entry; distance = d; }
    }
    if (!closest) return null;
    closest.owner = pointerId;
    closest.offset = closest.object.getWorldPosition(new Vector3()).sub(worldPoint);
    closest.rotationOffset = quaternion.clone().invert().multiply(closest.object.getWorldQuaternion(new Quaternion()));
    this.owners.set(pointerId, closest);
    return closest;
  }

  move(pointerId, worldPoint, quaternion, dt = 1 / 72) {
    const entry = this.owners.get(pointerId);
    if (!entry) return null;
    const target = worldPoint.clone().add(entry.offset);
    if (entry.object.parent) entry.object.parent.worldToLocal(target);
    entry.object.position.lerp(target, 1 - Math.exp(-32 * dt));
    if (entry.rotate && quaternion) {
      const rotation = quaternion.clone().multiply(entry.rotationOffset);
      if (entry.object.parent) rotation.premultiply(entry.object.parent.getWorldQuaternion(new Quaternion()).invert());
      entry.object.quaternion.slerp(rotation, 1 - Math.exp(-24 * dt));
    }
    return entry;
  }

  release(pointerId, { cancelled = false, valid = true } = {}) {
    const entry = this.owners.get(pointerId);
    if (!entry) return null;
    this.owners.delete(pointerId);
    entry.owner = null;
    const worldPosition = entry.object.getWorldPosition(new Vector3());
    if (cancelled || !valid) {
      entry.object.position.copy(entry.home);
      entry.object.quaternion.copy(entry.homeQuaternion);
    }
    entry.onRelease({ entry, worldPosition, cancelled, valid });
    return entry;
  }

  cancelAll() { for (const owner of [...this.owners.keys()]) this.release(owner, { cancelled: true }); }
  clear() { this.cancelAll(); this.items.clear(); }
}

export default GrabSystem;
