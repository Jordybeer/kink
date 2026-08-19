import { expect, test } from "@playwright/test";
import type { Profile, ProfileIdentityAnchor } from "@/types";
import {
  generateProfileOwnerKey,
  signProfileConsent,
} from "@/lib/consentProof";
import {
  contractPairKey,
  contractParticipantFromProfile,
  contractSummaryFromContent,
  hashContractContent,
  type ContractSeries,
  type ContractVersionContent,
} from "@/lib/contractLifecycle";
import { createContractRequest } from "@/lib/contractProtocol";
import { encodeContractEnvelope } from "@/lib/contractQr";
import { createProfileIdentityAnchor } from "@/lib/profileIdentityTrust";
import { seedAndGo } from "./fixtures";

const ANCHOR_STORAGE_KEY = "kinksync-profile-identity-anchors";

function profile(id: string, name: string, origin: "own" | "shared" = "own"): Profile {
  return {
    id,
    verificationCode: id === "phase5-e2e-a" ? "KS-7H3P-9Q2M-A4BC" : "KS-8J4R-5T6V-W7XY",
    name,
    role: id === "phase5-e2e-a" ? "Dominant" : "Submissive",
    experienceLevel: "ervaren",
    customKinks: [],
    entries: {},
    createdAt: 1,
    updatedAt: 2,
    origin,
    isImported: origin === "shared",
  };
}

async function signedShared(source: Profile) {
  const ownerKey = await generateProfileOwnerKey(source.id);
  const signed = await signProfileConsent({ ...source, origin: "own", isImported: false }, ownerKey);
  const shared = {
    ...source,
    origin: "shared" as const,
    isImported: true,
    consentProof: signed.proof,
  };
  const anchor = createProfileIdentityAnchor(
    shared,
    shared.consentProof,
    1234,
    "source-device-fingerprint",
  );
  return { profile: shared, ownerKey: signed.ownerKey, anchor };
}

function content(a: Profile, b: Profile): ContractVersionContent {
  return {
    schema: 1,
    profileA: contractParticipantFromProfile(a),
    profileB: contractParticipantFromProfile(b),
    preamble: "Consent blijft doorlopend.",
    createdAt: 100,
    signalsA: { green: "groen", amber: "oranje", red: "rood", black: "zwart" },
    signalsB: { green: "groen", amber: "oranje", red: "rood", black: "zwart" },
    aftercareA: [],
    aftercareB: [],
    shared: [],
    softLimits: [],
    hardLimits: [],
    hardLimitDetails: [],
    discuss: [],
  };
}

async function draftSeries(a: Profile, b: Profile): Promise<ContractSeries> {
  const body = content(a, b);
  const versionId = "phase5-e2e-version";
  return {
    id: "phase5-e2e-series",
    pairKey: contractPairKey(a.id, b.id),
    participants: [contractParticipantFromProfile(a), contractParticipantFromProfile(b)],
    status: "draft",
    createdAt: 100,
    updatedAt: 100,
    draftVersionId: versionId,
    versions: [{
      id: versionId,
      number: 1,
      createdAt: 100,
      updatedAt: 100,
      contentHash: await hashContractContent(body),
      content: body,
      summary: contractSummaryFromContent(body),
      state: "draft",
      signatures: [],
    }],
    events: [],
  };
}

async function persistAnchor(page: Parameters<typeof seedAndGo>[0], anchor: ProfileIdentityAnchor) {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: ANCHOR_STORAGE_KEY,
    value: JSON.stringify({ schema: 1, anchors: [anchor] }),
  });
}

test("signed-unanchored contact cannot start activation; anchoring unlocks the existing signing flow", async ({ page }) => {
  const local = profile("phase5-e2e-a", "Alex");
  const remote = await signedShared(profile("phase5-e2e-b", "Sam", "shared"));

  await seedAndGo(page, `/contract?a=${local.id}&b=${remote.profile.id}`, [local, remote.profile]);
  await page.getByRole("button", { name: "Contract bewaren of tekenen" }).click();
  await page.getByRole("button", { name: "Digitaal ondertekenen" }).click();

  await expect(page.getByRole("alert")).toContainText(/Bevestig eerst onafhankelijk de identiteit van de andere contractpartij/i);
  await expect(page.getByText("Tweede handtekening", { exact: true })).toHaveCount(0);

  await persistAnchor(page, remote.anchor);
  await page.getByRole("button", { name: "Digitaal ondertekenen" }).click();
  await expect(page.getByText("Tweede handtekening", { exact: true })).toBeVisible();
});

test("signed-unanchored incoming activation cannot be accepted; anchoring unlocks the unchanged response flow", async ({ page }) => {
  const actorSource = profile("phase5-e2e-a", "Alex");
  const actorKey = await generateProfileOwnerKey(actorSource.id);
  const signedActor = await signProfileConsent(actorSource, actorKey);
  const actor = { ...actorSource, consentProof: signedActor.proof };
  const trustedActor = {
    ...actor,
    origin: "shared" as const,
    isImported: true,
  };
  const actorAnchor = createProfileIdentityAnchor(
    trustedActor,
    trustedActor.consentProof,
    2345,
    "independent-channel-fingerprint",
  );
  const responder = profile("phase5-e2e-b", "Sam");
  const request = await createContractRequest({
    series: await draftSeries(actor, responder),
    action: "activate",
    actor,
    counterparty: responder,
    ownerKey: actorKey,
  });
  const encoded = encodeContractEnvelope(request.envelope);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new Error("camera disabled in test")) },
    });
  });
  await seedAndGo(page, "/contracts", [trustedActor, responder]);
  await page.getByRole("button", { name: "Contractverzoek scannen" }).click();
  const textarea = page.locator("textarea");
  await expect(textarea).toBeVisible();
  await textarea.fill(encoded);
  await page.getByRole("button", { name: "Code verwerken" }).click();

  await expect(page.getByRole("alert")).toContainText(/Bevestig eerst onafhankelijk de identiteit van Alex/i);
  await expect(page.getByRole("button", { name: "Contract ondertekenen" })).toHaveCount(0);

  await persistAnchor(page, actorAnchor);
  await page.getByRole("button", { name: "Scanner openen" }).click();
  await expect(page.locator("textarea")).toBeVisible();
  await page.locator("textarea").fill(encoded);
  await page.getByRole("button", { name: "Code verwerken" }).click();
  await expect(page.getByRole("button", { name: "Contract ondertekenen" })).toBeVisible();
  await page.getByRole("button", { name: "Contract ondertekenen" }).click();
  await expect(page.getByText("Antwoord terugsturen", { exact: true })).toBeVisible();
});
