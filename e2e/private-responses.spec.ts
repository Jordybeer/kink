import { expect, test } from "@playwright/test";
import {
  CONTRACT_ALEX_SAM,
  CONTRACT_SERIES_ALEX_SAM,
  PROFILE_ALEX,
  PROFILE_SAM,
  seedAndGo,
} from "./fixtures";

const SECRET_COMMENT = "DIT-MAG-NOOIT-UIT-PRIVE";

test("contract never renders a concealed response beside a public hard limit", async ({ page }) => {
  const alex = {
    ...PROFILE_ALEX,
    entries: {
      ...PROFILE_ALEX.entries,
      humiliation_verbal: {
        status: "yes" as const,
        score: null,
        desire: 5,
        comment: SECRET_COMMENT,
        privateResponse: true,
      },
    },
  };

  await seedAndGo(
    page,
    "/contract?a=pw-alex-001&b=pw-sam-002",
    [alex, PROFILE_SAM],
  );

  await expect(page.getByText("Harde grenzen", { exact: true })).toBeVisible();
  await expect(page.getByText(SECRET_COMMENT, { exact: true })).toHaveCount(0);
  await expect(page.getByText("Alex verlangen:", { exact: false })).toHaveCount(0);
});

test("scene suggestions ignore concealed status and usage history", async ({ page }) => {
  const alex = {
    ...PROFILE_ALEX,
    entries: {
      ...PROFILE_ALEX.entries,
      spanking_hand: {
        ...PROFILE_ALEX.entries.spanking_hand,
        usedInScene: 7,
        privateResponse: true,
      },
    },
  };
  const sam = {
    ...PROFILE_SAM,
    entries: {
      ...PROFILE_SAM.entries,
      spanking_hand: {
        ...PROFILE_SAM.entries.spanking_hand,
        usedInScene: 4,
      },
    },
  };

  await seedAndGo(
    page,
    "/scene?a=pw-alex-001&b=pw-sam-002",
    [alex, sam],
    {
      contracts: [CONTRACT_ALEX_SAM],
      contractSeries: [CONTRACT_SERIES_ALEX_SAM],
    },
  );
  await page.getByRole("button", { name: "Kinks toevoegen" }).click();

  await expect(page.getByRole("heading", { name: "Toevoegen aan setlist" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spanking (hand)" })).toHaveCount(0);
});
