import { test, expect } from "@playwright/test";

test("lesson 2 discovery, all original slides, keyboard, fullscreen and history", async ({ page }) => {
  await page.goto("/lessons");
  await expect(page.locator(".lesson-card")).toHaveCount(2);
  await page.locator('.lesson-card[href="/lessons/2"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("שיעור 2 – האוזן האנושית והשמיעה");
  await expect(page.locator(".activity-card")).toHaveCount(4);
  await page.getByRole("link", { name: "צפייה במצגת" }).click();
  for (let i = 1; i <= 9; i++) {
    await expect(page.locator(".slide-counter")).toHaveText(`${i} / 9`);
    await expect(page.locator(".slide-image")).toHaveAttribute("src", new RegExp(`/${i}_`));
    await expect.poll(() => page.locator(".slide-image").evaluate(img => img.complete && img.naturalWidth > 0)).toBeTruthy();
    if (i < 9) await page.keyboard.press("ArrowLeft");
  }
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".slide-counter")).toHaveText("8 / 9");
  await page.getByRole("button", { name: "השקופית הבאה" }).click();
  await page.getByRole("button", { name: "מסך מלא", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBeTruthy();
  await page.getByRole("button", { name: "יציאה ממסך מלא" }).click();
  await page.getByRole("link", { name: "המשך לתרגול", exact: true }).click();
  await expect(page).toHaveURL("/lessons/2/exercises/1");
  await page.goBack();
  await expect(page.locator(".slide-image")).toBeVisible();
  await page.goForward();
  await expect(page.locator(".ear-diagram")).toBeVisible();
});

test("anatomical order, gentle retry, keyboard selection, completion and restart", async ({ page }, info) => {
  await page.goto("/lessons/2/exercises/1");
  await page.locator('button[data-part="3"]').click();
  await expect(page.locator(".journey-progress")).toHaveText("0 מתוך 6 תחנות");
  for (let i = 0; i < 6; i++) {
    const part = page.locator(`g[data-part="${i}"]`);
    await part.focus(); await page.keyboard.press(i % 2 ? "Space" : "Enter");
    await expect(part).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".journey-sequence li")).toHaveCount(i + 1);
    if (i === 1) {
      await page.locator('button[data-part="4"]').click();
      await expect(page.locator(".journey-sequence li")).toHaveCount(2);
    }
  }
  await expect(page.locator(".journey-sequence li")).toHaveText(["אפרכסת", "תעלת השמע", "עור התוף", "עצמות השמע", "שבלול", "עצב השמיעה"]);
  await expect(page.locator(".journey-completion")).toBeVisible();
  await page.screenshot({ path: info.outputPath("journey.png"), fullPage: true });
  await page.getByRole("button", { name: "לנסות שוב" }).click();
  await expect(page.locator(".journey-progress")).toHaveText("0 מתוך 6 תחנות");
  await expect(page.locator(".journey-completion")).toBeHidden();
});

async function observeShepard(page) {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    window.shepardCheck = { contexts: [], starts: 0, active: 0 };
    window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.shepardCheck.contexts.push(this); }
      createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        const stop = source.stop.bind(source);
        let released = false;
        const release = () => { if (!released) { released = true; window.shepardCheck.active--; } };
        source.start = (...args) => { window.shepardCheck.starts++; window.shepardCheck.active++; return start(...args); };
        // Closing a context can suppress the asynchronous ended event. Track
        // explicit stops as well as natural completion, without double counting.
        source.stop = (...args) => { const result = stop(...args); release(); return result; };
        source.addEventListener("ended", release);
        const connect = source.connect.bind(source);
        source.connect = (...args) => {
          const result = connect(...args);
          if (args[0] === this.destination) { this.analyser = this.createAnalyser(); connect(this.analyser); }
          return result;
        };
        return source;
      }
    };
  });
}

