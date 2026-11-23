/** Short material sounds only: no music, media elements, narration or idle loops. */
const PROFILES = {
  'shape-selected': ['tap', 0.07, 0.17, 1600, 0.1],
  carve: ['scrape', 0.13, 0.18, 1800, 0.065],
  'shape-engraved': ['tap', 0.11, 0.15, 1050, 0.25],
  'door-open': ['creak', 0.72, 0.2, 760, 1],
  'tree-scraped': ['scrape', 0.2, 0.19, 850, 0.16],
  'coal-lit': ['crackle', 0.48, 0.2, 1900, 0.4],
  'resin-collected': ['grains', 0.13, 0.14, 1300, 0.2],
  'incense-lit': ['crackle', 0.32, 0.16, 1000, 0.3],
  'sail-hoist': ['creak', 0.21, 0.17, 560, 0.16],
  'cord-threaded': ['cloth', 0.19, 0.25, 1900, 0.1],
  'cord-mounted': ['tap', 0.18, 0.27, 900, 0.18],
  'rope-rub': ['cloth', 0.22, 0.18, 1300, 0.2],
  'object-move': ['cloth', 0.12, 0.1, 1100, 0.3],
  'ui-select': ['tap', 0.055, 0.18, 1700, 0.12],
  footstep: ['step', 0.18, 0.23, 700, 0.35],
  turn: ['cloth', 0.09, 0.14, 950, 0.2],
  'clay-placed': ['thud', 0.13, 0.21, 400, 0.2],
  'clay-shaped': ['wet', 0.14, 0.12, 620, 0.16],
  'pottery-decorated': ['ceramic', 0.13, 0.14, 2200, 0.16],
  'kiln-start': ['crackle', 0.65, 0.3, 1400, 0.4],
  'kiln-burning': ['crackle', 0.32, 0.18, 1100, 0.6],
  'pottery-shaped': ['ceramic', 0.16, 0.14, 2000, 0.35],
  'ingredient-added': ['grains', 0.19, 0.18, 1150, 0.15],
  stirring: ['wet', 0.22, 0.17, 1050, 0.23],
  'mixture-ready': ['thud', 0.13, 0.15, 550, 0.4],
  'fire-fanned': ['whoosh', 0.3, 0.19, 800, 0.25],
  'halwa-cooked': ['tap', 0.13, 0.15, 700, 0.5],
  'cup-held': ['ceramic', 0.1, 0.12, 2000, 0.2],
  'pour-start': ['water', 0.38, 0.18, 1800, 0.28],
  pouring: ['water', 0.3, 0.15, 1500, 0.28],
  'pour-failed': ['water', 0.15, 0.12, 1100, 0.5],
  'perfect-pour': ['ceramic', 0.14, 0.13, 1600, 0.4],
  'symbol-earned': ['tap', 0.12, 0.13, 900, 0.5],
  'replay-countdown': ['tap', 0.08, 0.12, 700, 0.5],
  pickup: ['tap', 0.07, 0.12, 1200, 0.09],
  'put-down': ['thud', 0.1, 0.15, 600, 0.1],
};

export class AudioManager {
  constructor({
    onStatus = () => {},
    Context = globalThis.AudioContext || globalThis.webkitAudioContext,
  } = {}) {
    this.onStatus = onStatus;
    this.Context = Context;
    this.volume = 0.6;
    this.muted = false;
    this.paused = false;
    this.unlocked = false;
    this.disposed = false;
    this.audioError = null;
    this.maxVoices = 8;
    this.nodes = new Set();
    this.voices = new Map();
    this.buffers = new Map();
    this.lastPlayed = new Map();
    this.effectCount = 0;
    this.lastEffect = null;
  }

  getStatus() {
    return {
      musicMuted: true,
      musicPlaying: false,
      musicError: null,
      ttsMuted: true,
      ttsAvailable: false,
      speechChannel: null,
      unlocked: this.unlocked,
      effectsAvailable: typeof this.Context === 'function' && !this.disposed,
      effectsEnabled: this.canPlay(),
      effectsMuted: this.muted,
      activeEffects: this.voices.size,
      effectCount: this.effectCount,
      lastEffect: this.lastEffect,
      audioError: this.audioError,
    };
  }
  notify() {
    if (!this.disposed) this.onStatus(this.getStatus());
  }
  canPlay() {
    return (
      !!this.context &&
      this.context.state === 'running' &&
      this.unlocked &&
      !this.disposed &&
      !this.paused &&
      !this.muted &&
      this.volume > 0
    );
  }

