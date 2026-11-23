import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressManager } from '../core/ProgressManager.js';
import { COLLECTIBLE_CHAPTERS } from '../chapters/ChapterData.js';

test('exactly five activities award symbols; gate and finale never do', () => {
  const progress = new ProgressManager();
  assert.equal(progress.award('GATE'), false); assert.equal(progress.award('FINALE'), false);
  for (const [index, chapter] of COLLECTIBLE_CHAPTERS.entries()) { assert.equal(progress.award(chapter), true); assert.equal(progress.count, index + 1); }
  assert.equal(progress.complete, true); assert.equal(progress.count, 5);
});
test('duplicate and out-of-order rewards are rejected', () => {
  const progress = new ProgressManager();
  assert.equal(progress.award('COFFEE'), false); assert.equal(progress.award('FRANKINCENSE'), true);
  for (let index = 0; index < 20; index++) assert.equal(progress.award('FRANKINCENSE'), false);
  assert.equal(progress.award('POTTERY'), false); assert.equal(progress.count, 1);
});
test('snapshot arrays cannot mutate earned state', () => {
  const progress = new ProgressManager(); progress.award('FRANKINCENSE'); const snapshot = progress.snapshot(); snapshot.earned.push('COFFEE'); progress.earned.length = 0; assert.equal(progress.count, 1);
});
test('reset clears complete state and allows another full playthrough', () => {
  const progress = new ProgressManager(); COLLECTIBLE_CHAPTERS.forEach(chapter => progress.award(chapter)); progress.reset();
  assert.equal(progress.complete, false); assert.equal(progress.count, 0); assert.deepEqual(progress.earned, []);
  COLLECTIBLE_CHAPTERS.forEach(chapter => assert.equal(progress.award(chapter), true)); assert.equal(progress.count, 5);
});
