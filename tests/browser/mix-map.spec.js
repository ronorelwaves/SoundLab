import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const storageKey = "sound-lab:billie-jean:mix-map:v1";
const savedMap = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey);

async function isolateProviders(page) {
  // Workspace checks do not depend on third-party connectivity or authentication.
  await page.route(/https:\/\/(?:[^/]+\.)?(?:youtube\.com|youtube-nocookie\.com|spotify\.com)\//, route => route.abort());
}

async function addSound(page, label) {
  await page.locator("[data-add-sound]").click();
  await expect(page.locator("[data-sound-editor]")).toBeVisible();
  await page.locator("[data-label]").fill(label);
  await page.locator("[data-label]").press("Tab");
  await expect.poll(async () => (await savedMap(page)).sounds.at(-1).label).toBe(label);
  return page.locator(".mix-blob").last();
}

test.beforeEach(async ({ page }) => {
  await isolateProviders(page);
});

test("lesson discovery, independent editing, mouse and keyboard positioning, persistence and provider switching", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/lessons");
  await page.locator('.lesson-card[href="/lessons/3"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("מפת המיקס");
  await expect(page.locator(".mix-field")).toHaveCount(1);
  await expect(page.locator(".mix-blob")).toHaveCount(0);
  await expect(page.locator("[data-sound-editor]")).toBeHidden();

  const label = 'בס <img src=x onerror=alert(1)>';
  const blob = await addSound(page, label);
  await expect(blob).toContainText(label);
  await expect(page.locator(".mix-field img")).toHaveCount(0);
  await page.locator("[data-nickname]").fill("נועה");
  await page.locator("input[data-depth]").focus();
  await page.keyboard.press("End");
  await expect.poll(async () => (await savedMap(page)).sounds[0].depth).toBe(2);
  expect((await savedMap(page)).sounds[0].size).toBe(76);
  await page.locator("[data-size]").focus();
  await page.keyboard.press("End");
  await expect.poll(async () => (await savedMap(page)).sounds[0].size).toBe(128);
  expect((await savedMap(page)).sounds[0].depth).toBe(2);
  await page.locator("[data-color]").evaluate(input => {
    input.value = "#efab75";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator("[data-entry]").fill("0:42");
  await page.locator("[data-entry]").press("Tab");

  const before = (await savedMap(page)).sounds[0];
  await blob.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowUp");
  await expect.poll(async () => (await savedMap(page)).sounds[0].x).toBeCloseTo(before.x + .01, 4);
  expect((await savedMap(page)).sounds[0].y).toBeCloseTo(before.y - .05, 4);

  const fieldBox = await page.locator(".mix-field").boundingBox();
  const blobBox = await blob.boundingBox();
  await page.mouse.move(blobBox.x + blobBox.width / 2, blobBox.y + blobBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(fieldBox.x - 100, fieldBox.y - 100, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await savedMap(page)).sounds[0].x).toBe(0);
  expect((await savedMap(page)).sounds[0].y).toBe(0);
  const bounded = await blob.boundingBox();
  expect(bounded.x).toBeGreaterThanOrEqual(fieldBox.x);
  expect(bounded.y).toBeGreaterThanOrEqual(fieldBox.y);

  await addSound(page, "הצליל שלי");
  const stored = await savedMap(page);
  expect(stored.nickname).toBe("נועה");
  expect(stored.sounds[0]).toMatchObject({ label, depth: 2, size: 128, color: "#efab75", entry: "0:42" });
  await page.locator('[data-provider="spotify"]').click();
  await expect(page.locator(".mix-blob")).toHaveCount(2);
  expect(await savedMap(page)).toEqual(stored);
  await page.locator('[data-provider="youtube"]').click();
  expect(await savedMap(page)).toEqual(stored);
  await page.reload();
  await expect(page.locator(".mix-blob")).toHaveCount(2);
  await expect(page.locator("[data-nickname]")).toHaveValue("נועה");
  expect(await savedMap(page)).toEqual(stored);

  await page.getByRole("link", { name: "חזרה לשיעורים", exact: true }).click();
  await page.locator('.lesson-card[href="/lessons/3"]').click();
  await expect(page.locator(".mix-blob")).toHaveCount(2);
  expect(await savedMap(page)).toEqual(stored);
});

test("delete undo, confirmed reset and empty-map export remain available", async ({ page }) => {
  await page.goto("/lessons/3");
  await addSound(page, "צליל שאפשר לשנות");
  await page.locator("[data-delete-sound]").click();
  await expect(page.locator(".mix-blob")).toHaveCount(0);
  await page.locator("[data-undo]").click();
  await expect(page.locator(".mix-blob")).toHaveCount(1);
  await expect(page.locator(".mix-blob")).toContainText("צליל שאפשר לשנות");

  page.once("dialog", dialog => dialog.dismiss());
  await page.locator("[data-reset]").click();
  await expect(page.locator(".mix-blob")).toHaveCount(1);
  page.once("dialog", dialog => dialog.accept());
  await page.locator("[data-reset]").click();
  await expect(page.locator(".mix-blob")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".mix-blob")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page.locator("[data-export]").click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test("high-resolution PNG preserves Hebrew labels and all map data without controls", async ({ page }, info) => {
  await page.addInitScript(() => {
    window.exportText = [];
    const nativeFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      window.exportText.push({ text, direction: this.direction });
      return nativeFillText.call(this, text, ...args);
    };
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/lessons/3");
  await page.locator("[data-nickname]").fill("המפה של תמר");
  const labels = ["צליל נמוך", "קול במרכז", "הדהוד רחוק"];
  for (let i = 0; i < labels.length; i++) {
    const blob = await addSound(page, labels[i]);
    await blob.focus();
    const direction = i === 0 ? "ArrowLeft" : "ArrowRight";
    for (let step = 0; step < 5 + i * 2; step++) await page.keyboard.press(`Shift+${direction}`);
    await page.keyboard.press(`Shift+${i === 0 ? "ArrowDown" : "ArrowUp"}`);
    await page.locator("input[data-depth]").focus();
    await page.keyboard.press("Home");
    for (let step = 0; step < i; step++) await page.keyboard.press("ArrowRight");
  }
  const original = await savedMap(page);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-export]").click();
  const download = await downloadPromise;
  const output = info.outputPath("billie-jean-hebrew-map.png");
  await download.saveAs(output);
  const png = await readFile(output);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.readUInt32BE(16)).toBe(2400);
  expect(png.readUInt32BE(20)).toBe(1600);
  const drawn = await page.evaluate(() => window.exportText);
  const text = drawn.map(call => call.text).join(" ");
  for (const expected of ["Billie Jean", "Michael Jackson", "המפה של תמר", ...labels, "קרוב", "אמצע", "רחוק", "L100", "R100"]) {
    expect(text).toContain(expected);
  }
  expect(drawn.some(call => /[א-ת]/.test(call.text) && call.direction === "rtl")).toBe(true);
  expect(text).not.toContain("הוסף צליל");
  expect(text).not.toContain("YouTube");
  expect(text).not.toContain("Spotify");
  expect(await savedMap(page)).toEqual(original);
  await page.screenshot({ path: info.outputPath("billie-jean-workspace.png"), fullPage: true });
});

test("responsive RTL workspace keeps spatial stereo orientation", async ({ page }, info) => {
  await page.goto("/lessons/3");
  await addSound(page, "הצליל האישי שלי");
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator("[data-sound-editor]")).toBeVisible();
    expect(await page.locator("main").evaluate(element => getComputedStyle(element).direction)).toBe("rtl");
    expect(await page.locator(".mix-field").evaluate(element => getComputedStyle(element).direction)).toBe("ltr");
    const field = await page.locator(".mix-field").boundingBox();
    expect(field.width).toBeGreaterThan(200);
    expect(field.height).toBeGreaterThanOrEqual(300);
    if (width === 390) await page.screenshot({ path: info.outputPath("billie-jean-mobile.png"), fullPage: true });
  }
});

test("touch dragging moves the selected sound and stays inside the field", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, hasTouch: true, baseURL });
  const page = await context.newPage();
  await isolateProviders(page);
  try {
    await page.goto("/lessons/3");
    const blob = await addSound(page, "מגע");
    await blob.scrollIntoViewIfNeeded();
    const box = await blob.boundingBox();
    const field = await page.locator(".mix-field").boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const session = await context.newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 100, y: y - 70 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(async () => (await savedMap(page)).sounds[0].x).toBeGreaterThan(.5);
    expect((await savedMap(page)).sounds[0].y).toBeLessThan(.5);
    const moved = await blob.boundingBox();
    expect(moved.x).toBeGreaterThanOrEqual(field.x);
    expect(moved.x + moved.width).toBeLessThanOrEqual(field.x + field.width);
    expect(moved.y).toBeGreaterThanOrEqual(field.y);
    expect(moved.y + moved.height).toBeLessThanOrEqual(field.y + field.height);
    await session.detach();
  } finally {
    await context.close();
  }
});

