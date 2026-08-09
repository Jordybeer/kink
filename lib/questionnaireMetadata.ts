import type { Kink, QuestionnaireInterest } from "@/types";

export type QuestionnaireCluster =
  | "power"
  | "impact"
  | "bondage"
  | "sensation"
  | "role_expression"
  | "sexual_social"
  | "care"
  | "discovery";

/** Broad subject buckets used only to keep discovery varied and prevent runs. */
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

/**
 * Conversation topics are deliberately finer than clusters, but still do not
 * propagate an answer. They only stop the deck from firing several near-identical
 * questions back-to-back. Missing topic metadata therefore means less spacing,
 * never an inferred preference.
 */
export const QUESTIONNAIRE_TOPIC_IDS = {
  impact: [
    "spanking_hand", "spanking_implement", "flogging", "caning", "cropping", "paddling",
    "whipping", "belt", "slapping_face", "punching", "trampling", "over_de_knie",
    "rubber_zweep_slapper", "fire_flogger", "bullwhip", "body_slapping", "strafspanking",
  ],
  rope: [
    "rope_bondage", "shibari", "suspension_rechtop", "suspension_ondersteboven",
    "suspension_horizontaal",
  ],
  restraints: [
    "handcuffs", "leather_cuffs", "spreader_bar", "hogtie", "mummification", "straitjacket",
    "borsten_afbinden", "sleepsack", "predicament_bondage", "vacuumbed",
  ],
  gags: ["gag_ball", "gag_bit", "gag_tape", "gag_opblaasbaar", "gag_penisvorm", "gag_rubber"],
  protocols: [
    "rules_protocols", "rituelen_protocols", "toestemmingsprotocol", "spraakprotocol",
    "hoog_protocol",
  ],
  orgasm_control: [
    "chastity", "forced_orgasm", "orgasm_denial", "orgasm_control", "orgasme_uitstel_straf",
    "orgasme_op_commando",
  ],
  exhibition: ["exhibitionism", "being_watched", "public_play", "dogging", "webcam", "remote_toy_publiek"],
  voyeurism: ["voyeurism", "watching_others"],
  watersports: [
    "watersports_geven", "watersports_ontvangen", "urine_intiem", "plas_merken",
    "plas_desperation", "buiten_plassen", "plas_in_kleding", "plas_slaaf",
  ],
  anal: [
    "anal_sex", "anal_fingering", "pegging", "butt_plug", "anal_beads", "fisting_anal",
    "rimmen", "anale_training",
  ],
  foot_worship: [
    "feet", "hoge_hakken_aanbidding", "footjob", "voetgeur", "trampling_voeten",
    "voeten_in_gezicht", "voeten_in_mond", "voet_vernedering", "voetslaaf", "laarzen_aanbidding",
  ],
  scent: ["geur_scent_fetish", "voetgeur", "panty_sniffing"],
  little_ageplay: [
    "little_speelgoed", "ddlg_mdlb_dynamiek", "little_space", "baby_infantiliteit",
    "fopspeen_fles", "luiers_dragen", "luiers_gebruik",
  ],
  pet_play: [
    "furry", "petplay_collar_id", "petplay_puppy", "petplay_kitten", "petplay_pony",
    "petplay_harnas", "petplay_oortjes", "petplay_leiband", "petplay_geluiden", "petplay_kom",
    "fox_tail_plug", "petplay_kooi", "petplay_kattenbak",
  ],
} as const;

export type QuestionnaireTopic = keyof typeof QUESTIONNAIRE_TOPIC_IDS;

const QUESTIONNAIRE_TOPICS_BY_ID = new Map<string, QuestionnaireTopic[]>();
for (const [topic, ids] of Object.entries(QUESTIONNAIRE_TOPIC_IDS) as [QuestionnaireTopic, readonly string[]][]) {
  for (const id of ids) {
    const topics = QUESTIONNAIRE_TOPICS_BY_ID.get(id) ?? [];
    topics.push(topic);
    QUESTIONNAIRE_TOPICS_BY_ID.set(id, topics);
  }
}

export function questionnaireTopicsFor(kink: Kink): readonly QuestionnaireTopic[] {
  return QUESTIONNAIRE_TOPICS_BY_ID.get(kink.id) ?? [];
}

/**
 * Stable Dynamic denominator. An anchor means only "this area was explicitly
 * asked". Every explicit status covers it equally; skip does not.
 */
export const QUESTIONNAIRE_COVERAGE_ANCHOR_IDS = [
  "aftercare_physical",
  "dominance_submission",
  "spanking_hand",
  "handcuffs",
  "rope_bondage",
  "gag_ball",
  "ice_play",
  "geur_scent_fetish",
  "feet",
  "lingerie",
  "little_speelgoed",
  "petplay_collar_id",
  "masseur_client",
  "exhibitionism",
  "voyeurism",
  "watersports_geven",
  "anal_fingering",
  "cum_play",
  "orgasm_control",
  "rules_protocols",
] as const;

/**
 * Small, explicit subset that should surface before interests or expansion.
 * Core means foundational questionnaire coverage, never a preference signal.
 */
