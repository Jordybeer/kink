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
  interaction: ["sexual_social", "role_expression"],
  sensation: ["sensation"],
  sexual_acts: ["sexual_social"],
  exhibition: ["sexual_social"],
  media: ["sexual_social"],
  group_partner: ["sexual_social"],
  body_focus: ["role_expression", "power"],
  // Legacy only: live catalog items are migrated out of this retired category.
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
    "spanking_hand_give", "spanking_hand_receive", "spanking_implement_give", "spanking_implement_receive",
    "flogging_give", "flogging_receive", "caning_give", "caning_receive",
    "cropping_give", "cropping_receive", "paddling_give", "paddling_receive",
    "whipping_give", "whipping_receive", "belt_give", "belt_receive",
    "slapping_face_give", "slapping_face_receive", "punching_give", "punching_receive",
    "trampling_give", "trampling_receive", "over_de_knie",
    "rubber_zweep_slapper", "fire_flogger", "bullwhip", "body_slapping", "strafspanking", "ballbusting",
  ],
  rope: [
    "rope_bondage_give", "rope_bondage_receive", "shibari_give", "shibari_receive",
    "suspension_rechtop_give", "suspension_rechtop_receive",
    "suspension_ondersteboven_give", "suspension_ondersteboven_receive",
    "suspension_horizontaal_give", "suspension_horizontaal_receive",
  ],
  restraints: [
    "handcuffs_give", "handcuffs_receive", "leather_cuffs_give", "leather_cuffs_receive",
    "spreader_bar_give", "spreader_bar_receive", "hogtie_give", "hogtie_receive",
    "mummification_give", "mummification_receive", "straitjacket_give", "straitjacket_receive",
    "borsten_afbinden", "sleepsack", "predicament_bondage", "vacuumbed",
  ],
  gags: [
    "gag_ball_give", "gag_ball_receive", "gag_bit_give", "gag_bit_receive",
    "gag_tape_give", "gag_tape_receive", "gag_opblaasbaar_give", "gag_opblaasbaar_receive",
    "gag_penisvorm_give", "gag_penisvorm_receive", "gag_rubber_give", "gag_rubber_receive",
  ],
  protocols: [
    "rules_protocols", "rituelen_protocols", "toestemmingsprotocol", "spraakprotocol",
    "hoog_protocol", "kleding_commando", "verplicht_nudisme_prive", "verplicht_nudisme_publiek",
  ],
  orgasm_control: [
    "chastity", "forced_orgasm", "orgasm_denial", "orgasm_control", "orgasme_uitstel_straf",
    "orgasme_op_commando",
  ],
  interaction_chemistry: [
    "kissing_making_out", "intense_eye_contact", "sexual_sounds_auralism", "erotic_teasing",
    "slow_sensual_sex", "anticipation_suspense", "play_fighting", "dirty_talk", "rough_sex",
    "erotisch_dansen_prive",
  ],
  sexual_acts: [
    "oral_sex_give", "oral_sex_receive", "manual_stimulation_give", "manual_stimulation_receive",
    "deep_throat_give", "deep_throat_receive", "mutual_masturbation", "partner_masturbation_watch",
    "erotic_massage_give", "erotic_massage_receive", "facesitting", "footjob_give", "footjob_receive",
    "rimming_give", "rimming_receive",
  ],
  exhibition: ["exhibitionism", "being_watched", "public_play", "dogging", "webcam", "remote_toy_publiek", "erotisch_dansen_publiek"],
  voyeurism: ["voyeurism", "watching_others"],
  media_capture: ["nude_photography", "recording", "webcam", "adult_content_creation"],
  masturbation: ["mutual_masturbation", "partner_masturbation_watch", "joi"],
  remote_toys: ["remote_toy", "remote_toy_publiek"],
  sensory_deprivation: ["blindfold_give", "blindfold_receive", "hood_give", "hood_receive", "sound_deprivation_give", "sound_deprivation_receive"],
  watersports: [
    "watersports_geven", "watersports_ontvangen", "urine_intiem", "plas_merken",
    "plas_desperation", "buiten_plassen", "plas_in_kleding", "plas_slaaf",
  ],
  anal: [
    "anal_sex_give", "anal_sex_receive", "anal_fingering_give", "anal_fingering_receive",
    "pegging_give", "pegging_receive", "butt_plug", "anal_beads",
    "fisting_anal_give", "fisting_anal_receive", "rimming_give", "rimming_receive", "anale_training",
  ],
  foot_focus: [
    "feet", "hoge_hakken_aanbidding", "footjob_give", "footjob_receive", "voetgeur",
    "voeten_in_gezicht", "voeten_in_mond", "voet_vernedering", "voetslaaf",
    "laarzen_aanbidding_give", "laarzen_aanbidding_receive",
  ],
  scent: ["geur_scent_fetish", "voetgeur", "panty_sniffing"],
  fetishwear: [
    "leather", "latex_rubber", "lingerie", "kniekousen_fetish", "wetlook", "hoge_hakken_dragen",
    "hoge_hakken_aanbidding", "stocking_worship", "laarzen_aanbidding_give", "laarzen_aanbidding_receive",
  ],
  little_ageplay: [
    "little_speelgoed", "ddlg_mdlb_dynamiek", "little_space", "baby_infantiliteit",
    "fopspeen_fles",
  ],
  diaper_play: [
    "luiers_dragen", "diaper_partner_wearing", "diaper_wetting", "diaper_messing",
    "diaper_changing_give", "diaper_changing_receive",
  ],
  pet_play: [
    "petplay_collar_id", "petplay_puppy", "petplay_kitten", "petplay_pony",
    "petplay_harnas", "petplay_oortjes", "petplay_leiband", "petplay_geluiden", "petplay_kom",
    "fox_tail_plug", "petplay_kooi", "petplay_kattenbak",
    "pet_training_give", "pet_training_receive", "pet_grooming_give", "pet_grooming_receive",
  ],
  aftercare: [
    "aftercare_physical", "aftercare_verbal", "aftercare_alone", "aftercare_food",
    "aftercare_journaling", "next_day_check_in", "aftercare_cleanup",
  ],
  breeding: ["breeding_fantasy", "creampie"],
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
 * Category anchors define the maintained broad first-round coverage. The live
 * set deliberately stays at the historical 45-question compatibility budget.
 */
