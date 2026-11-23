import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * "Oud Majlis": original, quiet Arabic-inspired instrumental music, 120 seconds.
 * Soft paired-course plucks and a constant low tonic/fifth drone; no percussion,
 * chord progression, bright bells, recorded samples, speech or vocals.
 * The neutral second/sixth deliberately use microtonal tuning for modal colour.
 * This is a new synthetic composition, not a claim of traditional authenticity.
 */
const sampleRate = 22050;
const duration = 120;
const samples = sampleRate * duration;
const left = new Float32Array(samples);
const right = new Float32Array(samples);
const tonic = 146.8323839587038; // D3, kept in a warm low/middle register.
const modeCents = [0, 150, 300, 500, 700, 850, 1000];
const frequency = (degree) => {
  const octave = Math.floor(degree / modeCents.length);
  const index =
    ((degree % modeCents.length) + modeCents.length) % modeCents.length;
  return tonic * 2 ** ((modeCents[index] + octave * 1200) / 1200);
};

// Unhurried phrases and rests are placed in seconds, without a metronomic beat.
// Each tuple is [onset, modal degree, ring time, relative strength, stereo pan].
const melody = [
  [4.0, 0, 4.8, 0.83, -0.17],
  [8.5, 1, 3.7, 0.66, -0.12],
  [10.8, 2, 4.0, 0.72, -0.04],
  [15.6, 1, 3.6, 0.61, 0.08],
  [18.6, 0, 5.2, 0.76, 0.16],
  [25.0, 0, 3.9, 0.7, 0.15],
  [27.4, 2, 4.3, 0.76, 0.04],
  [32.7, 3, 4.5, 0.8, -0.08],
  [35.2, 2, 3.7, 0.64, -0.15],
  [38.5, 1, 4.2, 0.68, -0.1],
  [41.0, 0, 5.5, 0.77, 0.02],
  [48.0, 3, 4.8, 0.73, -0.13],
  [52.3, 4, 4.6, 0.78, 0.04],
  [57.6, 3, 4.0, 0.7, 0.13],
  [60.0, 2, 4.4, 0.68, 0.15],
  [64.3, 1, 4.2, 0.62, 0.03],
  [67.2, 0, 5.7, 0.75, -0.11],
  [75.0, 4, 4.9, 0.72, -0.14],
  [79.6, 5, 3.7, 0.63, -0.04],
  [82.2, 4, 4.7, 0.69, 0.09],
  [86.8, 3, 3.8, 0.65, 0.15],
  [89.4, 2, 5.3, 0.7, 0.03],
  [97.0, 2, 4.5, 0.68, -0.09],
  [100.5, 1, 4.8, 0.63, -0.16],
  [105.0, 0, 5.4, 0.74, -0.03],
  [110.0, -3, 4.6, 0.57, 0.1],
  [114.5, 1, 3.7, 0.59, 0.14],
  [117.2, 0, 6.8, 0.67, 0.02],
];

function addOud(start, degree, seconds, strength, pan) {
  const hz = frequency(degree);
  const first = Math.round(start * sampleRate);
  const length = Math.round(seconds * sampleRate);
  const gain = 0.13 * strength;
  const lGain = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const rGain = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  // Gentle paired string courses and rapidly damping upper harmonics suggest
  // a rounded oud pluck. A 35ms attack suppresses pick clicks and sharp highs.
  const detune = 2 ** (2.8 / 1200);
  const bend = 2 ** (-13 / 1200) - 1;
  const partials = [1, 0.39, 0.17, 0.075, 0.028];
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const easedTime = t + bend * 0.12 * (1 - Math.exp(-t / 0.12));
    const phase = 2 * Math.PI * hz * easedTime;
    const attack = 1 - Math.exp(-t / 0.035);
    const release = Math.min(1, (seconds - t) / 0.65);
    let wave = 0;
    for (let n = 1; n <= partials.length; n++) {
      const decay = Math.exp(-t * (0.58 + (n - 1) * 0.48));
      const courses =
        Math.sin(phase * n) * 0.61 + Math.sin(phase * detune * n) * 0.39;
      wave += courses * partials[n - 1] * decay;
    }
    const index = (first + i) % samples;
    left[index] += wave * attack * release * lGain;
    right[index] += wave * attack * release * rGain;
  }
}

// Quantize drone frequencies to complete cycles over 120s so every harmonic,
// slow swell and stereo motion meets itself exactly at the loop boundary.
const cycleFrequency = (hz) => Math.round(hz * duration) / duration;
const droneRoot = cycleFrequency(tonic / 2);
const droneFifth = cycleFrequency(tonic * 0.75);
for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  const swell = 0.87 + 0.13 * Math.cos((2 * Math.PI * t) / 40);
  const width = 0.04 * Math.sin((2 * Math.PI * t) / 60);
  const root = Math.sin(2 * Math.PI * droneRoot * t);
  const octave = Math.sin(2 * Math.PI * droneRoot * 2 * t) * 0.18;
  const fifth = Math.sin(2 * Math.PI * droneFifth * t) * 0.34;
  const drone = (root + octave + fifth) * 0.012 * swell;
  left[i] = drone * (0.71 + width);
  right[i] = drone * (0.71 - width);
}
for (const note of melody) addOud(...note);

// Quiet, non-rhythmic room reflections; tails wrap rather than being truncated.
const dryLeft = left.slice();
const dryRight = right.slice();
for (const [seconds, gain] of [
  [0.083, 0.09],
  [0.137, 0.07],
  [0.229, 0.055],
  [0.431, 0.033],
  [0.683, 0.018],
]) {
  const delay = Math.round(seconds * sampleRate);
  for (let i = 0; i < samples; i++) {
    const destination = (i + delay) % samples;
    left[destination] += dryRight[i] * gain;
    right[destination] += dryLeft[i] * gain;
  }
}

let peak = 0;
for (let i = 0; i < samples; i++)
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
if (!Number.isFinite(peak) || peak === 0)
  throw new Error('Invalid generated audio');
const frameBytes = 4;
const wav = Buffer.alloc(44 + samples * frameBytes);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * frameBytes, 28);
wav.writeUInt16LE(frameBytes, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(samples * frameBytes, 40);
let squared = 0;
for (let i = 0; i < samples; i++) {
  const l = (left[i] / peak) * 0.52;
  const r = (right[i] / peak) * 0.52;
  squared += l * l + r * r;
  wav.writeInt16LE(Math.round(l * 32767), 44 + i * frameBytes);
  wav.writeInt16LE(Math.round(r * 32767), 46 + i * frameBytes);
}
const destination = fileURLToPath(
  new URL('../public/assets/audio/oud-majlis.wav', import.meta.url),
);
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, wav);
const boundary =
  (Math.max(
    Math.abs(left[0] - left.at(-1)),
    Math.abs(right[0] - right.at(-1)),
  ) /
    peak) *
  0.52;
console.log(
  `Generated oud-majlis.wav: ${duration}s stereo PCM, ${sampleRate} Hz, ${wav.length} bytes; peak .52, RMS ${Math.sqrt(squared / (samples * 2)).toFixed(4)}, loop-edge delta ${boundary.toFixed(6)}.`,
);
