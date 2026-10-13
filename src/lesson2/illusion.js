import { ShepardEngine, shepardComponents } from "../audio/shepard-engine.js";

function spectrum(step) {
  const components = shepardComponents(step);
  return `<svg viewBox="0 0 620 215" role="img" aria-label="רכיבי הצליל: תדרים במרווחי אוקטבה. הרכיבים באמצע חזקים יותר מהרכיבים בקצוות.">
    <path d="M40 160 Q310 -100 580 160" fill="none" stroke="#abbda8" stroke-width="2" stroke-dasharray="5 5"/>
    <path d="M40 30 V160 H580" fill="none" stroke="#6e8d77"/>
    ${components.map((c, i) => { const x = 40 + (i + (step % 12) / 12) * 90; return `<path d="M${x} 160 V${160 - c.amplitude / 0.012 * 125}" stroke="#174c45" stroke-width="12" stroke-linecap="round"/><text x="${x}" y="184" text-anchor="middle" font-size="13">${Math.round(c.frequency)}</text>`; }).join("")}
    <text x="310" y="208" text-anchor="middle" font-size="14">תדר בהרץ — כל מרווח שווה הוא אוקטבה</text><text x="70" y="22" font-size="14" text-anchor="middle">עוצמה יחסית</text>
  </svg>`;
}
export function mountIllusion(root) {
  let disposed = false, heard = false, answered = false, attempted = false;
  root.innerHTML = `<aside class="illusion-safety">האזינו בעוצמה נמוכה ונוחה. אם הצליל גורם לאי נוחות, הפסיקו מיד.</aside><div class="illusion-experiment"><span class="experiment-symbol" aria-hidden="true">∞</span><h2>האם הצליל ממשיך לעלות בלי סוף?</h2><p>האזינו לקטע קצר, ואז שתפו במה ששמעתם.</p><div class="completion-actions"><button class="button" data-play>השמע את האשליה</button><button class="secondary-button" data-stop disabled>עצור השמעה</button></div><p class="playback-status" role="status">מוכנים להקשיב?</p></div><p class="audio-error" role="alert"></p><section class="illusion-question" hidden><h2>מה הרגשתם בזמן ההאזנה?</h2><div class="scenario-options">${["הצליל המשיך לעלות", "הצליל המשיך לרדת", "הצליל נשאר באותו גובה"].map(text => `<button class="answer-button" data-perception>${text}</button>`).join("")}</div></section><section class="illusion-reveal" hidden><div class="answer-feedback feedback-correct" role="status"><strong>המוח שלנו מפרש את הצלילים כאילו הם עולים בלי סוף, אבל בפועל מדובר בתבנית שחוזרת על עצמה.</strong><p>ההתרשמות יכולה להשתנות בין מאזינים. זהו ניסוי בתפיסה, ואין כאן ציון.</p></div><h2>ממה מורכב הצליל?</h2><p>בכל רגע נשמעים יחד כמה צלילים במרווחי אוקטבה: התדר של כל רכיב כפול מזה שמתחתיו. הרכיבים עולים בצעדים קטנים; הגבוהים נחלשים, ונמוכים נכנסים בעדינות. העוצמה מרוכזת תמיד באזור האמצעי. אחרי 12 צעדים חוזרים לאותה תבנית, אך המוח יכול לשמוע המשך עלייה.</p><div class="spectrum"></div><label class="spectrum-control">בדקו את הרכיבים לאורך מחזור אחד<input type="range" min="0" max="12" value="0" step="1" data-spectrum><output>צעד 0 מתוך 12</output></label><p class="diagram-caption">העמודות מציגות רכיבים שנשמעים יחד. הגרף הוא הסבר סכמטי ואינו מד עוצמת ההאזנה.</p><div class="completion-actions"><a class="button" href="/lessons/2/exercises/3" data-link>המשך לתרגול הבא</a><a class="secondary-button" href="/lessons/2" data-link>חזרה לשיעור</a></div></section>`;
  const play = root.querySelector("[data-play]");
  const stop = root.querySelector("[data-stop]");
  const status = root.querySelector(".playback-status");
  const engine = new ShepardEngine(state => {
    if (disposed) return;
    const playing = state === "playing";
    play.disabled = playing;
    stop.disabled = !playing;
    root.querySelector(".experiment-symbol").classList.toggle("is-playing", playing);
    play.textContent = attempted ? "השמע שוב" : "השמע את האשליה";
    status.textContent = playing ? "מקשיבים… כ־8 שניות" : state === "ended" ? "הקטע הסתיים. מה שמעתם?" : "ההשמעה נעצרה. אפשר להאזין שוב כשתרצו.";
    if (state === "ended") { heard = true; root.querySelector(".illusion-question").hidden = false; }
  });
  const click = async event => {
    if (event.target.closest("[data-play]") && !play.disabled) {
      attempted = true; play.disabled = true;
      root.querySelector(".audio-error").textContent = "";
      try { await engine.play(); }
      catch {
        if (!disposed) {
          engine.stop();
          root.querySelector(".audio-error").textContent = "לא ניתן להשמיע כרגע. נסו שוב או השתמשו בדפדפן שתומך בשמע.";
        }
      }
    }
    if (event.target.closest("[data-stop]")) engine.stop();
    const choice = event.target.closest("[data-perception]");
    if (choice && heard && !answered) {
      answered = true;
      root.querySelectorAll("[data-perception]").forEach(button => { button.disabled = true; button.setAttribute("aria-pressed", String(button === choice)); });
      choice.classList.add("correct-answer");
      root.querySelector(".illusion-reveal").hidden = false;
      root.querySelector(".spectrum").innerHTML = spectrum(0);
    }
  };
  const input = event => {
    if (!event.target.matches("[data-spectrum]")) return;
    const step = Number(event.target.value);
    root.querySelector(".spectrum").innerHTML = spectrum(step);
    root.querySelector("output").textContent = `צעד ${step} מתוך 12${step === 12 ? " — חזרנו לאותה תבנית!" : ""}`;
  };
  const visibility = () => { if (document.hidden) engine.stop(); };
  const leave = () => engine.stop();
  root.addEventListener("click", click); root.addEventListener("input", input);
  document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", leave);
  return () => {
    disposed = true; engine.dispose();
    root.removeEventListener("click", click); root.removeEventListener("input", input);
    document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", leave);
  };
}
