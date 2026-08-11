import type { KinkEntry } from "@/types";
import {
  directionalCompareLabel,
  partnerDirectionalKinkId,
} from "@/lib/directionality";

export interface ComplementaryParticipationPair {
  conceptId: string;
  leftId: string;
  rightId: string;
  leftLabel: string;
  rightLabel: string;
}

export const COMPLEMENTARY_PARTICIPATION_PAIRS = [
  {
    conceptId: "diaper_wearing",
    leftId: "luiers_dragen",
    rightId: "diaper_partner_wearing",
    leftLabel: "Zelf dragen",
    rightLabel: "Partner draagt",
  },
] as const satisfies readonly ComplementaryParticipationPair[];

const SPECIAL_PAIR_BY_KINK_ID = new Map<string, ComplementaryParticipationPair>();
for (const pair of COMPLEMENTARY_PARTICIPATION_PAIRS) {
  SPECIAL_PAIR_BY_KINK_ID.set(pair.leftId, pair);
  SPECIAL_PAIR_BY_KINK_ID.set(pair.rightId, pair);
}

export function complementarySiblingId(kinkId: string): string | null {
  const special = SPECIAL_PAIR_BY_KINK_ID.get(kinkId);
  if (special) return special.leftId === kinkId ? special.rightId : special.leftId;
  const directionalPartner = partnerDirectionalKinkId(kinkId);
  return directionalPartner === kinkId ? null : directionalPartner;
}

export function complementaryPartnerKinkId(kinkId: string): string {
  return complementarySiblingId(kinkId) ?? kinkId;
}

const EMPTY_ENTRY: KinkEntry = { status: null, comment: "" };

export interface ComplementaryComparisonEntries {
  sourceKinkId: string;
  partnerKinkId: string;
  sourceEntry: KinkEntry;
  partnerEntry: KinkEntry;
}

export function complementaryComparisonEntries(
  sourceEntries: Readonly<Record<string, KinkEntry>> | undefined,
  partnerEntries: Readonly<Record<string, KinkEntry>> | undefined,
  kinkId: string,
): ComplementaryComparisonEntries {
  const partnerKinkId = complementaryPartnerKinkId(kinkId);
  return {
    sourceKinkId: kinkId,
    partnerKinkId,
    sourceEntry: sourceEntries?.[kinkId] ?? EMPTY_ENTRY,
    partnerEntry: partnerEntries?.[partnerKinkId] ?? EMPTY_ENTRY,
  };
}

export function complementaryCompareLabel(kinkId: string, fallbackName: string): string {
  const special = SPECIAL_PAIR_BY_KINK_ID.get(kinkId);
  if (!special) return directionalCompareLabel(kinkId, fallbackName);
  const side = special.leftId === kinkId ? special.leftLabel : special.rightLabel;
  return "Diaper wearing — " + side;
}
