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