export const QUESTIONNAIRE_CORE_ANCHOR_IDS = [
  "dominance_submission",
  "aftercare_physical",
] as const;

/** Extra fixed anchors earned only by interests the user explicitly selected. */
export const QUESTIONNAIRE_INTEREST_ANCHOR_IDS: Record<QuestionnaireInterest, readonly string[]> = {
  power: ["service", "rules_protocols", "orgasm_control"],
  impact: ["spanking_hand", "flogging"],
  bondage: ["handcuffs", "rope_bondage", "gag_ball"],
  sensation: ["ice_play", "tickling", "geur_scent_fetish"],
  humiliation: ["humiliation_verbal", "service"],
  sexual_social: ["being_watched", "voyeur_sharing", "butt_plug"],
};

/**
 * Optional anchors sampled by "Meer ontdekken". The wave scheduler takes at
 * most one still-unanswered anchor per broad cluster, so this list can grow
 * without turning discovery into another fixed questionnaire budget.
 */
export const QUESTIONNAIRE_DISCOVERY_ANCHOR_IDS = [
  "service",
  "flogging",
  "leather_cuffs",
  "shibari",
  "blindfold",
  "tickling",
  "wax_play",
  "body_worship",
  "little_space",
  "petplay_puppy",
  "doctor_patient",
  "being_watched",
  "watersports_ontvangen",
  "butt_plug",
  "swallowing",
  "aftercare_verbal",
  "humiliation_verbal",
  "voyeur_sharing",
  "ochtend_avondritueel",
  "dirty_talk",
] as const;

/**
 * Symmetric content-nearness used only as a positive ordering hint. It never
 * creates a probe and a hard limit never propagates over these edges.
 */
export const QUESTIONNAIRE_RELATED_PAIRS = [
  ["spanking_hand", "spanking_implement"],
  ["rope_bondage", "shibari"],
  ["handcuffs", "leather_cuffs"],
  ["gag_ball", "gag_bit"],
  ["rules_protocols", "rituelen_protocols"],
  ["orgasm_control", "orgasm_denial"],
  ["exhibitionism", "being_watched"],
  ["voyeurism", "watching_others"],
  ["watersports_geven", "watersports_ontvangen"],
  ["anal_fingering", "anal_sex"],
  ["feet", "hoge_hakken_aanbidding"],
  ["geur_scent_fetish", "panty_sniffing"],
  ["little_speelgoed", "little_space"],
  ["petplay_puppy", "petplay_harnas"],
  ["aftercare_physical", "aftercare_verbal"],
] as const satisfies readonly (readonly [string, string])[];

/**
 * Directional question-to-question continuation. No category/topic fallback is
 * allowed: if an edge is absent, propagation is exactly zero.
 */
export const QUESTIONNAIRE_FOLLOW_UPS: Readonly<Record<string, readonly string[]>> = {
  spanking_hand: ["spanking_implement", "flogging"],
  rope_bondage: ["shibari"],
  handcuffs: ["leather_cuffs"],
  rules_protocols: ["rituelen_protocols"],
  ochtend_avondritueel: ["rituelen_protocols"],
  orgasm_control: ["orgasm_denial"],
  exhibitionism: ["being_watched"],
  voyeurism: ["watching_others"],
  watersports_geven: ["watersports_ontvangen"],
  geur_scent_fetish: ["panty_sniffing"],
  petplay_puppy: ["petplay_harnas"],
};

/**
 * APPEND-ONLY CONTRACT.
 *
 * Changing or deleting an existing source -> target mapping is a semantic data
 * migration, not a metadata tidy-up. New sources may be added. The target is
 * pinned so a reload or later catalog reorder can never give one old positive
 * answer a second expansion slot. There is deliberately no fallback target.
 */
export const QUESTIONNAIRE_CANONICAL_PROBE_TARGETS: Readonly<Record<string, string>> = {
  spanking_hand: "spanking_implement",
  rope_bondage: "shibari",
  handcuffs: "leather_cuffs",
  rules_protocols: "rituelen_protocols",
  ochtend_avondritueel: "rituelen_protocols",
  orgasm_control: "orgasm_denial",
  exhibitionism: "being_watched",
  voyeurism: "watching_others",
  watersports_geven: "watersports_ontvangen",
  geur_scent_fetish: "panty_sniffing",
  petplay_puppy: "petplay_harnas",
};

const RELATED_BY_ID = new Map<string, string[]>();
for (const [left, right] of QUESTIONNAIRE_RELATED_PAIRS) {
  RELATED_BY_ID.set(left, [...(RELATED_BY_ID.get(left) ?? []), right]);
  RELATED_BY_ID.set(right, [...(RELATED_BY_ID.get(right) ?? []), left]);
}

export function questionnaireRelatedIds(kinkId: string): readonly string[] {
  return RELATED_BY_ID.get(kinkId) ?? [];
}

export function questionnaireFollowUpIds(kinkId: string): readonly string[] {
  return QUESTIONNAIRE_FOLLOW_UPS[kinkId] ?? [];
}

export function questionnaireCanonicalProbeTarget(kinkId: string): string | undefined {
  return QUESTIONNAIRE_CANONICAL_PROBE_TARGETS[kinkId];
}
