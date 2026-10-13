import { TONE_GAIN } from "./tone-engine.js";

export const NOTE_SECONDS = 0.32;
export const SHEPARD_STEPS = 24;
export const SHEPARD_DURATION = NOTE_SECONDS * SHEPARD_STEPS;

// A discrete Shepard scale: six octave-spaced sinusoids under a fixed raised
// cosine envelope in log-frequency space (65.4–4186 Hz). Pitch classes repeat
// every 12 semitones. The spectrum at step 12 is identical to step 0.
// https://musicweb.ucsd.edu/~trsmyth/stream175/Shepard_Tones.html
export function shepardComponents(step) {
  const pitchClass = ((step % 12) + 12) % 12;
  const components = Array.from({ length: 6 }, (_, octave) => {
    const position = octave + pitchClass / 12;
    return { frequency: 65.406391325 * 2 ** position, amplitude: Math.sin(Math.PI * position / 6) ** 2 };
  });
  const sum = components.reduce((total, c) => total + c.amplitude, 0);
  return components.map(c => ({ ...c, amplitude: c.amplitude / sum * TONE_GAIN }));
}

export function createShepardSamples(sampleRate) {
  const noteLength = Math.round(sampleRate * NOTE_SECONDS);
  const samples = new Float32Array(noteLength * SHEPARD_STEPS);
  for (let step = 0; step < SHEPARD_STEPS; step++) {
    const components = shepardComponents(step);
    for (let i = 0; i < noteLength; i++) {
      const time = i / sampleRate;
      // Separate smoothly faded notes, with a short silent gap. No sudden resets.
      const envelope = Math.max(0, Math.min(1, time / 0.025, (0.30 - time) / 0.05));
      let value = 0;
      for (const c of components) value += c.amplitude * Math.sin(2 * Math.PI * c.frequency * time);
      samples[step * noteLength + i] = value * envelope;
    }
  }
  return samples;
}

export class ShepardEngine {
  constructor(onState) {
    this.onState = onState;
    this.context = null;
    this.source = null;
    this.generation = 0;
    this.disposed = false;
  }
  async play() {
    if (this.disposed) return;
    this.stop();
    const generation = this.generation;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw new Error("Web Audio unavailable");
    this.context ??= new Context();
    const context = this.context;
    if (context.state === "suspended") await context.resume();
    if (this.disposed || generation !== this.generation) return;
    if (context.state !== "running") throw new Error("Audio context not running");
    const samples = createShepardSamples(context.sampleRate);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      source.disconnect();
      if (this.source !== source || this.disposed) return;
      this.source = null;
      this.onState("ended");
    };
    this.source = source;
    source.start();
    this.onState("playing");
  }
  stop() {
    this.generation++;
    if (this.source) {
      this.source.onended = null;
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
    if (!this.disposed) this.onState("stopped");
  }
  dispose() {
    this.disposed = true;
    this.stop();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => {});
  }
}
