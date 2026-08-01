import type { Profile } from "@/types";

const PROFILE_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PROFILE_CODE_BODY_LENGTH = 12;

export const PROFILE_VERIFICATION_CODE_RE = /^KS-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

function formatProfileCodeBody(body: string): string {
  return `KS-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

export function normalizeProfileVerificationCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const compact = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact.startsWith("KS")) return null;
  const body = compact.slice(2);
  if (body.length !== PROFILE_CODE_BODY_LENGTH) return null;
  if ([...body].some((char) => !PROFILE_CODE_ALPHABET.includes(char))) return null;
  const formatted = formatProfileCodeBody(body);
  return PROFILE_VERIFICATION_CODE_RE.test(formatted) ? formatted : null;
}

export function generateProfileVerificationCode(randomBytes?: Uint8Array): string {
  let bytes = randomBytes;
  if (!bytes) {
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error("Veilige profielcode kon niet worden aangemaakt");
    }
    bytes = globalThis.crypto.getRandomValues(new Uint8Array(PROFILE_CODE_BODY_LENGTH));
  }
  if (bytes.length < PROFILE_CODE_BODY_LENGTH) {
    throw new Error("Onvoldoende willekeur voor profielcode");
  }
  const body = Array.from(bytes.slice(0, PROFILE_CODE_BODY_LENGTH),
    (byte) => PROFILE_CODE_ALPHABET[byte & 31]).join("");
  return formatProfileCodeBody(body);
}

function hashProfileId(profileId: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < profileId.length; index++) {
    hash ^= profileId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export function deriveProfileVerificationCode(profileId: string): string {
  let left = hashProfileId(profileId, 0x811c9dc5);
  let right = hashProfileId(profileId, 0x9e3779b9);
  let body = "";
  for (let index = 0; index < PROFILE_CODE_BODY_LENGTH; index++) {
    left = Math.imul(left ^ (left >>> 15), 0x85ebca6b) >>> 0;
    right = Math.imul(right ^ (right >>> 13), 0xc2b2ae35) >>> 0;
    body += PROFILE_CODE_ALPHABET[(left ^ right ^ index) & 31];
    left = (left + 0x6d2b79f5) >>> 0;
    right = (right + 0x1b873593) >>> 0;
  }
  return formatProfileCodeBody(body);
}

export function getProfileVerificationCode(
  profile: Pick<Profile, "id" | "verificationCode">,
): string {
  return normalizeProfileVerificationCode(profile.verificationCode)
    ?? deriveProfileVerificationCode(profile.id);
}

function normalizeIdentityText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl-NL");
}

export type ProfileImportIdentity =
  | { kind: "same-code"; profile: Profile; code: string }
  | { kind: "signed-update"; profile: Profile; code: string }
  | { kind: "source-conflict"; profile: Profile; code: string }
  | { kind: "same-name-role"; profile: Profile; code: string }
  | { kind: "new"; code: string };

export function classifyProfileImport(
  existingProfiles: Profile[],
  incoming: Profile,
): ProfileImportIdentity {
  const code = getProfileVerificationCode(incoming);
  const sameCode = existingProfiles.find(
    (profile) => getProfileVerificationCode(profile) === code,
  );
  if (sameCode) {
    const current = sameCode.consentProof;
    const next = incoming.consentProof;
    if (current && next && current.keyId !== next.keyId) {
      return { kind: "source-conflict", profile: sameCode, code };
    }
    const shared = sameCode.origin === "shared" || sameCode.isImported === true;
    if (shared && next && (!current || (
      next.keyId === current.keyId
      && next.version > current.version
      && next.previousProofHash === current.proofHash
    ))) {
      return { kind: "signed-update", profile: sameCode, code };
    }
    return { kind: "same-code", profile: sameCode, code };
  }

  const incomingName = normalizeIdentityText(incoming.name);
  const incomingRole = normalizeIdentityText(incoming.role);
  const sameNameRole = existingProfiles.find(
    (profile) => normalizeIdentityText(profile.name) === incomingName
      && normalizeIdentityText(profile.role) === incomingRole,
  );
  if (sameNameRole) return { kind: "same-name-role", profile: sameNameRole, code };

  return { kind: "new", code };
}
