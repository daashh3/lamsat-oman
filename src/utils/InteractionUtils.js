import { isVector3 } from './MathUtils.js';

/** All bounds are chapter-local metres. The scene adapter performs world-to-local. */
export function insideCylinder(point, zone) {
  return isVector3(point) && Math.hypot(point[0] - zone.center[0], point[2] - zone.center[2]) <= zone.radius
    && point[1] >= zone.center[1] - zone.below && point[1] <= zone.center[1] + zone.above;
}

export function insideBox(point, zone) {
  return isVector3(point) && point.every((v, axis) => Math.abs(v - zone.center[axis]) <= zone.halfSize[axis]);
}

export function pointSegmentDistance(point, a, b) {
  if (![point, a, b].every(isVector3)) return Infinity;
  const ab = b.map((v, i) => v - a[i]);
  const lengthSquared = ab.reduce((sum, v) => sum + v * v, 0);
  const t = Math.max(0, Math.min(1, point.reduce((sum, v, i) => sum + (v - a[i]) * ab[i], 0) / (lengthSquared || 1)));
  return Math.hypot(...point.map((v, i) => v - a[i] - ab[i] * t));
}
