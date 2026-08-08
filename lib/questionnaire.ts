import { KINKS, LEVEL_MAX } from "@/lib/kinks";
import { rankQuestionnaireCandidates } from "@/lib/questionnaireEngine";
import type {
  Kink,
  Profile,
  QuestionnaireInterest,
  QuestionnairePreset,
  QuestionnaireSetup,
} from "@/types";

export const QUESTIONNAIRE_INTERESTS: Array<{
  value: QuestionnaireInterest;
  label: string;
  description: string;
}> = [
  {
    value: "power",
    label: "Macht & overgave",
    description: "Dominantie, service, regels, rituelen en controle.",
  },
  {
    value: "impact",
    label: "Impact & pijn",
    description: "Spanking, impact, pijnspel en intensere sensaties.",
  },
  {
    value: "bondage",
    label: "Bondage & beperking",
    description: "Touw, cuffs, immobilisatie en bewegingsbeperking.",
  },
  {
    value: "sensation",
    label: "Sensatie & lichaam",
    description: "Temperatuur, aanraking, zintuigen en lichamelijke prikkels.",
  },
  {
    value: "humiliation",
    label: "Vernedering & service",
    description: "Service, aanbidding, objectificatie en consensuele vernedering.",
  },
  {
    value: "sexual_social",
    label: "Seksueel & sociaal",
    description: "Seksuele handelingen, rollenspel, publiek spel en meerdere personen.",
  },
];

export const QUESTIONNAIRE_PRESETS: Array<{
  value: QuestionnairePreset;
  label: string;
  description: string;
  target: number | null;
}> = [
  {
    value: "quick",
    label: "Snel starten",
    description: "Een compacte kernlijst met jouw gekozen interesses.",
    target: 52,
  },
  {
    value: "balanced",
    label: "Gebalanceerd",
    description: "Een brede startlijst met ruimte voor ontdekking.",
    target: 104,
  },
  {
    value: "full",
    label: "Volledig",
    description: "De volledige catalogus, zonder voorselectie.",
    target: null,
  },
];

export const DEFAULT_QUESTIONNAIRE_SETUP: QuestionnaireSetup = {
  preset: "balanced",
  interests: [],
  version: 1,
};

const SAFETY_TERMS = [
  "toestemming",
  "consent",
  "safeword",
  "stopwoord",
  "veilig",
  "grens",
  "communicatie",
  "check-in",
  "aftercare",
  "nazorg",
  "onderhand",
];

const INTEREST_TERMS: Record<QuestionnaireInterest, string[]> = {
  power: [
    "domin",
    "submiss",
    "macht",
    "controle",
    "service",
    "protocol",
    "ritueel",
    "training",
    "straf",
    "correctie",
    "regel",
  ],
  impact: [
    "impact",
    "spank",
    "flog",
    "whip",
    "paddle",
    "crop",
    "pijn",
    "sadis",
    "masoch",
    "needle",
    "naald",
    "elektro",
  ],
  bondage: [
    "bondage",
    "rope",
    "touw",
    "shibari",
    "cuff",
    "boei",
    "restraint",
    "beperk",
    "immobil",
    "suspension",
  ],
  sensation: [
    "sensatie",
    "sensory",
    "zintuig",
    "temperatuur",
    "wax",
    "kaars",
    "ijs",
    "tickl",
    "kietel",
    "aanraking",
    "adem",
    "breath",
  ],
  humiliation: [
    "verneder",
    "humili",
    "degrad",
    "object",
    "worship",
    "aanbidding",
    "service",
    "exposure",
    "lichaam",
    "body",
  ],
  sexual_social: [
    "seks",
    "sexual",
    "oral",
    "anaal",
    "anal",
    "penetr",
    "orgasm",
    "groep",
    "group",
    "publiek",
    "public",
    "voyeur",
    "exhibition",
    "roleplay",
    "rollenspel",
  ],
};

