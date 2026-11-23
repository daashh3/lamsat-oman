import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { clamp } from '../utils/MathUtils.js';
import { DHOW_CORDS, DHOW_WEAVE_RADIUS } from './DhowWeaving.js';

export class DhowChapter extends BaseChapter {
  constructor(callbacks) {
    super('DHOW', callbacks);
    this.stage = 'WEAVE';
    this.pulled = 0;
    this.hoistProgress = 0;
    this.cordProgress = Object.fromEntries(
      DHOW_CORDS.map((cord) => [cord.id, 0]),
    );
    this.mountedCords = [];
    this.instruction =
      'أمسك طرف كل حبل ومرّره عبر الحلقات المضيئة بالترتيب لتثبيت الشراع';
  }
  input(action, { distance, id, position } = {}) {
    if (this.completed) return false;
    if (this.stage === 'WEAVE' && action === 'weave') {
      const cord = DHOW_CORDS.find((item) => item.id === id);
      if (
        !cord ||
        !Array.isArray(position) ||
        position.length !== 3 ||
        !position.every(Number.isFinite)
      )
        return false;
      const index = this.cordProgress[id],
        next = cord.path[index];
      if (
        !next ||
        Math.hypot(...position.map((value, axis) => value - next[axis])) >
          DHOW_WEAVE_RADIUS
      )
        return false;
      // Only one ordered guide can advance per physical sample. Visiting the
      // mounting cleat early or repeatedly sampling an old guide does nothing.
      this.cordProgress[id]++;
      this.progress =
        (0.6 *
          Object.values(this.cordProgress).reduce(
            (sum, count) => sum + count,
            0,
          )) /
        (DHOW_CORDS.length * cord.path.length);
      if (this.cordProgress[id] === cord.path.length) {
        this.mountedCords.push(id);
        this.event('cord-mounted', {
          id,
          position: [...next],
          count: this.mountedCords.length,
        });
        this.instruction = `ثبّت الحبال الأربعة: ${this.mountedCords.length} من ٤`;
      } else
        this.event('cord-threaded', { id, position: [...next], guide: index });
      if (this.mountedCords.length === DHOW_CORDS.length) {
        this.stage = 'HOIST';
        this.instruction = 'ثُبّت الشراع. أمسك مقبض الرفع واسحبه إلى الأسفل';
      }
      return true;
    }
    if (
      this.stage !== 'HOIST' ||
      action !== 'pull' ||
      !Number.isFinite(distance) ||
      distance <= 0 ||
      distance > INTERACTION_LAYOUT.dhow.maxStep
    )
      return false;
    // Input is incremental downward movement in metres, never an absolute position.
    this.pulled += distance;
    this.hoistProgress = clamp(
      this.pulled / INTERACTION_LAYOUT.dhow.pullDistance,
    );
    this.progress = 0.6 + 0.4 * this.hoistProgress;
    this.event('sail-hoist', { progress: this.hoistProgress });
    if (this.hoistProgress >= 1) {
      this.instruction = 'اكتمل تركيب الشراع ورفعه';
      this.finish();
    }
    return true;
  }
  snapshot() {
    return {
      ...super.snapshot(),
      pulled: this.pulled,
      hoistProgress: this.hoistProgress,
      cordProgress: { ...this.cordProgress },
      mountedCords: [...this.mountedCords],
      weaveCount: this.mountedCords.length,
    };
  }
}
