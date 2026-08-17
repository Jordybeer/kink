import type { KinkEntry } from "@/types";

/**
 * Een progression edge zegt uitsluitend: vraag de bredere/lichtere ingang vóór
 * de expliciete verdieping wanneer beide tegelijk in de wachtrij staan.
 *
 * Dit is géén antwoordpropagatie, géén matchingsemantiek en géén eligibility-
 * regel. Een negatief of neutraal antwoord op de parent verbiedt de child dus
 * niet in Discover/Deep Dive; Dynamic blijft zijn bestaande expliciete
 * canonical-probecontract volgen.
 */
export const QUESTIONNAIRE_PROGRESSION_EDGES = [
  ["spanking_hand_give", "spanking_implement_give"],
  ["spanking_hand_receive", "spanking_implement_receive"],
  ["rope_bondage_give", "shibari_give"],
  ["rope_bondage_receive", "shibari_receive"],
  ["blindfold_give", "sound_deprivation_give"],
  ["blindfold_receive", "sound_deprivation_receive"],
  ["watersports_ontvangen", "urine_intiem"],
  ["nude_photography", "recording"],
  ["being_watched", "public_play"],
  ["remote_toy", "remote_toy_publiek"],
] as const satisfies readonly (readonly [string, string])[];

const PARENTS_BY_CHILD = new Map<string, string[]>();
for (const [parentId, childId] of QUESTIONNAIRE_PROGRESSION_EDGES) {
  PARENTS_BY_CHILD.set(childId, [...(PARENTS_BY_CHILD.get(childId) ?? []), parentId]);
}

export function questionnaireProgressionParentIds(kinkId: string): readonly string[] {
  return PARENTS_BY_CHILD.get(kinkId) ?? [];
}

export function unansweredQuestionnaireProgressionParents(
  kinkId: string,
  entries: Record<string, KinkEntry>,
): readonly string[] {
  return questionnaireProgressionParentIds(kinkId).filter(
    (parentId) => entries[parentId]?.status == null,
  );
}
