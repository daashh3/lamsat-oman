import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';

export class FinaleChapter extends BaseChapter {
  constructor(callbacks) { super('FINALE', callbacks); this.stage = 'CELEBRATE'; this.countdown = null; this.progress = 1; this.instruction = 'المس الفانوس لتبدأ حكاية جديدة'; }
  input(action) {
    if (action !== 'touch' || this.stage !== 'CELEBRATE') return false;
    this.stage = 'COUNTDOWN'; this.countdown = INTERACTION_LAYOUT.finale.countdown; this.instruction = 'شكراً لمشاركتك في لمسة عُمان'; this.event('replay-countdown'); return true;
  }
  update(dt) { super.update(dt); if (this.stage === 'COUNTDOWN') { this.countdown = Math.max(0, this.countdown - dt); if (this.countdown === 0) this.finish(); } }
  snapshot() { return { ...super.snapshot(), countdown: this.countdown }; }
}
