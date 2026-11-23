import { BaseChapter } from './BaseChapter.js';
import { INTERACTION_LAYOUT } from './ChapterData.js';
import { insideCylinder, insideBox } from '../utils/InteractionUtils.js';
import { FanGesture } from '../xr/GestureDetector.js';

// Positions are local to the tree, so placing the scene never changes the
// physical hit area. The front of the pale bark patch is the scrape surface.
export const FRANKINCENSE_SCRAPE_ZONE = Object.freeze({
  center: [0, 0.38, 0.045],
  halfSize: [0.08, 0.17, 0.085],
});
export const FRANKINCENSE_SCRAPE_STROKES = 4;

/** Ignite charcoal, scrape bark, then carry the harvested resin to the bowl. */
export class FrankincenseChapter extends BaseChapter {
  constructor(callbacks) {
    super('FRANKINCENSE', callbacks);
    this.stage = 'LIGHT_COAL';
    this.coalLit = false;
    this.lit = false;
    this.scraperHeld = false;
    this.scraping = new FanGesture({
      strokeDistance: 0.065,
      minDuration: 0.14,
      maxDuration: 1.8,
    });
    this.previousScrape = null;
    this.instruction = 'أشعل الفحم داخل المجمر أولاً، ثم انتقل إلى شجرة اللبان';
  }

  input(action, { id, position, time, held } = {}) {
    if (this.completed) return false;
    // The scene sends this only after acquiring/releasing the dedicated tool.
    if (action === 'scraper-held') {
      if (typeof held !== 'boolean' || held === this.scraperHeld) return false;
      if (held && this.stage !== 'SCRAPE_TREE') return false;
      this.scraperHeld = held;
      this.interrupt();
      // Re-gripping starts a new stroke in either direction without erasing earned strokes.
      this.scraping.direction = 0;
      if (this.stage === 'SCRAPE_TREE') {
        this.instruction = held
          ? 'مرّر شفرة أداة الكشط على اللحاء الفاتح صعوداً ونزولاً أربع مرات'
          : 'أمسك أداة كشط اللبان بجانب الشجرة، ثم اكشط اللحاء الفاتح';
      }
      return true;
    }
    if (action === 'interrupt') {
      this.interrupt();
      return false;
    }
    if (action === 'light-coal' || action === 'light-incense') {
      if (this.stage !== 'LIGHT_COAL') return false;
      this.coalLit = true;
      this.stage = 'SCRAPE_TREE';
      this.progress = 0.2;
      this.instruction =
        'أمسك أداة كشط اللبان بجانب الشجرة، ثم اكشط اللحاء الفاتح أربع مرات';
      this.event('coal-lit');
      return true;
    }
    if (action === 'scrape-tree' && this.stage === 'SCRAPE_TREE') {
      if (!this.scraperHeld) return false;
      if (
        !insideBox(position, FRANKINCENSE_SCRAPE_ZONE) ||
        !Number.isFinite(time)
      ) {
        this.interrupt();
        return false;
      }
      // A real stroke needs continuous samples, not unrelated endpoint clicks.
      if (this.previousScrape) {
        const elapsed = time - this.previousScrape.time;
        const distance = Math.hypot(
          ...position.map(
            (value, index) => value - this.previousScrape.position[index],
          ),
        );
        if (elapsed <= 0 || elapsed > 0.4 || distance > 0.06) {
          this.interrupt();
          return false;
        }
      }
      this.previousScrape = { position: [...position], time };
      // Reuse the alternating stroke detector, rotating Y into its X axis.
      const accepted = this.scraping.update(
        [position[1], position[0], position[2]],
        time,
      );
      this.progress =
        0.2 + (0.5 * this.scraping.strokes) / FRANKINCENSE_SCRAPE_STROKES;
      if (accepted)
        this.event('tree-scraped', { strokes: this.scraping.strokes });
      if (this.scraping.strokes >= FRANKINCENSE_SCRAPE_STROKES) {
        this.stage = 'PLACE_RESIN';
        this.instruction =
          'جمعت اللبان! أمسك الحبّة الذهبية وضعها فوق الفحم المتوهّج';
        this.event('resin-collected');
      }
      return accepted;
    }
    if (action !== 'drop' || id !== 'resin') return false;
    if (
      this.stage !== 'PLACE_RESIN' ||
      !this.coalLit ||
      !insideCylinder(position, INTERACTION_LAYOUT.frankincense.bowl)
    ) {
      this.event('invalid-drop', { id });
      return false;
    }
    this.lit = true;
    this.event('incense-lit', { position: [...position] });
    this.instruction =
      'أحسنت! أشعلت الفحم وجمعت اللبان، والآن يتصاعد عبقه من المجمر';
    return this.finish();
  }

  interrupt() {
    this.scraping.interrupt();
    // A newly acquired grip starts a new alternating run in either direction.
    // Keeping the old direction with a new anchor can otherwise lock progress.
    this.scraping.direction = 0;
    this.previousScrape = null;
  }

  snapshot() {
    return {
      ...super.snapshot(),
      coalLit: this.coalLit,
      lit: this.lit,
      scraperHeld: this.scraperHeld,
      scrapeStrokes: this.scraping.strokes,
      scrapeProgress: Math.min(
        1,
        this.scraping.strokes / FRANKINCENSE_SCRAPE_STROKES,
      ),
    };
  }
}
