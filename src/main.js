import "@fontsource/heebo/hebrew-400.css";
import "@fontsource/heebo/hebrew-500.css";
import "@fontsource/heebo/hebrew-700.css";
import "./styles.css";
import "./lesson1/styles.css";
import { lessons } from "./data/lessons.js";
import { welcomePage, lessonsPage, lessonPage } from "./pages.js";
import { renderLesson1 } from "./lesson1/index.js";

const app = document.querySelector("#app");
let cleanup = () => {};

function render(moveFocus = false) {
  cleanup();
  cleanup = () => {};
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const lesson = lessons.find((item) => path === `/lessons/${item.id}`);
  const lessonCleanup = path.startsWith("/lessons/1")
    ? renderLesson1(app, path)
    : null;
  if (lessonCleanup) {
    cleanup = lessonCleanup;
  } else if (path === "/") {
    app.innerHTML = welcomePage();
    document.title = "סאונד והגברה";
  } else if (lesson) {
    app.innerHTML = lessonPage(lesson);
    document.title = `${lesson.label} – ${lesson.title} | סאונד והגברה`;
  } else {
    app.innerHTML = lessonsPage();
    document.title = "השיעורים שלנו | סאונד והגברה";
  }
  if (moveFocus) {
    document.querySelector("main").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-link]");
  if (
    !link ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  if (window.location.pathname !== link.pathname)
    history.pushState({}, "", link.pathname);
  render(true);
});

window.addEventListener("popstate", () => render(true));
render();
