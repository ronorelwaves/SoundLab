import { test, expect } from "@playwright/test";

async function observeAudio(page) {
  await page.addInitScript(() => {
    const NativeAudioContext = window.AudioContext;
    window.audioCheck = { contexts: [], tones: [], active: 0, maxActive: 0 };
    window.AudioContext = class extends NativeAudioContext {
      constructor(...args) {
        super(...args);
        window.audioCheck.contexts.push(this);
      }
      createOscillator() {
        const oscillator = super.createOscillator();
        let scheduledFrequency = oscillator.frequency.value;
        const setFrequency = oscillator.frequency.setValueAtTime.bind(
          oscillator.frequency,
        );
        oscillator.frequency.setValueAtTime = (value, ...args) => {
          scheduledFrequency = value;
          return setFrequency(value, ...args);
        };
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (...args) => {
          window.audioCheck.tones.push({
            frequency: scheduledFrequency,
            type: oscillator.type,
          });
          window.audioCheck.active++;
          window.audioCheck.maxActive = Math.max(
            window.audioCheck.active,
            window.audioCheck.maxActive,
          );
          return start(...args);
        };
        oscillator.addEventListener("ended", () => {
          window.audioCheck.active--;
        });
        return oscillator;
      }
      createGain() {
        const gain = super.createGain();
        const connect = gain.connect.bind(gain);
        gain.connect = (...args) => {
          const result = connect(...args);
          if (args[0] === this.destination) {
            this.analyser = this.createAnalyser();
            this.analyser.fftSize = 4096;
            connect(this.analyser);
          }
          return result;
        };
        return gain;
      }
    };
  });
}

async function playTone(page, index = 0) {
  const before = await page.evaluate(() => window.audioCheck.tones.length);
  await page.locator(`[data-play="${index}"]`).click();
  await expect
    .poll(() => page.evaluate(() => window.audioCheck.tones.length))
    .toBeGreaterThan(before);
  await expect(page.locator(`[data-play="${index}"]`)).toHaveClass(/is-playing/);
  return page.evaluate(() => window.audioCheck.tones.at(-1).frequency);
}

test("original welcome content, lesson overview, ordered slides, keyboard, fullscreen and history", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".welcome-message p")).toHaveText([
    "ברוכים הבאים לאתר הקורס.",
    "באתר תוכלו למצוא מצגות המסכמות את כל השיעורים ותרגילים לעבודה בבית.",
  ]);
  await expect(page.locator(".safety p")).toHaveText([
    "עבדו על התרגילים עם אוזניות בווליום נמוך. אם אתם לא שומעים את הצלילים הנשמעים, הרימו את הווליום בזהירות עד שאתם שומעים.",
    "בכל מצב, אם אתם מרגישים חוסר נוחות או כאב הפסיקו מיד את התרגיל והנמיכו את הווליום לגובה נוח ונעים. שמרו על האוזניים והשמיעה שלכם.",
  ]);
  await page.getByRole("link", { name: "קדימה לשיעורים" }).click();
  await page.locator(".lesson-card").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "שיעור 1 – מה זה קול?",
  );
  await expect(page.locator(".activity-card")).toHaveCount(4);
  await page.screenshot({
    path: testInfo.outputPath("overview.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "צפייה במצגת" }).click();
  await expect(page.locator(".slide-counter")).toHaveText("1 / 11");
  await expect(
    page.getByRole("button", { name: "השקופית הקודמת" }),
  ).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".slide-counter")).toHaveText("2 / 11");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".slide-counter")).toHaveText("1 / 11");
  for (let index = 1; index <= 11; index++) {
    await expect(page.locator(".slide-image")).toHaveAttribute(
      "src",
      new RegExp(`/${index}_-`),
    );
    await expect
      .poll(() =>
        page
          .locator(".slide-image")
          .evaluate((image) => image.complete && image.naturalWidth > 0),
      )
      .toBeTruthy();
    if (index === 1)
      await page.screenshot({
        path: testInfo.outputPath("presentation.png"),
        fullPage: true,
      });
    if (index < 11)
      await page.getByRole("button", { name: "השקופית הבאה" }).click();
  }
  await expect(
    page.getByRole("button", { name: "השקופית הבאה" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "מסך מלא", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBeTruthy();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".slide-counter")).toHaveText("10 / 11");
  await page.keyboard.press("ArrowLeft");
  await page.screenshot({ path: testInfo.outputPath("fullscreen.png") });
  await page.getByRole("button", { name: "יציאה ממסך מלא" }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBeTruthy();
  await page.getByRole("link", { name: "המשך לתרגול" }).click();
  await expect(page).toHaveURL(/\/exercises\/1$/);
  await page.goBack();
  await expect(page.locator(".slide-image")).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "לפני שמתחילים" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "חזרה לשיעור" }).click();
  await page.getByRole("link", { name: "חזרה לשיעורים" }).click();
  await expect(page).toHaveURL("/lessons");
  expect(errors).toEqual([]);
});

