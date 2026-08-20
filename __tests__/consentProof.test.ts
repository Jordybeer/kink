import { describe, expect, it } from "vitest";
import type { ConsentLedgerEvent, Profile, ProfileConsentPayload, ProfileConsentProof, ProfileOwnerKey } from "@/types";
import {
  canonicalJson,
  createConsentLedgerEvent,
  createConsentSnapshot,
  generateProfileOwnerKey,
  profileConsentAlias,
  projectProfileConsent,
  projectSceneConsentAgreement,
  sceneMatchesConsentAgreement,
  sha256Base64Url,
  signProfileConsent,
  verifyConsentLedger,
  verifyConsentLedgerEvent,
  verifyProfileConsent,
} from "@/lib/consentProof";
import { getProfileVerificationCode } from "@/lib/profileVerification";

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

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function legacyPayload(source: Profile): ProfileConsentPayload {
  const core = projectProfileConsent(source);
  return {
    ...core,
    ...(source.bdsmtestUrl ? { bdsmtestUrl: source.bdsmtestUrl } : {}),
    ...(source.bdsmtestScores?.length ? { bdsmtestScores: source.bdsmtestScores } : {}),
  };
}

async function signLegacyProfile(source: Profile, ownerKey: ProfileOwnerKey): Promise<ProfileConsentProof> {
  const payloadHash = await sha256Base64Url(canonicalJson(legacyPayload(source)));
  const unsigned = {
    schema: 1 as const,
    algorithm: "ECDSA-P256-SHA256" as const,
    keyId: ownerKey.keyId,
    publicKeyJwk: ownerKey.publicKeyJwk,
    version: 1,
    signedAt: 1234,
    payloadHash,
  };
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    ownerKey.privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = bytesToBase64Url(new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(canonicalJson(unsigned)),
  )));
  const withoutHash = { ...unsigned, signature };
  return {
    ...withoutHash,
    proofHash: await sha256Base64Url(canonicalJson(withoutHash)),
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

  it("keeps optional BDSMTest enrichment outside the core profile proof", async () => {
    const original = profile({
      bdsmtestUrl: "https://bdsmtest.org/r/original",
      bdsmtestScores: [{ role: "Switch", pct: 88 }],
    });
    const ownerKey = await generateProfileOwnerKey(original.id);
    const signed = await signProfileConsent(original, ownerKey);
    const sealed = { ...original, consentProof: signed.proof };

    expect((await verifyProfileConsent(sealed)).status).toBe("valid");
    expect((await verifyProfileConsent({
      ...sealed,
      bdsmtestUrl: "https://bdsmtest.org/r/later",
      bdsmtestScores: [{ role: "Rigger", pct: 72 }],
    })).status).toBe("valid");
    expect(projectProfileConsent(sealed)).not.toHaveProperty("bdsmtestUrl");
    expect(projectProfileConsent(sealed)).not.toHaveProperty("bdsmtestScores");
  });

  it("still verifies a shared legacy proof that bound BDSMTest into the signed payload", async () => {
    const original = profile({
      id: "legacy-shared",
      origin: "shared",
      isImported: true,
      bdsmtestUrl: "https://bdsmtest.org/r/legacy",
      bdsmtestScores: [{ role: "Switch", pct: 91 }],
    });
    const ownerKey = await generateProfileOwnerKey(original.id);
    const proof = await signLegacyProfile(original, ownerKey);
    const sealed = { ...original, consentProof: proof };

    expect((await verifyProfileConsent(sealed)).status).toBe("valid");
    const snapshot = await createConsentSnapshot(sealed);
    expect(snapshot?.payload.bdsmtestUrl).toBe(original.bdsmtestUrl);
    expect(snapshot?.payload.bdsmtestScores).toEqual(original.bdsmtestScores);
  });

  it("does not silently keep legacy enrichment semantics for an own profile", async () => {
    const original = profile({
      id: "legacy-own",
      bdsmtestUrl: "https://bdsmtest.org/r/legacy-own",
      bdsmtestScores: [{ role: "Switch", pct: 91 }],
    });
    const ownerKey = await generateProfileOwnerKey(original.id);
    const proof = await signLegacyProfile(original, ownerKey);
    expect((await verifyProfileConsent({ ...original, consentProof: proof })).status).toBe("invalid");
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
    expect(alias.split("-")).toHaveLength(4);
    expect(profileConsentAlias(profile())).toBe(alias);
    expect(alias).not.toContain("KS-");
    expect(getProfileVerificationCode(profile())).toContain("KS-");
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
