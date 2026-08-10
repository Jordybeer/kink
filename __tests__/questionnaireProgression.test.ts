import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  QUESTIONNAIRE_PROGRESSION_EDGES,
  questionnaireProgressionParentIds,
  unansweredQuestionnaireProgressionParents,
} from "@/lib/questionnaireProgression";
import {
  rankQuestionnaireCandidates,
  selectConversationQuestion,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import type { Kink, KinkEntry } from "@/types";

const BY_ID = new Map(KINKS.map((kink) => [kink.id, kink]));

function item(kinkId: string): QuestionnaireQueueItem {
  const kink = BY_ID.get(kinkId);
  if (!kink) throw new Error(`Missing catalog kink ${kinkId}`);
  return {
    kink,
    lane: "deepDive",
    isProbe: false,
    coversAnchor: false,
    reasons: [],
  };
}

function kinkAtForcedLevel(kinkId: string, level: Kink["level"]): Kink {
  const kink = BY_ID.get(kinkId);
  if (!kink) throw new Error(`Missing catalog kink ${kinkId}`);
  return { ...kink, level };
}

describe("questionnaire progression gates", () => {
  it("verwijst alleen naar bestaande catalogusitems en klimt niet naar een lager catalogusniveau", () => {
    for (const [parentId, childId] of QUESTIONNAIRE_PROGRESSION_EDGES) {
      const parent = BY_ID.get(parentId);
      const child = BY_ID.get(childId);
      expect(parent, `missing progression parent ${parentId}`).toBeDefined();
      expect(child, `missing progression child ${childId}`).toBeDefined();
      expect(parent!.level).toBeLessThanOrEqual(child!.level);
    }
  });

  it("bevat geen progression-cyclus", () => {
    const childrenByParent = new Map<string, string[]>();
    const indegree = new Map<string, number>();

    for (const [parentId, childId] of QUESTIONNAIRE_PROGRESSION_EDGES) {
      indegree.set(parentId, indegree.get(parentId) ?? 0);
      indegree.set(childId, (indegree.get(childId) ?? 0) + 1);
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), childId]);
    }

    const ready = [...indegree]
      .filter(([, degree]) => degree === 0)
      .map(([kinkId]) => kinkId);
    let visited = 0;

    while (ready.length > 0) {
      const parentId = ready.shift()!;
      visited += 1;
      for (const childId of childrenByParent.get(parentId) ?? []) {
        const nextDegree = (indegree.get(childId) ?? 0) - 1;
        indegree.set(childId, nextDegree);
        if (nextDegree === 0) ready.push(childId);
      }
    }

    expect(visited).toBe(indegree.size);
  });

  it("vraagt golden shower ontvangen vóór urine in mond wanneer beide klaarstaan", () => {
    const child = item("urine_intiem");
    const parent = item("watersports_ontvangen");

    const selected = selectConversationQuestion([child, parent], KINKS);
    expect(selected?.kink.id).toBe("watersports_ontvangen");
  });

  it("herstelt na ranking en diversiteit ook een volledige drie-staps waterval", () => {
    const adultContent = kinkAtForcedLevel("adult_content_creation", 1);
    const recording = kinkAtForcedLevel("recording", 1);
    const photography = kinkAtForcedLevel("nude_photography", 4);

    const ranked = rankQuestionnaireCandidates(
      [adultContent, recording, photography],
      {},
    );

    expect(ranked.map((kink) => kink.id)).toEqual([
      "nude_photography",
      "recording",
      "adult_content_creation",
    ]);
  });

  it("maakt de verdieping weer vrij zodra de ingang expliciet beantwoord is, ongeacht het antwoord", () => {
    const entries: Record<string, KinkEntry> = {
      watersports_ontvangen: { status: "hard_no", comment: "duidelijke grens" },
    };

    expect(unansweredQuestionnaireProgressionParents("urine_intiem", entries)).toEqual([]);
    const selected = selectConversationQuestion([item("urine_intiem")], KINKS);
    expect(selected?.kink.id).toBe("urine_intiem");
  });

  it("houdt alleen geaudite verdiepingen tegen en maakt van siblings geen ladder", () => {
    expect(questionnaireProgressionParentIds("plas_merken")).toEqual([]);
    expect(questionnaireProgressionParentIds("flogging_give")).toEqual([]);
    expect(questionnaireProgressionParentIds("anal_sex_give")).toEqual([]);
    expect(questionnaireProgressionParentIds("gag_bit_give")).toEqual([]);
    expect(questionnaireProgressionParentIds("orgasm_denial")).toEqual([]);
  });

  it("bewaakt beide richtingen van role-affinity verdiepingen zonder een rol te voorspellen", () => {
    expect(questionnaireProgressionParentIds("spanking_implement_give")).toEqual(["spanking_hand_give"]);
    expect(questionnaireProgressionParentIds("spanking_implement_receive")).toEqual(["spanking_hand_receive"]);
    expect(questionnaireProgressionParentIds("shibari_give")).toEqual(["rope_bondage_give"]);
    expect(questionnaireProgressionParentIds("shibari_receive")).toEqual(["rope_bondage_receive"]);
  });
});
