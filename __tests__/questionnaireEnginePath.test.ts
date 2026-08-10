import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  rankQuestionnaireCandidates,
  rankQuestionnaireQueueItems,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import type { Kink, KinkEntry } from "@/types";

function catalogSlice(...ids: string[]): Kink[] {
  return ids.map((id) => {
    const kink = KINKS.find((candidate) => candidate.id === id);
    if (!kink) throw new Error(`Test kink ontbreekt: ${id}`);
    return kink;
  });
}

function entriesWith(statuses: Record<string, KinkEntry["status"]>): Record<string, KinkEntry> {
  return Object.fromEntries(
    Object.entries(statuses).map(([id, status]) => [id, { status, comment: "" }]),
  );
}

function queueItems(
  catalog: readonly Kink[],
  entries: Record<string, KinkEntry>,
  safetyIds: ReadonlySet<string>,
  preferredIds: ReadonlySet<string>,
): QuestionnaireQueueItem[] {
  return catalog
    .filter((kink) => entries[kink.id]?.status == null)
    .map((kink) => ({
      kink,
      lane: safetyIds.has(kink.id)
        ? "core"
        : preferredIds.has(kink.id)
          ? "interest"
          : "coverage",
      isProbe: false,
      coversAnchor: safetyIds.has(kink.id) || preferredIds.has(kink.id),
      reasons: [],
    }));
}

describe("questionnaire engine single ranking path", () => {
  it("keeps the compatibility helper identical to the live lane ranker", () => {
    const catalog = catalogSlice(
      "voyeurism",
      "watching_others",
      "exhibitionism",
      "being_watched",
      "doctor_patient",
    );
    const entries = entriesWith({ voyeurism: "yes", exhibitionism: "willing" });
    const safetyIds = new Set(["doctor_patient"]);
    const preferredIds = new Set(["being_watched"]);

    const compatibilityOrder = rankQuestionnaireCandidates(catalog, entries, {
      safetyIds,
      preferredIds,
    }).map((kink) => kink.id);
    const liveOrder = rankQuestionnaireQueueItems(
      queueItems(catalog, entries, safetyIds, preferredIds),
      catalog,
      entries,
    ).map((item) => item.kink.id);

    expect(compatibilityOrder).toEqual(liveOrder);
  });

  it("lets explicit yes outrank willing on the live queue without inventing eligibility", () => {
    const catalog = catalogSlice(
      "voyeurism",
      "watching_others",
      "exhibitionism",
      "being_watched",
    );
    const entries = entriesWith({ voyeurism: "yes", exhibitionism: "willing" });
    const items: QuestionnaireQueueItem[] = [
      {
        kink: catalog.find((kink) => kink.id === "watching_others")!,
        lane: "coverage",
        isProbe: false,
        coversAnchor: false,
        reasons: [],
      },
      {
        kink: catalog.find((kink) => kink.id === "being_watched")!,
        lane: "coverage",
        isProbe: false,
        coversAnchor: false,
        reasons: [],
      },
    ];

    const ranked = rankQuestionnaireQueueItems(items, catalog, entries).map((item) => item.kink.id);
    expect(ranked).toEqual(["watching_others", "being_watched"]);
  });
});
