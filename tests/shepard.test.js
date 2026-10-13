import test from "node:test";
import assert from "node:assert/strict";
import { createShepardSamples, shepardComponents, NOTE_SECONDS } from "../src/audio/shepard-engine.js";

test("Shepard PCM has octave components, fixed spectral envelope, exact repeating cycle and conservative smooth output", () => {
  const rate = 24000;
  const samples = createShepardSamples(rate);
  const noteLength = Math.round(rate * NOTE_SECONDS);
  assert.equal(samples.length, noteLength * 24);
  let peak = 0;
  for (const sample of samples) { assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample)); }
  assert.ok(peak > 0.015 && peak <= 0.035001);
  assert.deepEqual(samples.slice(0, noteLength * 12), samples.slice(noteLength * 12));
  for (let step = 0; step < 24; step++) {
    assert.equal(samples[step * noteLength], 0);
    assert.equal(Math.abs(samples[(step + 1) * noteLength - 1]), 0);
    const cs = shepardComponents(step);
    for (let i = 1; i < cs.length; i++) assert.ok(Math.abs(cs[i].frequency / cs[i - 1].frequency - 2) < 1e-9);
    assert.ok(cs[3].amplitude > cs[0].amplitude);
    // Measure the generated waveform, not just the synthesis parameters:
    // multiple octave frequencies must coexist within the SAME note.
    for (const component of cs.slice(1, 5)) {
      let real = 0, imaginary = 0;
      const start = Math.round(rate * .04), end = Math.round(rate * .24);
      for (let i = start; i < end; i++) {
        const angle = 2 * Math.PI * component.frequency * i / rate;
        real += samples[step * noteLength + i] * Math.cos(angle);
        imaginary += samples[step * noteLength + i] * Math.sin(angle);
      }
      const measured = 2 * Math.hypot(real, imaginary) / (end - start);
      assert.ok(Math.abs(measured - component.amplitude) < .0005);
    }
  }
});