test("all three complete exercises: real sine output, gating, replay, answers, scores and sequential flow", async ({
  page,
}, testInfo) => {
  await observeAudio(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/lessons/1/exercises/1");
  expect(await page.evaluate(() => window.audioCheck.contexts.length)).toBe(0);
  await expect(page.locator(".exercise-safety p")).toHaveText(
    "השתמשו באוזניות ובעוצמה נמוכה. אם הצליל חלש, הגבירו בזהירות. אם אתם מרגישים אי נוחות, הפסיקו מיד.",
  );
  await page.getByRole("button", { name: "אני מוכן/ה – מתחילים" }).click();
  expect(await page.evaluate(() => window.audioCheck.contexts.length)).toBe(0);

  for (let exercise = 1; exercise <= 3; exercise++) {
    await expect(page).toHaveURL(`/lessons/1/exercises/${exercise}`);
    await expect(page.locator(".exercise-safety")).toHaveCount(0);
    for (let question = 0; question < 10; question++) {
      await expect(page.locator(".question-progress h2")).toHaveText(
        `שאלה ${question + 1} מתוך 10`,
      );
      await expect(page.locator("[data-answer]").first()).toBeDisabled();
      const frequency = await playTone(page);
      if (question === 0) {
        // Measure actual Web Audio output after the envelope's attack.
        await expect
          .poll(async () =>
            page.evaluate(() => {
              const analyser = window.audioCheck.contexts.at(-1).analyser;
              const samples = new Float32Array(analyser.fftSize);
              analyser.getFloatTimeDomainData(samples);
              return Math.max(...samples.map(Math.abs));
            }),
          )
          .toBeGreaterThan(0.02);
        const signal = await page.evaluate(() => {
          const context = window.audioCheck.contexts.at(-1);
          const samples = new Float32Array(context.analyser.fftSize);
          context.analyser.getFloatTimeDomainData(samples);
          const crossings = [];
          for (let i = 1; i < samples.length; i++)
            if (samples[i - 1] < 0 && samples[i] >= 0) crossings.push(i);
          return {
            peak: Math.max(...samples.map(Math.abs)),
            frequency:
              (context.sampleRate * (crossings.length - 1)) /
              (crossings.at(-1) - crossings[0]),
          };
        });
        expect(signal.peak).toBeLessThanOrEqual(0.036);
        expect(Math.abs(signal.frequency - frequency) / frequency).toBeLessThan(
          0.04,
        );
        await expect
          .poll(() => page.evaluate(() => window.audioCheck.active))
          .toBe(0);
        // Replays are unlimited and must not change the question or frequency.
        expect(await playTone(page)).toBe(frequency);
        await page.locator('[data-play="0"]').evaluate((button) => {
          for (let i = 0; i < 8; i++) button.click();
        });
        await expect(page.locator(".tone-button").first()).toHaveClass(
          /is-playing/,
        );
      }
      let correct;
      if (exercise === 1)
        correct = frequency < 250 ? "low" : frequency < 2000 ? "mid" : "high";
      if (exercise === 2) {
        await expect(page.locator("[data-answer]").first()).toBeDisabled();
        const second = await playTone(page, 1);
        correct = frequency > second ? "0" : "1";
      }
      if (exercise === 3) correct = String(frequency);
      const choices = await page
        .locator("[data-answer]")
        .evaluateAll((buttons) =>
          buttons.map((button) => button.dataset.answer),
        );
      const selected =
        question < 2 ? choices.find((id) => id !== correct) : correct;
      await page.locator(`[data-answer="${selected}"]`).click();
      await expect(page.locator(".answer-feedback")).toContainText(
        question < 2 ? "לא הפעם" : "נכון!",
      );
      await expect(page.locator(`[data-answer="${correct}"]`)).toHaveClass(
        /correct-answer/,
      );
      await expect(page.locator(".score")).toHaveText(
        `${Math.max(0, question - 1)} תשובות נכונות`,
      );
      await expect(page.locator("[data-answer]").first()).toBeDisabled();
      // Repeated programmatic clicks cannot award a second point.
      await page
        .locator(`[data-answer="${correct}"]`)
        .evaluate((button) => button.click());
      await expect(page.locator(".score")).toHaveText(
        `${Math.max(0, question - 1)} תשובות נכונות`,
      );
      if (question === 2)
        await page.screenshot({
          path: testInfo.outputPath(`exercise-${exercise}.png`),
          fullPage: true,
        });
      await page.locator('[data-action="next"]').click();
    }
    await expect(
      page.getByRole("heading", { name: "סיימתם את התרגול!" }),
    ).toBeVisible();
    await expect(page.locator(".result")).toHaveText(
      "זיהיתם נכון 8 מתוך 10 שאלות.",
    );
    if (exercise < 3)
      await page.getByRole("link", { name: "המשך לתרגול הבא" }).click();
  }
  await page.screenshot({
    path: testInfo.outputPath("completion.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "תרגול חוזר" }).click();
  await expect(page.locator(".question-progress h2")).toHaveText(
    "שאלה 1 מתוך 10",
  );
  await expect(page.locator(".score")).toHaveText("0 תשובות נכונות");
  // A zero-score retry receives the same encouraging completion and can finish the lesson.
  for (let question = 0; question < 10; question++) {
    const frequency = await playTone(page);
    const wrong = page
      .locator(`[data-answer]:not([data-answer="${frequency}"])`)
      .first();
    await wrong.click();
    await page.locator('[data-action="next"]').click();
  }
  await expect(page.locator(".result")).toHaveText(
    "זיהיתם נכון 0 מתוך 10 שאלות.",
  );
  await expect(page.locator(".exercise-completion")).toContainText(
    "כל הקשבה היא הזדמנות ללמוד.",
  );
  await page.getByRole("link", { name: "סיום השיעור" }).click();
  await expect(page).toHaveURL("/lessons");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.audioCheck.contexts.every(
          (context) => context.state === "closed",
        ),
      ),
    )
    .toBeTruthy();
  expect(await page.evaluate(() => window.audioCheck.maxActive)).toBe(1);
  expect(
    await page.evaluate(() =>
      window.audioCheck.tones.every((tone) => tone.type === "sine"),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("direct entry, safety acknowledgement, responsive RTL, unavailable audio, fullscreen fallback and navigation cleanup", async ({
  page,
}, testInfo) => {
  await observeAudio(page);
  for (const exercise of [3, 2, 1]) {
    await page.goto(`/lessons/1/exercises/${exercise}`);
    if (exercise === 3) {
      await expect(
        page.getByRole("heading", { name: "לפני שמתחילים" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "אני מוכן/ה – מתחילים" }).click();
    }
    await expect(page.locator(".question-progress h2")).toHaveText(
      "שאלה 1 מתוך 10",
    );
    expect(await page.evaluate(() => window.audioCheck.tones.length)).toBe(0);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator("main")
          .evaluate((el) => getComputedStyle(el).direction),
      ).toBe("rtl");
      if (width === 390)
        await page.screenshot({
          path: testInfo.outputPath(`mobile-exercise-${exercise}.png`),
          fullPage: true,
        });
    }
    await playTone(page);
    await page.getByRole("link", { name: "מצגת", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.audioCheck.active))
      .toBe(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.audioCheck.contexts.every(
            (context) => context.state === "closed",
          ),
        ),
      )
      .toBeTruthy();
    await page.goBack();
    await expect(page.locator(".question-progress h2")).toHaveText(
      "שאלה 1 מתוך 10",
    );
  }
  // Even navigation and an immediate new playback within one event loop cannot overlap audio.
  await playTone(page);
  await page.evaluate(() => {
    document.querySelector('a[href="/lessons/1/exercises/2"]').click();
    document.querySelector('[data-play="0"]').click();
  });
  await expect(page.locator('[data-play="0"]')).toHaveClass(/is-playing/);
  expect(await page.evaluate(() => window.audioCheck.maxActive)).toBe(1);
  await page.goto("/lessons/1/presentation");
  await page.evaluate(() => {
    Element.prototype.requestFullscreen = undefined;
  });
  await page.getByRole("button", { name: "מסך מלא", exact: true }).click();
  await expect(page.locator(".presentation-viewer")).toHaveClass(/expanded/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".presentation-viewer")).not.toHaveClass(
    /expanded/,
  );
  await page.screenshot({
    path: testInfo.outputPath("mobile-presentation.png"),
    fullPage: true,
  });
  await page.goto("/lessons/1/exercises/1");
  await page.evaluate(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });
  await page.locator('[data-play="0"]').click();
  await expect(page.locator(".audio-error")).toContainText(
    "לא ניתן להשמיע כרגע",
  );
  await expect(page.locator("[data-answer]").first()).toBeDisabled();
});
