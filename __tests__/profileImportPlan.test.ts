import { describe, expect, it } from "vitest";
import type { Profile, ProfileConsentProof } from "@/types";
import { planSafeProfileImport } from "@/lib/storeSecurity";

const proof: ProfileConsentProof = {
  schema: 1,
  algorithm: "ECDSA-P256-SHA256",
  keyId: "key-a",
  publicKeyJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
  version: 1,
  signedAt: 1,
  payloadHash: "payload-1",
  signature: "signature-1",
  proofHash: "proof-1",
};

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-a",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    entries: {},
    createdAt: 1,
    updatedAt: 1,
    origin: "shared",
    isImported: true,
    consentProof: proof,
    ...overrides,
  };
}

describe("safe profile import plan", () => {
  it("plans a new signed contact without mutating the current profile array", () => {
    const existing: Profile[] = [];
    const incoming = profile();
    const plan = planSafeProfileImport(existing, [incoming], 1234);

    expect(existing).toEqual([]);
    expect(plan.acceptedCount).toBe(1);
    expect(plan.rejectedProfileIds).toEqual([]);
    expect(plan.profiles).toEqual([{ ...incoming, lockedAt: 1234 }]);
  });

  it("plans an exact-id chained update and preserves local-only metadata", () => {
    const existing = profile({ privateNote: "lokaal", avatarDataUrl: "data:image/png;base64,x" });
    const incoming = profile({
      consentProof: {
        ...proof,
        version: 2,
        previousProofHash: proof.proofHash,
        proofHash: "proof-2",
      },
      privateNote: undefined,
      avatarDataUrl: undefined,
    });
    const plan = planSafeProfileImport([existing], [incoming], 1234);

    expect(plan.acceptedCount).toBe(1);
    expect(plan.profiles[0]).toMatchObject({
      id: existing.id,
      consentProof: incoming.consentProof,
      privateNote: "lokaal",
      avatarDataUrl: "data:image/png;base64,x",
    });
  });

  it("rejects a same-code signed profile with another id without rewriting its signed identity", () => {
    const existing = profile({ id: "old-id", consentProof: undefined });
    const incoming = profile({ id: "signed-new-id" });
    const plan = planSafeProfileImport([existing], [incoming], 1234);

    expect(plan.acceptedCount).toBe(0);
    expect(plan.rejectedProfileIds).toEqual([incoming.id]);
    expect(plan.profiles).toEqual([existing]);
    expect(plan.profiles.some((candidate) => candidate.id === incoming.id)).toBe(false);
  });
});
