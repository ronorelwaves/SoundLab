import { pageLayout } from "../components.js";
import { createSound, loadMap, saveMap, MAP_PADDING } from "./model.js";
import { exportMixMap } from "./export.js";
import { mountMusicPlayer } from "./player.js";
import "./styles.css";

const suggestions = ["תוף רגל", "סנר", "היי־האט", "בס", "שירה מובילה", "קולות רקע", "סינתיסייזר", "כלי קשת", "גיטרה", "כלי הקשה", "אפקטים", "אחר"];
const depthNames = ["קרוב", "אמצע", "רחוק"];
const clamp = (value) => Math.max(0, Math.min(1, value));
const copy = (value) => JSON.parse(JSON.stringify(value));
const icon = (path) => `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${path}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const plus = icon("M12 5v14M5 12h14");
const download = icon("M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5");
const undoIcon = icon("M9 5 4 10l5 5M4 10h10a6 6 0 0 1 6 6v3");

export function renderMixMapLesson(app, path) {
  if (path !== "/lessons/3") return null;
  document.title = "מפת המיקס – Billie Jean | סאונד והגברה";
  app.innerHTML = pageLayout(`
    <nav class="mix-breadcrumb" aria-label="ניווט בשיעור"><a href="/lessons" data-link>חזרה לשיעורים</a><span aria-hidden="true">/</span><span>שיעור 3 · הקשבה ויצירה</span></nav>
    <section class="mix-studio" aria-labelledby="mix-title">
      <header class="mix-intro">
        <div><p class="mix-kicker"><span aria-hidden="true"></span>מעבדת הקשבה</p><h1 id="mix-title">מפת המיקס – <bdi>Billie Jean</bdi></h1><p class="mix-artist" lang="en" dir="ltr">Michael Jackson</p></div>
        <div class="mix-intro-copy"><p>האזינו לשיר, זהו את הכלים והצלילים שאתם שומעים, ומקמו אותם במרחב המיקס.</p><p class="mix-freedom">זו המפה שלכם. אפשר לנסות, להזיז ולשנות — אין תשובה אחת נכונה.</p></div>
      </header>
      <ol class="mix-steps"><li><span>01</span>האזינו לשיר.</li><li><span>02</span>הוסיפו צלילים ומקמו אותם במפה.</li><li><span>03</span>שמרו את מפת המיקס שלכם כתמונה.</li></ol>
      <div class="mix-workspace">
        <aside class="mix-listening" id="mix-listen" aria-label="האזנה לשיר"><div class="mix-panel-heading"><h2>מקשיבים מקרוב</h2><span aria-hidden="true">♫</span></div><div data-music-player></div><p class="mix-listening-tip">חזרו לקטע שמסקרן אתכם, והקשיבו בכל פעם לצליל אחר.</p><div class="mix-listening-hint"><span aria-hidden="true">◉</span><p>מומלץ להאזין באוזניות, בעוצמה נמוכה ונוחה.</p></div></aside>
        <section class="mix-desk" aria-labelledby="mix-map-title">
          <div class="mix-toolbar"><div class="mix-map-heading"><h2 id="mix-map-title">מרחב המיקס שלי</h2><output data-count>0 צלילים</output></div><div class="mix-tools"><button class="mix-add" data-add-sound>${plus}<span>הוסף צליל</span></button><button class="mix-icon-button" data-undo disabled aria-label="ביטול הפעולה האחרונה" title="ביטול הפעולה האחרונה">${undoIcon}</button><a href="#mix-listen" class="mix-listen-link">אל הנגן ↑</a></div></div>
          <div class="mix-map-surface"><div class="mix-frequency-axis" aria-label="גובה תדר נתפס"><span>גבוה</span><span>אמצע</span><span>נמוך</span></div><div class="mix-field" tabindex="0" role="group" aria-label="מפת המיקס. שמאל וימין הם כיווני הסטריאו; למעלה צלילים גבוהים ולמטה נמוכים." aria-describedby="mix-map-help"><div class="mix-center-line" aria-hidden="true"></div><div class="mix-empty" data-empty><div class="mix-empty-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><strong>מה אתם שומעים?</strong><p>הוסיפו את הצליל הראשון שלכם<br>וגררו אותו למקום שמתאים לו.</p></div></div><div class="mix-pan-axis" dir="ltr" aria-label="מיקום סטריאו"><span><b>L100</b> שמאל</span><span><b>C</b> מרכז</span><span><b>R100</b> ימין</span></div></div>
          <div class="mix-map-caption"><p id="mix-map-help">גרירה למיקום · לחיצה לעריכה · מקשי חצים לתנועה <span class="mix-shift-hint">(עם Shift לתנועה גדולה)</span></p><div class="mix-depth-key" aria-label="מקרא עומק"><span><i data-distance="0"></i>קרוב</span><span><i data-distance="1"></i>אמצע</span><span><i data-distance="2"></i>רחוק</span></div></div>
          <div class="mix-selection-row"><p>מפה של התחושה שלכם במיקס, לאורך השיר כולו.</p><select data-sound-select aria-label="בחרו צליל לעריכה"><option value="">בחירת צליל לעריכה</option></select></div>
          <section class="mix-sound-editor" data-sound-editor aria-label="עריכת הצליל" hidden>
            <div class="mix-editor-top"><h3>הצליל שבחרתם</h3><button class="mix-icon-button" data-deselect aria-label="סגירת עורך הצליל">×</button></div>
            <div class="mix-editor-grid"><label class="mix-label-control">שם הצליל<input type="text" data-label maxlength="48" list="mix-suggestions" autocomplete="off"><datalist id="mix-suggestions">${suggestions.map(label => `<option value="${label}"></option>`).join("")}</datalist></label><label>עומק <output data-depth-value>אמצע</output><input type="range" data-depth min="0" max="2" step="1" dir="ltr" aria-label="עומק הצליל"><span class="mix-range-labels"><span>קרוב</span><span>רחוק</span></span></label><label>גודל · נוכחות<input type="range" data-size min="48" max="128" step="1" dir="ltr" aria-label="גודל הצליל"><span class="mix-range-labels"><span>קטן</span><span>גדול</span></span></label><label class="mix-color-control">צבע<input type="color" data-color aria-label="צבע הצליל"></label></div>
            <div class="mix-editor-bottom"><label>כניסה משוערת <span>(רשות)</span><input type="text" data-entry maxlength="12" placeholder="למשל 0:30" dir="ltr" aria-label="זמן כניסה משוער"></label><p>הצעות השמות הן קיצורי דרך. אפשר לתת כל שם שתרצו.</p><button class="mix-delete" data-delete-sound>מחיקת הצליל</button></div>
          </section>
          <div class="mix-finish"><label class="mix-nickname">שם או כינוי <span>(רשות)</span><input type="text" data-nickname maxlength="48" placeholder="איך לחתום על המפה?" autocomplete="off"></label><button class="mix-export" data-export>${download}<span>שמור את מפת המיקס שלי</span></button></div>
          <div class="mix-save-row"><p class="mix-save-status" data-save-status role="status">המפה נשמרת אוטומטית בדפדפן הזה.</p><button class="mix-reset" data-reset>התחל מחדש</button></div><p class="mix-export-status" data-export-status role="status"></p>
        </section>
      </div>
    </section>`, "mix-lesson");
  const root = app.querySelector(".mix-lesson");
  return mountMixMap(root);
}

export function mountMixMap(root) {
  let state = loadMap();
  let selectedId = null;
  let drag = null;
  let editBefore = null;
  let disposed = false;
  const history = [];
  const field = root.querySelector(".mix-field");
  const editor = root.querySelector("[data-sound-editor]");
  const soundSelect = root.querySelector("[data-sound-select]");
  const undoButton = root.querySelector("[data-undo]");
  const nickname = root.querySelector("[data-nickname]");
  const nodes = new Map();
  const events = new AbortController();
  const { signal } = events;
  const selected = () => state.sounds.find(sound => sound.id === selectedId);
  const cleanupPlayer = mountMusicPlayer(root.querySelector("[data-music-player]"));

  function updateUndo() {
    undoButton.disabled = history.length === 0 && (!editBefore || JSON.stringify(editBefore) === JSON.stringify(state));
  }
  function persist() {
    const saved = saveMap(state);
    root.querySelector("[data-save-status]").textContent = saved
      ? "כל השינויים נשמרו בדפדפן הזה."
      : "השמירה בדפדפן אינה זמינה. שמרו תמונה לפני היציאה.";
    updateUndo();
  }
  function remember(before) {
    if (JSON.stringify(before) !== JSON.stringify(state)) {
      history.push(before);
      if (history.length > 60) history.shift();
    }
    updateUndo();
  }
  function finishEdit() {
    if (!editBefore) return;
    remember(editBefore);
    editBefore = null;
    updateUndo();
  }
  function placeNode(node, sound) {
    // Fixed padding allows every supported blob size to fit at the field edges.
    node.style.left = `${MAP_PADDING + sound.x * Math.max(0, field.clientWidth - MAP_PADDING * 2)}px`;
    node.style.top = `${MAP_PADDING + sound.y * Math.max(0, field.clientHeight - MAP_PADDING * 2)}px`;
    node.style.setProperty("--blob-size", `${sound.size}px`);
    node.style.setProperty("--blob-color", sound.color);
    node.dataset.depth = sound.depth;
    node.style.zIndex = sound.id === selectedId ? 20 : 4 - sound.depth;
    node.classList.toggle("is-selected", sound.id === selectedId);
    node.setAttribute("aria-pressed", String(sound.id === selectedId));
    const pan = Math.abs(sound.x - .5) < .01 ? "מרכז" : `${sound.x < .5 ? "שמאל" : "ימין"} ${Math.round(Math.abs(sound.x - .5) * 200)}`;
    const height = sound.y < 1 / 3 ? "גבוה" : sound.y > 2 / 3 ? "נמוך" : "אמצע";
    node.setAttribute("aria-label", `${sound.label}, ${pan}, גובה תדר ${height}, מיקום גובה ${Math.round((1 - sound.y) * 100)}, עומק ${depthNames[sound.depth]}`);
    node.querySelector(".mix-blob-label").textContent = sound.label;
    node.title = `${sound.label}${sound.entry ? ` · כניסה: ${sound.entry}` : ""}`;
  }
  function renderSounds() {
    const ids = new Set(state.sounds.map(sound => sound.id));
    for (const [id, node] of nodes) {
      if (!ids.has(id)) { node.remove(); nodes.delete(id); }
    }
    for (const sound of state.sounds) {
      let node = nodes.get(sound.id);
      if (!node) {
        node = document.createElement("button");
        node.type = "button";
        node.className = "mix-blob";
        node.dataset.soundId = sound.id;
        node.innerHTML = '<span class="mix-blob-shape" aria-hidden="true"></span><span class="mix-blob-label" dir="auto"></span>';
        field.append(node);
        nodes.set(sound.id, node);
      }
      placeNode(node, sound);
    }
    root.querySelector("[data-empty]").hidden = state.sounds.length > 0;
    root.querySelector("[data-count]").textContent = `${state.sounds.length} צלילים`;
    // Keep overlapping sounds reachable without requiring precise pointer input.
    soundSelect.replaceChildren(new Option("בחירת צליל לעריכה", ""), ...state.sounds.map((sound, i) => new Option(`${i + 1}. ${sound.label}`, sound.id)));
    soundSelect.value = selectedId || "";
    updateUndo();
  }
  function renderEditor() {
    const sound = selected();
    editor.hidden = !sound;
    if (!sound) return;
    editor.querySelector("[data-label]").value = sound.label;
    editor.querySelector("[data-depth]").value = sound.depth;
    editor.querySelector("[data-depth]").setAttribute("aria-valuetext", depthNames[sound.depth]);
    editor.querySelector("[data-depth-value]").textContent = depthNames[sound.depth];
    editor.querySelector("[data-size]").value = sound.size;
    editor.querySelector("[data-color]").value = sound.color;
    editor.querySelector("[data-entry]").value = sound.entry;
  }
  function select(id) {
    endDrag();
    finishEdit();
    selectedId = id;
    renderSounds();
    renderEditor();
  }
  function undo() {
    endDrag();
    finishEdit();
    if (!history.length) return;
    state = history.pop();
    if (!selected()) selectedId = null;
    nickname.value = state.nickname;
    renderSounds(); renderEditor(); persist();
  }
  function endDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    const activeDrag = drag;
    drag = null;
    activeDrag.node.classList.remove("is-dragging");
    if (activeDrag.node.hasPointerCapture(activeDrag.pointerId)) activeDrag.node.releasePointerCapture(activeDrag.pointerId);
    remember(activeDrag.before);
    persist();
  }

  root.addEventListener("click", async event => {
    const button = event.target.closest("button");
    if (!button) return;
    endDrag();
    if (button.matches("[data-add-sound]")) {
      finishEdit();
      const before = copy(state);
      const sound = createSound(state.sounds.length);
      // Small offsets keep successive new sounds easy to pick up near the center.
      sound.x = .5 + ((state.sounds.length % 3) - 1) * .05;
      sound.y = .5 + ((Math.floor(state.sounds.length / 3) % 3) - 1) * .05;
      state.sounds.push(sound);
      remember(before); select(sound.id); persist();
      const label = editor.querySelector("[data-label]");
      label.focus({ preventScroll: true }); label.select();
    } else if (button.matches(".mix-blob")) {
      if (button.dataset.soundId !== selectedId) select(button.dataset.soundId);
    } else if (button.matches("[data-delete-sound]")) {
      finishEdit();
      const before = copy(state);
      state.sounds = state.sounds.filter(sound => sound.id !== selectedId);
      remember(before); select(null); persist();
      root.querySelector("[data-add-sound]").focus({ preventScroll: true });
    } else if (button.matches("[data-deselect]")) {
      select(null); field.focus({ preventScroll: true });
    } else if (button.matches("[data-undo]")) {
      undo();
    } else if (button.matches("[data-reset]")) {
      if (!window.confirm("להתחיל מחדש? כל הצלילים והשם יימחקו מהמפה. אפשר לבטל את הפעולה אחר כך.")) return;
      finishEdit();
      const before = copy(state);
      state = { version: 1, nickname: "", sounds: [] };
      nickname.value = "";
      remember(before); select(null); persist();
    } else if (button.matches("[data-export]")) {
      finishEdit();
      const status = root.querySelector("[data-export-status]");
      button.disabled = true;
      status.textContent = "מכינים את התמונה שלכם…";
      try {
        await exportMixMap(copy(state));
        if (!disposed) status.textContent = "התמונה מוכנה. אפשר למצוא אותה בהורדות.";
      } catch {
        if (!disposed) status.textContent = "לא הצלחנו לשמור תמונה. נסו שוב בדפדפן מעודכן.";
      } finally { if (!disposed) button.disabled = false; }
    }
  }, { signal });
  root.addEventListener("focusin", event => {
    if (event.target.matches("[data-label], [data-depth], [data-size], [data-color], [data-entry], [data-nickname]")) {
      finishEdit();
      editBefore = copy(state);
    }
  }, { signal });
  root.addEventListener("input", event => {
    const input = event.target;
    if (input.matches("[data-nickname]")) {
      editBefore ||= copy(state);
      state.nickname = input.value;
      persist(); return;
    }
    const sound = selected();
    if (!sound || !input.closest("[data-sound-editor]")) return;
    editBefore ||= copy(state);
    if (input.matches("[data-label]")) sound.label = input.value.trim() || "צליל חדש";
    if (input.matches("[data-depth]")) {
      sound.depth = Number(input.value);
      input.setAttribute("aria-valuetext", depthNames[sound.depth]);
      editor.querySelector("[data-depth-value]").textContent = depthNames[sound.depth];
    }
    if (input.matches("[data-size]")) sound.size = Number(input.value);
    if (input.matches("[data-color]")) sound.color = input.value;
    if (input.matches("[data-entry]")) sound.entry = input.value;
    renderSounds(); persist();
  }, { signal });
  root.addEventListener("change", event => {
    if (event.target === soundSelect) { select(soundSelect.value || null); return; }
    finishEdit();
    if (event.target.matches("[data-label]") && selected()) event.target.value = selected().label;
  }, { signal });
  field.addEventListener("pointerdown", event => {
    const node = event.target.closest(".mix-blob");
    if (!node || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (drag) return;
    select(node.dataset.soundId);
    const sound = selected();
    drag = { pointerId: event.pointerId, node, before: copy(state), startX: event.clientX, startY: event.clientY, x: sound.x, y: sound.y, width: Math.max(1, field.clientWidth - MAP_PADDING * 2), height: Math.max(1, field.clientHeight - MAP_PADDING * 2) };
    node.focus({ preventScroll: true });
    node.setPointerCapture(event.pointerId);
    node.classList.add("is-dragging");
    event.preventDefault();
  }, { signal });
  field.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const sound = selected();
    if (!sound) { endDrag(); return; }
    sound.x = clamp(drag.x + (event.clientX - drag.startX) / drag.width);
    sound.y = clamp(drag.y + (event.clientY - drag.startY) / drag.height);
    placeNode(drag.node, sound);
  }, { signal });
  field.addEventListener("pointerup", endDrag, { signal });
  field.addEventListener("pointercancel", endDrag, { signal });
  field.addEventListener("lostpointercapture", endDrag, { signal });
  field.addEventListener("click", event => {
    if (!event.target.closest(".mix-blob")) select(null);
  }, { signal });
  root.addEventListener("keydown", event => {
    if (event.target.matches("input, select, textarea")) return;
    endDrag();
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault(); undo(); return;
    }
    const node = event.target.closest(".mix-blob");
    if (!node) return;
    if (event.key === "Escape") { select(null); field.focus(); return; }
    const movement = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!movement) return;
    event.preventDefault();
    if (selectedId !== node.dataset.soundId) select(node.dataset.soundId);
    finishEdit();
    const before = copy(state);
    const step = event.shiftKey ? .05 : .01;
    const sound = selected();
    sound.x = clamp(sound.x + movement[0] * step);
    sound.y = clamp(sound.y + movement[1] * step);
    remember(before); renderSounds(); persist();
  }, { signal });
  const observer = new ResizeObserver(() => renderSounds());
  observer.observe(field);
  window.addEventListener("pagehide", () => { endDrag(); persist(); }, { signal });
  document.addEventListener("visibilitychange", () => { if (document.hidden && drag) endDrag(); }, { signal });
  nickname.value = state.nickname;
  renderSounds(); renderEditor();
  return () => {
    endDrag();
    disposed = true;
    observer.disconnect();
    events.abort();
    cleanupPlayer();
  };
}
