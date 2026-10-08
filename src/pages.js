import { arrow, lessonCard, pageLayout, waveform } from "./components.js";
import { lessons } from "./data/lessons.js";

export function welcomePage() {
  return pageLayout(
    `
    <section class="welcome-grid">
      <div class="welcome-copy">
        <h1>סאונד והגברה</h1>
        <p class="subtitle">בית הספר המונטסורי כפר סבא</p>
        <div class="welcome-message">
          <p>ברוכים הבאים לאתר הקורס.</p>
          <p>באתר תוכלו למצוא מצגות המסכמות את כל השיעורים ותרגילים לעבודה בבית.</p>
        </div>
        <aside class="safety" aria-labelledby="safety-title">
          <span class="headphone-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12H3v8h4v-8H4Zm16 0h1v8h-4v-8h3Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <div><h2 id="safety-title">שימו לב!</h2>
          <p>עבדו על התרגילים עם אוזניות בווליום נמוך. אם אתם לא שומעים את הצלילים הנשמעים, הרימו את הווליום בזהירות עד שאתם שומעים.</p>
          <p>בכל מצב, אם אתם מרגישים חוסר נוחות או כאב הפסיקו מיד את התרגיל והנמיכו את הווליום לגובה נוח ונעים. שמרו על האוזניים והשמיעה שלכם.</p></div>
        </aside>
        <a class="button" href="/lessons" data-link>קדימה לשיעורים ${arrow}</a>
      </div>
      <div class="sound-art" aria-hidden="true"><div class="art-grid"></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="art-wave">${waveform()}</div><span class="art-dot"></span><div class="art-baseline"></div><div class="art-mini-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
    </section>`,
    "welcome-page",
  );
}

export function lessonsPage() {
  return pageLayout(
    `<div class="page-heading"><span class="heading-line" aria-hidden="true"></span><h1>השיעורים שלנו</h1></div><div class="lessons-grid">${lessons.map(lessonCard).join("")}</div>`,
    "inner-page",
  );
}

export function lessonPage(lesson) {
  return pageLayout(
    `<section class="placeholder"><div class="placeholder-wave" aria-hidden="true">${waveform()}</div><h1>${lesson.label} – ${lesson.title}</h1><p>תוכן השיעור יתווסף בקרוב.</p><a class="button" href="/lessons" data-link>חזרה לשיעורים ${arrow}</a></section>`,
    "inner-page",
  );
}
