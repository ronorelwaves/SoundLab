export function mountPresentationViewer(root, { slides, continueHref }) {
  let index = 0;
  let disposed = false;
  root.innerHTML = `<section class="presentation-viewer" aria-label="מצגת השיעור">
    <div class="slide-stage"><img class="slide-image" alt=""><p class="slide-error" role="status" hidden>לא ניתן לטעון את השקופית. נסו לרענן את העמוד.</p></div>
    <div class="slide-controls">
      <button class="secondary-button" data-slide="previous">השקופית הקודמת</button>
      <span class="slide-counter" aria-live="polite" dir="ltr"></span>
      <button class="secondary-button" data-slide="next">השקופית הבאה</button>
      <button class="secondary-button fullscreen-button" data-slide="fullscreen">מסך מלא</button>
      <a class="button slide-continue" href="${continueHref}" data-link hidden>המשך לתרגול</a>
    </div>
  </section>`;
  const viewer = root.querySelector(".presentation-viewer");
  const image = root.querySelector(".slide-image");
  const counter = root.querySelector(".slide-counter");
  const previous = root.querySelector('[data-slide="previous"]');
  const next = root.querySelector('[data-slide="next"]');
  const fullscreenButton = root.querySelector('[data-slide="fullscreen"]');
  const continueButton = root.querySelector(".slide-continue");
  const error = root.querySelector(".slide-error");

  function showSlide(nextIndex) {
    index = Math.max(0, Math.min(slides.length - 1, nextIndex));
    error.hidden = true;
    image.src = slides[index].src;
    image.alt = slides[index].alt;
    counter.textContent = `${index + 1} / ${slides.length}`;
    counter.setAttribute(
      "aria-label",
      `שקופית ${index + 1} מתוך ${slides.length}`,
    );
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    continueButton.hidden = index !== slides.length - 1;
  }

  function updateFullscreenLabel() {
    const expanded =
      document.fullscreenElement === viewer ||
      viewer.classList.contains("expanded");
    fullscreenButton.textContent = expanded ? "יציאה ממסך מלא" : "מסך מלא";
    fullscreenButton.setAttribute("aria-pressed", String(expanded));
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement === viewer) await document.exitFullscreen();
    else if (viewer.classList.contains("expanded"))
      viewer.classList.remove("expanded");
    else {
      try {
        if (!viewer.requestFullscreen)
          throw new Error("Fullscreen unavailable");
        await viewer.requestFullscreen();
        if (disposed && document.fullscreenElement === viewer)
          await document.exitFullscreen();
      } catch {
        // Mobile browsers without element fullscreen can still fill the viewport.
        if (!disposed) viewer.classList.add("expanded");
      }
    }
    updateFullscreenLabel();
  }

  const onClick = (event) => {
    const action = event.target.closest("[data-slide]")?.dataset.slide;
    if (action === "previous") showSlide(index - 1);
    if (action === "next") showSlide(index + 1);
    if (action === "fullscreen") void toggleFullscreen();
  };
  const onKey = (event) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
    )
      return;
    // In an RTL presentation the left arrow moves forward.
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showSlide(index + (event.key === "ArrowLeft" ? 1 : -1));
    }
    if (event.key === "Escape") {
      viewer.classList.remove("expanded");
      updateFullscreenLabel();
    }
  };
  image.onerror = () => {
    error.hidden = false;
  };
  root.addEventListener("click", onClick);
  document.addEventListener("keydown", onKey);
  document.addEventListener("fullscreenchange", updateFullscreenLabel);
  showSlide(0);

  return () => {
    disposed = true;
    root.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("fullscreenchange", updateFullscreenLabel);
    if (document.fullscreenElement === viewer)
      void document.exitFullscreen().catch(() => {});
  };
}
