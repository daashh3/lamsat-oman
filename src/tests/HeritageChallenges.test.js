import test from 'node:test';
import assert from 'node:assert/strict';
import { CoffeeChapter } from '../chapters/CoffeeChapter.js';
import { FrankincenseChapter } from '../chapters/FrankincenseChapter.js';
import { INTERACTION_LAYOUT } from '../chapters/ChapterData.js';

const pour = (chapter, seconds, dt = 0.05) => {
  for (let time = 0; time < seconds - 1e-9; time += dt)
    chapter.input('pour', {
      angle: 1,
      aligned: true,
      dt: Math.min(dt, seconds - time),
    });
};
const tick = (chapter, seconds) => {
  for (let time = 0; time < seconds - 1e-9; time += 0.05)
    chapter.update(Math.min(0.05, seconds - time));
};
function fixture() {
  const events = [];
  let completed = 0;
  const chapter = new CoffeeChapter({
    emit: (event) => events.push(event),
    complete: () => completed++,
  });
  chapter.input('cup-held', { held: true });
  return { chapter, events, completions: () => completed };
}

test('charcoal, tree scraping and resin placement issue the incense reward once', () => {
  const events = [];
  let completions = 0;
  const chapter = new FrankincenseChapter({
    emit: (event) => events.push(event),
    complete: () => completions++,
  });
  assert.equal(chapter.snapshot().lit, false);
  assert.equal(chapter.input('light-coal'), true);
  assert.equal(chapter.snapshot().coalLit, true);
  assert.equal(chapter.snapshot().lit, false);
  chapter.input('scraper-held', { held: true });
  for (let i = 0; i < 100 && chapter.stage === 'SCRAPE_TREE'; i++)
    chapter.input('scrape-tree', {
      position: [0, 0.38 + Math.sin(i * 0.25) * 0.1, 0.045],
      time: i * 0.05,
    });
  assert.equal(chapter.stage, 'PLACE_RESIN');
  assert.equal(
    chapter.input('drop', {
      id: 'resin',
      position: INTERACTION_LAYOUT.frankincense.bowl.center,
    }),
    true,
  );
  assert.equal(chapter.snapshot().lit, true);
  assert.equal(chapter.input('light-incense'), false);
  assert.equal(
    chapter.input('drop', {
      id: 'resin',
      position: INTERACTION_LAYOUT.frankincense.bowl.center,
    }),
    false,
  );
  assert.equal(
    events.filter((event) => event.type === 'incense-lit').length,
    1,
  );
  assert.equal(completions, 1);
});

test('a perfect band only succeeds after the actual stream stops and settles', () => {
  const { chapter, events, completions } = fixture();
  pour(chapter, 3.5);
  tick(chapter, 2);
  assert.ok(Math.abs(chapter.fillLevel - 0.7) < 1e-8);
  assert.equal(
    chapter.completed,
    false,
    'Holding a perfectly filled cup under a stream does not win',
  );
  chapter.input('pour', { angle: 0, aligned: true, dt: 0.05 });
  tick(chapter, 0.45);
  assert.equal(chapter.completed, false);
  tick(chapter, 0.05);
  assert.equal(chapter.completed, true);
  assert.equal(chapter.lastResult, 'perfect');
  chapter.input('stop-pour');
  tick(chapter, 1);
  assert.equal(completions(), 1);
  assert.equal(
    events.filter((event) => event.type === 'perfect-pour').length,
    1,
  );
});

test('overflow fails once, retains the spill state briefly, empties and permits a successful retry', () => {
  const { chapter, events, completions } = fixture();
  pour(chapter, 5.4);
  assert.equal(chapter.completed, false);
  assert.equal(chapter.stage, 'RESETTING');
  assert.equal(chapter.fillLevel, 1);
  assert.equal(chapter.overfills, 1);
  assert.equal(
    events.filter((event) => event.type === 'pour-failed').length,
    1,
  );
  assert.equal(
    events.find((event) => event.type === 'pour-failed').reason,
    'overflow',
  );
  tick(chapter, 0.95);
  assert.equal(chapter.stage, 'RESETTING');
  tick(chapter, 0.05);
  assert.equal(chapter.stage, 'POUR');
  assert.equal(chapter.fillLevel, 0);
  assert.equal(events.filter((event) => event.type === 'pour-reset').length, 1);
  pour(chapter, 3.5);
  chapter.input('stop-pour');
  tick(chapter, 0.5);
  assert.equal(chapter.completed, true);
  assert.equal(chapter.attempts, 2);
  assert.equal(completions(), 1);
});

test('underfilled and over-band stopped cups fail without awarding a collectible', () => {
  for (const [seconds, reason] of [
    [1, 'underfilled'],
    [4.5, 'overfilled'],
  ]) {
    const { chapter, events, completions } = fixture();
    pour(chapter, seconds);
    chapter.input('stop-pour');
    tick(chapter, 0.5);
    assert.equal(chapter.stage, 'RESETTING');
    assert.equal(chapter.lastResult, reason);
    assert.equal(
      events.filter((event) => event.type === 'pour-failed').length,
      1,
    );
    assert.equal(completions(), 0);
  }
});

test('pause or tracking interruption cannot settle a win and resuming flow cancels a pending decision', () => {
  const { chapter, completions } = fixture();
  pour(chapter, 3.5);
  chapter.input('stop-pour');
  tick(chapter, 0.3);
  chapter.interrupt();
  tick(chapter, 2);
  assert.equal(chapter.stage, 'POUR');
  assert.equal(completions(), 0);
  assert.ok(
    Math.abs(chapter.fillLevel - 0.7) < 1e-8,
    'Pause retains the actual liquid',
  );
  chapter.input('stop-pour');
  tick(chapter, 0.3);
  pour(chapter, 0.1);
  tick(chapter, 2);
  assert.equal(chapter.stage, 'POUR');
  assert.equal(completions(), 0);
  chapter.input('stop-pour');
  tick(chapter, 0.5);
  assert.equal(completions(), 1);
});

test('invalid physical samples cannot add liquid or finish a pending pour', () => {
  const { chapter } = fixture();
  for (const sample of [
    { angle: 1, aligned: false, dt: 0.05 },
    { angle: 0.1, aligned: true, dt: 0.05 },
    { angle: NaN, aligned: true, dt: 0.05 },
    { angle: 1, aligned: true, dt: 2 },
    { angle: 1, aligned: true, dt: NaN },
    { angle: 1, aligned: true, dt: -0.05 },
  ])
    assert.equal(chapter.input('pour', sample), false);
  assert.equal(chapter.fillLevel, 0);
  assert.equal(chapter.attempts, 0);
  pour(chapter, 3.5);
  chapter.input('pour', { angle: 0, aligned: false, dt: 10 });
  chapter.input('pour', { angle: NaN, aligned: true, dt: 0.05 });
  tick(chapter, 1);
  assert.equal(chapter.completed, false);
  assert.equal(chapter.isPouring, true);
});

test('the lower and upper perfect-fill boundaries are inclusive across frame rates', () => {
  for (const target of [0.6, 0.8])
    for (const dt of [1 / 30, 1 / 72]) {
      const { chapter } = fixture();
      pour(chapter, target / INTERACTION_LAYOUT.coffee.fillRate, dt);
      chapter.input('stop-pour');
      tick(chapter, 0.5);
      assert.equal(chapter.completed, true, `target ${target} at ${1 / dt} Hz`);
    }
});
