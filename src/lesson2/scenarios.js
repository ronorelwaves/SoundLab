import { scenarios } from "./data.js";
import { completionActions } from "./navigation.js";

export function mountScenarios(root) {
  let index = 0, score = 0, answered = false;
  function render(focus = false) {
    answered = false;
    if (index === scenarios.length) {
      root.innerHTML = `<section class="exercise-completion"><h2 tabindex="-1">סיימתם! עכשיו אתם יודעים איך לשמור טוב יותר על השמיעה שלכם.</h2><p class="result">${score} מתוך 5 בחירות בטוחות</p>${completionActions(null, "תרגול חוזר")}</section>`;
    } else {
      const scenario = scenarios[index];
      root.innerHTML = `<div class="question-progress"><span>מצב ${index + 1} מתוך 5</span><span class="eyebrow">${scenario.title}</span></div><div class="progress-track" aria-hidden="true"><span style="width:${index / scenarios.length * 100}%"></span></div><h2 class="scenario-question" tabindex="-1">${scenario.question}</h2><div class="scenario-options">${scenario.answers.map((answer, i) => `<button class="answer-button" data-answer="${i}">${answer}</button>`).join("")}</div><div class="answer-feedback" role="status"></div><button class="button next-question" data-next hidden>${index === scenarios.length - 1 ? "לסיכום התרגול" : "למצב הבא"}</button>`;
    }
    if (focus) root.querySelector("h2").focus({ preventScroll: true });
  }
  const click = event => {
    const answer = event.target.closest("[data-answer]");
    if (answer && !answered) {
      answered = true;
      const scenario = scenarios[index];
      const correct = Number(answer.dataset.answer) === scenario.correct;
      if (correct) score++;
      root.querySelectorAll("[data-answer]").forEach(button => {
        button.disabled = true;
        if (Number(button.dataset.answer) === scenario.correct) button.classList.add("correct-answer");
      });
      if (!correct) answer.classList.add("chosen-answer");
      const feedback = root.querySelector(".answer-feedback");
      feedback.className = `answer-feedback ${correct ? "feedback-correct" : "feedback-learning"}`;
      feedback.innerHTML = `<strong>${correct ? "נכון! זו הבחירה הבטוחה." : "לא הפעם. אפשר ללמוד מהמצב הזה."}</strong>${correct ? "" : `<p>הבחירה הבטוחה: ${scenario.answers[scenario.correct]}</p>`}<p>${scenario.explanation}</p>`;
      root.querySelector("[data-next]").hidden = false;
    }
    if (event.target.closest("[data-next]") && answered) { index++; render(true); }
    if (event.target.closest("[data-retry]")) { index = 0; score = 0; render(true); }
  };
  render(); root.addEventListener("click", click);
  return () => root.removeEventListener("click", click);
}
