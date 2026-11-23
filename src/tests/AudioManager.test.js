import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../audio/AudioManager.js';

class Parameter {
  constructor(value = 0) {
    this.value = value;
  }
  setTargetAtTime(value) {
    this.value = value;
  }
}
class Node {
  constructor(context) {
    this.context = context;
    this.connections = [];
    this.disconnected = false;
  }
  connect(node) {
    this.connections.push(node);
    return node;
  }
  disconnect() {
    this.disconnected = true;
    this.connections.length = 0;
  }
}
class BufferSource extends Node {
  constructor(context) {
    super(context);
    this.playbackRate = new Parameter(1);
  }
  start(time) {
    this.startedAt = time;
    this.started = true;
  }
  stop(time = this.context.currentTime) {
    this.stopAt = time;
    if (time <= this.context.currentTime) this.finish();
  }
  finish() {
    this.ended = true;
    this.onended?.();
  }
}
class MockContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.sampleRate = 24000;
    this.destination = {};
    this.sources = [];
    this.panners = [];
    this.resumeCount = 0;
    this.listener = Object.fromEntries(
      ['position', 'forward', 'up'].flatMap((prefix) =>
        ['X', 'Y', 'Z'].map((axis) => [prefix + axis, new Parameter()]),
      ),
    );
  }
  createGain() {
    const node = new Node(this);
    node.gain = new Parameter(1);
    return node;
  }
  createBufferSource() {
    const node = new BufferSource(this);
    this.sources.push(node);
    return node;
  }
  createBuffer(channels, length, sampleRate) {
    const data = new Float32Array(length);
    return {
      duration: length / sampleRate,
      length,
      sampleRate,
      getChannelData: () => data,
    };
  }
  createBiquadFilter() {
    const node = new Node(this);
    node.frequency = new Parameter();
    node.Q = new Parameter();
    return node;
  }
  createPanner() {
    const node = new Node(this);
    for (const axis of ['X', 'Y', 'Z'])
      node['position' + axis] = new Parameter();
    this.panners.push(node);
    return node;
  }
  createOscillator() {
    throw Error('Interaction sounds must not schedule a melodic oscillator');
  }
  resume() {
    this.resumeCount++;
    if (this.deny) {
      this.deny = false;
      return Promise.reject(new Error('Blocked'));
    }
    if (this.delayed)
      return new Promise((resolve) => {
        this.finishResume = () => {
          this.state = 'running';
          resolve();
        };
      });
    this.state = 'running';
    this.onstatechange?.();
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    this.onstatechange?.();
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
  advance(seconds) {
    this.currentTime += seconds;
    for (const source of this.sources)
      if (!source.ended && source.stopAt <= this.currentTime) source.finish();
  }
}
function harness({ setup = () => {}, ...options } = {}) {
  const contexts = [],
    media = [],
    speech = [];
  class Context extends MockContext {
    constructor() {
      super();
      setup(this);
      contexts.push(this);
    }
  }
  const audio = new AudioManager({
    Context,
    createAudio: (url) => {
      media.push(url);
      throw Error('No media playback allowed');
    },
    narrationOptions: { synth: { speak: (text) => speech.push(text) } },
    ...options,
  });
  return { audio, contexts, media, speech };
}

test('unlock creates only one Web Audio context and never starts music, speech or an idle sound', async () => {
  const { audio, contexts, media, speech } = harness();
  assert.equal(audio.effect('carve'), false);
  assert.equal(contexts.length, 0);
  await audio.unlock();
  await audio.unlock();
  assert.equal(contexts.length, 1);
  assert.equal(contexts[0].sources.length, 0);
  assert.equal(audio.getStatus().effectsEnabled, true);
  assert.equal(audio.getStatus().musicPlaying, false);
  assert.equal(audio.getStatus().musicMuted, true);
  assert.equal(await audio.playMusic(), false);
  assert.equal(audio.toggleMusic(), true);
  assert.equal(audio.toggleTTS(), true);
  assert.equal(audio.speakText('مرحباً'), false);
  audio.ambient('DHOW');
  for (let i = 0; i < 100; i++) audio.update(1);
  assert.deepEqual(media, []);
  assert.deepEqual(speech, []);
  assert.equal(audio.effectCount, 0);
  audio.dispose();
});

