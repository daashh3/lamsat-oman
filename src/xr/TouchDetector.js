import { Box3, Raycaster, Vector3 } from 'three';

/** Small local interaction regions; never substitutes a large object's center for its surface. */
export class TouchDetector {
  constructor({ cooldown = 0.35 } = {}) {
    this.cooldown = cooldown;
    this.lastTouch = new Map();
    this.inside = new Set();
    this.raycaster = new Raycaster();
  }

  static contains(point, zone, padding = 0) {
    const p = point.isVector3 ? point : new Vector3(...point);
    const center = zone.center?.isVector3 ? zone.center : new Vector3(...(zone.center || [0, 0, 0]));
    if (zone.type === 'sphere') return p.distanceToSquared(center) <= (zone.radius + padding) ** 2;
    if (zone.type === 'cylinder') {
      const dx = p.x - center.x, dz = p.z - center.z;
      return dx * dx + dz * dz <= (zone.radius + padding) ** 2 && Math.abs(p.y - center.y) <= zone.height / 2 + padding;
    }
    const half = zone.halfSize?.isVector3 ? zone.halfSize : new Vector3(...(zone.halfSize || [0.05, 0.05, 0.05]));
    return Math.abs(p.x - center.x) <= half.x + padding &&
      Math.abs(p.y - center.y) <= half.y + padding && Math.abs(p.z - center.z) <= half.z + padding;
  }

  test(pointerId, worldPoint, object, zone, timeSeconds) {
    object.updateWorldMatrix(true, false);
    const local = object.worldToLocal(worldPoint.clone());
    const key = `${pointerId}:${object.uuid}:${zone.id || 'zone'}`;
    const hit = TouchDetector.contains(local, zone, zone.tolerance ?? 0.012);
    const entered = hit && !this.inside.has(key);
    if (hit) this.inside.add(key); else this.inside.delete(key);
    const ready = timeSeconds - (this.lastTouch.get(key) ?? -Infinity) >= this.cooldown;
    if (entered && ready) this.lastTouch.set(key, timeSeconds);
    return { near: hit, activated: entered && ready, local };
  }

  raycast(ray, objects) {
    this.raycaster.ray.copy(ray);
    return this.raycaster.intersectObjects(objects, true)[0] || null;
  }

  bounds(object) { return new Box3().setFromObject(object); }
  reset() { this.lastTouch.clear(); this.inside.clear(); }
}

export default TouchDetector;
