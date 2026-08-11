import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, text) => fs.writeFileSync(path, text);

function replaceOnce(text, needle, replacement, label) {
  const first = text.indexOf(needle);
  if (first === -1) throw new Error(`Ontbrekende meetlat-anchor: ${label}`);
  if (text.indexOf(needle, first + needle.length) !== -1) throw new Error(`Niet-unieke meetlat-anchor: ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + needle.length);
}

function edit(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (after === before) throw new Error(`Geen wijziging in ${path}`);
  write(path, after);
}

edit("e2e/fixtures.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`import type { ContractSnapshot, Profile } from "@/types";
import type { ContractSeries } from "@/lib/contractLifecycle";`,
`import type { ContractSnapshot, Profile, SceneRecord } from "@/types";
import type { ContractSeries } from "@/lib/contractLifecycle";
import { STORE_PERSIST_VERSION } from "@/lib/storeCore";
import { KINKS } from "@/lib/kinks";`,
"fixture imports");

  text = replaceOnce(text,
`const SEED_GUARD = "kinksync-e2e-store-seeded";
`,
`const SEED_GUARD = "kinksync-e2e-store-seeded";
const ACTIVE_KINK_IDS = new Set(KINKS.map((kink) => kink.id));

function assertCurrentProfileEntries(profiles: Profile[]) {
  for (const profile of profiles) {
    const customIds = new Set(profile.customKinks.map((kink) => kink.id));
    for (const kinkId of Object.keys(profile.entries)) {
      if (!ACTIVE_KINK_IDS.has(kinkId) && !customIds.has(kinkId)) {
        throw new Error(
          `E2E seed ${profile.name} (${profile.id}) gebruikt retired of onbekende kink-ID: ${kinkId}`,
        );
      }
    }
  }
}
`,
"seed ID guard");

  text = replaceOnce(text,
`  contractSeries: ContractSeries[];
  onboardingComplete: boolean;`,
`  contractSeries: ContractSeries[];
  scenes: SceneRecord[];
  onboardingComplete: boolean;`,
"scene extras type");

  text = replaceOnce(text,
`      contracts: extras.contracts ?? [],
      onboardingComplete: extras.onboardingComplete ?? true,`,
`      contracts: extras.contracts ?? [],
      scenes: extras.scenes ?? [],
      onboardingComplete: extras.onboardingComplete ?? true,`,
"scene state seed");

  text = replaceOnce(text,
`    version: 20,
`,
`    version: STORE_PERSIST_VERSION,
`,
"live persist version");

  text = replaceOnce(text,
`  const serialized = JSON.stringify(buildStore(profiles, extras));`,
`  assertCurrentProfileEntries(profiles);
  const serialized = JSON.stringify(buildStore(profiles, extras));`,
"validate before serialization");
  return text;
});

edit("e2e/device-launch.smoke.ts", (source) => {
  let text = source;
  text = replaceOnce(text,
`import { expect, test } from "@playwright/test";`,
`import { expect, test, type Page } from "@playwright/test";
import { STORE_PERSIST_VERSION } from "@/lib/storeCore";`,
"device imports");

  text = replaceOnce(text,
`const ROUTES = [
  { slug: "home", url: "/" },
  { slug: "profile", url: \`/profile/\${PROFILE_ALEX.id}\` },
  { slug: "compare", url: \`/compare?a=\${PROFILE_ALEX.id}&b=\${PROFILE_SAM.id}\` },
  { slug: "contract", url: \`/contract?a=\${PROFILE_ALEX.id}&b=\${PROFILE_SAM.id}\` },
  { slug: "scene", url: \`/scene?a=\${PROFILE_ALEX.id}&b=\${PROFILE_SAM.id}\` },
] as const;
`,
`const ROUTES = [
  { slug: "home", url: "/" },
  { slug: "profile", url: \`/profile/\${PROFILE_ALEX.id}\` },
  { slug: "compare", url: \`/compare?a=\${PROFILE_ALEX.id}&b=\${PROFILE_SAM.id}\` },
  { slug: "contract", url: \`/contract?a=\${PROFILE_ALEX.id}&b=\${PROFILE_SAM.id}\` },
  { slug: "scene", url: \`/scene?a=\${PROFILE_ALEX.id}&b=\${PROFILE_SAM.id}\` },
] as const;

type RouteSlug = (typeof ROUTES)[number]["slug"];

async function expectRouteReady(page: Page, slug: RouteSlug) {
  switch (slug) {
    case "home":
      await expect(page.getByRole("link", { name: "Alex Dominant openen" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Sam Submissive openen" })).toBeVisible();
      return;
    case "profile":
      await expect(page.getByText("Alex", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("tab", { name: "Overzicht" })).toBeVisible();
      return;
    case "compare":
      await expect(page.getByText("Spanking (hand) — geven ↔ ontvangen", { exact: true }).first()).toBeVisible();
      return;
    case "contract":
      await expect(page.getByText("Gedeelde verlangens", { exact: true }).first()).toBeVisible();
      expect(await page.locator("canvas").count()).toBeGreaterThan(0);
      return;
    case "scene":
      await expect(page.getByRole("button", { name: "Kinks toevoegen" })).toBeVisible();
      await expect(page.getByText("Lege setlist", { exact: true })).toBeVisible();
      return;
  }
}
`,
"route readiness helper");

  text = replaceOnce(text,
`  for (const route of ROUTES) {`,
`  const seededStore = await page.evaluate(() => {
    const raw = localStorage.getItem("kink-profiles");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; state?: { profiles?: unknown[] } };
    return { version: parsed.version, profileCount: parsed.state?.profiles?.length ?? 0 };
  });
  expect(seededStore).toEqual({ version: STORE_PERSIST_VERSION, profileCount: 2 });

  for (const route of ROUTES) {`,
"seed proof");

  text = replaceOnce(text,
`    const layout = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      textLength: document.body.innerText.trim().length,
    }));`,
`    await expectRouteReady(page, route.slug);

    const layout = await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));`,
"readiness before layout");

  text = replaceOnce(text,
`    expect(layout.textLength, \`\${route.slug} rendered an empty page\`).toBeGreaterThan(30);

`,
``,
"remove vacuous text length");
  return text;
});

edit("docs/public-launch-roadmap.md", (source) => replaceOnce(source,
`# FASE 0 — Release-meetlat betrouwbaar maken

**Doel:** vóór we meer screenshots, Soft Gate-QA of polish vertrouwen, moet de testomgeving de huidige app werkelijk representeren.`,
`# FASE 0 — Release-meetlat betrouwbaar maken

**Status:** 0A in uitvoering — centrale seed op live persistversie, stale-ID fail-fast en route-specifieke device-readiness. 0B breidt daarna de screenshotmatrix uit naar de resterende verplichte surfaces.

**Doel:** vóór we meer screenshots, Soft Gate-QA of polish vertrouwen, moet de testomgeving de huidige app werkelijk representeren.`,
"roadmap Phase 0 status"));

edit("planned-changes.md", (source) => replaceOnce(source,
`- **e2e fixture rot guard**: \`buildStore\` still seeds persist \`version: 8\` — the migration wipes any seeded \`scenes\` (pre-v10 payloads get \`scenes = []\`). Bit the Phase 9 proof shots. Bump the fixture to v15 and teach \`buildStore\` extras to carry \`scenes\`/\`contracts\` so future specs don't rediscover this.`,
`- **e2e fixture rot guard** → **0A IN UITVOERING**: de live audit vond de seed inmiddels op v20 terwijl de app v24 gebruikt. De centrale fixture gaat rechtstreeks aan \`STORE_PERSIST_VERSION\` hangen, valideert alle seed-entry-IDs fail-fast en draagt \`scenes\`/\`contracts\` expliciet. De device-smoke vervangt de vacuously-green tekstlengtecheck door route-specifieke readiness; daarna volgt 0B voor de bredere screenshotmatrix.`,
"fixture rot backlog"));

console.log("Release-meetlat 0A transform klaar.");