const LIVE_QUESTIONNAIRE_CATEGORY_ANCHOR_IDS = {
  impact: ["spanking_hand_give", "flogging_give"],
  bondage: ["handcuffs_give", "rope_bondage_give", "gag_ball_give", "blindfold_give"],
  power: ["dominance_submission", "praise_kink", "humiliation_verbal", "orgasm_control"],
  rituals: ["rules_protocols"],
  discipline: ["punishment"],
  roleplay: ["masseur_client", "cnc"],
  interaction: ["erotic_teasing"],
  sensation: ["ice_play", "tickling", "choking", "geur_scent_fetish"],
  sexual_acts: ["oral_sex_give"],
  exhibition: ["exhibitionism", "voyeurism"],
  media: ["nude_photography", "recording"],
  group_partner: ["trio_groepsseks"],
  body_focus: ["thigh_focus", "feet"],
  pet_play: ["petplay_collar_id", "petplay_puppy"],
  fluids: ["cum_play", "drool_play", "spitting"],
  toys: ["vibration_play", "remote_toy"],
  penetration: ["butt_plug", "pegging_give", "pegging_receive"],
  aftercare: ["aftercare_physical", "aftercare_alone", "next_day_check_in"],
  appearance: ["lingerie", "hoge_hakken_dragen"],
  adult_ageplay: ["little_speelgoed", "ddlg_mdlb_dynamiek", "luiers_dragen"],
} as const;

/**
 * materials_scent is a legacy type-only category. Keeping a non-enumerable empty
 * slot preserves direct compatibility without letting Object.keys/Object.values
 * revive it as a user-facing category or inflate the fixed denominator.
 */
export const QUESTIONNAIRE_CATEGORY_ANCHOR_IDS = Object.defineProperty(
  LIVE_QUESTIONNAIRE_CATEGORY_ANCHOR_IDS,
  "materials_scent",
  { value: Object.freeze([]), enumerable: false, writable: false, configurable: false },
) as typeof LIVE_QUESTIONNAIRE_CATEGORY_ANCHOR_IDS & { readonly materials_scent: readonly [] };

export const QUESTIONNAIRE_COVERAGE_ANCHOR_IDS = Object.values(
  QUESTIONNAIRE_CATEGORY_ANCHOR_IDS,
).flat();

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
  impact: ["spanking_hand_give", "flogging_give"],
  bondage: ["handcuffs_give", "rope_bondage_give", "gag_ball_give"],
  sensation: ["ice_play", "tickling", "geur_scent_fetish"],
  humiliation: ["humiliation_verbal", "service"],
  sexual_social: ["being_watched", "voyeur_sharing", "oral_sex_give"],
};

/**
 * Symmetrische inhoudelijke nabijheid: alleen een positieve fluistering voor de
 * volgorde. Ze opent geen probe en draagt nooit een harde grens mee.
 */
