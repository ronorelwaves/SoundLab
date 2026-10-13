import { arrow, pageLayout } from "../components.js";
import { mountPresentationViewer } from "../shared/presentation-viewer.js";
import { activities } from "./data.js";
import { slides } from "./slides.js";
import { mountJourney } from "./journey.js";
import { mountIllusion } from "./illusion.js";
import { mountScenarios } from "./scenarios.js";
import { lessonPath } from "./navigation.js";

function navigation(current) {
  return `<nav class="activity-navigation" aria-label="פעילויות השיעור"><a href="${lessonPath}" data-link>חזרה לשיעור</a>${activities.map((activity, i) => `<a href="${lessonPath}/${activity.slug}" data-link ${i === current ? 'aria-current="page"' : ""}>${i ? `תרגול ${i}` : "מצגת"}</a>`).join("")}<a href="/lessons" data-link>חזרה לשיעורים</a></nav>`;
}
export function renderLesson2(app, path) {
  if (path === lessonPath) {
    app.innerHTML = pageLayout(`<a class="text-link" href="/lessons" data-link>חזרה לשיעורים</a><div class="page-heading"><span class="heading-line" aria-hidden="true"></span><h1>שיעור 2 – האוזן האנושית והשמיעה</h1></div><p class="lesson2-flow">מומלץ להתחיל במצגת ולהמשיך בתרגולים לפי הסדר. כל פעילות פתוחה גם בנפרד.</p><div class="activity-grid">${activities.map((activity, i) => `<a class="activity-card" href="${lessonPath}/${activity.slug}" data-link><span class="activity-number" aria-hidden="true">0${i + 1}</span><h2>${i ? `תרגול ${i} – ` : ""}${activity.title}</h2><span class="circle-arrow">${arrow}</span></a>`).join("")}</div>`, "inner-page lesson-page lesson2");
    document.title = "שיעור 2 – האוזן האנושית והשמיעה | סאונד והגברה";
    return () => {};
  }
  const current = activities.findIndex(activity => path === `${lessonPath}/${activity.slug}`);
  if (current < 0) return null;
  document.title = `${activities[current].title} – שיעור 2 | סאונד והגברה`;
  if (current === 0) {
    app.innerHTML = pageLayout(`${navigation(0)}<h1 class="presentation-title">שיעור 2 – האוזן האנושית והשמיעה</h1><div id="presentation"></div>`, "presentation-page lesson2");
    return mountPresentationViewer(app.querySelector("#presentation"), { slides, continueHref: `${lessonPath}/exercises/1` });
  }
  app.innerHTML = pageLayout(`${navigation(current)}<section class="exercise-page"><div class="exercise-heading"><span class="eyebrow">תרגול ${current}</span><h1>${activities[current].title}</h1><p>${activities[current].instruction}</p></div><div id="exercise" class="exercise-panel"></div></section>`, "lesson-activity-page lesson2");
  return [null, mountJourney, mountIllusion, mountScenarios][current](app.querySelector("#exercise"));
}
