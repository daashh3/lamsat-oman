import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngravingPatterns } from '../chapters/EngravingPatterns.js';
import { GateChapter } from '../chapters/GateChapter.js';

test('generated shapes remain inside their individual door covers with seam clearance', () => {
  const outlines = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    let state = seed;
    const shapes = createEngravingPatterns(
      () =>
        (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296,
    );
    assert.deepEqual(
      shapes.map((s) => s.id),
      ['star', 'square', 'random'],
    );
    for (const s of shapes)
      for (const p of s.path) {
        assert.ok(p.every(Number.isFinite));
        assert.ok(Math.abs(p[0] - s.center[0]) < s.width / 2 - 0.015);
        assert.ok(Math.abs(p[1] - s.center[1]) < s.height / 2 - 0.01);
        assert.ok(Math.abs(p[0]) > 0.025, 'No line crosses the door seam');
      }
    outlines.add(JSON.stringify(shapes[2].outline));
  }
  assert.equal(outlines.size, 40);
});

test('selection changes retain partial carvings and invalid slots never advance the door', () => {
  const chapter = new GateChapter();
  assert.equal(chapter.input('select-shape', { id: 'missing' }), false);
  assert.equal(
    chapter.input('trace', { point: chapter.shapes[0].path[0] }),
    false,
    'A template must be selected first',
  );
  chapter.input('select-shape', { id: 'star' });
  const path = chapter.path;
  assert.equal(
    chapter.input('engraving-tool-held', { held: true }),
    false,
    'The removed tool action does nothing',
  );
  path.slice(0, 5).forEach((point) => chapter.input('trace', { point }));
  chapter.input('select-shape', { id: 'square' });
  chapter.input('select-shape', { id: 'star' });
  assert.equal(chapter.index, 5);
  chapter.interrupt();
  assert.equal(chapter.input('trace', { point: [8, 8, 8] }), false);
  assert.equal(
    chapter.input('trace', { point: path[5] }),
    true,
    'Direct tracing resumes without picking up any tool',
  );
  assert.equal(chapter.finishedShapes.size, 0);
  assert.equal(chapter.completed, false);
});
