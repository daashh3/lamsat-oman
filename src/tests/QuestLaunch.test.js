import test from 'node:test';
import assert from 'node:assert/strict';
import { launchQuestApp } from '../pwa/QuestLaunch.js';

function fixture(overrides = {}) {
  const calls = [];
  return {
    calls,
    options: {
      xrManager: {
        active: false,
        entering: false,
        enterVR: async () => calls.push('vr'),
      },
      ready: Promise.resolve({ supported: true }),
      beforeEnter: () => {
        calls.push('begin');
        return true;
      },
      unlockAudio: () => calls.push('audio'),
      onError: () => calls.push('fallback'),
      environment: {
        getDigitalGoodsService() {},
        navigator: { xr: {} },
        location: { search: '?launch=quest' },
      },
      ...overrides,
    },
  };
}

test('only a packaged Quest launch auto-enters through the existing XR manager', async () => {
  const f = fixture();
  assert.equal(await launchQuestApp(f.options), true);
  assert.deepEqual(f.calls, ['begin', 'audio', 'vr']);
  for (const environment of [
    { navigator: { xr: {} }, location: { search: '?launch=quest' } },
    {
      getDigitalGoodsService() {},
      navigator: { xr: {} },
      location: { search: '' },
    },
    { getDigitalGoodsService() {}, location: { search: '?launch=quest' } },
  ]) {
    const ordinary = fixture({ environment });
    assert.equal(await launchQuestApp(ordinary.options), false);
    assert.deepEqual(ordinary.calls, []);
  }
});

test('existing sessions and unsupported headsets never make duplicate requests', async () => {
  for (const key of ['active', 'entering']) {
    const f = fixture();
    f.options.xrManager[key] = true;
    assert.equal(await launchQuestApp(f.options), false);
    assert.deepEqual(f.calls, []);
  }
  const f = fixture({ ready: Promise.resolve({ supported: false }) });
  assert.equal(await launchQuestApp(f.options), false);
  assert.deepEqual(f.calls, []);
});

test('denied packaged launch returns to an explicit VR button without an unhandled rejection', async () => {
  const f = fixture();
  f.options.xrManager.enterVR = async () => {
    throw new Error('Denied');
  };
  assert.equal(await launchQuestApp(f.options), false);
  assert.deepEqual(f.calls, ['begin', 'audio', 'fallback']);
});