test('material interactions produce distinct finite textures with spatial routing and a bounded lifetime', async () => {
  const { audio, contexts } = harness();
  await audio.unlock();
  const context = contexts[0];
  const types = [
    'shape-selected',
    'carve',
    'door-open',
    'tree-scraped',
    'coal-lit',
    'pottery-decorated',
    'stirring',
    'cord-threaded',
    'cord-mounted',
    'rope-rub',
    'footstep',
    'turn',
    'ui-select',
    'kiln-start',
    'kiln-burning',
    'pouring',
  ];
  const signatures = new Set();
  for (const type of types) {
    assert.equal(audio.effect(type, [0.2, 0.4, -0.7]), true, type);
    const source = context.sources.at(-1),
      samples = source.buffer.getChannelData(0);
    assert.equal(source.loop, false);
    assert.ok(source.stopAt <= context.currentTime + 0.8);
    assert.ok(samples.every(Number.isFinite));
    assert.ok(Math.max(...samples) <= 0.501 && Math.min(...samples) >= -0.501);
    assert.equal(Math.abs(samples[0]), 0);
    assert.ok(Math.abs(samples.at(-1)) < 1e-8);
    signatures.add(Array.from(samples.slice(10, 35)).join(','));
    context.advance(1);
  }
  assert.equal(signatures.size, types.length);
  assert.equal(audio.getStatus().activeEffects, 0);
  assert.equal(audio.getStatus().effectCount, types.length);
  assert.equal(audio.getStatus().lastEffect, 'pouring');
  assert.equal(context.panners[0].panningModel, 'HRTF');
  assert.deepEqual(
    ['X', 'Y', 'Z'].map((axis) => context.panners[0]['position' + axis].value),
    [0.2, 0.4, -0.7],
  );
  assert.ok(context.sources.every((source) => source.disconnected));
  audio.dispose();
});

test('rapid gesture samples are throttled, cached and never exceed eight simultaneous voices', async () => {
  const { audio, contexts } = harness();
  await audio.unlock();
  const context = contexts[0];
  assert.equal(audio.effect('carve'), true);
  const first = context.sources[0].buffer;
  for (let i = 0; i < 50; i++) assert.equal(audio.effect('carve'), false);
  assert.equal(audio.effectCount, 1);
  context.currentTime = 0.08;
  assert.equal(audio.effect('carve'), true);
  assert.equal(context.sources.at(-1).buffer, first);
  const types = [
    'shape-selected',
    'door-open',
    'tree-scraped',
    'coal-lit',
    'resin-collected',
    'incense-lit',
    'sail-hoist',
    'clay-placed',
    'clay-shaped',
    'pottery-decorated',
    'kiln-start',
    'ingredient-added',
    'stirring',
    'fire-fanned',
    'pickup',
    'put-down',
  ];
  for (const type of types) {
    assert.equal(audio.effect(type), true);
    assert.ok(audio.voices.size <= 8);
    assert.ok(audio.nodes.size <= 8);
  }
  assert.ok(context.sources[0].ended);
  assert.equal(audio.voices.size, 8);
  context.advance(2);
  assert.equal(audio.voices.size, 0);
  audio.dispose();
});