test("illusion plays actual quiet PCM, reveals only after answer, replay, stop and navigation release audio", async ({ page }, info) => {
  await observeShepard(page);
  await page.goto("/lessons/2/exercises/2");
  expect(await page.evaluate(() => window.shepardCheck.contexts.length)).toBe(0);
  await expect(page.locator(".illusion-reveal")).toBeHidden();
  await expect(page.locator(".illusion-question")).toBeHidden();
  await page.locator("[data-play]").click();
  await expect.poll(() => page.evaluate(() => {
    const a = window.shepardCheck.contexts[0]?.analyser;
    if (!a) return 0;
    const data = new Float32Array(a.fftSize); a.getFloatTimeDomainData(data);
    return Math.max(...data.map(Math.abs));
  })).toBeGreaterThan(.01);
  await expect(page.locator(".illusion-question")).toBeVisible({ timeout: 12000 });
  await expect(page.locator(".illusion-reveal")).toBeHidden();
  await page.getByRole("button", { name: "הצליל המשיך לרדת" }).click();
  await expect(page.locator(".illusion-reveal")).toBeVisible();
  await page.locator("[data-spectrum]").fill("12");
  await expect(page.locator("output")).toContainText("חזרנו לאותה תבנית");
  await page.screenshot({ path: info.outputPath("illusion.png"), fullPage: true });
  await page.getByRole("button", { name: "השמע שוב" }).click();
  await page.getByRole("button", { name: "עצור השמעה" }).click();
  await expect.poll(() => page.evaluate(() => window.shepardCheck.active)).toBe(0);
  await page.locator("[data-play]").click();
  await page.getByRole("link", { name: "המשך לתרגול הבא" }).click();
  await expect.poll(() => page.evaluate(() => window.shepardCheck.contexts.every(c => c.state === "closed"))).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.shepardCheck.active)).toBe(0);
  await page.goBack();
  await expect(page.locator(".illusion-reveal")).toBeHidden();
  expect(await page.evaluate(() => window.shepardCheck.starts)).toBe(3);
  await page.locator("[data-play]").click();
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => page.evaluate(() => window.shepardCheck.active)).toBe(0);
  await expect(page.locator(".illusion-question")).toBeHidden();
});

test("all five scenarios, feedback, single score per decision, replay and finish", async ({ page }, info) => {
  await page.goto("/lessons/2/exercises/3");
  const answers = [1, 2, 0, 1, 1];
  for (let i = 0; i < 5; i++) {
    await expect(page.locator(".question-progress")).toContainText(`מצב ${i + 1} מתוך 5`);
    await page.locator(`[data-answer="${i === 0 ? 0 : answers[i]}"]`).click();
    await expect(page.locator(".answer-feedback")).toContainText(i === 0 ? "לא הפעם" : "נכון!");
    await expect(page.locator(`[data-answer="${answers[i]}"]`)).toHaveClass(/correct-answer/);
    await page.locator(`[data-answer="${answers[i]}"]`).evaluate(button => button.click());
    if (i === 0) await page.screenshot({ path: info.outputPath("scenario.png"), fullPage: true });
    await page.locator("[data-next]").click();
  }
  await expect(page.locator(".result")).toHaveText("4 מתוך 5 בחירות בטוחות");
  await page.getByRole("button", { name: "תרגול חוזר" }).click();
  for (const answer of answers) {
    await page.locator(`[data-answer="${answer}"]`).click();
    await page.locator("[data-next]").click();
  }
  await expect(page.locator(".result")).toHaveText("5 מתוך 5 בחירות בטוחות");
  await page.getByRole("link", { name: "סיום השיעור" }).click();
  await expect(page).toHaveURL("/lessons");
});

test("independent activities, Hebrew RTL responsive layouts and audio failure", async ({ page }, info) => {
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  for (const route of ["", "/presentation", "/exercises/1", "/exercises/2", "/exercises/3"]) {
    await page.goto(`/lessons/2${route}`);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator("main").evaluate(el => getComputedStyle(el).direction)).toBe("rtl");
      if (width === 390) await page.screenshot({ path: info.outputPath(`mobile-${route.replaceAll("/", "-") || "overview"}.png`), fullPage: true });
    }
    await page.getByRole("link", { name: "חזרה לשיעורים", exact: true }).click();
    await expect(page).toHaveURL("/lessons");
  }
  await page.goto("/lessons/2/exercises/2");
  await page.evaluate(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
  await page.locator("[data-play]").click();
  await expect(page.locator(".audio-error")).toContainText("לא ניתן להשמיע כרגע");
  await expect(page.locator(".illusion-question")).toBeHidden();
  await expect(page.locator("[data-play]")).toBeEnabled();
  expect(errors).toEqual([]);
});
