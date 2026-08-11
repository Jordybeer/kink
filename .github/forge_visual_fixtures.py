from pathlib import Path
import re


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one target, found {count}: {old[:80]!r}")
    p.write_text(text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, flags=0):
    p = Path(path)
    text = p.read_text()
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one regex target, found {count}: {pattern[:80]!r}")
    p.write_text(updated)


replace_once(
    "e2e/fixtures.ts",
    'import type { ContractSnapshot, Profile } from "@/types";',
    'import type { ContractSnapshot, Profile, SceneRecord } from "@/types";',
)
replace_once(
    "e2e/fixtures.ts",
    '  contracts: ContractSnapshot[];\n  contractSeries: ContractSeries[];',
    '  contracts: ContractSnapshot[];\n  contractSeries: ContractSeries[];\n  scenes: SceneRecord[];',
)
replace_once(
    "e2e/fixtures.ts",
    '      contracts: extras.contracts ?? [],\n      onboardingComplete:',
    '      contracts: extras.contracts ?? [],\n      scenes: extras.scenes ?? [],\n      onboardingComplete:',
)
replace_once("e2e/fixtures.ts", "    version: 20,", "    version: 21,")

screenshot_seed = '''const SEED = {
  state: {
    profiles: [{
      id:                 "demo-01",
      name:               "Alex",
      role:               "Dominant",
      perspective:        "dominant",
      origin:             "own",
      experienceLevel:    "diepgaand",
      relationshipStatus: "Single",
      createdAt:          Date.now() - 1000 * 60 * 60 * 24 * 30,
      updatedAt:          Date.now() - 1000 * 60 * 60 * 24,
      entries: {
        spanking_hand_give:       { status: "yes",     tags: [], comment: "" },
        spanking_implement_give:  { status: "willing", tags: [], comment: "" },
        flogging_give:            { status: "maybe",   tags: [], comment: "" },
        caning_give:              { status: "no",      tags: [], comment: "" },
        cropping_give:            { status: "hard_no", tags: [], comment: "" },
        rope_bondage_give:        { status: "yes",     tags: [], comment: "" },
        shibari_give:             { status: "willing", tags: [], comment: "" },
        handcuffs_give:           { status: "yes",     tags: [], comment: "" },
        leather_cuffs_give:       { status: "willing", tags: [], comment: "" },
        blindfold_give:           { status: "maybe",   tags: [], comment: "" },
        gag_ball_give:            { status: "no",      tags: [], comment: "" },
        sound_deprivation_give:   { status: "hard_no", tags: [], comment: "" },
      },
      customKinks: [],
    }],
    onboardingComplete: true,
    profileTourComplete: true,
    installPromptDismissed: true,
    appLockEnabled:     false,
    maxLevel:           4,
  },
  version: 21,
};'''
regex_once("scripts/screenshots.mjs", r'const SEED = \{.*?\n\};', screenshot_seed, re.S)

screenshot_assert = '''
async function assertSeedSurvived(page) {
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem("kink-profiles");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version,
      profiles: (parsed.state?.profiles ?? []).map((profile) => ({
        id: profile.id,
        entryIds: Object.keys(profile.entries ?? {}).sort(),
      })),
    };
  });
  const expected = SEED.state.profiles.map((profile) => ({
    id: profile.id,
    entryIds: Object.keys(profile.entries).sort(),
  }));
  if (!stored || stored.version !== SEED.version || JSON.stringify(stored.profiles) !== JSON.stringify(expected)) {
    throw new Error(`Screenshot seed drifted during hydration/migration: ${JSON.stringify(stored)}`);
  }
}
'''
replace_once("scripts/screenshots.mjs", "\nasync function shot(browser, name, fn) {", screenshot_assert + "\nasync function shot(browser, name, fn) {")
replace_once(
    "scripts/screenshots.mjs",
    '  await page.reload();\n  await page.waitForTimeout(800);\n  await fn(page);',
    '  await page.reload();\n  await page.waitForTimeout(800);\n  await assertSeedSurvived(page);\n  await fn(page);',
)
replace_once("scripts/screenshots.mjs", "  // Profile hero — spotlight + DNA bar + stats", "  // Profile hero — identity + stats")

