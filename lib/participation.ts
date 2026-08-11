import type { KinkEntry, ProfilePerspective } from "@/types";
import {
  directionalCompareLabel,
  partnerDirectionalKinkId,
  questionnaireDirectionalKinkIdForPerspective,
} from "@/lib/directionality";

export interface ComplementaryParticipationPair {
  conceptId: string;
  leftId: string;
  rightId: string;
  leftLabel: string;
  rightLabel: string;
  /** Compacte Dynamic-anchorselectie; nooit een antwoord- of eligibilityregel. */
  questionnaireAffinity?: Readonly<Partial<Record<ProfilePerspective, "left" | "right">>>;
}

export const COMPLEMENTARY_PARTICIPATION_PAIRS = [
  {
    conceptId: "diaper_wearing",
    leftId: "luiers_dragen",
    rightId: "diaper_partner_wearing",
    leftLabel: "Zelf dragen",
    rightLabel: "Partner draagt",
    questionnaireAffinity: { dominant: "right", submissive: "left" },
  },
] as const satisfies readonly ComplementaryParticipationPair[];

const SPECIAL_PAIR_BY_KINK_ID = new Map<string, ComplementaryParticipationPair>();
for (const pair of COMPLEMENTARY_PARTICIPATION_PAIRS) {
  SPECIAL_PAIR_BY_KINK_ID.set(pair.leftId, pair);
  SPECIAL_PAIR_BY_KINK_ID.set(pair.rightId, pair);
}

/**
 * Eén perspectiefadapter voor coverage-anchors. Directionele give/receive
 * affinity en bijzondere participatie-assen blijven allebei zachte Dynamic
 * selectie, nooit een hard filter of voorkeurssignaal.
 */
export function questionnaireParticipationKinkIdForPerspective(
  kinkId: string,
  perspective?: ProfilePerspective,
): string {
  const directionalId = questionnaireDirectionalKinkIdForPerspective(kinkId, perspective);
  if (!perspective) return directionalId;
  const special = SPECIAL_PAIR_BY_KINK_ID.get(directionalId);
  const side = special?.questionnaireAffinity?.[perspective];
  if (!special || !side) return directionalId;
  return side === "left" ? special.leftId : special.rightId;
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
