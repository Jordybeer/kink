import { describe, expect, it } from "vitest";
import type { Profile } from "@/types";
import {
  createConsentLedgerEvent,
  createConsentSnapshot,
  generateProfileOwnerKey,
  profileConsentAlias,
  projectSceneConsentAgreement,
  sceneMatchesConsentAgreement,
  signProfileConsent,
  verifyConsentLedger,
  verifyProfileConsent,
} from "@/lib/consentProof";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-owner",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [{ id: "custom", name: "Rope ritual" }],
    createdAt: 1,
    updatedAt: 2,
    entries: {
      rope: { status: "yes", desire: 5, experienced: true, comment: "langzaam", tags: ["vraag eerst"] },
      hidden: { status: "hard_no", comment: "privé", privateResponse: true },
    },
    origin: "own",
    ...overrides,
  };
}

describe("signed consent", () => {
  it("seals a profile and catches answer manipulation", async () => {
    const original = profile();
    const ownerKey = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, ownerKey);
    const sealed = { ...original, consentProof: signed.proof };
    expect((await verifyProfileConsent(sealed)).status).toBe("valid");
    expect((await verifyProfileConsent({
      ...sealed,
      entries: { ...sealed.entries, rope: { ...sealed.entries.rope, status: "hard_no" } },
    })).status).toBe("invalid");
  });

  it("chains newer versions to the previous proof", async () => {
    const original = profile();
    const key = await generateProfileOwnerKey(original.id);
    const first = await signProfileConsent(original, key);
    const changed = { ...original, consentProof: first.proof, entries: { ...original.entries, rope: { ...original.entries.rope, status: "willing" as const } } };
    const second = await signProfileConsent(changed, first.ownerKey);
    expect(second.proof.version).toBe(2);
    expect(second.proof.previousProofHash).toBe(first.proof.proofHash);
  });

  it("keeps hidden answers outside the signed snapshot", async () => {
    const original = profile();
    const key = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, key);
    const snapshot = await createConsentSnapshot({ ...original, consentProof: signed.proof });
    expect(snapshot?.payload.entries.rope.status).toBe("yes");
    expect(snapshot?.payload.entries.hidden).toBeUndefined();
  });

  it("uses a readable stable alias without replacing the technical identity", () => {
    const alias = profileConsentAlias(profile());
    expect(alias.split("-")).toHaveLength(3);
    expect(profileConsentAlias(profile())).toBe(alias);
    expect(alias).not.toContain("KS-");
  });

  it("binds the exact scene setlist to the locked consent version", async () => {
    const original = profile();
    const key = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, key);
    const sealed = { ...original, consentProof: signed.proof };
    const snapshot = await createConsentSnapshot(sealed);
    const scene = {
      id: "scene-terms", title: "Test", profileAId: original.id, profileBId: original.id,
      profileAName: "Alex", profileBName: "Alex", status: "planned" as const,
      items: [{ id: "item-1", name: "Rope", intensity: "midden" as const, duration: "10 min", note: "langzaam", fromKink: true, kinkId: "rope" }],
      safeword: "rood", createdAt: 1, updatedAt: 1,
      consentSnapshots: { profileA: snapshot!, profileB: snapshot! },
    };
    const agreement = projectSceneConsentAgreement(scene, scene.consentSnapshots);
    expect(sceneMatchesConsentAgreement({ ...scene, consentAgreement: agreement })).toBe(true);
    expect(sceneMatchesConsentAgreement({ ...scene, consentAgreement: agreement, safeword: "groen" })).toBe(false);
  });

  it("detects edits in the append-only scene ledger", async () => {
    const original = profile();
    const key = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, key);
    const sealed = { ...original, consentProof: signed.proof };
    const snapshot = await createConsentSnapshot(sealed);
    expect(snapshot).not.toBeNull();
    const locked = await createConsentLedgerEvent({
      id: "event-1",
      sceneId: "scene-1",
      type: "locked",
      createdAt: 10,
      snapshot: snapshot!,
    });
    const withdrawn = await createConsentLedgerEvent({
      id: "event-2",
      sceneId: "scene-1",
      type: "withdrawn",
      profileId: original.id,
      profileName: original.name,
      createdAt: 20,
      note: "stop",
      previousEventHash: locked.eventHash,
    }, signed.ownerKey);
    expect(await verifyConsentLedger([locked, withdrawn])).toBe(true);
    expect(await verifyConsentLedger([locked, { ...withdrawn, note: "doorgaan" }])).toBe(false);
  });
});
