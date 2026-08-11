import {
  directionalPairForKinkId,
  directionalSideForKinkId,
} from "@/lib/directionality";
import type { ProfilePerspective } from "@/types";

export type QuestionnaireRolePolicy = "alignedUntilDeepDive";

/**
 * High-confidence D/s-bound handelingen. Buiten Deep Dive blijft de guided
 * questionnaire aan de gekozen perspective-kant. Dit is alleen eligibility:
 * er wordt nooit een antwoord, grens of identiteit uit afgeleid.
 *
 * Blindfold, hood en sound deprivation staan bewust niet in deze lijst. Ze
 * houden hun compacte Dynamic-affinity, maar zijn semantisch niet hard genoeg
 * om de tegenovergestelde kant buiten Discover/categorie te blokkeren.
 */
export const ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS = [
  "spanking_hand",
  "spanking_implement",
  "flogging",
  "caning",
  "cropping",
  "paddling",
  "whipping",
  "belt",
  "slapping_face",
  "punching",
  "trampling",
  "rope_bondage",
  "shibari",
  "handcuffs",
  "leather_cuffs",
  "spreader_bar",
  "hogtie",
  "mummification",
  "straitjacket",
  "gag_ball",
  "gag_bit",
  "gag_tape",
  "gag_opblaasbaar",
  "gag_penisvorm",
  "gag_rubber",
  "suspension_rechtop",
  "suspension_ondersteboven",
  "suspension_horizontaal",
  "opsluiting_kooi",
  "opsluiting_donker",
  "opsluiting_kleine_ruimte",
] as const;

const ROLE_BOUND_DIRECTIONAL_CONCEPTS = new Set<string>(ROLE_BOUND_DIRECTIONAL_CONCEPT_IDS);

export function questionnaireRolePolicyForKinkId(kinkId: string): QuestionnaireRolePolicy | null {
  const pair = directionalPairForKinkId(kinkId);
  return pair && ROLE_BOUND_DIRECTIONAL_CONCEPTS.has(pair.conceptId)
    ? "alignedUntilDeepDive"
    : null;
}

export function isQuestionnaireKinkEligibleForPerspective(
  kinkId: string,
  perspective?: ProfilePerspective,
  exhaustive = false,
): boolean {
  if (exhaustive || !perspective) return true;
  if (questionnaireRolePolicyForKinkId(kinkId) !== "alignedUntilDeepDive") return true;

  const side = directionalSideForKinkId(kinkId);
  if (!side) return true;
  return perspective === "dominant" ? side === "give" : side === "receive";
}
