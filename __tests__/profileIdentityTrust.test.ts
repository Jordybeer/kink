import { describe, expect, it } from "vitest";
import type { Profile, ProfileConsentProof, ProfileIdentityAnchor } from "@/types";
import {
  createProfileIdentityAnchor,
  isProfileIdentityAnchor,
  matchProfileIdentityAnchor,
  resolveProfileIdentityTrust,
} from "@/lib/profileIdentityTrust";

const proof: ProfileConsentProof = {
  schema: 1,
  algorithm: "ECDSA-P256-SHA256",
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
    consentProof: proof,
    name: "Alex",
    role: "Switch",
    origin: "shared",
    isImported: true,
    experienceLevel: "ervaren",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries: {},
    ...overrides,
  };
}

function makeAnchor(profile = makeProfile()): ProfileIdentityAnchor {
  return createProfileIdentityAnchor(
    profile,
    profile.consentProof!,
    1234,
    "source-device-fingerprint",
  );
}

describe("profile identity trust", () => {
  it("keeps a valid signed first contact unanchored until separately confirmed", () => {
    expect(resolveProfileIdentityTrust(makeProfile(), "valid")).toEqual({
      status: "signed-unanchored",
    });
  });

  it("anchors exactly profile id, verification code, signing key and fingerprint", () => {
    const profile = makeProfile();
    const anchor = makeAnchor(profile);
    expect(anchor).toMatchObject({
      schema: 1,
      profileId: profile.id,
      verificationCode: profile.verificationCode,
      keyId: proof.keyId,
      anchoredAt: 1234,
      method: "source-device-fingerprint",
    });
    expect(anchor.fingerprint).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(?:-[0-9A-HJKMNP-TV-Z]{4}){3}$/);
    expect(matchProfileIdentityAnchor(profile, anchor)).toEqual({ matches: true });
    expect(resolveProfileIdentityTrust(profile, "valid", anchor).status).toBe("identity-anchored");
  });

  it("retains the anchor across a newer valid proof under the same signing key", () => {
    const profile = makeProfile();
    const anchor = makeAnchor(profile);
    const updated = makeProfile({
      consentProof: {
        ...proof,
        version: 2,
        previousProofHash: proof.proofHash,
        proofHash: "proof-2",
      },
    });
    expect(matchProfileIdentityAnchor(updated, anchor)).toEqual({ matches: true });
    expect(resolveProfileIdentityTrust(updated, "valid", anchor).status).toBe("identity-anchored");
  });

  it("fails closed when the signing key changes after anchoring", () => {
    const profile = makeProfile();
    const anchor = makeAnchor(profile);
    const replaced = makeProfile({ consentProof: { ...proof, keyId: "key-b" } });
    expect(resolveProfileIdentityTrust(replaced, "valid", anchor)).toMatchObject({
      status: "identity-conflict",
      reason: "key-id",
    });
  });

  it("fails closed on profile id or verification code substitution", () => {
    const profile = makeProfile();
    const anchor = makeAnchor(profile);
    expect(matchProfileIdentityAnchor(makeProfile({ id: "profile-b" }), anchor)).toEqual({
      matches: false,
      reason: "profile-id",
    });
    expect(matchProfileIdentityAnchor(makeProfile({ verificationCode: "KS-8J4R-5T6V-W7XY" }), anchor)).toEqual({
      matches: false,
      reason: "verification-code",
    });
  });

  it("marks unsigned legacy contacts unverified and blocks unsigned downgrade of an anchor", () => {
    const signed = makeProfile();
    const anchor = makeAnchor(signed);
    const unsigned = makeProfile({ consentProof: undefined });
    expect(resolveProfileIdentityTrust(unsigned, "unsigned")).toEqual({
      status: "legacy-unverified",
    });
    expect(resolveProfileIdentityTrust(unsigned, "unsigned", anchor)).toMatchObject({
      status: "identity-conflict",
      reason: "unsigned-downgrade",
    });
  });

  it("never turns cryptographically invalid material into identity trust", () => {
    const profile = makeProfile();
    expect(resolveProfileIdentityTrust(profile, "invalid", makeAnchor(profile))).toEqual({
      status: "cryptographically-invalid",
    });
  });

  it("does not require a remote identity anchor for a local owner profile", () => {
    const own = makeProfile({ origin: "own", isImported: false, consentProof: undefined });
    expect(resolveProfileIdentityTrust(own, "unsigned")).toEqual({ status: "local-owner" });
  });

  it("validates anchor structure without accepting malformed codes or methods", () => {
    const anchor = makeAnchor();
    expect(isProfileIdentityAnchor(anchor)).toBe(true);
    expect(isProfileIdentityAnchor({ ...anchor, verificationCode: "KS-NOPE" })).toBe(false);
    expect(isProfileIdentityAnchor({ ...anchor, method: "same-qr" })).toBe(false);
  });

  it("keeps a same-identity impersonator with its own valid key unanchored and separate from the real contact", () => {
    const realContact = makeProfile({
      id: "profile-real",
      verificationCode: "KS-7H3P-9Q2M-A4BC",
      name: "Alex",
      role: "Switch",
    });
    const realAnchor = makeAnchor(realContact);
    const attackerProof: ProfileConsentProof = {
      ...proof,
      keyId: "key-mallory",
      publicKeyJwk: { kty: "EC", crv: "P-256", x: "mallory-x", y: "mallory-y" },
      payloadHash: "mallory-payload",
      signature: "mallory-signature",
      proofHash: "mallory-proof",
    };
    const impersonator = makeProfile({
      id: "profile-mallory",
      verificationCode: "KS-8J4R-5T6V-W7XY",
      consentProof: attackerProof,
      name: realContact.name,
      role: realContact.role,
    });

    expect(resolveProfileIdentityTrust(impersonator, "valid")).toEqual({
      status: "signed-unanchored",
    });
    expect(matchProfileIdentityAnchor(impersonator, realAnchor)).toEqual({
      matches: false,
      reason: "profile-id",
    });
    expect(resolveProfileIdentityTrust(impersonator, "valid", realAnchor)).toMatchObject({
      status: "identity-conflict",
      reason: "profile-id",
    });
  });

  it("gives a substituted signed link no more trust than the same unanchored profile received by QR", () => {
    const qrProfile = makeProfile();
    const substitutedLinkProfile = makeProfile({
      consentProof: { ...proof },
    });

    expect(resolveProfileIdentityTrust(qrProfile, "valid")).toEqual({
      status: "signed-unanchored",
    });
    expect(resolveProfileIdentityTrust(substitutedLinkProfile, "valid")).toEqual({
      status: "signed-unanchored",
    });
  });

  it("keeps equal name and role with a different profile id and verification code as a separate identity", () => {
    const existing = makeProfile({
      id: "profile-existing",
      verificationCode: "KS-7H3P-9Q2M-A4BC",
      name: "Alex",
      role: "Switch",
    });
    const duplicateName = makeProfile({
      id: "profile-separate",
      verificationCode: "KS-8J4R-5T6V-W7XY",
      name: existing.name,
      role: existing.role,
    });
    const existingAnchor = makeAnchor(existing);

    expect(resolveProfileIdentityTrust(duplicateName, "valid")).toEqual({
      status: "signed-unanchored",
    });
    expect(matchProfileIdentityAnchor(duplicateName, existingAnchor)).toEqual({
      matches: false,
      reason: "profile-id",
    });
  });

  it("does not turn a valid Switch share proof into identity anchors for either perspective", () => {
    const switchShareProof = {
      schema: 1 as const,
      algorithm: "ECDSA-P256-SHA256" as const,
      name: "Alex",
      dominant: { profileId: "profile-dom", keyId: "key-dom" },
      submissive: { profileId: "profile-sub", keyId: "key-sub" },
      dominantSignature: "dom-signature",
      submissiveSignature: "sub-signature",
    };
    const dominant = makeProfile({
      id: "profile-dom",
      verificationCode: "KS-7H3P-9Q2M-A4BC",
      consentProof: { ...proof, keyId: "key-dom", proofHash: "proof-dom" },
      perspective: "dominant",
      switchShareProof,
    });
    const submissive = makeProfile({
      id: "profile-sub",
      verificationCode: "KS-8J4R-5T6V-W7XY",
      consentProof: { ...proof, keyId: "key-sub", proofHash: "proof-sub" },
      perspective: "submissive",
      switchShareProof,
    });

    expect(resolveProfileIdentityTrust(dominant, "valid")).toEqual({
      status: "signed-unanchored",
    });
    expect(resolveProfileIdentityTrust(submissive, "valid")).toEqual({
      status: "signed-unanchored",
    });
  });

  it("requires the currently verified proof when constructing an anchor", () => {
    const profile = makeProfile();
    expect(() => createProfileIdentityAnchor(
      profile,
      { ...proof, proofHash: "other-proof" },
      1234,
      "independent-channel-fingerprint",
    )).toThrow(/currently verified proof/);
  });
});
