import type { Kink, KinkCategoryId, QuestionnaireInterest } from "@/types";

export type QuestionnaireCluster =
  | "power"
  | "impact"
  | "bondage"
  | "sensation"
  | "role_expression"
  | "sexual_social"
  | "care"
  | "discovery";

/** Brede speelkamers voor variatie; ze sturen het ritme, nooit iemands verlangen. */
export const QUESTIONNAIRE_CATEGORY_CLUSTERS: Record<KinkCategoryId, readonly QuestionnaireCluster[]> = {
  impact: ["impact"],
  bondage: ["bondage"],
  power: ["power"],
  rituals: ["power"],
  discipline: ["power", "impact"],
  roleplay: ["role_expression"],
  sensation: ["sensation"],
  exhibition: ["sexual_social"],
  media: ["sexual_social"],
  group_partner: ["sexual_social"],
  body_focus: ["role_expression", "power"],
  materials_scent: ["sensation"],
  pet_play: ["role_expression", "power"],
  fluids: ["sexual_social"],
  toys: ["sexual_social", "sensation"],
  penetration: ["sexual_social"],
  aftercare: ["care"],
  appearance: ["role_expression"],
  adult_ageplay: ["role_expression"],
};

const DISCOVERY_CLUSTER: readonly QuestionnaireCluster[] = ["discovery"];

export function questionnaireClustersFor(kink: Kink): readonly QuestionnaireCluster[] {
  return kink.category === "custom"
    ? DISCOVERY_CLUSTER
    : QUESTIONNAIRE_CATEGORY_CLUSTERS[kink.category];
}

export function questionnairePrimaryCluster(kink: Kink): QuestionnaireCluster {
  return questionnaireClustersFor(kink)[0];
}

/**
 * Topics zijn fijner dan clusters en houden enkel soortgelijke kaarten uit
 * elkaars nek. Ze dragen geen antwoord over: ontbrekende metadata geeft minder
 * spacing, nooit een verzonnen voorkeur.
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
 * De vaste Dynamic-meetlat. Een anchor zegt alleen: "dit is expliciet gevraagd".
 * Elke echte status gespt hem vast; overslaan doet dat niet.
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
 * Klein voorste rijtje vóór interesses of expansion. Core betekent fundamentele
 * dekking, niet dat de engine een voorkeur ruikt.
 */
export const QUESTIONNAIRE_CORE_ANCHOR_IDS = [
  "dominance_submission",
  "aftercare_physical",
] as const;

/** Extra anchors die alleen door zelfgekozen interesses op de gastenlijst komen. */
export const QUESTIONNAIRE_INTEREST_ANCHOR_IDS: Record<QuestionnaireInterest, readonly string[]> = {
  power: ["service", "rules_protocols", "orgasm_control"],
  impact: ["spanking_hand", "flogging"],
  bondage: ["handcuffs", "rope_bondage", "gag_ball"],
  sensation: ["ice_play", "tickling", "geur_scent_fetish"],
  humiliation: ["humiliation_verbal", "service"],
  sexual_social: ["being_watched", "voyeur_sharing", "butt_plug"],
};

/**
 * Optionele smaakmakers voor "Meer ontdekken". Elke wave pakt hoogstens één
 * onbeantwoorde anchor per brede kamer, zonder discovery in een nieuw korset te
 * dwingen.
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
 * Symmetrische inhoudelijke nabijheid: alleen een positieve fluistering voor de
 * volgorde. Ze opent geen probe en draagt nooit een harde grens mee.
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
 * Directionele deur van vraag naar vraag. Geen categorie- of topicachterdeur:
 * zonder expliciete edge is de propagation precies nul.
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
 * APPEND-ONLY CONTRACT — dit slot gaat niet stiekem van sleutel wisselen.
 *
 * Een bestaande source -> target wijzigen of wissen is een semantische migratie,
 * geen onschuldige metadata-opruimbeurt. Nieuwe sources mogen erbij. Het target
 * blijft vastgepind, zodat reloads of catalogusherschikking een oud positief
 * antwoord nooit een tweede expansionbeurt geven. Er is bewust geen fallback.
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
