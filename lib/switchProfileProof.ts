import type {
  Profile,
  ProfileOwnerKey,
  SwitchShareMemberProof,
  SwitchShareProof,
} from "@/types";
import {
  canonicalJson,
  verifyProfileConsent,
  verifyProfileOwnerKey,
} from "@/lib/consentProof";

const ALGORITHM = "ECDSA-P256-SHA256" as const;
const CURVE = "P-256";
const TEXT = new TextEncoder();
const MAX_PROOF_STRING = 512;
const MAX_GROUP_ID = 128;
const MAX_NAME = 160;

interface UnsignedSwitchShareProof {
  schema: 1;
  algorithm: typeof ALGORITHM;
  groupId: string;
  name: string;
  dominant: SwitchShareMemberProof;
  submissive: SwitchShareMemberProof;
}

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Deze browser kan een Switch-koppeling niet bevestigen");
  }
  return globalThis.crypto.subtle;
}

function cleanBoundedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean && clean.length <= max ? clean : null;
}

function sanitizeMember(raw: unknown): SwitchShareMemberProof | null {
  if (!raw || typeof raw !== "object") return null;
  const member = raw as Record<string, unknown>;
  const profileId = cleanBoundedString(member.profileId, MAX_PROOF_STRING);
  const keyId = cleanBoundedString(member.keyId, MAX_PROOF_STRING);
  if (!profileId || !keyId) return null;
  return { profileId, keyId };
}

export function sanitizeSwitchShareProof(raw: unknown): SwitchShareProof | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const proof = raw as Record<string, unknown>;
  if (proof.schema !== 1 || proof.algorithm !== ALGORITHM) return undefined;
  const groupId = cleanBoundedString(proof.groupId, MAX_GROUP_ID);
  const name = cleanBoundedString(proof.name, MAX_NAME);
  const dominant = sanitizeMember(proof.dominant);
  const submissive = sanitizeMember(proof.submissive);
  const dominantSignature = cleanBoundedString(proof.dominantSignature, MAX_PROOF_STRING);
  const submissiveSignature = cleanBoundedString(proof.submissiveSignature, MAX_PROOF_STRING);
  if (!groupId || !name || !dominant || !submissive || !dominantSignature || !submissiveSignature) {
    return undefined;
  }
  if (dominant.profileId === submissive.profileId || dominant.keyId === submissive.keyId) {
    return undefined;
  }
  return {
    schema: 1,
    algorithm: ALGORITHM,
    groupId,
    name,
    dominant,
    submissive,
    dominantSignature,
    submissiveSignature,
  };
}

