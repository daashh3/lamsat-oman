/** Requested text reading only; chapter events never generate narration. */
export class NarrationManager {
  constructor({
    onStatus = () => {},
    synth = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    now = () => performance.now(),
  } = {}) {
    Object.assign(this, { onStatus, synth, Utterance, now });
    this.enabled = true;
    this.unlocked = false;
    this.paused = false;
    this.volume = 0.5;
    this.voices = [];
    this.utterance = null;
    this.timer = null;
    this.lastSpoken = null;
    this.watchdog = null;
    this.disposed = false;
    this.boundVoicesChanged = () => {
      this.refreshVoices();
      this.onStatus();
    };
    this.synth?.addEventListener?.('voiceschanged', this.boundVoicesChanged);
    this.refreshVoices();
  }

  get available() {
    return !!this.synth && typeof this.Utterance === 'function';
  }
  get speaking() {
    return !!this.utterance;
  }
  get activeChannel() {
    return this.speaking ? 'tts' : null;
  }
  refreshVoices() {
    try {
      this.voices = this.synth?.getVoices?.() || [];
    } catch {
      this.voices = [];
    }
  }
  unlock() {
    this.unlocked = true;
  }
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) this.stop();
    this.onStatus();
  }
  setVolume(volume) {
    if (Number.isFinite(volume)) this.volume = Math.max(0, Math.min(1, volume));
  }
  canSpeak() {
    return !this.disposed && this.enabled && this.unlocked && !this.paused;
  }

  /** A new label replaces the previous request; explicit clicks bypass debounce. */
  speakText(
    text,
    { delay = 0, force = false, rate = 0.92, pitch = 1.02 } = {},
  ) {
    const clean = String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200);
    if (!clean || !this.canSpeak() || !this.available) return false;
    if (
      !force &&
      clean === this.lastSpoken?.text &&
      this.now() - this.lastSpoken.time < 1500
    )
      return false;
    this.cancelPending();
    const request = { text: clean, rate, pitch };
    if (delay > 0) {
      this.timer = setTimeout(
        () => {
          this.timer = null;
          this.request(request);
        },
        Math.min(delay, 1000),
      );
    } else this.request(request);
    return true;
  }

  request(request) {
    if (!this.canSpeak()) return;
    this.stopActive();
    this.refreshVoices();
    const voice =
      this.voices.find((v) => /^ar[-_]SA$/i.test(v.lang)) ||
      this.voices.find((v) => /^ar(?:-|_|$)/i.test(v.lang)) ||
      this.voices.find((v) => v.default) ||
      this.voices[0];
    const utterance = new this.Utterance(request.text);
    if (voice) utterance.voice = voice;
    utterance.lang = 'ar-SA';
    utterance.rate = Math.max(0.6, Math.min(1.2, request.rate));
    utterance.pitch = Math.max(0.8, Math.min(1.2, request.pitch));
    utterance.volume = this.volume;
    this.utterance = utterance;
    this.lastSpoken = { text: request.text, time: this.now() };
    const ended = () => {
      if (this.utterance !== utterance) return;
      clearTimeout(this.watchdog);
      this.watchdog = null;
      this.utterance = null;
      this.onStatus();
    };
    utterance.onend = ended;
    utterance.onerror = ended;
    this.startWatchdog(utterance);
    try {
      this.synth.speak(utterance);
    } catch {
      ended();
    }
    this.onStatus();
  }

  startWatchdog(utterance) {
    // Recover if an installed voice never reports completion.
    this.watchdog = setTimeout(
      () => {
        if (this.utterance !== utterance || this.paused) return;
        this.stopActive();
        this.onStatus();
      },
      Math.max(12000, utterance.text.length * 180),
    );
    this.watchdog.unref?.();
  }
  cancelPending() {
    clearTimeout(this.timer);
    this.timer = null;
  }
  stopActive() {
    const active = this.utterance;
    clearTimeout(this.watchdog);
    this.watchdog = null;
    this.utterance = null;
    if (active) this.synth?.cancel();
  }
  pause() {
    this.paused = true;
    this.cancelPending();
    clearTimeout(this.watchdog);
    this.watchdog = null;
    if (this.utterance) this.synth?.pause();
  }
  resume() {
    this.paused = false;
    if (this.utterance && this.canSpeak()) {
      this.synth?.resume();
      this.startWatchdog(this.utterance);
    }
  }
  stop() {
    this.cancelPending();
    this.stopActive();
  }
  dispose() {
    this.disposed = true;
    this.stop();
    this.synth?.removeEventListener?.('voiceschanged', this.boundVoicesChanged);
  }
}
