import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { FrankincenseChapter } from '../chapters/FrankincenseChapter.js';
import { createTree } from '../objects/FrankincenseTree.js';
import { createMabkhara } from '../objects/OmaniMabkhara.js';
import { ResourceManager } from '../core/ResourceManager.js';

function scrape(chapter, strokes = 4, startTime = 0) {
  let time = startTime;
  chapter.input('scrape-tree', { position: [0, 0.32, 0.045], time });
  for (let stroke = 0; stroke < strokes; stroke++) {
    for (let sample = 1; sample <= 10; sample++) {
      time += 0.04;
      const fraction = sample / 10;
      const y = stroke % 2 ? 0.44 - fraction * 0.12 : 0.32 + fraction * 0.12;
      chapter.input('scrape-tree', { position: [0, y, 0.045], time });
    }
  }
  return time;
}

test('bare-hand scraping cannot harvest; holding the dedicated scraper enables the same physical strokes', () => {
  const chapter = new FrankincenseChapter();
  assert.equal(chapter.input('scraper-held', { held: true }), false);
  chapter.input('light-coal');
  scrape(chapter);
  assert.equal(chapter.snapshot().scrapeStrokes, 0);
  assert.equal(chapter.input('scraper-held', { held: 'true' }), false);
  assert.equal(chapter.input('scraper-held', { held: true }), true);
  assert.equal(chapter.snapshot().scraperHeld, true);
  scrape(chapter);
  assert.equal(chapter.stage, 'PLACE_RESIN');
  assert.equal(chapter.completed, false);
  assert.equal(
    chapter.input('drop', { id: 'resin', position: [0, 0.47, 0] }),
    true,
  );
});

test('releasing the scraper interrupts a stroke while retaining previously harvested progress', () => {
  const chapter = new FrankincenseChapter();
  chapter.input('light-coal');
  chapter.input('scraper-held', { held: true });
  const time = scrape(chapter, 1);
  assert.equal(chapter.snapshot().scrapeStrokes, 1);
  chapter.input('scraper-held', { held: false });
  assert.equal(chapter.previousScrape, null);
  assert.equal(chapter.snapshot().scraperHeld, false);
  scrape(chapter, 4, time + 0.2);
  assert.equal(chapter.snapshot().scrapeStrokes, 1);
  chapter.input('scraper-held', { held: true });
  scrape(chapter, 4, time + 2);
  assert.equal(chapter.stage, 'PLACE_RESIN');
});

test('scraper contact follows its movable blade independently of the tree transform', () => {
  const tree = createTree();
  try {
    const { scraper, scraperTip, scraperGrip } = tree.userData;
    assert.equal(scraperTip.parent, scraper);
    assert.equal(scraper.userData.grabbable, true);
    assert.deepEqual(scraperGrip.toArray(), [0, 0, 0]);
    tree.position.set(-0.38, 0.5, -0.12);
    tree.rotation.y = 0.4;
    const before = scraperTip.getWorldPosition(new Vector3());
    scraper.position.add(new Vector3(0.1, 0.2, 0));
    scraper.rotation.z = 0.6;
    const after = scraperTip.getWorldPosition(new Vector3());
    assert.ok(before.distanceTo(after) > 0.15);
    assert.ok(
      scraper
        .worldToLocal(after.clone())
        .distanceTo(new Vector3(0, 0.13, -0.035)) < 1e-8,
    );
    const size = new Box3().setFromObject(scraper).getSize(new Vector3());
    assert.ok(size.y > 0.15 && size.y < 0.3);
    assert.equal(tree.userData.resin.visible, false);
  } finally {
    new ResourceManager().dispose(tree);
  }
});

test('removing the raised burner cap leaves its bowl, charcoal and ignition intact', () => {
  const burner = createMabkhara();
  try {
    const data = burner.userData;
    assert.deepEqual(data.bowlCenter.toArray(), [0, 0.47, 0]);
    assert.equal(data.charcoal.length, 10);
    const bounds = new Box3().setFromObject(burner);
    assert.ok(bounds.max.y < 0.59, 'No former finial extends to .60 metres');
    assert.ok(bounds.max.y > 0.49, 'The flared fire bowl remains intact');
    data.setLit(true);
    assert.equal(data.coalMaterial.emissiveIntensity, 1.5);
    assert.ok(data.emberLight.intensity > 0);
  } finally {
    new ResourceManager().dispose(burner);
  }
});
