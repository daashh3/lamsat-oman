import { INTERACTION_LAYOUT } from '../chapters/ChapterData.js';
import { DHOW_CORDS } from '../chapters/DhowWeaving.js';

/** Mount every cord through its ordered guides before the public hoist action. */
export function prepareDhow(target) {
  const chapter = target.chapter || target;
  for (const cord of DHOW_CORDS) {
    for (const position of cord.path.slice(chapter.cordProgress[cord.id]))
      target.input('weave', { id: cord.id, position });
  }
}

/** Select and engrave all three shapes using the public gameplay actions. */
export function finishGate(target) {
  const chapter = target.chapter || target;
  for (const pattern of chapter.shapes) {
    if (chapter.finishedShapes.has(pattern.id)) continue;
    target.input('select-shape', { id: pattern.id });
    for (const point of chapter.path.slice(chapter.index))
      target.input('trace', { point });
  }
}

/** Exercise the same ordered physical samples for a chapter or ExperienceManager. */
export function prepareResin(target) {
  target.input('light-coal');
  target.input('scraper-held', { held: true });
  let time = 0;
  target.input('scrape-tree', { position: [0, 0.32, 0.045], time });
  for (let stroke = 0; stroke < 4; stroke++) {
    for (let sample = 1; sample <= 10; sample++) {
      time += 0.04;
      const fraction = sample / 10;
      const y = stroke % 2 ? 0.44 - fraction * 0.12 : 0.32 + fraction * 0.12;
      target.input('scrape-tree', { position: [0, y, 0.045], time });
    }
  }
}

export function finishResin(target) {
  prepareResin(target);
  return target.input('drop', {
    id: 'resin',
    position: INTERACTION_LAYOUT.frankincense.bowl.center,
  });
}
