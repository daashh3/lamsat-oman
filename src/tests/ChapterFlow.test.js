import test from 'node:test';
import assert from 'node:assert/strict';
import { ExperienceManager } from '../core/ExperienceManager.js';
import { GateChapter } from '../chapters/GateChapter.js';
import { FrankincenseChapter } from '../chapters/FrankincenseChapter.js';
import { DhowChapter } from '../chapters/DhowChapter.js';
import { PotteryChapter } from '../chapters/PotteryChapter.js';
import { HalwaChapter } from '../chapters/HalwaChapter.js';
import { CoffeeChapter } from '../chapters/CoffeeChapter.js';
import { FinaleChapter } from '../chapters/FinaleChapter.js';
import { INTERACTION_LAYOUT as L } from '../chapters/ChapterData.js';
import {
  prepareResin,
  finishResin,
  finishGate,
  prepareDhow,
} from './helpers.js';

const advance = (game, seconds = 2.6) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) game.update(0.05);
};
const stir = (target) => {
  for (let n = 0; n < 380; n++)
    target.input('stir', { angle: n * 0.06, radius: 0.12, dt: 0.016 });
};
const fan = (target) => {
  target.input('fan-held', { held: true });
  target.input('fan', { position: [-0.1, 0.12, 0.24], time: 0 });
  for (let n = 1; n <= 6; n++)
    target.input('fan', {
      position: [n % 2 ? 0.1 : -0.1, 0.12, 0.24],
      time: n * 0.2,
    });
};

function playThrough(game) {
  assert.equal(game.start(), true);
  assert.equal(game.state, 'GATE');
  finishGate(game);
  assert.equal(game.progress.count, 0);
  advance(game);
  assert.equal(game.state, 'FRANKINCENSE');
  finishResin(game);
  assert.equal(game.progress.count, 1);
  advance(game, 5.2);
  assert.equal(game.state, 'DHOW');
  prepareDhow(game);
  assert.equal(game.chapter.stage, 'HOIST');
  for (let n = 0; n < 10; n++) game.input('pull', { distance: 0.05 });
  assert.equal(game.progress.count, 2);
  advance(game);
  assert.equal(game.state, 'POTTERY');
  game.input('drop', { id: 'clay', position: L.pottery.wheel.center });
  game.input('shape', { height: 0.3, width: 0.98 });
  advance(game, 1.3);
  assert.equal(game.chapter.stage, 'DECORATE');
  for (const id of [0, 1, 2]) game.input('decorate', { id });
  assert.equal(game.chapter.stage, 'IGNITE_KILN');
  assert.equal(game.input('light-kiln'), true);
  advance(game, 5);
  assert.equal(game.progress.count, 3);
  assert.equal(game.state, 'HALWA');
  for (const id of ['sugar', 'saffron', 'nuts'])
    game.input('drop', { id, position: L.halwa.cauldron.center });
  stir(game);
  assert.equal(game.chapter.stage, 'FAN_FIRE');
  fan(game);
  assert.equal(game.progress.count, 4);
  advance(game);
  assert.equal(game.state, 'COFFEE');
  game.input('cup-held', { held: true });
  for (let n = 0; n < 210; n++)
    game.input('pour', { angle: 0.9, aligned: true, dt: 1 / 60 });
  assert.equal(game.progress.count, 4);
  game.input('stop-pour');
  advance(game, 0.6);
  assert.equal(game.progress.count, 5);
  advance(game);
  assert.equal(game.state, 'FINALE');
  assert.equal(game.progress.count, 5);
}