test('mute, zero volume, pause and reset stop active sounds without replaying on resume', async () => {
  const { audio, contexts } = harness();
  await audio.unlock();
  const context = contexts[0];
  audio.effect('door-open');
  assert.equal(audio.toggleEffects(), true);
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.effect('carve'), false);
  const count = audio.effectCount;
  audio.toggle();
  assert.equal(audio.effectCount, count);
  context.advance(1);
  audio.effect('door-open');
  audio.pause(true);
  assert.equal(audio.voices.size, 0);
  assert.equal(context.state, 'suspended');
  audio.pause(false);
  await Promise.resolve();
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.effectCount, count + 1);
  audio.setVolume(0.7);
  audio.effect('pickup');
  audio.reset();
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.volume, 0.7);
  assert.equal(audio.muted, false);
  audio.effect('put-down');
  audio.setVolume(0);
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.effect('coal-lit'), false);
  audio.setVolume(Infinity);
  assert.equal(audio.volume, 0);
  audio.dispose();
  assert.equal(context.state, 'closed');
  assert.equal(await audio.unlock(), false);
  assert.equal(audio.effect('carve'), false);
});

test('resume denial is handled and skipped interaction sounds are not queued for a later gesture', async () => {
  const { audio, contexts } = harness({
    setup: (context) => {
      context.deny = true;
    },
  });
  assert.equal(await audio.unlock(), false);
  assert.ok(audio.getStatus().audioError);
  assert.equal(audio.effect('carve'), false);
  assert.equal(await audio.unlock(), true);
  assert.equal(contexts[0].sources.length, 0);
  assert.equal(audio.getStatus().audioError, null);
  assert.equal(audio.effect('carve'), true);
  audio.dispose();
});

test('resume is requested in the activation stack and pending unlock never defers a sound', async () => {
  const { audio, contexts } = harness({
    setup: (context) => {
      context.delayed = true;
    },
  });
  const pending = audio.unlock();
  assert.equal(contexts[0].resumeCount, 1);
  assert.equal(audio.effect('shape-selected'), false);
  contexts[0].finishResume();
  await pending;
  assert.equal(contexts[0].sources.length, 0);
  assert.equal(audio.effect('shape-selected'), true);
  audio.dispose();
});

test('stopping the pour cancels its sound while other material interactions remain active', async () => {
  const { audio } = harness();
  await audio.unlock();
  audio.effect('pour-start');
  audio.effect('pouring');
  audio.effect('carve');
  assert.equal(audio.voices.size, 3);
  assert.equal(audio.effect('pour-stop'), false);
  assert.equal(audio.voices.size, 1);
  assert.equal([...audio.voices.values()][0].type, 'carve');
  audio.dispose();
});

test('unknown internal events remain silent and invalid spatial input cannot poison the audio graph', async () => {
  const { audio, contexts } = harness();
  await audio.unlock();
  for (const type of [
    'chapter-complete',
    'chapter-enter',
    'error',
    'unknown',
    '',
  ])
    assert.equal(audio.effect(type), false);
  assert.equal(contexts[0].sources.length, 0);
  assert.equal(audio.effect('pickup', [NaN, 0, 0]), true);
  assert.equal(contexts[0].panners.length, 0);
  audio.listener(
    { x: 1, y: 2, z: 3 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 1, z: 0 },
  );
  audio.listener(
    { x: NaN, y: Infinity, z: NaN },
    { x: NaN, y: NaN, z: NaN },
    { x: NaN, y: NaN, z: NaN },
  );
  assert.equal(contexts[0].listener.positionX.value, 1);
  assert.equal(contexts[0].listener.positionY.value, 2);
  assert.equal(contexts[0].listener.positionZ.value, 3);
  audio.dispose();
});

test('unavailable audio degrades silently without media fallback or failed gameplay calls', async () => {
  const { audio, media } = harness({ Context: null });
  assert.equal(await audio.unlock(), false);
  assert.equal(audio.getStatus().effectsAvailable, false);
  assert.equal(audio.getStatus().effectsEnabled, false);
  assert.equal(audio.effect('carve'), false);
  audio.setVolume(0.3);
  audio.toggle();
  audio.pause(true);
  audio.pause(false);
  audio.reset();
  audio.dispose();
  assert.deepEqual(media, []);
});
