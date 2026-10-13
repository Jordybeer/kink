import { expect, test, type Page } from "@playwright/test";
import { PROFILE_ALEX, seedProfiles } from "./fixtures";

async function openInstall(page: Page) {
  await page.getByRole("button", { name: "Meer opties" }).click();
  await page.getByRole("menuitem", { name: "Instellingen" }).click();
  const settings = page.getByRole("dialog", { name: "Instellingen" });
  await settings.locator("summary").filter({ hasText: "KinkSync installeren" }).click();
  return settings;
}

async function invite(page: Page, outcome: "accepted" | "dismissed" | "error") {
  return page.evaluate((choice) => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset.installCalls = String(
          Number(document.documentElement.dataset.installCalls ?? 0) + 1,
        );
        if (choice === "error") throw new Error("browser rejected invitation");
      },
      userChoice: Promise.resolve({ outcome: choice }),
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }, outcome);
}

test("installation is optional, consumes each invitation once, and recovers after failure", async ({ page }) => {
  await seedProfiles(page, [PROFILE_ALEX]);
  expect(await invite(page, "dismissed")).toBe(true);
  expect(await page.locator("html").getAttribute("data-install-calls")).toBeNull();
  const settings = await openInstall(page);
  await expect(settings.getByText("Installeren is geen back-up.", { exact: false })).toBeVisible();
  await settings.getByRole("button", { name: "Installeer KinkSync", exact: true }).click();
  await expect(settings.getByRole("status")).toContainText("Installatie overgeslagen");
  await expect(settings.getByRole("button", { name: "Installeer KinkSync", exact: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-install-calls", "1");

  await invite(page, "error");
  await settings.getByRole("button", { name: "Installeer KinkSync", exact: true }).click();
  await expect(settings.getByRole("status")).toContainText("Installatie kon niet starten");
  await invite(page, "accepted");
  await settings.getByRole("button", { name: "Installeer KinkSync", exact: true }).click();
  await expect(settings.getByRole("status")).toContainText("Volg de installatie");
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(settings.getByRole("status")).toContainText("KinkSync is toegevoegd");
  await expect(page.locator("html")).toHaveAttribute("data-install-calls", "3");
  await page.reload();
  await expect(page.getByRole("link", { name: "Alex Dominant openen" })).toBeVisible();
});

test("iPhone instructions are available without an install invitation", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "iPhone" });
  });
  await seedProfiles(page, [PROFILE_ALEX]);
  const settings = await openInstall(page);
  await expect(settings.getByText(/Tik op Delen/)).toBeVisible();
  await expect(settings.getByRole("button", { name: "Installeer KinkSync", exact: true })).toHaveCount(0);
  expect(await settings.evaluate((el) => el.scrollWidth > el.clientWidth + 1)).toBe(false);
});

test("installed iOS app hides installation controls", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
  });
  await seedProfiles(page, [PROFILE_ALEX]);
  await page.getByRole("button", { name: "Meer opties" }).click();
  await page.getByRole("menuitem", { name: "Instellingen" }).click();
  await expect(page.getByRole("dialog", { name: "Instellingen" })).toBeVisible();
  await expect(page.getByText("KinkSync installeren", { exact: true })).toHaveCount(0);
});

test("manifest and Apple metadata preserve the app identity and usable icons", async ({ page, request }) => {
  await seedProfiles(page, [PROFILE_ALEX]);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");
  const response = await request.get(href!);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/", start_url: "/", scope: "/", display: "standalone", name: "KinkSync" });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: "192x192", purpose: "any" }),
    expect.objectContaining({ sizes: "512x512", purpose: "any" }),
    expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
  ]));
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "KinkSync");
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "default");
});
