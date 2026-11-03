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
      spanking_hand_give: {
        ...PROFILE_ALEX.entries.spanking_hand_give,
        usedInScene: 7,
        privateResponse: true,
      },
    },
  };
  const sam = {
    ...PROFILE_SAM,
    entries: {
      ...PROFILE_SAM.entries,
      spanking_hand_receive: {
        ...PROFILE_SAM.entries.spanking_hand_receive,
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

test("privéantwoorden behouden het compacte overzicht en veilig inline bewerken", async ({ page }) => {
  const alex = {
    ...PROFILE_ALEX,
    entries: {
      ...PROFILE_ALEX.entries,
      spanking_hand_give: {
        ...PROFILE_ALEX.entries.spanking_hand_give,
        status: "yes" as const,
        comment: "ALLEEN-VOOR-MIJ-LEZEN",
        privateResponse: true,
      },
    },
  };
  await seedAndGo(page, `/profile/${PROFILE_ALEX.id}`, [alex]);
  const privateToggle = page.getByTestId("profile-read-private");
  await expect(privateToggle).toBeVisible();
  await expect(page.getByText("ALLEEN-VOOR-MIJ-LEZEN")).toHaveCount(0);
  await privateToggle.click();
  const privateContent = page.locator("#profile-read-private-content");
  await expect(privateContent).toBeVisible();
  await expect(privateContent.getByText("ALLEEN-VOOR-MIJ-LEZEN")).toHaveCount(0);
  await privateContent.getByRole("button", { name: /Privéantwoord voor .* tonen/ }).first().click();
  await expect(privateContent.getByText("ALLEEN-VOOR-MIJ-LEZEN")).toBeVisible();
  await privateContent.getByRole("button", { name: /Spanking.* bewerken/ }).first().click();
  await expect(privateContent.getByTestId("profile-inline-editor")).toBeVisible();
  await privateToggle.click();
  await expect(page.getByText("ALLEEN-VOOR-MIJ-LEZEN")).toHaveCount(0);
  // Collapsing private answers also clears the explicit reveal; reopening must re-mask them.
  await privateToggle.click();
  await expect(privateContent.getByText("ALLEEN-VOOR-MIJ-LEZEN")).toHaveCount(0);
  await expect(privateContent.getByRole("button", { name: /Privéantwoord voor .* tonen/ }).first()).toBeVisible();
});
