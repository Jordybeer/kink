import { test, expect } from "@playwright/test";
import { seedProfiles, seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

const SHARED_SAM = { ...PROFILE_SAM, isImported: true, origin: "shared" as const };
const EMPTY_HOME_VIEWPORTS = [
  { width: 320, height: 667 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
] as const;

test.describe("Home page — leeg", () => {
  for (const viewport of EMPTY_HOME_VIEWPORTS) {
    test(`centreert de lege compositie in de bruikbare viewport op ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: false });

      const horizontalOverflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
      expect(horizontalOverflow).toBe(false);

      const masthead = page.locator("[data-home-masthead]");
      const wordmark = page.locator("[data-home-nav-wordmark]");
      const subtitle = page.getByText("Verken grenzen. Samen.", { exact: true });
      const emptyCard = page.locator("[data-home-empty-card]");
      const stage = emptyCard.locator("xpath=ancestor::main");

      await expect(masthead).toBeVisible();
      await expect(wordmark).toBeVisible();
      await expect(subtitle).toHaveCount(1);
      await expect(emptyCard).toBeVisible();

      const [mastheadBox, wordmarkBox, subtitleBox, stageBox, cardBox] = await Promise.all([
        masthead.boundingBox(),
        wordmark.boundingBox(),
        subtitle.boundingBox(),
        stage.boundingBox(),
        emptyCard.boundingBox(),
      ]);
      expect(mastheadBox).not.toBeNull();
      expect(wordmarkBox).not.toBeNull();
      expect(subtitleBox).not.toBeNull();
      expect(stageBox).not.toBeNull();
      expect(cardBox).not.toBeNull();

      const mastheadBottom = mastheadBox!.y + mastheadBox!.height;
      const cardBottom = cardBox!.y + cardBox!.height;
      const stageBottom = stageBox!.y + stageBox!.height;
      const freeAbove = cardBox!.y - stageBox!.y;
      const freeBelow = stageBottom - cardBottom;
      const minimumBreathingRoom = viewport.width <= 320 ? 8 : 12;

      expect(subtitleBox!.y).toBeGreaterThan(wordmarkBox!.y);
      expect(cardBox!.y).toBeGreaterThanOrEqual(mastheadBottom - 1);
      expect(freeAbove).toBeGreaterThanOrEqual(minimumBreathingRoom);
      expect(freeBelow).toBeGreaterThanOrEqual(minimumBreathingRoom);
      expect(Math.abs(freeAbove - freeBelow)).toBeLessThanOrEqual(12);

      const verticalOverflow = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
      expect(verticalOverflow).toBeLessThanOrEqual(2);
      await page.screenshot({
        path: `screenshots/theme-rehearsal/${testInfo.project.name}/home-empty-${viewport.width}.png`,
        fullPage: false,
      });
    });
  }
});

test.describe("Home page — profielen aanwezig", () => {
  test.beforeEach(async ({ page }) => {
    await seedProfiles(page, [PROFILE_ALEX, SHARED_SAM]);
  });

  test("scheidt eigen en gedeelde profielen in stabiele secties zonder UI-state te bewaren", async ({ page }) => {
    const mine = page.getByRole("heading", { name: "Mijn profielen" });
    const shared = page.getByRole("heading", { name: "Gedeeld met mij" });

    await expect(mine).toBeVisible();
    await expect(shared).toBeVisible();
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Sam", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mijn profielen/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Gedeeld met mij/ })).toHaveCount(0);

    const stored = await page.evaluate(() => sessionStorage.getItem("kinksync-home-profile-disclosures"));
    expect(stored).toBeNull();

    await page.goto("/about");
    await page.goBack();
    await expect(mine).toBeVisible();
    await expect(shared).toBeVisible();
    await expect(page.getByText("Alex", { exact: true })).toBeVisible();
    await expect(page.getByText("Sam", { exact: true })).toBeVisible();
  });

  test("navigeert naar profielpagina via link op profiel", async ({ page }) => {
    await page.getByRole("link", { name: "Alex Dominant openen" }).click();
    await expect(page).toHaveURL(/\/profile\/pw-alex-001/);
  });

  test("bundelt zeldzame profielacties in een ruime actiekiezer", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const profileLink = page.getByRole("link", { name: "Alex Dominant openen" });
    const trigger = page.getByRole("button", { name: "Meer acties voor Alex" });
    const [linkBox, triggerBox] = await Promise.all([profileLink.boundingBox(), trigger.boundingBox()]);

    expect(linkBox).not.toBeNull();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.width).toBeGreaterThanOrEqual(44);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(44);
    expect(linkBox!.x + linkBox!.width).toBeLessThanOrEqual(triggerBox!.x + 1);

    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Acties voor Alex" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Markeer als mijn profiel" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Profiel bewerken" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Profiel verwijderen" })).toBeVisible();
    await dialog.getByRole("button", { name: "Annuleren" }).click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("houdt home vrij van directe contract- en scènecreatie", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Maak een contract", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nieuwe scène", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Contracten", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Scènes", exact: true })).toBeVisible();
  });

  test("toont link naar vergelijken pagina", async ({ page }) => {
    const compareLink = page.getByRole("link", { name: /Vergelijk.*Alex.*Sam/i });
    await expect(compareLink).toBeVisible();
    await expect(compareLink).toHaveAttribute("href", /\/compare\?a=pw-alex-001&b=pw-sam-002/);
  });

  test("instellingen houden hun titel vast terwijl de laatste actie bereikbaar blijft", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 480 });
    const more = page.getByRole("button", { name: "Instellingen" });
    await more.click();

    const dialog = page.getByRole("dialog", { name: "Instellingen" });
    const title = dialog.getByRole("heading", { name: "Instellingen" });
    const scrollBody = dialog.getByTestId("sheet-scroll-body");
    const lastAction = dialog.getByRole("button", { name: /Alle data verwijderen/ });

    await expect(dialog).toBeVisible();
    await expect.poll(async () => dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
      return Math.max(0, -rect.top, rect.bottom - visibleHeight);
    })).toBeLessThanOrEqual(1);
    const titleBox = await title.boundingBox();
    expect(titleBox).not.toBeNull();
    const titleTop = titleBox!.y;
    await scrollBody.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => scrollBody.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    const actionBox = await lastAction.boundingBox();
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight);
    expect(actionBox).not.toBeNull();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(visibleHeight + 1);
    const titleAfterScroll = await title.boundingBox();
    expect(titleAfterScroll).not.toBeNull();
    expect(Math.abs(titleAfterScroll!.y - titleTop)).toBeLessThanOrEqual(1.25);

    await dialog.getByRole("button", { name: "Instellingen sluiten" }).click();
    await expect(dialog).toBeHidden();
    await expect(more).toBeFocused();
  });

  test("geen horizontale overflow op mobiel (390px)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.body.scrollWidth > document.body.clientWidth);
    expect(overflow).toBe(false);
  });
});

test.describe("Profiel aanmaken via UI", () => {
  test("opent het formulier en maakt een nieuw profiel aan", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedAndGo(page, "/", [], { onboardingComplete: true, profileTourComplete: false });

    await page.getByRole("button", { name: /^Maak mijn profiel\b/ }).click();
    const createDialog = page.getByRole("dialog", { name: "Nieuw profiel maken" });
    await expect(createDialog).toBeVisible();
    await expect(createDialog.getByText("Stap 1 van 2", { exact: true })).toBeVisible();
    await createDialog.getByLabel("Naam of alias").fill("TestPersoon");
    await createDialog.getByRole("button", { name: /^Dominant/ }).click();
    await createDialog.getByLabel("Ervaringsniveau").selectOption("ervaren");
    await createDialog.getByRole("button", { name: "Verder", exact: true }).click();
    await expect(createDialog.getByText("Stap 2 van 2", { exact: true })).toBeVisible();
    await createDialog.getByRole("button", { name: "Start vragen" }).click();

    await expect(page).toHaveURL(/\/profile\/[^/]+\/questions$/, { timeout: 8000 });
    await expect(page.getByTestId("questions-screen")).toBeVisible();
    await expect(page.getByText("Vragenlijst", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "Status kiezen" })).toBeVisible();

    const savedProfile = await page.evaluate(() => {
      const raw = localStorage.getItem("kink-profiles");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { state?: { profiles?: Array<{ name?: string; experienceLevel?: string; entries?: unknown }> } };
      return parsed.state?.profiles?.find((profile) => profile.name === "TestPersoon") ?? null;
    });
    expect(savedProfile?.entries).toEqual({});
    expect(savedProfile?.experienceLevel).toBe("ervaren");
  });
});

test("Home backup reading is visible, prevents duplicate activation and recovers after an invalid file", async ({ page }) => {
  await seedAndGo(page, "/", [], { onboardingComplete: true });
  await page.evaluate(() => {
    const original = File.prototype.text;
    let reads = 0;
    File.prototype.text = () => {
      document.documentElement.dataset.homeBackupReads = String(++reads);
      return new Promise<string>((resolve) => {
        Object.assign(window, { finishHomeBackupRead: resolve });
      });
    };
    Object.assign(window, { restoreHomeBackupRead: () => { File.prototype.text = original; } });
  });
  const backup = page.getByRole("button", { name: "Importeer back-up", exact: true });
  const input = page.getByLabel("Kies een backupbestand");
  await input.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(backup).toBeDisabled();
  await expect(input).toBeDisabled();
  const reading = page.locator("[data-home-backup]").getByRole("status");
  await expect(reading).toHaveText("Back-up lezen…");
  await expect(reading).toHaveAttribute("aria-live", "polite");
  // Native disabled activation cannot open another chooser or replace this read.
  await backup.evaluate((element: HTMLButtonElement) => element.click());
  await expect(page.locator("html")).toHaveAttribute("data-home-backup-reads", "1");

  await page.getByRole("button", { name: "Instellingen", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  await expect(settings.locator('input[type="file"]')).toBeDisabled();
  await expect(settings.getByRole("status")).toHaveText("Back-up lezen…");
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
  await page.evaluate(() => {
    const readWindow = window as unknown as { finishHomeBackupRead: (text: string) => void; restoreHomeBackupRead: () => void };
    readWindow.restoreHomeBackupRead();
    readWindow.finishHomeBackupRead("{}");
  });
  await expect(page.getByRole("alert")).toContainText("Ongeldig bestand");
  await expect(backup).toBeEnabled();
  await expect(input).toBeEnabled();
  await expect(reading).toHaveCount(0);
  await input.setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ source: "backup", profiles: [PROFILE_ALEX] })) });
  await expect(page.getByRole("link", { name: "Alex Dominant openen" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kink-profiles")!).state.profiles.map((profile: { id: string }) => profile.id))).toEqual([PROFILE_ALEX.id]);
});

test("invalid scan retains its diagnosis, offers a fresh-code retry and remains dismissible", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: () => Promise.reject(new Error("camera unavailable")) } });
  });
  await seedAndGo(page, "/", [], { onboardingComplete: true });
  const scanTrigger = page.getByRole("button", { name: /^Scan gedeeld profiel\b/ });
  await scanTrigger.click();
  const scanner = page.getByRole("dialog", { name: "QR-code scannen" });
  const alert = page.getByRole("alert");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(scanner).toBeVisible();
    await scanner.getByLabel("Profiel-link of code").fill("3r.beschadigd");
    await scanner.getByRole("button", { name: "Importeer", exact: true }).click();
    await expect(scanner).toBeHidden();
    await expect(alert).toContainText("Profielcode is ongeldig of beschadigd.");
    await expect(alert).toContainText("Vraag een nieuwe code aan de persoon die het profiel deelt.");
    await expect(scanTrigger).toBeFocused();
    if (attempt < 2) {
      const retry = alert.getByRole("button", { name: "Opnieuw scannen" });
      await retry.focus();
      await page.keyboard.press("Enter");
      await expect(alert).toHaveCount(0);
      await expect(scanner).toBeVisible();
      if (attempt === 0) {
        // Retry then cancel must return to the persistent Home control.
        await page.keyboard.press("Escape");
        await expect(scanner).toBeHidden();
        await expect(scanTrigger).toBeFocused();
        await page.keyboard.press("Enter");
      }
      // The final attempt follows keyboard retry with another invalid result.
    }
  }
  await alert.getByRole("button", { name: "Sluit foutmelding" }).click();
  await expect(alert).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kink-profiles")!).state.profiles)).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  test(`Home clarity ${theme} empty and populated captures keep help and action hierarchy`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    for (const populated of [false, true]) {
      await seedAndGo(page, "/", populated ? [PROFILE_ALEX, SHARED_SAM] : [], { onboardingComplete: true });
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const help = page.getByRole("navigation", { name: "Hulp bij KinkSync" });
      await expect(help.getByRole("link", { name: "Over KinkSync" })).toHaveAttribute("href", "/about");
      await expect(help.getByRole("link", { name: "Privacy & veiligheid" })).toHaveAttribute("href", "/security");
      for (const link of await help.getByRole("link").all()) {
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      if (populated) {
        const compare = page.locator("[data-home-compare-feature]");
        await expect(compare).toContainText("Vergelijk overeenkomsten, bespreekpunten en grenzen.");
        await expect(page.locator("[data-home-profile-actions]")).toHaveCSS("border-top-width", "0px");
      } else {
        const scan = page.getByRole("button", { name: /^Scan gedeeld profiel\b/ });
        await expect(scan).toHaveCSS("border-top-width", "0px");
        await expect(scan).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(page.getByText("Heb je al een back-up?", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Importeer back-up", exact: true })).toBeVisible();
        const contrast = await page.locator("[data-home-empty-card]").evaluate((card) => {
          // Read the browser's resolved opaque gradient stops, including its
          // color-mix composition, rather than comparing raw palette tokens.
          const background = getComputedStyle(card).backgroundImage;
          const stops = background.match(/(?:rgba?|color|oklab|oklch|lab|lch)\([^()]*\)/g);
          if (stops?.length !== 2) throw new Error(`Expected two resolved Home gradient stops: ${background}`);
          const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
          const rgb = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const pixel = Array.from(context.getImageData(0, 0, 1, 1).data);
            if (pixel[3] !== 255) throw new Error(`Home contrast requires an opaque resolved color: ${color}`);
            return pixel.slice(0, 3);
          };
          const luminance = (channels: number[]) => channels.map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
          const backgrounds = stops.map((stop) => luminance(rgb(stop)));
          const targets = Array.from(card.querySelectorAll('[data-home-backup] p, [data-home-backup] button, nav a, :scope > div:first-child > p'));
          const scanHelper = Array.from(card.querySelectorAll("span")).find((element) => element.textContent === "Bekijk wat iemand met je heeft gedeeld");
          if (!scanHelper) throw new Error("Missing Home scan supporting text");
          targets.push(scanHelper);
          return targets.filter((element) => element.textContent?.trim()).map((element) => {
            const foreground = getComputedStyle(element).color;
            const light = luminance(rgb(foreground));
            return {
              text: element.textContent!.trim(), foreground, background,
              minimum: Math.min(...backgrounds.map((surface) => (Math.max(light, surface) + 0.05) / (Math.min(light, surface) + 0.05))),
            };
          });
        });
        for (const metric of contrast) expect(metric.minimum, `${theme} composed Home: ${metric.text}`).toBeGreaterThanOrEqual(4.5);
        await testInfo.attach(`home-empty-${theme}-composed-contrast`, { body: JSON.stringify(contrast, null, 2), contentType: "application/json" });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/home-clarity-${theme}-${populated ? "populated" : "empty"}.png`, fullPage: true });
    }
  });

  test(`Home masthead fits 320px with 200% actual text in ${theme} online and offline`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 667 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme });
    await seedAndGo(page, "/", [], { onboardingComplete: true });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await page.evaluate(async () => { await document.fonts.ready; });
    expect(await page.locator("html").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBe(32);
    const masthead = page.locator("[data-home-masthead]");
    const wordmark = masthead.locator("[data-home-nav-wordmark]");
    expect(await wordmark.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(72);
    await expect(wordmark).toHaveText("KinkSync");
    await expect(masthead.locator("[data-home-subtitle]")).toHaveText("Verken grenzen. Samen.");
    for (const offline of [false, true]) {
      if (offline) {
        await page.context().setOffline(true);
        await page.evaluate(() => window.dispatchEvent(new Event("offline")));
        await expect(masthead.getByRole("status", { name: "Offline" })).toBeVisible();
      }
      const geometry = await masthead.evaluate((element) => {
        const trigger = element.querySelector('[data-testid="home-topnav-settings"]')!.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        const identity = element.querySelector("[data-home-identity]")!;
        const text: Array<{ left: number; right: number; top: number; bottom: number }> = [];
        const walker = document.createTreeWalker(identity, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          for (const rect of Array.from(range.getClientRects())) text.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
        }
        return {
          trigger: { width: trigger.width, height: trigger.height, left: trigger.left },
          bounds: { top: bounds.top, bottom: bounds.bottom },
          text,
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        };
      });
      expect(geometry.trigger.width).toBeGreaterThanOrEqual(44);
      expect(geometry.trigger.height).toBeGreaterThanOrEqual(44);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      for (const rect of geometry.text) {
        expect(rect.left).toBeGreaterThanOrEqual(0);
        expect(rect.right).toBeLessThanOrEqual(geometry.trigger.left + 1);
        expect(rect.top).toBeGreaterThanOrEqual(geometry.bounds.top - 1);
        expect(rect.bottom).toBeLessThanOrEqual(geometry.bounds.bottom + 1);
      }
    }
    await page.context().setOffline(false);
    await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/home-clarity-${theme}-320-text-200.png`, fullPage: true });
  });
}
