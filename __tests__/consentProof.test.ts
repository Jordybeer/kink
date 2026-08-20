import { describe, expect, it } from "vitest";
import type { ConsentLedgerEvent, Profile } from "@/types";
import {
  createConsentLedgerEvent,
  createConsentSnapshot,
  generateProfileOwnerKey,
  PROFILE_CONSENT_FINGERPRINT_BITS,
  profileConsentAlias,
  profileConsentFingerprint,
  projectSceneConsentAgreement,
  sceneMatchesConsentAgreement,
  signProfileConsent,
  verifyConsentLedger,
  verifyConsentLedgerEvent,
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

  it("derives a stable 80-bit readable fingerprint from the canonical code and key", () => {
    const fingerprint = profileConsentFingerprint("KS-7H3P-9Q2M-A4BC", "key-a");
    expect(PROFILE_CONSENT_FINGERPRINT_BITS).toBe(80);
    expect(fingerprint).toBe("HQT3-KF1R-4T5D-Q9BW");
    expect(fingerprint).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
    expect(profileConsentFingerprint("KS-7H3P-9Q2M-A4BC", "key-a")).toBe(fingerprint);
  });

  it("keeps a broad deterministic key sample distinct within the 80-bit space", () => {
    const fingerprints = new Set(Array.from({ length: 4096 }, (_, index) => (
      profileConsentFingerprint("KS-7H3P-9Q2M-A4BC", `key-${index}`)
    )));
    expect(fingerprints.size).toBe(4096);
    expect(profileConsentFingerprint("KS-7H3P-9Q2M-A4BC", "key-a"))
      .not.toBe(profileConsentFingerprint("KS-7H3P-9Q2M-A4BC", "key-b"));
    expect(profileConsentFingerprint("KS-7H3P-9Q2M-A4BC", "key-a"))
      .not.toBe(profileConsentFingerprint("KS-8J4R-5T6V-W7XY", "key-a"));
  });

  it("keeps the display alias stable without exposing the technical code", () => {
    const alias = profileConsentAlias(profile());
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
      profileId: original.id,
      profileName: original.name,
      createdAt: 10,
      snapshot: snapshot!,
    }, signed.ownerKey);
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

  it("rejects an unsigned locked event", async () => {
    const unsigned = {
      id: "unsigned",
      sceneId: "scene-1",
      type: "locked",
      createdAt: 1,
      eventHash: "hash-zonder-handtekening",
    } as ConsentLedgerEvent;
    expect(await verifyConsentLedgerEvent(unsigned)).toBe(false);
  });
});
