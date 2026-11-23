import { clamp, distance3, isVector3, wrappedAngle } from '../utils/MathUtils.js';

/** Hysteresis prevents tracking jitter from emitting repeated grab/release events. */
export class PinchDetector {
  constructor({ start = 0.025, release = 0.04 } = {}) { this.startDistance = start; this.releaseDistance = release; this.active = false; }
  update(thumb, index) {
    if (!isVector3(thumb) || !isVector3(index)) return this.reset();
    const distance = distance3(thumb, index);
    const next = this.active ? distance < this.releaseDistance : distance < this.startDistance;
    const phase = next === this.active ? (next ? 'hold' : 'none') : (next ? 'start' : 'release');
    this.active = next;
    return { phase, active: next, distance, strength: 1 - clamp(distance / this.releaseDistance) };
  }
  reset() { const phase = this.active ? 'cancel' : 'none'; this.active = false; return { phase, active: false, distance: Infinity, strength: 0 }; }
}

/** Integrates circular motion only while samples are continuous and near the rim. */
export class CircularGesture {
  constructor({ minRadius = 0.045, maxRadius = 0.25, maxSpeed = 12, minTravel = 0.003 } = {}) {
    Object.assign(this, { minRadius, maxRadius, maxSpeed, minTravel }); this.reset();
  }
  reset() { this.previous = null; this.travel = 0; this.direction = 0; this.run = 0; }
  interrupt() { this.previous = null; this.run = 0; this.direction = 0; }
  update(angle, radius, dt) {
    if (![angle, radius, dt].every(Number.isFinite) || radius < this.minRadius || radius > this.maxRadius || dt <= 0 || dt > 0.25) { this.interrupt(); return 0; }
    if (this.previous === null) { this.previous = angle; return 0; }
    const delta = wrappedAngle(angle - this.previous); this.previous = angle;
    if (Math.abs(delta) > Math.min(0.65, this.maxSpeed * dt + 0.03)) { this.interrupt(); return 0; }
    if (Math.abs(delta) < this.minTravel) return 0;
    const direction = Math.sign(delta);
    if (this.direction && direction !== this.direction) this.run = 0;
    this.direction = direction; this.run += Math.abs(delta);
    // Small alternating wiggles do not count as stirring. A quarter-turn establishes a stroke.
    const accepted = this.run > Math.PI / 2 ? Math.abs(delta) : 0;
    this.travel += accepted;
    return accepted;
  }
}

/** Counts broad, alternating fanning strokes; noise or a stationary hand does not count. */
export class FanGesture {
  constructor({ strokeDistance = 0.075, minDuration = 0.12, maxDuration = 1.8 } = {}) {
    Object.assign(this, { strokeDistance, minDuration, maxDuration }); this.reset();
  }
  reset() { this.anchor = null; this.anchorTime = null; this.lastTime = null; this.direction = 0; this.strokes = 0; }
  interrupt() { this.anchor = null; this.anchorTime = null; this.lastTime = null; }
  update(point, time) {
    if (!isVector3(point) || !Number.isFinite(time) || (this.lastTime !== null && (time <= this.lastTime || time - this.lastTime > 0.4))) { this.interrupt(); return false; }
    this.lastTime = time;
    if (!this.anchor) { this.anchor = [...point]; this.anchorTime = time; return false; }
    const dx = point[0] - this.anchor[0], duration = time - this.anchorTime;
    if (duration > this.maxDuration) { this.anchor = [...point]; this.anchorTime = time; return false; }
    if (Math.abs(dx) < this.strokeDistance || duration < this.minDuration) return false;
    const direction = Math.sign(dx);
    if (this.direction === direction) return false;
    this.direction = direction; this.anchor = [...point]; this.anchorTime = time; this.strokes += 1;
    return true;
  }
}

export class GestureDetector {
  constructor() { this.pinch = new PinchDetector(); this.circular = new CircularGesture(); this.fan = new FanGesture(); }
  reset() { this.pinch.reset(); this.circular.reset(); this.fan.reset(); }
  static pinchDistance(thumb, index) { return isVector3(thumb) && isVector3(index) ? distance3(thumb, index) : Infinity; }
  static handShape(left, right, initial = { height: 0.18, separation: 0.2, y: 0.25 }) {
    if (!isVector3(left) || !isVector3(right)) return null;
    return { height: clamp(initial.height + (left[1] + right[1]) / 2 - initial.y, 0.12, 0.38), width: clamp(distance3(left, right) / initial.separation, 0.55, 1.5) };
  }
}
