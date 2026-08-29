import type { Kink } from "@/types";

export interface QuestionnairePresentation {
  title: string;
  essence: string;
  details: string | null;
  hasDetails: boolean;
}

type QuestionnaireCopyOverride = {
  essence: string;
  details?: string;
};

/**
 * Presentation-only names for directional questions whose catalog names leak
 * technical give/receive language. IDs and matching semantics stay untouched.
 * English remains the canonical visible kink vocabulary.
 */
export const QUESTIONNAIRE_TITLE_OVERRIDES: Readonly<Record<string, string>> = {
  spanking_hand_give: "Spanking a partner (by hand)",
  spanking_hand_receive: "Being spanked (by hand)",
  spanking_implement_give: "Spanking a partner (with an implement)",
  spanking_implement_receive: "Being spanked (with an implement)",
  flogging_give: "Flogging a partner",
  flogging_receive: "Being flogged",
  caning_give: "Caning a partner",
  caning_receive: "Being caned",
  cropping_give: "Using a crop on a partner",
  cropping_receive: "Being struck with a crop",
  paddling_give: "Paddling a partner",
  paddling_receive: "Being paddled",
  whipping_give: "Whipping a partner",
  whipping_receive: "Being whipped",
  belt_give: "Using a belt on a partner",
  belt_receive: "Being struck with a belt",
  slapping_face_give: "Slapping a partner’s face",
  slapping_face_receive: "Being slapped in the face",
  punching_give: "Punching / thudding a partner",
  punching_receive: "Being struck with punches / thuds",
  trampling_give: "Trampling a partner",
  trampling_receive: "Being trampled",

  anal_sex_give: "Anal sex — penetrating",
  anal_sex_receive: "Anal sex — being penetrated",
  anal_fingering_give: "Anal fingering a partner",
  anal_fingering_receive: "Being fingered anally",
  pegging_give: "Pegging a partner",
  pegging_receive: "Being pegged",
  fisting_anal_give: "Anal fisting a partner",
  fisting_anal_receive: "Being anally fisted",
  fisting_vaginal_give: "Vaginal fisting a partner",
  fisting_vaginal_receive: "Being vaginally fisted",
  deep_throat_give: "Deep-throating a partner",
  deep_throat_receive: "Being deep-throated",
  footjob_give: "Giving a footjob",
  footjob_receive: "Receiving a footjob",
  rimming_give: "Rimming a partner",
  rimming_receive: "Being rimmed",
  oral_sex_give: "Giving oral sex",
  oral_sex_receive: "Receiving oral sex",
  manual_stimulation_give: "Manually stimulating a partner",
  manual_stimulation_receive: "Receiving manual stimulation",
  erotic_massage_give: "Giving an erotic massage",
  erotic_massage_receive: "Receiving an erotic massage",
  sound_deprivation_give: "Restricting a partner’s hearing",
  sound_deprivation_receive: "Having your hearing restricted",
  prostate_massage_give: "Giving a prostate massage",
  prostate_massage_receive: "Receiving a prostate massage",
};

/**
 * Explicit decision copy wins over the catalog description when the first
 * catalog sentence is too long or misses a consent/safety fact that belongs on
 * the stable surface. This map is intentionally editorial, never inferred from
 * profile role or answers.
 *
 * This is deliberately a curated map, not a runtime summarizer. The existing
 * complete first catalog sentence remains the safe fallback while content is
 * reviewed in batches.
 */
const QUESTIONNAIRE_COPY_OVERRIDES: Readonly<Record<string, QuestionnaireCopyOverride>> = {
  cuckolding: {
    essence: "Een afgesproken scenario waarin jij weet of ziet dat je partner seks heeft met een instemmende derde.",
    details: "De specifieke cuckolding-dynamiek wordt daarbij expliciet benoemd.",
  },
  opgelegde_stilte: {
    essence: "Een afgesproken periode niet mogen spreken na het overtreden van een regel.",
    details: "Spreek een non-verbaal veiligheidssignaal af. Een straf mag nooit het stopwoord blokkeren.",
  },
  sound_deprivation_give: {
    essence: "Het gehoor van je partner tijdelijk beperken; spreek vooraf een tastbaar stopsignaal af.",
  },
  sound_deprivation_receive: {
    essence: "Zelf tijdelijk minder horen; spreek vooraf een tastbaar stopsignaal af.",
  },
  crossdressing_mtf: {
    essence: "Als volwassene tijdelijk een expliciet feminiene kleding- of presentatiestijl aannemen als erotisch, esthetisch of rollenspelelement.",
    details: "Dat zegt op zichzelf niets over je genderidentiteit.",
  },
  crossdressing_ftm: {
    essence: "Als volwassene tijdelijk een expliciet masculiene kleding- of presentatiestijl aannemen als erotisch, esthetisch of rollenspelelement.",
    details: "Dat zegt op zichzelf niets over je genderidentiteit.",
  },
  little_speelgoed: {
    essence: "Als volwassene kinderlijke comfortobjecten, spel of rustige activiteiten gebruiken.",
    details: "Dat veronderstelt niet automatisch little headspace of een caregiver-dynamiek.",
  },
  diaper_partner_wearing: {
    essence: "Het aantrekkelijk, erotisch of betekenisvol vinden dat een volwassen partner een luier draagt.",
    details: "Dat zegt niet dat je zelf een luier wilt dragen en veronderstelt geen ageplay, controle of vernedering.",
  },
  laarzen_aanbidding_receive: {
    essence: "Een partner je laarzen of schoenen laten kussen, likken of aanbidden als afgesproken fetisj- of D/s-spel.",
    details: "Daaruit wordt geen vaste dominante of submissieve profielrol afgeleid.",
  },
  ass_worship_give: {
    essence: "De billen van een partner aanbidden, bijvoorbeeld door te kussen, likken, masseren of ertegenaan te liggen.",
    details: "Dit veronderstelt geen vaste dominante of submissieve kant.",
  },
  ass_worship_receive: {
    essence: "Je billen door een partner laten aanbidden, bijvoorbeeld met kussen, likken, massage of andere lichamelijke aandacht.",
    details: "Dit veronderstelt geen vaste dominante of submissieve kant.",
  },
};

function normalizeQuestionnaireCopy(text: string): string {
  return text.replace(/\s+—\s+/g, ", ").replace(/\s{2,}/g, " ").trim();
}

function splitDescription(description: string): { essence: string; details: string | null } {
  const essence = description.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? description;
  const details = description.slice(essence.length).trim() || null;
  return { essence, details };
}

export function getQuestionnairePresentation(kink: Kink): QuestionnairePresentation {
  const description = kink.description?.trim() ?? "";
  const fallback = description ? splitDescription(description) : { essence: "", details: null };
  const copyOverride = QUESTIONNAIRE_COPY_OVERRIDES[kink.id];
  const rawEssence = copyOverride?.essence ?? fallback.essence;
  const rawDetails = copyOverride ? copyOverride.details ?? fallback.details : fallback.details;
  const essence = normalizeQuestionnaireCopy(rawEssence);
  const details = rawDetails ? normalizeQuestionnaireCopy(rawDetails) : null;

  return {
    title: QUESTIONNAIRE_TITLE_OVERRIDES[kink.id] ?? kink.name,
    essence,
    details,
    hasDetails: Boolean(details),
  };
}
