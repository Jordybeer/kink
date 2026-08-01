import { describe, expect, it } from "vitest";
import type { Profile, SceneRecord } from "@/types";
import {
  createConsentLedgerEvent,
  createConsentSnapshot,
  generateProfileOwnerKey,
  projectSceneConsentAgreement,
  signProfileConsent,
} from "@/lib/consentProof";
import { verifySceneConsentRecord } from "@/lib/sceneConsentVerification";

function profile(id: string, name: string, code: string): Profile {
  return {
    id,
    verificationCode: code,
    name,
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 2,
    entries: {
      rope: { status: "yes", desire: 4, experienced: true, comment: "rustig" },
    },
    origin: "own",
  };
}

async function sealed(raw: Profile) {
  const key = await generateProfileOwnerKey(raw.id);
  const signed = await signProfileConsent(raw, key);
  return {
    profile: { ...raw, consentProof: signed.proof },
    key: signed.ownerKey,
  };
}

async function fixture() {
  const a = await sealed(profile("a", "Alex", "KS-7H3P-9Q2M-A4BC"));
  const b = await sealed(profile("b", "Bo", "KS-8J4R-5T6V-W7XY"));
  const snapshotA = await createConsentSnapshot(a.profile);
  const snapshotB = await createConsentSnapshot(b.profile);
  expect(snapshotA).not.toBeNull();
  expect(snapshotB).not.toBeNull();

  const scene: SceneRecord = {
    id: "scene-1",
    title: "Rope",
    profileAId: a.profile.id,
    profileBId: b.profile.id,
    profileAName: a.profile.name,
    profileBName: b.profile.name,
    items: [{
      id: "item-1",
      name: "Rope",
      intensity: "midden",
      duration: "10 min",
      note: "rustig",
      fromKink: true,
      kinkId: "rope",
    }],
    safeword: "rood",
    status: "planned",
    createdAt: 1,
    updatedAt: 1,
    consentSnapshots: { profileA: snapshotA!, profileB: snapshotB! },
  };
  const agreement = projectSceneConsentAgreement(scene, scene.consentSnapshots!);
  const locked = await createConsentLedgerEvent({
    id: "event-1",
    sceneId: scene.id,
    type: "locked",
    profileId: a.profile.id,
    profileName: a.profile.name,
    createdAt: 10,
    agreement,
    note: "start",
  }, a.key);

  return {
    a,
    b,
    scene: {
      ...scene,
      consentLockedAt: 10,
      consentAgreement: agreement,
      consentLedger: [locked],
    },
  };
}

describe("scene consent source verification", () => {
  it("accepts an intact agreement signed by a participating profile", async () => {
    const { scene } = await fixture();
    const result = await verifySceneConsentRecord(scene);
    expect(result.status).toBe("valid");
    if (result.status === "valid") expect(result.signedByProfileIds).toEqual(["a"]);
  });

  it("rejects a valid signature made by an unrelated key", async () => {
    const { scene } = await fixture();
    const stranger = await generateProfileOwnerKey("stranger");
    const forged = await createConsentLedgerEvent({
      id: "forged",
      sceneId: scene.id,
      type: "locked",
      profileId: "stranger",
      profileName: "Stranger",
      createdAt: 10,
      agreement: scene.consentAgreement,
      note: "start",
    }, stranger);

    const result = await verifySceneConsentRecord({ ...scene, consentLedger: [forged] });
    expect(result.status).toBe("invalid");
  });

  it("rejects a second locked event even when it uses the same valid agreement", async () => {
    const { a, scene } = await fixture();
    const first = scene.consentLedger![0];
    const duplicate = await createConsentLedgerEvent({
      id: "event-2",
      sceneId: scene.id,
      type: "locked",
      profileId: a.profile.id,
      profileName: a.profile.name,
      createdAt: 11,
      agreement: scene.consentAgreement,
      previousEventHash: first.eventHash,
    }, a.key);

    const result = await verifySceneConsentRecord({
      ...scene,
      consentLedger: [first, duplicate],
    });
    expect(result.status).toBe("invalid");
  });

  it("rejects edited event content even when the original signature remains", async () => {
    const { scene } = await fixture();
    const original = scene.consentLedger![0];
    const result = await verifySceneConsentRecord({
      ...scene,
      consentLedger: [{ ...original, note: "gewijzigd" }],
    });
    expect(result.status).toBe("invalid");
  });

  it("rejects a changed scene while preserving the original agreement", async () => {
    const { scene } = await fixture();
    const result = await verifySceneConsentRecord({ ...scene, safeword: "groen" });
    expect(result.status).toBe("invalid");
  });
});
