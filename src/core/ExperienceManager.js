import { StateMachine } from './StateMachine.js';
import { ProgressManager } from './ProgressManager.js';
import { CHAPTER_ORDER } from '../chapters/ChapterData.js';
import { GateChapter } from '../chapters/GateChapter.js';
import { FrankincenseChapter } from '../chapters/FrankincenseChapter.js';
import { DhowChapter } from '../chapters/DhowChapter.js';
import { PotteryChapter } from '../chapters/PotteryChapter.js';
import { HalwaChapter } from '../chapters/HalwaChapter.js';
import { CoffeeChapter } from '../chapters/CoffeeChapter.js';
import { FinaleChapter } from '../chapters/FinaleChapter.js';

const CHAPTER_CLASSES = {
  GATE: GateChapter,
  FRANKINCENSE: FrankincenseChapter,
  DHOW: DhowChapter,
  POTTERY: PotteryChapter,
  HALWA: HalwaChapter,
  COFFEE: CoffeeChapter,
  FINALE: FinaleChapter,
};

export class ExperienceManager {
  constructor({ onChange = () => {}, onEvent = () => {} } = {}) {
    this.onChange = onChange;
    this.onEvent = onEvent;
    this.machine = new StateMachine();
    this.progress = new ProgressManager();
    this.chapter = null;
    this.paused = false;
    this.pendingTransition = null;
    this.error = null;
    this.machine.transition('COMPATIBILITY_CHECK');
    this.machine.transition('READY');
  }
  get state() {
    return this.machine.state;
  }
  changed() {
    this.onChange(this.snapshot());
  }
  event(type, details = {}) {
    this.onEvent({ type, ...details });
  }
  beginXR() {
    if (this.state !== 'READY') return false;
    this.machine.transition('XR_ENTERING');
    this.changed();
    return true;
  }
  placement() {
    if (this.state !== 'XR_ENTERING') return false;
    this.machine.transition('PLACEMENT');
    this.changed();
    return true;
  }
  cancelXR() {
    if (!['XR_ENTERING', 'PLACEMENT'].includes(this.state)) return false;
    this.machine.transition('READY');
    this.changed();
    return true;
  }
  start() {
    if (!['READY', 'PLACEMENT'].includes(this.state)) return false;
    this.enterChapter('GATE');
    return true;
  }
  enterChapter(id) {
    if (id === 'FINALE' && !this.progress.complete)
      throw new Error('The finale requires five earned symbols.');
    this.machine.transition(id);
    this.pendingTransition = null;
    this.paused = false;
    this.chapter = new CHAPTER_CLASSES[id]({
      emit: (event) => this.onEvent(event),
      complete: (completed) => this.finishChapter(completed),
    });
    this.event('chapter-enter', { chapter: id });
    this.changed();
  }
  finishChapter(id) {
    if (id !== this.state || this.pendingTransition !== null) return;
    if (id === 'FINALE') {
      this.reset();
      return;
    }
    if (this.progress.award(id))
      this.event('symbol-earned', { chapter: id, count: this.progress.count });
    this.pendingTransition = id === 'FRANKINCENSE' ? 5 : 2.4;
    this.changed();
  }
  input(action, payload = {}) {
    if (!this.chapter || this.paused || this.pendingTransition !== null)
      return false;
    const accepted = this.chapter.input(action, payload);
    if (accepted) this.changed();
    return Boolean(accepted);
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0 || this.paused || !this.chapter) return;
    // A suspended tab must not fast-forward cooking, transition, or replay timers.
    const step = Math.min(dt, 0.1),
      previousStage = this.chapter.stage;
    this.chapter.update(step);
    if (this.pendingTransition !== null) {
      this.pendingTransition = Math.max(0, this.pendingTransition - step);
      if (this.pendingTransition === 0)
        this.enterChapter(CHAPTER_ORDER[CHAPTER_ORDER.indexOf(this.state) + 1]);
    }
    if (
      this.chapter?.stage !== previousStage ||
      this.state === 'FINALE' ||
      this.state === 'POTTERY'
    )
      this.changed();
  }
  pause(value = !this.paused) {
    this.paused = Boolean(value);
    this.chapter?.interrupt();
    this.event(this.paused ? 'pause' : 'resume');
    this.changed();
    return this.paused;
  }
  restartChapter() {
    const id = this.state;
    if (!CHAPTER_CLASSES[id]) return false;
    this.chapter?.interrupt();
    this.pendingTransition = null;
    this.paused = false;
    this.chapter = new CHAPTER_CLASSES[id]({
      emit: (event) => this.onEvent(event),
      complete: (completed) => this.finishChapter(completed),
    });
    this.event('chapter-restart', { chapter: id });
    this.changed();
    return true;
  }
  reset() {
    this.chapter?.interrupt();
    this.machine.transition('RESETTING');
    this.chapter = null;
    this.pendingTransition = null;
    this.paused = false;
    this.error = null;
    this.progress.reset();
    this.event('reset');
    this.machine.transition('READY');
    this.changed();
  }
  fail(error) {
    this.chapter?.interrupt();
    this.error = error instanceof Error ? error.message : String(error);
    this.paused = true;
    this.pendingTransition = null;
    if (this.state !== 'ERROR') this.machine.transition('ERROR');
    this.event('error', { message: this.error });
    this.changed();
  }
  snapshot() {
    const chapter = this.chapter?.snapshot() ?? null;
    return {
      state: this.state,
      paused: this.paused,
      progress: this.progress.snapshot(),
      chapter,
      chapterProgress: chapter?.progress ?? 0,
      stage: chapter?.stage ?? this.state,
      instruction: chapter?.instruction ?? '',
      pendingTransition: this.pendingTransition,
      error: this.error,
    };
  }
}
