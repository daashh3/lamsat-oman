import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { insideCylinder } from '../utils/InteractionUtils.js';
import { clamp } from '../utils/MathUtils.js';

/** Dimensions are metres; width remains a ratio of the .20 m reference diameter. */
export class PotteryChapter extends BaseChapter {
  constructor(callbacks) {
    super('POTTERY', callbacks);
    this.stage = 'PLACE_CLAY';
    this.height = 0.14;
    this.width = 1.35;
    this.targetHold = 0;
    this.firing = 0;
    this.decorations = new Set();
    this.instruction = 'ضع كتلة الطين على دولاب الفخار';
  }

  input(action, data = {}) {
    if (this.completed) return false;
    if (
      this.stage === 'PLACE_CLAY' &&
      action === 'drop' &&
      data.id === 'clay'
    ) {
      if (!insideCylinder(data.position, INTERACTION_LAYOUT.pottery.wheel)) {
        this.event('invalid-drop', { id: data.id });
        return false;
      }
      this.stage = 'SHAPE';
      this.progress = 0.2;
      this.instruction =
        'شكّل الفخار بارتفاع ٣٠ سم وقطر نحو ٢٠ سم حتى يطابق الشكل الذهبي';
      this.event('clay-placed');
      return true;
    }
    if (
      this.stage === 'SHAPE' &&
      action === 'shape' &&
      Number.isFinite(data.height) &&
      Number.isFinite(data.width)
    ) {
      this.height = clamp(data.height, 0.12, 0.38);
      this.width = clamp(data.width, 0.55, 1.5);
      const heightFit = clamp(1 - Math.abs(this.height - 0.3) / 0.16);
      const widthFit = clamp(1 - Math.abs(this.width - 0.98) / 0.5);
      this.progress = 0.2 + 0.35 * Math.min(heightFit, widthFit);
      this.event('clay-shaped', { height: this.height, width: this.width });
      return true;
    }
    // Each surface band must be decorated by a separate deliberate interaction.
    if (this.stage === 'DECORATE' && action === 'decorate') {
      if (
        !Number.isInteger(data.id) ||
        data.id < 0 ||
        data.id > 2 ||
        this.decorations.has(data.id)
      )
        return false;
      this.decorations.add(data.id);
      this.progress = 0.55 + (0.2 * this.decorations.size) / 3;
      this.event('pottery-decorated', {
        id: data.id,
        count: this.decorations.size,
      });
      if (this.decorations.size === 3) {
        this.stage = 'IGNITE_KILN';
        this.instruction =
          'اكتملت الزخارف. اضغط زر إشعال الفرن لبدء حرق الفخار';
      } else
        this.instruction = `أضف الزخارف إلى أحزمة الفخار الثلاثة: ${this.decorations.size} من ٣`;
      return true;
    }
    // Decorating never starts the kiln automatically; ignition is deliberate.
    if (this.stage === 'IGNITE_KILN' && action === 'light-kiln') {
      this.stage = 'FIRING';
      this.instruction = 'اشتعل الفرن. يُحرق الفخار الآن';
      this.event('kiln-start');
      return true;
    }
    return false;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || this.completed) return;
    const step = Math.min(dt, 0.1);
    super.update(step);
    if (this.stage === 'SHAPE') {
      const target = INTERACTION_LAYOUT.pottery;
      const matches =
        this.height >= target.targetHeight[0] &&
        this.height <= target.targetHeight[1] &&
        this.width >= target.targetWidth[0] &&
        this.width <= target.targetWidth[1];
      this.targetHold = matches ? this.targetHold + step : 0;
      if (this.targetHold + 1e-9 >= 1.2) {
        this.stage = 'DECORATE';
        this.progress = 0.55;
        this.instruction =
          'زيّن الفخار: المس أحزمة الزخرفة الثلاثة على سطح الإناء';
        this.event('pottery-shaped');
      }
    } else if (this.stage === 'FIRING') {
      this.firing += step;
      this.progress = 0.75 + 0.25 * clamp(this.firing / 2.4);
      if (this.firing + 1e-9 >= 2.4) {
        this.instruction = 'قطعة شكّلتها وزيّنتها بيديك وتحفظ ذاكرة المكان';
        this.finish();
      }
    }
  }

  interrupt() {
    this.targetHold = 0;
  }

  snapshot() {
    return {
      ...super.snapshot(),
      height: this.height,
      width: this.width,
      targetHold: this.targetHold,
      firing: this.firing,
      decorations: [...this.decorations],
      decorationCount: this.decorations.size,
    };
  }
}
