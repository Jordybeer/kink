import { expect, test } from "@playwright/test";
import { KINKS } from "@/lib/kinks";
import type { KinkStatus, Profile } from "@/types";
import { PROFILE_ALEX, PROFILE_SAM, seedAndGo } from "../e2e/fixtures";

const STATUSES_A: Exclude<KinkStatus, null>[] = ["hard_no", "yes", "willing", "maybe", "no"];
const STATUSES_B: Exclude<KinkStatus, null>[] = ["yes", "yes", "maybe", "willing", "no"];

function denseProfile(base: Profile, suffix: string, statuses: Exclude<KinkStatus, null>[]): Profile {
  return {
    ...base,
    id: `${base.id}-${suffix}`,
    name: `${base.name} ${suffix}`,
    entries: Object.fromEntries(KINKS.map((kink, index) => [
      kink.id,
      {
        status: statuses[index % statuses.length],
        score: null,
        comment: index % 9 === 0
          ? `Context bij ${kink.name}: rustig opbouwen, tussendoor afstemmen en zonder uitleg kunnen stoppen.`
          : "",
      },
    ])),
  };
}

const PROFILE_A = denseProfile(PROFILE_ALEX, "print", STATUSES_A);
const PROFILE_B = denseProfile(PROFILE_SAM, "print", STATUSES_B);

test("print-native vergelijking blijft volledig en artefactvrij", async ({ page }, testInfo) => {
  await seedAndGo(page, `/compare?a=${PROFILE_A.id}&b=${PROFILE_B.id}`, [PROFILE_A, PROFILE_B]);
  await page.emulateMedia({ media: "print" });

  const printDocument = page.getByTestId("compare-print-document");
  await expect(printDocument).toBeVisible();
  await expect(page.locator(".compare-kink-row").first()).toBeHidden();
  await expect(printDocument.getByText("Overlap is geen toestemming.", { exact: false }).first()).toBeVisible();
  await expect(printDocument.getByRole("heading", { name: /Harde grenzen/ })).toBeVisible();
  await expect(printDocument.getByRole("heading", { name: /Te bespreken/ })).toBeVisible();
  await expect(printDocument.getByRole("heading", { name: /Verschillen/ })).toBeVisible();
  await expect(printDocument.getByRole("heading", { name: /Overlap/ })).toBeVisible();
  await expect(page.locator("button:visible, textarea:visible, input:visible, [role=dialog]:visible")).toHaveCount(0);
  expect(await printDocument.locator("tbody tr").count()).toBeGreaterThan(50);

  const sectionTops = await printDocument.locator(".compare-print-section").evaluateAll((sections) =>
    sections.map((section) => section.getBoundingClientRect().top));
  expect(sectionTops).toEqual([...sectionTops].sort((left, right) => left - right));

  const geometry = await printDocument.evaluate((node) => ({
    left: node.getBoundingClientRect().left,
    right: node.getBoundingClientRect().right,
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport + 1);

  const captureWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const sliceHeight = 4_000;
  await page.setViewportSize({ width: captureWidth, height: sliceHeight });

  const captureHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const lastTop = Math.max(0, captureHeight - sliceHeight);
  const sliceTops = Array.from(
    new Set([
      ...Array.from({ length: Math.ceil(captureHeight / sliceHeight) }, (_, index) => index * sliceHeight),
      lastTop,
    ]),
  ).filter((top) => top <= lastTop);

  for (const [index, top] of sliceTops.entries()) {
    await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), top);
    await page.screenshot({
      path: `test-results/print-screenshots/${testInfo.project.name}/compare-print-${String(index + 1).padStart(2, "0")}.png`,
    });
  }
});