export const QUESTIONNAIRE_RELATED_PAIRS = [
  ["spanking_hand_give", "spanking_implement_give"],
  ["spanking_hand_receive", "spanking_implement_receive"],
  ["rope_bondage_give", "shibari_give"],
  ["rope_bondage_receive", "shibari_receive"],
  ["handcuffs_give", "leather_cuffs_give"],
  ["handcuffs_receive", "leather_cuffs_receive"],
  ["gag_ball_give", "gag_bit_give"],
  ["gag_ball_receive", "gag_bit_receive"],
  ["rules_protocols", "rituelen_protocols"],
  ["orgasm_control", "orgasm_denial"],
  ["exhibitionism", "being_watched"],
  ["voyeurism", "watching_others"],
  ["watersports_ontvangen", "urine_intiem"],
  ["anal_fingering_give", "anal_sex_give"],
  ["anal_fingering_receive", "anal_sex_receive"],
  ["geur_scent_fetish", "panty_sniffing"],
  ["little_speelgoed", "little_space"],
  ["petplay_puppy", "petplay_harnas"],
  ["aftercare_physical", "aftercare_verbal"],
  ["aftercare_physical", "aftercare_cleanup"],
  ["aftercare_verbal", "next_day_check_in"],
  ["blindfold_give", "sound_deprivation_give"],
  ["blindfold_receive", "sound_deprivation_receive"],
  ["being_watched", "public_play"],
  ["remote_toy", "remote_toy_publiek"],
  ["nude_photography", "recording"],
  ["recording", "adult_content_creation"],
  ["mutual_masturbation", "partner_masturbation_watch"],
  ["luiers_dragen", "diaper_partner_wearing"],
  ["luiers_dragen", "diaper_wetting"],
  ["breeding_fantasy", "creampie"],
  ["kissing_making_out", "slow_sensual_sex"],
  ["erotic_teasing", "anticipation_suspense"],
  ["erotic_teasing", "intense_eye_contact"],
  ["play_fighting", "rough_sex"],
  ["oral_sex_give", "deep_throat_give"],
  ["oral_sex_receive", "deep_throat_receive"],
] as const satisfies readonly (readonly [string, string])[];

/**
 * Directionele deur van vraag naar vraag. Geen categorie- of topicachterdeur:
 * zonder expliciete edge is de propagation precies nul.
 */
export const QUESTIONNAIRE_FOLLOW_UPS: Readonly<Record<string, readonly string[]>> = {
  spanking_hand_give: ["spanking_implement_give", "flogging_give"],
  spanking_hand_receive: ["spanking_implement_receive", "flogging_receive"],
  rope_bondage_give: ["shibari_give"],
  rope_bondage_receive: ["shibari_receive"],
  handcuffs_give: ["leather_cuffs_give"],
  handcuffs_receive: ["leather_cuffs_receive"],
  rules_protocols: ["rituelen_protocols"],
  ochtend_avondritueel: ["rituelen_protocols"],
  orgasm_control: ["orgasm_denial"],
  exhibitionism: ["being_watched"],
  voyeurism: ["watching_others"],
  watersports_ontvangen: ["urine_intiem"],
  geur_scent_fetish: ["panty_sniffing"],
  petplay_puppy: ["petplay_harnas"],
  blindfold_give: ["sound_deprivation_give"],
  blindfold_receive: ["sound_deprivation_receive"],
  being_watched: ["public_play"],
  remote_toy: ["remote_toy_publiek"],
  nude_photography: ["recording"],
  partner_masturbation_watch: ["mutual_masturbation"],
  anal_fingering_give: ["anal_sex_give"],
  anal_fingering_receive: ["anal_sex_receive"],
  luiers_dragen: ["diaper_wetting"],
  breeding_fantasy: ["creampie"],
};

/**
 * VERSIONED CONTRACT — een source -> target wijziging is een semantische migratie.
 * Nieuwe mappings mogen alleen met expliciete audit; bestaande mappings wijzigen
 * uitsluitend samen met een version bump en bijbehorende pre-launch cleanup.
 * Er is bewust geen fallback of automatische sibling-propagatie.
 */
export const QUESTIONNAIRE_CANONICAL_MAPPING_VERSION = 6;

export const QUESTIONNAIRE_CANONICAL_PROBE_TARGETS: Readonly<Record<string, string>> = {
  spanking_hand_give: "spanking_implement_give",
  spanking_hand_receive: "spanking_implement_receive",
  rope_bondage_give: "shibari_give",
  rope_bondage_receive: "shibari_receive",
  handcuffs_give: "leather_cuffs_give",
  handcuffs_receive: "leather_cuffs_receive",
  rules_protocols: "rituelen_protocols",
  ochtend_avondritueel: "rituelen_protocols",
  orgasm_control: "orgasm_denial",
  exhibitionism: "being_watched",
  voyeurism: "watching_others",
  watersports_ontvangen: "urine_intiem",
  geur_scent_fetish: "panty_sniffing",
  petplay_puppy: "petplay_harnas",
  blindfold_give: "sound_deprivation_give",
  blindfold_receive: "sound_deprivation_receive",
  being_watched: "public_play",
  remote_toy: "remote_toy_publiek",
  nude_photography: "recording",
  partner_masturbation_watch: "mutual_masturbation",
  anal_fingering_give: "anal_sex_give",
  anal_fingering_receive: "anal_sex_receive",
  luiers_dragen: "diaper_wetting",
  breeding_fantasy: "creampie",
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
