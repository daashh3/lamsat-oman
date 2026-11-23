import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { clamp } from '../utils/MathUtils.js';

/**
 * Perfect Pour uses the actual transformed outlet/angle samples from the scene.
 * Reaching the green band is not success: stop pouring and let the cup settle.
 */
export class CoffeeChapter extends BaseChapter {
  constructor(callbacks) {
    super('COFFEE', callbacks);
    this.stage = 'POUR';
    this.poured = 0; // Seconds of physically valid flow, retained for diagnostics.
    this.fillLevel = 0;
    this.isPouring = false;
    this.settleRemaining = 0;
    this.resetRemaining = 0;
    this.attempts = 0;
    this.overfills = 0;
    this.attemptStarted = false;
    this.lastResult = null;
    this.cupHeld = false;
    this.instruction =
      'احمل الفنجان بيد، ثم أمل الدلّة باليد الأخرى وأوقف السكب داخل النطاق الأخضر';
  }

  input(action, { angle, aligned, dt, held } = {}) {
    if (this.completed) return false;
    // This comes from the scene's exclusive cup grab, never from a pour sample.
    if (action === 'cup-held') {
      if (typeof held !== 'boolean' || held === this.cupHeld) return false;
      this.cupHeld = held;
      if (!held) {
        this.interrupt();
        this.instruction = 'احمل الفنجان مجدداً قبل متابعة السكب';
      } else if (this.stage === 'POUR') {
        this.instruction = 'ثبّت الفنجان تحت فوهة الدلّة وأملها برفق';
      }
      this.event('cup-held', { held });
      return true;
    }
    if (action === 'interrupt') {
      this.interrupt();
      return true;
    }
    if (this.stage === 'RESETTING') return false;
    if (!this.cupHeld) return false;
    if (action === 'stop-pour') return this.stopFlow(true);
    if (action !== 'pour') return false;

    // A stale/invalid sample cannot fill a cup or manufacture a stopped pour.
    if (
      !Number.isFinite(dt) ||
      dt <= 0 ||
      dt > 0.1 ||
      !Number.isFinite(angle) ||
      typeof aligned !== 'boolean'
    )
      return false;
    const zone = INTERACTION_LAYOUT.coffee;
    const valid =
      aligned === true &&
      Number.isFinite(angle) &&
      angle >= zone.minAngle &&
      angle <= zone.maxAngle;
    if (!valid) {
      return this.stopFlow();
    }

    this.settleRemaining = 0;
    this.stage = 'POUR';
    if (!this.attemptStarted) {
      this.attemptStarted = true;
      this.attempts++;
      this.lastResult = null;
    }
    if (!this.isPouring) {
      this.isPouring = true;
      this.event('pour-start', { attempt: this.attempts });
    }
    this.poured += dt;
    this.fillLevel = Math.min(
      zone.overflowLevel,
      this.fillLevel + dt * zone.fillRate,
    );
    this.progress = clamp(this.fillLevel);
    this.instruction =
      this.fillLevel >= zone.perfectMin
        ? this.fillLevel <= zone.perfectMax
          ? 'المستوى مثالي الآن؛ أعد الدلّة إلى وضعها المستقيم أو اضغط إيقاف السكب'
          : 'المستوى تجاوز النطاق المثالي؛ أوقف السكب وأعد المحاولة'
        : 'استمر برفق حتى يصل مستوى القهوة إلى النطاق الأخضر';
    if (this.fillLevel + 1e-9 >= zone.overflowLevel) this.failPour('overflow');
    return true;
  }

  stopFlow(explicit = false) {
    const wasPouring = this.isPouring;
    this.isPouring = false;
    if (wasPouring) this.event('pour-stop');
    if (this.stage === 'SETTLING') return false;
    // Lost tracking / pause calls interrupt(), not stopFlow(), and cannot win.
    if (this.cupHeld && (wasPouring || explicit) && this.fillLevel > 0.001) {
      this.stage = 'SETTLING';
      this.settleRemaining = INTERACTION_LAYOUT.coffee.settleSeconds;
      this.instruction = 'توقّف السكب… نتحقق من مستوى الفنجان';
      return true;
    }
    return false;
  }

  failPour(reason) {
    if (this.stage === 'RESETTING' || this.completed) return;
    const wasPouring = this.isPouring;
    this.isPouring = false;
    this.settleRemaining = 0;
    this.stage = 'RESETTING';
    this.resetRemaining = INTERACTION_LAYOUT.coffee.resetSeconds;
    this.lastResult = reason;
    if (reason === 'overflow') this.overfills++;
    this.instruction =
      reason === 'underfilled'
        ? 'القهوة أقل من النطاق المطلوب. يُفرّغ الفنجان لتجربة جديدة'
        : 'امتلأ الفنجان أكثر من المطلوب. يُفرّغ الفنجان لتجربة جديدة';
    if (wasPouring) this.event('pour-stop');
    this.event('pour-failed', {
      reason,
      fillLevel: this.fillLevel,
      attempt: this.attempts,
    });
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || this.completed) return;
    const step = Math.min(dt, 0.1);
    super.update(step);
    const zone = INTERACTION_LAYOUT.coffee;
    if (this.stage === 'RESETTING') {
      this.resetRemaining = Math.max(0, this.resetRemaining - step);
      if (this.resetRemaining <= 1e-9) {
        this.fillLevel = 0;
        this.poured = 0;
        this.progress = 0;
        this.attemptStarted = false;
        this.stage = 'POUR';
        this.instruction = 'جرّب مجدداً: أوقف السكب بين ٦٠٪ و٨٠٪';
        this.event('pour-reset', { attempt: this.attempts });
      }
    } else if (this.stage === 'SETTLING' && !this.isPouring && this.cupHeld) {
      this.settleRemaining = Math.max(0, this.settleRemaining - step);
      if (this.settleRemaining > 1e-9) return;
      if (
        this.fillLevel + 1e-9 >= zone.perfectMin &&
        this.fillLevel <= zone.perfectMax + 1e-9
      ) {
        this.lastResult = 'perfect';
        this.instruction = 'سكبٌ متقن وفنجانٌ مثالي. اكتملت لمساتك الخمس!';
        this.event('perfect-pour', {
          fillLevel: this.fillLevel,
          attempt: this.attempts,
        });
        this.finish();
      } else
        this.failPour(
          this.fillLevel < zone.perfectMin ? 'underfilled' : 'overfilled',
        );
    }
  }

  interrupt() {
    if (this.isPouring) this.event('pour-stop');
    this.isPouring = false;
    this.settleRemaining = 0;
    if (this.stage === 'SETTLING') this.stage = 'POUR';
  }

  snapshot() {
    const zone = INTERACTION_LAYOUT.coffee;
    return {
      ...super.snapshot(),
      poured: this.poured,
      fillLevel: this.fillLevel,
      perfectMin: zone.perfectMin,
      perfectMax: zone.perfectMax,
      attempts: this.attempts,
      overfills: this.overfills,
      lastResult: this.lastResult,
      isPouring: this.isPouring,
      cupHeld: this.cupHeld,
      resetRemaining: this.resetRemaining,
    };
  }
}
