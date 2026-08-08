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
 * Close topical neighbors for answer-driven ranking. This is deliberately
 * sparse: an unlisted kink gets no relevance signal instead of inheriting one
 * from a broad category. Topics describe questions, never people or motives.
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
