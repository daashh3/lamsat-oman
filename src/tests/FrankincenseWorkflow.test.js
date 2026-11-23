import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import {
  FrankincenseChapter,
  FRANKINCENSE_SCRAPE_ZONE,
} from '../chapters/FrankincenseChapter.js';
import { INTERACTION_LAYOUT } from '../chapters/ChapterData.js';
import { createTree } from '../objects/FrankincenseTree.js';
import { createMabkhara } from '../objects/OmaniMabkhara.js';
import { ResourceManager } from '../core/ResourceManager.js';

function scrape(chapter, startTime = 0) {
  let time = startTime;
  chapter.input('scrape-tree', { position: [0, 0.32, 0.045], time });
  for (let stroke = 0; stroke < 4; stroke++) {
    for (let sample = 1; sample <= 10; sample++) {
      time += 0.04;
      const fraction = sample / 10;
      const y = stroke % 2 ? 0.44 - fraction * 0.12 : 0.32 + fraction * 0.12;
      chapter.input('scrape-tree', { position: [0, y, 0.045], time });
    }
  }
  return time;
}

test('incense requires charcoal, continuous bark strokes, then an actual resin drop in order', () => {
  const events = [];
  let completions = 0;
  const chapter = new FrankincenseChapter({
    emit: (event) => events.push(event),
    complete: () => completions++,
  });
  const validDrop = {
    id: 'resin',
    position: INTERACTION_LAYOUT.frankincense.bowl.center,
  };
  assert.equal(chapter.stage, 'LIGHT_COAL');
  assert.equal(chapter.input('drop', validDrop), false);
  scrape(chapter);
  assert.equal(chapter.snapshot().scrapeStrokes, 0);
  assert.equal(chapter.input('light-coal'), true);
  assert.equal(chapter.coalLit, true);
  assert.equal(
    chapter.lit,
    false,
    'Hot coals alone do not produce incense smoke',
  );
  assert.equal(chapter.completed, false);
  assert.equal(
    chapter.input('light-incense'),
    false,
    'Repeated ignition is not a shortcut',
  );
  assert.equal(chapter.input('drop', validDrop), false);
  assert.equal(
    chapter.input('scrape-tree', { position: [0, 0.32, 0.045], time: 0 }),
    false,
    'Empty-hand scraping is rejected',
  );
  chapter.input('scraper-held', { held: true });
  scrape(chapter);
  assert.equal(chapter.stage, 'PLACE_RESIN');
  assert.equal(chapter.snapshot().scrapeProgress, 1);
  assert.equal(
    chapter.input('drop', { id: 'resin', position: [1, 1, 1] }),
    false,
  );
  assert.equal(chapter.input('drop', validDrop), true);
  assert.equal(chapter.lit, true);
  assert.equal(chapter.completed, true);
  assert.equal(chapter.input('drop', validDrop), false);
  assert.equal(completions, 1);
  assert.deepEqual(
    events
      .filter((e) =>
        ['coal-lit', 'resin-collected', 'incense-lit'].includes(e.type),
      )
      .map((e) => e.type),
    ['coal-lit', 'resin-collected', 'incense-lit'],
  );
});

test('stationary taps, outside strokes, teleports and interrupted strokes do not harvest resin', () => {
  const chapter = new FrankincenseChapter();
  chapter.input('light-coal');
  chapter.input('scraper-held', { held: true });
  for (let i = 0; i < 50; i++)
    chapter.input('scrape-tree', {
      position: [0, 0.38, 0.045],
      time: i * 0.04,
    });
  assert.equal(chapter.snapshot().scrapeStrokes, 0);
  chapter.interrupt();
  for (let i = 0; i < 20; i++)
    chapter.input('scrape-tree', {
      position: [0, i % 2 ? 0.5 : 0.24, 0.045],
      time: 3 + i * 0.15,
    });
  assert.equal(chapter.snapshot().scrapeStrokes, 0);
  for (let i = 0; i < 20; i++)
    chapter.input('scrape-tree', {
      position: [0.4, i % 2 ? 0.5 : 0.24, 0.045],
      time: 8 + i * 0.15,
    });
  assert.equal(chapter.snapshot().scrapeStrokes, 0);
  assert.equal(
    chapter.input('scrape-tree', { position: [0, NaN, 0], time: NaN }),
    false,
  );
  chapter.input('scrape-tree', { position: [0, 0.32, 0.045], time: 20 });
  chapter.input('scrape-tree', { position: [0, 0.35, 0.045], time: 20.1 });
  chapter.interrupt();
  chapter.input('scrape-tree', { position: [0, 0.4, 0.045], time: 20.2 });
  assert.equal(chapter.snapshot().scrapeStrokes, 0);
  assert.equal(chapter.stage, 'SCRAPE_TREE');
});

test('larger tree exposes a matching scrape surface and only reveals harvested resin', () => {
  const tree = createTree();
  const size = new Box3().setFromObject(tree).getSize(new Vector3());
  assert.ok(size.y > 0.9 && size.y < 1.1);
  assert.ok(size.x > 0.5);
  assert.equal(tree.userData.resin.visible, false);
  assert.deepEqual(tree.userData.scrapeZone, FRANKINCENSE_SCRAPE_ZONE);
  tree.userData.setScrapeProgress(0.5);
  assert.equal(tree.userData.resin.visible, false);
  tree.userData.revealResin();
  assert.equal(tree.userData.resin.visible, true);
  new ResourceManager().dispose(tree);
});

test('charcoal ignition controls emissive fissures and a bounded, shadow-free warm light', () => {
  const burner = createMabkhara(),
    data = burner.userData;
  assert.equal(data.emberLight.intensity, 0);
  assert.equal(data.emberLight.castShadow, false);
  data.setLit(true);
  data.updateEmbers(2);
  assert.ok(data.crackMaterial.emissiveIntensity > 2);
  assert.ok(data.emberLight.intensity > 0 && data.emberLight.intensity < 0.2);
  data.setLit(false);
  assert.equal(data.crackMaterial.emissiveIntensity, 0);
  assert.equal(data.emberLight.intensity, 0);
  new ResourceManager().dispose(burner);
});
