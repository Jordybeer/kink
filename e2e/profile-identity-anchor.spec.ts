import { expect, test } from "@playwright/test";
import type { Profile, ProfileIdentityAnchor } from "@/types";
import {
  createProfileIdentityAnchor,
} from "@/lib/profileIdentityTrust";
import {
  generateProfileOwnerKey,
  signProfileConsent,
} from "@/lib/consentProof";
import { encodeProfileV3 } from "@/lib/profileShareV3";
import { seedProfiles } from "./fixtures";

const ANCHOR_STORAGE_KEY = "kinksync-profile-identity-anchors";
const PROFILE_STORE_KEY = "kink-profiles";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "phase4-contact",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Riley",
    role: "Dominant",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 2,
    entries: {},
    origin: "own",
    ...overrides,
  };
}

async function seal(source: Profile) {
  const key = await generateProfileOwnerKey(source.id);
  const signed = await signProfileConsent(source, key);
  return {
    profile: { ...source, consentProof: signed.proof },
    ownerKey: signed.ownerKey,
  };
}

async function openSharedProfile(page: Parameters<typeof seedProfiles>[0], encoded: string) {
  await page.goto(`/#p3=${encodeURIComponent(encoded)}`);
  await expect(page.getByText("Identiteit onafhankelijk vergelijken", { exact: true })).toBeVisible();
}

test("independent first-contact confirmation persists a real identity anchor", async ({ page }) => {
  const sealed = await seal(profile());
  const encoded = await encodeProfileV3(sealed.profile);

  await seedProfiles(page, []);
  await openSharedProfile(page, encoded);

  await expect(page.getByText("Digitale handtekening geldig is niet hetzelfde als identiteit bevestigd.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Codes onafhankelijk vergeleken. Bevestig en importeer" })).toBeDisabled();

  await page.getByRole("button", { name: "Rechtstreeks op hun toestel" }).click();
  await page.getByRole("button", { name: "Codes onafhankelijk vergeleken. Bevestig en importeer" }).click();

  await expect.poll(async () => page.evaluate(({ anchorKey, profileKey, profileId }) => {
    const registry = JSON.parse(localStorage.getItem(anchorKey) ?? "null") as { schema?: number; anchors?: ProfileIdentityAnchor[] } | null;
    const store = JSON.parse(localStorage.getItem(profileKey) ?? "null") as { state?: { profiles?: Profile[] } } | null;
    return {
      anchor: registry?.anchors?.find((candidate) => candidate.profileId === profileId) ?? null,
      imported: !!store?.state?.profiles?.some((candidate) => candidate.id === profileId),
    };
  }, {
    anchorKey: ANCHOR_STORAGE_KEY,
    profileKey: PROFILE_STORE_KEY,
    profileId: sealed.profile.id,
  })).toMatchObject({
    anchor: {
      schema: 1,
      profileId: sealed.profile.id,
      verificationCode: sealed.profile.verificationCode,
      keyId: sealed.profile.consentProof?.keyId,
      method: "source-device-fingerprint",
    },
    imported: true,
  });
});

test("identity conflict blocks confirmation and offers no import-anyway path", async ({ page }) => {
  const trusted = await seal(profile({ origin: "shared", isImported: true }));
  const anchor = createProfileIdentityAnchor(
    trusted.profile,
    trusted.profile.consentProof!,
    1234,
    "source-device-fingerprint",
  );

  const attackerSource = profile({ origin: "own" });
  const attackerKey = await generateProfileOwnerKey(attackerSource.id);
  const attackerSigned = await signProfileConsent(attackerSource, attackerKey);
  const attacker = { ...attackerSource, consentProof: attackerSigned.proof };
  const encoded = await encodeProfileV3(attacker);

  await seedProfiles(page, [trusted.profile]);
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, value);
  }, {
    key: ANCHOR_STORAGE_KEY,
    value: JSON.stringify({ schema: 1, anchors: [anchor] }),
  });

  await page.goto(`/#p3=${encodeURIComponent(encoded)}`);

  await expect(page.getByText("Identiteitsconflict. Import geblokkeerd.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Codes onafhankelijk vergeleken. Bevestig en importeer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Importeer als|Importeer profiel|Bevestig en importeer/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open bestaand profiel" })).toBeVisible();

  const persisted = await page.evaluate((key) => localStorage.getItem(key), ANCHOR_STORAGE_KEY);
  expect(JSON.parse(persisted ?? "null")).toEqual({ schema: 1, anchors: [anchor] });
});

