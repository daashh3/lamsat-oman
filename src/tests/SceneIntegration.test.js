import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Vector3 } from 'three';
import { ExperienceManager } from '../core/ExperienceManager.js';
import { ChapterManager } from '../core/ChapterManager.js';
import { INTERACTION_LAYOUT as L } from '../chapters/ChapterData.js';
import { finishResin, finishGate, prepareDhow } from './helpers.js';

test('one-hand pottery fallback deforms the real scene while preserving the same silhouette gate', () => {
  let scene;
  const game = new ExperienceManager({
    onEvent: (e) => {
      if (e.type === 'chapter-enter') scene.build(e.chapter);
      else scene?.event(e);
    },
  });
  scene = new ChapterManager({
    content: new Group(),
    game,
    audio: { effect() {} },
  });
  const advance = (seconds = 2.5) => {
    for (let time = 0; time < seconds; time += 0.05) game.update(0.05);
  };
  game.start();
  finishGate(game);
  advance();
  finishResin(game);
  advance(5.2);
  prepareDhow(game);
  for (let i = 0; i < 10; i++) game.input('pull', { distance: 0.05 });
  advance();
  assert.equal(game.state, 'POTTERY');
  game.input('drop', { id: 'clay', position: L.pottery.wheel.center });
  const event = (phase, position) => ({
    id: 'one-hand',
    phase,
    source: 'hand',
    position: new Vector3(...position),
    dt: 1 / 60,
  });
  scene.pointer(event('start', [0.1, 0.33, 0.18]));
  assert.equal(scene.grabs.get('one-hand').target.id, 'vase');
  scene.pointer(event('move', [0.0075, 0.49, 0.18]));
  scene.update(0.016);
  assert.ok(Math.abs(game.chapter.height - 0.3) < 0.0001);
  assert.ok(Math.abs(game.chapter.width - 0.98) < 0.0001);
  assert.ok(Math.abs(scene.models.vase.userData.height - 0.3) < 0.0001);
  assert.ok(Math.abs(scene.models.vase.userData.width - 0.196) < 0.0001);
  scene.pointer(event('end', [0.0075, 0.49, 0.18]));
  assert.equal(scene.grabs.size, 0);
  for (let i = 0; i < 26; i++) game.update(0.05);
  assert.equal(game.chapter.stage, 'DECORATE');
  for (const id of [0, 1, 2]) game.input('decorate', { id });
  assert.equal(game.chapter.stage, 'IGNITE_KILN');
  assert.equal(game.input('light-kiln'), true);
  for (let i = 0; i < 49; i++) game.update(0.05);
  assert.equal(game.progress.count, 3);
  scene.dispose();
});
