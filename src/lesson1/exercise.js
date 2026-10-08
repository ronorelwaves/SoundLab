import { ToneEngine } from "../audio/tone-engine.js";
import { generateQuestions } from "./questions.js";
import { exercisePath, lessonPath } from "./overview.js";

const SAFETY_KEY = "sound-lab-hearing-reminder";
let acknowledged = false;
function safetyAcknowledged() {
  try {
    return acknowledged || sessionStorage.getItem(SAFETY_KEY) === "yes";
  } catch {
    return acknowledged;
  }
}

const playIcon =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 10 7-10 7V5Z" fill="currentColor"/></svg>';

export function mountExercise(root, exerciseId) {
  let questions;
  let questionIndex = 0;
  let score = 0;
  let answered = false;
  let heard = new Set();
  let disposed = false;
  let playbackRequest = 0;
  const engine = new ToneEngine((playing) => {
    if (!playing)
      root.querySelectorAll(".tone-button").forEach((button) => {
        button.classList.remove("is-playing");
        button.setAttribute("aria-pressed", "false");
        button.querySelector(".play-state").textContent = "לחצו להשמעה";
      });
  });

  function focusStage() {
    root.querySelector("[data-stage-heading]")?.focus({ preventScroll: true });
  }

  function start() {
    void engine.stop();
    playbackRequest++;
    questions = generateQuestions(exerciseId);
    questionIndex = 0;
    score = 0;
    showQuestion();
  }

  function showQuestion() {
    answered = false;
    heard = new Set();
    const question = questions[questionIndex];
    root.innerHTML = `<div class="question-progress"><h2 data-stage-heading tabindex="-1">שאלה ${questionIndex + 1} מתוך ${questions.length}</h2><span class="score">${score} תשובות נכונות</span></div>
      <div class="progress-track" aria-hidden="true"><span style="width:${(questionIndex / questions.length) * 100}%"></span></div>
      <div class="tone-controls ${question.tones.length === 2 ? "two-tones" : ""}">
        ${question.tones
          .map(
            (
              _,
              index,
            ) => `<button class="tone-button" data-play="${index}" aria-pressed="false">
          <span class="play-icon">${playIcon}</span><span class="tone-label">${question.tones.length === 1 ? "השמע צליל" : index === 0 ? "צליל א׳" : "צליל ב׳"}</span><span class="play-state">לחצו להשמעה</span>
        </button>`,
          )
          .join("")}
      </div>
      <p class="listen-hint">${question.tones.length === 2 ? "הקשיבו לשני הצלילים לפני הבחירה. אפשר להקשיב שוב בכל שלב." : "הקשיבו לצליל לפני הבחירה. אפשר להקשיב שוב בכל שלב."}</p>
      <p class="audio-error" role="status"></p>
      <div class="answer-options" role="group" aria-label="בחירת תשובה">${question.choices.map((choice) => `<button class="answer-button" data-answer="${choice.id}" disabled>${choice.label}</button>`).join("")}</div>
      <div class="answer-feedback" role="status" aria-live="polite"></div>
      <button class="button next-question" data-action="next" hidden>השאלה הבאה</button>`;
    focusStage();
  }

  async function play(index) {
    if (!questions || !questions[questionIndex]) return;
    const request = ++playbackRequest;
    const button = root.querySelector(`[data-play="${index}"]`);
    root.querySelector(".audio-error").textContent = "";
    try {
      const started = await engine.play(questions[questionIndex].tones[index]);
      if (!started || disposed || request !== playbackRequest) return;
      heard.add(index);
      button.classList.add("is-playing");
      button.setAttribute("aria-pressed", "true");
      button.querySelector(".play-state").textContent = "הצליל מתנגן";
      if (!answered && heard.size === questions[questionIndex].tones.length) {
        root.querySelectorAll("[data-answer]").forEach((answer) => {
          answer.disabled = false;
        });
      }
    } catch {
      if (!disposed && request === playbackRequest) {
        root.querySelector(".audio-error").textContent =
          "לא ניתן להשמיע כרגע. נסו ללחוץ שוב על כפתור ההשמעה או לפתוח את התרגול בדפדפן מעודכן.";
      }
    }
  }

  function answer(id) {
    const question = questions?.[questionIndex];
    if (!question || answered || heard.size !== question.tones.length) return;
    if (!question.choices.some((choice) => choice.id === id)) return;
    answered = true;
    playbackRequest++;
    void engine.stop();
    const correct = id === question.answer;
    if (correct) score++;
    root.querySelector(".score").textContent = `${score} תשובות נכונות`;
    root.querySelectorAll("[data-answer]").forEach((button) => {
      button.disabled = true;
      if (button.dataset.answer === question.answer)
        button.classList.add("correct-answer");
      else if (button.dataset.answer === id)
        button.classList.add("chosen-answer");
    });
    const feedback = root.querySelector(".answer-feedback");
    feedback.classList.add(correct ? "feedback-correct" : "feedback-learning");
    feedback.innerHTML = `<strong>${correct ? "נכון!" : "לא הפעם, ממשיכים ללמוד."}</strong><p>${question.explanation}</p>`;
    const next = root.querySelector('[data-action="next"]');
    next.hidden = false;
    if (questionIndex === questions.length - 1)
      next.textContent = "סיום התרגול";
    next.focus({ preventScroll: true });
  }

  function complete() {
    root.innerHTML = `<section class="exercise-completion">
      <span class="completion-symbol" aria-hidden="true">✓</span>
      <h2 data-stage-heading tabindex="-1">סיימתם את התרגול!</h2>
      <p class="result">זיהיתם נכון ${score} מתוך ${questions.length} שאלות.</p>
      <p>כל הקשבה היא הזדמנות ללמוד. אפשר לחזור ולתרגל בקצב שלכם.</p>
      <div class="completion-actions">
        ${exerciseId < 3 ? `<a class="button" href="${exercisePath(exerciseId + 1)}" data-link>המשך לתרגול הבא</a>` : '<a class="button" href="/lessons" data-link>סיום השיעור</a>'}
        <button class="secondary-button" data-action="restart">תרגול חוזר</button>
        <a class="secondary-button" href="${lessonPath}" data-link>חזרה לשיעור</a>
      </div></section>`;
    focusStage();
  }

  const onClick = (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.dataset.play !== undefined)
      void play(Number(button.dataset.play));
    if (button.dataset.answer !== undefined) answer(button.dataset.answer);
    if (button.dataset.action === "ready") {
      acknowledged = true;
      try {
        sessionStorage.setItem(SAFETY_KEY, "yes");
      } catch {
        /* In-memory acknowledgement still works. */
      }
      start();
    }
    if (button.dataset.action === "restart") start();
    if (button.dataset.action === "next" && answered) {
      playbackRequest++;
      void engine.stop();
      questionIndex++;
      if (questionIndex === questions.length) complete();
      else showQuestion();
    }
  };
  const stopWhenHidden = () => {
    if (document.hidden) {
      playbackRequest++;
      void engine.stop();
    }
  };
  const stopOnPageHide = () => {
    playbackRequest++;
    void engine.stop();
  };
  root.addEventListener("click", onClick);
  document.addEventListener("visibilitychange", stopWhenHidden);
  window.addEventListener("pagehide", stopOnPageHide);
  if (safetyAcknowledged()) start();
  else
    root.innerHTML = `<section class="exercise-safety"><span class="safety-symbol" aria-hidden="true">♪</span><h2 data-stage-heading tabindex="-1">לפני שמתחילים</h2>
    <p>השתמשו באוזניות ובעוצמה נמוכה. אם הצליל חלש, הגבירו בזהירות. אם אתם מרגישים אי נוחות, הפסיקו מיד.</p>
    <button class="button" data-action="ready">אני מוכן/ה – מתחילים</button></section>`;

  return () => {
    disposed = true;
    playbackRequest++;
    root.removeEventListener("click", onClick);
    document.removeEventListener("visibilitychange", stopWhenHidden);
    window.removeEventListener("pagehide", stopOnPageHide);
    void engine.dispose().catch(() => {});
  };
}
