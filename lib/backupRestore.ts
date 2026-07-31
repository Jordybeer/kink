import type { ContractSnapshot, Profile, ProfileOwnerKey } from "@/types";
import { sanitizeContractSnapshot, sanitizeProfileFull } from "@/lib/sanitizeProfile";
import {
  sanitizeProfileOwnerKey,
  verifyProfileConsent,
  verifyProfileOwnerKey,
} from "@/lib/consentProof";

export interface PreparedBackupRestore {
  source: "backup" | "shared";
  profiles: Profile[];
  contracts: ContractSnapshot[];
  ownerKeys: ProfileOwnerKey[];
}

export async function prepareBackupRestore(raw: unknown): Promise<PreparedBackupRestore> {
  if (!raw || typeof raw !== "object") throw new Error("Ongeldig bestand");
  const parsed = raw as Record<string, unknown>;
  if (!Array.isArray(parsed.profiles)) throw new Error("Geen geldige profielen gevonden");

  const source = parsed.source === "backup" ? "backup" : "shared";
  const sanitizedProfiles = parsed.profiles
    .map((profile) => sanitizeProfileFull(profile))
    .filter((profile): profile is Profile => profile !== null);
  const contracts = (Array.isArray(parsed.contracts) ? parsed.contracts : [])
    .map((contract) => sanitizeContractSnapshot(contract))
    .filter((contract): contract is ContractSnapshot => contract !== null);

  const profilesById = new Map(sanitizedProfiles.map((profile) => [profile.id, profile]));
  const keyByProfile = new Map<string, ProfileOwnerKey>();

  for (const rawKey of Array.isArray(parsed.profileOwnerKeys) ? parsed.profileOwnerKeys : []) {
    const key = sanitizeProfileOwnerKey(rawKey);
    const profile = key ? profilesById.get(key.profileId) : undefined;
    if (!key || !profile || !await verifyProfileOwnerKey(key)) continue;
    if (profile.consentProof && profile.consentProof.keyId !== key.keyId) continue;
    keyByProfile.set(key.profileId, key);
  }

  const profiles: Profile[] = [];
  for (const profile of sanitizedProfiles) {
    const wasShared = profile.origin === "shared" || profile.isImported === true;
    const key = keyByProfile.get(profile.id);
    const verification = profile.consentProof
      ? await verifyProfileConsent(profile)
      : { status: "unsigned" as const };

    if (source !== "backup") {
      if (verification.status === "invalid") continue;
      profiles.push({
        ...profile,
        origin: "shared",
        isImported: true,
        lockedAt: profile.lockedAt ?? Date.now(),
      });
      continue;
    }

    if (key) {
      const { lockedAt: _lockedAt, ...rest } = profile;
      profiles.push({ ...rest, origin: "own", isImported: false });
      continue;
    }

    // Backups van vóór bronbevestiging bevatten terecht nog geen sleutel.
    if (!wasShared && !profile.consentProof) {
      const { lockedAt: _lockedAt, ...rest } = profile;
      profiles.push({ ...rest, origin: "own", isImported: false });
      continue;
    }

    // Een ondertekend profiel zonder de passende private sleutel is geen eigendom.
    if (verification.status === "invalid") continue;
    profiles.push({
      ...profile,
      origin: "shared",
      isImported: true,
      lockedAt: profile.lockedAt ?? Date.now(),
    });
  }

  return {
    source,
    profiles,
    contracts,
    ownerKeys: [...keyByProfile.values()],
  };
}
