import type { KinkEntry, Profile } from "@/types";

export type DirectionalKinkSide = "give" | "receive";

export interface DirectionalKinkPair {
  conceptId: string;
  giveId: string;
  receiveId: string;
}

/**
 * Expliciete handelingparen. Dit is presentation/matching-metadata, geen
 * voorkeurssignaal: perspective en antwoorden worden hier nooit uit afgeleid.
 */
export const DIRECTIONAL_KINK_PAIRS = [
  { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },
] as const satisfies readonly DirectionalKinkPair[];

const PAIR_BY_KINK_ID = new Map<string, DirectionalKinkPair>();
for (const pair of DIRECTIONAL_KINK_PAIRS) {
  PAIR_BY_KINK_ID.set(pair.giveId, pair);
  PAIR_BY_KINK_ID.set(pair.receiveId, pair);
}

export function directionalPairForKinkId(kinkId: string): DirectionalKinkPair | undefined {
  return PAIR_BY_KINK_ID.get(kinkId);
}

export function directionalSideForKinkId(kinkId: string): DirectionalKinkSide | null {
  const pair = directionalPairForKinkId(kinkId);
  if (!pair) return null;
  return pair.giveId === kinkId ? "give" : "receive";
}

export function directionalSiblingId(kinkId: string): string | null {
  const pair = directionalPairForKinkId(kinkId);
  if (!pair) return null;
  return pair.giveId === kinkId ? pair.receiveId : pair.giveId;
}

/** De partnerkant voor complementaire matching; niet-directionele IDs blijven zichzelf. */
export function partnerDirectionalKinkId(kinkId: string): string {
  return directionalSiblingId(kinkId) ?? kinkId;
}

const DEPRECATED_DIRECTIONAL_KINK_IDS = new Set<string>(["pegging"]);

/**
 * Pre-launch cleanup: een oud gecombineerd antwoord kan niet eerlijk naar give
 * én receive worden gekopieerd, dus het wordt verwijderd in plaats van geïnferreerd.
 */
export function stripDeprecatedDirectionalEntries(
  entries: Record<string, KinkEntry>,
): Record<string, KinkEntry> {
  if (![...DEPRECATED_DIRECTIONAL_KINK_IDS].some((id) => id in entries)) return entries;
  const next = { ...entries };
  for (const id of DEPRECATED_DIRECTIONAL_KINK_IDS) delete next[id];
  return next;
}

export function stripDeprecatedDirectionalProfile(profile: Profile): Profile {
  const entries = stripDeprecatedDirectionalEntries(profile.entries);
  return entries === profile.entries ? profile : { ...profile, entries };
}
