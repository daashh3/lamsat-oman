import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Ray, Vector3, Quaternion } from 'three';
import { ChapterManager } from '../core/ChapterManager.js';
import { CoffeeChapter } from '../chapters/CoffeeChapter.js';
import { FrankincenseChapter } from '../chapters/FrankincenseChapter.js';
import { PotteryChapter } from '../chapters/PotteryChapter.js';
import { GateChapter } from '../chapters/GateChapter.js';
import { prepareResin } from './helpers.js';

function fixture(state, Chapter) {
  let scene;
  const events = [];
  const sounds = [];
  const chapter = new Chapter({
    emit: (event) => {
      events.push(event);
      scene?.event(event);
    },
  });
  const game = {
    state,
    chapter,
    paused: false,
    input: (action, payload) => chapter.input(action, payload),
  };
  scene = new ChapterManager({
    content: new Group(),
    game,
    audio: { effect: (type, position) => sounds.push({ type, position }) },
  });
  scene.build(state);
  const step = (seconds) => {
    for (let t = 0; t < seconds; t += 0.02) {
      scene.update(0.02);
      chapter.update(0.02);
    }
  };
  const select = (point) =>
    scene.activate({
      phase: 'start',
      source: 'desktop',
      ray: new Ray(
        point.clone().add(new Vector3(0, 0, 1)),
        new Vector3(0, 0, -1),
      ),
    });
  return { scene, chapter, events, sounds, step, select };
}

test('physical slots select shapes and direct tracing engraves all three without a tool', () => {
  const f = fixture('GATE', GateChapter);
  const event = (phase, position) => ({
    id: 'hand',
    source: 'hand',
    phase,
    position: f.scene.root.localToWorld(f.scene.engravingPoint(position)),
  });
  try {
    f.step(0.6);
    assert.equal(
      f.scene.targets.some((target) => target.id === 'engraver'),
      false,
    );
    for (const shape of f.chapter.shapes) {
      const slot = f.scene.models.gate.userData.slots.find(
        (s) => s.id === shape.id,
      );
      assert.equal(f.select(slot.center), true);
      assert.equal(f.chapter.selectedShape, shape.id);
      f.scene.pointer(event('hover', new Vector3(...shape.path[0])));
      assert.equal(f.chapter.index, 0, 'Hover alone cannot engrave');
      f.scene.pointer(event('start', new Vector3(...shape.path[0])));
      f.scene.pointer(event('end', new Vector3(...shape.path[0])));
      f.scene.pointer(event('move', new Vector3(...shape.path[1])));
      assert.equal(
        f.chapter.index,
        1,
        'A released pointer cannot continue tracing',
      );
      f.scene.pointer(event('start', new Vector3(...shape.path[1])));
      for (const point of shape.path.slice(2))
        f.scene.pointer(event('move', new Vector3(...point)));
      f.scene.pointer(event('end', new Vector3()));
      assert.ok(f.chapter.finishedShapes.has(shape.id));
    }
    assert.equal(f.chapter.completed, true);
    f.step(0.3);
    assert.ok(f.scene.models.gate.userData.leftDoor.rotation.y < -0.2);
    assert.equal(
      f.sounds.filter((sound) => sound.type === 'door-open').length,
      1,
    );
    const count = f.sounds.length;
    f.step(1);
    assert.equal(
      f.sounds.length,
      count,
      'The opening animation does not retrigger sound each frame',
    );
  } finally {
    f.scene.dispose();
  }
});

test('tree scraping samples the held blade tip and cancellation returns its grip home', () => {
  const f = fixture('FRANKINCENSE', FrankincenseChapter);
  const event = (phase, position) => ({
    id: 'hand',
    source: 'hand',
    phase,
    position,
  });
  try {
    f.step(0.6);
    f.chapter.input('light-coal');
    const tool = f.scene.targets.find((t) => t.id === 'scraper');
    f.scene.pointer(event('start', f.scene.targetPoint(tool)));
    assert.equal(f.chapter.scraperHeld, true);
    const sample = (y) => {
      f.step(0.04);
      const tip = f.scene.models.tree.localToWorld(new Vector3(0, y, 0.045));
      const offset = f.scene.models.tree.userData.scraperTip.position;
      f.scene.pointer(event('move', tip.sub(offset)));
    };
    sample(0.32);
    for (let stroke = 0; stroke < 4; stroke++)
      for (let j = 1; j <= 10; j++)
        sample(stroke % 2 ? 0.44 - j * 0.012 : 0.32 + j * 0.012);
    assert.equal(f.chapter.stage, 'PLACE_RESIN');
    f.scene.pointer(event('cancel', new Vector3()));
    assert.equal(f.chapter.scraperHeld, false);
    assert.deepEqual(tool.object.position.toArray(), tool.home.toArray());
    assert.equal(f.scene.models.tree.userData.resin.visible, true);
  } finally {
    f.scene.dispose();
  }
});

