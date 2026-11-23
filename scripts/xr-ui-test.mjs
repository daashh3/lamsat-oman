import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Render the real world-space UI with real fonts/WebGL; this is not a headset test.
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5176',
    '--strictPort',
  ],
  { stdio: 'pipe', windowsHide: true },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (data) => {
      if (String(data).includes('Local:')) resolve();
    });
    server.on('error', reject);
    server.on('exit', (code) => reject(new Error(`Preview exited ${code}`)));
    setTimeout(
      () => reject(new Error('Preview startup timeout')),
      15000,
    ).unref();
  });
  browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || 'msedge',
    headless: true,
    args: ['--enable-webgl', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({
    viewport: { width: 1200, height: 1000 },
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:5176/?debug=1');
  await page.waitForFunction(() => !!window.__lamsat);
  await page.evaluate(async () => {
    await document.fonts.ready;
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { HUD } = await import('/src/ui/HUD.js');
    const { createGate } = await import('/src/objects/OmaniGate.js');
    const scene = new THREE.Scene(),
      parent = new THREE.Group();
    scene.background = new THREE.Color(0x102127);
    scene.add(parent, new THREE.HemisphereLight(0xfff0d8, 0x243d38, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-1, 3, 2);
    scene.add(light);
    const gate = createGate();
    parent.add(gate);
    const hud = new HUD(parent, () => {}, { occluders: () => [gate] });
    hud.root.visible = true;
    const eye = new THREE.Vector3(0, 0.6, 0.65);
    hud.place(eye);
    const camera = new THREE.PerspectiveCamera(
      58,
      innerWidth / innerHeight,
      0.05,
      10,
    );
    camera.position.copy(eye);
    camera.lookAt(
      hud.root.position.clone().add(new THREE.Vector3(0, -0.02, 0)),
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(innerWidth, innerHeight);
    renderer.domElement.style.cssText = 'position:fixed;inset:0;z-index:99999';
    document.body.append(renderer.domElement);
    document.body.classList.add('xr');
    window.uiFixture = { hud, renderer, scene, camera };
  });
  const report = [];
  for (const state of ['GATE', 'COFFEE', 'MOVEMENT']) {
    const result = await page.evaluate((state) => {
      const { hud, renderer, scene, camera } = uiFixture;
      hud.setVRState({ active: true, thirdPerson: state === 'MOVEMENT' });
      hud.movementMenu = state === 'MOVEMENT';
      hud.update({
        state: state === 'MOVEMENT' ? 'GATE' : state,
        progress: { count: state === 'GATE' ? 0 : 4 },
        chapter:
          state === 'GATE'
            ? {
                instruction:
                  'اختر قالباً ثم اضغط واسحب على المسار المضيء مباشرة بإصبعك أو المؤشر',
                selectedShape: 'star',
                finishedShapes: [],
              }
            : {
                instruction:
                  'احمل الفنجان وأمِل الدلّة، ثم أوقف السكب داخل النطاق الأخضر',
                stage: 'POUR',
                cupHeld: true,
                fillLevel: 0.65,
              },
      });
      renderer.render(scene, camera);
      return {
        state,
        visibleButtons: hud.buttons.filter((button) => button.visible).length,
        duplicateMenus: [...document.querySelector('#overlay').children].some(
          (el) => getComputedStyle(el).display !== 'none',
        ),
        panels: [hud.panel, hud.story, ...hud.buttons]
          .filter((panel) => panel.visible)
          .map((panel) => ({
            ...panel.userData.textLayout,
            width: panel.userData.canvas.width,
            canvasHeight: panel.userData.canvas.height,
            depthTest: panel.material.depthTest,
            position: panel.position.toArray(),
          })),
      };
    }, state);
    assert.equal(result.duplicateMenus, false);
    assert.equal(result.visibleButtons, 8);
    for (const panel of result.panels) {
      assert.equal(panel.depthTest, true);
      assert.ok(panel.height <= panel.canvasHeight - 30);
      assert.ok(panel.widths.every((width) => width <= panel.width - 60));
      assert.ok(
        panel.fontSize >= 30,
        'Arabic text remains large enough to read',
      );
    }
    await page.screenshot({
      path: `test-results/xr-menu-${state.toLowerCase()}.png`,
    });
    report.push(result);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    'test-results/xr-ui-report.json',
    JSON.stringify(
      { passed: true, physicalHeadset: false, errors, report },
      null,
      2,
    ),
  );
  console.log(
    'PASS: real Arabic canvas text fits, eight controls per chapter, depth-correct fixed panels, no duplicate XR DOM menus.',
  );
} finally {
  await browser?.close();
  server.kill();
}
