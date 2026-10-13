import { structures } from "./data.js";
import { completionActions } from "./navigation.js";

// Simplified cross-section: canal ends at the tympanic membrane; the three
// ossicles bridge it to the oval window. The cochlear nerve exits toward the brain.
// This omits the vestibular system and Eustachian tube, not part of this pathway.
const shapes = [
  '<path d="M178 180 C160 150 178 108 159 73 C140 30 75 37 65 85 C52 129 66 183 89 227 C105 258 99 296 125 302 C162 312 176 269 165 241 L148 203 Z"/><path class="detail" d="M148 89 C103 61 81 113 105 149 C117 165 139 139 143 165 M131 185 C99 179 107 216 135 229"/>',
  '<path d="M163 171 C220 154 264 172 327 161 L342 214 C275 207 226 219 160 205 Z"/>',
  '<ellipse cx="335" cy="188" rx="12" ry="32" transform="rotate(-15 335 188)"/>',
  '<path d="M341 184 L354 133 Q348 116 362 115 Q379 120 367 134 L397 132 L413 156"/><path d="M413 156 L438 147 L441 177 Z"/><path class="detail" d="M441 148 L444 177"/>',
  '<path d="M444 161 C458 149 476 153 487 167 C520 133 571 152 577 199 C585 243 548 272 509 260 C467 249 474 211 490 193 C507 174 546 181 549 209 C553 233 523 245 510 226 C500 211 519 197 531 211"/>',
  '<path d="M550 242 Q585 223 638 202 L642 221 Q594 246 562 259 Z"/><path class="detail" d="M561 245 L637 212 M566 252 L640 219"/>',
];
const labelPositions = [[114, 333], [244, 272], [333, 92], [403, 67], [522, 310], [620, 283]];
const segments = ["M25 190 L125 190", "M125 190 L265 190", "M265 190 L335 188", "M335 188 L361 127 L398 132 L436 162", "M436 162 Q468 164 488 180 Q554 153 565 206 Q573 248 534 251 Q490 251 493 215 Q493 188 522 195 Q547 203 533 221", "M533 221 L555 249 L642 212 L683 199"];
function diagram() {
  return `<svg class="ear-diagram" viewBox="0 0 740 355" aria-label="חתך סכמטי באוזן: מהאפרכסת בצד שמאל עד לעצב השמיעה ולמוח בצד ימין">
    <rect x="30" y="26" width="300" height="290" rx="28" fill="#f1f3e9"/><rect x="330" y="26" width="116" height="290" rx="20" fill="#f8f0e4"/><rect x="446" y="26" width="264" height="290" rx="28" fill="#ecf2ef"/>
    <g class="ear-region-labels"><text x="190" y="20">אוזן חיצונית</text><text x="387" y="20">תיכונה</text><text x="559" y="20">פנימית</text></g>
    <path class="ear-brain" d="M661 167 C640 151 652 120 675 125 C684 99 717 113 718 134 C744 145 728 176 731 192 C744 217 719 242 699 229 C674 245 650 225 657 207 C636 197 643 180 661 167 Z"/><text class="ear-label" x="693" y="184">המוח</text>
    ${structures.map((s, i) => `<g class="ear-part" data-part="${i}" role="button" tabindex="0" aria-label="${s.name}" aria-pressed="false">${shapes[i]}<text class="ear-label" x="${labelPositions[i][0]}" y="${labelPositions[i][1]}">${s.name}</text></g>`).join("")}
    <g class="ear-wave" aria-hidden="true">${segments.map((d, i) => `<path data-segment="${i}" d="${d}" pathLength="100"/>`).join("")}</g>
  </svg>`;
}
export function mountJourney(root) {
  let step = 0;
  function reset() {
    step = 0;
    root.innerHTML = `<p class="journey-progress" aria-live="polite">0 מתוך 6 תחנות</p>${diagram()}<p class="diagram-caption">איור סכמטי, לא בקנה מידה. גלי קול באוויר הופכים לרטט מכני, ובשבלול לאותות חשמליים.</p><div class="structure-options">${[4, 1, 5, 0, 3, 2].map(i => `<button class="secondary-button" data-part="${i}" aria-pressed="false">${structures[i].name}</button>`).join("")}</div><div class="answer-feedback feedback-learning" role="status">איפה מתחיל המסע של גל הקול?</div><ol class="journey-sequence" aria-label="המסלול שבניתם"></ol><div class="journey-completion" hidden><h2>כל הכבוד! עקבתם אחרי המסלול של גל הקול מהאוויר ועד למוח.</h2>${completionActions(2)}</div>`;
  }
  function select(index) {
    if (index < step || step === structures.length) return;
    const feedback = root.querySelector(".answer-feedback");
    root.querySelectorAll(".try-again").forEach(el => el.classList.remove("try-again"));
    if (index !== step) {
      feedback.className = "answer-feedback feedback-learning";
      feedback.textContent = "עוד ניסיון קטן: חשבו לאן הקול מגיע עכשיו. המסלול שכבר בניתם נשמר.";
      root.querySelectorAll(`[data-part="${index}"]`).forEach(el => el.classList.add("try-again"));
      return;
    }
    root.querySelectorAll(`[data-part="${index}"]`).forEach(el => {
      el.classList.add("selected-part"); el.setAttribute("aria-pressed", "true");
    });
    root.querySelector(`[data-segment="${index}"]`).classList.add("wave-active");
    feedback.className = "answer-feedback feedback-correct";
    feedback.innerHTML = `<strong>${structures[index].name}</strong><p>${structures[index].explanation}</p>`;
    root.querySelector(".journey-sequence").insertAdjacentHTML("beforeend", `<li>${structures[index].name}</li>`);
    step++;
    root.querySelector(".journey-progress").textContent = `${step} מתוך 6 תחנות`;
    if (step === structures.length) {
      root.querySelector(".journey-completion").hidden = false;
      root.querySelector(".ear-wave").classList.add("complete-path");
    }
  }
  const click = event => {
    if (event.target.closest("[data-retry]")) { reset(); root.querySelector("[data-part]").focus(); }
    const part = event.target.closest("[data-part]");
    if (part) select(Number(part.dataset.part));
  };
  const key = event => {
    if (event.target.matches("g[data-part]") && ["Enter", " "].includes(event.key)) {
      event.preventDefault(); select(Number(event.target.dataset.part));
    }
  };
  reset(); root.addEventListener("click", click); root.addEventListener("keydown", key);
  return () => { root.removeEventListener("click", click); root.removeEventListener("keydown", key); };
}