profile_a = '''const PROFILE_A = {
  id: "alex-01",
  name: "Alex",
  role: "Dominant",
  perspective: "dominant",
  origin: "own",
  experienceLevel: "diepgaand",
  relationshipStatus: "Single",
  fetLifeUsername: "alex_kinkster",
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  entries: {
    spanking_hand_give:      { status: "yes",     tags: ["eerste keer"], comment: "" },
    spanking_implement_give: { status: "willing", tags: [],              comment: "" },
    flogging_give:           { status: "maybe",   tags: [],              comment: "" },
    caning_give:             { status: "no",      tags: [],              comment: "" },
    cropping_give:           { status: "hard_no", tags: [],              comment: "" },
    rope_bondage_give:       { status: "yes",     tags: ["alleen privé"], comment: "Voorzichtig met polsen" },
    shibari_give:            { status: "willing", tags: [],              comment: "" },
    handcuffs_give:          { status: "yes",     tags: [],              comment: "" },
    leather_cuffs_give:      { status: "willing", tags: [],              comment: "" },
    blindfold_give:          { status: "yes",     tags: [],              comment: "" },
    gag_ball_give:           { status: "willing", tags: [],              comment: "" },
    sound_deprivation_give:  { status: "maybe",   tags: [],              comment: "" },
    praise_kink:             { status: "yes",     tags: [],              comment: "" },
  },
  customKinks: [],
};'''
regex_once("scripts/audit-screenshots.mjs", r'const PROFILE_A = \{.*?\n\};', profile_a, re.S)

profile_b = '''const PROFILE_B = {
  id: "sam-02",
  name: "Sam",
  role: "Submissive",
  perspective: "submissive",
  origin: "own",
  experienceLevel: "ervaren",
  relationshipStatus: "Partner",
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
  updatedAt: Date.now() - 1000 * 60 * 60 * 12,
  entries: {
    spanking_hand_receive:      { status: "yes",     tags: [], comment: "" },
    spanking_implement_receive: { status: "yes",     tags: [], comment: "" },
    flogging_receive:           { status: "yes",     tags: [], comment: "" },
    caning_receive:             { status: "willing", tags: [], comment: "" },
    cropping_receive:           { status: "maybe",   tags: [], comment: "" },
    rope_bondage_receive:       { status: "yes",     tags: [], comment: "" },
    shibari_receive:            { status: "yes",     tags: [], comment: "" },
    handcuffs_receive:          { status: "yes",     tags: [], comment: "" },
    leather_cuffs_receive:      { status: "willing", tags: [], comment: "" },
    blindfold_receive:          { status: "yes",     tags: [], comment: "" },
    gag_ball_receive:           { status: "willing", tags: [], comment: "" },
    sound_deprivation_receive:  { status: "hard_no", tags: [], comment: "" },
    praise_kink:                { status: "yes",     tags: [], comment: "" },
  },
  customKinks: [],
};'''
regex_once("scripts/audit-screenshots.mjs", r'const PROFILE_B = \{.*?\n\};', profile_b, re.S)

scene = '''const SCENE = {
  id: "scene-01",
  title: "Avondsessie",
  profileAId: "alex-01",
  profileAName: "Alex",
  profileBId: "sam-02",
  profileBName: "Sam",
  items: [
    { id: "si-1", name: "Spanking (hand) — giving", intensity: "zacht",  duration: "10m", note: "Start zacht",  fromKink: true, kinkId: "spanking_hand_give" },
    { id: "si-2", name: "Rope bondage — tying",     intensity: "midden", duration: "20m", note: "",             fromKink: true, kinkId: "rope_bondage_give" },
    { id: "si-3", name: "Blindfold — applying",     intensity: "zacht",  duration: "—",   note: "Na de touwen", fromKink: true, kinkId: "blindfold_give" },
  ],
  plannedDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
  safeword: "rood",
  status: "planned",
  createdAt: Date.now() - 1000 * 60 * 60 * 6,
  updatedAt: Date.now() - 1000 * 60 * 60 * 2,
};'''
regex_once("scripts/audit-screenshots.mjs", r'const SCENE = \{.*?\n\};', scene, re.S)

audit_seed = '''const SEED = {
  state: {
    profiles: [PROFILE_A, PROFILE_B],
    scenes: [SCENE],
    onboardingComplete: true,
    profileTourComplete: true,
    installPromptDismissed: true,
    appLockEnabled: false,
    maxLevel: 4,
    theme: "midnight",
  },
  version: 21,
};'''
regex_once("scripts/audit-screenshots.mjs", r'const SEED = \{.*?\n\};', audit_seed, re.S)

audit_assert = '''
async function assertSeedSurvived(page) {
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem("kink-profiles");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version,
      profiles: (parsed.state?.profiles ?? []).map((profile) => ({
        id: profile.id,
        entryIds: Object.keys(profile.entries ?? {}).sort(),
      })),
      sceneIds: (parsed.state?.scenes ?? []).map((scene) => scene.id).sort(),
    };
  });
  const expectedProfiles = SEED.state.profiles.map((profile) => ({
    id: profile.id,
    entryIds: Object.keys(profile.entries).sort(),
  }));
  const expectedSceneIds = SEED.state.scenes.map((scene) => scene.id).sort();
  if (
    !stored
    || stored.version !== SEED.version
    || JSON.stringify(stored.profiles) !== JSON.stringify(expectedProfiles)
    || JSON.stringify(stored.sceneIds) !== JSON.stringify(expectedSceneIds)
  ) {
    throw new Error(`Audit seed drifted during hydration/migration: ${JSON.stringify(stored)}`);
  }
}
'''
replace_once("scripts/audit-screenshots.mjs", "\nasync function shot(browser, name, fn, { fullPage = false } = {}) {", audit_assert + "\nasync function shot(browser, name, fn, { fullPage = false } = {}) {")
replace_once(
    "scripts/audit-screenshots.mjs",
    '  await page.reload();\n  await page.waitForTimeout(900);\n  try {\n    await fn(page);\n  } catch (err) {\n    console.warn(`  ⚠ ${name} step error: ${err.message}`);\n  }',
    '  await page.reload();\n  await page.waitForTimeout(900);\n  await assertSeedSurvived(page);\n  await fn(page);',
)