test('the entire desktop/XR shared action path earns exactly five symbols and resets after ten seconds', () => {
  const events = [],
    game = new ExperienceManager({ onEvent: (event) => events.push(event) });
  playThrough(game);
  assert.equal(
    events.filter((event) => event.type === 'symbol-earned').length,
    5,
  );
  game.input('touch');
  advance(game, 9);
  assert.equal(game.state, 'FINALE');
  assert.ok(game.chapter.countdown > 0);
  advance(game, 1.2);
  assert.equal(game.state, 'READY');
  assert.equal(game.progress.count, 0);
  assert.equal(game.chapter, null);
  playThrough(game);
  assert.equal(game.progress.count, 5);
  assert.equal(
    events.filter((event) => event.type === 'symbol-earned').length,
    10,
  );
});
test('gate tracing is ordered, resumable, and cannot complete from one stationary point', () => {
  const chapter = new GateChapter();
  chapter.input('select-shape', { id: chapter.shapes[0].id });
  const path = chapter.path;
  for (let n = 0; n < 100; n++) chapter.input('trace', { point: path[0] });
  assert.equal(chapter.index, 1);
  chapter.input('trace', { point: [9, 9, 9] });
  assert.equal(chapter.index, 1);
  path.slice(1, 12).forEach((point) => chapter.input('trace', { point }));
  chapter.interrupt();
  path.slice(12).forEach((point) => chapter.input('trace', { point }));
  assert.equal(
    chapter.completed,
    false,
    'One engraving does not finish the three-slot challenge',
  );
  assert.equal(chapter.finishedShapes.size, 1);
  finishGate(chapter);
  assert.equal(chapter.completed, true);
});
test('resin needs the correct drop volume and cannot reward twice', () => {
  let completions = 0;
  const chapter = new FrankincenseChapter({ complete: () => completions++ });
  assert.equal(
    chapter.input('drop', { id: 'resin', position: [0, 0.1, 0] }),
    false,
  );
  assert.equal(
    chapter.input('drop', { id: 'clay', position: L.frankincense.bowl.center }),
    false,
  );
  prepareResin(chapter);
  assert.equal(
    chapter.input('drop', {
      id: 'resin',
      position: L.frankincense.bowl.center,
    }),
    true,
  );
  assert.equal(
    chapter.input('drop', {
      id: 'resin',
      position: L.frankincense.bowl.center,
    }),
    false,
  );
  assert.equal(completions, 1);
});
test('dhow rejects accidental touch, upward movement, and teleported pulls', () => {
  const chapter = new DhowChapter();
  assert.equal(chapter.input('pull', { distance: 0.05 }), false);
  assert.equal(chapter.progress, 0);
  prepareDhow(chapter);
  assert.equal(chapter.stage, 'HOIST');
  for (const distance of [0, -0.1, NaN, 2])
    assert.equal(chapter.input('pull', { distance }), false);
  chapter.input('pull', { distance: 0.05 });
  assert.equal(chapter.completed, false);
  assert.ok(chapter.hoistProgress > 0);
  assert.ok(chapter.hoistProgress < 0.2);
});
test('pottery validates placement, silhouette and three unique decorations before firing', () => {
  const chapter = new PotteryChapter();
  assert.equal(chapter.input('shape', { height: 0.3, width: 0.98 }), false);
  assert.equal(
    chapter.input('drop', { id: 'clay', position: [0, -0.2, 0.18] }),
    false,
  );
  chapter.input('drop', { id: 'clay', position: L.pottery.wheel.center });
  chapter.input('shape', { height: 0.3, width: 1.5 });
  for (let n = 0; n < 50; n++) chapter.update(0.1);
  assert.equal(chapter.stage, 'SHAPE');
  chapter.input('shape', { height: 0.3, width: 1 });
  for (let n = 0; n < 13; n++) chapter.update(0.1);
  assert.equal(chapter.stage, 'DECORATE');
  for (let n = 0; n < 50; n++) chapter.update(0.1);
  assert.equal(chapter.stage, 'DECORATE', 'Waiting cannot bypass decorating');
  chapter.input('decorate', { id: 0 });
  assert.equal(chapter.input('decorate', { id: 0 }), false);
  assert.equal(chapter.input('decorate', { id: 3 }), false);
  chapter.input('decorate', { id: 1 });
  chapter.input('decorate', { id: 2 });
  assert.equal(chapter.stage, 'IGNITE_KILN');
  for (let n = 0; n < 50; n++) chapter.update(0.1);
  assert.equal(chapter.stage, 'IGNITE_KILN', 'Waiting cannot bypass ignition');
  assert.equal(chapter.input('light-kiln'), true);
  assert.equal(chapter.stage, 'FIRING');
  for (let n = 0; n < 25; n++) chapter.update(0.1);
  assert.equal(chapter.completed, true);
});
test('halwa ingredient stages reject wrong order, wrong drop areas, and duplicate items', () => {
  const chapter = new HalwaChapter();
  assert.equal(
    chapter.input('drop', { id: 'nuts', position: L.halwa.cauldron.center }),
    false,
  );
  assert.equal(
    chapter.input('drop', { id: 'sugar', position: [0, 1, 0] }),
    false,
  );
  chapter.input('drop', { id: 'sugar', position: L.halwa.cauldron.center });
  assert.equal(
    chapter.input('drop', { id: 'sugar', position: L.halwa.cauldron.center }),
    false,
  );
  assert.deepEqual(chapter.ingredients, ['sugar']);
  assert.equal(chapter.stage, 'ADD_SAFFRON');
});
test('halwa cannot fan before stirring and requires multiple actual circular rotations', () => {
  const chapter = new HalwaChapter();
  for (const id of ['sugar', 'saffron', 'nuts'])
    chapter.input('drop', { id, position: L.halwa.cauldron.center });
  fan(chapter);
  assert.equal(chapter.stage, 'STIR');
  for (let n = 0; n < 100; n++)
    chapter.input('stir', { angle: n * 0.06, radius: 0.12, dt: 0.016 });
  assert.equal(chapter.stage, 'STIR');
  chapter.interrupt();
  stir(chapter);
  assert.equal(chapter.stage, 'FAN_FIRE');
  chapter.input('fan', { position: [9, 9, 9], time: 0 });
  assert.equal(chapter.fanning.strokes, 0);
  fan(chapter);
  assert.equal(chapter.completed, true);
});
test('coffee requires correct angle, spout alignment, sustained time and a stopped perfect fill', () => {
  const chapter = new CoffeeChapter();
  assert.equal(
    chapter.input('pour', { angle: 0.9, aligned: true, dt: 0.05 }),
    false,
    'The player must carry the cup first',
  );
  chapter.input('cup-held', { held: true });
  for (const data of [
    { angle: 0.9, aligned: false, dt: 0.016 },
    { angle: 0.1, aligned: true, dt: 0.016 },
    { angle: 0.9, aligned: true, dt: 5 },
  ])
    assert.equal(chapter.input('pour', data), false);
  assert.equal(chapter.progress, 0);
  chapter.input('pour', { angle: 0.9, aligned: true, dt: 0.05 });
  assert.equal(chapter.completed, false);
  for (let n = 0; n < 60; n++)
    chapter.input('pour', { angle: 0.9, aligned: true, dt: 0.05 });
  assert.equal(chapter.completed, false);
  chapter.input('stop-pour');
  for (let n = 0; n < 10; n++) chapter.update(0.05);
  assert.equal(chapter.completed, true);
});
test('pause freezes progress and countdown; resume does not connect interrupted gestures', () => {
  const game = new ExperienceManager();
  game.start();
  game.input('select-shape', { id: game.chapter.shapes[0].id });
  const firstPoint = game.chapter.path[0];
  game.pause(true);
  assert.equal(game.input('trace', { point: firstPoint }), false);
  game.update(10);
  assert.equal(game.chapter.index, 0);
  game.pause(false);
  game.input('trace', { point: firstPoint });
  assert.equal(game.chapter.index, 1);
  const finale = new FinaleChapter();
  finale.input('touch');
  finale.input('touch');
  assert.equal(finale.countdown, 10);
});
test('chapter restart clears local state, and full reset clears timers and rewards', () => {
  const game = new ExperienceManager();
  game.start();
  game.input('select-shape', { id: game.chapter.shapes[0].id });
  game.input('trace', { point: game.chapter.path[0] });
  assert.equal(game.chapter.index, 1);
  game.restartChapter();
  assert.equal(game.chapter.index, 0);
  assert.equal(game.chapter.selectedShape, null);
  finishGate(game);
  advance(game);
  finishResin(game);
  assert.equal(game.progress.count, 1);
  game.restartChapter();
  assert.equal(game.progress.count, 1);
  finishResin(game);
  assert.equal(game.progress.count, 1);
  game.reset();
  advance(game, 5);
  assert.equal(game.state, 'READY');
  assert.equal(game.progress.count, 0);
  assert.equal(game.pendingTransition, null);
});
test('normal controls cannot skip chapters or directly complete the experience', () => {
  const game = new ExperienceManager();
  game.start();
  assert.equal(game.input('complete'), false);
  assert.equal(game.input('skip'), false);
  assert.equal(game.input('touch'), false);
  assert.throws(() => game.enterChapter('FINALE'), /five earned/);
  assert.equal(game.state, 'GATE');
});
test('XR lifecycle and recoverable errors preserve safe state boundaries', () => {
  const game = new ExperienceManager();
  game.beginXR();
  assert.equal(game.state, 'XR_ENTERING');
  game.cancelXR();
  assert.equal(game.state, 'READY');
  game.beginXR();
  game.placement();
  game.start();
  assert.equal(game.state, 'GATE');
  game.fail(new Error('Context lost'));
  assert.equal(game.state, 'ERROR');
  assert.equal(game.paused, true);
  game.reset();
  assert.equal(game.state, 'READY');
  assert.equal(game.error, null);
});
