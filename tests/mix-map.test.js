import test from "node:test";
import assert from "node:assert/strict";
import { createSound, loadMap, palette, sanitizeMap, saveMap, STORAGE_KEY } from "../src/mix-map/model.js";

test("new maps are empty and sounds have independent spatial properties and unique ids", () => {
  assert.deepEqual(sanitizeMap(null), { version: 1, nickname: "", sounds: [] });
  const first = createSound();
  const second = createSound(1);
  assert.notEqual(first.id, second.id);
  assert.deepEqual([first.x, first.y, first.depth, first.size], [0.5, 0.5, 1, 76]);
  assert.equal(first.color, palette[0]);
  assert.equal(second.color, palette[1]);
  assert.equal(first.label, "צליל חדש");
});

test("restore clamps malformed properties, preserves valid custom labels, and repairs duplicate ids", () => {
  const restored = sanitizeMap({
    nickname: "שם ".repeat(25),
    sounds: [null, "bad", { id: "same", label: "בס אישי", x: -8, y: 9, depth: 40, size: 300, color: "#ABCDEF", entry: "0:24" },
      { id: "same", label: "", x: NaN, y: "1", depth: null, size: -90, color: "red" }],
  });
  assert.equal(restored.nickname.length, 48);
  assert.equal(restored.sounds.length, 2);
  const [first, second] = restored.sounds;
  assert.equal(first.label, "בס אישי");
  assert.deepEqual([first.x, first.y, first.depth, first.size, first.color, first.entry], [0, 1, 2, 128, "#abcdef", "0:24"]);
  assert.notEqual(first.id, second.id);
  assert.deepEqual([second.x, second.y, second.depth, second.size], [0.5, 0.5, 1, 48]);
  assert.equal(second.label, "צליל חדש");
  assert.equal(sanitizeMap({ sounds: [{ label: "א".repeat(100) }] }).sounds[0].label.length, 48);
});

test("local persistence round-trips every sound property without limiting sound count", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const state = { version: 1, nickname: "תלמידה", sounds: Array.from({ length: 180 }, (_, i) => ({ ...createSound(i), label: `צליל ${i}`, x: i / 180, y: 1 - i / 180, depth: i % 3, size: 48 + i % 81, entry: "1:22" })) };
  assert.equal(saveMap(state, storage), true);
  assert.ok(values.has(STORAGE_KEY));
  assert.deepEqual(loadMap(storage), state);
});

test("corrupt or unavailable storage never prevents creating a map", () => {
  assert.deepEqual(loadMap({ getItem: () => "{bad json" }), sanitizeMap(null));
  const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("full"); } };
  assert.deepEqual(loadMap(denied), sanitizeMap(null));
  assert.equal(saveMap({ sounds: [] }, denied), false);
});
