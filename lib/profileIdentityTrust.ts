import { profileConsentAlias } from "@/lib/consentProof";
import { getProfileVerificationCode, normalizeProfileVerificationCode } from "@/lib/profileVerification";
import type {
  Profile,
  ProfileConsentProof,
  ProfileIdentityAnchor,
  ProfileIdentityAnchorMethod,
} from "@/types";

export type ProfileCryptographicStatus = "unsigned" | "valid" | "invalid";

export type ProfileIdentityConflictReason =
  | "unsigned-downgrade"
  | "missing-proof"
  | "profile-id"
  | "verification-code"
  | "key-id"
  | "fingerprint";

export type ProfileIdentityTrust =
  | { status: "local-owner" }
  | { status: "legacy-unverified" }
  | { status: "signed-unanchored" }
  | { status: "identity-anchored"; anchor: ProfileIdentityAnchor }
  | { status: "identity-conflict"; reason: ProfileIdentityConflictReason; anchor: ProfileIdentityAnchor }
  | { status: "cryptographically-invalid" };

export type ProfileIdentityAnchorMatch =
  | { matches: true }
  | { matches: false; reason: Exclude<ProfileIdentityConflictReason, "unsigned-downgrade" | "missing-proof"> };

function isSharedProfile(profile: Pick<Profile, "origin" | "isImported">): boolean {
  return profile.origin === "shared" || profile.isImported === true;
}

export function createProfileIdentityAnchor(
  profile: Pick<Profile, "id" | "verificationCode" | "consentProof">,
  verifiedProof: ProfileConsentProof,
  anchoredAt: number,
  method: ProfileIdentityAnchorMethod,
): ProfileIdentityAnchor {
  const currentProof = profile.consentProof;
  if (!currentProof
    || currentProof.keyId !== verifiedProof.keyId
    || currentProof.proofHash !== verifiedProof.proofHash) {
    throw new Error("Identity anchor requires the profile's currently verified proof");
  }
  if (!Number.isFinite(anchoredAt) || anchoredAt < 0) {
    throw new Error("Identity anchor requires a valid timestamp");
  }

  return {
    schema: 1,
    profileId: profile.id,
    verificationCode: getProfileVerificationCode(profile),
    keyId: verifiedProof.keyId,
    fingerprint: profileConsentAlias(profile),
    anchoredAt,
    method,
  };
}

export function matchProfileIdentityAnchor(
  profile: Pick<Profile, "id" | "verificationCode" | "consentProof">,
  anchor: ProfileIdentityAnchor,
): ProfileIdentityAnchorMatch {
  if (anchor.profileId !== profile.id) return { matches: false, reason: "profile-id" };
  if (anchor.verificationCode !== getProfileVerificationCode(profile)) {
    return { matches: false, reason: "verification-code" };
  }
  if (anchor.keyId !== profile.consentProof?.keyId) return { matches: false, reason: "key-id" };
  if (anchor.fingerprint !== profileConsentAlias(profile)) return { matches: false, reason: "fingerprint" };
  return { matches: true };
}

export function resolveProfileIdentityTrust(
  profile: Pick<Profile, "id" | "verificationCode" | "consentProof" | "origin" | "isImported">,
  cryptographicStatus: ProfileCryptographicStatus,
  anchor?: ProfileIdentityAnchor,
): ProfileIdentityTrust {
  if (cryptographicStatus === "invalid") return { status: "cryptographically-invalid" };
  if (!isSharedProfile(profile)) return { status: "local-owner" };

  if (cryptographicStatus === "unsigned") {
    return anchor
      ? { status: "identity-conflict", reason: "unsigned-downgrade", anchor }
      : { status: "legacy-unverified" };
  }

  if (!profile.consentProof) {
    return anchor
      ? { status: "identity-conflict", reason: "missing-proof", anchor }
      : { status: "cryptographically-invalid" };
  }
  if (!anchor) return { status: "signed-unanchored" };

  const match = matchProfileIdentityAnchor(profile, anchor);
  if (match.matches) return { status: "identity-anchored", anchor };
  return { status: "identity-conflict", reason: match.reason, anchor };
}

export function isProfileIdentityAnchor(raw: unknown): raw is ProfileIdentityAnchor {
  if (!raw || typeof raw !== "object") return false;
  const anchor = raw as Record<string, unknown>;
  if (anchor.schema !== 1) return false;
  if (typeof anchor.profileId !== "string" || !anchor.profileId) return false;
  if (normalizeProfileVerificationCode(anchor.verificationCode) !== anchor.verificationCode) return false;
  if (typeof anchor.keyId !== "string" || !anchor.keyId) return false;
  if (typeof anchor.fingerprint !== "string" || !anchor.fingerprint) return false;
  if (typeof anchor.anchoredAt !== "number" || !Number.isFinite(anchor.anchoredAt) || anchor.anchoredAt < 0) return false;
  return anchor.method === "source-device-fingerprint"
    || anchor.method === "independent-channel-fingerprint";
}
