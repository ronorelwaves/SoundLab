import { pageLayout } from "../components.js";
import { mountPresentationViewer } from "../shared/presentation-viewer.js";
import { mountExercise } from "./exercise.js";
import { exercises } from "./questions.js";
import { slides } from "./slides.js";
import {
  activityNavigation,
  exercisePath,
  lessonOverview,
  lessonPath,
} from "./overview.js";

export function renderLesson1(app, path) {
  if (path === lessonPath) {
    app.innerHTML = lessonOverview();
    document.title = "שיעור 1 – מה זה קול? | סאונד והגברה";
    return () => {};
  }
  if (path === `${lessonPath}/presentation`) {
    app.innerHTML = pageLayout(
      `${activityNavigation("presentation")}<h1 class="presentation-title">שיעור 1 – מה זה קול?</h1><div id="presentation"></div>`,
      "presentation-page",
    );
    document.title = "מצגת – מה זה קול? | סאונד והגברה";
    return mountPresentationViewer(app.querySelector("#presentation"), {
      slides,
      continueHref: exercisePath(1),
    });
  }
  const match = path.match(/^\/lessons\/1\/exercises\/([123])$/);
  if (!match) return null;
  const id = Number(match[1]);
  const exercise = exercises[id];
  app.innerHTML = pageLayout(
    `${activityNavigation(id)}<section class="exercise-page"><div class="exercise-heading"><span class="eyebrow">תרגול ${id}</span><h1>${exercise.title}</h1><p>${exercise.instruction}</p></div><div id="exercise" class="exercise-panel"></div></section>`,
    "lesson-activity-page",
  );
  document.title = `${exercise.title} | סאונד והגברה`;
  return mountExercise(app.querySelector("#exercise"), id);
}
