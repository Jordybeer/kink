import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  QUESTIONNAIRE_PROGRESSION_EDGES,
  questionnaireProgressionParentIds,
  unansweredQuestionnaireProgressionParents,
} from "@/lib/questionnaireProgression";
import {
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

  it("vraagt golden shower ontvangen vóór urine in mond wanneer beide klaarstaan", () => {
    const child = item("urine_intiem");
    const parent = item("watersports_ontvangen");

    const selected = selectConversationQuestion([child, parent], KINKS);
    expect(selected?.kink.id).toBe("watersports_ontvangen");
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