test('a ray ignites only coal; scraping and dropping resin starts bounded smoke', () => {
  const f = fixture('FRANKINCENSE', FrankincenseChapter);
  try {
    assert.equal(f.select(new Vector3(0, 0.41, 0.09)), true);
    assert.equal(f.chapter.lit, false);
    assert.equal(f.chapter.coalLit, true);
    assert.equal(f.scene.models.tree.userData.resin.visible, false);
    prepareResin(f.chapter);
    assert.equal(f.scene.models.tree.userData.resin.visible, true);
    f.chapter.input('drop', { id: 'resin', position: [0, 0.47, 0] });
    f.step(1);
    assert.equal(
      f.scene.models.tree.userData.scrapeSurface.material.color.getHexString(),
      'ca975c',
      'The harvested bark stays visibly scraped after scene updates',
    );
    assert.equal(f.chapter.lit, true);
    assert.ok(
      f.scene.models.burner.userData.coalMaterial.emissiveIntensity > 1,
    );
    assert.ok(f.scene.particles.pool.some((p) => p.smoke && p.life > 0));
    assert.equal(
      f.events.filter((event) => event.type === 'incense-lit').length,
      1,
    );
  } finally {
    f.scene.dispose();
  }
});

test('three real vase surface selections decorate before full-size kiln firing', () => {
  const f = fixture('POTTERY', PotteryChapter);
  try {
    f.chapter.input('drop', { id: 'clay', position: [0, 0.18, 0.18] });
    f.chapter.input('shape', { height: 0.3, width: 0.98 });
    f.step(1.3);
    assert.equal(f.chapter.stage, 'DECORATE');
    const vase = f.scene.models.vase;
    assert.equal(vase.rotation.y, 0);
    for (const target of vase.userData.decorationTargets) {
      const position = vase.localToWorld(new Vector3(...target.position));
      assert.equal(f.select(position), true);
      assert.equal(vase.userData.bands[target.id].visible, true);
    }
    assert.equal(f.chapter.stage, 'IGNITE_KILN');
    f.step(3);
    assert.equal(f.scene.models.workshop.userData.kilnGlow.visible, false);
    const igniter = f.scene.models.workshop.userData.kilnIgniter;
    assert.equal(f.select(igniter.getWorldPosition(new Vector3())), true);
    assert.equal(f.chapter.stage, 'FIRING');
    f.step(2.5);
    assert.equal(f.chapter.completed, true);
    assert.deepEqual(vase.scale.toArray(), [1, 1, 1]);
    assert.ok(vase.position.distanceTo(new Vector3(0.38, 0.025, 0.12)) < 1e-8);
  } finally {
    f.scene.dispose();
  }
});

test('desktop pot selection requires a held cup and supports overflow and perfect retry', () => {
  const f = fixture('COFFEE', CoffeeChapter);
  try {
    const { dallah, stream } = f.scene.models.coffee.userData;
    const point = dallah.position.clone().add(new Vector3(0, 0.14, 0));
    f.select(point);
    assert.equal(f.scene.pourAnimator.active, false);
    f.scene.toggleDesktopCup();
    assert.equal(f.select(point), true);
    f.step(2);
    assert.equal(stream.visible, true);
    assert.ok(f.chapter.fillLevel > 0);
    for (let i = 0; i < 400 && f.chapter.overfills === 0; i++) f.step(0.02);
    assert.equal(f.chapter.overfills, 1);
    assert.equal(f.chapter.completed, false);
    assert.equal(stream.visible, false);
    assert.deepEqual(
      dallah.position.toArray(),
      f.scene.pourAnimator.homePosition.toArray(),
    );
    f.step(1.2);
    assert.equal(f.chapter.fillLevel, 0);
    f.scene.toggleDesktopCup();
    assert.equal(f.select(point), true);
    for (let i = 0; i < 400 && f.chapter.fillLevel < 0.62; i++) f.step(0.02);
    assert.equal(f.scene.stopCoffeePour(), true);
    f.step(2);
    assert.equal(f.chapter.lastResult, 'perfect');
    assert.equal(f.chapter.completed, true);
    assert.ok(f.chapter.fillLevel >= 0.6 && f.chapter.fillLevel <= 0.8);
    assert.equal(
      f.events.filter((event) => event.type === 'perfect-pour').length,
      1,
    );
  } finally {
    f.scene.dispose();
  }
});

