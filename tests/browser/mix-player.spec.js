import { test, expect } from "@playwright/test";

async function mockFrames(page) {
  await page.route("https://www.youtube-nocookie.com/**", (route) => route.fulfill({ body: "<!doctype html><title>נגן בדיקה</title>", contentType: "text/html" }));
  await page.route("https://open.spotify.com/embed/**", (route) => route.fulfill({ body: "<!doctype html><title>נגן בדיקה</title>", contentType: "text/html" }));
}

test("official player URLs, YouTube seek behavior and independent provider switching", async ({ page }) => {
  await mockFrames(page);
  await page.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({
    contentType: "application/javascript",
    body: `
      window.youtubeCheck = { state: -1, time: 0, duration: 294, seeks: [], cues: [], destroyed: 0, plays: 0 };
      window.YT = { Player: function(id, options) {
        const data = window.youtubeCheck;
        this.getCurrentTime = () => data.time;
        this.getDuration = () => data.duration;
        this.getPlayerState = () => data.state;
        this.seekTo = (time, allowSeekAhead) => { data.seeks.push([time, allowSeekAhead]); data.time = time; };
        this.cueVideoById = (options) => { data.cues.push(options); data.time = options.startSeconds; data.state = 5; };
        this.playVideo = () => { data.plays++; };
        this.destroy = () => { data.destroyed++; };
        setTimeout(() => options.events.onReady({ target: this }), 0);
      } };
      window.onYouTubeIframeAPIReady();`,
  }));
  await page.goto("/lessons/3");
  const root = page.locator("[data-music-player]");
  await expect(root.locator("iframe")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/P_7q2RJtVQA\?.*autoplay=0.*controls=1/);
  await expect(root.locator("iframe")).toHaveAttribute("allow", /encrypted-media/);
  await expect(root.locator('[data-seek="5"]')).toBeEnabled();
  await root.locator('[data-seek="5"]').click();
  expect(await page.evaluate(() => window.youtubeCheck.cues)).toEqual([{ videoId: "P_7q2RJtVQA", startSeconds: 5 }]);
  expect(await page.evaluate(() => window.youtubeCheck.plays)).toBe(0);
  await page.evaluate(() => { window.youtubeCheck.state = 2; window.youtubeCheck.time = 2; });
  await root.locator('[data-seek="-5"]').click();
  expect(await page.evaluate(() => window.youtubeCheck.seeks.at(-1))).toEqual([0, true]);
  expect(await page.evaluate(() => window.youtubeCheck.state)).toBe(2);
  await page.evaluate(() => { window.youtubeCheck.state = 1; window.youtubeCheck.time = 293; });
  await root.locator('[data-seek="5"]').click();
  expect(await page.evaluate(() => window.youtubeCheck.seeks.at(-1))).toEqual([294, true]);
  await root.locator('[data-provider="spotify"]').click();
  await expect(root.locator("iframe")).toHaveAttribute("src", /open\.spotify\.com\/embed\/track\/1Rt3oh7shVSWj6q2MieDHa/);
  await expect(root.locator("iframe")).toHaveAttribute("height", "352");
  await expect(root.locator(".mix-transport")).toBeHidden();
  await expect(root.locator(".mix-player-external")).toHaveAttribute("href", "https://open.spotify.com/track/1Rt3oh7shVSWj6q2MieDHa");
  await expect(root.locator(".mix-player-note")).toContainText("תצוגה מקדימה");
  expect(await page.evaluate(() => window.youtubeCheck.destroyed)).toBe(1);
  await root.locator('[data-provider="youtube"]').click();
  await expect(root.locator('[data-seek="5"]')).toBeEnabled();
  await page.locator('.mix-breadcrumb a[href="/lessons"]').click();
  expect(await page.evaluate(() => window.youtubeCheck.destroyed)).toBe(2);
});

test("blocked API keeps native player and useful fallback with disabled custom controls", async ({ page }) => {
  await mockFrames(page);
  await page.route("https://www.youtube.com/iframe_api", (route) => route.abort("blockedbyclient"));
  await page.goto("/lessons/3");
  const root = page.locator("[data-music-player]");
  await expect(root.locator(".mix-player-status")).toContainText("כפתורי הדילוג אינם זמינים");
  await expect(root.locator("iframe")).toBeVisible();
  await expect(root.locator('[data-seek="5"]')).toBeDisabled();
  await expect(root.locator(".mix-player-external")).toHaveAttribute("href", "https://www.youtube.com/watch?v=P_7q2RJtVQA");
  await root.locator('[data-provider="spotify"]').click();
  await expect(root.locator("iframe")).toHaveAttribute("src", /open\.spotify\.com\/embed\/track\//);
});