test("Escape and undo safely finish active pointer drags, with accessible height and depth", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/lessons/3");
  const blob = await addSound(page, "צליל בתנועה");
  const depth = page.locator("input[data-depth]");
  await expect(depth).toHaveAttribute("aria-valuetext", "אמצע");
  await depth.focus();
  await page.keyboard.press("End");
  await expect(depth).toHaveAttribute("aria-valuetext", "רחוק");
  await page.keyboard.press("Home");
  await expect(depth).toHaveAttribute("aria-valuetext", "קרוב");
  await expect(blob).toHaveAccessibleName(/גובה תדר אמצע, מיקום גובה \d+, עומק קרוב/);

  await blob.scrollIntoViewIfNeeded();
  const initial = (await savedMap(page)).sounds[0];
  let box = await blob.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 - 50);
  await expect(blob).toHaveClass(/is-dragging/);
  await page.keyboard.press("Escape");
  await expect(blob).not.toHaveClass(/is-dragging/);
  await expect(page.locator("[data-sound-editor]")).toBeHidden();
  const escaped = (await savedMap(page)).sounds[0];
  expect(escaped.x).toBeGreaterThan(initial.x);
  expect(escaped.y).toBeLessThan(initial.y);
  await page.mouse.move(1, 1);
  await page.mouse.up();
  expect((await savedMap(page)).sounds[0]).toEqual(escaped);

  await blob.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowUp");
  await expect(blob).toHaveAccessibleName(/גובה תדר גבוה, מיקום גובה \d+/);
  const beforeUndoDrag = (await savedMap(page)).sounds[0];
  box = await blob.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 50);
  await expect(blob).toHaveClass(/is-dragging/);
  await page.keyboard.press("Control+z");
  await expect(blob).not.toHaveClass(/is-dragging/);
  expect((await savedMap(page)).sounds[0]).toEqual(beforeUndoDrag);
  await page.mouse.move(1, 1);
  await page.mouse.up();
  expect((await savedMap(page)).sounds[0]).toEqual(beforeUndoDrag);
  for (const coordinate of [beforeUndoDrag.x, beforeUndoDrag.y]) {
    expect(coordinate).toBeGreaterThanOrEqual(0);
    expect(coordinate).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test("blocked local storage still allows editing and PNG export with an honest save message", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new DOMException("Storage blocked for this test", "SecurityError"); },
    });
  });
  await page.goto("/lessons/3");
  await expect(page.locator(".mix-blob")).toHaveCount(0);
  await page.locator("[data-nickname]").fill("חתימה זמנית");
  // The first edit must already be undoable before the input loses focus.
  await expect(page.locator("[data-undo]")).toBeEnabled();
  await page.locator("[data-undo]").click();
  await expect(page.locator("[data-nickname]")).toHaveValue("");
  await page.locator("[data-add-sound]").click();
  await page.locator("[data-label]").fill("יצירה גם ללא שמירה מקומית");
  await expect(page.locator(".mix-blob")).toContainText("יצירה גם ללא שמירה מקומית");
  await expect(page.locator("[data-save-status]")).toContainText("השמירה בדפדפן אינה זמינה");
  await expect(page.locator("[data-undo]")).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-export]").click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.png$/);
  await expect(page.locator("[data-export-status]")).toContainText("התמונה מוכנה");
  expect(errors).toEqual([]);
});
