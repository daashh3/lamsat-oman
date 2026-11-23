import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = path.resolve('dist');
const prefix = '/quest-app/';
const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/seed') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><link rel="icon" href="data:,">'); return;
    }
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const name = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const file = path.resolve(root, name);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await fs.readFile(file);
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true,
    args: ['--enable-webgl', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [], missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
  await page.goto(origin + '/seed');
  await page.evaluate(async () => {
    await caches.open('lamsat-oman:/another-app/:keep');
    await caches.open('lamsat-oman:/quest-app/:obsolete');
  });
  await page.goto(origin + prefix + '?debug=1&launch=quest');
  await page.waitForFunction(() => window.__lamsat && navigator.serviceWorker.controller);
  const installed = await page.evaluate(async () => {
    await document.fonts.ready;
    const registration = await navigator.serviceWorker.ready;
    const manifestURL = document.querySelector('link[rel="manifest"]').href;
    const manifest = await (await fetch(manifestURL)).json();
    const icons = await Promise.all(manifest.icons.map(async (icon) => {
      const image = new Image(); image.src = new URL(icon.src, manifestURL);
      await image.decode(); return [image.width, image.height];
    }));
    return { scope: registration.scope, manifest, icons, caches: await caches.keys(),
      metrics: __lamsat.metrics(), font: document.fonts.check('20px Tajawal') };
  });
  assert.equal(installed.scope, origin + prefix);
  assert.equal(installed.manifest.start_url, './?launch=quest');
  assert.deepEqual(installed.icons, [[192,192], [512,512]]);
  assert.ok(installed.font && installed.metrics.triangles > 0);
  assert.ok(installed.caches.includes('lamsat-oman:/another-app/:keep'));
  assert.ok(!installed.caches.includes('lamsat-oman:/quest-app/:obsolete'));
  assert.equal(installed.caches.filter(key => key.startsWith('lamsat-oman:/quest-app/:')).length, 1);

  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__lamsat?.metrics().triangles > 0);
  await page.locator('[data-action="start"]').click();
  await page.waitForFunction(() => __lamsat.snapshot().state === 'GATE');
  const offline = await page.evaluate(async () => {
    await document.fonts.ready;
    const flag = await fetch(new URL('assets/textures/oman-flag-official.jpg', location.href));
    const keys = await caches.keys();
    const cache = await caches.open(keys.find(key => key.startsWith('lamsat-oman:/quest-app/:')));
    const entries = await cache.keys();
    return { font: document.fonts.check('20px Tajawal'), flag: flag.ok,
      cachedFiles: entries.map(entry => new URL(entry.url).pathname),
      metrics: __lamsat.metrics(), state: __lamsat.snapshot().state };
  });
  assert.ok(offline.font && offline.flag && offline.metrics.triangles > 0);
  assert.equal(offline.state, 'GATE');
  assert.ok(offline.cachedFiles.every(name => name.startsWith(prefix)));
  assert.ok(offline.cachedFiles.every(name => !/\/audio\/|\/reference\/|\/models\//.test(name)));
  assert.deepEqual(errors, []); assert.deepEqual(missing, []);
  await fs.mkdir('test-results', { recursive: true });
  await fs.writeFile('test-results/pwa-report.json', JSON.stringify({ passed: true, errors, missing, installed, offline }, null, 2));
  console.log('PASS: GitHub Pages subpath, app icons, scope-isolated caches, Arabic font, flag and WebGL gameplay after an offline reload.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
