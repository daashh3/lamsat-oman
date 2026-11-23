import { CHAPTER_TEXT } from './ChapterData.js';
import { clamp } from '../utils/MathUtils.js';

export class BaseChapter {
  constructor(id, { emit = () => {}, complete = () => {} } = {}) { this.id = id; this.emit = emit; this.onComplete = complete; this.stage = 'ACTIVE'; this.progress = 0; this.elapsed = 0; this.completed = false; this.instruction = ''; }
  event(type, details = {}) { this.emit({ type, chapter: this.id, ...details }); }
  finish() { if (this.completed) return false; this.completed = true; this.stage = 'COMPLETE'; this.progress = 1; this.event('chapter-complete'); this.onComplete(this.id); return true; }
  update(dt) { this.elapsed += dt; }
  interrupt() {}
  snapshot() { return { id: this.id, ...CHAPTER_TEXT[this.id], stage: this.stage, progress: clamp(this.progress), completed: this.completed, instruction: this.instruction }; }
}