test('two tracked hands hold a cup and tilt the base-pivot pot; releasing cup stops flow', () => {
  const f = fixture('COFFEE', CoffeeChapter);
  try {
    const event = (id, phase, position, quaternion = new Quaternion()) => ({
      id,
      phase,
      source: 'hand',
      position,
      quaternion,
      dt: 0.02,
    });
    const cupTarget = f.scene.targets.find((t) => t.id === 'cup');
    const potTarget = f.scene.targets.find((t) => t.id === 'coffee');
    f.scene.pointer(event('left', 'start', f.scene.targetPoint(cupTarget)));
    f.scene.pointer(event('left', 'move', new Vector3(0.25, 0.3, 0.08)));
    f.scene.pointer(event('right', 'start', f.scene.targetPoint(potTarget)));
    const q = new Quaternion().setFromAxisAngle(
      new Vector3(0, 0, 1),
      -Math.PI / 3,
    );
    const spout = f.scene.models.coffee.userData.spout;
    const base = f.scene
      .cupPosition()
      .add(new Vector3(0, 0.16, 0))
      .sub(spout.position.clone().applyQuaternion(q));
    const pointer = base
      .clone()
      .add(f.scene.grabs.get('right').localGrip.clone().applyQuaternion(q));
    f.scene.pointer(event('right', 'move', pointer, q));
    assert.ok(
      potTarget.object
        .localToWorld(f.scene.grabs.get('right').localGrip.clone())
        .distanceTo(pointer) < 1e-8,
      'The contact point stays inside the rotating hand',
    );
    f.step(0.5);
    assert.equal(f.chapter.cupHeld, true);
    assert.ok(f.chapter.fillLevel > 0.05);
    assert.equal(f.scene.models.coffee.userData.stream.visible, true);
    f.scene.pointer(event('left', 'end', new Vector3(0.25, 0.3, 0.08)));
    const fill = f.chapter.fillLevel;
    f.step(1);
    assert.equal(f.chapter.cupHeld, false);
    assert.equal(f.chapter.fillLevel, fill);
    assert.equal(f.chapter.completed, false);
  } finally {
    f.scene.dispose();
  }
});

test('VR ray grip works from the side and moves and rotates the cup in three dimensions', async () => {
  globalThis.location ||= { search: '' };
  const { App } = await import('../app/App.js');
  const f = fixture('COFFEE', CoffeeChapter);
  const app = {
    chapters: f.scene,
    game: f.scene.game,
    hud: { interact: () => false, releasePointer() {} },
  };
  const id = 'side-controller';
  try {
    f.step(0.6);
    const cup = f.scene.targets.find((t) => t.id === 'cup');
    const center = f.scene.root.localToWorld(f.scene.targetPoint(cup));
    const makeRay = (target) =>
      new Ray(target.clone().add(new Vector3(1, 0, 0)), new Vector3(-1, 0, 0));
    App.prototype.xrInput.call(app, {
      id,
      phase: 'start',
      source: 'controller',
      ray: makeRay(center),
      quaternion: new Quaternion(),
    });
    assert.equal(f.scene.grabs.get(id)?.target, cup);
    assert.ok(Number.isFinite(f.scene.grabs.get(id).rayDistance));
    const destination = center.clone().add(new Vector3(0.1, 0.16, 0.2));
    const rotation = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      0.5,
    );
    App.prototype.xrInput.call(app, {
      id,
      phase: 'move',
      source: 'controller',
      ray: makeRay(destination),
      quaternion: rotation,
    });
    const contact = cup.object.localToWorld(cup.offset.clone());
    assert.ok(
      contact.distanceTo(destination) < 1e-7,
      'grip is not constrained to the front-facing desktop plane',
    );
    assert.ok(cup.object.quaternion.angleTo(rotation) < 1e-7);
    assert.equal(f.chapter.cupHeld, true);
    App.prototype.xrInput.call(app, { id, phase: 'end', source: 'controller' });
    assert.equal(f.chapter.cupHeld, false);
  } finally {
    f.scene.dispose();
  }
});
