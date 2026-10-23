import { MAP_PADDING, sanitizeMap } from "./model.js";

const INK = "#edf3e9";
const MUTED = "#b2c4bb";
const DEPTH_LABELS = ["קרוב", "אמצע", "רחוק"];
const SCALE = 2.5;

function roundedRect(ctx, x, y, width, height, radius = 18) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function label(ctx, value, x, y, { size = 30, color = INK, align = "center", direction = "rtl", weight = 400 } = {}) {
  ctx.font = `${weight} ${size}px Heebo, Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.direction = direction;
  ctx.fillText(value, x, y);
}

function wrapLabel(ctx, value, maxWidth) {
  // Break long unspaced custom names as well as ordinary Hebrew words.
  const words = value.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (ctx.measureText(`${line} ${word}`.trim()).width <= maxWidth) {
      line = `${line} ${word}`.trim();
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const char of word) {
      if (line && ctx.measureText(line + char).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line += char;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function blobPath(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.bezierCurveTo(x + radius * 0.7, y - radius * 1.08, x + radius * 1.05, y - radius * 0.5, x + radius, y + radius * 0.05);
  ctx.bezierCurveTo(x + radius * 0.95, y + radius * 0.73, x + radius * 0.48, y + radius * 1.04, x - radius * 0.09, y + radius);
  ctx.bezierCurveTo(x - radius * 0.78, y + radius * 0.95, x - radius * 1.03, y + radius * 0.45, x - radius, y - radius * 0.1);
  ctx.bezierCurveTo(x - radius * 0.96, y - radius * 0.72, x - radius * 0.57, y - radius * 1.04, x, y - radius);
  ctx.closePath();
}

function drawSound(ctx, sound, field) {
  const padding = MAP_PADDING * SCALE;
  const x = field.x + padding + sound.x * (field.width - padding * 2);
  const y = field.y + padding + sound.y * (field.height - padding * 2);
  const radius = sound.size * SCALE / 2;
  ctx.save();
  ctx.shadowColor = `${sound.color}55`;
  ctx.shadowBlur = [34, 19, 7][sound.depth];
  ctx.shadowOffsetY = [15, 7, 0][sound.depth];
  ctx.globalAlpha = [0.92, 0.72, 0.5][sound.depth];
  const fill = ctx.createRadialGradient(x - radius * 0.28, y - radius * 0.35, 0, x, y, radius * 1.3);
  fill.addColorStop(0, sound.color);
  fill.addColorStop(1, `${sound.color}72`);
  ctx.fillStyle = fill;
  blobPath(ctx, x, y, radius);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;
  ctx.strokeStyle = sound.color;
  ctx.lineWidth = [4, 2.5, 2][sound.depth];
  ctx.setLineDash(sound.depth === 2 ? [8, 7] : []);
  ctx.stroke();
  ctx.setLineDash([]);

  const pillWidth = Math.max(180, Math.min(330, radius * 2.4));
  ctx.font = "500 30px Heebo, Arial, sans-serif";
  let lines = wrapLabel(ctx, sound.label, pillWidth - 30);
  // Names are capped at 48 characters by the state model. A wider label is
  // preferable to truncating a student's chosen name.
  let fontSize = 30;
  while (lines.length > 4 && fontSize > 24) {
    fontSize -= 2;
    ctx.font = `500 ${fontSize}px Heebo, Arial, sans-serif`;
    lines = wrapLabel(ctx, sound.label, pillWidth - 30);
  }
  const lineHeight = fontSize * 1.3;
  const pillHeight = lines.length * lineHeight + 20;
  ctx.fillStyle = "#12201fee";
  roundedRect(ctx, x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, 15);
  ctx.fill();
  lines.forEach((line, index) => label(ctx, line, x, y + (index - (lines.length - 1) / 2) * lineHeight, { size: fontSize, weight: 500 }));
  if (sound.entry.trim()) {
    label(ctx, sound.entry, x, y + pillHeight / 2 + 26, { size: 23, color: MUTED });
  }
  ctx.restore();
}

export async function buildMixMapCanvas(value) {
  const state = sanitizeMap(value);
  // Use the site's locally bundled Hebrew font, including when export is the
  // first action immediately after opening the lesson.
  if (document.fonts) {
    await document.fonts.load("500 30px Heebo", "מפת המיקס");
    await document.fonts.load("700 64px Heebo", "מפת המיקס");
    await document.fonts.ready;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 2400;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("הדפדפן אינו תומך ביצירת תמונה.");
  ctx.fillStyle = "#142522";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  label(ctx, "מפת המיקס שלי", 2240, 94, { size: 35, color: "#c2db9c", align: "right", weight: 500 });
  label(ctx, "Billie Jean", 2240, 176, { size: 76, align: "right", direction: "ltr", weight: 700 });
  label(ctx, "Michael Jackson", 160, 176, { size: 38, align: "left", direction: "ltr", color: MUTED });
  if (state.nickname.trim()) label(ctx, state.nickname.trim(), 2240, 244, { size: 30, align: "right", color: MUTED });

  const field = { x: 164, y: 314, width: 2072, height: 1016 };
  ctx.fillStyle = "#192e2b";
  roundedRect(ctx, field.x, field.y, field.width, field.height, 28);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(field.x, field.y, field.width, field.height);
  ctx.clip();
  const bands = ["#ffffff03", "#c2db9c05", "#00000008"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = bands[i];
    ctx.fillRect(field.x, field.y + i * field.height / 3, field.width, field.height / 3);
  }
  ctx.strokeStyle = "#a8c2b412";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = field.x; x <= field.x + field.width; x += 80) {
    ctx.moveTo(x, field.y);
    ctx.lineTo(x, field.y + field.height);
  }
  for (let y = field.y; y <= field.y + field.height; y += 80) {
    ctx.moveTo(field.x, y);
    ctx.lineTo(field.x + field.width, y);
  }
  ctx.stroke();
  ctx.setLineDash([10, 12]);
  ctx.strokeStyle = "#c2db9c40";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1200, field.y);
  ctx.lineTo(1200, field.y + field.height);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#6c8a7e6b";
  ctx.lineWidth = 2;
  roundedRect(ctx, field.x, field.y, field.width, field.height, 28);
  ctx.stroke();

  const p = MAP_PADDING * SCALE;
  label(ctx, "גבוה", 120, field.y + p, { size: 29, color: MUTED, align: "right" });
  label(ctx, "אמצע", 120, field.y + field.height / 2, { size: 29, color: MUTED, align: "right" });
  label(ctx, "נמוך", 120, field.y + field.height - p, { size: 29, color: MUTED, align: "right" });
  label(ctx, "גובה תדר נתפס", 1200, 286, { size: 26, color: MUTED });
  label(ctx, "L100 · שמאל", field.x + p, 1380, { size: 30, color: MUTED, direction: "ltr" });
  label(ctx, "C · מרכז", 1200, 1380, { size: 30, color: MUTED, direction: "ltr" });
  label(ctx, "R100 · ימין", field.x + field.width - p, 1380, { size: 30, color: MUTED, direction: "ltr" });

  // Far sounds are painted first so depth is a spatial cue, while every label
  // keeps its own fully opaque foreground.
  [...state.sounds].sort((a, b) => b.depth - a.depth).forEach(sound => drawSound(ctx, sound, field));

  label(ctx, "עומק במיקס", 2240, 1480, { size: 28, align: "right", color: MUTED });
  DEPTH_LABELS.forEach((depth, index) => {
    const x = 1985 - index * 235;
    ctx.save();
    ctx.fillStyle = "#c2db9c";
    ctx.globalAlpha = [0.92, 0.72, 0.5][index];
    ctx.beginPath();
    ctx.arc(x, 1480, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#c2db9c";
    ctx.setLineDash(index === 2 ? [4, 4] : []);
    ctx.stroke();
    ctx.restore();
    label(ctx, depth, x - 35, 1480, { size: 28, align: "right" });
  });
  label(ctx, "גודל הצליל מבטא את הבולטות שלו במיקס", 160, 1480, { size: 25, align: "left", color: MUTED });
  label(ctx, "סאונד והגברה · מפת האזנה אישית", 1200, 1553, { size: 24, color: "#7c9b8e" });
  return canvas;
}

export async function exportMixMap(state) {
  const canvas = await buildMixMapCanvas(state);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    result => result ? resolve(result) : reject(new Error("לא ניתן ליצור תמונה כרגע. נסו שוב.")),
    "image/png",
  ));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "billie-jean-mix-map.png";
  document.body.append(link);
  link.click();
  link.remove();
  // Give browsers time to hand the blob to the download manager.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob;
}
