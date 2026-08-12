import type { Profile } from "@/types";

export type ProfileType = "primair" | "alternatief" | "partner";

export function getProfileType(
  profile: Pick<Profile, "id" | "isImported" | "origin">,
  pinnedProfileId: string | null
): ProfileType {
  if (profile.isImported || profile.origin === "shared") return "partner";
  if (profile.id === pinnedProfileId) return "primair";
  return "alternatief";
}


export interface ProfileOwnershipGroups<T> {
  mine: T[];
  shared: T[];
}

/**
 * Splits profiles using the same explicit ownership metadata as getProfileType.
 * Names, roles and answers never participate in ownership classification.
 */
export function splitProfilesByOwnership<
  T extends Pick<Profile, "id" | "isImported" | "origin">,
>(
  profiles: readonly T[],
  pinnedProfileId: string | null,
): ProfileOwnershipGroups<T> {
  const groups: ProfileOwnershipGroups<T> = { mine: [], shared: [] };
  for (const profile of profiles) {
    if (getProfileType(profile, pinnedProfileId) === "partner") groups.shared.push(profile);
    else groups.mine.push(profile);
  }
  return groups;
}