  /** Resume synchronously within the gesture; skipped sounds are never queued. */
  async unlock() {
    if (this.disposed) return false;
    this.unlocked = true;
    try {
      if (!this.context) {
        if (typeof this.Context !== 'function') {
          this.notify();
          return false;
        }
        this.context = new this.Context();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.master.connect(this.context.destination);
        this.context.onstatechange = () => this.notify();
      }
      if (!this.paused && this.context.state !== 'running')
        await this.context.resume();
      this.audioError = null;
    } catch {
      this.audioError = 'تعذّر تفعيل أصوات التفاعل — اضغط مجدداً للمحاولة';
    }
    this.notify();
    return this.canPlay();
  }

  setVolume(volume) {
    if (!Number.isFinite(volume)) return;
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.volume === 0) this.stopAll();
    this.master?.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.context.currentTime,
      0.015,
    );
    this.notify();
  }
  toggleEffects() {
    this.muted = !this.muted;
    if (this.muted) this.stopAll();
    this.setVolume(this.volume);
    return this.muted;
  }
  toggle() {
    return this.toggleEffects();
  }
  // Old callers cannot restore either removed audio channel.
  toggleMusic() {
    return true;
  }
  playMusic() {
    return Promise.resolve(false);
  }
  toggleTTS() {
    return true;
  }
  speakText() {
    return false;
  }
  ambient() {}
  update() {}

  listener(position, forward, up) {
    const listener = this.context?.listener;
    if (!listener?.positionX) return;
    for (const [prefix, value] of [
      ['position', position],
      ['forward', forward],
      ['up', up],
    ])
      for (const axis of ['X', 'Y', 'Z']) {
        const n = value?.[axis.toLowerCase()];
        if (Number.isFinite(n)) listener[prefix + axis].value = n;
      }
  }

  /** Cache compact, non-musical material textures instead of creating media files. */
  materialBuffer(kind, duration) {
    const key = `${kind}:${duration}`;
    if (this.buffers.has(key)) return this.buffers.get(key);
    const rate = this.context.sampleRate;
    const buffer = this.context.createBuffer(
      1,
      Math.max(2, Math.round(duration * rate)),
      rate,
    );
    const data = buffer.getChannelData(0);
    let seed =
        173 + [...kind].reduce((sum, letter) => sum + letter.charCodeAt(0), 0),
      brown = 0,
      crack = 0,
      peak = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1,
        t = i / rate,
        phase = i / (data.length - 1);
      brown = 0.96 * brown + 0.04 * noise;
      let sample;
      if (kind === 'step') {
        sample = (brown * 3 + noise * 0.2) * Math.exp(-phase * 5);
      } else if (kind === 'cloth') {
        sample =
          (brown * 1.6 + noise * 0.25) * (0.6 + 0.4 * Math.sin(t * 88) ** 2);
      } else if (kind === 'tap' || kind === 'thud') {
        const resonance = kind === 'thud' ? 105 : 225;
        sample =
          (0.55 * noise + Math.sin(2 * Math.PI * resonance * t) * 0.45) *
          Math.exp(-phase * 6);
      } else if (kind === 'ceramic') {
        sample =
          (0.45 * Math.sin(2 * Math.PI * 920 * t) +
            0.25 * Math.sin(2 * Math.PI * 1470 * t) +
            0.3 * noise) *
          Math.exp(-phase * 6);
      } else if (kind === 'crackle' || kind === 'grains') {
        crack =
          crack * 0.72 +
          (Math.abs(noise) > (kind === 'crackle' ? 0.986 : 0.965) ? noise : 0);
        sample = crack * 2 + brown * 0.2;
      } else if (kind === 'creak') {
        sample =
          (noise * 0.25 + brown * 3) *
          (0.35 + 0.65 * Math.pow(Math.sin(t * 53), 2));
      } else if (kind === 'water' || kind === 'wet') {
        sample =
          (noise * 0.3 + brown * 1.8) *
          (0.5 + 0.5 * Math.pow(Math.sin(t * (kind === 'water' ? 71 : 27)), 2));
      } else if (kind === 'scrape') {
        sample = noise * (0.45 + 0.55 * Math.pow(Math.sin(t * 165), 2));
      } else sample = noise;
      // Fade every finite texture at both ends; no start/stop clicks or loops.
      data[i] = sample * Math.pow(Math.sin(Math.PI * phase), 0.7);
      peak = Math.max(peak, Math.abs(data[i]));
    }
    const scale = peak > 0 ? 0.5 / peak : 1;
    for (let i = 0; i < data.length; i++) data[i] *= scale;
    this.buffers.set(key, buffer);
    return buffer;
  }

  effect(type, position = null) {
    if (type === 'pour-stop' || type === 'pour-reset') {
      for (const [source, voice] of [...this.voices])
        if (voice.type === 'pouring' || voice.type === 'pour-start')
          this.stopVoice(source);
      return false;
    }
    const profile = PROFILES[type];
    if (!profile || !this.canPlay()) return false;
    const [kind, duration, level, cutoff, cooldown] = profile;
    const now = this.context.currentTime;
    if (now - (this.lastPlayed.get(type) ?? -Infinity) < cooldown) return false;
    if (this.voices.size >= this.maxVoices)
      this.stopVoice(this.voices.keys().next().value);
    let source, filter, gain, output;
    try {
      source = this.context.createBufferSource();
      source.buffer = this.materialBuffer(kind, duration);
      source.loop = false;
      filter = this.context.createBiquadFilter();
      filter.type = kind === 'scrape' ? 'bandpass' : 'lowpass';
      filter.frequency.value = cutoff;
      filter.Q.value = kind === 'scrape' ? 0.55 : 0.7;
      gain = this.context.createGain();
      gain.gain.value = level;
      const spatial =
        Array.isArray(position) &&
        position.length === 3 &&
        position.every(Number.isFinite);
      output = spatial
        ? this.context.createPanner()
        : this.context.createGain();
      if (spatial) {
        output.panningModel = 'HRTF';
        output.distanceModel = 'inverse';
        output.refDistance = 0.7;
        output.rolloffFactor = 0.6;
        [
          output.positionX.value,
          output.positionY.value,
          output.positionZ.value,
        ] = position;
      }
      source.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      output.connect(this.master);
      const cleanup = () => {
        source.onended = null;
        for (const node of [source, filter, gain, output]) node.disconnect();
        this.nodes.delete(source);
        this.voices.delete(source);
      };
      source.onended = cleanup;
      this.nodes.add(source);
      this.voices.set(source, { type, cleanup });
      source.start(now);
      source.stop(now + duration + 0.01);
      this.lastPlayed.set(type, now);
      this.effectCount++;
      this.lastEffect = type;
      return true;
    } catch {
      if (source && this.voices.has(source)) this.stopVoice(source);
      else
        for (const node of [source, filter, gain, output]) {
          try {
            node?.disconnect();
          } catch {}
        }
      return false;
    }
  }

  stopVoice(source) {
    const voice = this.voices.get(source);
    if (!voice) return;
    try {
      source.stop(this.context.currentTime);
    } catch {
      /* Already ended. */
    }
    // Disconnect immediately, including while the AudioContext is suspended.
    voice.cleanup();
  }
  stopAll() {
    for (const source of [...this.voices.keys()]) this.stopVoice(source);
  }
  pause(value) {
    this.paused = Boolean(value);
    if (this.paused) {
      this.stopAll();
      this.lastPlayed.clear();
      Promise.resolve(this.context?.suspend()).catch(() => {});
    } else if (this.unlocked) {
      Promise.resolve(this.context?.resume()).catch(() => {});
    }
    this.notify();
  }
  reset() {
    this.stopAll();
    this.lastPlayed.clear();
    this.lastEffect = null;
    // Keep cumulative diagnostics and the user's mute/volume preference.
  }
  dispose() {
    this.disposed = true;
    this.reset();
    this.buffers.clear();
    this.master?.disconnect();
    if (this.context) this.context.onstatechange = null;
    Promise.resolve(this.context?.close()).catch(() => {});
  }
}