function searchable(kink: Kink): string {
  return `${kink.name} ${kink.category} ${kink.description ?? ""}`.toLowerCase();
}

function labelSearchable(kink: Kink): string {
  return `${kink.name} ${kink.category}`.toLowerCase();
}

function matchesTerms(kink: Kink, terms: string[]): boolean {
  const haystack = searchable(kink);
  return terms.some((term) => haystack.includes(term));
}

function matchesLabelTerms(kink: Kink, terms: string[]): boolean {
  const haystack = labelSearchable(kink);
  return terms.some((term) => haystack.includes(term));
}

function legacyQuestionnaire(profile: Profile): Kink[] {
  const maxLevel = LEVEL_MAX[profile.experienceLevel ?? "beginner"] ?? 1;
  return KINKS.filter((kink) => kink.level <= maxLevel);
}

function adaptiveCandidates(profile: Profile): Kink[] {
  const setup = profile.questionnaireSetup;
  if (!setup) return [];
  const chosenTerms = setup.interests.flatMap((interest) => INTEREST_TERMS[interest]);
  const preferredIds = new Set(
    chosenTerms.length > 0
      ? KINKS.filter((kink) => matchesTerms(kink, chosenTerms)).map((kink) => kink.id)
      : [],
  );
  const safetyIds = new Set(
    KINKS.filter((kink) => matchesLabelTerms(kink, SAFETY_TERMS)).map((kink) => kink.id),
  );
  return rankQuestionnaireCandidates(KINKS, profile.entries, { preferredIds, safetyIds });
}

/**
 * Returns the current start selection for a profile.
 *
 * Legacy profiles retain their experience-level list. New profiles use an
 * adaptive preset, but every already answered kink is always included so a
 * smaller preset can never hide or reinterpret existing data.
 */
export function getQuestionnaireKinks(profile: Profile): Kink[] {
  const setup = profile.questionnaireSetup;
  if (!setup) return legacyQuestionnaire(profile);
  if (setup.preset === "full") return [...KINKS];

  const targetCount = setup.preset === "quick" ? 52 : 104;
  const answeredIds = new Set(
    KINKS.filter((kink) => profile.entries[kink.id]?.status != null).map((kink) => kink.id),
  );
  const selectionLimit = Math.max(targetCount, answeredIds.size);
  const remainingSlots = Math.max(0, selectionLimit - answeredIds.size);
  const selectedIds = new Set(answeredIds);
  for (const kink of adaptiveCandidates(profile).slice(0, remainingSlots)) selectedIds.add(kink.id);
  return KINKS.filter((kink) => selectedIds.has(kink.id));
}

/** Runtime priority queue; selection/search/storage remain separate concerns. */
export function getAdaptiveQuestionQueue(profile: Profile): Kink[] {
  const selected = getQuestionnaireKinks(profile);
  if (!profile.questionnaireSetup) {
    return selected.filter((kink) => profile.entries[kink.id]?.status == null);
  }
  const selectedIds = new Set(selected.map((kink) => kink.id));
  return adaptiveCandidates(profile).filter((kink) => selectedIds.has(kink.id));
}

export function getQuestionnaireKinksByCategory(profile: Profile, category: string): Kink[] {
  return getQuestionnaireKinks(profile).filter((kink) => kink.category === category);
}

/** Search deliberately ignores the preset so the full catalog stays reachable. */
export function searchAllKinks(query: string): Kink[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return KINKS.filter((kink) => searchable(kink).includes(normalized));
}

export function questionnaireCount(
  setup: QuestionnaireSetup,
  interests: QuestionnaireInterest[] = setup.interests,
): number {
  const mockProfile: Profile = {
    id: "questionnaire-preview",
    name: "Preview",
    role: "Dominant",
    perspective: "dominant",
    experienceLevel: "beginner",
    questionnaireSetup: { ...setup, interests },
    customKinks: [],
    createdAt: 0,
    updatedAt: 0,
    entries: {},
  };
  return getQuestionnaireKinks(mockProfile).length;
}
