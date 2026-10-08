// Constant, conservative amplitude: never boost hard-to-hear frequencies.
export const TONE_GAIN = 0.035;
export const TONE_DURATION = 1;
const FADE_IN = 0.035;
const FADE_OUT = 0.08;
// A newly mounted exercise waits for the previous exercise's audio to be released.
let retiringAudio = Promise.resolve();

export class ToneEngine {
  constructor(onPlaying = () => {}) {
    this.context = null;
    this.active = null;
    this.generation = 0;
    this.disposed = false;
    this.onPlaying = onPlaying;
  }

  async play(frequency) {
    if (this.disposed) return false;
    if (!Number.isFinite(frequency) || frequency < 100 || frequency > 8000) {
      throw new RangeError("Unsupported frequency");
    }
    const generation = ++this.generation;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio unavailable");
    // Created/resumed only inside a student's playback action.
    this.context ??= new AudioContextClass();
    const context = this.context;
    const resume =
      context.state === "suspended" ? context.resume() : Promise.resolve();
    await Promise.all([resume, this.stopActive(), retiringAudio]);
    if (this.disposed || generation !== this.generation) return false;
    if (context.state !== "running")
      throw new Error("Audio context not running");

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(TONE_GAIN, now + FADE_IN);
    gain.gain.setValueAtTime(TONE_GAIN, now + TONE_DURATION - FADE_OUT);
    gain.gain.linearRampToValueAtTime(0, now + TONE_DURATION);
    oscillator.connect(gain);
    gain.connect(context.destination);

    const active = { oscillator, gain, stopPromise: null };
    active.release = () => {
      oscillator.disconnect();
      gain.disconnect();
      if (this.active === active) {
        this.active = null;
        this.onPlaying(false);
      }
    };
    oscillator.onended = active.release;
    this.active = active;
    oscillator.start(now);
    oscillator.stop(now + TONE_DURATION);
    this.onPlaying(true);
    return true;
  }

  stopActive() {
    const active = this.active;
    if (!active) return Promise.resolve();
    if (active.stopPromise) return active.stopPromise;
    const now = this.context.currentTime;
    const parameter = active.gain.gain;
    if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
    else {
      const level = parameter.value;
      parameter.cancelScheduledValues(now);
      parameter.setValueAtTime(level, now);
    }
    parameter.linearRampToValueAtTime(0, now + 0.02);
    active.oscillator.stop(now + 0.025);
    // Also disconnect when a background tab has suspended its audio clock.
    // New oscillators wait for this release, so they never overlap.
    active.stopPromise = new Promise((resolve) => {
      setTimeout(() => {
        active.release();
        resolve();
      }, 35);
    });
    return active.stopPromise;
  }

  stop() {
    this.generation++;
    return this.stopActive();
  }

  dispose() {
    this.disposed = true;
    const release = this.stop().then(async () => {
      if (this.context && this.context.state !== "closed") {
        await this.context.close();
      }
      this.context = null;
    });
    const retirement = Promise.all([retiringAudio, release]);
    retiringAudio = retirement.catch(() => {});
    return retirement;
  }
}
