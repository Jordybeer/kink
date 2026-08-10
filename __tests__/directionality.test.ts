import { describe, expect, it } from "vitest";
import { KINKS } from "@/lib/kinks";
import {
  DIRECTIONAL_KINK_PAIRS,
  directionalSiblingId,
  partnerDirectionalKinkId,
  stripDeprecatedDirectionalEntries,
} from "@/lib/directionality";
import {
  buildQuestionnaireCoveragePlan,
  getQuestionnaireRuntime,
  searchAllKinks,
} from "@/lib/questionnaire";
import {
  derivePendingExpansionProbes,
  selectConversationQuestion,
  type QuestionnaireQueueItem,
} from "@/lib/questionnaireEngine";
import { encodeProfile, decodeAny } from "@/lib/shareProfile";
import { sanitizeProfileFull } from "@/lib/sanitizeProfile";
import type { KinkEntry, Profile, ProfilePerspective } from "@/types";

function ownProfile(perspective: ProfilePerspective, entries: Record<string, KinkEntry> = {}): Profile {
  return {
    id: "direction-" + perspective,
    name: "Direction",
    role: perspective === "dominant" ? "Dominant" : "Submissive",
    perspective,
    questionnaireSetup: { mode: "dynamic", interests: [], version: 2 },
    experienceLevel: "gevorderd",
    customKinks: [],
    createdAt: 1,
    updatedAt: 1,
    entries,
    origin: "own",
  };
}

function queueItem(id: string): QuestionnaireQueueItem {
  const kink = KINKS.find((candidate) => candidate.id === id);
  if (!kink) throw new Error("Kink ontbreekt: " + id);
  return { kink, lane: "coverage", isProbe: false, coversAnchor: true, reasons: [] };
}

