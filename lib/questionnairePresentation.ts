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
 */
const QUESTIONNAIRE_COPY_OVERRIDES: Readonly<Record<string, QuestionnaireCopyOverride>> = {
  cuckolding: {
    essence: "Een afgesproken scenario waarin jij weet of ziet dat je partner seks heeft met een instemmende derde.",
  },
  sound_deprivation_give: {
    essence: "Het gehoor van je partner tijdelijk beperken; spreek vooraf een tastbaar stopsignaal af.",
  },
  sound_deprivation_receive: {
    essence: "Zelf tijdelijk minder horen; spreek vooraf een tastbaar stopsignaal af.",
  },
};

function firstCompleteSentence(description: string): string {
  return description.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? description;
}

export function getQuestionnairePresentation(kink: Kink): QuestionnairePresentation {
  const description = kink.description?.trim() ?? "";
  const copyOverride = QUESTIONNAIRE_COPY_OVERRIDES[kink.id];
  const essence = copyOverride?.essence ?? (description ? firstCompleteSentence(description) : "");
  const details = copyOverride?.details ?? (description && description !== essence ? description : null);
  const hasAliases = Boolean(kink.aliases?.length);

  return {
    title: QUESTIONNAIRE_TITLE_OVERRIDES[kink.id] ?? kink.name,
    essence,
    details,
    hasDetails: Boolean(details || hasAliases),
  };
}
