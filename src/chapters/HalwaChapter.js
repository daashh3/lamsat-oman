import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { insideCylinder, insideBox } from '../utils/InteractionUtils.js';
import { CircularGesture, FanGesture } from '../xr/GestureDetector.js';
import { clamp } from '../utils/MathUtils.js';

const INGREDIENTS = ['sugar', 'saffron', 'nuts'];
const LABELS = { sugar: 'السكر', saffron: 'الزعفران', nuts: 'المكسّرات' };
export class HalwaChapter extends BaseChapter {
  constructor(callbacks) {
    super('HALWA', callbacks);
    this.ingredients = [];
    this.stage = 'ADD_SUGAR';
    this.stirring = new CircularGesture();
    this.fanning = new FanGesture();
    this.fanHeld = false;
    this.instruction = 'أضف السكر إلى القدر';
  }
  input(action, data = {}) {
    if (this.completed) return false;
    if (action === 'fan-held') {
      if (
        typeof data.held !== 'boolean' ||
        this.fanHeld === data.held ||
        (data.held && this.stage !== 'FAN_FIRE')
      )
        return false;
      this.fanHeld = data.held;
      this.fanning.interrupt();
      this.instruction = data.held
        ? 'لوّح بالمهفّة يميناً ويساراً أمام الموقد لتقوية النار'
        : 'احمل المهفّة المصنوعة من سعف النخيل وحرّكها أمام الموقد';
      this.event('fan-held', { held: data.held });
      return true;
    }
    if (this.stage.startsWith('ADD_') && action === 'drop') {
      const next = INGREDIENTS[this.ingredients.length];
      if (
        data.id !== next ||
        !insideCylinder(data.position, INTERACTION_LAYOUT.halwa.cauldron)
      ) {
        this.event('invalid-drop', { id: data.id });
        return false;
      }
      this.ingredients.push(next);
      this.progress = this.ingredients.length * 0.1;
      this.event('ingredient-added', { id: next });
      const remaining = INGREDIENTS[this.ingredients.length];
      this.stage = remaining ? `ADD_${remaining.toUpperCase()}` : 'STIR';
      this.instruction = remaining
        ? `أضف ${LABELS[remaining]} إلى القدر`
        : 'أمسك الملعقة وحرّك المزيج في دوائر متصلة';
      return true;
    }
    if (this.stage === 'STIR' && action === 'stir') {
      const added = this.stirring.update(data.angle, data.radius, data.dt);
      this.progress =
        0.3 +
        0.4 *
          clamp(
            this.stirring.travel /
              (Math.PI * 2 * INTERACTION_LAYOUT.halwa.turns),
          );
      if (
        this.stirring.travel >=
        Math.PI * 2 * INTERACTION_LAYOUT.halwa.turns
      ) {
        this.stage = 'FAN_FIRE';
        this.instruction =
          'احمل المهفّة المصنوعة من سعف النخيل وحرّكها أمام الموقد';
        this.event('mixture-ready');
      }
      return added > 0;
    }
    if (this.stage === 'FAN_FIRE' && action === 'fan') {
      if (
        !this.fanHeld ||
        !insideBox(data.position, INTERACTION_LAYOUT.halwa.fan)
      ) {
        this.fanning.interrupt();
        return false;
      }
      const accepted = this.fanning.update(data.position, data.time);
      this.progress =
        0.7 +
        0.3 * clamp(this.fanning.strokes / INTERACTION_LAYOUT.halwa.strokes);
      if (accepted)
        this.event('fire-fanned', { strokes: this.fanning.strokes });
      if (this.fanning.strokes >= INTERACTION_LAYOUT.halwa.strokes) {
        this.instruction = 'الحلوى جاهزة… أهلاً بالضيوف';
        this.event('halwa-cooked');
        this.finish();
      }
      return accepted;
    }
    if (action === 'interrupt') {
      this.interrupt();
      return false;
    }
    return false;
  }
  interrupt() {
    this.stirring.interrupt();
    this.fanning.interrupt();
  }
  snapshot() {
    return {
      ...super.snapshot(),
      ingredients: [...this.ingredients],
      nextIngredient: INGREDIENTS[this.ingredients.length] ?? null,
      turns: this.stirring.travel / (2 * Math.PI),
      fanStrokes: this.fanning.strokes,
      fanHeld: this.fanHeld,
    };
  }
}
