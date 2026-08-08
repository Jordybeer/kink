import type { Kink } from "@/types";

export type QuestionnaireCluster =
  | "power"
  | "impact"
  | "bondage"
  | "sensation"
  | "role_expression"
  | "sexual_social"
  | "care"
  | "discovery";

/**
 * Thin catalog metadata for question adjacency only. These clusters describe
 * subjects, never people: they must not be used to infer identity or answers.
 */
export const QUESTIONNAIRE_CATEGORY_CLUSTERS: Record<string, readonly QuestionnaireCluster[]> = {
  "Impact Play": ["impact"],
  Bondage: ["bondage"],
  "Power Exchange": ["power"],
  "Rituelen & Training": ["power"],
  "Straf & Correctie": ["power", "impact"],
  "Sensation Play": ["sensation"],
  "Materiaal & Geur": ["sensation"],
  "Aanbidding & Worship": ["role_expression", "power"],
  "Uiterlijk & Kleding": ["role_expression"],
  "Role Play": ["role_expression"],
  "Pet Play": ["role_expression", "power"],
  "Ageplay & Little Space": ["role_expression"],
  "Exhibition & Voyeurism": ["sexual_social"],
  "Fluid & Bodily": ["sexual_social"],
  "Anal & Penetration": ["sexual_social"],
  Aftercare: ["care"],
};

const DISCOVERY_CLUSTER: readonly QuestionnaireCluster[] = ["discovery"];

export function questionnaireClustersFor(kink: Kink): readonly QuestionnaireCluster[] {
  return QUESTIONNAIRE_CATEGORY_CLUSTERS[kink.category] ?? DISCOVERY_CLUSTER;
}

export function questionnairePrimaryCluster(kink: Kink): QuestionnaireCluster {
  return questionnaireClustersFor(kink)[0];
}
