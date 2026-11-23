import { COLLECTIBLE_CHAPTERS } from '../chapters/ChapterData.js';

export class ProgressManager {
  constructor() { this._earned = new Set(); }
  get count() { return this._earned.size; }
  get earned() { return [...this._earned]; }
  get complete() { return this.count === COLLECTIBLE_CHAPTERS.length; }
  has(chapter) { return this._earned.has(chapter); }
  award(chapter) {
    if (this.has(chapter) || COLLECTIBLE_CHAPTERS[this.count] !== chapter) return false;
    this._earned.add(chapter); return true;
  }
  reset() { this._earned.clear(); }
  snapshot() { return { count: this.count, total: COLLECTIBLE_CHAPTERS.length, earned: this.earned, complete: this.complete }; }
}
