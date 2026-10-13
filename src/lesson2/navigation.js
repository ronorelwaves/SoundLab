export const lessonPath = "/lessons/2";
export function completionActions(next, retry = "לנסות שוב") {
  return `<div class="completion-actions"><button class="secondary-button" data-retry>${retry}</button><a class="button" href="${next ? `${lessonPath}/exercises/${next}` : "/lessons"}" data-link>${next ? "המשך לתרגול הבא" : "סיום השיעור"}</a><a class="secondary-button" href="${lessonPath}" data-link>חזרה לשיעור</a></div>`;
}
