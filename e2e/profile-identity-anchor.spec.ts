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
  await expect(page.getByRole("button", { name: "Codes onafhankelijk vergeleken — bevestig en importeer" })).toBeDisabled();

  await page.getByRole("button", { name: "Rechtstreeks op hun toestel" }).click();
  await page.getByRole("button", { name: "Codes onafhankelijk vergeleken — bevestig en importeer" }).click();

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

  await expect(page.getByText("Identiteitsconflict — import geblokkeerd.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Codes onafhankelijk vergeleken — bevestig en importeer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Importeer als|Importeer profiel|Bevestig en importeer/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open bestaand profiel" })).toBeVisible();

  const persisted = await page.evaluate((key) => localStorage.getItem(key), ANCHOR_STORAGE_KEY);
  expect(JSON.parse(persisted ?? "null")).toEqual({ schema: 1, anchors: [anchor] });
});
