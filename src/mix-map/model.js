export const STORAGE_KEY = "sound-lab:billie-jean:mix-map:v1";

export const palette = [
  "#c2db9c",
  "#8dc9dc",
  "#e7ad85",
  "#bea5de",
  "#e69cae",
  "#82c8b4",
];

// Coordinates describe the available center-to-center span, not the outer edge.
// The workspace leaves 72px around this span so even the largest sound fits.
export const MAP_PADDING = 72;
export const MIN_SIZE = 48;
export const MAX_SIZE = 128;

function newId() {
  return globalThis.crypto?.randomUUID?.() ??
    `sound-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createSound(index = 0) {
  return {
    id: newId(),
    label: "צליל חדש",
    x: 0.5,
    y: 0.5,
    depth: 1,
    size: 76,
    color: palette[((Math.trunc(index) || 0) % palette.length + palette.length) % palette.length],
    entry: "",
  };
}

function numberInRange(value, min, max, fallback) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function text(value, maxLength) {
  return typeof value === "string"
    ? [...value.replace(/[\u0000-\u001f\u007f]/g, " ")].slice(0, maxLength).join("")
    : "";
}

export function sanitizeMap(value) {
  const result = { version: 1, nickname: "", sounds: [] };
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  result.nickname = text(value.nickname, 48);
  if (!Array.isArray(value.sounds)) return result;
  const ids = new Set();
  for (const item of value.sounds) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const sound = createSound(result.sounds.length);
    if (typeof item.id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(item.id) && !ids.has(item.id)) {
      sound.id = item.id;
    }
    ids.add(sound.id);
    sound.label = text(item.label, 48).trim() || sound.label;
    sound.x = numberInRange(item.x, 0, 1, sound.x);
    sound.y = numberInRange(item.y, 0, 1, sound.y);
    sound.depth = Math.round(numberInRange(item.depth, 0, 2, sound.depth));
    sound.size = numberInRange(item.size, MIN_SIZE, MAX_SIZE, sound.size);
    sound.color = typeof item.color === "string" && /^#[0-9a-f]{6}$/i.test(item.color)
      ? item.color.toLowerCase()
      : sound.color;
    sound.entry = text(item.entry, 12);
    result.sounds.push(sound);
  }
  return result;
}

export function loadMap(storage) {
  try {
    const saved = (storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY);
    return sanitizeMap(saved ? JSON.parse(saved) : null);
  } catch {
    return sanitizeMap(null);
  }
}

export function saveMap(state, storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) return false;
    target.setItem(STORAGE_KEY, JSON.stringify(sanitizeMap(state)));
    return true;
  } catch {
    return false;
  }
}
