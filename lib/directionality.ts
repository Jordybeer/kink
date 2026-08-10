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
  { conceptId: "golden_shower", giveId: "watersports_geven", receiveId: "watersports_ontvangen" },
  { conceptId: "anal_sex", giveId: "anal_sex_give", receiveId: "anal_sex_receive" },
  { conceptId: "anal_fingering", giveId: "anal_fingering_give", receiveId: "anal_fingering_receive" },
  { conceptId: "anal_fisting", giveId: "fisting_anal_give", receiveId: "fisting_anal_receive" },
  { conceptId: "vaginal_fisting", giveId: "fisting_vaginal_give", receiveId: "fisting_vaginal_receive" },
  { conceptId: "deep_throat", giveId: "deep_throat_give", receiveId: "deep_throat_receive" },
  { conceptId: "rimming", giveId: "rimming_give", receiveId: "rimming_receive" },
  { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
] as const satisfies readonly DirectionalKinkPair[];

const DIRECTIONAL_CONCEPT_LABELS: Readonly<Record<string, string>> = {
  pegging: "Pegging",
  golden_shower: "Golden shower",
  anal_sex: "Anal sex",
  anal_fingering: "Anal fingering",
  anal_fisting: "Anal fisting",
  vaginal_fisting: "Vaginal fisting",
  deep_throat: "Deep throat",
  rimming: "Rimming",
  footjob: "Footjob",
};

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

const EMPTY_DIRECTIONAL_ENTRY: KinkEntry = { status: null, comment: "" };

export interface DirectionalComparisonEntries {
  sourceKinkId: string;
  partnerKinkId: string;
  sourceEntry: KinkEntry;
  partnerEntry: KinkEntry;
}

/**
 * Eén bron van waarheid voor consumers die A's concrete kink tegenover de
 * complementaire kant van B zetten. De helper verandert nooit eligibility,
 * status of privacy; hij kiest alleen de expliciete IDs die al bestaan.
 */
export function directionalComparisonEntries(
  sourceEntries: Readonly<Record<string, KinkEntry>> | undefined,
  partnerEntries: Readonly<Record<string, KinkEntry>> | undefined,
  kinkId: string,
): DirectionalComparisonEntries {
  const partnerKinkId = partnerDirectionalKinkId(kinkId);
  return {
    sourceKinkId: kinkId,
    partnerKinkId,
    sourceEntry: sourceEntries?.[kinkId] ?? EMPTY_DIRECTIONAL_ENTRY,
    partnerEntry: partnerEntries?.[partnerKinkId] ?? EMPTY_DIRECTIONAL_ENTRY,
  };
}

/**
 * Vergelijkrijen maken de richting expliciet zonder de rollen van de profielen
 * te interpreteren. Voor niet-directionele kinks blijft de catalogusnaam intact.
 */
export function directionalCompareLabel(kinkId: string, fallbackName: string): string {
  const pair = directionalPairForKinkId(kinkId);
  if (!pair) return fallbackName;
  const conceptLabel = DIRECTIONAL_CONCEPT_LABELS[pair.conceptId] ?? fallbackName;
  return pair.giveId === kinkId
    ? `${conceptLabel} — geven ↔ ontvangen`
    : `${conceptLabel} — ontvangen ↔ geven`;
}

const DEPRECATED_DIRECTIONAL_KINK_IDS = new Set<string>([
  "pegging",
  "anal_sex",
  "anal_fingering",
  "fisting_anal",
  "fisting_vaginal",
  "deep_throat",
  "rimmen",
  "footjob",
]);

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
