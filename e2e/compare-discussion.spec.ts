import { test, expect } from "@playwright/test";
import { seedAndGo, PROFILE_ALEX, PROFILE_SAM } from "./fixtures";

test("Besproken keeps opposite directions separate and refreshes both tabs", async ({ page, context }) => {
  const url = "/compare?a=pw-alex-001&b=pw-sam-002";
  const entries = {
    pegging_give: { status: "maybe" as const, comment: "" },
    pegging_receive: { status: "maybe" as const, comment: "" },
  };
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seedAndGo(page, url, [
    { ...PROFILE_ALEX, entries, customKinks: [] },
    { ...PROFILE_SAM, entries, customKinks: [] },
  ]);
  const other = await context.newPage();
  other.on("pageerror", (error) => errors.push(error.message));
  await other.goto(url);
  const forward = /Pegging, Alex geeft · Sam ontvangt als (niet )?besproken markeren/;
  const reverse = /Pegging, Alex ontvangt · Sam geeft als (niet )?besproken markeren/;
  const first = page.getByRole("button", { name: forward });
  const second = other.getByRole("button", { name: reverse });
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(second).toHaveAttribute("aria-pressed", "false");

  await first.click();
  await expect(other.getByRole("button", { name: forward })).toHaveAttribute("aria-pressed", "true");
  await expect(second).toHaveAttribute("aria-pressed", "false");
  await second.click();
  await expect(page.getByRole("button", { name: reverse })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: reverse })).toHaveAttribute("aria-pressed", "true");
  await first.click();
  await expect(other.getByRole("button", { name: forward })).toHaveAttribute("aria-pressed", "false");
  await expect(second).toHaveAttribute("aria-pressed", "true");

  await other.reload();
  await expect(other.getByRole("button", { name: forward })).toHaveAttribute("aria-pressed", "false");
  await expect(second).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
  await other.close();
});
