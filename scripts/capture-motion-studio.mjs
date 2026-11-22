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
async function assertVerticalLayout(name) {
  const problems = await page.evaluate(() => {
    const owners = [...document.querySelectorAll("body *")].filter(element =>
      element instanceof HTMLElement && element.clientWidth > 0 &&
      element.scrollWidth > element.clientWidth + 1 &&
      ["auto", "scroll"].includes(getComputedStyle(element).overflowX));
    return {
      documentOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      horizontalPanes: owners.map(element => element.dataset.testid || element.className || element.tagName),
    };
  });
  assert(problems.documentOverflow <= 1 && !problems.horizontalPanes.length, name + ": " + JSON.stringify(problems));
}
async function shot(name) {
  const filename = path.join(directory, name + ".jpg");
  if (await exists(filename)) return;
  await page.waitForTimeout(550);
  await assertVerticalLayout(name);
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
    const nav = page.locator("[data-folio-nav]");
    const surface = () => nav.evaluate(el => getComputedStyle(el, "::before").opacity);
    assert.equal(await surface(), "0");
    assert.equal(await profile.locator(".folio-hero").evaluate(el => getComputedStyle(el, "::before").content), "none");
    assert.equal(await profile.locator(".folio-portrait").evaluate(el => getComputedStyle(el, "::before").content), "none");
    await page.locator(".folio-bench > summary").click();
    await page.evaluate(() => window.scrollTo({top:document.documentElement.scrollHeight, behavior:"instant"}));
    await page.waitForFunction(() => document.querySelector("[data-folio-nav][data-scrolled]"));
    await page.locator(".folio-bench > summary").click();
    await page.evaluate(() => window.scrollTo({top:0, behavior:"instant"}));
    await page.waitForFunction(() => getComputedStyle(document.querySelector("[data-folio-nav]"), "::before").opacity === "0");
    await page.goBack();
    await home.waitFor();
    await page.locator(".folio-bench > summary").click();
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
            const flight = document.querySelector('[data-folio-flight="avatar"]');
            if (flight && getComputedStyle(flight).visibility !== "hidden" && flight.getBoundingClientRect().width > 0) animated = true;
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
      if (mode === "folio" || mode === "aperture") {
        await page.waitForFunction(() => document.querySelector('[data-folio-flight="avatar"]')?.getAnimations().length);
        await page.waitForFunction(() => !document.querySelector("[data-folio-covered]"));
      }
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
  async folioHandoff() {
    await go("folio");
    const open = page.locator('[data-folio-open="noor"]');
    await open.click();
    const avatar = page.locator('[data-folio-flight="avatar"]');
    await page.waitForFunction(() => document.querySelector('[data-folio-flight="avatar"]')?.getAnimations().length);
    const stages = [];
    for (const fraction of [.15, .5, .85]) {
      await page.evaluate(progress => {
        const parts = document.querySelectorAll("[data-folio-flight], [data-folio-body]");
        for (const part of parts) for (const animation of part.getAnimations()) {
          animation.pause();
          animation.currentTime = animation.effect.getTiming().duration * progress;
        }
      }, fraction);
      stages.push((await avatar.boundingBox()).width);
      await page.screenshot({ type: "jpeg", quality: 82, path: path.join(directory, `folio-travel-${fraction}.jpg`) });
    }
    assert(stages[0] < stages[1] && stages[1] < stages[2], "Portrait must travel through distinct poses");
    await page.evaluate(() => {
      for (const part of document.querySelectorAll("[data-folio-flight], [data-folio-body]"))
        for (const animation of part.getAnimations()) animation.finish();
    });
    await avatar.waitFor({ state: "detached" });
    const body = page.locator('[data-folio-screen="noor"]');
    await body.getByRole("button", { name: "Zoek in catalogus" }).click();
    const row = body.locator('[data-kink-id="praise_kink"]').first();
    await row.locator("[data-answer-summary]").click();
    // Clear the currently selected status. The editor remains available until closed.
    await row.getByRole("group", { name: "Status kiezen" }).getByRole("button", { name: /Heel graag/ }).click();
    assert.equal(await row.locator("[data-answer-summary]").getAttribute("aria-expanded"), "true");
    await row.locator("[data-answer-summary]").click();
    assert(await body.getByRole("searchbox").evaluate(el => el === document.activeElement));
    const back = page.locator('nav a[href="/hot/folio"]').first();
    await back.click();
    await open.click();
    await body.getByRole("group", {name: "Antwoordstatus"}).getByRole("button", {name: /Heel graag/}).click();
    await body.locator("#studio-filter-results").getByText("Geen openbare antwoorden met deze status.").waitFor();
    await back.click();
    await page.locator('[data-folio-open="robin-leidt"]').click();
    await page.locator('[data-folio-screen="robin-leidt"] [data-answer-verdict="yes"]').first().waitFor();
    return { portraitWidths: stages };
  },
  async questionnaires() {
    await go("questions");
    await button("Privé").waitFor();
    await shot("dark-questionnaire");
    const agreements = page.getByTestId("question-agreements");
    const summary = agreements.locator("summary");
    assert.equal(await agreements.getAttribute("open"), null);
    await summary.click();
    const firstAgreement = agreements.getByRole("button", { name: /Eerst vragen/ });
    await firstAgreement.click();
    assert.equal(await firstAgreement.getAttribute("aria-pressed"), "true");
    await summary.click();
    assert.match(await summary.innerText(), /Eerst vragen/i);
    await button("Privé").click();
    await button("Nieuwsgierig").click();
    assert.equal(await button("Privé").getAttribute("aria-pressed"), "true");
    await page.getByTestId("question-info-disclosure").click();
    await page.getByRole("dialog").waitFor();
    await shot("dark-question-info");
    await page.keyboard.press("Escape");
    const firstAnswer = page.locator('[data-tour="pills"] button').first();
    const positions = [];
    for (let i = 0; i < 5; i++) {
      positions.push((await firstAnswer.boundingBox()).y);
      const topic = await page.getByTestId("question-title").innerText();
      await firstAnswer.click();
      await page.waitForFunction(previous =>
        document.querySelector('[data-testid="question-title"]')?.textContent !== previous, topic);
    }
    assert(Math.max(...positions) - Math.min(...positions) <= 1, "Answer positions: " + positions.join(", "));
    return { answerY: positions };
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
    const categories = page.getByRole("combobox", {name:"Categorie"});
    if (await categories.count()) {
      await page.getByRole("searchbox").fill("");
      await categories.selectOption({index:1});
      await assertVerticalLayout("catalogue category");
    }
    await page.getByRole("searchbox").press("Escape");
    assert(await button("Zoek in catalogus").evaluate(el => el === document.activeElement));
  },
  async overlays() {
    await go("overlays");
    await shot("light-agenda");
    await button("Instellingen").click();
    await page.getByRole("dialog").waitFor();
    await shot("light-settings");
    const bounds = await page.getByRole("dialog").boundingBox();
    assert(bounds && Math.abs(bounds.y + bounds.height - page.viewportSize().height) <= 1, "Settings should open at the bottom on mobile");
    await page.getByRole("radio", { name: "Donker" }).check();
    assert.equal(await page.getByRole("dialog").getAttribute("data-preview-theme"), "dark");
    assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
    await shot("dark-settings-preview");
    await page.keyboard.press("Escape");
    await button("Moment plannen").click();
    await shot("light-planned-moment");
    const date = page.getByLabel("Datum", { exact: true });
    assert.equal(await date.count(), 0);
    await page.getByRole("button", { name: /Wijzig datum/ }).click();
    assert(await date.evaluate(el => el === document.activeElement));
    await date.fill("2026-11-24");
    await button("Plan moment").click();
    const time = page.locator('input[type="time"]');
    assert(await time.evaluate(el => el === document.activeElement));
    await time.fill("20:00");
    await button("Plan moment").click();
    await page.getByRole("status").filter({ hasText: /Gepland voor dinsdag 24 november om 20:00/ }).waitFor();
    await button("Moment bijhouden").click();
    await shot("light-recorded-moment");
    const dialog = page.getByRole("dialog");
    await dialog.locator("summary").filter({ hasText: "Partner toevoegen" }).click();
    const partner = dialog.getByRole("combobox", { name: "Met wie?" });
    await partner.selectOption({label: "Sam"});
    for (const width of [402, 320]) {
      await page.setViewportSize({width, height:710});
      const bounds = await dialog.locator(".os-pair input").evaluateAll(inputs =>
        inputs.map(input => {
          const r = input.getBoundingClientRect(), label = input.parentElement.getBoundingClientRect();
          return r.left >= label.left - 1 && r.right <= label.right + 1;
        }));
      assert.deepEqual(bounds, [true,true]);
      await assertVerticalLayout("Moment met partner, " + width);
    }
    await button("Bewaar moment").click();
    await page.setViewportSize({width:390, height:844});
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
    await shot("light-onboarding-intro");
    await button("Ik ben 18 of ouder").click();
    await page.getByRole("button", { name: /Misschien/ }).click();
    await shot("light-first-use");
    await button("Bekijk mijn voorbeeld").click();
    const response = page.locator("#practice-result").getByText("Misschien", {exact:true});
    assert.equal(await response.count(), 0);
    await button("Toon oefenantwoord").click();
    await response.waitFor();
    await button("Verberg oefenantwoord").click();
    assert.equal(await response.count(), 0);
    await page.getByRole("link", { name: "Naar de vragenlijst" }).click();
    await button("Privé").waitFor();
  },
  async narrowLayers() {
    await page.setViewportSize({width:320, height:700});
    try {
      for (const slug of ["questions", "onboarding", "overlays", "profile-study", "folio", "folio/robin-leidt", "scenes"]) {
        await go(slug);
        await page.addStyleTag({ content: ":root{font-size:200%!important}" });
        await assertVerticalLayout(slug);
        if (slug === "onboarding") {
          await button("Ik ben 18 of ouder").click();
          await assertVerticalLayout("Oefenvraag");
        }
        if (slug === "overlays") {
          await button("Moment plannen").click();
          await page.getByRole("dialog").waitFor();
          await assertVerticalLayout("Moment plannen");
        }
      }
    } finally { await page.setViewportSize({width:390, height:844}); }
  },
  async reducedDesktop() {
    await page.setViewportSize({ width: 1280, height: 800 });
    try {
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await go("folio");
      await page.locator('[data-folio-open="robin-volgt"]').click();
      const screen = page.locator('[data-folio-screen="robin-volgt"]');
      await screen.waitFor();
      assert.equal(await page.locator("[data-folio-flight], [data-folio-covered]").count(), 0);
      assert(await screen.locator("h1").evaluate(el => el === document.activeElement));
      await screen.getByRole("button", {name:"Zoek in catalogus"}).click();
      await assertVerticalLayout("Desktopprofiel");
      await page.goBack();
      const opener = page.locator('[data-folio-open="robin-volgt"]');
      await opener.waitFor();
      assert(await opener.evaluate(el => el === document.activeElement));
    } finally { await page.setViewportSize({width:390, height:844}); }
  },
  async lightDeck() {
    await go("questions");
    await button("Privé").waitFor();
    await shot("light-questionnaire");
  },
};
try {
  const requested = process.argv.slice(2);
  for (const name of requested) assert(Object.hasOwn(cases, name), "Unknown study: " + name);
  for (const [name, run] of Object.entries(cases)) {
    if (requested.length && !requested.includes(name)) continue;
    const result = path.join(directory, name + ".json");
    if (await exists(result)) { console.log("cached", name); continue; }
    const dark = ["folio", "folioHandoff", "questionnaires", "profile"].includes(name);
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
