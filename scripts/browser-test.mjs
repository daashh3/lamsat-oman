import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Starts its own loopback-only preview; controls only this app and its own browser.
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '5175',
  ],
  { stdio: 'pipe', windowsHide: true },
);
let browser, page;
const errors = [],
  report = [],
  mediaRequests = [];
const toolsOnly = process.argv.includes('--tools-only');
const reportPath = toolsOnly
  ? 'test-results/tool-browser-report.json'
  : 'test-results/browser-report.json';
const ready = new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => {
    if (String(d).includes('Local:')) resolve();
  });
  server.on('error', reject);
  server.on('exit', (code) => {
    if (code) reject(new Error(`Preview exit ${code}`));
  });
  setTimeout(() => reject(new Error('Preview startup timeout')), 15000).unref();
});
try {
  await ready;
  browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || 'msedge',
    headless: true,
    args: ['--enable-webgl', '--enable-unsafe-swiftshader'],
  });
  page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.setDefaultTimeout(20000);
  // Record the Web Speech boundary without depending on an installed OS voice.
  // Count actual native Web Audio starts; never replace audio rendering.
  await page.addInitScript(() => {
    globalThis.__speechCalls = [];
    globalThis.__effectStarts = 0;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (Context) {
      const createBufferSource = Context.prototype.createBufferSource;
      Context.prototype.createBufferSource = function (...args) {
        const source = createBufferSource.apply(this, args);
        const start = source.start;
        source.start = function (...args) {
          __effectStarts++;
          return start.apply(this, args);
        };
        return source;
      };
    }
    if (globalThis.speechSynthesis)
      speechSynthesis.speak = (utterance) => {
        __speechCalls.push({ text: utterance.text, lang: utterance.lang });
        setTimeout(() => utterance.onend?.(), 40);
      };
  });
  page.on('request', (request) => {
    if (request.url().endsWith('.wav')) mediaRequests.push(request.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await fs.mkdir('test-results', { recursive: true });
  await page.goto('http://127.0.0.1:5175/?debug=1');
  await page.waitForFunction(() => !!globalThis.__lamsat);
  const snap = () => page.evaluate(() => __lamsat.snapshot());
  const bootId = await page.evaluate(() => __lamsat.bootId);
  const state = async (name) => {
    await page.waitForFunction((n) => __lamsat.snapshot().state === n, name, {
      timeout: 30000,
    });
    await page.waitForTimeout(350);
    console.log(`Reached ${name}`);
  };
  const shot = async (name) => {
    await page.screenshot({ path: `test-results/${name}.png` });
    report.push({
      name,
      state: await snap(),
      metrics: await page.evaluate(() => __lamsat.metrics()),
    });
  };
  const project = (p) => page.evaluate((p) => __lamsat.project(p), p);
  const target = async (id) => {
    const t = await page.evaluate(
      (id) => __lamsat.targets().find((t) => t.id === id),
      id,
    );
    assert.ok(t, `target ${id} exists`);
    return t;
  };
  const drag = async (id, dest) => {
    const t = await target(id),
      end = await project(dest);
    await page.mouse.move(t.screen.x, t.screen.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 25 });
    await page.waitForTimeout(100);
    await page.mouse.up();
  };
  const hold = async (id, ms) => {
    const el = page.locator(`[data-hold="${id}"]`),
      box = await el.boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(ms);
    await page.mouse.up();
  };
  const assist = async () => {
    if (!(await page.locator('#assist').evaluate((element) => element.open)))
      await page.locator('#assist summary').click();
  };
  const slider = async (id, steps) => {
    const el = page.locator(id);
    await el.focus();
    await el.press('Home');
    for (let i = 0; i < steps; i++) await el.press('ArrowUp');
  };
  await shot('01-welcome');
  const canvas = page.locator('#viewport canvas');
  let travel = 0;
  if (!toolsOnly) {
    assert.equal(
      await page.evaluate(() => __lamsat.audio().unlocked),
      false,
      'No autoplay before activation',
    );
    assert.equal(
      await page.locator('#vr-entry .vr-button').isVisible(),
      true,
      'Actual VRButton is visible',
    );
    await page.locator('[data-action="help"]').click();
    assert.equal(await page.locator('#modal').isVisible(), true);
    await page.locator('[data-action="close"]').click();
    await page.waitForFunction(() => __lamsat.audio().effectsEnabled);
    assert.equal(
      await page.evaluate(() => __effectStarts),
      0,
      'Unlock starts no background sound',
    );
    await page.locator('[data-action="effects"]').click();
    assert.equal(
      await page.evaluate(
        () => __lamsat.audio().effectsMuted && !__lamsat.audio().effectsEnabled,
      ),
      true,
    );
    await page.locator('[data-action="effects"]').click();
    assert.equal(
      await page.evaluate(
        () => __lamsat.audio().effectsEnabled && !__lamsat.audio().musicPlaying,
      ),
      true,
    );
    assert.equal(await page.locator('[data-action="voiceover"]').count(), 0);
    assert.equal(await page.locator('[data-action="tts"]').count(), 0);
    await page.locator('[data-action="help"]').hover();
    await page.locator('[data-action="help"]').click();
    await page.locator('[data-action="close"]').click();
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => __speechCalls), []);
    assert.deepEqual(mediaRequests, []);
    assert.equal(await page.locator('[data-action="music"]').count(), 0);
    // Repeated real mouse drags accumulate more than one complete 360-degree orbit.
    const view = await canvas.boundingBox();
    let angle = await page.evaluate(() => __lamsat.navigation().azimuth);
    for (let i = 0; i < 12; i++) {
      await page.mouse.move(
        view.x + view.width * 0.35,
        view.y + view.height * 0.4,
      );
      await page.mouse.down();
      await page.mouse.move(
        view.x + view.width * 0.65,
        view.y + view.height * 0.4,
        { steps: 20 },
      );
      await page.mouse.up();
      await page.waitForTimeout(350);
      const next = await page.evaluate(() => __lamsat.navigation().azimuth);
      travel += Math.abs(
        Math.atan2(Math.sin(next - angle), Math.cos(next - angle)),
      );
      angle = next;
    }
    assert.ok(travel > Math.PI * 2, `360 orbit travelled ${travel} radians`);
    assert.equal((await snap()).progress.count, 0);
    assert.equal(
      await page.evaluate(() => __effectStarts),
      0,
      'Idle/orbit is silent',
    );
  }
  await page.locator('[data-action="start"]').click();
  await state('GATE');
  assert.equal(await page.locator('#trivia-count, #fact-card').count(), 0);
  assert.equal(await page.evaluate(() => typeof __lamsat.trivia), 'undefined');
  assert.equal(
    await page.evaluate(() =>
      __lamsat.targets().some((t) => t.id === 'engraver'),
    ),
    false,
  );
  for (const id of ['star', 'square', 'random']) {
    const slot = await page.evaluate(
      (id) => __lamsat.engravingSlots().find((s) => s.id === id),
      id,
    );
    await page.mouse.click(slot.screen.x, slot.screen.y);
    assert.equal((await snap()).chapter.selectedShape, id);
    const points = await page.evaluate(() => __lamsat.trace());
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const p of points) {
      await page.mouse.move(p.x, p.y, { steps: 2 });
      await page.waitForTimeout(35);
    }
    await page.mouse.up();
    assert.ok((await snap()).chapter.finishedShapes.includes(id));
    assert.ok(
      await page.evaluate(() => __effectStarts > 0),
      'Real interactions start Web Audio sources',
    );
    if (id !== 'random') await shot(`01b-door-${id}`);
  }
  assert.equal((await snap()).progress.count, 0);
  await state('FRANKINCENSE');
  await shot('02-frankincense');
  const burner = await project([0, 0.41, 0.09]);
  await page.mouse.click(burner.x, burner.y);
  assert.equal((await snap()).chapter.stage, 'SCRAPE_TREE');
  assert.equal((await snap()).chapter.lit, false);
  // Scrape the enlarged tree with a held pointer; no inventory/state injection.
  const scraper = await target('scraper');
  await page.mouse.move(scraper.screen.x, scraper.screen.y);
  await page.mouse.down();
  assert.equal((await snap()).chapter.scraperHeld, true);
  for (
    let stroke = 0;
    stroke < 7 && (await snap()).chapter.stage === 'SCRAPE_TREE';
    stroke++
  ) {
    for (let j = 0; j <= 12; j++) {
      const y = stroke % 2 ? 0.48 - (j / 12) * 0.2 : 0.28 + (j / 12) * 0.2;
      const p = await project([-0.38, y, -0.075]);
      await page.mouse.move(p.x, p.y);
      await page.waitForTimeout(25);
    }
  }
  await page.mouse.up();
  assert.equal((await snap()).chapter.stage, 'PLACE_RESIN');
  await shot('02a-tree-scraped');
  await drag('resin', [0, 0.5, 0]);
  await page.waitForFunction(() => __lamsat.snapshot().chapter.lit === true);
  await page.waitForTimeout(1500);
  await shot('02b-incense-lit');
  await state('DHOW');
  assert.equal((await snap()).progress.count, 1);
  if (toolsOnly) {
    assert.deepEqual(errors, []);
    assert.deepEqual(mediaRequests, [], 'No music/audio files are requested');
    const effectsStarted = await page.evaluate(() => __effectStarts);
    assert.ok(effectsStarted > 0);
    await page.waitForTimeout(600);
    assert.equal(
      await page.evaluate(() => __effectStarts),
      effectsStarted,
      'Idle after replay is silent',
    );
    await fs.writeFile(
      reportPath,
      JSON.stringify({ passed: true, errors, report }, null, 2),
    );
    console.log(
      'PASS: three physical shape slots, direct engraving without tools, fitted doors opening, held scraper strokes, coal/resin progression.',
    );
  } else {
    await shot('03-dhow');
    assert.equal((await snap()).chapter.stage, 'WEAVE');
    const cords = await page.evaluate(() => __lamsat.weaving());
    assert.equal(cords.length, 4);
    for (const cord of cords) {
      const tip = await target(cord.id);
      await page.mouse.move(tip.screen.x, tip.screen.y);
      await page.mouse.down();
      let attempts = 0;
      while (
        (await snap()).chapter.cordProgress[cord.id] < cord.path.length &&
        attempts++ < 8
      ) {
        const i = (await snap()).chapter.cordProgress[cord.id];
        const point = await project(cord.path[i].position);
        await page.mouse.move(point.x, point.y, { steps: 12 });
        await page.waitForTimeout(100);
        assert.ok(
          (await snap()).chapter.cordProgress[cord.id] > i,
          'Dragging through the next guide advances the cord',
        );
      }
      assert.equal(
        (await snap()).chapter.cordProgress[cord.id],
        cord.path.length,
      );
      await page.mouse.up();
    }
    assert.equal((await snap()).chapter.stage, 'HOIST');
    await shot('03b-woven');
    for (let i = 0; i < 3 && (await snap()).state === 'DHOW'; i++) {
      await drag('rope', [0.22, 0.1, 0.13]);
      await page.waitForTimeout(150);
    }
    await state('POTTERY');
    assert.equal((await snap()).progress.count, 2);
    await shot('04-pottery');
    await drag('clay', [0, 0.2, 0.18]);
    await page.waitForFunction(
      () => __lamsat.snapshot().chapter.stage === 'SHAPE',
    );
    // Range controls are the explicit desktop sculpting interface; no game-state injection.
    await slider('#shape-height', 36);
    await slider('#shape-width', 44);
    await page.waitForFunction(
      () => __lamsat.snapshot().chapter.stage === 'DECORATE',
    );
    await shot('04b-decoration');
    await assist();
    for (const id of [0, 1, 2])
      await page.locator(`[data-action="decorate-${id}"]`).click();
    assert.equal((await snap()).chapter.stage, 'IGNITE_KILN');
    await page.waitForTimeout(600);
    assert.equal((await snap()).chapter.stage, 'IGNITE_KILN');
    const ignition = await page.evaluate(() => __lamsat.kiln());
    await page.mouse.click(ignition.x, ignition.y);
    assert.equal((await snap()).chapter.stage, 'FIRING');
    await state('HALWA');
    assert.equal((await snap()).progress.count, 3);
    await shot('05-halwa');
    for (const id of ['sugar', 'saffron', 'nuts']) await drag(id, [0, 0.25, 0]);
    assert.equal((await snap()).chapter.stage, 'STIR');
    const stick = await target('stick');
    await page.mouse.move(stick.screen.x, stick.screen.y);
    await page.mouse.down();
    for (let i = 0; i < 240; i++) {
      const a = i * 0.105,
        p = await project([Math.cos(a) * 0.12, 0.29, Math.sin(a) * 0.12]);
      await page.mouse.move(p.x, p.y);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();
    assert.equal((await snap()).chapter.stage, 'FAN_FIRE');
    // Broad physical pointer strokes across the actual fire zone.
    const fan = await target('fan');
    await page.mouse.move(fan.screen.x, fan.screen.y);
    await page.mouse.down();
    assert.equal((await snap()).chapter.fanHeld, true);
    for (let i = 0; i < 10; i++) {
      const end = await project([i % 2 ? 0.14 : -0.14, 0.12, 0.24]);
      for (let j = 0; j < 8; j++) {
        const next = await project([
          (i % 2 ? -0.14 : 0.14) * (1 - j / 7) +
            ((i % 2 ? 0.14 : -0.14) * j) / 7,
          0.12,
          0.24,
        ]);
        await page.mouse.move(next.x, next.y);
        await page.waitForTimeout(35);
      }
    }
    await page.mouse.up();
    await state('COFFEE');
    assert.equal((await snap()).progress.count, 4);
    await shot('06-coffee');
    // A real model click starts flow. Deliberately overfill, then retry and stop.
    const pot = await target('coffee');
    await page.mouse.click(pot.screen.x, pot.screen.y);
    assert.equal(
      await page.evaluate(() => __lamsat.pour().active),
      false,
      'Cup must be held first',
    );
    const cup = await target('cup');
    await page.mouse.click(cup.screen.x, cup.screen.y);
    assert.equal((await snap()).chapter.cupHeld, true);
    await page.mouse.click(pot.screen.x, pot.screen.y);
    await page.waitForFunction(() => __lamsat.pour().active);
    assert.equal(
      (await snap()).progress.count,
      4,
      'Click alone does not award coffee',
    );
    await page.waitForFunction(() => __lamsat.pour().phase === 'pouring');
    await shot('06b-pouring');
    await page.waitForFunction(
      () => __lamsat.snapshot().chapter.overfills === 1,
      {},
      { timeout: 30000 },
    );
    assert.equal(
      (await snap()).progress.count,
      4,
      'Overflow never awards success',
    );
    await shot('06c-overfill');
    await page.waitForFunction(
      () =>
        __lamsat.snapshot().chapter.stage === 'POUR' &&
        __lamsat.snapshot().chapter.fillLevel === 0,
    );
    await page.locator('[data-action="hold-cup"]').click();
    await page.locator('[data-action="pour-coffee"]').click();
    await page.waitForFunction(
      () => __lamsat.snapshot().chapter.fillLevel >= 0.62,
    );
    await page.locator('[data-action="stop-pour"]').click();
    await page.waitForFunction(
      () => __lamsat.snapshot().chapter.lastResult === 'perfect',
    );
    const successfulPour = (await snap()).chapter;
    assert.ok(
      successfulPour.fillLevel >= 0.6 && successfulPour.fillLevel <= 0.8,
    );
    assert.equal(successfulPour.attempts, 2);
    await shot('06d-perfect-pour');
    await state('FINALE');
    assert.equal((await snap()).progress.count, 5);
    await page.waitForTimeout(1800);
    await shot('07-finale');
    const lantern = await target('lantern');
    await page.mouse.click(lantern.screen.x, lantern.screen.y);
    assert.equal((await snap()).chapter.stage, 'COUNTDOWN');
    await page.waitForTimeout(9000);
    assert.equal((await snap()).state, 'FINALE');
    await state('READY');
    assert.equal((await snap()).progress.count, 0);
    assert.equal(await page.locator('#trivia-count').count(), 0);
    await shot('08-reset');
    await page.locator('[data-action="start"]').click();
    await state('GATE');
    await page.locator('[data-action="pause"]').first().click();
    assert.equal((await snap()).paused, true);
    await page.locator('#paused [data-action="pause"]').click();
    assert.equal((await snap()).paused, false);
    await page.locator('[data-action="restart"]').click();
    assert.equal((await snap()).chapter.traceIndex, 0);
    await page.locator('[data-action="exit"]').click();
    await state('READY');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await shot('09-mobile');
    assert.equal(await page.locator('[data-action="start"]').isVisible(), true);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    // Native touch input on the real canvas, with no game-state injection.
    const touch = await page.context().newCDPSession(page);
    const mobileCanvas = await canvas.boundingBox();
    const touchAngle = await page.evaluate(() => __lamsat.navigation().azimuth);
    const touchY = mobileCanvas.y + mobileCanvas.height * 0.45;
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 100, y: touchY }],
    });
    for (let i = 1; i <= 12; i++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 100 + i * 12, y: touchY }],
      });
      await page.waitForTimeout(25);
    }
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await page.waitForTimeout(400);
    assert.ok(
      Math.abs(
        (await page.evaluate(() => __lamsat.navigation().azimuth)) - touchAngle,
      ) > 0.25,
      'One-finger touch rotates the scene',
    );
    await touch.detach();
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(200);
    assert.ok(
      (await canvas.boundingBox()).height > 150,
      'Landscape welcome has usable canvas height',
    );
    await page.locator('[data-action="start"]').click();
    await state('GATE');
    assert.ok(
      (await canvas.boundingBox()).height > 150,
      'Landscape play has usable canvas height',
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await shot('10-landscape');
    await page.locator('[data-action="navigation"]').click();
    assert.equal(
      await page.evaluate(() => __lamsat.navigation().mode),
      'orbit',
    );
    assert.equal(
      (await snap()).chapter.traceIndex,
      0,
      'Switching navigation mode does not complete interactions',
    );
    await page.locator('[data-action="exit"]').click();
    await state('READY');
    assert.equal(
      await page.evaluate(() => __lamsat.bootId),
      bootId,
      'No page reload or HMR reset occurred during the test',
    );
    assert.deepEqual(
      report.find((x) => x.name === '01-welcome').metrics.memory,
      report.find((x) => x.name === '08-reset').metrics.memory,
      'GPU resource counts return to the initial welcome baseline',
    );
    assert.deepEqual(errors, []);
    const spoken = await page.evaluate(() => __speechCalls);
    assert.deepEqual(mediaRequests, [], 'No music/audio files are requested');
    const effectsStarted = await page.evaluate(() => __effectStarts);
    assert.ok(effectsStarted > 0);
    await page.waitForTimeout(600);
    assert.equal(
      await page.evaluate(() => __effectStarts),
      effectsStarted,
      'Idle after replay is silent',
    );
    assert.deepEqual(
      spoken,
      [],
      'No speech during hover, click, challenges or replay',
    );
    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          passed: true,
          errors,
          orbitRadians: travel,
          speechBoundaryCalls: await page.evaluate(() => __speechCalls.length),
          challenges: {
            hiddenObjects: 0,
            engravingTool: false,
            overfillRetries: successfulPour.overfills,
            successfulFill: successfulPour.fillLevel,
            speechEnabled: false,
            music: false,
            nativeEffectStarts: effectsStarted,
          },
          report,
        },
        null,
        2,
      ),
    );
    console.log(
      'PASS: interaction-only audio, no music or speech or side keepsakes, direct engraving without tools, 360 orbit, animated coffee pour, all seven chapters, five awards, replay, stable GPU resources, pause/restart/exit, mobile layout, no browser errors.',
    );
  }
} catch (error) {
  console.error(error);
  if (page) {
    console.error(
      'Current snapshot:',
      JSON.stringify(
        await page
          .evaluate(() => globalThis.__lamsat?.snapshot())
          .catch(() => null),
      ),
    );
    await page.screenshot({ path: 'test-results/failure.png' }).catch(() => {});
  }
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      { passed: false, error: String(error), errors, report },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
