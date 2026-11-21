// Review a local preview build, using an isolated browser context with synthetic data.
import { chromium } from "@playwright/test";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const origin = new URL(process.env.STUDIO_URL || "http://127.0.0.1:3038");
assert(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname), "Use a local preview build");
const build = (await readFile(".next/BUILD_ID", "utf8")).trim();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH && { executablePath: process.env.CHROMIUM_PATH }),
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--no-zygote", "--single-process"],
});
const directory = path.join("test-results", "motion-studio", build, browser.version(), "390x844");
await mkdir(directory, { recursive: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(4500);
await page.addInitScript(() => {
  localStorage.setItem("kink-profiles", JSON.stringify({ version: 25, state: {
    onboardingComplete: true, profileTourComplete: true, profiles: [], appLockEnabled: false,
  }}));
});
const errors = [];
page.on("pageerror", error => errors.push(error.stack || error.message));
const button = (name) => page.getByRole("button", { name, exact: true });
const go = async slug => {
  await page.goto(new URL("/hot" + (slug ? "/" + slug : ""), origin).href);
  await page.locator("main, [role=dialog]").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
};
async function exists(file) {
  return access(file).then(() => true, () => false);
}
async function shot(name) {
  const filename = path.join(directory, name + ".jpg");
  if (await exists(filename)) return;
  await page.waitForTimeout(550);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Horizontal overflow at " + name);
  await page.screenshot({ type: "jpeg", quality: 82, path: filename + ".partial" });
  await rename(filename + ".partial", filename);
}
const cases = {
  async folio() {
    await go("folio");
    const open = page.locator('[data-folio-open="noor"]');
    const home = page.locator('[data-folio-screen="home"]');
    const profile = page.locator('[data-folio-screen="noor"]');
    await home.waitFor();
    await shot("dark-folio-home");
    await open.click();
    await profile.waitFor();
    await shot("dark-folio-profile");
    await page.goBack();
    await home.waitFor();
    const samples = {};
    for (const mode of ["direct", "folio", "gsap", "aperture"]) {
      await page.locator('input[value="'+mode+'"]').check();
      if (mode === "gsap") await page.locator('[data-folio-engine="ready"]').waitFor();
      samples[mode] = await page.evaluate(async () => {
        const times = [];
        const start = performance.now();
        let animated = false;
        let commit;
        let shown = false;
        document.querySelector('[data-folio-open="noor"]').click();
        await new Promise(resolve => {
          function frame(now) {
            const hero = document.querySelector('[data-folio-screen="noor"] [data-folio-avatar]');
            if (hero && !shown) { commit = Math.round(now - start); shown = true; }
            if (hero && getComputedStyle(hero).transform !== "none") animated = true;
            times.push(now);
            if (now - start > 750) resolve(); else requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        });
        const intervals = times.slice(1).map((n,i) => n - times[i]).sort((a,b) => a-b);
        const round = n => Math.round(n*10)/10;
        return { animated, commitMs: commit, frames: times.length, medianMs: round(intervals[Math.floor(intervals.length/2)]),
          p95Ms: round(intervals[Math.floor(intervals.length*.95)]), maxMs: round(intervals.at(-1)) };
      });
      await profile.waitFor();
      await page.goBack();
      await home.waitFor();
    }
    assert(samples.folio.animated && samples.gsap.animated && !samples.direct.animated, JSON.stringify(samples));
    await page.locator('input[value="folio"]').check();
    await page.locator(".folio-review summary").click();
    await page.locator(".folio-review select").selectOption("50");
    await open.click();
    await profile.waitFor();
    await home.waitFor();
    assert.equal(await open.evaluate(el => el === document.activeElement), true);
    return samples;
  },
  async questionnaires() {
    await go("questions");
    await button("Privé").waitFor();
    await shot("dark-questionnaire");
    await button("Privé").click();
    await button("Nieuwsgierig").click();
    assert.equal(await button("Privé").getAttribute("aria-pressed"), "true");
    await page.getByTestId("question-info-disclosure").click();
    await page.getByRole("dialog").waitFor();
    await shot("dark-question-info");
  },
  async profile() {
    await go("profile-study");
    const reveal = page.getByRole("button", { name: /Privéantwoord voor .* tonen/ }).first();
    await reveal.waitFor();
    await reveal.click();
    const privateCopy = page.getByText("Alleen als we vooraf afspreken hoe we pauzeren.", { exact: true });
    await privateCopy.first().waitFor();
    await shot("dark-private-answer");
    await page.getByRole("button", {name:/Privéantwoord voor .* verbergen/}).click();
    assert.equal(await privateCopy.count(), 0);
    await button("Zoek in catalogus").click();
    await page.getByRole("searchbox").fill("wax");
    await shot("dark-profile-search");
    await page.getByRole("searchbox").press("Escape");
    assert(await button("Zoek in catalogus").evaluate(el => el === document.activeElement));
  },
  async overlays() {
    await go("overlays");
    await button("Instellingen").click();
    await page.getByRole("dialog").waitFor();
    await shot("light-settings");
    await page.keyboard.press("Escape");
    await button("Moment plannen").click();
    await shot("light-planned-moment");
    await button("Plan moment").click();
    const time = page.locator('input[type="time"]');
    assert(await time.evaluate(el => el === document.activeElement));
    await time.fill("20:00");
    await button("Plan moment").click();
    await page.getByText("Moment bewaard voor deze proef.").waitFor();
    await button("Moment bijhouden").click();
    await shot("light-recorded-moment");
  },
  async scenes() {
    await go("scenes");
    await page.getByRole("button", { name: /Spelen met aandacht/ }).click();
    assert.equal(await page.locator("#cue-heading").innerText(), "Spelen met aandacht");
    await shot("light-scene");
    await page.locator("#cue-note").fill("Oefennotitie");
    await page.getByRole("button", { name: /Samen afronden/ }).click();
    await page.getByRole("button", { name: /Spelen met aandacht/ }).click();
    assert.equal(await page.locator("#cue-note").inputValue(), "Oefennotitie");
  },
  async onboarding() {
    await go("onboarding");
    for (const label of ["Begin", "Ik ben 18+"]) await button(label).click();
    await page.getByText("Probeer een antwoord.", {exact:false}).waitFor();
    await shot("light-first-use");
    for (const label of ["Kom maar door", "Verder", "Niet nu"]) await button(label).click();
    await button("Open KinkSync").waitFor();
    await shot("light-vault");
    await button("Open KinkSync").click();
    await page.getByRole("heading", { name:"Bewegingsstudio" }).waitFor();
  },
  async lightDeck() {
    await go("questions");
    await button("Privé").waitFor();
    await shot("light-questionnaire");
  },
};
try {
  for (const [name, run] of Object.entries(cases)) {
    const result = path.join(directory, name + ".json");
    if (await exists(result)) { console.log("cached", name); continue; }
    const dark = ["folio", "questionnaires", "profile"].includes(name);
    await page.emulateMedia({ colorScheme: dark ? "dark" : "light", reducedMotion: "no-preference" });
    const before = errors.length;
    try {
      const metrics = await run();
      assert.deepEqual(errors.slice(before), []);
      await writeFile(result, JSON.stringify({ build, browser: browser.version(), theme: dark ? "dark" : "light", metrics }, null, 2));
      console.log("passed", name, metrics || "");
    } catch (error) {
      console.error("failed", name, error.message, errors.slice(before));
      process.exitCode = 1;
    }
  }
  console.log("capture directory", directory);
} finally { await browser.close(); }
