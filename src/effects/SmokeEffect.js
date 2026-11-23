import { Vector3 } from 'three';

/** Finite emission; live smoke then expands and fades in the shared Points pool. */
export class SmokeEffect {
  constructor(particles, position, type = 'smoke') {
    this.particles = particles;
    this.position = new Vector3(...position);
    this.type = type;
    this.remaining = 0;
    this.clock = 0;
  }

  start(seconds = this.type === 'smoke' ? 5 : 1.2) {
    this.remaining = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    this.clock = 0;
  }

  stop() {
    this.remaining = 0;
    this.clock = 0;
  }

  update(dt, reduced = false) {
    if (this.remaining <= 0 || !Number.isFinite(dt) || dt <= 0) return;
    const step = Math.min(dt, this.remaining);
    this.remaining = Math.max(0, this.remaining - dt);
    this.clock += Math.min(step, 0.3);
    const interval = reduced ? 0.2 : 0.075;
    let bursts = 0;
    while (this.clock >= interval && bursts < 4) {
      this.clock -= interval;
      this.particles.emit(this.position, this.type, reduced ? 1 : 3);
      bursts++;
    }
  }
}
