export const arrow =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function soundMark() {
  return '<span class="sound-mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
}

export function pageLayout(content, className = "") {
  return `
    <div class="site-shell">
      <header class="site-header">
        <a class="brand" href="/" data-link aria-label="סאונד והגברה">${soundMark()}<span>סאונד והגברה</span></a>
        <span class="school">בית הספר המונטסורי כפר סבא</span>
      </header>
      <main id="main" class="${className}" tabindex="-1">${content}</main>
      <footer aria-hidden="true"><span></span>${soundMark()}<span></span></footer>
    </div>`;
}

export function lessonCard(lesson) {
  return `<a class="lesson-card" href="/lessons/${lesson.id}" data-link>
    <div class="lesson-art" aria-hidden="true">${waveform()}<span class="lesson-number">${lesson.id.padStart(2, "0")}</span></div>
    <div class="lesson-card-body"><div><span class="eyebrow">${lesson.label}</span><h2>${lesson.title}</h2></div><span class="circle-arrow">${arrow}</span></div>
  </a>`;
}

export function waveform() {
  const bars = Array.from({ length: 49 }, (_, i) => {
    const height =
      12 +
      Math.pow(Math.sin(i * 0.39), 2) *
        (130 * Math.pow(Math.sin((i / 48) * Math.PI), 2) + 12);
    return `<line x1="${12 + i * 7}" y1="${100 - height / 2}" x2="${12 + i * 7}" y2="${100 + height / 2}"/>`;
  }).join("");
  return `<svg class="waveform" viewBox="0 0 360 200" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="3" stroke-linecap="round">${bars}</g></svg>`;
}
