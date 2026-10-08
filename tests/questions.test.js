import test from "node:test";
import assert from "node:assert/strict";
import {
  generateQuestions,
  STANDARD_FREQUENCIES,
} from "../src/lesson1/questions.js";

// Repeatable sessions without replacing randomness in the application.
function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

test("range sessions cover every category with 10 unambiguous, correctly keyed tones", () => {
  const bands = { low: [100, 250], mid: [500, 2000], high: [4000, 8000] };
  for (let seed = 1; seed <= 100; seed++) {
    const questions = generateQuestions(1, seededRandom(seed));
    assert.equal(questions.length, 10);
    for (const category of Object.keys(bands)) {
      assert.ok(questions.filter((q) => q.answer === category).length >= 3);
    }
    for (const q of questions) {
      const [min, max] = bands[q.answer];
      assert.ok(q.tones[0] > min && q.tones[0] < max);
      assert.equal(
        q.choices.filter((choice) => choice.id === q.answer).length,
        1,
      );
    }
  }
});

test("comparison sessions have progressively smaller differences and randomized higher-tone positions", () => {
  const orders = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const questions = generateQuestions(2, seededRandom(seed));
    assert.equal(questions.length, 10);
    assert.equal(questions.filter((q) => q.answer === "0").length, 5);
    assert.equal(questions.filter((q) => q.answer === "1").length, 5);
    questions.forEach((q, index) => {
      assert.equal(Number(q.answer), q.tones[0] > q.tones[1] ? 0 : 1);
      const ratio = Math.max(...q.tones) / Math.min(...q.tones);
      if (index < 4) assert.ok(ratio >= 5);
      else if (index < 7) assert.equal(ratio, 2);
      else assert.equal(ratio, 1.5);
    });
    orders.add(questions.map((q) => q.answer).join(""));
  }
  assert.ok(orders.size > 10);
});

test("exact-frequency questions have four distinct choices, one correct answer, and all seven targets", () => {
  const correctPositions = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const questions = generateQuestions(3, seededRandom(seed));
    assert.equal(questions.length, 10);
    assert.deepEqual(
      [...new Set(questions.map((q) => q.tones[0]))].sort((a, b) => a - b),
      STANDARD_FREQUENCIES,
    );
    for (const q of questions) {
      assert.equal(q.choices.length, 4);
      assert.equal(new Set(q.choices.map((choice) => choice.id)).size, 4);
      assert.equal(q.answer, String(q.tones[0]));
      assert.equal(
        q.choices.filter((choice) => choice.id === q.answer).length,
        1,
      );
      q.choices.forEach((choice) =>
        assert.ok(STANDARD_FREQUENCIES.includes(Number(choice.id))),
      );
      correctPositions.add(
        q.choices.findIndex((choice) => choice.id === q.answer),
      );
    }
  }
  assert.equal(correctPositions.size, 4);
});
