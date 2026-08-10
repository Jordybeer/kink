import fs from "node:fs";

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Niet gevonden in ${path}: ${before.slice(0, 100)}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Niet uniek in ${path}`);
  fs.writeFileSync(path, source.slice(0, index) + after + source.slice(index + before.length));
}

function replaceAllExact(path, before, after) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Niet gevonden in ${path}: ${before}`);
  fs.writeFileSync(path, source.split(before).join(after));
}

// Zustand persist: v19-installaties moeten ook alle later retired directionality IDs opschonen.
replaceOnce("lib/storeCore.ts", "      version: 19,", "      version: 20,");
replaceOnce(
  "lib/storeCore.ts",
  "        if (version < 19 && state.profiles) {\n          state.profiles = state.profiles.map(stripDeprecatedDirectionalProfile);\n        }",
  "        if (version < 20 && state.profiles) {\n          state.profiles = state.profiles.map(stripDeprecatedDirectionalProfile);\n        }",
);

// Unit-regressie op de echte core persist migrate hook, niet op de guarded facade.
replaceOnce(
  "__tests__/directionality.test.ts",
  `import { sanitizeProfileFull } from "@/lib/sanitizeProfile";\nimport type { KinkEntry, Profile, ProfilePerspective } from "@/types";`,
  `import { sanitizeProfileFull } from "@/lib/sanitizeProfile";\nimport { useStore as coreUseStore } from "@/lib/storeCore";\nimport type { KinkEntry, Profile, ProfilePerspective } from "@/types";`,
);
replaceOnce(
  "__tests__/directionality.test.ts",
  `  it("sanitizes and shares both explicit directions independently", () => {`,
  `  it("migreert een bestaande v19 store naar v20 zonder ambigue directionality te behouden", async () => {
    const options = coreUseStore.persist.getOptions();
    expect(options.version).toBe(20);
    expect(options.migrate).toBeDefined();

    const profile = ownProfile("dominant", {
      spanking_hand: { status: "yes", comment: "oud C" },
      anal_sex: { status: "willing", comment: "oud B" },
      praise_kink: { status: "maybe", comment: "blijft" },
    });
    const migrated = await Promise.resolve(options.migrate!({ profiles: [profile] }, 19));
    const profiles = (migrated as unknown as { profiles: Profile[] }).profiles;

    expect(profiles[0].entries.spanking_hand).toBeUndefined();
    expect(profiles[0].entries.anal_sex).toBeUndefined();
    expect(profiles[0].entries.spanking_hand_give).toBeUndefined();
    expect(profiles[0].entries.spanking_hand_receive).toBeUndefined();
    expect(profiles[0].entries.praise_kink?.status).toBe("maybe");
  });

  it("sanitizes and shares both explicit directions independently", () => {`,
);

// Browserfixtures zaaien de actuele v20 schema en concrete counterparts.
const fixtures = "e2e/fixtures.ts";
replaceAllExact(fixtures, "spanking_hand:", "spanking_hand_give:");
let fixtureSource = fs.readFileSync(fixtures, "utf8");
const samMarker = "export const PROFILE_SAM: Profile = {";
const samStart = fixtureSource.indexOf(samMarker);
if (samStart < 0) throw new Error("PROFILE_SAM fixture ontbreekt");
const samPart = fixtureSource.slice(samStart)
  .replace("spanking_hand_give:", "spanking_hand_receive:")
  .replace("blindfold:", "blindfold_receive:")
  .replace("rope_bondage:", "rope_bondage_receive:")
  .replace("flogging:", "flogging_receive:");
fixtureSource = fixtureSource.slice(0, samStart) + samPart;
fixtureSource = fixtureSource
  .replace("blindfold:", "blindfold_give:")
  .replace("rope_bondage:", "rope_bondage_give:")
  .replace("flogging:", "flogging_give:")
  .replace("    version: 18,", "    version: 20,");
fs.writeFileSync(fixtures, fixtureSource);

for (const [oldId, newId] of [
  ["spanking_hand", "spanking_hand_give"],
  ["spanking_implement", "spanking_implement_give"],
  ["flogging", "flogging_give"],
]) {
  replaceAllExact("e2e/ui-audit.spec.ts", oldId, newId);
}

replaceAllExact("e2e/scene.spec.ts", `spanking_hand: { status: "yes", comment: "" }`, `spanking_hand_give: { status: "yes", comment: "" }`);
let scene = fs.readFileSync("e2e/scene.spec.ts", "utf8");
const receiveBlocks = ["DIRECTIONAL_SCENE_B_RECEIVE", "DIRECTIONAL_SCENE_B_GIVE"];
for (const marker of receiveBlocks) {
  const start = scene.indexOf(`const ${marker} = {`);
  if (start < 0) throw new Error(`${marker} ontbreekt`);
  const nextConst = scene.indexOf("\nconst ", start + 1);
  const end = nextConst < 0 ? scene.indexOf("\ntest.describe", start) : nextConst;
  if (end < 0) throw new Error(`${marker} einde ontbreekt`);
  const block = scene.slice(start, end).replace("spanking_hand_give:", "spanking_hand_receive:");
  scene = scene.slice(0, start) + block + scene.slice(end);
}
scene = scene.replaceAll(
  `getByRole("button", { name: "Spanking (hand)" })`,
  `getByRole("button", { name: "Spanking (hand) — geven ↔ ontvangen" })`,
);
fs.writeFileSync("e2e/scene.spec.ts", scene);

replaceOnce(
  "e2e/compare.spec.ts",
  `test("match-indicatie is zichtbaar (spanking_hand = yes/yes)", async ({ page }) => {`,
  `test("match-indicatie is zichtbaar voor complementaire spanking give/receive", async ({ page }) => {`,
);

console.log("v20 directionality migratie en actuele browserfixtures toegepast.");
