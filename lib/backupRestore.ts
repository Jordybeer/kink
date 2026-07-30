import type { ContractSnapshot, Profile, ProfileOwnerKey } from "@/types";
import { sanitizeContractSnapshot, sanitizeProfileFull } from "@/lib/sanitizeProfile";
import { sanitizeProfileOwnerKey, verifyProfileOwnerKey } from "@/lib/consentProof";

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
  const profiles = parsed.profiles
    .map((profile) => sanitizeProfileFull(profile))
    .filter((profile): profile is Profile => profile !== null);
  const contracts = (Array.isArray(parsed.contracts) ? parsed.contracts : [])
    .map((contract) => sanitizeContractSnapshot(contract))
    .filter((contract): contract is ContractSnapshot => contract !== null);
  const ownerKeys: ProfileOwnerKey[] = [];
  for (const rawKey of Array.isArray(parsed.profileOwnerKeys) ? parsed.profileOwnerKeys : []) {
    const key = sanitizeProfileOwnerKey(rawKey);
    if (key && await verifyProfileOwnerKey(key)) ownerKeys.push(key);
  }
  const ownedIds = new Set(ownerKeys.map((key) => key.profileId));
  return {
    source,
    ownerKeys,
    contracts,
    profiles: profiles.map((profile) => {
      if (source !== "backup") {
        return { ...profile, origin: "shared", isImported: true, lockedAt: profile.lockedAt ?? Date.now() };
      }
      const shared = profile.origin === "shared" || profile.isImported === true;
      if (ownedIds.has(profile.id) || !shared) {
        const { lockedAt: _lockedAt, ...rest } = profile;
        return { ...rest, origin: "own", isImported: false };
      }
      return { ...profile, origin: "shared", isImported: true, lockedAt: profile.lockedAt ?? Date.now() };
    }),
  };
}