test("scanner closes when a decoded candidate opens independent confirmation", async ({ page }) => {
  const sealed = await seal(profile());
  const encoded = await encodeProfileV3(sealed.profile);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new Error("camera disabled in test")) },
    });
  });
  await seedProfiles(page, []);
  await page.goto("/");
  await page.getByRole("button", { name: "Scan gedeeld profiel" }).click();
  const scanner = page.getByRole("dialog", { name: "QR-code scannen" });
  await expect(scanner).toBeVisible();
  await scanner.getByLabel("Profiel-link of code", { exact: true }).fill(`#p3=${encoded}`);
  await scanner.getByRole("button", { name: "Importeer", exact: true }).click();
  await expect(page.getByText("Identiteit onafhankelijk vergelijken", { exact: true })).toBeVisible();
  await expect(scanner).not.toBeVisible();
});

test("an existing identical signed contact can be independently anchored without replacing local data", async ({ page }) => {
  const sealed = await seal(profile());
  const encoded = await encodeProfileV3(sealed.profile);
  const existing = { ...sealed.profile, origin: "shared" as const, isImported: true, lockedAt: 50, privateNote: "Local context" };
  await seedProfiles(page, [existing]);
  await openSharedProfile(page, encoded);
  await page.getByRole("button", { name: "Via een apart kanaal" }).click();
  await page.getByRole("button", { name: "Codes onafhankelijk vergeleken. Bevestig en importeer" }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null")?.anchors?.length ?? 0, ANCHOR_STORAGE_KEY)).toBe(1);
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null").state.profiles, PROFILE_STORE_KEY);
  expect(stored).toEqual([existing]);
});


test("failed profile persistence rolls back the newly confirmed identity anchor", async ({ page }) => {
  const sealed = await seal(profile());
  const encoded = await encodeProfileV3(sealed.profile);
  await seedProfiles(page, []);
  await openSharedProfile(page, encoded);
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "kink-profiles") throw new DOMException("full", "QuotaExceededError");
      originalSetItem.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Rechtstreeks op hun toestel" }).click();
  await page.getByRole("button", { name: "Codes onafhankelijk vergeleken. Bevestig en importeer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Het profiel kon niet exact" })).toBeVisible();
  const stored = await page.evaluate(({ anchorKey, profileKey }) => ({
    anchors: JSON.parse(localStorage.getItem(anchorKey) ?? "null")?.anchors ?? [],
    profiles: JSON.parse(localStorage.getItem(profileKey) ?? "null")?.state?.profiles ?? [],
  }), { anchorKey: ANCHOR_STORAGE_KEY, profileKey: PROFILE_STORE_KEY });
  expect(stored).toEqual({ anchors: [], profiles: [] });
});


test("a deleted contact is explicitly restored under its unchanged retained identity", async ({ page }, testInfo) => {
  const sealed = await seal(profile());
  const encoded = await encodeProfileV3(sealed.profile);
  const anchor = createProfileIdentityAnchor(sealed.profile, sealed.profile.consentProof!, 1234, "source-device-fingerprint");
  await seedProfiles(page, []);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: ANCHOR_STORAGE_KEY, value: JSON.stringify({ schema: 1, anchors: [anchor] }),
  });
  await page.goto(`/#p3=${encodeURIComponent(encoded)}`);
  await expect(page.getByText("Gedeeld profiel herstellen?", { exact: true })).toBeVisible();
  await expect(page.getByText(/De identiteit bewijst niet hoe recent deze versie is/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Codes onafhankelijk vergeleken. Bevestig en importeer" })).toHaveCount(0);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.getByText("Gedeeld profiel herstellen?", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Herstel gedeeld profiel", exact: true })).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.screenshot({ path: `screenshots/theme-rehearsal/${testInfo.project.name}/anchored-restore-${theme}.png`, fullPage: false });
  }
  await page.getByRole("button", { name: "Herstel gedeeld profiel", exact: true }).click();
  await expect.poll(() => page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key) ?? "null")?.state?.profiles?.find((candidate: Profile) => candidate.id === id) ?? null, { key: PROFILE_STORE_KEY, id: sealed.profile.id })).toMatchObject({
    origin: "shared", isImported: true, consentProof: sealed.profile.consentProof,
  });
  const stored = await page.evaluate(({ anchors, profiles }) => ({
    registry: JSON.parse(localStorage.getItem(anchors) ?? "null"),
    keys: JSON.parse(localStorage.getItem(profiles) ?? "null")?.state?.profileOwnerKeys,
  }), { anchors: ANCHOR_STORAGE_KEY, profiles: PROFILE_STORE_KEY });
  expect(stored.registry).toEqual({ schema: 1, anchors: [anchor] });
  expect(stored.keys).toEqual([]);
});
