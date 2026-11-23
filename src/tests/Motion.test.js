import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Quaternion, Vector3, Ray } from 'three';
import { PoseTransitions } from '../utils/PoseTransitions.js';
import { ChapterManager } from '../core/ChapterManager.js';
import { GateChapter } from '../chapters/GateChapter.js';
import { FrankincenseChapter } from '../chapters/FrankincenseChapter.js';
import { DhowChapter } from '../chapters/DhowChapter.js';
import { CoffeeChapter } from '../chapters/CoffeeChapter.js';
import { HalwaChapter } from '../chapters/HalwaChapter.js';
import { prepareDhow } from './helpers.js';

test('pose returns ease without a snap and finish identically at 30 and 72 Hz', () => {
  for (const hz of [30, 72]) {
    const object = new Group(),
      motion = new PoseTransitions();
    object.position.set(0.6, 0.4, 0.2);
    object.rotation.z = 1;
    const start = object.position.clone();
    motion.move(object, new Vector3(), new Quaternion(), 0.3);
    assert.ok(object.position.equals(start));
    motion.update(1 / hz);
    assert.ok(object.position.distanceTo(start) < 0.03);
    for (let i = 0; i < hz; i++) motion.update(1 / hz);
    assert.deepEqual(object.position.toArray(), [0, 0, 0]);
    assert.ok(object.quaternion.angleTo(new Quaternion()) < 1e-8);
    assert.equal(motion.items.size, 0);
  }
});

test('re-grabbing a returning tool cancels its return and precision rays ignore shallow angles', () => {
  const chapter = new FrankincenseChapter();
  const scene = new ChapterManager({
    content: new Group(),
    game: { chapter, paused: false, input: (a, d) => chapter.input(a, d) },
    audio: { effect() {} },
  });
  try {
    scene.build('FRANKINCENSE');
    scene.update(0.6);
    chapter.input('light-coal');
    const tool = scene.targets.find((t) => t.id === 'scraper');
    scene.begin('hand', scene.targetPoint(tool));
    scene.setPoint(tool, new Vector3(-0.1, 0.3, 0.02));
    const moved = tool.object.position.clone();
    scene.release('hand');
    assert.ok(tool.object.position.equals(moved));
    scene.update(0.1);
    assert.ok(tool.object.position.distanceTo(tool.home) > 0);
    scene.begin('hand', scene.targetPoint(tool));
    const grabbed = tool.object.position.clone();
    scene.update(0.5);
    assert.ok(tool.object.position.equals(grabbed));
    assert.equal(
      scene.desktopPlane(
        new Ray(new Vector3(0, 0.3, 1), new Vector3(1, 0, -0.001).normalize()),
        'hand',
        'SCRAPE_TREE',
      ),
      null,
    );
    scene.pointer({
      id: 'hand',
      source: 'hand',
      phase: 'move',
      position: new Vector3(NaN, 0, 0),
    });
    assert.ok(tool.object.position.equals(grabbed));
    scene.cancelAll();
    assert.ok(tool.object.position.equals(tool.home));
    assert.equal(scene.motion.items.size, 0);
  } finally {
    scene.dispose();
  }
});

test('assisted direct tracing advances in order, stops on release and needs no tool', () => {
  const chapter = new GateChapter();
  const samples = [];
  const scene = new ChapterManager({
    content: new Group(),
    game: {
      chapter,
      paused: false,
      input: (a, d) => {
        if (a === 'trace') samples.push(new Vector3(...d.point));
        return chapter.input(a, d);
      },
    },
    audio: { effect() {} },
  });
  try {
    scene.update(0.6);
    chapter.input('select-shape', { id: 'star' });
    scene.assistStart('trace');
    assert.equal(
      scene.targets.some((target) => target.id === 'engraver'),
      false,
    );
    scene.update(0.1);
    assert.equal(chapter.index, 1);
    scene.assistEnd();
    scene.update(0.5);
    assert.equal(
      chapter.index,
      1,
      'Releasing the assist cannot keep engraving',
    );
    scene.assistStart('trace');
    for (let i = 0; i < 1000 && !chapter.finishedShapes.has('star'); i++) {
      scene.update(0.02);
    }
    assert.deepEqual(
      samples.map((point) => point.toArray()),
      chapter.shapes[0].path,
    );
    assert.ok(chapter.finishedShapes.has('star'));
  } finally {
    scene.dispose();
  }
});

