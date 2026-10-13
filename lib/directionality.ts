import type { KinkEntry, Profile, ProfilePerspective } from "@/types";

export type DirectionalKinkSide = "give" | "receive";

export interface DirectionalKinkPair {
  conceptId: string;
  giveId: string;
  receiveId: string;
  /** Alleen voor compacte Dynamic eligibility; nooit voor matching of antwoord-inferentie. */
  questionnaireAffinity?: Readonly<Partial<Record<ProfilePerspective, DirectionalKinkSide>>>;
}

const DOM_GIVE_SUB_RECEIVE_AFFINITY = {
  dominant: "give",
  submissive: "receive",
} as const satisfies Readonly<Record<ProfilePerspective, DirectionalKinkSide>>;

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
  { conceptId: "oral_sex", giveId: "oral_sex_give", receiveId: "oral_sex_receive" },
  { conceptId: "manual_stimulation", giveId: "manual_stimulation_give", receiveId: "manual_stimulation_receive" },
  { conceptId: "body_worship", giveId: "body_worship_give", receiveId: "body_worship_receive" },
  { conceptId: "vagina_aanbidding", giveId: "vagina_aanbidding_give", receiveId: "vagina_aanbidding_receive" },
  { conceptId: "cock_worship", giveId: "cock_worship_give", receiveId: "cock_worship_receive" },
  { conceptId: "ass_worship", giveId: "ass_worship_give", receiveId: "ass_worship_receive" },
  { conceptId: "laarzen_aanbidding", giveId: "laarzen_aanbidding_give", receiveId: "laarzen_aanbidding_receive" },
  { conceptId: "erotic_massage", giveId: "erotic_massage_give", receiveId: "erotic_massage_receive" },
  { conceptId: "prostate_massage", giveId: "prostate_massage_give", receiveId: "prostate_massage_receive" },
  { conceptId: "pet_training", giveId: "pet_training_give", receiveId: "pet_training_receive" },
  { conceptId: "pet_grooming", giveId: "pet_grooming_give", receiveId: "pet_grooming_receive" },
  { conceptId: "diaper_changing", giveId: "diaper_changing_give", receiveId: "diaper_changing_receive" },
  { conceptId: "spanking_hand", giveId: "spanking_hand_give", receiveId: "spanking_hand_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "spanking_implement", giveId: "spanking_implement_give", receiveId: "spanking_implement_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "flogging", giveId: "flogging_give", receiveId: "flogging_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "caning", giveId: "caning_give", receiveId: "caning_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "cropping", giveId: "cropping_give", receiveId: "cropping_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "paddling", giveId: "paddling_give", receiveId: "paddling_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "whipping", giveId: "whipping_give", receiveId: "whipping_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "belt", giveId: "belt_give", receiveId: "belt_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "slapping_face", giveId: "slapping_face_give", receiveId: "slapping_face_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "punching", giveId: "punching_give", receiveId: "punching_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "trampling", giveId: "trampling_give", receiveId: "trampling_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "rope_bondage", giveId: "rope_bondage_give", receiveId: "rope_bondage_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "shibari", giveId: "shibari_give", receiveId: "shibari_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "handcuffs", giveId: "handcuffs_give", receiveId: "handcuffs_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "leather_cuffs", giveId: "leather_cuffs_give", receiveId: "leather_cuffs_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "spreader_bar", giveId: "spreader_bar_give", receiveId: "spreader_bar_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "hogtie", giveId: "hogtie_give", receiveId: "hogtie_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "mummification", giveId: "mummification_give", receiveId: "mummification_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "straitjacket", giveId: "straitjacket_give", receiveId: "straitjacket_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_ball", giveId: "gag_ball_give", receiveId: "gag_ball_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_bit", giveId: "gag_bit_give", receiveId: "gag_bit_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_tape", giveId: "gag_tape_give", receiveId: "gag_tape_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_opblaasbaar", giveId: "gag_opblaasbaar_give", receiveId: "gag_opblaasbaar_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_penisvorm", giveId: "gag_penisvorm_give", receiveId: "gag_penisvorm_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "gag_rubber", giveId: "gag_rubber_give", receiveId: "gag_rubber_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "blindfold", giveId: "blindfold_give", receiveId: "blindfold_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "hood", giveId: "hood_give", receiveId: "hood_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "suspension_rechtop", giveId: "suspension_rechtop_give", receiveId: "suspension_rechtop_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "suspension_ondersteboven", giveId: "suspension_ondersteboven_give", receiveId: "suspension_ondersteboven_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "suspension_horizontaal", giveId: "suspension_horizontaal_give", receiveId: "suspension_horizontaal_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "opsluiting_kooi", giveId: "opsluiting_kooi_give", receiveId: "opsluiting_kooi_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "opsluiting_donker", giveId: "opsluiting_donker_give", receiveId: "opsluiting_donker_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "opsluiting_kleine_ruimte", giveId: "opsluiting_kleine_ruimte_give", receiveId: "opsluiting_kleine_ruimte_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
  { conceptId: "sound_deprivation", giveId: "sound_deprivation_give", receiveId: "sound_deprivation_receive", questionnaireAffinity: DOM_GIVE_SUB_RECEIVE_AFFINITY },
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
  oral_sex: "Oral sex",
  manual_stimulation: "Manual stimulation",
  body_worship: "Body worship",
  vagina_aanbidding: "Vulva / pussy worship",
  cock_worship: "Cock worship",
  ass_worship: "Ass worship",
  laarzen_aanbidding: "Boot / shoe worship",
  erotic_massage: "Erotic massage",
  prostate_massage: "Prostate massage",
  pet_training: "Pet training / tricks",
  pet_grooming: "Pet grooming",
  diaper_changing: "Diaper changing",
  spanking_hand: "Spanking (hand)",
  spanking_implement: "Implement spanking",
  flogging: "Flogging",
  caning: "Caning",
  cropping: "Crop",
  paddling: "Paddling",
  whipping: "Whipping",
  belt: "Belt",
  slapping_face: "Face slapping",
  punching: "Punching / thudding",
  trampling: "Trampling",
  rope_bondage: "Rope bondage",
  shibari: "Shibari",
  handcuffs: "Handcuffs",
  leather_cuffs: "Leather cuffs",
  spreader_bar: "Spreader bar",
  hogtie: "Hogtie",
  mummification: "Mummification",
  straitjacket: "Straitjacket",
  gag_ball: "Ball gag",
  gag_bit: "Bit gag",
  gag_tape: "Tape gag",
  gag_opblaasbaar: "Inflatable gag",
  gag_penisvorm: "Penis-shaped gag",
  gag_rubber: "Rubber gag",
  blindfold: "Blindfold",
  hood: "Hood / sensory deprivation hood",
  suspension_rechtop: "Upright suspension",
  suspension_ondersteboven: "Inverted suspension",
  suspension_horizontaal: "Horizontal suspension",
  opsluiting_kooi: "Cage confinement",
  opsluiting_donker: "Dark confinement",
  opsluiting_kleine_ruimte: "Small-space confinement",
  sound_deprivation: "Sound deprivation",
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

/**
 * Kiest uitsluitend welke kant als compacte Dynamic-anchor telt. De helper
 * muteert geen entry en zegt niets over de onbekende sibling.
 */
export function questionnaireDirectionalKinkIdForPerspective(
  kinkId: string,
  perspective?: ProfilePerspective,
): string {
  if (!perspective) return kinkId;
  const pair = directionalPairForKinkId(kinkId);
  const side = pair?.questionnaireAffinity?.[perspective];
  if (!pair || !side) return kinkId;
  return side === "give" ? pair.giveId : pair.receiveId;
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
  "body_worship",
  "vagina_aanbidding",
  "cock_worship",
  "ass_worship",
  "laarzen_aanbidding",
  "erotic_massage",
  "prostate_massage",
  "pet_training",
  "pet_grooming",
  "diaper_changing",
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
  "blindfold",
  "hood",
  "suspension_rechtop",
  "suspension_ondersteboven",
  "suspension_horizontaal",
  "opsluiting_kooi",
  "opsluiting_donker",
  "opsluiting_kleine_ruimte",
  "sound_deprivation",
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
