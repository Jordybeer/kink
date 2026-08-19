import { describe, expect, it } from "vitest";
import type { Profile, ProfileIdentityAnchor } from "@/types";
import { createProfileIdentityAnchor } from "@/lib/profileIdentityTrust";
import {
  classifyProfileImportWithIdentityAnchor,
} from "@/lib/profileVerification";

const FIRST_PROOF = {
  schema: 1 as const,
  algorithm: "ECDSA-P256-SHA256" as const,
  keyId: "key-a",
  publicKeyJwk: { kty: "EC", crv: "P-256", x: "x", y: "y" },
  version: 1,
  signedAt: 1,
  payloadHash: "payload-1",
  signature: "sig-1",
  proofHash: "proof-1",
};

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-a",
    verificationCode: "KS-7H3P-9Q2M-A4BC",
    name: "Alex",
    role: "Switch",
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 100,
    updatedAt: 200,
    entries: {},
    origin: "shared",
    isImported: true,
    consentProof: FIRST_PROOF,
    ...overrides,
  };
}

function anchorFor(profile: Profile): ProfileIdentityAnchor {
  return createProfileIdentityAnchor(profile, "word-one word-two word-three word-four", "in-person", 1234);
}

describe("anchor-aware profile import classification", () => {
  it("classifies a signed profile without an anchor as new-unanchored", () => {
    const incoming = makeProfile();
    expect(classifyProfileImportWithIdentityAnchor([], incoming, [])).toEqual({
      kind: "new-unanchored",
      code: incoming.verificationCode,
    });
  });

  it("classifies a matching anchored chained proof as anchored-update", () => {
    const existing = makeProfile();
    const anchor = anchorFor(existing);
    const incoming = makeProfile({
      consentProof: {
        ...FIRST_PROOF,
        version: 2,
        signedAt: 2,
        payloadHash: "payload-2",
        signature: "sig-2",
        proofHash: "proof-2",
        previousProofHash: FIRST_PROOF.proofHash,
      },
    });

    expect(classifyProfileImportWithIdentityAnchor([existing], incoming, [anchor])).toMatchObject({
      kind: "anchored-update",
      profile: existing,
      anchor,
    });
  });

  it("fails closed when a known anchored verification code arrives under another key", () => {
    const existing = makeProfile();
    const anchor = anchorFor(existing);
    const incoming = makeProfile({
      consentProof: { ...FIRST_PROOF, keyId: "key-attacker" },
    });

    expect(classifyProfileImportWithIdentityAnchor([existing], incoming, [anchor])).toMatchObject({
      kind: "identity-conflict",
      anchor,
      reason: "key-id",
    });
  });

  it("fails closed when an anchored profile id arrives with a substituted verification code", () => {
    const existing = makeProfile();
    const anchor = anchorFor(existing);
    const incoming = makeProfile({ verificationCode: "KS-8J4R-5T6V-W7XY" });

    expect(classifyProfileImportWithIdentityAnchor([existing], incoming, [anchor])).toMatchObject({
      kind: "identity-conflict",
      anchor,
      reason: "verification-code",
    });
  });

  it("fails closed when an anchored verification code is claimed under another profile id", () => {
    const existing = makeProfile();
    const anchor = anchorFor(existing);
    const incoming = makeProfile({ id: "attacker-profile" });

    expect(classifyProfileImportWithIdentityAnchor([existing], incoming, [anchor])).toMatchObject({
      kind: "identity-conflict",
      anchor,
      reason: "profile-id",
    });
  });

  it("classifies unsigned legacy material as legacy-unverified even when an anchor exists", () => {
    const existing = makeProfile();
    const anchor = anchorFor(existing);
    const incoming = makeProfile({ consentProof: undefined });

    expect(classifyProfileImportWithIdentityAnchor([existing], incoming, [anchor])).toMatchObject({
      kind: "legacy-unverified",
      profile: existing,
    });
  });

  it("keeps the same name and role with a different identity new-unanchored", () => {
    const existing = makeProfile();
    const anchor = anchorFor(existing);
    const incoming = makeProfile({
      id: "profile-b",
      verificationCode: "KS-8J4R-5T6V-W7XY",
      consentProof: { ...FIRST_PROOF, keyId: "key-b" },
    });

    expect(classifyProfileImportWithIdentityAnchor([existing], incoming, [anchor])).toMatchObject({
      kind: "new-unanchored",
      profile: existing,
    });
  });

  it("never upgrades an exact anchored profile replay without a newer chained proof", () => {
    const existing = makeProfile();
    const anchor = anchorFor(existing);

    expect(classifyProfileImportWithIdentityAnchor([existing], existing, [anchor])).toMatchObject({
      kind: "identity-conflict",
      anchor,
      reason: "lineage",
    });
  });
});
