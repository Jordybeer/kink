import type { Profile } from "@/types";
import { getProfileType } from "@/lib/profileType";

export function eligibleParentProfiles(
  profiles: Profile[],
  pinnedProfileId: string | null
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const p of profiles) {
    if (getProfileType(p, pinnedProfileId) === "partner") continue;
    const key = p.name.toLowerCase().trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(p.name.trim());
  }

  return names.sort((a, b) => a.localeCompare(b, "nl"));
}