describe("directionele kinkvragen", () => {
  it("models pegging as two flat explicit IDs and retires the ambiguous combined ID", () => {
    const ids = new Set(KINKS.map((kink) => kink.id));
    expect(DIRECTIONAL_KINK_PAIRS).toEqual([
      { conceptId: "pegging", giveId: "pegging_give", receiveId: "pegging_receive" },
      { conceptId: "golden_shower", giveId: "watersports_geven", receiveId: "watersports_ontvangen" },
      { conceptId: "anal_sex", giveId: "anal_sex_give", receiveId: "anal_sex_receive" },
      { conceptId: "anal_fingering", giveId: "anal_fingering_give", receiveId: "anal_fingering_receive" },
      { conceptId: "anal_fisting", giveId: "fisting_anal_give", receiveId: "fisting_anal_receive" },
      { conceptId: "vaginal_fisting", giveId: "fisting_vaginal_give", receiveId: "fisting_vaginal_receive" },
      { conceptId: "deep_throat", giveId: "deep_throat_give", receiveId: "deep_throat_receive" },
      { conceptId: "rimming", giveId: "rimming_give", receiveId: "rimming_receive" },
      { conceptId: "footjob", giveId: "footjob_give", receiveId: "footjob_receive" },
    ]);
    expect(ids.has("pegging")).toBe(false);
    expect(ids.has("pegging_give")).toBe(true);
    expect(ids.has("pegging_receive")).toBe(true);
    for (const pair of DIRECTIONAL_KINK_PAIRS) {
      expect(ids.has(pair.giveId), pair.giveId).toBe(true);
      expect(ids.has(pair.receiveId), pair.receiveId).toBe(true);
    }
    for (const retired of ["anal_sex", "anal_fingering", "fisting_anal", "fisting_vaginal", "deep_throat", "rimmen", "footjob"]) {
      expect(ids.has(retired), retired).toBe(false);
    }
  });

  it("keeps both directions independently eligible in Dynamic for every perspective", () => {
    const plan = buildQuestionnaireCoveragePlan([]);
    expect(plan.anchorIds).toContain("pegging_give");
    expect(plan.anchorIds).toContain("pegging_receive");

    for (const perspective of ["dominant", "submissive"] as const) {
      const ids = getQuestionnaireRuntime(ownProfile(perspective)).queue.map((item) => item.kink.id);
      expect(ids).toContain("pegging_give");
      expect(ids).toContain("pegging_receive");
    }
  });

  it("asks an independently eligible sibling directly after an explicit answer", () => {
    const queue = [queueItem("spanking_hand"), queueItem("pegging_receive")];
    expect(selectConversationQuestion(queue, KINKS, {
      lastKinkId: "pegging_give",
      preferDirectionalSibling: true,
    })?.kink.id).toBe("pegging_receive");

    expect(selectConversationQuestion(queue, KINKS, {
      lastKinkId: "pegging_give",
      preferDirectionalSibling: false,
    })?.kink.id).toBe("spanking_hand");
  });

  it("never turns pairflow into an expansion probe", () => {
    const entries = { pegging_give: { status: "yes", comment: "" } } satisfies Record<string, KinkEntry>;
    expect(derivePendingExpansionProbes(KINKS, entries)
      .some((probe) => probe.targetKinkId === "pegging_receive")).toBe(false);
    expect(entries.pegging_give.status).toBe("yes");
    expect((entries as Record<string, KinkEntry>).pegging_receive).toBeUndefined();
  });

  it("keeps direction pairing explicit and role-independent", () => {
    expect(directionalSiblingId("pegging_give")).toBe("pegging_receive");
    expect(directionalSiblingId("pegging_receive")).toBe("pegging_give");
    expect(partnerDirectionalKinkId("pegging_give")).toBe("pegging_receive");
    expect(partnerDirectionalKinkId("watersports_geven")).toBe("watersports_ontvangen");
    expect(partnerDirectionalKinkId("fisting_anal_give")).toBe("fisting_anal_receive");
    expect(partnerDirectionalKinkId("deep_throat_receive")).toBe("deep_throat_give");
    expect(partnerDirectionalKinkId("spanking_hand")).toBe("spanking_hand");
  });

  it("searches both variants through the shared concept vocabulary", () => {
    const ids = searchAllKinks("pegging").map((kink) => kink.id);
    expect(ids).toContain("pegging_give");
    expect(ids).toContain("pegging_receive");
  });

  it("drops the old ambiguous answer instead of copying it to either direction", () => {
    const old = { pegging: { status: "yes", comment: "legacy" } } satisfies Record<string, KinkEntry>;
    const cleaned = stripDeprecatedDirectionalEntries(old);
    expect(cleaned.pegging).toBeUndefined();
    expect(cleaned.pegging_give).toBeUndefined();
    expect(cleaned.pegging_receive).toBeUndefined();
    const retired = stripDeprecatedDirectionalEntries({
      anal_sex: { status: "yes", comment: "oud" },
      fisting_anal: { status: "hard_no", comment: "oud" },
      deep_throat: { status: "maybe", comment: "oud" },
    });
    expect(retired.anal_sex).toBeUndefined();
    expect(retired.fisting_anal).toBeUndefined();
    expect(retired.deep_throat).toBeUndefined();
    expect(retired.anal_sex_give).toBeUndefined();
    expect(retired.anal_sex_receive).toBeUndefined();
  });

  it("sanitizes and shares both explicit directions independently", () => {
    const raw = ownProfile("dominant", {
      pegging: { status: "yes", comment: "oud" },
      pegging_give: { status: "willing", comment: "geven" },
      pegging_receive: { status: "hard_no", comment: "ontvangen", privateResponse: true },
    });
    const clean = sanitizeProfileFull(raw);
    expect(clean?.entries.pegging).toBeUndefined();
    expect(clean?.entries.pegging_give?.status).toBe("willing");
    expect(clean?.entries.pegging_receive?.status).toBe("hard_no");

    const encoded = encodeProfile(clean!, { includePrivateResponses: true });
    const decoded = decodeAny(encoded);
    expect(decoded.entries.pegging_give?.status).toBe("willing");
    expect(decoded.entries.pegging_receive?.status).toBe("hard_no");
    expect(decoded.entries.pegging_receive?.privateResponse).toBe(true);
  });
});
