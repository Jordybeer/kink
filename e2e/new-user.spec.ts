import { test, expect } from "@playwright/test";

test.describe("Nieuwe gebruiker — volledig onboarding pad", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("onboarding zichtbaar na fresh start", async ({ page }) => {
    await expect(page.getByText("KinkSync").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^begin$/i })).toBeVisible();
  });

  test("directe app-deeplink kan onboarding niet overslaan", async ({ page }) => {
    await page.goto("/compare?a=e2bfd216-5f11-4af2-8f9e-c6f86e1c858b&b=db601c62-083c-406c-b4e9-f35fc36847a2");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /^begin$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profielen vergelijken" })).toHaveCount(0);
  });

  test("onbekende deeplink kan onboarding niet overslaan", async ({ page }) => {
    await page.goto("/this-route-is-not-collared");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /^begin$/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /hier is niets te vinden/i })).toHaveCount(0);
  });

  test("offline fallback blijft publiek, quarantine niet", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: "Je bent offline" })).toBeVisible();

    await page.goto("/quarantine");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: /^begin$/i })).toBeVisible();
  });

  test("doorloopt de rondleiding en landt rustig op home", async ({ page }) => {
    await page.getByRole("button", { name: /^begin$/i }).click();
    await expect(page.getByRole("heading", { name: "18+?" })).toBeVisible();
    await page.getByRole("button", { name: /18\+/i }).click();

    await expect(page.getByRole("heading", { name: /hoe klinkt dit voor jou/i })).toBeVisible();
    await expect(page.getByText("Heel graag")).toBeVisible();
    await page.getByRole("button", { name: /kom maar door/i }).click();

    await expect(page.getByRole("heading", { name: /leg jullie kaarten op tafel/i })).toBeVisible();
    await expect(page.getByText(/een match is nooit automatisch consent/i)).toBeVisible();
    await page.getByRole("button", { name: /^verder/i }).click();

    await expect(page.getByRole("heading", { name: /niet voor iedere pottenkijker/i })).toBeVisible();
    // Was /privacy voorop/. Die claim luidde "Volledig offline" en beloofde meer
    // dan de architectuur waarmaakt: /about zegt zelf dat de hosting appcode en
    // updates serveert. De belofte die hier telt is dat de antwoorden niet
    // vertrekken, en die staat er nog steeds.
    await expect(page.getByText(/antwoorden vertrekken niet/i)).toBeVisible();
    await page.getByRole("button", { name: "Niet nu" }).click();

    await expect(page.getByRole("heading", { name: /genoeg voorspel/i })).toBeVisible();
    await page.getByRole("button", { name: /kluisschijf.*kinksync/i }).press("Enter");

    // Onboarding rondt af op home. Profielaanmaak blijft een bewuste volgende tik.
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: /nieuw profiel maken/i })).not.toBeVisible();
    await expect(page.getByRole("dialog", { name: /welkom bij kinksync/i })).not.toBeVisible();
  });

  test("PIN-bevestiging houdt de numpad op exact dezelfde plek", async ({ page }) => {
    await page.getByRole("button", { name: /^begin$/i }).click();
    await page.getByRole("button", { name: /18\+/i }).click();
    await page.getByRole("button", { name: /kom maar door/i }).click();
    await page.getByRole("button", { name: /^verder/i }).click();

    await page.getByRole("button", { name: /pin instellen/i }).click();
    const tapPin = async () => {
      for (const digit of ["1", "2", "3", "4"]) {
        await page.getByRole("button", { name: digit, exact: true }).click();
      }
    };
    const pinPad = page.getByTestId("onboarding-pin-pad");
    const pinCopy = page.getByTestId("onboarding-pin-copy");
    const waitForPinPadAtRest = async () => {
      await expect.poll(
        () => pinPad.evaluate((element) => getComputedStyle(element).transform),
      ).toBe("none");
    };

    await expect(page.getByRole("heading", { name: /hou nieuwsgierige vingers buiten/i })).toBeVisible();
    await expect(pinCopy).toContainText("Hou ze voor jezelf.");
    expect(await pinCopy.evaluate((element) => element.scrollHeight > element.clientHeight + 1)).toBe(false);
    await waitForPinPadAtRest();
    const firstPadBox = await pinPad.boundingBox();
    expect(firstPadBox).not.toBeNull();

    await tapPin();
    await expect(page.getByRole("heading", { name: /nog één keer/i })).toBeVisible();
    await expect(pinCopy).toContainText("Dezelfde vier cijfers.");
    expect(await pinCopy.evaluate((element) => element.scrollHeight > element.clientHeight + 1)).toBe(false);
    await waitForPinPadAtRest();
    const secondPadBox = await pinPad.boundingBox();
    expect(secondPadBox).not.toBeNull();
    expect(Math.abs(secondPadBox!.y - firstPadBox!.y)).toBeLessThanOrEqual(1);

    await tapPin();
    await expect(page.getByRole("heading", { name: /liever met één blik|genoeg voorspel/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^begin$/i })).not.toBeVisible();
  });

  test("sla intro over springt naar de leeftijdscheck — nooit eromheen", async ({ page }) => {
    await page.getByRole("button", { name: /sla de introductie over/i }).click();
    await expect(page.getByRole("heading", { name: "18+?" })).toBeVisible();
    await page.getByRole("button", { name: /18\+/i }).click();

    // Skip trims the tour, nooit de consent-boodschap.
    await expect(page.getByRole("heading", { name: /leg jullie kaarten op tafel/i })).toBeVisible();
    await expect(page.getByText(/een match is nooit automatisch consent/i)).toBeVisible();
    await page.getByRole("button", { name: /naar kinksync/i }).click();
    await expect(page.getByRole("button", { name: "Begin met jouw profiel" })).toBeVisible();
  });

  test("lockout bij 'ik ben jonger'", async ({ page }) => {
    await page.getByRole("button", { name: /^begin$/i }).click();
    await expect(page.getByRole("heading", { name: "18+?" })).toBeVisible();
    await page.getByRole("button", { name: /jonger/i }).click();
    await expect(page.getByText(/kom terug als je 18 bent/i)).toBeVisible();
  });

  test("nieuw profiel aanmaken na onboarding blijft een expliciete keuze", async ({ page }) => {
    await page.getByRole("button", { name: /^begin$/i }).click();
    await page.getByRole("button", { name: /18\+/i }).click();
    await page.getByRole("button", { name: /kom maar door/i }).click();
    await page.getByRole("button", { name: /^verder/i }).click();
    await page.getByRole("button", { name: "Niet nu" }).click();
    await page.getByRole("button", { name: /kluisschijf.*kinksync/i }).press("Enter");

    await page.getByRole("button", { name: "Begin met jouw profiel" }).click();
    await page.getByLabel("Naam of alias").fill("Testmeester");
    await page.getByRole("button", { name: /^Dominant/ }).click();
    await page.getByRole("button", { name: "Verder" }).click();
    await page.getByRole("button", { name: "Start vragen" }).click();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/profile\/[^/]+\/questions$/);
    await expect(page.getByTestId("questions-screen")).toBeVisible();
    await expect(page.getByRole("group", { name: "Status kiezen" })).toBeVisible();
  });
});
