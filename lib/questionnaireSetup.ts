import type {
  QuestionnaireInterest,
  QuestionnaireMode,
  QuestionnaireSetup,
} from "@/types";

const VALID_MODES: readonly QuestionnaireMode[] = ["dynamic", "deepDive"];
const VALID_INTERESTS: readonly QuestionnaireInterest[] = [
  "power",
  "impact",
  "bondage",
  "sensation",
  "humiliation",
  "sexual_social",
];

export function defaultQuestionnaireSetup(): QuestionnaireSetup {
  return { mode: "dynamic", interests: [], version: 2 };
}

/**
 * Pre-launch boundary normalizer. Historical Full becomes exhaustive Deep Dive;
 * Quick, Balanced and missing runtime setup use Dynamic. Entries are outside
 * this object and are deliberately never touched or interpreted here.
 */
export function normalizeQuestionnaireSetup(raw: unknown): QuestionnaireSetup | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const interests = Array.isArray(record.interests)
    ? [...new Set(record.interests.filter(
        (interest): interest is QuestionnaireInterest =>
          typeof interest === "string" && (VALID_INTERESTS as readonly string[]).includes(interest),
      ))]
    : [];

  if (record.version === 2) {
    if (typeof record.mode !== "string"
      || !(VALID_MODES as readonly string[]).includes(record.mode)) return undefined;
    return { mode: record.mode as QuestionnaireMode, interests, version: 2 };
  }

  if (record.version === 1) {
    if (record.preset !== "quick" && record.preset !== "balanced" && record.preset !== "full") {
      return undefined;
    }
    return {
      mode: record.preset === "full" ? "deepDive" : "dynamic",
      interests,
      version: 2,
    };
  }

  return undefined;
}

export function normalizeStoredQuestionnaireProfiles<T extends object>(
  profiles: readonly T[],
): Array<T & { questionnaireSetup: QuestionnaireSetup }> {
  return profiles.map((profile) => {
    const rawSetup = (profile as T & { questionnaireSetup?: unknown }).questionnaireSetup;
    return {
      ...profile,
      questionnaireSetup: normalizeQuestionnaireSetup(rawSetup) ?? defaultQuestionnaireSetup(),
    };
  });
}
