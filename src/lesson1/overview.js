import { arrow, pageLayout } from "../components.js";
import { exercises } from "./questions.js";

export const lessonPath = "/lessons/1";
export const exercisePath = (id) => `${lessonPath}/exercises/${id}`;

export function activityNavigation(current) {
  return `<nav class="activity-navigation" aria-label="פעילויות השיעור">
    <a href="${lessonPath}" data-link>חזרה לשיעור</a>
    <a href="${lessonPath}/presentation" data-link ${current === "presentation" ? 'aria-current="page"' : ""}>מצגת</a>
    ${Object.keys(exercises)
      .map(
        (id) =>
          `<a href="${exercisePath(id)}" data-link ${String(current) === id ? 'aria-current="page"' : ""}>תרגול ${id}</a>`,
      )
      .join("")}
  </nav>`;
}

export function lessonOverview() {
  const activities = [
    { href: `${lessonPath}/presentation`, label: "צפייה במצגת" },
    ...Object.entries(exercises).map(([id, exercise]) => ({
      href: exercisePath(id),
      label: `תרגול ${id} – ${exercise.title}`,
    })),
  ];
  return pageLayout(
    `<a class="text-link" href="/lessons" data-link>חזרה לשיעורים</a>
    <div class="page-heading"><span class="heading-line" aria-hidden="true"></span><h1>שיעור 1 – מה זה קול?</h1></div>
    <div class="activity-grid">${activities
      .map(
        (
          activity,
          index,
        ) => `<a class="activity-card" href="${activity.href}" data-link>
      <span class="activity-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
      <h2>${activity.label}</h2><span class="circle-arrow">${arrow}</span>
    </a>`,
      )
      .join("")}</div>`,
    "inner-page lesson-page",
  );
}