function unsignedProof(proof: SwitchShareProof): UnsignedSwitchShareProof {
  return {
    schema: 1,
    algorithm: ALGORITHM,
    groupId: proof.groupId,
    name: proof.name,
    dominant: proof.dominant,
    submissive: proof.submissive,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function roleIs(profile: Profile, role: "dominant" | "submissive"): boolean {
  return profile.role.trim().toLowerCase() === role;
}

function memberFor(profile: Profile): SwitchShareMemberProof {
  const proof = profile.consentProof;
  if (!proof) throw new Error("Beide Switch-perspectieven moeten eerst bevestigd zijn");
  return {
    profileId: profile.id,
    keyId: proof.keyId,
  };
}

async function signMessage(ownerKey: ProfileOwnerKey, message: string): Promise<string> {
  const key = await subtle().importKey(
    "jwk",
    ownerKey.privateKeyJwk,
    { name: "ECDSA", namedCurve: CURVE },
    false,
    ["sign"],
  );
  const signature = await subtle().sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    TEXT.encode(message),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifySignature(profile: Profile, signature: string, message: string): Promise<boolean> {
  const proof = profile.consentProof;
  if (!proof) return false;
  try {
    const key = await subtle().importKey(
      "jwk",
      proof.publicKeyJwk,
      { name: "ECDSA", namedCurve: CURVE },
      false,
      ["verify"],
    );
    return subtle().verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      base64UrlToBytes(signature),
      TEXT.encode(message),
    );
  } catch {
    return false;
  }
}

function ownerKeyFor(profile: Profile, ownerKeys: ProfileOwnerKey[]): ProfileOwnerKey | undefined {
  return ownerKeys.find((key) => key.profileId === profile.id);
}

export async function createSwitchShareProof(
  dominant: Profile,
  submissive: Profile,
  ownerKeys: ProfileOwnerKey[],
): Promise<SwitchShareProof> {
  if (!roleIs(dominant, "dominant") || !roleIs(submissive, "submissive")) {
    throw new Error("Switch-perspectieven hebben geen geldige Dominant/Submissive-volgorde");
  }
  if (!dominant.personGroupId || dominant.personGroupId !== submissive.personGroupId) {
    throw new Error("Deze perspectieven horen niet aantoonbaar bij dezelfde Switch");
  }
  if (dominant.name.trim() !== submissive.name.trim()) {
    throw new Error("Switch-perspectieven hebben verschillende profielnamen");
  }
  const dominantKey = ownerKeyFor(dominant, ownerKeys);
  const submissiveKey = ownerKeyFor(submissive, ownerKeys);
  if (!dominantKey || !submissiveKey) {
    throw new Error("De eigendomssleutels voor beide Switch-perspectieven ontbreken");
  }
  const dominantMember = memberFor(dominant);
  const submissiveMember = memberFor(submissive);
  if (dominantKey.keyId !== dominantMember.keyId || submissiveKey.keyId !== submissiveMember.keyId
    || !await verifyProfileOwnerKey(dominantKey) || !await verifyProfileOwnerKey(submissiveKey)) {
    throw new Error("Een Switch-eigendomssleutel is ongeldig");
  }

  const unsigned: UnsignedSwitchShareProof = {
    schema: 1,
    algorithm: ALGORITHM,
    groupId: dominant.personGroupId,
    name: dominant.name.trim(),
    dominant: dominantMember,
    submissive: submissiveMember,
  };
  const message = canonicalJson(unsigned);
  return {
    ...unsigned,
    dominantSignature: await signMessage(dominantKey, message),
    submissiveSignature: await signMessage(submissiveKey, message),
  };
}

export async function verifySwitchShareProof(
  rawProof: unknown,
  dominant: Profile,
  submissive: Profile,
): Promise<boolean> {
  const proof = sanitizeSwitchShareProof(rawProof);
  if (!proof || !roleIs(dominant, "dominant") || !roleIs(submissive, "submissive")) return false;
  if (dominant.name.trim() !== proof.name || submissive.name.trim() !== proof.name) return false;
  const dominantConsent = dominant.consentProof;
  const submissiveConsent = submissive.consentProof;
  if (!dominantConsent || !submissiveConsent) return false;
  if (proof.dominant.profileId !== dominant.id
    || proof.dominant.keyId !== dominantConsent.keyId
    || proof.submissive.profileId !== submissive.id
    || proof.submissive.keyId !== submissiveConsent.keyId) {
    return false;
  }
  const [dominantVerification, submissiveVerification] = await Promise.all([
    verifyProfileConsent(dominant),
    verifyProfileConsent(submissive),
  ]);
  if (dominantVerification.status !== "valid" || submissiveVerification.status !== "valid") return false;
  const message = canonicalJson(unsignedProof(proof));
  const [dominantValid, submissiveValid] = await Promise.all([
    verifySignature(dominant, proof.dominantSignature, message),
    verifySignature(submissive, proof.submissiveSignature, message),
  ]);
  return dominantValid && submissiveValid;
}

export async function relinkVerifiedSwitchProfiles(profiles: Profile[]): Promise<Profile[]> {
  const patches = new Map<string, { groupId: string; perspective: "dominant" | "submissive"; proof: SwitchShareProof }>();
  const proofs = new Map<string, SwitchShareProof>();
  for (const profile of profiles) {
    const proof = sanitizeSwitchShareProof(profile.switchShareProof);
    if (proof) proofs.set(proof.groupId, proof);
  }

  for (const proof of proofs.values()) {
    const dominant = profiles.find((profile) => profile.id === proof.dominant.profileId);
    const submissive = profiles.find((profile) => profile.id === proof.submissive.profileId);
    if (!dominant || !submissive) continue;
    const bothShared = (dominant.origin === "shared" || dominant.isImported === true)
      && (submissive.origin === "shared" || submissive.isImported === true);
    if (!bothShared || !await verifySwitchShareProof(proof, dominant, submissive)) continue;
    patches.set(dominant.id, { groupId: proof.groupId, perspective: "dominant", proof });
    patches.set(submissive.id, { groupId: proof.groupId, perspective: "submissive", proof });
  }

  return profiles.map((profile) => {
    const patch = patches.get(profile.id);
    if (!patch) {
      const { switchShareProof: _unverifiedProof, ...withoutUnverifiedProof } = profile;
      return withoutUnverifiedProof;
    }
    return {
      ...profile,
      personGroupId: patch.groupId,
      perspective: patch.perspective,
      role: patch.perspective === "dominant" ? "Dominant" : "Submissive",
      switchShareProof: patch.proof,
    };
  });
}
