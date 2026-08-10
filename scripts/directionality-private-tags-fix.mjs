import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(path, before, after) {
  const source = readFileSync(path, "utf8");
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: verwacht 1 match, kreeg ${count}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replaceOnce(
  "app/scene/page.tsx",
  `import { visibleStatus, visibleUsedInScene } from "@/lib/privateResponses";`,
  `import { comparableEntry, visibleStatus, visibleUsedInScene } from "@/lib/privateResponses";`,
);

replaceOnce(
  "app/scene/page.tsx",
  `    const pair = directionalComparisonEntries(profileA?.entries, profileB?.entries, kinkId);\n    const tags = [...new Set([...(pair.sourceEntry.tags ?? []), ...(pair.partnerEntry.tags ?? [])])];`,
  `    const pair = directionalComparisonEntries(profileA?.entries, profileB?.entries, kinkId);\n    const sourceEntry = comparableEntry(pair.sourceEntry);\n    const partnerEntry = comparableEntry(pair.partnerEntry);\n    const tags = [...new Set([...(sourceEntry.tags ?? []), ...(partnerEntry.tags ?? [])])];`,
);

const path = "e2e/scene.spec.ts";
const source = readFileSync(path, "utf8");
const marker = `houdt tags van een private directionele counterpart verborgen`;
if (source.includes(marker)) throw new Error("private tag regressietest bestaat al");
writeFileSync(path, `${source.trimEnd()}\n\ntest("${marker}", async ({ page }) => {\n  const privateA = {\n    ...DIRECTIONAL_SCENE_A,\n    entries: {\n      ...DIRECTIONAL_SCENE_A.entries,\n      pegging_give: { status: "yes", comment: "", tags: ["publiek"], usedInScene: 1 },\n    },\n  } satisfies typeof PROFILE_ALEX;\n  const privateB = {\n    ...DIRECTIONAL_SCENE_B_RECEIVE,\n    entries: {\n      ...DIRECTIONAL_SCENE_B_RECEIVE.entries,\n      pegging_receive: {\n        status: "yes", comment: "", tags: ["GEHEIME-PARTNER-TAG"], privateResponse: true,\n      },\n    },\n  } satisfies typeof PROFILE_SAM;\n\n  await seedAndGo(page, "/scene?a=pw-alex-001&b=pw-sam-002", [privateA, privateB], {\n    contracts: [CONTRACT_ALEX_SAM],\n    contractSeries: [CONTRACT_SERIES_ALEX_SAM],\n  });\n  await page.getByRole("button", { name: "Kinks toevoegen" }).click();\n  const mostUsed = page.getByText("Meest gebruikt", { exact: true }).locator("..");\n  await mostUsed.getByRole("button", { name: "Pegging — geven ↔ ontvangen" }).click();\n  await page.getByRole("button", { name: "Sluiten" }).click();\n\n  await expect(page.getByText("publiek", { exact: true })).toBeVisible();\n  await expect(page.getByText("GEHEIME-PARTNER-TAG", { exact: true })).toHaveCount(0);\n});\n`, "utf8");

console.log("private directionality tags fixed");