test('rope progress follows its constrained handle and assisted pulls remain continuous', () => {
  const chapter = new DhowChapter();
  prepareDhow(chapter);
  const scene = new ChapterManager({
    content: new Group(),
    game: { chapter, paused: false, input: (a, d) => chapter.input(a, d) },
    audio: { effect() {} },
  });
  try {
    scene.build('DHOW');
    scene.update(0.6);
    const rope = scene.targets.find((t) => t.id === 'rope');
    const origin = scene.objectPoint(rope);
    scene.pointer({
      id: 'hand',
      phase: 'start',
      source: 'hand',
      position: scene.root.localToWorld(origin.clone()),
    });
    for (let i = 1; i <= 10; i++) {
      scene.pointer({
        id: 'hand',
        phase: 'move',
        source: 'hand',
        position: scene.root.localToWorld(
          origin.clone().add(new Vector3(0, -i * 0.05, 0)),
        ),
      });
    }
    assert.ok(
      Math.abs(chapter.pulled - 0.22) < 1e-9,
      'moving beyond the rope travel must not earn progress',
    );
    scene.release('hand', true);
    scene.assistStart('pull');
    let previous = scene.objectPoint(rope);
    for (let i = 0; i < 1500 && !chapter.completed; i++) {
      scene.update(0.02);
      const current = scene.objectPoint(rope);
      assert.ok(
        current.distanceTo(previous) < 0.0036,
        'assisted rope must not jump when its stroke reverses or the boat starts rocking',
      );
      previous = current;
    }
    assert.ok(chapter.completed);
  } finally {
    scene.dispose();
  }
});

test('starting an automatic pour during a manual return removes the competing animation', () => {
  const chapter = new CoffeeChapter();
  const scene = new ChapterManager({
    content: new Group(),
    game: { chapter, paused: false, input: (a, d) => chapter.input(a, d) },
    audio: { effect() {} },
  });
  try {
    scene.build('COFFEE');
    scene.update(0.6);
    scene.toggleDesktopCup();
    const pot = scene.targets.find((t) => t.id === 'coffee');
    scene.begin('hand', scene.targetPoint(pot));
    pot.object.position.y += 0.1;
    scene.release('hand');
    assert.ok(scene.motion.items.has(pot.object));
    assert.ok(scene.startCoffeePour());
    assert.equal(scene.motion.items.has(pot.object), false);
    assert.ok(scene.pourAnimator.active);
  } finally {
    scene.dispose();
  }
});

test('assisted stirring and fanning ease into place and still complete the cooking gestures', () => {
  const chapter = new HalwaChapter();
  const scene = new ChapterManager({
    content: new Group(),
    game: { chapter, paused: false, input: (a, d) => chapter.input(a, d) },
    audio: { effect() {} },
  });
  try {
    scene.build('HALWA');
    scene.update(0.6);
    for (const id of ['sugar', 'saffron', 'nuts'])
      chapter.input('drop', { id, position: [0, 0.25, 0] });
    assert.equal(chapter.stage, 'STIR');
    scene.assistStart('stir');
    for (let i = 0; i < 1800 && chapter.stage === 'STIR'; i++)
      scene.update(0.02);
    assert.equal(chapter.stage, 'FAN_FIRE');
    scene.assistEnd();
    scene.assistStart('fan');
    const fan = scene.targets.find((t) => t.id === 'fan');
    let previous = scene.objectPoint(fan);
    for (let i = 0; i < 1200 && !chapter.completed; i++) {
      scene.update(0.02);
      const position = scene.objectPoint(fan);
      assert.ok(position.distanceTo(previous) <= 0.01601);
      previous = position;
    }
    assert.ok(chapter.completed);
  } finally {
    scene.dispose();
  }
});