test = '''import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEPRECATED_DIRECTIONAL_KINK_IDS } from "@/lib/directionality";
import { STORE_PERSIST_VERSION } from "@/lib/storeCore";
import { buildStore, PROFILE_ALEX } from "@/e2e/fixtures";
import type { SceneRecord } from "@/types";

const ROOT = process.cwd();
const MANUAL_AUDIT_SCRIPTS = ["scripts/screenshots.mjs", "scripts/audit-screenshots.mjs"] as const;

function source(pathname: string): string {
  return readFileSync(path.join(ROOT, pathname), "utf8");
}

describe("visual audit fixture contract", () => {
  it("keeps the shared e2e store on the live persist version and carries scenes", () => {
    const scene: SceneRecord = {
      id: "fixture-scene",
      title: "Fixture scene",
      profileAId: PROFILE_ALEX.id,
      profileBId: "fixture-b",
      profileAName: PROFILE_ALEX.name,
      profileBName: "B",
      items: [],
      status: "draft",
      createdAt: 1,
      updatedAt: 1,
    };
    const store = buildStore([PROFILE_ALEX], { scenes: [scene] });
    expect(store.version).toBe(STORE_PERSIST_VERSION);
    expect(store.state.scenes).toEqual([scene]);
  });

  it("keeps manual screenshot seeds current and free of retired directionality IDs", () => {
    for (const pathname of MANUAL_AUDIT_SCRIPTS) {
      const script = source(pathname);
      expect(script).toContain(`version: ${STORE_PERSIST_VERSION},`);
      expect(script).toContain("installPromptDismissed: true");
      for (const retiredId of DEPRECATED_DIRECTIONAL_KINK_IDS) {
        expect(script, `${pathname} still quotes retired ${retiredId}`).not.toContain(`"${retiredId}"`);
        expect(script, `${pathname} still seeds retired ${retiredId}`).not.toContain(`${retiredId}:`);
      }
    }
  });

  it("makes the global audit fail on broken steps instead of photographing past them", () => {
    const audit = source("scripts/audit-screenshots.mjs");
    expect(audit).not.toContain("step error:");
    expect(audit).toContain("await assertSeedSurvived(page);");
  });
});
'''
Path("__tests__/visualAuditFixtures.test.ts").write_text(test)

replace_once(
    "planned-changes.md",
    '- **e2e fixture rot guard**: `buildStore` still seeds persist `version: 8` — the migration wipes any seeded `scenes` (pre-v10 payloads get `scenes = []`). Bit the Phase 9 proof shots. Bump the fixture to v15 and teach `buildStore` extras to carry `scenes`/`contracts` so future specs don\'t rediscover this.',
    '- ~~**e2e fixture rot guard**~~ → **SHIPPED** — `buildStore` volgt nu de live persistversie en draagt scenes/contracts; de twee handmatige screenshot-audits gebruiken alleen actuele directionality-ID’s, zetten de installatiesheet uit en verifiëren na hydration dat profielen/entries/scenes exact zijn blijven staan. De globale audit slikt stapfouten niet langer in.',
)

with Path("corrections.md").open("a") as f:
    f.write('''
## 2026-08-11 — Mooie screenshots draaiden op fossiele seeds

**What went wrong:** `scripts/screenshots.mjs` en `scripts/audit-screenshots.mjs` stonden nog op persistversies 5 en 13 en gebruikten directionality-ID’s die meerdere migraties geleden waren retired. De globale audit slikte bovendien interactiefouten in en maakte daarna alsnog een screenshot. Daardoor kon een visuele audit overtuigend ogen terwijl Zustand entries/scenes had weggegooid of een stap nooit werkelijk was bereikt.

**Rule:** Een visuele proof-seed is testdata, geen demo-data. Iedere persist-bump of semantische ID-retirement moet de gedeelde e2e-builder én alle handmatige screenshotseeds meenemen. Manual audits seeden de actuele persistversie, gebruiken geen retired IDs, verifiëren na hydration exact hun profiel/entry/scene-identiteit en falen hard op een gebroken navigatie- of interactiestap.
''')
